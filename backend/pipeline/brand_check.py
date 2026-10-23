"""backend/pipeline/brand_check.py

Brand-lookalike and official-domain checking per PRD FR4 and Section 16.4.

Checks whether a URL belongs to an official brand domain, a legitimate
infrastructure provider, a URL shortener / free-hosting platform, or is
an impersonation / lookalike of a protected brand.

No network calls are made. Operates purely offline via tldextract, idna,
and rapidfuzz.

Usage:
    from backend.pipeline.brand_check import check_url, BrandCheckResult

    res = check_url("http://sbi.kyc-update.xyz/login")
    # res.strong_lookalike -> True
    # res.lookalike_brand  -> "sbi"
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import NamedTuple
from urllib.parse import urlparse

import idna
from rapidfuzz import fuzz

# Ensure project root is in sys.path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.config import (
    BRANDS_JSON,
    LOOKALIKE_SIMILARITY_MIN,
    STRONG_LOOKALIKE_SIM_MIN,
    FUZZY_MIN_TOKEN_LENGTH,
)
from backend.pipeline.domain_utils import extract_domain_parts


class BrandCheckResult(NamedTuple):
    registrable_domain: str
    is_official: bool
    official_brand: str | None
    is_infrastructure: bool
    is_shortener_or_free_host: bool
    lookalike_brand: str | None
    lookalike_similarity: float
    strong_lookalike: bool
    reasons: list[str]


# ---------------------------------------------------------------------------
# Brand registry loader (cached in memory)
# ---------------------------------------------------------------------------
_CACHED_BRANDS_DATA: dict | None = None


def get_brands_data() -> dict:
    global _CACHED_BRANDS_DATA
    if _CACHED_BRANDS_DATA is None:
        if BRANDS_JSON.exists():
            _CACHED_BRANDS_DATA = json.loads(BRANDS_JSON.read_text(encoding="utf-8"))
        else:
            _CACHED_BRANDS_DATA = {
                "verified": False,
                "brands": {},
                "infrastructure_allowlist": [],
                "shorteners_and_free_hosts": [],
            }
    return _CACHED_BRANDS_DATA


def set_cached_brands_data(data: dict | None) -> None:
    """Helper for tests to inject custom brand fixtures."""
    global _CACHED_BRANDS_DATA
    _CACHED_BRANDS_DATA = data


# ---------------------------------------------------------------------------
# Homoglyph normalisation
# ---------------------------------------------------------------------------
def normalise_homoglyphs(s: str) -> str:
    """
    Map common visual homoglyphs in domain labels:
    rn -> m, vv -> w, 0 -> o, 1 -> l.
    """
    s = s.lower()
    s = s.replace("rn", "m")
    s = s.replace("vv", "w")
    s = s.replace("0", "o")
    s = s.replace("1", "l")
    return s


# ---------------------------------------------------------------------------
# check_url
# ---------------------------------------------------------------------------
def check_url(url: str, brands_data: dict | None = None) -> BrandCheckResult:
    """
    Analyse *url* against the brand registry.

    Parameters
    ----------
    url : str
        The URL to inspect (with or without scheme).
    brands_data : dict, optional
        Custom brands registry (defaults to backend/resources/brands.json).

    Returns
    -------
    BrandCheckResult
        A 9-tuple supporting both named attribute access and tuple unpacking:
        (registrable_domain, is_official, official_brand, is_infrastructure,
         is_shortener_or_free_host, lookalike_brand, lookalike_similarity,
         strong_lookalike, reasons)
    """
    if brands_data is None:
        brands_data = get_brands_data()

    reasons: list[str] = []

    # Ensure parseable URL with scheme
    raw = url.strip()
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+\-.]*://", raw):
        parse_url = "http://" + raw
    else:
        parse_url = raw

    parsed = urlparse(parse_url)
    raw_host = (parsed.hostname or "").lower().strip()

    # Handle Punycode (IDN) decoding
    host = raw_host
    if "xn--" in raw_host:
        try:
            # Decode each label using IDNA
            decoded_labels = []
            for lbl in raw_host.split("."):
                if lbl.startswith("xn--"):
                    decoded_labels.append(idna.decode(lbl))
                else:
                    decoded_labels.append(lbl)
            host = ".".join(decoded_labels).lower()
        except Exception:
            host = raw_host

    parts = extract_domain_parts(parse_url)
    registrable_domain = parts.registered.lower() if parts.registered else host
    main_label = parts.domain.lower() if parts.domain else ""

    brands = brands_data.get("brands", {})
    infra_allowlist = {d.lower().strip() for d in brands_data.get("infrastructure_allowlist", [])}
    shorteners = {s.lower().strip() for s in brands_data.get("shorteners_and_free_hosts", [])}

    # -----------------------------------------------------------------------
    # Step 1: Official domain check
    # Whitelist match: registrable domain equals an official domain or the
    # host is its subdomain.
    # -----------------------------------------------------------------------
    for brand_key, brand_info in brands.items():
        official_domains = [d.lower().strip() for d in brand_info.get("official_domains", [])]
        for off_dom in official_domains:
            if (
                host == off_dom
                or host.endswith("." + off_dom)
                or (registrable_domain and registrable_domain == off_dom)
            ):
                display = brand_info.get("display_name", brand_key)
                reasons.append(f"Official domain for {display}")
                return BrandCheckResult(
                    registrable_domain=registrable_domain,
                    is_official=True,
                    official_brand=brand_key,
                    is_infrastructure=False,
                    is_shortener_or_free_host=False,
                    lookalike_brand=None,
                    lookalike_similarity=0.0,
                    strong_lookalike=False,
                    reasons=reasons,
                )

    # -----------------------------------------------------------------------
    # Step 2: Infrastructure check
    # Infrastructure hosts are never brand lookalikes.
    # -----------------------------------------------------------------------
    for infra in infra_allowlist:
        if host == infra or host.endswith("." + infra) or registrable_domain == infra:
            reasons.append(f"Legitimate infrastructure host ({infra})")
            return BrandCheckResult(
                registrable_domain=registrable_domain,
                is_official=False,
                official_brand=None,
                is_infrastructure=True,
                is_shortener_or_free_host=False,
                lookalike_brand=None,
                lookalike_similarity=0.0,
                strong_lookalike=False,
                reasons=reasons,
            )

    # -----------------------------------------------------------------------
    # Step 3: Shorteners and free-hosting platforms check
    # Shorteners and free hosts are flagged only.
    # -----------------------------------------------------------------------
    is_shortener = False
    for sh in shorteners:
        if host == sh or host.endswith("." + sh) or registrable_domain == sh:
            is_shortener = True
            reasons.append(f"URL shortener or free host ({sh})")
            break

    # -----------------------------------------------------------------------
    # Step 4: Lookalike matching
    # Rules:
    # 1. Labels split on '.' and '-'.
    # 2. Exact token match on label boundaries:
    #    If an exact brand token appears in a non-official, non-infra host,
    #    it is a strong lookalike.
    # 3. Fuzzy matching only for tokens >= 5 chars vs the main label
    #    (after homoglyph normalisation rn->m, vv->w, 0->o, 1->l).
    #    Lookalike >= 85; strong = (>= 90 and not official) OR exact token.
    # -----------------------------------------------------------------------
    best_brand: str | None = None
    best_sim: float = 0.0
    is_strong = False

    # Extract all label boundaries from the host (split on '.' and '-')
    host_labels = set(re.split(r"[.\-]+", host))
    host_labels.discard("")

    # Also consider decoded labels if punycode was present
    if host != raw_host:
        host_labels.update(re.split(r"[.\-]+", raw_host))
        host_labels.discard("")

    # Normalised main label and its hyphen subcomponents for fuzzy checking
    norm_main_label = normalise_homoglyphs(main_label)
    main_sublabels = [
        normalise_homoglyphs(sub)
        for sub in main_label.split("-")
        if len(sub) >= FUZZY_MIN_TOKEN_LENGTH
    ]

    for brand_key, brand_info in brands.items():
        tokens = [t.lower().strip() for t in brand_info.get("tokens", [])]

        # --- Check A: Exact brand token match on label boundaries ---
        for tok in tokens:
            # Tokens may have spaces like "state bank" or "hdfc bank"
            candidates = [tok]
            if " " in tok:
                candidates.append(tok.replace(" ", ""))
                candidates.append(tok.replace(" ", "-"))

            for c in candidates:
                if "-" in c:
                    # Hyphenated token (e.g. "state-bank"): check if in host
                    # on label boundaries (surrounded by . or - or string ends)
                    pattern = r"(^|[.\-])" + re.escape(c) + r"([.\-]|$)"
                    if re.search(pattern, host):
                        best_brand = brand_key
                        best_sim = 100.0
                        is_strong = True
                        reasons.append(
                            f"Exact brand token '{c}' found in untrusted host '{host}'"
                        )
                        break
                else:
                    if c in host_labels:
                        best_brand = brand_key
                        best_sim = 100.0
                        is_strong = True
                        reasons.append(
                            f"Exact brand token '{c}' found in untrusted host '{host}'"
                        )
                        break
            if is_strong:
                break

        if is_strong:
            # Found exact brand token match in untrusted host
            break

        # --- Check B: Fuzzy matching for brand tokens >= 5 chars vs main label ---
        for tok in tokens:
            clean_tok = tok.replace(" ", "")
            if len(clean_tok) < FUZZY_MIN_TOKEN_LENGTH:
                # Avoid short-brand false positives (e.g. 'sbi', 'npci', 'axis')
                continue

            norm_tok = normalise_homoglyphs(clean_tok)

            # Compare against norm_main_label
            sim = float(fuzz.ratio(norm_main_label, norm_tok))

            # Also compare against hyphenated sublabels if main label has hyphens
            for sub in main_sublabels:
                sub_sim = float(fuzz.ratio(sub, norm_tok))
                if sub_sim > sim:
                    sim = sub_sim

            if sim > best_sim:
                best_sim = sim
                best_brand = brand_key

    # Evaluate fuzzy similarity thresholds
    if not is_strong and best_brand is not None:
        if best_sim >= STRONG_LOOKALIKE_SIM_MIN:
            is_strong = True
            reasons.append(
                f"Strong brand lookalike to '{best_brand}' (similarity {best_sim:.1f})"
            )
        elif best_sim >= LOOKALIKE_SIMILARITY_MIN:
            reasons.append(
                f"Potential brand lookalike to '{best_brand}' (similarity {best_sim:.1f})"
            )
        else:
            # Below 85 threshold: not a lookalike
            best_brand = None
            best_sim = 0.0

    return BrandCheckResult(
        registrable_domain=registrable_domain,
        is_official=False,
        official_brand=None,
        is_infrastructure=False,
        is_shortener_or_free_host=is_shortener,
        lookalike_brand=best_brand,
        lookalike_similarity=round(best_sim, 2),
        strong_lookalike=is_strong,
        reasons=reasons,
    )
