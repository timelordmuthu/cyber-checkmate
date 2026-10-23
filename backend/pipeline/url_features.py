"""backend/pipeline/url_features.py

Deterministic, offline URL feature extraction for the phishing/scam URL model.
Features per PRD FR4 and Section 16.4.

No network calls are ever made. All features are computed from the URL string
alone, using the bundled tldextract suffix list.

Usage:
    from backend.pipeline.url_features import extract_features, FEATURE_NAMES

    feats = extract_features("http://bit.ly/3xyz?ref=kyc-update")
    # returns a list of float values aligned with FEATURE_NAMES
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, parse_qs

# -- project root on sys.path so 'backend' package is importable ---------------
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.pipeline.domain_utils import (
    extract_domain_parts,
    is_ip_host,
    has_punycode,
    shannon_entropy,
    subdomain_depth,
)

# ── Load brand resources (once, at import time) ────────────────────────────────
_RESOURCES_DIR = Path(__file__).resolve().parent.parent / "resources"
_BRANDS_PATH   = _RESOURCES_DIR / "brands.json"

def _load_brands() -> tuple[set[str], set[str]]:
    """Return (shorteners_set, suspicious_tld_set)."""
    try:
        data = json.loads(_BRANDS_PATH.read_text(encoding="utf-8"))
        shorteners = set(data.get("shorteners_and_free_hosts", []))
    except Exception:
        shorteners = set()

    # Suspicious TLDs from config (import lazily to avoid circular import)
    try:
        from backend.config import SUSPICIOUS_TLDS
        susp_tlds = set(SUSPICIOUS_TLDS)
    except Exception:
        # Fallback if config not yet available
        susp_tlds = {
            ".tk", ".ml", ".ga", ".cf", ".gq",
            ".xyz", ".top", ".club", ".online", ".site",
            ".info", ".biz", ".live", ".work", ".click",
        }
    return shorteners, susp_tlds

_SHORTENERS, _SUSPICIOUS_TLDS = _load_brands()

# ── Suspicious keywords per FR4 ───────────────────────────────────────────────
_SUSPICIOUS_KEYWORDS: list[str] = [
    "login", "signin", "sign-in", "secure", "security",
    "verify", "verification", "validate", "update", "upgrade",
    "account", "banking", "netbanking", "password", "passwd",
    "kyc", "aadhar", "aadhaar", "pan", "otp",
    "refund", "cashback", "reward", "prize", "lottery",
    "free", "lucky", "winner", "claim", "offer",
    "urgent", "alert", "block", "suspend", "expire",
    "confirm", "reactivate", "limited", "immediately",
    "paypal", "wallet", "upi", "bhim", "paytm",
    "support", "helpdesk", "customer-care", "customercare",
    "click", "redirect", "track", "tracking",
]

# ── Fixed feature names (order matters — must match extract_features output) ──
FEATURE_NAMES: list[str] = [
    # ── URL-level ────────────────────────────────────────────────────────────
    "url_length",           # total length of the raw URL string
    "path_length",          # length of path component
    "query_length",         # length of query string (0 if none)
    "num_query_params",     # number of distinct query parameters
    "num_dots_url",         # total dots in the full URL
    "num_hyphens_url",      # total hyphens in the full URL
    "num_at_signs",         # count of '@' in URL (credential injection indicator)
    "num_slashes_path",     # slashes in path (depth proxy)
    "digit_ratio_url",      # fraction of URL characters that are digits
    # ── Host-level ───────────────────────────────────────────────────────────
    "host_length",          # length of the hostname/host part
    "num_dots_host",        # dots in host (subdomain indicator)
    "num_hyphens_host",     # hyphens in domain/subdomain labels
    "is_ip_host",           # 1 if host is a raw IPv4 address
    "subdomain_depth",      # number of subdomain labels (0 = no subdomain)
    "host_entropy",         # Shannon entropy of the hostname string
    "has_punycode",         # 1 if any label uses xn-- encoding
    # ── TLD / domain signals ─────────────────────────────────────────────────
    "is_suspicious_tld",    # 1 if suffix matches SUSPICIOUS_TLDS list
    "tld_length",           # length of the public suffix (e.g. "co.in" = 5)
    "sld_length",           # length of the second-level domain label
    # ── Protocol / structure ─────────────────────────────────────────────────
    "is_https",             # 1 if scheme is https
    "has_port",             # 1 if a non-standard port is explicitly specified
    # ── Brand / shortener signals ─────────────────────────────────────────────
    "is_shortener",         # 1 if registered domain is a known shortener/free host
    # ── Keyword signals ──────────────────────────────────────────────────────
    "suspicious_keyword_count",  # count of _SUSPICIOUS_KEYWORDS found in URL (lowered)
]

assert len(FEATURE_NAMES) == 23, f"Expected 23 features, got {len(FEATURE_NAMES)}"


def extract_features(url: str) -> list[float]:
    """
    Extract a fixed-length numeric feature vector from *url*.

    Returns a list of floats aligned with FEATURE_NAMES.
    Never raises — returns a zero vector on unparseable input.
    """
    try:
        return _extract(url)
    except Exception:
        return [0.0] * len(FEATURE_NAMES)


def _extract(url: str) -> list[float]:
    """Inner extraction (may raise; caller catches)."""
    raw = url.strip()
    # Ensure there's a scheme for urlparse to work correctly
    if not re.match(r"[a-zA-Z][a-zA-Z0-9+\-.]*://", raw):
        parse_url = "http://" + raw
    else:
        parse_url = raw

    parsed   = urlparse(parse_url)
    host     = parsed.hostname or ""
    path     = parsed.path or ""
    query    = parsed.query or ""
    raw_low  = raw.lower()

    # ── Domain parts ─────────────────────────────────────────────────────────
    parts = extract_domain_parts(parse_url)

    # ── URL-level features ───────────────────────────────────────────────────
    url_length      = float(len(raw))
    path_length     = float(len(path))
    query_length    = float(len(query))
    num_query_params = float(len(parse_qs(query)))
    num_dots_url    = float(raw.count("."))
    num_hyphens_url = float(raw.count("-"))
    num_at_signs    = float(raw.count("@"))
    num_slashes_path = float(path.count("/") - 1) if path.startswith("/") else float(path.count("/"))
    num_slashes_path = max(0.0, num_slashes_path)
    digits_in_url   = sum(1 for c in raw if c.isdigit())
    digit_ratio_url = float(digits_in_url) / max(1.0, float(len(raw)))

    # ── Host-level features ──────────────────────────────────────────────────
    host_length      = float(len(host))
    num_dots_host    = float(host.count("."))
    num_hyphens_host = float(host.count("-"))
    ip_host          = 1.0 if is_ip_host(host) else 0.0
    sub_depth        = float(subdomain_depth(parts.subdomain))
    host_ent         = shannon_entropy(host)
    punycode         = 1.0 if has_punycode(host) else 0.0

    # ── TLD / domain signals ──────────────────────────────────────────────────
    suffix = parts.suffix.lower() if parts.suffix else ""
    # Match against the list (which has entries like ".xyz" or "xyz")
    susp_tld = 1.0 if (
        ("." + suffix) in _SUSPICIOUS_TLDS or
        suffix in {t.lstrip(".") for t in _SUSPICIOUS_TLDS}
    ) else 0.0
    tld_length  = float(len(suffix))
    sld_length  = float(len(parts.domain))

    # ── Protocol / structure ──────────────────────────────────────────────────
    is_https = 1.0 if parsed.scheme.lower() == "https" else 0.0
    # Non-standard port: anything specified explicitly except 80/443
    port_str = parsed.port
    has_port = 0.0
    if port_str is not None:
        has_port = 0.0 if port_str in (80, 443) else 1.0

    # ── Brand / shortener signals ─────────────────────────────────────────────
    registered = parts.registered.lower()
    is_short   = 1.0 if registered in {s.lower() for s in _SHORTENERS} else 0.0

    # ── Keyword signals ───────────────────────────────────────────────────────
    kw_count = float(sum(1 for kw in _SUSPICIOUS_KEYWORDS if kw in raw_low))

    return [
        url_length,
        path_length,
        query_length,
        num_query_params,
        num_dots_url,
        num_hyphens_url,
        num_at_signs,
        num_slashes_path,
        digit_ratio_url,
        host_length,
        num_dots_host,
        num_hyphens_host,
        ip_host,
        sub_depth,
        host_ent,
        punycode,
        susp_tld,
        tld_length,
        sld_length,
        is_https,
        has_port,
        is_short,
        kw_count,
    ]


# ────────────────────────────────────────────────────────────────────────────
# Quick self-test (run this module directly)
# ────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    test_urls = [
        ("Legit SBI",         "https://onlinesbi.sbi/sbijsp/homepage.htm"),
        ("Legit IRCTC",       "https://www.irctc.co.in/nget/train-search"),
        ("Shortener",         "http://bit.ly/3xyz"),
        ("IP host scam",      "http://192.168.1.1/kyc-verify?otp=1"),
        ("Suspicious TLD",    "http://sbi-update.xyz/login"),
        ("Punycode IDN",      "https://xn--hdfc-bank-mca.com/secure"),
        ("KYC phish deep",    "http://secure-kyc.verify-sbi.update.in/login?ref=otp&step=2"),
        ("Free host scam",    "https://sbi-kyc.netlify.app/verify"),
        ("Port scam",         "http://hdfc-bank.com:8080/account/update"),
    ]

    print(f"{'URL':<50} {'#kw':>4} {'https':>5} {'short':>5} {'ip':>4} {'susp_tld':>8} {'sub_d':>5}")
    print("-" * 85)
    for label, url in test_urls:
        f = extract_features(url)
        feat = dict(zip(FEATURE_NAMES, f))
        print(
            f"{label:<50} "
            f"{int(feat['suspicious_keyword_count']):>4} "
            f"{int(feat['is_https']):>5} "
            f"{int(feat['is_shortener']):>5} "
            f"{int(feat['is_ip_host']):>4} "
            f"{int(feat['is_suspicious_tld']):>8} "
            f"{int(feat['subdomain_depth']):>5}"
        )
