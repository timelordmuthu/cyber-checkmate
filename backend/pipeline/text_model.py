"""backend/pipeline/text_model.py
Load and run inference with the trained text model (Prompt 5 / FR3).

Usage:
    from backend.pipeline.text_model import TextModel, ModelNotReadyError

    model = TextModel.load()          # uses active version
    prob  = model.predict_proba(text_for_model)
    flags = model.to_red_flags(text_for_model)
"""

from __future__ import annotations

import json
import logging
import re
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import sklearn
from scipy.sparse import issparse

logger = logging.getLogger(__name__)

# ── project root on sys.path when run directly ──────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import TEXT_MODELS_DIR, ACTIVE_JSON


# ────────────────────────────────────────────────────────────────────────────
# Custom exception
# ────────────────────────────────────────────────────────────────────────────

class ModelNotReadyError(RuntimeError):
    """Raised when the text model file is missing or cannot be loaded."""


# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────

# Tokens we never want to surface to users
_SKIP_TOKENS = {"URLTOKEN", "urltoken"}
KEYWORD_STOP_WORDS = {
    "the", "and", "you", "your", "for", "with", "this", "that", "are",
    "have", "has", "from", "will", "our", "can", "not", "all", "was",
    "now", "get", "hai", "ka", "ki", "ke", "se", "me", "ko", "aap",
}
_READABLE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9''\-_]*$")


def _is_readable(token: str) -> bool:
    """
    True if the token is a printable ASCII word that a human would recognise.

    Rules:
    - length ≥ 2
    - not in SKIP_TOKENS
    - matches [A-Za-z0-9][A-Za-z0-9''\\-_]* (no spaces, angle-brackets, slashes …)
    - not purely punctuation / digits
    - at least one letter
    """
    if len(token) < 2:
        return False
    if token.lower() == "urltoken":
        return False
    if not _READABLE_RE.match(token):
        return False
    # must contain at least one alphabetic character
    if not any(c.isalpha() for c in token):
        return False
    return True


# ────────────────────────────────────────────────────────────────────────────
# TextModel
# ────────────────────────────────────────────────────────────────────────────

