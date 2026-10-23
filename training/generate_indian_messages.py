"""
training/generate_indian_messages.py
-------------------------------------
Expand the Indian scam and legit template lists into concrete messages
by filling fictional slot values, then write data/processed/indian.csv.

Design decisions (PRD FR7, 16.1):
- 5–9 messages generated per template (varied slot combos, not just
  swapping one value) so the classifier sees realistic variety.
- Scam and legit totals stay roughly equal.
- Each message carries its template's template_id for GroupShuffleSplit.
- Slot values are entirely fictional:
    phones  → 98XXXXXX01-style patterns
    links   → fictional *.scam-example.invalid TLD-style domains
    names   → common Indian first names (no real people)
    banks   → real bank names are kept (they appear in legitimate SMS too)
    amounts → ranges typical for the scam category
    otps    → 6-digit random numbers
    refs    → alphanumeric order references
- All text written with encoding="utf-8" (PRD 16.2 Windows requirement).
"""

from __future__ import annotations

import csv
import itertools
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from training.indian_templates.scam_templates import SCAM_TEMPLATES
from training.indian_templates.legit_templates import LEGIT_TEMPLATES

OUT_PATH = ROOT / "data" / "processed" / "indian.csv"
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

random.seed(42)


# ---------------------------------------------------------------------------
# Fictional slot pools
# ---------------------------------------------------------------------------

NAMES = [
    "Rahul", "Priya", "Amit", "Sunita", "Ravi", "Kavita",
    "Suresh", "Deepa", "Ankit", "Meena", "Vijay", "Lakshmi",
    "Arjun", "Pooja", "Sanjay", "Neha", "Rajesh", "Geeta",
    "Arun", "Shweta",
]

BANKS = [
    "SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Bank",
    "PNB", "Bank of Baroda", "Canara Bank", "Union Bank",
]

# Fictional scam domains – never real phishing URLs
SCAM_DOMAINS = [
    "http://sbi-kyc-secure.fakenet.xyz/update",
    "http://hdfc-refund.scam-example.top/verify",
    "http://paytm-cashback.xyz/claim",
    "http://gov-aadhaar-update.click/link",
    "http://electricity-pay.live/bill",
    "http://customs-clearance.buzz/release",
    "http://upi-refund.top/accept",
    "http://rbi-kyc.xyz/complete",
    "http://income-tax-refund.click/get",
    "http://npci-reward.live/redeem",
    "http://phonepe-cashback.top/withdraw",
    "http://bsnl-offer.xyz/claim",
]

# Fictional scam phones (98XXXXXX01-style)
SCAM_PHONES = [
    "9812340101", "9876543210", "9898001122", "9712345678",
    "9900112233", "9856781234", "9934561234", "9745671234",
]

# Realistic-looking reference numbers
def _ref() -> str:
    return "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ0123456789", k=10))


def _otp() -> str:
    return str(random.randint(100000, 999999))


def _amount(category: str) -> str:
    """Return a plausible fictional amount for the category."""
    ranges = {
        "fake_kyc":                   (0, 0),    # no amount usually
        "upi_refund_collect":         (50, 9999),
        "electricity_disconnection":  (200, 4999),
        "customs_courier":            (999, 29999),
        "job_task_scam":              (500, 50000),
        "lottery_cashback":           (10000, 500000),
        "aadhaar_pan_update":         (0, 0),
        "loan_offer":                 (10000, 500000),
        "digital_arrest":             (5000, 200000),
        "investment_trading":         (5000, 500000),
        "sextortion_threat":          (5000, 100000),
        "fake_customer_care":         (100, 5000),
        "otp":                        (50, 9999),
        "bank_debit_credit_alert":    (50, 49999),
        "delivery_update":            (200, 2999),
        "utility_bill_reminder":      (100, 2999),
        "college_exam_notice":        (0, 0),
        "legit_promotional":          (50, 999),
        "friend_family_chat":         (100, 2000),
        "police_awareness":           (0, 0),
        "bank_security_alert":        (0, 0),
        "investment_legit":           (1000, 200000),
        "customer_care_legit":        (100, 5000),
    }
    lo, hi = ranges.get(category, (100, 5000))
    if lo == hi == 0:
        return str(random.randint(100, 999))  # fallback small number
    return str(random.randint(lo, hi))


