"""
config.py – All tunable constants and environment values for CyberCheckmate.

Section 16 rule: every tuneable constant from PRD 16.3, 16.5, 16.6, 16.7, 16.12,
FR1, FR4, and FR10.1 lives here. Application code imports from this module; nothing
is hard-coded elsewhere.
"""

from __future__ import annotations

from pathlib import Path
from dotenv import load_dotenv
import os

# ---------------------------------------------------------------------------
# Project root (the directory that contains backend/, data/, models/, …)
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")  # silently ignored if .env is absent

# ---------------------------------------------------------------------------
# Directory paths (all relative to ROOT via pathlib)
# ---------------------------------------------------------------------------
DATA_DIR          = ROOT / "data"
SPLITS_DIR        = DATA_DIR / "splits"
PROCESSED_DIR     = DATA_DIR / "processed"
RAW_DIR           = DATA_DIR / "raw"
REAL_WORLD_DIR    = DATA_DIR / "real_world_test"
FROZEN_TEST_CSV   = DATA_DIR / "frozen_test.csv"
FEEDBACK_VAL_CSV  = DATA_DIR / "feedback_val.csv"

MODELS_DIR        = ROOT / "models"
TEXT_MODELS_DIR   = MODELS_DIR / "text"
URL_MODELS_DIR    = MODELS_DIR / "url"          # directory (train scripts save here)
URL_MODEL_PATH    = URL_MODELS_DIR / "model.joblib"
ACTIVE_JSON       = TEXT_MODELS_DIR / "active.json"

RESOURCES_DIR     = ROOT / "backend" / "resources"
TACTICS_JSON      = RESOURCES_DIR / "tactics.json"
BRANDS_JSON       = RESOURCES_DIR / "brands.json"
TEMPLATES_JSON    = RESOURCES_DIR / "templates.json"
NEXT_STEPS_JSON   = RESOURCES_DIR / "next_steps.json"
BACKUPS_DIR       = RESOURCES_DIR / "backups"

REPORTS_DIR       = ROOT / "reports"
DEMO_DIR          = ROOT / "demo"

FEEDBACK_DB       = DATA_DIR / "feedback" / "feedback.db"

# ---------------------------------------------------------------------------
# Environment-sourced secrets (None when unset — never raise at import time)
# ---------------------------------------------------------------------------
GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY") or None
GROQ_API_KEY:   str | None = os.getenv("GROQ_API_KEY")   or None
GEMINI_MODEL:   str        = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GROQ_MODEL:     str        = os.getenv("GROQ_MODEL",   "llama-3.3-70b-versatile")
ADMIN_TOKEN:    str | None = os.getenv("ADMIN_TOKEN")    or None

# ---------------------------------------------------------------------------
# FR1 – API limits
# ---------------------------------------------------------------------------
MAX_IMAGE_BYTES: int = 5 * 1024 * 1024   # 5 MB

# ---------------------------------------------------------------------------
# FR4 – Suspicious TLD list (configurable)
# ---------------------------------------------------------------------------
SUSPICIOUS_TLDS: list[str] = [
    ".xyz", ".top", ".live", ".click", ".info", ".buzz",
    ".gq", ".ml", ".tk", ".cf", ".ga", ".pw", ".rest",
    ".cyou", ".cfd", ".monster", ".hair",
]

# ---------------------------------------------------------------------------
# FR10.1 – Rate limiting
# ---------------------------------------------------------------------------
REPORT_RATE_LIMIT_PER_MIN: int = 20    # max reports per minute per server process

# ---------------------------------------------------------------------------
# 16.3 – Rule engine scoring
# ---------------------------------------------------------------------------
RULE_SCORE_DENOMINATOR:   float = 50.0  # sum(category_max_weights) / this → rule_score
RULE_COMBINATION_BONUS:   float = 0.15  # added when ≥3 distinct categories match
RULE_CATEGORY_BONUS_MIN:  int   = 3     # number of categories needed for the bonus
RULE_PHRASE_WEIGHT_MIN:   int   = 1
RULE_PHRASE_WEIGHT_MAX:   int   = 20

# ---------------------------------------------------------------------------
# 16.5 – Fusion weights and overrides
# ---------------------------------------------------------------------------
# Base formula weights (with URL present)
FUSION_WEIGHT_TEXT:       float = 0.50
FUSION_WEIGHT_URL:        float = 0.35
FUSION_WEIGHT_RULES:      float = 0.15

# Re-normalised weights (no URL present) — 0.5 : 0.15 ratio scaled to sum 1
FUSION_WEIGHT_TEXT_NO_URL:  float = 0.77
FUSION_WEIGHT_RULES_NO_URL: float = 0.23

# URL-only weights (no text present) — 0.85 url + 0.15 rules
URL_ONLY_W_URL:             float = 0.85
URL_ONLY_W_RULES:           float = 0.15

