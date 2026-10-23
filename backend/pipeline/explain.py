"""backend/pipeline/explain.py

Explanation generator for CyberCheckmate per PRD FR8 and Section 16.7.

Generates concise, human-understandable advice in English and natural Hindi
from detected red flags and risk levels using offline templates.
Includes PII stripping utility and a dedicated hook for Prompt 12 LLM integration.

Usage:
    from backend.pipeline.explain import explain, strip_pii

    advice_en, advice_hi, source, steps = explain(score=82, level="red", red_flags=[...])
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import NamedTuple

# Ensure project root is in sys.path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.config import TEMPLATES_JSON, NEXT_STEPS_JSON


class ExplanationResult(NamedTuple):
    advice_en: str
    advice_hi: str
    explanation_source: str
    next_steps: list[str]


# ---------------------------------------------------------------------------
# Cached resource loader
# ---------------------------------------------------------------------------
_TEMPLATES_CACHE: dict | None = None
_NEXT_STEPS_CACHE: dict | None = None


def get_templates() -> dict:
    global _TEMPLATES_CACHE
    if _TEMPLATES_CACHE is None:
        if TEMPLATES_JSON.exists():
            _TEMPLATES_CACHE = json.loads(TEMPLATES_JSON.read_text(encoding="utf-8"))
        else:
            _TEMPLATES_CACHE = {"intros": {}, "categories": {}}
    return _TEMPLATES_CACHE


def get_next_steps() -> dict:
    global _NEXT_STEPS_CACHE
    if _NEXT_STEPS_CACHE is None:
        if NEXT_STEPS_JSON.exists():
            _NEXT_STEPS_CACHE = json.loads(NEXT_STEPS_JSON.read_text(encoding="utf-8"))
        else:
            _NEXT_STEPS_CACHE = {"red": {"en": [], "hi": []}, "amber": {"en": [], "hi": []}, "green": {"en": [], "hi": []}}
    return _NEXT_STEPS_CACHE


# ---------------------------------------------------------------------------
# PII Stripping
# ---------------------------------------------------------------------------
_PHONE_RE = re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b")
_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
_NUMERIC_RUN_RE = re.compile(r"\b\d{6,}\b")


def strip_pii(text: str) -> str:
    """
    Mask personal identifiable information (PII) before sending to any LLM.
    Replaces 10-digit Indian phones, email addresses, and 6+ digit numbers (OTPs/accounts).
    """
    if not text:
        return ""
    cleaned = _EMAIL_RE.sub("[EMAIL]", text)
    cleaned = _PHONE_RE.sub("[PHONE]", cleaned)
    cleaned = _NUMERIC_RUN_RE.sub("[NUMBER]", cleaned)
    return cleaned


# ---------------------------------------------------------------------------
# Explanation generation
# ---------------------------------------------------------------------------
def explain(
    score: int,
    level: str,
    red_flags: list[dict] | list[any],
    lang: str = "both",
) -> ExplanationResult:
    """
    Generate bilingual explanations and next steps from structured signals.

    Parameters
    ----------
    score : int
        Overall risk score (0-100).
    level : str
        Alert level: "green", "amber", or "red".
    red_flags : list
        List of detected red flags (dict or RedFlag models).
    lang : str, default "both"
        Target language: "en", "hi", or "both".

    Returns
    -------
    ExplanationResult
        (advice_en, advice_hi, explanation_source="template", next_steps)
    """
    # -----------------------------------------------------------------------
    # TODO (Prompt 12): LLM explanation hook
    # When GEMINI_API_KEY or GROQ_API_KEY is configured in .env:
    # 1. Sanitize signals using strip_pii()
    # 2. Invoke LLM provider with 5-second timeout (Gemini -> Groq)
    # 3. If LLM succeeds, return advice with explanation_source="llm"
    # 4. If LLM fails/times out, fall through to offline templates below.
    # -----------------------------------------------------------------------

    templates = get_templates()
    next_steps_data = get_next_steps()

    intros = templates.get("intros", {})
    categories_dict = templates.get("categories", {})

    level_key = level.lower() if level.lower() in ("green", "amber", "red") else "amber"
    intro_en = intros.get(level_key, {}).get("en", "Please review this message carefully.")
    intro_hi = intros.get(level_key, {}).get("hi", "कृपया इस संदेश की सावधानीपूर्वक समीक्षा करें।")

    # Extract distinct categories from the top flags (up to 2-3 to keep it concise)
    seen_cats = set()
    en_details: list[str] = []
    hi_details: list[str] = []

    for flag in red_flags:
        cat = flag.get("category") if isinstance(flag, dict) else getattr(flag, "category", "")
        if cat and cat not in seen_cats:
            seen_cats.add(cat)
            if cat in categories_dict:
                en_details.append(categories_dict[cat]["en"])
                hi_details.append(categories_dict[cat]["hi"])
            if len(en_details) >= 2:
                # Keep explanation to 2-3 sentences total per PRD FR8
                break

    advice_en = intro_en + (" " + " ".join(en_details) if en_details else "")
    advice_hi = intro_hi + (" " + " ".join(hi_details) if hi_details else "")

    # Retrieve next steps
    level_steps = next_steps_data.get(level_key, {})
    if lang == "hi":
        steps = level_steps.get("hi", level_steps.get("en", []))
    else:
        steps = level_steps.get("en", [])

    return ExplanationResult(
        advice_en=advice_en,
        advice_hi=advice_hi,
        explanation_source="template",
        next_steps=steps,
    )