class TextModel:
    """Wraps the trained sklearn Pipeline for inference."""

    def __init__(self, pipeline: Any, version: str) -> None:
        self._pipeline = pipeline
        self.version = version

    # ── Factory ─────────────────────────────────────────────────────────────

    @classmethod
    def load(cls, version: str | None = None) -> "TextModel":
        """
        Load the model for *version* (or the active version when None).

        Raises ModelNotReadyError if the file is missing.
        """
        if version is None:
            version = cls._active_version()

        model_path = TEXT_MODELS_DIR / version / "model.joblib"
        if not model_path.exists():
            raise ModelNotReadyError(
                f"Text model file not found: {model_path}\n"
                f"Run: python training/train_text_model.py"
            )
        try:
            pipeline = joblib.load(model_path)
        except Exception as exc:
            raise ModelNotReadyError(
                f"Failed to load text model from {model_path}: {exc}"
            ) from exc

        meta_path = TEXT_MODELS_DIR / version / "meta.json"
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                trained_version = meta.get("sklearn_version")
                if trained_version and trained_version != sklearn.__version__:
                    logger.warning(
                        "Model was trained with scikit-learn %s, running %s. Retrain if results look wrong.",
                        trained_version,
                        sklearn.__version__,
                    )
            except Exception:
                pass

        return cls(pipeline, version)

    @staticmethod
    def _active_version() -> str:
        if not ACTIVE_JSON.exists():
            raise ModelNotReadyError(
                f"active.json not found: {ACTIVE_JSON}\n"
                f"Run: python training/train_text_model.py"
            )
        try:
            data = json.loads(ACTIVE_JSON.read_text(encoding="utf-8"))
            return data["version"]
        except Exception as exc:
            raise ModelNotReadyError(
                f"Cannot parse active.json ({ACTIVE_JSON}): {exc}"
            ) from exc

    # ── Inference ────────────────────────────────────────────────────────────

    def predict_proba(self, text_for_model: str) -> float:
        """
        Return the probability that *text_for_model* is a scam (class 1).
        """
        proba = self._pipeline.predict_proba([text_for_model])
        # classes_ order: [0=legit, 1=scam]
        clf = self._pipeline.named_steps["clf"]
        scam_idx = list(clf.classes_).index(1)
        return float(proba[0][scam_idx])

    def top_tokens(self, text_for_model: str, k: int = 5) -> list[dict]:
        """
        Return up to *k* tokens that pushed the prediction toward SCAM.

        Each entry: {"token": str, "score": float (coeff × tf-idf value)}

        Only readable ASCII word-tokens are returned; char n-grams and
        URLTOKEN are skipped.
        """
        feats = self._pipeline.named_steps["features"]
        clf   = self._pipeline.named_steps["clf"]

        # ── Feature vector for this input ──────────────────────────────────
        X = feats.transform([text_for_model])
        if issparse(X):
            X = X.toarray()
        X = X[0]  # shape (n_features,)

        # sklearn binary LR stores coef_ with shape (1, n_features);
        # row 0's positive values push toward class 1 (scam).
        coef = clf.coef_[0]  # shape (n_features,)

        # ── Feature names from FeatureUnion ───────────────────────────────
        try:
            feature_names = feats.get_feature_names_out()
        except AttributeError:
            # fallback for older sklearn
            feature_names = np.array(feats.get_feature_names())

        # ── Contribution = coeff × tf-idf value (only positive / present) ─
        contributions: list[tuple[float, str]] = []
        for i, fname in enumerate(feature_names):
            if X[i] == 0.0:
                continue
            # FeatureUnion prefixes names: "word__token" or "char__token"
            # Extract the raw token part
            raw_token = fname.split("__", 1)[-1] if "__" in fname else fname
            if not _is_readable(raw_token):
                continue
            score = float(coef[i] * X[i])
            if score > 0:
                contributions.append((score, raw_token))

        # Sort descending, deduplicate token names
        contributions.sort(key=lambda x: x[0], reverse=True)
        seen: set[str] = set()
        result: list[dict] = []
        for score, token in contributions:
            if token in seen:
                continue
            seen.add(token)
            result.append({"token": token, "score": round(score, 6)})
            if len(result) >= k:
                break

        return result

    def to_red_flags(
        self, text_for_model: str, k: int = 3
    ) -> list[dict]:
        """
        Return up to 3 red-flag dicts compatible with the FR1 RedFlag schema.

        strength = contribution / max_contribution_in_this_input  (0–1)
        """
        candidates = self.top_tokens(text_for_model, k=max(30, k * 10 if k else 30))
        if not candidates:
            return []

        valid_tokens: list[dict] = []
        for t in candidates:
            tok = t["token"]
            if len(tok) < 3:
                continue
            if tok.isdigit():
                continue
            if tok.lower() == "urltoken":
                continue
            if tok.lower() in KEYWORD_STOP_WORDS:
                continue
            valid_tokens.append(t)

        if not valid_tokens:
            return []

        limit = min(k, 3) if (k is not None and k > 0) else 3
        valid_tokens = valid_tokens[:limit]

        max_score = valid_tokens[0]["score"]  # already sorted descending
        flags: list[dict] = []
        for t in valid_tokens:
            strength = round(t["score"] / max_score, 4) if max_score > 0 else 0.0
            strength = max(0.0, min(1.0, strength))
            flags.append(
                {
                    "type":     "keyword",
                    "evidence": t["token"],
                    "category": "text_model",
                    "strength": strength,
                }
            )
        return flags


# ────────────────────────────────────────────────────────────────────────────
# Quick demo (run this module directly)
# ────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from backend.pipeline.preprocess import prepare  # noqa: E402

    print("Loading text model …")
    try:
        model = TextModel.load()
    except ModelNotReadyError as e:
        print(f"[ModelNotReadyError] {e}")
        sys.exit(1)

    print(f"Model version: {model.version}\n")

    test_cases = [
        (
            "FAKE-KYC",
            "Dear Customer, your KYC is pending! "
            "Verify now at http://kyc-sbi.secure-update.in or your account will be blocked. "
            "Call 9800000001 immediately. OTP: do not share.",
        ),
        (
            "BANK OTP (legit)",
            "Your OTP for SBI NetBanking login is 483921. "
            "Valid for 5 minutes. Do NOT share this OTP with anyone.",
        ),
    ]

    for label, text in test_cases:
        prepared = prepare(text)
        prob = model.predict_proba(prepared.text_for_model)
        tokens = model.top_tokens(prepared.text_for_model, k=5)
        print(f"── {label}")
        print(f"   Scam probability : {prob:.4f}")
        print(f"   Top-5 tokens     : {[t['token'] for t in tokens]}")
        print()
