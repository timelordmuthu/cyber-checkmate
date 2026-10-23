"""scripts/check_demo_not_in_training.py

Verifies that NONE of the demo messages (especially e-challan messages reserved
for the live adaptation demo in Prompt 23) appear in any training, validation,
or test split.

Checks:
- data/splits/train.csv
- data/splits/val.csv
- data/frozen_test.csv

Verifies exact match, normalized equality, and rapidfuzz fuzzy similarity (> 80%).
Exits with code 0 on complete clean pass; exits non-zero if any overlap is detected.

Usage:
    python scripts/check_demo_not_in_training.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import DATA_DIR, SPLITS_DIR, FROZEN_TEST_CSV

ECHALLAN_JSON = PROJECT_ROOT / "demo" / "echallan" / "messages.json"
DEMO_INPUTS_JSON = PROJECT_ROOT / "demo" / "demo_inputs.json"


def normalize_text(text: str) -> str:
    """Normalize text for strict duplicate and leakage comparison."""
    if not isinstance(text, str):
        return ""
    text = text.lower()
    # Remove URLs
    text = re.sub(r"https?://\S+", "", text)
    # Remove phone numbers and digits
    text = re.sub(r"\d+", "", text)
    # Remove punctuation
    text = re.sub(r"[^\w\s]", "", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def main() -> int:
    print("=" * 70)
    print("Checking Demo Messages vs Training / Evaluation Splits")
    print("=" * 70)

    # 1. Load demo messages to check
    demo_texts: list[tuple[str, str]] = []  # (source_id, raw_text)

    if ECHALLAN_JSON.exists():
        data = json.loads(ECHALLAN_JSON.read_text(encoding="utf-8"))
        for item in data:
            demo_texts.append((item.get("id", "echallan"), item.get("text", "")))
        print(f"Loaded {len(data)} e-challan demo messages from {ECHALLAN_JSON.name}")
    else:
        print(f"[ERROR] Missing {ECHALLAN_JSON}")
        return 1

    if DEMO_INPUTS_JSON.exists():
        demo_inputs = json.loads(DEMO_INPUTS_JSON.read_text(encoding="utf-8"))
        for name, item in demo_inputs.items():
            if "text" in item:
                demo_texts.append((name, item["text"]))
        print(f"Loaded demo inputs from {DEMO_INPUTS_JSON.name}")

    # 2. Identify splits to verify
    splits_to_check = [
        ("train.csv", SPLITS_DIR / "train.csv"),
        ("val.csv", SPLITS_DIR / "val.csv"),
        ("frozen_test.csv", FROZEN_TEST_CSV),
    ]

    leakages_found = []

    for split_name, split_path in splits_to_check:
        if not split_path.exists():
            print(f"[WARNING] Split file {split_name} does not exist at {split_path}, skipping.")
            continue

        df = pd.read_csv(split_path, encoding="utf-8")
        if "text" not in df.columns:
            print(f"[WARNING] Column 'text' not found in {split_name}, skipping.")
            continue

        print(f"Checking against {split_name} ({len(df):,} rows)...")

        # Check for e-challan content leakage specifically
        for idx, row in df.iterrows():
            row_text = str(row["text"])
            row_norm = normalize_text(row_text)

            # Keyword sanity check: no e-challan keywords allowed in baseline splits
            if "challan" in row_text.lower() or "parivahan" in row_text.lower():
                leakages_found.append({
                    "split": split_name,
                    "row_index": idx,
                    "issue": "Found prohibited e-challan keyword in training split",
                    "text": row_text,
                })

            # Check similarity against all demo texts
            for demo_id, demo_raw in demo_texts:
                demo_norm = normalize_text(demo_raw)
                if not demo_norm:
                    continue

                # Exact normalized match
                if row_norm == demo_norm:
                    leakages_found.append({
                        "split": split_name,
                        "row_index": idx,
                        "demo_id": demo_id,
                        "issue": "Exact normalized duplicate found",
                        "text": row_text,
                    })

                # High fuzzy similarity check
                sim = fuzz.token_sort_ratio(row_norm, demo_norm)
                if sim >= 80.0:
                    leakages_found.append({
                        "split": split_name,
                        "row_index": idx,
                        "demo_id": demo_id,
                        "issue": f"High fuzzy similarity ({sim:.1f}%)",
                        "text": row_text,
                    })

    print("-" * 70)
    if leakages_found:
        print(f"[FAILURE] Detected {len(leakages_found)} leakage instances in splits:")
        for leak in leakages_found[:10]:
            print(f"  • In {leak['split']} (row {leak.get('row_index')}): {leak['issue']}")
            print(f"    Text: \"{leak['text'][:80]}...\"")
        print("Please remove all e-challan and demo messages from training templates.")
        return 1

    print("[SUCCESS] Zero leakages found! Demo messages are 100% isolated from all splits.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
