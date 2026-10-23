"""backend/pipeline/entities.py

Entity extraction for CyberCheckmate per PRD FR11 and Section 16.16.

Extracts high-value investigation and complaint entities:
- Phone numbers (standard 10-digit Indian mobile formats and masked numbers)
- UPI IDs (excluding emails)
- URLs / Domains (from preprocessed list, without trailing punctuation)
- Amounts (INR, Rs, ₹)
- Email addresses
- Account-like numbers (9–18 digit non-phone numbers and masked account numbers)

Privacy constraint:
- Pure functions only.
- No file or network I/O.
- NEVER logs extracted text or entities.
"""

from __future__ import annotations

import re
from typing import Any

# Regex patterns per PRD 16.16
_EMAIL_RE = re.compile(
    r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})?"
)

_UPI_RE = re.compile(
    r"\b[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}\b"
)

_PHONE_STD_RE = re.compile(
    r"(?<!\d)(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)"
)

_PHONE_MASKED_RE = re.compile(
    r"\b[6-9]\d[X\d]{6,8}\d{0,2}\b",
    re.IGNORECASE,
)

_AMOUNT_RE = re.compile(
    r"(?i)(?:₹|rs\.?|inr)\s?\d[\d,]*(?:\.\d{1,2})?"
)

_ACCOUNT_MASKED_RE = re.compile(
    r"(?i)\bX{2,14}\d{4}\b"
)

_ACCOUNT_DIGITS_RE = re.compile(
    r"(?<!\d)\d{9,18}(?!\d)"
)

_TRAILING_PUNCT_RE = re.compile(
    r"[.,;:!?\)\]\}>]+$"
)


def _dedupe_and_cap(items: list[str], max_items: int = 5) -> list[str]:
    """Deduplicate items while preserving appearance order, capped at max_items."""
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
            if len(result) >= max_items:
                break
    return result


def extract_entities(text: str, urls: list[str] | None = None) -> dict[str, list[str]]:
    """Extract entities from message text and pre-extracted URLs.

    Parameters
    ----------
    text : str
        Input message text or OCR-extracted text.
    urls : list[str], optional
        List of URLs already extracted by preprocessing.

    Returns
    -------
    dict[str, list[str]]
        Dictionary with keys:
        - "phones": list of normalized 10-digit or masked phone numbers
        - "upi_ids": list of UPI IDs (no dot after @)
        - "urls": list of clean URLs/domains without trailing punctuation
        - "amounts": list of amounts normalized to "₹<number>"
        - "emails": list of email addresses
        - "account_like": list of masked account numbers ("XXXX" + last 4 digits)
    """
    if text is None:
        text = ""

    # 1. Emails
    emails: list[str] = []
    email_spans: list[tuple[int, int]] = []
    for m in _EMAIL_RE.finditer(text):
        emails.append(m.group(0))
        email_spans.append(m.span())

    # 2. UPI IDs (exclude anything overlapping an email or with a dot-TLD right after @handle)
    upi_ids: list[str] = []
    for m in _UPI_RE.finditer(text):
        s, e = m.span()
        # Overlaps an email
        if any(es <= s and e <= ee for es, ee in email_spans):
            continue
        # Immediate dot followed by alphabetic TLD implies it's an email handle/domain
        if e < len(text) and text[e] == "." and re.match(r"^\.[A-Za-z]{2,}", text[e:]):
            continue
        upi_ids.append(m.group(0))

    # 3. Phones (standard and masked)
    phones: list[str] = []

    # Standard phones
    for m in _PHONE_STD_RE.finditer(text):
        s, e = m.span()
        context_before = text[max(0, s - 40):s].lower()
        if "otp" in context_before or "code" in context_before:
            continue
        raw = m.group(0)
        cleaned = re.sub(r"[\s-]", "", raw)
        if cleaned.startswith("+91"):
            cleaned = cleaned[3:]
        elif cleaned.startswith("0") and len(cleaned) == 11:
            cleaned = cleaned[1:]
        if len(cleaned) == 10:
            phones.append(cleaned)

    # Masked phones (e.g. 98XXXXXX12 with >= 4 'X')
    for m in _PHONE_MASKED_RE.finditer(text):
        raw = m.group(0)
        if raw.upper().count("X") >= 4:
            s, e = m.span()
            context_before = text[max(0, s - 40):s].lower()
            if "otp" in context_before or "code" in context_before:
                continue
            phones.append(raw)

    # 4. Amounts (normalized to "₹<number as written without spaces>")
    amounts: list[str] = []
    for m in _AMOUNT_RE.finditer(text):
        raw = m.group(0)
        prefix_match = re.match(r"(?i)^(?:₹|rs\.?|inr)\s*", raw)
        if prefix_match:
            num = raw[prefix_match.end():]
            num = re.sub(r"\s+", "", num)
            amounts.append(f"₹{num}")

    # 5. Account-like (masked forms like XX4821 or 9-18 digit runs that are not phones)
    account_like: list[str] = []

    # Masked forms
    for m in _ACCOUNT_MASKED_RE.finditer(text):
        raw = m.group(0)
        last4 = raw[-4:]
        account_like.append(f"XXXX{last4}")

    # Digit runs 9-18 digits that are not phones
    for m in _ACCOUNT_DIGITS_RE.finditer(text):
        digits = m.group(0)
        # Exclude 10-digit mobile numbers starting with 6-9
        if len(digits) == 10 and digits[0] in "6789":
            continue
        # Exclude if it was in the phones list
        if digits in phones:
            continue
        last4 = digits[-4:]
        account_like.append(f"XXXX{last4}")

    # 6. URLs (given urls list, stripped of trailing punctuation)
    clean_urls: list[str] = []
    if urls:
        for u in urls:
            if u:
                cleaned = _TRAILING_PUNCT_RE.sub("", u.strip())
                if cleaned:
                    clean_urls.append(cleaned)

    return {
        "phones": _dedupe_and_cap(phones),
        "upi_ids": _dedupe_and_cap(upi_ids),
        "urls": _dedupe_and_cap(clean_urls),
        "amounts": _dedupe_and_cap(amounts),
        "emails": _dedupe_and_cap(emails),
        "account_like": _dedupe_and_cap(account_like),
    }
