"""training/prepare_url_data.py

Prepare the URL dataset for the phishing URL model (FR4).

PREREQUISITES
-------------
1. PhiUSIIL dataset in data/raw/phiusiil/
   - Download from: https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset
   - Place the CSV (e.g. PhiUSIIL_Phishing_URL_Dataset.csv) inside data/raw/phiusiil/

USAGE (from project root, venv active)
---------------------------------------
    python training/prepare_url_data.py

If the PhiUSIIL folder is missing, this script exits with instructions.
"""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import DATA_DIR, SPLITS_DIR

PHIUSIIL_DIR = DATA_DIR / "raw" / "phiusiil"
OPENPHISH_FILE = DATA_DIR / "raw" / "openphish" / "feed.txt"

# ── Check for dataset ────────────────────────────────────────────────────────
if not PHIUSIIL_DIR.exists() or not any(PHIUSIIL_DIR.glob("*.csv")):
    print("=" * 70)
    print("PhiUSIIL dataset NOT FOUND at:", PHIUSIIL_DIR)
    print()
    print("To download:")
    print("  1. Visit: https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset")
    print("  2. Download the ZIP and extract the CSV file.")
    print("  3. Place it at:  data/raw/phiusiil/<filename>.csv")
    print("  4. Re-run this script.")
    print()
    print("The rest of the pipeline (text model + rules) works WITHOUT the URL model.")
    print("=" * 70)
    sys.exit(1)

# ── Imports (only reached if dataset exists) ─────────────────────────────────
import json
import random
from datetime import datetime, timezone

import pandas as pd
from sklearn.model_selection import train_test_split

from backend.pipeline.url_features import extract_features, FEATURE_NAMES

SEED = 42
random.seed(SEED)


def _load_phiusiil() -> pd.DataFrame:
    """Load PhiUSIIL CSV, inspect columns and label distribution."""
    csv_files = sorted(PHIUSIIL_DIR.glob("*.csv"))
    df = pd.read_csv(csv_files[0], encoding="utf-8")

    print("=== PhiUSIIL columns ===")
    print(df.columns.tolist())
    print()
    print("=== Label distribution ===")
    # Find the label column: try common names
    for col in ["label", "Label", "phishing", "Phishing", "status", "Status", "class"]:
        if col in df.columns:
            label_col = col
            break
    else:
        # Print value_counts for all low-cardinality columns
        print("[WARNING] Could not auto-detect label column. Low-cardinality columns:")
        for c in df.columns:
            if df[c].nunique() <= 5:
                print(f"  {c}: {df[c].value_counts().to_dict()}")
        raise RuntimeError(
            "Could not detect label column. Edit this script and set label_col manually."
        )

    print(f"Label column: '{label_col}'")
    print(df[label_col].value_counts())
    print()

    # Detect URL column
    for col in ["URL", "url", "Url", "URLID", "url_id"]:
        if col in df.columns:
            url_col = col
            break
    else:
        # Use first string column
        url_col = df.select_dtypes(include=["object"]).columns[0]

    print(f"URL column: '{url_col}'")

    # Show 5 sample URLs per label value
    for val in df[label_col].unique():
        print(f"\n  Sample URLs with label={val}:")
        for u in df[df[label_col] == val][url_col].dropna().head(5):
            print(f"    {u}")

    # ── Determine phishing label ──────────────────────────────────────────
    # PhiUSIIL documentation states:
    #   label=1 → phishing, label=0 → legitimate
    # (cross-referenced with the dataset paper, Section 3)
    PHISHING_LABEL = 1  # noqa: N806
    print(f"\n[INFO] Using PHISHING_LABEL = {PHISHING_LABEL} (1=phishing per PhiUSIIL paper)")

    df = df[[url_col, label_col]].rename(columns={url_col: "url", label_col: "label"})
    df["label"] = (df["label"] == PHISHING_LABEL).astype(int)
    df = df.dropna(subset=["url"])
    return df