def _date() -> str:
    month = random.choice(["January", "February", "March", "April", "May",
                           "June", "July", "August", "September", "October"])
    day = random.randint(1, 28)
    return f"{day} {month} 2025"


def _phone(is_scam: bool) -> str:
    if is_scam:
        return random.choice(SCAM_PHONES)
    # Legit: starts with known operator prefixes, realistic
    prefix = random.choice(["98", "99", "91", "70", "80", "63"])
    return prefix + "".join(str(random.randint(0, 9)) for _ in range(8))


def _link() -> str:
    return random.choice(SCAM_DOMAINS)


# ---------------------------------------------------------------------------
# Message expander
# ---------------------------------------------------------------------------

def _fill(template: str, category: str, is_scam: bool) -> str:
    """Fill all {slots} in the template with fictional values."""
    filled = template
    if "{name}" in filled:
        filled = filled.replace("{name}", random.choice(NAMES))
    if "{bank}" in filled:
        filled = filled.replace("{bank}", random.choice(BANKS))
    if "{amount}" in filled:
        filled = filled.replace("{amount}", _amount(category))
    if "{phone}" in filled:
        filled = filled.replace("{phone}", _phone(is_scam))
    if "{link}" in filled:
        filled = filled.replace("{link}", _link())
    if "{date}" in filled:
        filled = filled.replace("{date}", _date())
    if "{otp}" in filled:
        filled = filled.replace("{otp}", _otp())
    if "{ref}" in filled:
        filled = filled.replace("{ref}", _ref())
    return filled


def _expand(templates: list[dict], label: int, n_per_template_range=(5, 9)) -> list[dict]:
    """Generate 5–9 distinct messages per template."""
    rows = []
    is_scam = label == 1
    for tmpl in templates:
        n = random.randint(*n_per_template_range)
        seen: set[str] = set()
        attempts = 0
        generated = 0
        while generated < n and attempts < n * 4:
            attempts += 1
            msg = _fill(tmpl["template"], tmpl["category"], is_scam)
            # Avoid exact duplicates within this template
            if msg not in seen:
                seen.add(msg)
                rows.append(
                    {
                        "text": msg,
                        "label": label,
                        "category": tmpl["category"],
                        "template_id": tmpl["template_id"],
                        "source": "synthetic",
                    }
                )
                generated += 1
    return rows


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    scam_rows = _expand(SCAM_TEMPLATES, label=1)
    legit_rows = _expand(LEGIT_TEMPLATES, label=0)

    # Roughly balance scam vs legit (trim the larger set at most 10%)
    n_scam = len(scam_rows)
    n_legit = len(legit_rows)
    ratio = n_scam / max(n_legit, 1)
    if ratio > 1.15:
        random.shuffle(scam_rows)
        scam_rows = scam_rows[: int(n_legit * 1.1)]
    elif ratio < 0.85:
        random.shuffle(legit_rows)
        legit_rows = legit_rows[: int(n_scam * 1.1)]

    all_rows = scam_rows + legit_rows
    random.shuffle(all_rows)

    fieldnames = ["text", "label", "category", "template_id", "source"]
    with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    # ------------------------------------------------------------------ report
    import collections
    label_counts = collections.Counter(r["label"] for r in all_rows)
    cat_counts = collections.Counter(r["category"] for r in all_rows)

    print(f"\n[Indian dataset] Written to {OUT_PATH}")
    print(f"  Total messages  : {len(all_rows):,}")
    print(f"  scam  (label=1) : {label_counts[1]:,}")
    print(f"  legit (label=0) : {label_counts[0]:,}")
    print("\n  By category:")
    for cat, cnt in sorted(cat_counts.items()):
        lbl = "scam" if any(r["category"] == cat and r["label"] == 1 for r in all_rows) else "legit"
        print(f"    {cat:<35} {cnt:>4}  ({lbl})")
    print()


if __name__ == "__main__":
    main()
