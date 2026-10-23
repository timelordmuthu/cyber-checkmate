"""tests/test_brand_check.py

Unit tests for brand_check.py per PRD FR4 and 16.4.
Verifies official domains, subdomains, typos, brand-in-subdomain,
short-brand false positive prevention, infrastructure immunity, shorteners,
and punycode decoding without any network calls.
"""

from __future__ import annotations

import pytest
from backend.pipeline.brand_check import check_url, BrandCheckResult


@pytest.fixture
def test_brands_fixture() -> dict:
    """Fixture matching brands.json structure for deterministic testing."""
    return {
        "verified": False,
        "brands": {
            "sbi": {
                "display_name": "State Bank of India",
                "tokens": ["sbi", "state bank", "statebank", "onlinesbi"],
                "official_domains": [
                    "sbi.co.in",
                    "onlinesbi.sbi",
                    "sbionline.sbi",
                ],
            },
            "hdfc_bank": {
                "display_name": "HDFC Bank",
                "tokens": ["hdfc", "hdfcbank", "hdfc bank"],
                "official_domains": [
                    "hdfcbank.com",
                    "hdfc.com",
                ],
            },
            "axis_bank": {
                "display_name": "Axis Bank",
                "tokens": ["axis", "axisbank", "axis bank"],
                "official_domains": [
                    "axisbank.com",
                ],
            },
            "amazon": {
                "display_name": "Amazon India",
                "tokens": ["amazon", "amazon india"],
                "official_domains": [
                    "amazon.in",
                    "amazon.com",
                ],
            },
        },
        "infrastructure_allowlist": [
            "amazonaws.com",
            "aws.amazon.com",
            "google.com",
            "cloudflare.com",
        ],
        "shorteners_and_free_hosts": [
            "bit.ly",
            "tinyurl.com",
            "t.co",
        ],
    }


def test_official_exact_domain(test_brands_fixture):
    res = check_url("https://sbi.co.in/portal", brands_data=test_brands_fixture)
    assert res.is_official is True
    assert res.official_brand == "sbi"
    assert res.strong_lookalike is False
    assert res.lookalike_brand is None


def test_official_subdomain(test_brands_fixture):
    # Subdomain of an official domain
    res = check_url("https://retail.onlinesbi.sbi/login", brands_data=test_brands_fixture)
    assert res.is_official is True
    assert res.official_brand == "sbi"
    assert res.strong_lookalike is False
    assert res.lookalike_brand is None


def test_typo_lookalike(test_brands_fixture):
    # Typo on a >= 5 char brand: 'hdfcbamk' vs 'hdfcbank'
    res = check_url("http://hdfcbamk.com/login", brands_data=test_brands_fixture)
    assert res.is_official is False
    assert res.lookalike_brand == "hdfc_bank"
    assert res.lookalike_similarity >= 85.0
    # homoglyph rn/m: hdfcbarnk -> hdfcbamk
    res_rn = check_url("http://hdfcbarnk.com/login", brands_data=test_brands_fixture)
    assert res_rn.lookalike_brand == "hdfc_bank"
    assert res_rn.lookalike_similarity >= 85.0


def test_brand_in_subdomain(test_brands_fixture):
    # Exact brand token 'sbi' in untrusted host -> strong lookalike
    res = check_url("http://sbi.kyc-update.xyz/login", brands_data=test_brands_fixture)
    assert res.is_official is False
    assert res.strong_lookalike is True
    assert res.lookalike_brand == "sbi"
    assert res.lookalike_similarity == 100.0


def test_short_brand_false_positive_avoided(test_brands_fixture):
    # 'axis' (4 chars) must NOT match inside unrelated words like 'maxis' or 'taxism'
    res_maxis = check_url("https://maxis.com/plans", brands_data=test_brands_fixture)
    assert res_maxis.lookalike_brand is None
    assert res_maxis.strong_lookalike is False

    res_taxism = check_url("https://taxism.org/about", brands_data=test_brands_fixture)
    assert res_taxism.lookalike_brand is None
    assert res_taxism.strong_lookalike is False

    # 'sbi' (3 chars) must NOT fuzzy-match or substring-match inside 'osbi' or 'transbis'
    res_osbi = check_url("https://osbi.org/index", brands_data=test_brands_fixture)
    assert res_osbi.lookalike_brand is None
    assert res_osbi.strong_lookalike is False


def test_infrastructure_immunity_amazonaws(test_brands_fixture):
    # 's3.amazonaws.com' contains 'amazon' but is known infrastructure -> never a lookalike
    res = check_url("https://s3.amazonaws.com/bucket/doc.pdf", brands_data=test_brands_fixture)
    assert res.is_infrastructure is True
    assert res.strong_lookalike is False
    assert res.lookalike_brand is None


def test_shortener_flagged(test_brands_fixture):
    # bit.ly is a shortener, not phishing on its own
    res = check_url("http://bit.ly/3xyz45", brands_data=test_brands_fixture)
    assert res.is_shortener_or_free_host is True
    assert res.is_official is False
    assert res.strong_lookalike is False


def test_punycode_decoding(test_brands_fixture):
    # IDN punycode domain: e.g. xn--sbi-bank -> sbi-bank
    res = check_url("http://xn--sbi-bank-52a.xyz/login", brands_data=test_brands_fixture)
    assert res.is_official is False
    # Contains exact brand token 'sbi' on label boundary
    assert res.strong_lookalike is True
    assert res.lookalike_brand == "sbi"


def test_unpacking_as_tuple(test_brands_fixture):
    # Verify tuple unpacking matches the 9 fields from prompt
    (
        reg_domain,
        is_off,
        off_brand,
        is_infra,
        is_short,
        look_brand,
        look_sim,
        strong_look,
        reasons,
    ) = check_url("http://sbi.kyc-update.xyz/login", brands_data=test_brands_fixture)

    assert reg_domain == "kyc-update.xyz"
    assert is_off is False
    assert off_brand is None
    assert is_infra is False
    assert is_short is False
    assert look_brand == "sbi"
    assert look_sim == 100.0
    assert strong_look is True
    assert len(reasons) > 0