def _add_legit_deep_links() -> pd.DataFrame:
    """
    Add ~300 legit deep-links on known Indian brand domains to counter
    the training set bias toward short/clean legit URLs.
    """
    from backend.resources import brands as _  # noqa: F401 — verify import path
    import json

    brands_data = json.loads(
        (PROJECT_ROOT / "backend" / "resources" / "brands.json").read_text(encoding="utf-8")
    )
    templates = [
        "/{brand}/account/login",
        "/{brand}/netbanking/dashboard?session=abc123",
        "/{brand}/credit-card/statement?month=10&year=2026",
        "/{brand}/upi/pay?ref=TXN{n}",
        "/{brand}/support/ticket/{n}",
        "/{brand}/offers/cashback?code=SAVE{n}",
        "/{brand}/kyc/verify?step=1",        # legit KYC page
        "/{brand}/loans/apply?type=personal",
        "/{brand}/profile/update",
        "/{brand}/notifications/{n}",
    ]

    rows = []
    n = 0
    for key, info in brands_data["brands"].items():
        for domain in info["official_domains"][:2]:  # at most 2 domains per brand
            for tpl in templates:
                path = tpl.format(brand=key, n=n)
                url = f"https://{domain}{path}"
                rows.append({"url": url, "label": 0})
                n += 1

    return pd.DataFrame(rows)


def main() -> None:
    print("Loading PhiUSIIL ...")
    df = _load_phiusiil()
    print(f"  Loaded {len(df):,} rows  |  phishing: {df['label'].sum():,}  legit: {(df['label']==0).sum():,}")

    print("Adding legit deep-link augmentation ...")
    aug = _add_legit_deep_links()
    print(f"  Added {len(aug):,} augmented legit URLs")
    df = pd.concat([df, aug], ignore_index=True)

    # ── Optional: OpenPhish recent test set ──────────────────────────────────
    if OPENPHISH_FILE.exists():
        print(f"Loading OpenPhish from {OPENPHISH_FILE} ...")
        op_urls = [u.strip() for u in OPENPHISH_FILE.read_text(encoding="utf-8").splitlines() if u.strip()]
        op_df = pd.DataFrame({"url": op_urls, "label": 1})
        recent_test_path = SPLITS_DIR / "url_recent_test.csv"
        op_df.to_csv(recent_test_path, index=False, encoding="utf-8")
        print(f"  Saved {len(op_df):,} recent phish URLs -> {recent_test_path}")

    # ── Extract features ──────────────────────────────────────────────────────
    print("Extracting URL features ...")
    feat_rows = [extract_features(u) for u in df["url"]]
    feat_df = pd.DataFrame(feat_rows, columns=FEATURE_NAMES)
    df = pd.concat([df.reset_index(drop=True), feat_df], axis=1)

    # ── Stratified 70/15/15 split ─────────────────────────────────────────────
    print("Splitting 70/15/15 ...")
    train_df, temp_df = train_test_split(
        df, test_size=0.30, random_state=SEED, stratify=df["label"]
    )
    val_df, test_df = train_test_split(
        temp_df, test_size=0.50, random_state=SEED, stratify=temp_df["label"]
    )

    SPLITS_DIR.mkdir(parents=True, exist_ok=True)
    train_df.to_csv(SPLITS_DIR / "url_train.csv", index=False, encoding="utf-8")
    val_df.to_csv(SPLITS_DIR / "url_val.csv",   index=False, encoding="utf-8")
    test_df.to_csv(SPLITS_DIR / "url_test.csv",  index=False, encoding="utf-8")

    print(f"\nSaved splits:")
    print(f"  url_train.csv : {len(train_df):,} rows")
    print(f"  url_val.csv   : {len(val_df):,} rows")
    print(f"  url_test.csv  : {len(test_df):,} rows")
    print("Done OK")


if __name__ == "__main__":
    main()
