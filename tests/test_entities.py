"""tests/test_entities.py

Unit tests for entity extraction per PRD FR11 and Section 16.16.
"""

from __future__ import annotations

import pytest
from backend.pipeline.entities import extract_entities


def test_upi_and_amount_extraction():
    res = extract_entities("Pay Rs. 2,499 to refund.help@ybl now")
    assert res["upi_ids"] == ["refund.help@ybl"]
    assert res["amounts"] == ["₹2,499"]
    assert res["emails"] == []


def test_email_extraction_not_upi():
    res = extract_entities("Mail me at ravi.k@gmail.com")
    assert res["emails"] == ["ravi.k@gmail.com"]
    assert res["upi_ids"] == []


def test_standard_phone_numbers():
    res = extract_entities("Call 98765 43210 or +91-9123456789")
    assert res["phones"] == ["9876543210", "9123456789"]


def test_masked_phone_number():
    res = extract_entities("Contact 98XXXXXX12 immediately")
    assert res["phones"] == ["98XXXXXX12"]


def test_otp_code_not_phone():
    res = extract_entities("492011 is your OTP. Do not share")
    assert res["phones"] == []


def test_phone_in_otp_context_excluded():
    res = extract_entities("Your OTP is 9876543210")
    assert res["phones"] == []


def test_masked_account_number():
    res = extract_entities("A/c XX4821 debited")
    assert res["account_like"] == ["XXXX4821"]


def test_full_account_number_masked():
    res = extract_entities("Account 123456789012 will be frozen")
    assert res["account_like"] == ["XXXX9012"]


def test_promotional_date_and_percent_empty():
    res = extract_entities("Big sale 70% off on 12/10/2026")
    assert res["phones"] == []
    assert res["upi_ids"] == []
    assert res["urls"] == []
    assert res["amounts"] == []
    assert res["emails"] == []
    assert res["account_like"] == []


def test_urls_stripping_and_deduplication():
    urls = [
        "https://example.com/login.",
        "https://example.com/login",
        "https://test.xyz/pay,",
    ]
    res = extract_entities("Check out the links", urls=urls)
    assert res["urls"] == [
        "https://example.com/login",
        "https://test.xyz/pay",
    ]


def test_max_five_items_per_category():
    text = "Call 9800000001, 9800000002, 9800000003, 9800000004, 9800000005, 9800000006"
    res = extract_entities(text)
    assert len(res["phones"]) == 5