# Overrides (applied in strict priority order — see 16.5)
FUSION_LOOKALIKE_FLOOR:      float = 80.0   # strong lookalike → max(score, this)
FUSION_CREDENTIALS_URGENCY_BONUS: float = 10.0  # payment+urgency both matched → +this
FUSION_WHITELIST_CEILING:    float = 30.0   # official domain + low text → min(score, this)
FUSION_TEXT_SCORE_WHITELIST_THRESHOLD: float = 0.3  # text_score must be < this for whitelist cap

# Level thresholds
LEVEL_GREEN_MAX:  int = 35   # score < 35 → green
LEVEL_RED_MIN:    int = 71   # score > 70 → red (35–70 → amber)

# ---------------------------------------------------------------------------
# 16.4 – Brand / URL model thresholds
# ---------------------------------------------------------------------------
WHITELIST_CAP:              float = 0.1   # official domain → cap url_score at this
LOOKALIKE_SIMILARITY_MIN:   int   = 85    # rapidfuzz score ≥ this → lookalike
STRONG_LOOKALIKE_SIM_MIN:   int   = 90    # ≥ this → "strong" lookalike (triggers floor)
FUZZY_MIN_TOKEN_LENGTH:     int   = 5     # fuzzy only for tokens this long or longer
SHORTENER_STRENGTH:         float = 0.5   # strength for "link hides destination" flag
URL_MODEL_NEUTRAL_BASE:     float = 0.5   # neutral base when URL model is unavailable
STRONG_LOOKALIKE_FLOOR_SCORE: float = 0.9 # strong lookalike → at least this url_score

# ---------------------------------------------------------------------------
# 16.6 – OCR
# ---------------------------------------------------------------------------
OCR_MAX_SIDE:        int = 1600  # resize so longer side ≤ this before OCR
OCR_DARK_THRESHOLD:  int = 100   # mean grayscale brightness < this → invert image

# ---------------------------------------------------------------------------
# 16.7 – LLM explanation
# ---------------------------------------------------------------------------
LLM_TIMEOUT_SECONDS: float = 5.0   # timeout per provider (Gemini, then Groq)

# ---------------------------------------------------------------------------
# 16.12 – Adaptive learning gate and variant caps
# ---------------------------------------------------------------------------
GATE_RECALL_TOLERANCE:    float = 0.02   # recall may not drop by more than this
GATE_FP_TOLERANCE:        float = 0.02   # false-positive rate may not rise by more than this
GATE_FEEDBACK_VAL_MIN:    int   = 5      # minimum messages in feedback_val to run that gate check
MIN_APPROVED_REPORTS:     int   = 3      # must have at least this many new approved reports before retrain
MAX_VARIANTS_PER_REPORT:  int   = 20     # cap on LLM-generated variants per approved report
FEEDBACK_TRAIN_SHARE_MAX: float = 0.30   # feedback + variants may not exceed 30 % of total training set


def config_summary() -> dict:
    """Return a dict of non-secret configuration values for the /health endpoint."""
    return {
        "fusion_weights": {
            "text": FUSION_WEIGHT_TEXT,
            "url": FUSION_WEIGHT_URL,
            "rules": FUSION_WEIGHT_RULES,
            "text_no_url": FUSION_WEIGHT_TEXT_NO_URL,
            "rules_no_url": FUSION_WEIGHT_RULES_NO_URL,
        },
        "fusion_overrides": {
            "lookalike_floor": FUSION_LOOKALIKE_FLOOR,
            "credentials_urgency_bonus": FUSION_CREDENTIALS_URGENCY_BONUS,
            "whitelist_ceiling": FUSION_WHITELIST_CEILING,
            "whitelist_text_threshold": FUSION_TEXT_SCORE_WHITELIST_THRESHOLD,
        },
        "level_thresholds": {
            "green_max": LEVEL_GREEN_MAX,
            "red_min": LEVEL_RED_MIN,
        },
        "ocr": {
            "max_side": OCR_MAX_SIDE,
            "dark_threshold": OCR_DARK_THRESHOLD,
        },
        "llm_timeout_seconds": LLM_TIMEOUT_SECONDS,
        "max_image_mb": MAX_IMAGE_BYTES // (1024 * 1024),
        "report_rate_limit_per_min": REPORT_RATE_LIMIT_PER_MIN,
        "gate": {
            "recall_tolerance": GATE_RECALL_TOLERANCE,
            "fp_tolerance": GATE_FP_TOLERANCE,
            "feedback_val_min": GATE_FEEDBACK_VAL_MIN,
            "min_approved_reports": MIN_APPROVED_REPORTS,
            "max_variants_per_report": MAX_VARIANTS_PER_REPORT,
            "feedback_train_share_max": FEEDBACK_TRAIN_SHARE_MAX,
        },
        "rule_engine": {
            "denominator": RULE_SCORE_DENOMINATOR,
            "combination_bonus": RULE_COMBINATION_BONUS,
            "combination_bonus_min_categories": RULE_CATEGORY_BONUS_MIN,
        },
        "suspicious_tlds": SUSPICIOUS_TLDS,
        "llm": {
            "gemini_model": GEMINI_MODEL,
            "groq_model": GROQ_MODEL,
            "gemini_key_set": GEMINI_API_KEY is not None,
            "groq_key_set": GROQ_API_KEY is not None,
        },
    }
