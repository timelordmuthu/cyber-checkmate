"""
tests/test_rules.py
-------------------
Tests for backend/pipeline/rules.py using a small fixture tactics.json.
Covers:
- Per-category max weight (repeats don't inflate)
- Score formula: sum(max_weights) / 50
- Combination bonus at exactly 3 categories
- Cap at 1.0
- Strength = weight / 20
- Evidence from original text
- has_payment_and_urgency()
- Thread-safe reload()
"""

import json
import pytest
from pathlib import Path
from backend.pipeline.rules import RuleEngine


# ===================================================================
# Fixture tactics.json — small and controlled
# ===================================================================

_FIXTURE_TACTICS = {
    "authority": [
        {"phrase": "rbi", "weight": 12},
        {"phrase": "police", "weight": 13},
    ],
    "fear": [
        {"phrase": "account blocked", "weight": 15},
        {"phrase": "arrest", "weight": 17},
    ],
    "urgency": [
        {"phrase": "immediately", "weight": 14},
        {"phrase": "within 24 hours", "weight": 15},
        {"phrase": "turant", "weight": 14},
    ],
    "payment_credentials": [
        {"phrase": "share otp", "weight": 18},
        {"phrase": "upi pin", "weight": 17},
        {"phrase": "otp", "weight": 14},
    ],
    "isolation": [
        {"phrase": "do not tell anyone", "weight": 16},
    ],
    "reward": [
        {"phrase": "lottery", "weight": 16},
        {"phrase": "cashback", "weight": 12},
    ],
}


@pytest.fixture
def tactics_path(tmp_path: Path) -> Path:
    p = tmp_path / "tactics.json"
    p.write_text(json.dumps(_FIXTURE_TACTICS), encoding="utf-8")
    return p


@pytest.fixture
def engine(tactics_path: Path) -> RuleEngine:
    return RuleEngine(tactics_path)


# ===================================================================
# match()
# ===================================================================

class TestMatch:
    def test_single_category(self, engine: RuleEngine):
        matches = engine.match("this is from rbi")
        assert "authority" in matches
        assert any(e["phrase"] == "rbi" for e in matches["authority"])

    def test_multiple_categories(self, engine: RuleEngine):
        text = "rbi says account blocked immediately"
        matches = engine.match(text)
        assert "authority" in matches
        assert "fear" in matches
        assert "urgency" in matches

    def test_no_match(self, engine: RuleEngine):
        matches = engine.match("hello world how are you")
        assert len(matches) == 0

    def test_devanagari_not_broken(self, engine: RuleEngine):
        # The fixture only has Latin phrases, so Devanagari text should not match
        matches = engine.match("आपका खाता सुरक्षित है")
        assert len(matches) == 0


# ===================================================================
# score()
# ===================================================================

class TestScore:
    def test_single_category_score(self, engine: RuleEngine):
        # "rbi" → authority max_weight = 12
        # score = min(1.0, 12/50) = 0.24
        score, _ = engine.score("this is from rbi")
        assert score == pytest.approx(12 / 50, abs=0.01)

    def test_per_category_max_not_sum(self, engine: RuleEngine):
        # "rbi" (12) and "police" (13) → authority max = 13 (not 12+13)
        score, matches = engine.score("rbi police warning")
        assert "authority" in matches
        # max_weight for authority = 13
        assert score == pytest.approx(13 / 50, abs=0.01)

    def test_two_categories_no_bonus(self, engine: RuleEngine):
        # authority (rbi=12) + fear (arrest=17) = 29 → 29/50 = 0.58
        # Only 2 categories, so no bonus
        score, matches = engine.score("rbi will arrest you")
        assert len(matches) == 2
        assert score == pytest.approx(29 / 50, abs=0.01)

    def test_three_categories_with_bonus(self, engine: RuleEngine):
        # authority (rbi=12) + fear (arrest=17) + urgency (immediately=14) = 43
        # 43/50 = 0.86, +0.15 bonus for ≥3 categories = 1.01 → capped at 1.0
        score, matches = engine.score("rbi will arrest you immediately")
        assert len(matches) == 3
        assert score == min(1.0, 43 / 50 + 0.15)

    def test_cap_at_one(self, engine: RuleEngine):
        # Many categories: should never exceed 1.0
        text = "rbi arrest immediately share otp lottery do not tell anyone"
        score, matches = engine.score(text)
        assert score <= 1.0

    def test_exactly_three_categories_bonus_applied(self, engine: RuleEngine):
        # authority (police=13) + urgency (turant=14) + reward (cashback=12)
        # sum = 39, 39/50 = 0.78, +0.15 = 0.93
        score, matches = engine.score("police says turant cashback aayega")
        assert len(matches) == 3
        assert score == pytest.approx(39 / 50 + 0.15, abs=0.01)


# ===================================================================
# to_red_flags()
# ===================================================================

class TestToRedFlags:
    def test_strength_is_weight_over_20(self, engine: RuleEngine):
        _, matches = engine.score("rbi says account blocked")
        flags = engine.to_red_flags(matches, "RBI says Account Blocked")
        for flag in flags:
            assert 0.0 <= flag["strength"] <= 1.0
            assert flag["type"] == "tactic"

        # authority best = police(13) or rbi(12) → rbi matched, weight 12
        auth_flag = [f for f in flags if f["category"] == "authority"][0]
        assert auth_flag["strength"] == pytest.approx(12 / 20, abs=0.01)

    def test_evidence_from_original(self, engine: RuleEngine):
        _, matches = engine.score("this is from rbi")
        flags = engine.to_red_flags(matches, "This is from RBI")
        auth_flag = [f for f in flags if f["category"] == "authority"][0]
        # Evidence should match case from original text
        assert auth_flag["evidence"] == "RBI"

    def test_highest_weight_per_category(self, engine: RuleEngine):
        # Both "rbi" (12) and "police" (13) match → should use police (13)
        _, matches = engine.score("rbi and police both say")
        flags = engine.to_red_flags(matches, "RBI and Police both say")
        auth_flag = [f for f in flags if f["category"] == "authority"][0]
        assert auth_flag["strength"] == pytest.approx(13 / 20, abs=0.01)


