"""training/train_url_model.py

Train the XGBoost phishing URL classifier (FR4).

PREREQUISITES
-------------
Run first:
    python training/prepare_url_data.py

This populates:
    data/splits/url_train.csv
    data/splits/url_val.csv
    data/splits/url_test.csv

USAGE (from project root, venv active)
---------------------------------------
    python training/train_url_model.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import SPLITS_DIR, URL_MODELS_DIR, REPORTS_DIR
from backend.pipeline.url_features import FEATURE_NAMES

try:
    import xgboost as xgb
except ImportError:
    print("[ERROR] xgboost not installed. Run:  pip install xgboost")
    sys.exit(1)


# ── Check for split files ──────────────────────────────────────────────────────
for split in ("url_train.csv", "url_val.csv", "url_test.csv"):
    p = SPLITS_DIR / split
    if not p.exists():
        print(f"[ERROR] Missing: {p}")
        print("  Run first:  python training/prepare_url_data.py")
        sys.exit(1)

# ── Load splits ────────────────────────────────────────────────────────────────
print("Loading URL splits ...")
train_df = pd.read_csv(SPLITS_DIR / "url_train.csv", encoding="utf-8")
val_df   = pd.read_csv(SPLITS_DIR / "url_val.csv",   encoding="utf-8")
test_df  = pd.read_csv(SPLITS_DIR / "url_test.csv",  encoding="utf-8")

X_train = train_df[FEATURE_NAMES].values
y_train = train_df["label"].values
X_val   = val_df[FEATURE_NAMES].values
y_val   = val_df["label"].values
X_test  = test_df[FEATURE_NAMES].values
y_test  = test_df["label"].values

print(f"  Train: {len(X_train):,}  Val: {len(X_val):,}  Test: {len(X_test):,}")

# ── Class imbalance: scale_pos_weight ─────────────────────────────────────────
neg = float((y_train == 0).sum())
pos = float((y_train == 1).sum())
scale_pos_weight = neg / max(pos, 1.0)
print(f"  scale_pos_weight = {scale_pos_weight:.3f}  (neg={int(neg)}, pos={int(pos)})")

# ── XGBoost with early stopping ────────────────────────────────────────────────
print("Training XGBoost ...")
model = xgb.XGBClassifier(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=scale_pos_weight,
    use_label_encoder=False,
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1,
)

model.fit(
    X_train, y_train,
    eval_set=[(X_val, y_val)],
    verbose=50,
    early_stopping_rounds=30,
)

# ── Val metrics ────────────────────────────────────────────────────────────────
y_pred_val = model.predict(X_val)
report = classification_report(
    y_val, y_pred_val,
    target_names=["legit", "phishing"],
    output_dict=True,
    zero_division=0,
)
cm = confusion_matrix(y_val, y_pred_val).tolist()

metrics = {
    "accuracy":           round(report["accuracy"], 4),
    "macro_f1":           round(report["macro avg"]["f1-score"], 4),
    "phishing_precision": round(report["phishing"]["precision"], 4),
    "phishing_recall":    round(report["phishing"]["recall"], 4),
    "phishing_f1":        round(report["phishing"]["f1-score"], 4),
    "legit_precision":    round(report["legit"]["precision"], 4),
    "legit_recall":       round(report["legit"]["recall"], 4),
    "legit_f1":           round(report["legit"]["f1-score"], 4),
    "confusion_matrix":   cm,
    "n_val":              int(len(y_val)),
    "best_iteration":     int(model.best_iteration),
}

print("\n-- Validation results ------------------------------------------")
print(f"  Accuracy     : {metrics['accuracy']:.4f}")
print(f"  Macro F1     : {metrics['macro_f1']:.4f}")
print(f"  Phishing P/R/F1 : {metrics['phishing_precision']:.4f} / "
      f"{metrics['phishing_recall']:.4f} / {metrics['phishing_f1']:.4f}")
print(f"  Legit    P/R/F1 : {metrics['legit_precision']:.4f} / "
      f"{metrics['legit_recall']:.4f} / {metrics['legit_f1']:.4f}")
print(f"  Confusion matrix (legit/phishing rows, legit/phishing cols):")
print(f"    {cm[0]}")
print(f"    {cm[1]}")

# ── Top-10 feature importances ────────────────────────────────────────────────
importances = model.feature_importances_
top10_idx = np.argsort(importances)[::-1][:10]
print("\n-- Top-10 feature importances ----------------------------------")
for i, idx in enumerate(top10_idx, 1):
    print(f"  {i:>2}. {FEATURE_NAMES[idx]:<35} {importances[idx]:.4f}")

# ── Save model ─────────────────────────────────────────────────────────────────
URL_MODELS_DIR.mkdir(parents=True, exist_ok=True)
model_path = URL_MODELS_DIR / "model.joblib"
joblib.dump(model, model_path)
print(f"\nSaved model  -> {model_path}")

meta = {
    "version":           "v1",
    "created_at":        datetime.now(timezone.utc).isoformat(),
    "n_train":           int(len(X_train)),
    "n_val":             int(len(X_val)),
    "val_metrics":       metrics,
    "feature_names":     FEATURE_NAMES,
    "best_iteration":    int(model.best_iteration),
    "scale_pos_weight":  round(scale_pos_weight, 4),
    "top10_features":    [FEATURE_NAMES[i] for i in top10_idx],
}
meta_path = URL_MODELS_DIR / "meta.json"
meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Saved meta   -> {meta_path}")

# ── Save val metrics report ────────────────────────────────────────────────────
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
report_path = REPORTS_DIR / "val_metrics_url.json"
report_path.write_text(
    json.dumps(
        {
            "model_version": "v1",
            "evaluated_at":  datetime.now(timezone.utc).isoformat(),
            "split":         "val",
            "metrics":       metrics,
            "top10_features": [
                {"feature": FEATURE_NAMES[i], "importance": round(float(importances[i]), 6)}
                for i in top10_idx
            ],
        },
        indent=2,
        ensure_ascii=False,
    ),
    encoding="utf-8",
)
print(f"Saved report -> {report_path}")
print("\nDone OK")
