"""
training/prepare_text_data.py
-----------------------------
Process the UCI SMS Spam Collection into a clean CSV for model training.

Mapping:  spam → label 1  (scam)
          ham  → label 0  (legit)

template_id strategy: normalise each message (lowercase, digits stripped,
whitespace collapsed), then assign the same "uci_<n>" id to every group of
identical normalised texts (catches near-exact duplicates such as bulk-sent
spam).  This ensures GroupShuffleSplit keeps duplicates in one split.

Output: data/processed/uci.csv with columns
        text, label, category, template_id, source
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / "data" / "raw" / "sms_spam" / "SMSSpamCollection"
OUT_PATH = ROOT / "data" / "processed" / "uci.csv"
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _normalise_for_dedup(text: str) -> str:
    """Lowercase, strip digits, collapse whitespace — used only for grouping."""
    text = text.lower()
    text = re.sub(r"\d+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if not RAW_PATH.exists():
        print(
            "\n[ERROR] UCI SMS Spam Collection not found.\n"
            f"  Expected: {RAW_PATH}\n\n"
            "  To download:\n"
            "    1. Visit https://archive.ics.uci.edu/dataset/228/sms+spam+collection\n"
            "    2. Download the ZIP, extract, and copy 'SMSSpamCollection' to:\n"
            f"       {RAW_PATH}\n"
            "  (The file is tab-separated with columns: label, text — no header row.)\n",
            file=sys.stderr,
        )
        sys.exit(1)

    # ------------------------------------------------------------------ load
    df = pd.read_csv(
        RAW_PATH,
        sep="\t",
        header=None,
        names=["raw_label", "text"],
        encoding="utf-8",
    )

    # ------------------------------------------------------------------ map labels
    df["label"] = df["raw_label"].map({"spam": 1, "ham": 0})
    unknown = df["label"].isna().sum()
    if unknown:
        print(f"[WARNING] {unknown} rows with unknown labels dropped.", file=sys.stderr)
        df = df.dropna(subset=["label"])
    df["label"] = df["label"].astype(int)

    df["category"] = df["raw_label"].map({"spam": "uci_spam", "ham": "uci_ham"})

    # ------------------------------------------------------------------ template_id (near-dup grouping)
    df["_norm"] = df["text"].apply(_normalise_for_dedup)
    norm_to_id: dict[str, str] = {}
    counter = 0
    template_ids = []
    for norm in df["_norm"]:
        if norm not in norm_to_id:
            norm_to_id[norm] = f"uci_{counter}"
            counter += 1
        template_ids.append(norm_to_id[norm])
    df["template_id"] = template_ids

    df["source"] = "uci"

    # ------------------------------------------------------------------ output
    out_cols = ["text", "label", "category", "template_id", "source"]
    df[out_cols].to_csv(OUT_PATH, index=False, encoding="utf-8")

    # ------------------------------------------------------------------ report
    total = len(df)
    spam_n = (df["label"] == 1).sum()
    ham_n = (df["label"] == 0).sum()
    n_templates = df["template_id"].nunique()

    print(f"\n[UCI] Written to {OUT_PATH}")
    print(f"  Total rows      : {total:,}")
    print(f"  spam (scam=1)   : {spam_n:,}")
    print(f"  ham  (legit=0)  : {ham_n:,}")
    print(f"  Unique template_id groups : {n_templates:,}")
    print(f"  (Groups = normalised near-duplicate clusters)\n")


if __name__ == "__main__":
    main()
