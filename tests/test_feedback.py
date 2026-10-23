"""tests/test_feedback.py

Tests for feedback storage (FR10.1, FR10.2) and POST /report endpoint.
Verifies SQLite storage, deduplication, review state transitions, variants,
approved training rows export, and rate limiting.
"""

from __future__ import annotations

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

import backend.config
import backend.feedback.store
import backend.main
from backend.feedback.store import (
    add_report,
    add_variants,
    approved_training_rows,
    delete_variant,
    get_report,
    init_db,
    list_reports,
    list_variants,
    set_status,
)
from backend.main import app


@pytest.fixture(autouse=True)
def isolated_feedback_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Ensure all tests in this module run against an isolated temporary SQLite database."""
    test_db = tmp_path / "test_feedback.db"
    monkeypatch.setattr(backend.config, "FEEDBACK_DB", test_db)
    monkeypatch.setattr(backend.feedback.store, "FEEDBACK_DB", test_db)
    # Clear rate limiter timestamps between test runs
    with backend.main._report_rate_lock:
        backend.main._report_timestamps.clear()
    init_db(test_db)
    yield test_db


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_add_report_and_deduplication():
    """Verify adding reports and deduplication on normalised text."""
    id1 = add_report(
        text="Dear customer, your SBI KYC is pending. Update now.",
        urls=["http://sbi-kyc.xyz"],
        user_label="scam",
        predicted_level="red",
        predicted_score=85,
        model_version="v2",
    )
    assert isinstance(id1, int)

    rep1 = get_report(id1)
    assert rep1 is not None
    assert rep1["duplicate_count"] == 1
    assert rep1["status"] == "pending"
    assert rep1["urls"] == ["http://sbi-kyc.xyz"]

    # Insert identical text with varying case and whitespace
    id2 = add_report(
        text="  dear   CUSTOMER, your SBI kyc is pending.   Update now. \n",
        urls=["http://another-url.xyz"],
        user_label="scam",
    )
    assert id2 == id1

    rep1_updated = get_report(id1)
    assert rep1_updated is not None
    assert rep1_updated["duplicate_count"] == 2


def test_list_and_set_status():
    """Verify listing by status and status transitions."""
    id1 = add_report(
        text="Report 1 text",
        urls=[],
        user_label="scam",
        predicted_level="red",
        predicted_score=90,
        model_version="v2",
    )
    id2 = add_report(
        text="Report 2 text",
        urls=[],
        user_label="legit",
        predicted_level="green",
        predicted_score=10,
        model_version="v2",
    )

    pending = list_reports(status="pending")
    assert len(pending) == 2

    # Approve report 1
    ok = set_status(
        id1,
        status="approved",
        final_label="scam",
        category="kyc_phishing",
        template_id="in_kyc_01",
    )
    assert ok is True

    rep1 = get_report(id1)
    assert rep1["status"] == "approved"
    assert rep1["user_label"] == "scam"
    assert rep1["category"] == "kyc_phishing"
    assert rep1["template_id"] == "in_kyc_01"
    assert rep1["reviewed_at"] is not None

    # Check filtered listings
    approved = list_reports(status="approved")
    assert len(approved) == 1
    assert approved[0]["id"] == id1

    pending_after = list_reports(status="pending")
    assert len(pending_after) == 1
    assert pending_after[0]["id"] == id2


def test_variants_and_approved_training_rows():
    """Verify variant insertion, deletion, and approved training rows export."""
    rep_id = add_report(
        text="Electricity disconnection alert. Pay immediately.",
        urls=["http://pay-bill.click"],
        user_label="scam",
        predicted_level="amber",
        predicted_score=60,
        model_version="v2",
    )
    set_status(rep_id, status="approved", final_label="scam", template_id="in_elec_01")

    # Add variants
    var_texts = [
        "Your power will be disconnected at 9:30 PM. Pay bill at http://pay-bill.click",
        "Dear consumer, electricity supply cut off notice. Contact electricity officer.",
    ]
    var_ids = add_variants(
        report_id=rep_id,
        texts=var_texts,
        label="scam",
        template_id="in_elec_01_var",
    )
    assert len(var_ids) == 2

    listed_vars = list_variants(rep_id)
    assert len(listed_vars) == 2
    assert listed_vars[0]["text"] == var_texts[0]

    # Delete one variant
    del_ok = delete_variant(var_ids[1])
    assert del_ok is True
    assert len(list_variants(rep_id)) == 1

    # Check training DataFrame export
    df = approved_training_rows()
    assert len(df) == 2  # 1 approved report + 1 remaining variant
    assert set(df.columns) == {"text", "label", "template_id", "source"}
    assert set(df["source"]) == {"feedback", "feedback_variant"}


def test_post_report_endpoint_success(client: TestClient):
    """Test POST /report with valid payload returns HTTP 200 and truncates text > 2000 chars."""
    long_prefix = "Attention! " * 250  # ~2750 chars
    payload = {
        "text": long_prefix,
        "urls": ["http://suspicious-loan.xyz"],
        "user_label": "scam",
        "predicted_level": "red",
        "predicted_score": 88,
        "model_version": "v2",
    }
    resp = client.post("/report", json=payload)
    assert resp.status_code == 200
    assert resp.json() == {"status": "received"}

    reports = list_reports(status="pending")
    assert len(reports) == 1
    assert len(reports[0]["text"]) == 2000
    assert reports[0]["user_label"] == "scam"
    assert reports[0]["predicted_score"] == 88


def test_post_report_endpoint_rate_limit(client: TestClient):
    """Test rate limiting: 20 reports succeed, 21st in 60s returns HTTP 429."""
    base_payload = {
        "urls": [],
        "user_label": "scam",
        "predicted_level": "amber",
        "predicted_score": 50,
        "model_version": "v2",
    }

    # First 20 reports must succeed (HTTP 200)
    for i in range(20):
        resp = client.post("/report", json={**base_payload, "text": f"Scam report number {i}"})
        assert resp.status_code == 200, f"Request {i+1} failed with status {resp.status_code}"

    # 21st report within 60s must be rejected with HTTP 429
    resp_21 = client.post("/report", json={**base_payload, "text": "Scam report number 21"})
    assert resp_21.status_code == 429
    assert resp_21.json() == {
        "error": "Too many reports right now. Please try again in a minute."
    }
