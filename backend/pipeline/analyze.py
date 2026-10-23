"""backend/pipeline/analyze.py

Core analysis orchestrator for CyberCheckmate per PRD FR1, FR2, FR3, FR4, FR6, FR8.

Orchestrates input normalization, URL extraction, TF-IDF + LogisticRegression text inference,
tactic rule matching, brand lookalike checking, URL classification, pure score fusion,
and bilingual template/LLM explanations into a single AnalyzeResponse object.

Usage:
    from backend.pipeline.analyze import analyze, init_pipeline, BadInput, ModelNotReady

    init_pipeline()
    resp = analyze(text="Dear customer, update your SBI KYC immediately...")
"""

from __future__ import annotations

import re
import sys
import time
from pathlib import Path
from typing import Any, Literal

# Ensure project root is in sys.path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from backend.pipeline.brand_check import get_brands_data
from backend.pipeline.domain_utils import extract_domain_parts
from backend.pipeline.explain import explain, get_next_steps, get_templates
from backend.pipeline.fusion import fuse
from backend.pipeline.entities import extract_entities
from backend.pipeline.ocr import NoTextFound, get_ocr
from backend.pipeline.preprocess import extract_urls, prepare
from backend.pipeline.rules import RuleEngine
from backend.pipeline.text_model import ModelNotReadyError, TextModel
from backend.pipeline.url_model import get_url_model, score_urls
from backend.schemas import AnalyzeResponse, ComponentScores, Entities, RedFlag


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------
class BadInput(ValueError):
    """Raised when user input is invalid, missing, or unsupported."""
    pass


# Backward-compatible alias
BadInputError = BadInput


class ModelNotReady(RuntimeError):
    """Raised when a required core model (such as the text classifier) is missing."""
    pass


# Backward-compatible alias
ModelNotReadyErrorAlias = ModelNotReady


# ---------------------------------------------------------------------------
# Pipeline Component State (singleton initialized via init_pipeline)
# ---------------------------------------------------------------------------
_STATE: dict[str, Any] = {
    "text_model": None,
    "rule_engine": None,
    "url_model": None,
    "initialized": False,
}


def init_pipeline(force_reload: bool = False) -> dict[str, bool]:
    """
    Initialize all pipeline components once at startup.
    Never crashes if an optional component is missing.

    Returns
    -------
    dict[str, bool]
        Status of each component (e.g. {"text_model": True, "rules": True, ...})
    """
    global _STATE

    # 0. OCR Service
    try:
        ocr = get_ocr()
        if force_reload or not ocr.ready:
            ocr.load()
    except Exception:
        pass

    if _STATE["initialized"] and not force_reload:
        return {
            "text_model": _STATE["text_model"] is not None,
            "rule_engine": _STATE["rule_engine"] is not None,
            "url_model": _STATE["url_model"] is not None,
            "ocr": bool(get_ocr().ready),
        }

    # 1. Rule Engine
    try:
        _STATE["rule_engine"] = RuleEngine()
    except Exception:
        _STATE["rule_engine"] = None

    # 2. Text Model
    try:
        _STATE["text_model"] = TextModel.load()
    except Exception:
        _STATE["text_model"] = None

    # 3. URL Model (optional)
    try:
        _STATE["url_model"] = get_url_model()
    except Exception:
        _STATE["url_model"] = None

    # 4. Resources
    get_brands_data()
    get_templates()
    get_next_steps()

    _STATE["initialized"] = True

    return {
        "text_model": _STATE["text_model"] is not None,
        "rule_engine": _STATE["rule_engine"] is not None,
        "url_model": _STATE["url_model"] is not None,
        "ocr": bool(get_ocr().ready),
    }


def get_text_model() -> TextModel:
    """Return active text model; attempt lazy load if not ready."""
    if _STATE["text_model"] is None:
        try:
            _STATE["text_model"] = TextModel.load()
        except Exception as exc:
            raise ModelNotReady(
                f"Text model is not ready: {exc}. Please run training/train_text_model.py first."
            ) from exc
    return _STATE["text_model"]


