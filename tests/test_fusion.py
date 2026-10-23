"""tests/test_fusion.py

Unit tests for fusion.py per PRD FR6 and Section 16.5.
Tests base weighting with and without URL, each override individually,
override execution order, and strict alert level boundaries (34, 35, 70, 71).
"""

from __future__ import annotations

import pytest
from backend.pipeline.fusion import fuse, score_to_level, FusionResult


def test_fusion_formula_with_url():
    # Base formula: 100 * (0.50*text + 0.35*url + 0.15*rules)
    # text=0.8, url=0.6, rules=0.4
    # base = 100 * (0.40 + 0.21 + 0.06) = 67.0
    res = fuse(text_score=0.8, rules_score=0.4, url_score=0.6)
    assert res.base_score == 67.0
    assert res.risk_score == 67
    assert res.level == "amber"
    assert res.overrides_fired == []


def test_fusion_formula_without_url():
    # Base formula (no URL): 100 * (0.77*text + 0.23*rules)
    # text=0.5, rules=0.5
    # base = 100 * (0.385 + 0.115) = 50.0
    res = fuse(text_score=0.5, rules_score=0.5, url_score=None)
    assert res.base_score == 50.0
    assert res.risk_score == 50
    assert res.level == "amber"
    assert res.overrides_fired == []


def test_override_strong_lookalike():
    # Base score is low (e.g. 20), strong lookalike pushes to at least 80
    res = fuse(
        text_score=0.2,
        rules_score=0.2,
        url_score=0.2,
        strong_lookalike=True,
    )
    # Base: 100 * (0.10 + 0.07 + 0.03) = 20.0
    assert res.base_score == 20.0
    assert res.risk_score == 80
    assert res.level == "red"
    assert "strong_lookalike_floor" in res.overrides_fired


def test_override_payment_and_urgency():
    # Base score 50 + 10 bonus = 60
    res = fuse(
        text_score=0.5,
        rules_score=0.5,
        url_score=0.5,
        has_payment_and_urgency=True,
    )
    assert res.base_score == 50.0
    assert res.risk_score == 60
    assert res.level == "amber"
    assert "payment_urgency_bonus" in res.overrides_fired


def test_override_whitelist_ceiling():
    # Official domain + text_score < 0.3 caps score at 30
    # text=0.2, rules=0.9, url=0.1
    # base: 100 * (0.5*0.2 + 0.35*0.1 + 0.15*0.9) = 100 * (0.1 + 0.035 + 0.135) = 27 -> already < 30
    # Let's craft base that would be ~45: text=0.2, rules=1.0, url=0.7
    # base: 100 * (0.10 + 0.245 + 0.15) = 49.5
    res = fuse(
        text_score=0.2,  # < 0.3
        rules_score=1.0,
        url_score=0.7,
        is_official_whitelisted=True,
    )
    assert res.base_score > 30.0
    assert res.risk_score == 30
    assert res.level == "green"
    assert "whitelist_ceiling" in res.overrides_fired


def test_whitelist_not_fired_if_text_high():
    # If text_score >= 0.3, official domain ceiling does NOT apply
    res = fuse(
        text_score=0.5,  # >= 0.3
        rules_score=0.8,
        url_score=0.1,
        is_official_whitelisted=True,
    )
    # base: 100 * (0.25 + 0.035 + 0.12) = 40.5 -> 41
    assert res.risk_score == 41
    assert "whitelist_ceiling" not in res.overrides_fired


def test_override_order_strong_lookalike_then_payment_urgency():
    # 1. strong lookalike floors at 80
    # 2. payment+urgency adds +10 -> 90
    res = fuse(
        text_score=0.1,
        rules_score=0.1,
        url_score=0.1,
        strong_lookalike=True,
        has_payment_and_urgency=True,
    )
    assert res.risk_score == 90
    assert res.level == "red"
    assert res.overrides_fired == ["strong_lookalike_floor", "payment_urgency_bonus"]


def test_boundary_levels_34_35_70_71():
    # Strict boundary requirements from prompt:
    # < 35 -> green
    # 35 to 70 -> amber
    # > 70 -> red
    assert score_to_level(34) == "green"
    assert score_to_level(35) == "amber"
    assert score_to_level(70) == "amber"
    assert score_to_level(71) == "red"

    # Extreme boundaries
    assert score_to_level(0) == "green"
    assert score_to_level(100) == "red"


def test_clamping_to_zero_and_hundred():
    # Score cannot exceed 100 or drop below 0
    res_max = fuse(
        text_score=1.0,
        rules_score=1.0,
        url_score=1.0,
        has_payment_and_urgency=True,
    )
    assert res_max.risk_score == 100

    res_min = fuse(
        text_score=0.0,
        rules_score=0.0,
        url_score=0.0,
    )
    assert res_min.risk_score == 0
    assert res_min.level == "green"


def test_fusion_url_only_official_whitelisted_is_green():
    res = fuse(
        text_score=None,
        url_score=0.1,
        rules_score=0.0,
        strong_lookalike=False,
        has_payment_and_urgency=False,
        is_official_whitelisted=True,
    )
    assert res.risk_score <= 30
    assert res.level == "green"
