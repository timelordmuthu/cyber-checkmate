"""backend/pipeline/domain_utils.py

Offline TLD extraction helpers used across the URL pipeline.

A single TLDExtract instance is created at import time with
suffix_list_urls=() so it NEVER makes a network call at runtime.
The bundled suffix list shipped with the installed package is used.

Usage:
    from backend.pipeline.domain_utils import extract_domain_parts, is_ip_host

    parts = extract_domain_parts("https://secure.hdfc.bank.co.in/login")
    # ParsedDomain(subdomain='secure.hdfc', domain='bank', suffix='co.in',
    #              registered='bank.co.in', fqdn='secure.hdfc.bank.co.in')
"""

from __future__ import annotations

import re
import math
from dataclasses import dataclass
from functools import lru_cache

import tldextract

# ── Single offline TLDExtract instance (no network, ever) ────────────────────
_EXTRACT = tldextract.TLDExtract(
    suffix_list_urls=(),   # disable ICANN/Mozilla list fetching
    cache_dir=None,        # do not write a cache file at runtime
)

# ── IPv4 pattern ──────────────────────────────────────────────────────────────
_IPV4_RE = re.compile(
    r"^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$"
)


@dataclass(frozen=True, slots=True)
class ParsedDomain:
    subdomain: str   # everything before the registered domain
    domain: str      # SLD (e.g. "hdfc")
    suffix: str      # public suffix (e.g. "co.in")
    registered: str  # domain + suffix (e.g. "hdfc.co.in")
    fqdn: str        # full host without scheme/path (e.g. "secure.hdfc.co.in")


@lru_cache(maxsize=4096)
def extract_domain_parts(url: str) -> ParsedDomain:
    """
    Parse *url* and return a ParsedDomain.

    Fully cached (LRU 4096) — safe for repeated calls in the same process.
    Never touches the network.
    """
    ext = _EXTRACT(url)
    registered = f"{ext.domain}.{ext.suffix}" if ext.suffix else ext.domain
    fqdn = ext.fqdn or ext.domain
    return ParsedDomain(
        subdomain=ext.subdomain,
        domain=ext.domain,
        suffix=ext.suffix,
        registered=registered,
        fqdn=fqdn,
    )


def is_ip_host(host: str) -> bool:
    """Return True if *host* is an IPv4 address (no TLD extraction needed)."""
    return bool(_IPV4_RE.match(host.strip()))


def shannon_entropy(s: str) -> float:
    """Shannon entropy of a string (bits per character). Returns 0.0 for empty."""
    if not s:
        return 0.0
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    n = len(s)
    return -sum((v / n) * math.log2(v / n) for v in freq.values())


def subdomain_depth(subdomain: str) -> int:
    """
    Number of subdomain labels.

    Examples:
        ""                 → 0
        "www"              → 1
        "secure.login"     → 2
        "a.b.c"            → 3
    """
    if not subdomain:
        return 0
    return len(subdomain.split("."))


def has_punycode(host: str) -> bool:
    """True if any label in the host uses ACE/Punycode encoding (xn--)."""
    return any(label.lower().startswith("xn--") for label in host.split("."))
