"""backend/pipeline/fusion.py

Pure fusion engine for CyberCheckmate per PRD FR6 and Section 16.5.

Combines text model, URL model, and tactic rule engine component scores
into an overall risk score (0–100) and three-tier alert level ("green", "amber", "red").

Overrides applied in strict order:
1. Strong brand lookalike -> max(score, 80)
2. Payment/credential request + urgency -> score + 10
3. Official domain whitelist and text_score < 0.3 -> min(score, 30)

No side-effects or network calls. Pure functional logic.

Usage:
    from backend.pipeline.fusion import fuse, FusionResult

    res = fuse(text_score=0.9, rules_score=0.8, url_score=0.95, strong_lookalike=True)
    # res.risk_score -> 87
    # res.level -> "red"
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import NamedTuple

# Ensure project root is in sys.path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.config import (
    FUSION_WEIGHT_TEXT,
    FUSION_WEIGHT_URL,
    FUSION_WEIGHT_RULES,
    FUSION_WEIGHT_TEXT_NO_URL,
    FUSION_WEIGHT_RULES_NO_URL,
    URL_ONLY_W_URL,
    URL_ONLY_W_RULES,
    FUSION_LOOKALIKE_FLOOR,
    FUSION_CREDENTIALS_URGENCY_BONUS,
    FUSION_WHITELIST_CEILING,
    FUSION_TEXT_SCORE_WHITELIST_THRESHOLD,
    LEVEL_GREEN_MAX,
    LEVEL_RED_MIN,
)


class FusionResult(NamedTuple):
    risk_score: int
    level: str
    base_score: float
    final_score: float
    overrides_fired: list[str]

    @property
    def fired(self) -> list[str]:
        """Expose fired override names per PRD 16.5 / FR6."""
        name_map = {
            "strong_lookalike_floor": "strong_brand_lookalike",
            "payment_urgency_bonus": "payment_and_urgency",
            "whitelist_ceiling": "official_domain",
        }
        return [name_map.get(o, o) for o in self.overrides_fired]


def score_to_level(risk_score: int) -> str:
    """
    Map an integer risk score (0-100) to alert level:
    < 35  -> "green"
    35-70 -> "amber"
    > 70  -> "red"
    """
    if risk_score < LEVEL_GREEN_MAX:  # < 35
        return "green"
    elif risk_score >= LEVEL_RED_MIN:  # >= 71 (i.e. > 70)
        return "red"
    else:
        return "amber"


def fuse(
    text_score: float | None,
    rules_score: float,
    url_score: float | None = None,
    strong_lookalike: bool = False,
    has_payment_and_urgency: bool = False,
    is_official_whitelisted: bool = False,
) -> FusionResult:
    """
    Compute fused risk score, level, and applied overrides per PRD 16.5 and Fix F2.

    Parameters
    ----------
    text_score : float or None
        Text classifier scam probability (0.0 - 1.0) or None for URL-only inputs.
    rules_score : float
        Tactic rule engine score (0.0 - 1.0).
    url_score : float or None, default None
        URL model scam probability (0.0 - 1.0) or None if no URL present.
    strong_lookalike : bool, default False
        True if any URL was identified as a strong brand lookalike.
    has_payment_and_urgency : bool, default False
        True if both payment_credentials and urgency tactic categories matched.
    is_official_whitelisted : bool, default False
        True if all URLs are whitelisted official domains.

    Returns
    -------
    FusionResult
        NamedTuple: (risk_score, level, base_score, final_score, overrides_fired)
    """
    # -----------------------------------------------------------------------
    # Step 1: Base score formula
    # With Text & URL: 100 * (0.50 * text + 0.35 * url + 0.15 * rules)
    # With Text only:  100 * (0.77 * text + 0.23 * rules)
    # URL only:        100 * (0.85 * url + 0.15 * rules)
    # Rules only:      100 * (1.0 * rules)
    # -----------------------------------------------------------------------
    if text_score is not None:
        if url_score is not None:
            base_score = 100.0 * (
                FUSION_WEIGHT_TEXT * text_score
                + FUSION_WEIGHT_URL * url_score
                + FUSION_WEIGHT_RULES * rules_score
            )
        else:
            base_score = 100.0 * (
                FUSION_WEIGHT_TEXT_NO_URL * text_score
                + FUSION_WEIGHT_RULES_NO_URL * rules_score
            )
    else:
        # text_score is None (e.g. URL-only input)
        if url_score is not None:
            base_score = 100.0 * (
                URL_ONLY_W_URL * url_score
                + URL_ONLY_W_RULES * rules_score
            )
        else:
            base_score = 100.0 * rules_score

    score = base_score
    overrides_fired: list[str] = []

    # -----------------------------------------------------------------------
    # Step 2: Overrides in strict priority order
    # (1) Strong brand lookalike -> max(score, 80)
    # -----------------------------------------------------------------------
    if strong_lookalike:
        if score < FUSION_LOOKALIKE_FLOOR:
            score = max(score, FUSION_LOOKALIKE_FLOOR)
            overrides_fired.append("strong_lookalike_floor")

    # -----------------------------------------------------------------------
    # (2) Payment / credential request AND urgency matched -> score + 10
    # -----------------------------------------------------------------------
    if has_payment_and_urgency:
        score = score + FUSION_CREDENTIALS_URGENCY_BONUS
        overrides_fired.append("payment_urgency_bonus")

    # -----------------------------------------------------------------------
    # (3) Whitelisted official domain AND (text_score is None OR text_score < 0.3) -> min(score, 30)
    # -----------------------------------------------------------------------
    if is_official_whitelisted and (text_score is None or text_score < FUSION_TEXT_SCORE_WHITELIST_THRESHOLD):
        if score > FUSION_WHITELIST_CEILING:
            score = min(score, FUSION_WHITELIST_CEILING)
            overrides_fired.append("whitelist_ceiling")

    # -----------------------------------------------------------------------
    # Step 3: Clamp to 0-100 and round to integer (standard half-up)
    # -----------------------------------------------------------------------
    clamped_float = max(0.0, min(100.0, score))
    risk_score = int(clamped_float + 0.5)
    risk_score = max(0, min(100, risk_score))

    # -----------------------------------------------------------------------
    # Step 4: Level determination
    # < 35 -> green, 35-70 -> amber, > 70 -> red
    # -----------------------------------------------------------------------
    level = score_to_level(risk_score)

    return FusionResult(
        risk_score=risk_score,
        level=level,
        base_score=round(base_score, 4),
        final_score=round(clamped_float, 4),
        overrides_fired=overrides_fired,
    )