# ===================================================================
# has_payment_and_urgency()
# ===================================================================

class TestHasPaymentAndUrgency:
    def test_both_present(self, engine: RuleEngine):
        _, matches = engine.score("share otp immediately")
        assert engine.has_payment_and_urgency(matches) is True

    def test_only_payment(self, engine: RuleEngine):
        _, matches = engine.score("share otp please")
        assert engine.has_payment_and_urgency(matches) is False

    def test_only_urgency(self, engine: RuleEngine):
        _, matches = engine.score("do it immediately")
        assert engine.has_payment_and_urgency(matches) is False

    def test_neither(self, engine: RuleEngine):
        _, matches = engine.score("hello world")
        assert engine.has_payment_and_urgency(matches) is False


# ===================================================================
# reload()
# ===================================================================

class TestReload:
    def test_reload_picks_up_changes(self, tactics_path: Path, engine: RuleEngine):
        # Initially "rbi" matches
        assert "authority" in engine.match("rbi warning")

        # Modify tactics to remove "rbi"
        new_tactics = dict(_FIXTURE_TACTICS)
        new_tactics["authority"] = [{"phrase": "sebi", "weight": 12}]
        tactics_path.write_text(json.dumps(new_tactics), encoding="utf-8")

        engine.reload()

        # "rbi" should no longer match
        assert "authority" not in engine.match("rbi warning")
        # "sebi" should now match
        assert "authority" in engine.match("sebi warning")

    def test_loaded_flag(self, tactics_path: Path):
        eng = RuleEngine(tactics_path)
        assert eng.loaded is True


# ===================================================================
# Word boundaries and negation (Fix F3 & word-boundary matching)
# ===================================================================

_MATCHING_TACTICS = {
    "payment_credentials": [
        {"phrase": "share this otp", "weight": 18},
        {"phrase": "share otp", "weight": 18},
        {"phrase": "share the otp", "weight": 18},
        {"phrase": "upi pin", "weight": 17},
        {"phrase": "otp batana", "weight": 14},
    ],
    "authority": [
        {"phrase": "rbi", "weight": 12},
    ],
    "fear": [
        {"phrase": "खाता बंद", "weight": 15},
    ],
}


@pytest.fixture
def matching_engine(tmp_path: Path) -> RuleEngine:
    p = tmp_path / "matching_tactics.json"
    p.write_text(json.dumps(_MATCHING_TACTICS), encoding="utf-8")
    return RuleEngine(p)


class TestWordBoundariesAndNegation:
    def test_do_not_share_otp_negation(self, matching_engine: RuleEngine):
        # "Do not share this OTP with anyone" -> no payment_credentials match for phrase "share this otp"/"share otp"
        matches = matching_engine.match("Do not share this OTP with anyone")
        assert "payment_credentials" not in matches

    def test_never_share_upi_pin_negation(self, matching_engine: RuleEngine):
        # "never share your upi pin" -> no payment_credentials match
        matches = matching_engine.match("never share your upi pin")
        assert "payment_credentials" not in matches

    def test_otp_mat_batana_negation(self, matching_engine: RuleEngine):
        # "OTP mat batana kisi ko" -> no match for "otp batana" style phrase (add phrase "otp batana" to the fixture)
        matches = matching_engine.match("OTP mat batana kisi ko")
        assert "payment_credentials" not in matches

    def test_share_the_otp_matches_when_not_negated(self, matching_engine: RuleEngine):
        # "Share the OTP now to verify" -> payment_credentials matches "share the otp"
        matches = matching_engine.match("Share the OTP now to verify")
        assert "payment_credentials" in matches
        phrases = [e["phrase"] for e in matches["payment_credentials"]]
        assert "share the otp" in phrases
        for entries in matches.values():
            for e in entries:
                assert "_re" not in e

    def test_word_boundary_orbit_no_rbi(self, matching_engine: RuleEngine):
        # "orbit tracking" -> no authority match for phrase "rbi"
        matches = matching_engine.match("orbit tracking")
        assert "authority" not in matches

    def test_word_boundary_rbi_matches(self, matching_engine: RuleEngine):
        # "RBI has blocked your account" -> authority matches "rbi"
        matches = matching_engine.match("RBI has blocked your account")
        assert "authority" in matches
        phrases = [e["phrase"] for e in matches["authority"]]
        assert "rbi" in phrases
        for entries in matches.values():
            for e in entries:
                assert "_re" not in e

    def test_devanagari_phrase_matches(self, matching_engine: RuleEngine):
        # "आपका खाता बंद हो जाएगा" -> fear matches the Devanagari phrase "खाता बंद"
        matches = matching_engine.match("आपका खाता बंद हो जाएगा")
        assert "fear" in matches
        phrases = [e["phrase"] for e in matches["fear"]]
        assert "खाता बंद" in phrases
        for entries in matches.values():
            for e in entries:
                assert "_re" not in e
