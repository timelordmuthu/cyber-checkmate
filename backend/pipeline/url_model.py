"""backend/pipeline/url_model.py

URL scoring pipeline per PRD FR4, FR6, and Section 16.4.

Combines the XGBoost URL classifier (if trained) with brand-check heuristics
(official whitelisting, lookalike detection, shorteners, suspicious TLDs, IP hosts).
If the XGBoost model is missing, falls back cleanly to 0.5 neutral base score.

Usage:
    from backend.pipeline.url_model import score_url, score_urls

    res = score_urls(["http://sbi.kyc-update.xyz/login"])
    url_score, flags, strong_look, is_whitelisted, findings = res
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import NamedTuple
from urllib.parse import urlparse

import joblib

# Ensure project root is in sys.path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.config import (
    URL_MODEL_PATH,
    WHITELIST_CAP,
    STRONG_LOOKALIKE_FLOOR_SCORE,
    SHORTENER_STRENGTH,
    URL_MODEL_NEUTRAL_BASE,
    SUSPICIOUS_TLDS,
)
from backend.pipeline.brand_check import check_url, get_brands_data
from backend.pipeline.domain_utils import extract_domain_parts, is_ip_host
from backend.pipeline.url_features import extract_features


class UrlScoringResult(NamedTuple):
    url_score: float | None
    red_flags: list[dict]
    any_strong_lookalike: bool
    any_official_whitelisted: bool
    url_findings: list[dict]


# ---------------------------------------------------------------------------
# Lazy model loader
# ---------------------------------------------------------------------------
_URL_MODEL = None
_MODEL_LOAD_ATTEMPTED = False


def get_url_model():
    """Load the XGBoost URL classifier if available; otherwise return None."""
    global _URL_MODEL, _MODEL_LOAD_ATTEMPTED
    if not _MODEL_LOAD_ATTEMPTED:
        _MODEL_LOAD_ATTEMPTED = True
        if URL_MODEL_PATH.exists():
            try:
                _URL_MODEL = joblib.load(URL_MODEL_PATH)
            except Exception:
                _URL_MODEL = None
    return _URL_MODEL


def set_url_model(model) -> None:
    """Helper to mock or test URL model."""
    global _URL_MODEL, _MODEL_LOAD_ATTEMPTED
    _URL_MODEL = model
    _MODEL_LOAD_ATTEMPTED = True


# ---------------------------------------------------------------------------
# score_url (single URL)
# ---------------------------------------------------------------------------
def score_url(url: str, brands_data: dict | None = None) -> dict:
    """
    Score a single URL using XGBoost (if present) and brand checking.

    Returns
    -------
    dict with keys:
        url, score, base_score, is_official, official_brand,
        strong_lookalike, lookalike_brand, is_shortener,
        registrable_domain, flags
    """
    b_res = check_url(url, brands_data=brands_data)

    # 1. Base probability from model or neutral fallback
    model = get_url_model()
    if model is not None:
        try:
            feats = extract_features(url)
            base_score = float(model.predict_proba([feats])[0][1])
        except Exception:
            base_score = URL_MODEL_NEUTRAL_BASE
    else:
        base_score = URL_MODEL_NEUTRAL_BASE

    final_score = base_score
    flags: list[dict] = []

    # 2. Brand check adjustments
    if b_res.is_official:
        # Whitelisted official domain: cap at 0.1
        final_score = min(final_score, WHITELIST_CAP)
    elif b_res.strong_lookalike:
        # Strong lookalike: at least 0.9
        final_score = max(final_score, STRONG_LOOKALIKE_FLOOR_SCORE)
        b_data = brands_data or get_brands_data()
        brand_info = b_data.get("brands", {}).get(b_res.lookalike_brand or "", {})
        brand_name = brand_info.get("display_name", b_res.lookalike_brand or "official brand")
        flags.append({
            "type": "url",
            "category": "brand_lookalike",
            "evidence": f"domain imitates {brand_name}",
            "strength": 0.95,
        })
    elif b_res.lookalike_brand is not None:
        # Moderate lookalike (85 <= similarity < 90)
        final_score = max(final_score, 0.75)
        b_data = brands_data or get_brands_data()
        brand_info = b_data.get("brands", {}).get(b_res.lookalike_brand or "", {})
        brand_name = brand_info.get("display_name", b_res.lookalike_brand or "official brand")
        flags.append({
            "type": "url",
            "category": "brand_lookalike",
            "evidence": f"domain imitates {brand_name}",
            "strength": round(b_res.lookalike_similarity / 100.0, 2),
        })

    # 3. Shortener / free host flag
    if b_res.is_shortener_or_free_host:
        flags.append({
            "type": "url",
            "category": "shortener",
            "evidence": "link hides the real destination",
            "strength": SHORTENER_STRENGTH,
        })

    # 4. Lexical signals for red flags (only if not official)
    if not b_res.is_official:
        # Suspicious TLD
        parts = extract_domain_parts(url)
        suffix = parts.suffix.lower() if parts.suffix else ""
        if (
            ("." + suffix) in SUSPICIOUS_TLDS
            or suffix in {t.lstrip(".") for t in SUSPICIOUS_TLDS}
        ):
            flags.append({
                "type": "url",
                "category": "suspicious_tld",
                "evidence": f"uses suspicious domain extension (.{suffix})",
                "strength": 0.65,
            })

        # Raw IP host
        raw = url.strip()
        parse_url = "http://" + raw if not re.match(r"^[a-zA-Z][a-zA-Z0-9+\-.]*://", raw) else raw
        parsed = urlparse(parse_url)
        host = (parsed.hostname or "").lower()
        if is_ip_host(host):
            flags.append({
                "type": "url",
                "category": "ip_host",
                "evidence": f"uses raw IP address ({host}) instead of a domain name",
                "strength": 0.85,
            })

    final_score = max(0.0, min(1.0, final_score))

    return {
        "url": url,
        "score": round(final_score, 4),
        "base_score": round(base_score, 4),
        "is_official": b_res.is_official,
        "official_brand": b_res.official_brand,
        "strong_lookalike": b_res.strong_lookalike,
        "lookalike_brand": b_res.lookalike_brand,
        "is_shortener": b_res.is_shortener_or_free_host,
        "registrable_domain": b_res.registrable_domain,
        "flags": flags,
    }


# ---------------------------------------------------------------------------
# score_urls (multiple URLs)
# ---------------------------------------------------------------------------
def score_urls(
    urls: list[str] | None, brands_data: dict | None = None
) -> UrlScoringResult:
    """
    Score a list of URLs and aggregate results per PRD 16.4.

    Parameters
    ----------
    urls : list[str] or None
        List of URLs to analyse.
    brands_data : dict, optional
        Custom brands registry (for testing).

    Returns
    -------
    UrlScoringResult
        A 5-tuple:
        (url_score or None, red_flags, any_strong_lookalike,
         any_official_whitelisted, url_findings)
    """
    if not urls:
        return UrlScoringResult(
            url_score=None,
            red_flags=[],
            any_strong_lookalike=False,
            any_official_whitelisted=False,
            url_findings=[],
        )

    findings: list[dict] = []
    combined_flags: list[dict] = []
    any_strong_lookalike = False
    any_official_whitelisted = False

    for u in urls:
        if not u or not u.strip():
            continue
        res = score_url(u.strip(), brands_data=brands_data)
        findings.append(res)
        combined_flags.extend(res["flags"])
        if res["strong_lookalike"]:
            any_strong_lookalike = True
        if res["is_official"]:
            any_official_whitelisted = True

    if not findings:
        return UrlScoringResult(
            url_score=None,
            red_flags=[],
            any_strong_lookalike=False,
            any_official_whitelisted=False,
            url_findings=[],
        )

    # Maximum probability across all URLs found
    url_score = round(max(f["score"] for f in findings), 4)

    # Deduplicate flags by (category, evidence) and sort by strength descending
    seen = set()
    deduped_flags = []
    for fl in combined_flags:
        key = (fl.get("category"), fl.get("evidence"))
        if key not in seen:
            seen.add(key)
            deduped_flags.append(fl)

    deduped_flags.sort(key=lambda x: x["strength"], reverse=True)

    return UrlScoringResult(
        url_score=url_score,
        red_flags=deduped_flags,
        any_strong_lookalike=any_strong_lookalike,
        any_official_whitelisted=any_official_whitelisted,
        url_findings=findings,
    )