def get_rule_engine() -> RuleEngine:
    """Return active rule engine; attempt lazy load if not ready."""
    if _STATE["rule_engine"] is None:
        _STATE["rule_engine"] = RuleEngine()
    return _STATE["rule_engine"]


# ---------------------------------------------------------------------------
# Core Analysis Function
# ---------------------------------------------------------------------------
def analyze(
    text: str | None = None,
    url: str | None = None,
    image_bytes: bytes | None = None,
    lang: Literal["en", "hi", "both"] = "both",
    title: str | None = None,
) -> AnalyzeResponse:
    """
    Analyze an incoming message / URL / image per FR1 contract.

    Parameters
    ----------
    text : str, optional
        Message text.
    url : str, optional
        Explicitly provided URL.
    image_bytes : bytes, optional
        Raw screenshot bytes. (Raises BadInput in Part 1 until OCR is integrated).
    lang : "en" | "hi" | "both", default "both"
        Explanation language preference.
    title : str, optional
        Forwarded message title or screenshot header.

    Returns
    -------
    AnalyzeResponse
        Complete FR1 contract JSON model.
    """
    t0 = time.perf_counter()

    # 1. Validation & input check
    is_image = False
    if image_bytes is not None:
        ocr = get_ocr()
        if not ocr.ready:
            raise BadInput(
                "Screenshot checking isn't available on this server right now. "
                "Please paste the text instead."
            )
        try:
            text_from_image = ocr.read_image(image_bytes)
        except ValueError as exc:
            if "unreadable image" in str(exc):
                raise BadInput(
                    "We couldn't open that image. Please try a PNG or JPG screenshot."
                ) from exc
            raise BadInput(str(exc)) from exc
        except NoTextFound as exc:
            raise BadInput(str(exc)) from exc

        text = (text or "") + "\n" + text_from_image
        is_image = True

    has_text = bool(text and text.strip())
    has_url = bool(url and url.strip())
    has_title = bool(title and title.strip())

    if not (has_text or has_url or has_title or is_image):
        raise BadInput("No input provided. Please provide text, a URL, or an image.")

    # 2. Determine input_type ("image" > "text" > "url")
    if is_image:
        input_type: Literal["text", "url", "image"] = "image"
    elif has_text or has_title:
        input_type = "text"
    else:
        input_type = "url"

    # 3. Combine text & extract URLs
    parts_for_url_search = [p.strip() for p in (title, text, url) if p and p.strip()]
    combined_search_string = " ".join(parts_for_url_search)

    # Extract all embedded URLs
    extracted_urls = extract_urls(combined_search_string)

    # If explicit URL was supplied, make sure it is in the list
    if has_url:
        explicit_url = url.strip()
        # Parse or clean
        found_in_explicit = extract_urls(explicit_url)
        if found_in_explicit:
            for fu in found_in_explicit:
                if fu not in extracted_urls:
                    extracted_urls.append(fu)
        else:
            if explicit_url not in extracted_urls:
                extracted_urls.append(explicit_url)

    # Deduplicate URLs while preserving order
    seen_urls = set()
    deduped_urls = []
    for u in extracted_urls:
        if u not in seen_urls:
            seen_urls.add(u)
            deduped_urls.append(u)
    extracted_urls = deduped_urls

    # Text used for analysis
    if has_text or has_title:
        extracted_text = " ".join([p.strip() for p in (title, text) if p and p.strip()])
    else:
        extracted_text = url.strip()

    # 4. Preprocessing
    prepared = prepare(extracted_text)

    # Decide has_words: at least 3 non-URLTOKEN letters remain after stripping all
    # URLTOKEN placeholders and whitespace. If the only content is one or more
    # URLTOKENs (i.e. URL-only input), has_words is False and the text model is
    # skipped, so component_scores.text comes back null.
    text_without_tokens = re.sub(r"(?i)\burltoken\b", "", prepared.text_for_model).strip()
    letters_only = [c for c in text_without_tokens if c.isalpha()]
    has_words = len(letters_only) >= 3

    # 5. Core Model & Engine Inferences
    # A. Text Classifier (only if input has words)
    text_model = get_text_model()
    if has_words:
        text_prob = float(text_model.predict_proba(prepared.text_for_model))
        text_flags = text_model.to_red_flags(prepared.text_for_model, k=3)
    else:
        text_prob = None
        text_flags = []

    # B. Rule Engine
    rule_engine = get_rule_engine()
    rule_score, matches = rule_engine.score(prepared.text_for_rules)
    rule_flags = rule_engine.to_red_flags(matches, prepared.original)
    has_payment_urgency = rule_engine.has_payment_and_urgency(matches)

    # C. URL Model & Brand Check
    url_score, url_flags, any_strong_lookalike, any_official_whitelisted, _ = score_urls(
        extracted_urls
    )

    # 6. Pure Score Fusion
    fusion_result = fuse(
        text_score=text_prob,
        rules_score=rule_score,
        url_score=url_score,
        strong_lookalike=any_strong_lookalike,
        has_payment_and_urgency=has_payment_urgency,
        is_official_whitelisted=any_official_whitelisted,
    )
    risk_score = fusion_result.risk_score
    level = fusion_result.level

    # 7. Aggregate & Deduplicate Red Flags
    raw_red_flags = []
    # Ordering priority: URL signals, rule tactics, text model keywords
    raw_red_flags.extend(url_flags)
    raw_red_flags.extend(rule_flags)
    raw_red_flags.extend(text_flags)

    validated_flags: list[RedFlag] = []
    seen_flags = set()
    for fl in raw_red_flags:
        if isinstance(fl, dict):
            key = (fl.get("category"), fl.get("evidence"))
            if key not in seen_flags:
                seen_flags.add(key)
                validated_flags.append(
                    RedFlag(
                        type=fl.get("type", "keyword"),
                        category=fl.get("category", "general"),
                        evidence=fl.get("evidence", ""),
                        strength=float(fl.get("strength", 0.5)),
                    )
                )
        elif isinstance(fl, RedFlag):
            key = (fl.category, fl.evidence)
            if key not in seen_flags:
                seen_flags.add(key)
                validated_flags.append(fl)

    # If level == "green", keep only keyword flags whose strength >= 0.6; tactic and url flags are unaffected
    if level == "green":
        validated_flags = [
            rf for rf in validated_flags
            if rf.type != "keyword" or rf.strength >= 0.6
        ]

    # Sort descending by strength, cap at 10 items per FR1
    validated_flags.sort(key=lambda rf: rf.strength, reverse=True)
    final_red_flags = validated_flags[:10]

    # 8. Explanation & Next Steps
    explanation_res = explain(
        score=risk_score,
        level=level,
        red_flags=final_red_flags,
        lang=lang,
    )

    # 9. Component Scores
    component_scores = ComponentScores(
        text=round(text_prob, 2) if text_prob is not None else None,
        url=round(url_score, 2) if url_score is not None else None,
        rules=round(rule_score, 2),
    )

    # 10. Extract Entities (FR11, pure function, no logging)
    entities_data = extract_entities(extracted_text, extracted_urls)
    entities_model = Entities(**entities_data)

    elapsed_ms = max(1, int((time.perf_counter() - t0) * 1000))

    return AnalyzeResponse(
        risk_score=risk_score,
        level=level,
        input_type=input_type,
        extracted_text=extracted_text,
        urls_found=extracted_urls,
        entities=entities_model,
        overrides_fired=list(fusion_result.overrides_fired),
        red_flags=final_red_flags,
        component_scores=component_scores,
        error=None,
        advice_en=explanation_res.advice_en,
        advice_hi=explanation_res.advice_hi,
        next_steps=explanation_res.next_steps,
        explanation_source=explanation_res.explanation_source,
        model_version=getattr(text_model, "version", "v1"),
        processing_ms=elapsed_ms,
    )
