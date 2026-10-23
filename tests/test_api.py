"""tests/test_api.py

API endpoint tests for GET /health and POST /analyze per FR1.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
    assert "components" in data
    assert data["components"]["text_model"] is True
    assert data["components"]["rules"] is True
    assert "ocr" in data["components"]
    assert data["model_version"] in ("v1", "v2")


def test_analyze_scam_text_json(client: TestClient):
    payload = {
        "text": "Dear customer, your SBI KYC is expiring. Update immediately at http://sbi.kyc-update.xyz/login or account blocked."
    }
    resp = client.post("/analyze", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["level"] == "red"
    assert data["risk_score"] > 70
    assert data["input_type"] == "text"
    assert len(data["urls_found"]) == 1
    assert data["component_scores"]["url"] is not None
    assert data["error"] is None
    assert len(data["advice_en"]) > 0
    assert len(data["advice_hi"]) > 0
    assert len(data["next_steps"]) > 0


def test_analyze_bank_otp_text_json(client: TestClient):
    payload = {
        "text": "Your SBI NetBanking login OTP is 483921. Valid for 5 minutes. Do not share this OTP with anyone."
    }
    resp = client.post("/analyze", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["level"] == "green"
    assert data["risk_score"] < 35
    assert data["component_scores"]["url"] is None
    assert data["urls_found"] == []
    assert data["error"] is None


def test_analyze_url_json(client: TestClient):
    payload = {
        "url": "http://sbi.kyc-update.xyz/login"
    }
    resp = client.post("/analyze", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["level"] == "red"
    assert data["input_type"] == "url"
    assert data["urls_found"] == ["http://sbi.kyc-update.xyz/login"]
    assert data["error"] is None


def test_analyze_empty_request_returns_400(client: TestClient):
    resp = client.post("/analyze", json={})
    assert resp.status_code == 400
    data = resp.json()
    assert "error" in data
    assert len(data["error"]) > 0


def test_analyze_form_data(client: TestClient):
    form_data = {
        "text": "Dear customer, your electricity will be disconnected tonight. Pay immediately or your connection will be suspended."
    }
    resp = client.post("/analyze", data=form_data)
    assert resp.status_code == 200
    data = resp.json()
    assert data["level"] in ("amber", "red")
    assert data["input_type"] == "text"
    assert data["error"] is None


def test_analyze_mock_endpoint(client: TestClient):
    resp = client.get("/mock/analyze")
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_score"] == 82
    assert data["level"] == "red"
    assert data["model_version"] == "v1"


# ---------------------------------------------------------------------------
# FIX 1 — /health component shapes
# ---------------------------------------------------------------------------
def test_health_component_shapes(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("api_version") == 2
    components = data["components"]
    # translator must be a string (not a bool)
    assert isinstance(components.get("translator"), str), (
        f"translator must be a string, got {type(components.get('translator'))}"
    )
    # translator_engine must be null
    assert components.get("translator_engine") is None, (
        f"translator_engine must be null, got {components.get('translator_engine')}"
    )
    # ocr must be a boolean
    assert isinstance(components.get("ocr"), bool), (
        f"ocr must be a bool, got {type(components.get('ocr'))}"
    )


# ---------------------------------------------------------------------------
# FIX 2 — GET /languages
# ---------------------------------------------------------------------------
def test_languages_endpoint(client: TestClient):
    resp = client.get("/languages")
    assert resp.status_code == 200
    data = resp.json()
    codes = [lang["code"] for lang in data["languages"]]
    assert "en" in codes
    assert "hi" in codes
    # translator and translator_engine shape
    assert isinstance(data.get("translator"), str)
    assert data.get("translator_engine") is None


# ---------------------------------------------------------------------------
# FIX 3 — Official URL-only returns green via API
# ---------------------------------------------------------------------------
def test_official_url_only_returns_green(client: TestClient):
    resp = client.post("/analyze", json={"text": "https://www.onlinesbi.sbi/"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["level"] == "green", (
        f"Expected green for official SBI domain, got {data['level']} "
        f"(risk_score={data['risk_score']})"
    )
    assert data["component_scores"]["text"] is None, (
        f"component_scores.text must be null for URL-only input, got {data['component_scores']['text']}"
    )


# ---------------------------------------------------------------------------
# BE2-J — Cache-Control: no-store on API responses
# ---------------------------------------------------------------------------
def test_cache_control_on_health(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert "no-store" in resp.headers.get("cache-control", ""), (
        f"Expected Cache-Control: no-store on /health, got {resp.headers.get('cache-control')}"
    )


# ---------------------------------------------------------------------------
# BE2-J — Unknown API path returns JSON 404, not HTML
# ---------------------------------------------------------------------------
def test_api_404_returns_json(client: TestClient):
    resp = client.get("/health/nonexistent-sub-path")
    assert resp.status_code == 404
    data = resp.json()
    assert "error" in data


# ---------------------------------------------------------------------------
# Scam Radar endpoint test
# ---------------------------------------------------------------------------
def test_radar_endpoint(client: TestClient):
    resp = client.get("/radar")
    assert resp.status_code == 200
    data = resp.json()
    assert "updated_at" in data
    assert "top_categories" in data
    assert isinstance(data["top_categories"], list)
    assert len(data["top_categories"]) > 0
    assert "recent_entities" in data
    assert isinstance(data["recent_entities"], list)
    assert "total_reports" in data
    assert "active_hours" in data
    assert data["active_hours"].get("timezone") == "IST"
    # Ensure entities are properly masked
    for ent in data["recent_entities"]:
        masked = ent["masked"]
        if ent["type"] == "phone":
            assert "XX" in masked
        elif ent["type"] == "upi":
            assert "****" in masked
