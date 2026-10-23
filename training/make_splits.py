"""
training/make_splits.py
-----------------------
Create train / val / test splits using GroupShuffleSplit on template_id.

- Splits UCI and Indian data separately (so each split has representation
  from both sources), then concatenates.
- Saves data/splits/train.csv, val.csv and data/frozen_test.csv (16.12).
- frozen_test.csv is NEVER overwritten unless --force-reset-frozen is given.
- Asserts template_id sets are disjoint across splits.
- Never reads data/real_world_test/.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd
from sklearn.model_selection import GroupShuffleSplit

ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = ROOT / "data" / "processed"
SPLITS_DIR = ROOT / "data" / "splits"
FROZEN_TEST = ROOT / "data" / "frozen_test.csv"

SEED = 42


def _split_by_template(
    df: pd.DataFrame, seed: int = SEED
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """70/15/15 split using GroupShuffleSplit on template_id."""

    # First split: 70% train, 30% temp (val+test)
    gss1 = GroupShuffleSplit(n_splits=1, test_size=0.30, random_state=seed)
    train_idx, temp_idx = next(gss1.split(df, groups=df["template_id"]))
    train_df = df.iloc[train_idx].copy()
    temp_df = df.iloc[temp_idx].copy()

    # Second split: 50% of temp → val, 50% → test  (each ≈15% of total)
    gss2 = GroupShuffleSplit(n_splits=1, test_size=0.50, random_state=seed)
    val_idx, test_idx = next(gss2.split(temp_df, groups=temp_df["template_id"]))
    val_df = temp_df.iloc[val_idx].copy()
    test_df = temp_df.iloc[test_idx].copy()

    return train_df, val_df, test_df


def _print_stats(name: str, df: pd.DataFrame) -> None:
    """Print count breakdown by source and label."""
    print(f"\n  {name}: {len(df)} rows")
    for source in sorted(df["source"].unique()):
        sub = df[df["source"] == source]
        label_counts = sub["label"].value_counts().sort_index()
        parts = ", ".join(
            f"{'scam' if lbl == 1 else 'legit'}={cnt}"
            for lbl, cnt in label_counts.items()
        )
        print(f"    {source:12s}: {len(sub):>5}  ({parts})")
    tids = df["template_id"].nunique()
    print(f"    unique template_ids: {tids}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create train/val/test splits")
    parser.add_argument(
        "--force-reset-frozen",
        action="store_true",
        help="Overwrite data/frozen_test.csv even if it exists",
    )
    args = parser.parse_args()

    # ------------------------------------------------------------------ load
    uci_path = PROCESSED_DIR / "uci.csv"
    indian_path = PROCESSED_DIR / "indian.csv"

    if not uci_path.exists():
        print(f"[ERROR] {uci_path} not found. Run training/prepare_text_data.py first.", file=sys.stderr)
        sys.exit(1)
    if not indian_path.exists():
        print(f"[ERROR] {indian_path} not found. Run training/generate_indian_messages.py first.", file=sys.stderr)
        sys.exit(1)

    uci = pd.read_csv(uci_path, encoding="utf-8")
    indian = pd.read_csv(indian_path, encoding="utf-8")

    print(f"[Loaded] UCI: {len(uci)} rows, Indian: {len(indian)} rows")

    # ------------------------------------------------------------------ split each source separately
    uci_train, uci_val, uci_test = _split_by_template(uci, seed=SEED)

    if FROZEN_TEST.exists() and not args.force_reset_frozen:
        test = pd.read_csv(FROZEN_TEST, encoding="utf-8")
        frozen_tids = set(test["template_id"])
        # Only split non-frozen Indian templates; any that land in "test" go to validation instead
        ind_non_frozen = indian[~indian["template_id"].isin(frozen_tids)].copy()
        ind_train, ind_val, ind_test_new = _split_by_template(ind_non_frozen, seed=SEED)
        ind_val = pd.concat([ind_val, ind_test_new], ignore_index=True)
        print(f"[Frozen test preserved] {len(test)} rows. New Indian test templates ({len(ind_test_new)} rows) redirected to val.")
    else:
        ind_train, ind_val, ind_test = _split_by_template(indian, seed=SEED)
        test = pd.concat([uci_test, ind_test], ignore_index=True)

    # ------------------------------------------------------------------ concatenate
    train = pd.concat([uci_train, ind_train], ignore_index=True)
    val   = pd.concat([uci_val,   ind_val],   ignore_index=True)

    # ------------------------------------------------------------------ assert disjoint template_ids
    train_tids = set(train["template_id"])
    val_tids   = set(val["template_id"])
    test_tids  = set(test["template_id"])

    assert train_tids.isdisjoint(val_tids), (
        f"template_id leak train↔val: {train_tids & val_tids}"
    )
    assert train_tids.isdisjoint(test_tids), (
        f"template_id leak train↔test: {train_tids & test_tids}"
    )
    assert val_tids.isdisjoint(test_tids), (
        f"template_id leak val↔test: {val_tids & test_tids}"
    )
    print("[OK] template_id sets are disjoint across all splits.")

    # ------------------------------------------------------------------ save splits
    SPLITS_DIR.mkdir(parents=True, exist_ok=True)
    train.to_csv(SPLITS_DIR / "train.csv", index=False, encoding="utf-8")
    val.to_csv(SPLITS_DIR / "val.csv", index=False, encoding="utf-8")
    print(f"\n[Saved] data/splits/train.csv  ({len(train)} rows)")
    print(f"[Saved] data/splits/val.csv    ({len(val)} rows)")

    # ------------------------------------------------------------------ frozen test (16.12)
    if FROZEN_TEST.exists() and not args.force_reset_frozen:
        print(f"\n[SKIP] {FROZEN_TEST} already exists ({len(test)} rows, untouched). Use --force-reset-frozen to overwrite.")
    else:
        test.to_csv(FROZEN_TEST, index=False, encoding="utf-8")
        action = "Overwrote" if FROZEN_TEST.exists() else "Created"
        print(f"\n[{action}] data/frozen_test.csv ({len(test)} rows)")

    # ------------------------------------------------------------------ print stats
    print("\n=== Split statistics ===")
    _print_stats("train", train)
    _print_stats("val", val)
    _print_stats("test (frozen)", test)

    total = len(train) + len(val) + len(test)
    print(f"\n  Total: {total} rows")
    print(f"  Ratios: train {len(train)/total:.1%}, val {len(val)/total:.1%}, test {len(test)/total:.1%}")
    print()


if __name__ == "__main__":
    main()
