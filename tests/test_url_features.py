"""tests/test_url_features.py
Unit tests for domain_utils.py and url_features.py (PRD FR4, 16.4).
"""

from __future__ import annotations

import pytest
from backend.pipeline.domain_utils import (
    extract_domain_parts,
    is_ip_host,
    shannon_entropy,
    subdomain_depth,
    has_punycode,
)
from backend.pipeline.url_features import extract_features, FEATURE_NAMES


def test_feature_names_length():
    assert len(FEATURE_NAMES) == 23
    assert "url_length" in FEATURE_NAMES
    assert "host_length" in FEATURE_NAMES
    assert "is_ip_host" in FEATURE_NAMES
    assert "is_shortener" in FEATURE_NAMES
    assert "is_suspicious_tld" in FEATURE_NAMES
    assert "has_punycode" in FEATURE_NAMES
    assert "has_port" in FEATURE_NAMES
    assert "is_https" in FEATURE_NAMES
    assert "suspicious_keyword_count" in FEATURE_NAMES


def test_domain_utils_extract():
    # Standard domain
    parts = extract_domain_parts("https://secure.onlinesbi.sbi/login")
    assert parts.domain == "onlinesbi"
    assert parts.suffix == "sbi"
    assert parts.subdomain == "secure"
    assert parts.registered == "onlinesbi.sbi"
    assert parts.fqdn == "secure.onlinesbi.sbi"

    # Multi-part TLD (co.in)
    parts2 = extract_domain_parts("http://www.hdfcbank.co.in/netbanking")
    assert parts2.domain == "hdfcbank"
    assert parts2.suffix == "co.in"
    assert parts2.subdomain == "www"
    assert parts2.registered == "hdfcbank.co.in"


def test_is_ip_host():
    assert is_ip_host("192.168.1.1") is True
    assert is_ip_host("10.0.0.1") is True
    assert is_ip_host("999.999.999.999") is False
    assert is_ip_host("sbi.co.in") is False
    assert is_ip_host("example.com") is False


def test_subdomain_depth():
    assert subdomain_depth("") == 0
    assert subdomain_depth("www") == 1
    assert subdomain_depth("secure.login") == 2
    assert subdomain_depth("a.b.c.d") == 4


def test_punycode():
    assert has_punycode("xn--sbi-bank.com") is True
    assert has_punycode("sub.xn--hdfc.org") is True
    assert has_punycode("normal-bank.com") is False


def test_shannon_entropy():
    # Empty string has 0 entropy
    assert shannon_entropy("") == 0.0
    # Single repeating character has 0 entropy
    assert shannon_entropy("aaaaaa") == 0.0
    # High diversity has higher entropy
    ent_low = shannon_entropy("abc")
    ent_high = shannon_entropy("abcdefghijklmnopqrstuvwxyz0123456789")
    assert ent_high > ent_low


def test_extract_features_vector_shape():
    feats = extract_features("https://onlinesbi.sbi/portal")
    assert isinstance(feats, list)
    assert len(feats) == len(FEATURE_NAMES)
    for val in feats:
        assert isinstance(val, (int, float))


def test_extract_features_signals():
    # IP host
    feat_dict = dict(zip(FEATURE_NAMES, extract_features("http://192.168.1.100:8080/kyc-update")))
    assert feat_dict["is_ip_host"] == 1.0
    assert feat_dict["has_port"] == 1.0
    assert feat_dict["is_https"] == 0.0
    assert feat_dict["suspicious_keyword_count"] >= 1  # kyc, update

    # Shortener
    feat_dict_short = dict(zip(FEATURE_NAMES, extract_features("http://bit.ly/3abcde")))
    assert feat_dict_short["is_shortener"] == 1.0

    # Suspicious TLD
    feat_dict_tld = dict(zip(FEATURE_NAMES, extract_features("http://sbi-verification.xyz/login")))
    assert feat_dict_tld["is_suspicious_tld"] == 1.0
    assert feat_dict_tld["suspicious_keyword_count"] >= 2  # verification, login

    # Punycode
    feat_dict_puny = dict(zip(FEATURE_NAMES, extract_features("http://xn--fake-sbi.com/")))
    assert feat_dict_puny["has_punycode"] == 1.0


def test_extract_features_unparseable_graceful():
    # Should not raise exception even on weird / empty inputs
    feats = extract_features("")
    assert len(feats) == len(FEATURE_NAMES)
