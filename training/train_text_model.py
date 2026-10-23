"""training/train_text_model.py
Train the text classifier (Prompt 5 / FR3).

Pipeline: FeatureUnion(word 1-2gram TF-IDF + char_wb 3-5gram TF-IDF)
          -> LogisticRegression(class_weight='balanced', max_iter=2000)

Usage (from project root, venv active):
    python training/train_text_model.py
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

# -- project root on sys.path so backend imports work ------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import (
    SPLITS_DIR,
    TEXT_MODELS_DIR,
    ACTIVE_JSON,
    REPORTS_DIR,
)
from backend.pipeline.preprocess import prepare


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

def _load_split(path: Path) -> pd.DataFrame:
    """Load a CSV split and apply preprocess.prepare() to the text column."""
    df = pd.read_csv(path, encoding="utf-8")
    required = {"text", "label"}
    if not required.issubset(df.columns):
        raise ValueError(f"{path.name} must have columns: {required}")
    # Apply preprocessing; keep only text_for_model
    df["text_for_model"] = df["text"].apply(lambda t: prepare(str(t)).text_for_model)
    return df


def _build_pipeline() -> Pipeline:
    """Return the untrained sklearn Pipeline per PRD FR3."""
    word_vec = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        min_df=2,
        sublinear_tf=True,
        max_features=50_000,
    )
    char_vec = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        min_df=2,
        sublinear_tf=True,
        max_features=50_000,
    )
    features = FeatureUnion([("word", word_vec), ("char", char_vec)])
    clf = LogisticRegression(
        class_weight="balanced",
        max_iter=2000,
        C=1.0,
        solver="lbfgs",
        random_state=42,
    )
    return Pipeline([("features", features), ("clf", clf)])


# ----------------------------------------------------------------------------
# Public API (reused by FR10 background retraining)
# ----------------------------------------------------------------------------

def _next_free_version() -> str:
    v = 1
    while (TEXT_MODELS_DIR / f"v{v}").exists():
        v += 1
    return f"v{v}"


def train_text_model(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    sample_weight: list[float] | None = None,
) -> tuple[Pipeline, dict]:
    """
    Fit the text pipeline on *train_df* and evaluate on *val_df*.

    Parameters
    ----------
    train_df : DataFrame with columns ``text_for_model`` and ``label``.
    val_df   : Same structure; used for evaluation only.
    sample_weight : Optional sample weights for training instances.

    Returns
    -------
    pipeline : fitted sklearn Pipeline
    metrics  : dict with precision/recall/f1/accuracy (macro + per-class)
               and confusion matrix
    """
    X_train = train_df["text_for_model"].tolist()
    y_train = train_df["label"].tolist()
    X_val = val_df["text_for_model"].tolist()
    y_val = val_df["label"].tolist()

    pipeline = _build_pipeline()
    print(f"  Fitting on {len(X_train):,} training samples ...")
    pipeline.fit(X_train, y_train, clf__sample_weight=sample_weight)

    y_pred = pipeline.predict(X_val)
    report = classification_report(
        y_val, y_pred,
        target_names=["legit", "scam"],
        output_dict=True,
        zero_division=0,
    )
    cm = confusion_matrix(y_val, y_pred).tolist()

    metrics = {
        "accuracy":         round(report["accuracy"], 4),
        "macro_precision":  round(report["macro avg"]["precision"], 4),
        "macro_recall":     round(report["macro avg"]["recall"], 4),
        "macro_f1":         round(report["macro avg"]["f1-score"], 4),
        "legit_precision":  round(report["legit"]["precision"], 4),
        "legit_recall":     round(report["legit"]["recall"], 4),
        "legit_f1":         round(report["legit"]["f1-score"], 4),
        "scam_precision":   round(report["scam"]["precision"], 4),
        "scam_recall":      round(report["scam"]["recall"], 4),
        "scam_f1":          round(report["scam"]["f1-score"], 4),
        "confusion_matrix": cm,
        "n_val":            len(y_val),
    }
    return pipeline, metrics


# ----------------------------------------------------------------------------
# CLI entry point
# ----------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Train text classification model")
    parser.add_argument(
        "--version",
        default=None,
        help="Model version name (default: next free version, e.g. v2)",
    )
    args = parser.parse_args()
    version = args.version or _next_free_version()

    train_path = SPLITS_DIR / "train.csv"
    val_path   = SPLITS_DIR / "val.csv"

    for p in (train_path, val_path):
        if not p.exists():
            print(f"[ERROR] Missing split file: {p}")
            print("  Run:  python training/make_splits.py")
            sys.exit(1)

    print("Loading splits ...")
    train_df = _load_split(train_path)
    val_df   = _load_split(val_path)
    print(f"  Train: {len(train_df):,} rows  |  Val: {len(val_df):,} rows")

    # Compute sample weights: Indian rows 30% weight share, UCI rows 70% share
    if "source" in train_df.columns:
        is_indian = train_df["source"] == "synthetic"
    else:
        is_indian = train_df["template_id"].astype(str).str.startswith("in_")

    n_indian_rows = int(is_indian.sum())
    n_uci_rows = int((~is_indian).sum())
    total_rows = len(train_df)

    print(f"  Train sources: Indian={n_indian_rows:,}, UCI={n_uci_rows:,}")
    w_indian = (0.30 / n_indian_rows) * total_rows if n_indian_rows > 0 else 1.0
    w_uci = (0.70 / n_uci_rows) * total_rows if n_uci_rows > 0 else 1.0
    sample_weight = [w_indian if ind else w_uci for ind in is_indian]
    print(f"  Sample weights assigned (w_indian={w_indian:.4f}, w_uci={w_uci:.4f}, mean={np.mean(sample_weight):.4f})")

    print(f"Training text model {version} ...")
    pipeline, metrics = train_text_model(train_df, val_df, sample_weight=sample_weight)

    # -- Print validation results ------------------------------------------
    print("\n-- Validation results ------------------------------------------")
    print(f"  Accuracy        : {metrics['accuracy']:.4f}")
    print(f"  Macro F1        : {metrics['macro_f1']:.4f}")
    print(f"  Scam  P/R/F1    : {metrics['scam_precision']:.4f} / "
          f"{metrics['scam_recall']:.4f} / {metrics['scam_f1']:.4f}")
    print(f"  Legit P/R/F1    : {metrics['legit_precision']:.4f} / "
          f"{metrics['legit_recall']:.4f} / {metrics['legit_f1']:.4f}")
    cm = metrics["confusion_matrix"]
    print("  Confusion matrix (legit/scam rows, legit/scam cols):")
    print(f"    {cm[0]}")
    print(f"    {cm[1]}")

    # -- Save model -------------------------------------------------------
    version_dir = TEXT_MODELS_DIR / version
    version_dir.mkdir(parents=True, exist_ok=True)

    model_path = version_dir / "model.joblib"
    joblib.dump(pipeline, model_path)
    print(f"\nSaved model  -> {model_path}")

    meta = {
        "version":             version,
        "created_at":          datetime.now(timezone.utc).isoformat(),
        "n_train":             int(len(train_df)),
        "n_feedback":          0,
        "val_metrics":         metrics,
        "parent_version":      None,
        "sklearn_version":     sklearn.__version__,
        "indian_weight_share": 0.30,
        "n_indian_train":      n_indian_rows,
        "n_uci_train":         n_uci_rows,
    }
    meta_path = version_dir / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved meta   -> {meta_path}")

    # -- Do NOT change active.json automatically per prompt instructions --
    print(f"Saved {version}. To activate: set models/text/active.json to {{\"version\": \"{version}\"}}")

    # -- Save val metrics report -------------------------------------------
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / f"val_metrics_text_{version}.json"
    report_payload = {
        "model_version": version,
        "evaluated_at":  datetime.now(timezone.utc).isoformat(),
        "split":         "val",
        "n_val":         metrics["n_val"],
        "metrics":       metrics,
    }
    report_path.write_text(
        json.dumps(report_payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Saved report -> {report_path}")
    print("\nDone OK")


if __name__ == "__main__":
    main()
