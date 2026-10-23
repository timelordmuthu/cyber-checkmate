"""tests/test_url_model.py

Unit tests for url_model.py per PRD FR4 and 16.4.
Verifies single and multi-URL scoring, fallback behavior without XGBoost model,
official domain capping, strong lookalike floor, shortener flags, and plain-language evidence.
"""

from __future__ import annotations

import pytest
from backend.pipeline.url_model import score_url, score_urls, UrlScoringResult


def test_score_urls_empty_or_none():
    res_none = score_urls(None)
    assert res_none.url_score is None
    assert res_none.red_flags == []
    assert res_none.any_strong_lookalike is False
    assert res_none.any_official_whitelisted is False
    assert res_none.url_findings == []

    res_empty = score_urls([])
    assert res_empty.url_score is None


def test_score_url_official_domain():
    # Official SBI domain: score capped at 0.1
    res = score_url("https://onlinesbi.sbi/login")
    assert res["is_official"] is True
    assert res["score"] <= 0.1
    assert res["strong_lookalike"] is False


def test_score_url_strong_lookalike():
    # Strong lookalike: score floored at 0.9, plain language evidence
    res = score_url("http://sbi.kyc-update.xyz/login")
    assert res["strong_lookalike"] is True
    assert res["score"] >= 0.9
    # Check plain-language evidence
    flags = res["flags"]
    lookalike_flags = [f for f in flags if f["category"] == "brand_lookalike"]
    assert len(lookalike_flags) >= 1
    assert "domain imitates State Bank of India" in lookalike_flags[0]["evidence"]


def test_score_url_shortener():
    # Shortener: flagged with strength 0.5
    res = score_url("http://bit.ly/3xyz123")
    assert res["is_shortener"] is True
    short_flags = [f for f in res["flags"] if f["category"] == "shortener"]
    assert len(short_flags) >= 1
    assert short_flags[0]["evidence"] == "link hides the real destination"
    assert short_flags[0]["strength"] == 0.5


def test_score_urls_multiple_takes_max():
    # Multiple URLs: url_score is the maximum
    urls = [
        "https://onlinesbi.sbi/safe",        # official -> capped <= 0.1
        "http://sbi.kyc-update.xyz/scam",    # strong lookalike -> >= 0.9
    ]
    res = score_urls(urls)
    assert res.url_score is not None
    assert res.url_score >= 0.9
    assert res.any_strong_lookalike is True
    assert res.any_official_whitelisted is True
    assert len(res.url_findings) == 2
