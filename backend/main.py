"""backend/main.py

CyberCheckmate FastAPI application.

Implements:
- Startup component initialization and probe (16.11): loads pipeline without crashing.
- GET /health → status, components, model_version, config.
- POST /analyze → FR1 contract (multipart/form-data and application/json).
- GET /mock/analyze → AnalyzeResponse.example() for frontend development.
- Global exception handlers: BadInput (400), ModelNotReady (503), General (500).
- CORS configuration for Vite dev server (localhost:5173).
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from collections import Counter, deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
import threading

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from backend.config import (
    ROOT,
    ACTIVE_JSON,
    TEXT_MODELS_DIR,
    URL_MODEL_PATH,
    TACTICS_JSON,
    GEMINI_API_KEY,
    GROQ_API_KEY,
    MAX_IMAGE_BYTES,
    REPORT_RATE_LIMIT_PER_MIN,
    ADMIN_TOKEN,
    config_summary,
)
from backend.pipeline.analyze import (
    BadInput,
    ModelNotReady,
    analyze,
    init_pipeline,
)
from backend.schemas import AnalyzeResponse, ErrorResponse, ReportRequest, ReportResponse
from backend.feedback.store import add_report, list_reports, set_status

# Rate limiter for POST /report (max 20 per 60 seconds per process)
_report_timestamps: deque[float] = deque()
_report_rate_lock = threading.Lock()

# Known API route prefixes — 404s on these must return JSON (BE2-J)
_API_PREFIXES = (
    "/analyze", "/health", "/languages", "/report",
    "/radar", "/admin", "/mock",
)


# ---------------------------------------------------------------------------
# Logging – log only timings and error types; NEVER request bodies or text (NFR4)
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
)
logger = logging.getLogger("cybercheckmate")


# ---------------------------------------------------------------------------
# Component probe
# ---------------------------------------------------------------------------
def _probe_components() -> tuple[dict[str, bool], str]:
    """
    Check which components are available.
    Absence is recorded, not fatal (16.11).
    """
    components: dict[str, bool] = {}

    active_version = "none"
    try:
        if ACTIVE_JSON.exists():
            data = json.loads(ACTIVE_JSON.read_text(encoding="utf-8"))
            active_version = data.get("version", "none")
            model_path = TEXT_MODELS_DIR / active_version / "model.joblib"
            components["text_model"] = model_path.exists()
        else:
            components["text_model"] = False
    except Exception as exc:
        logger.warning("text_model probe failed: %s: %s", type(exc).__name__, exc)
        components["text_model"] = False

    try:
        components["url_model"] = URL_MODEL_PATH.exists()
    except Exception as exc:
        logger.warning("url_model probe failed: %s: %s", type(exc).__name__, exc)
        components["url_model"] = False

    try:
        components["rules"] = TACTICS_JSON.exists()
    except Exception as exc:
        logger.warning("rules probe failed: %s: %s", type(exc).__name__, exc)
        components["rules"] = False

    try:
        from backend.pipeline.ocr import get_ocr
        components["ocr"] = bool(get_ocr().ready)
    except Exception as exc:
        logger.warning("ocr probe failed: %s: %s", type(exc).__name__, exc)
        components["ocr"] = False

    components["llm_gemini"] = GEMINI_API_KEY is not None
    components["llm_groq"] = GROQ_API_KEY is not None

    return components, active_version


# ---------------------------------------------------------------------------
# Application state
# ---------------------------------------------------------------------------
class _AppState:
    components: dict[str, bool] = {}
    active_version: str = "none"


_state = _AppState()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup checks and pipeline initialization."""
    t0 = time.perf_counter()
    logger.info("CyberCheckmate backend starting ...")

    # Initialize ML models, rules, and brand registry
    init_pipeline()

    _state.components, _state.active_version = _probe_components()

    missing = [k for k, v in _state.components.items() if v is False]
    if missing:
        logger.warning(
            "Missing components (run training scripts to fix): %s",
            ", ".join(missing),
        )
    else:
        logger.info("All components present.")

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    logger.info(
        "Startup complete in %d ms. Active text model: %s",
        elapsed_ms,
        _state.active_version,
    )

    yield

    logger.info("CyberCheckmate backend shutting down.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="CyberCheckmate",
    description="Explainable scam detection for SMS, links and screenshots.",
    version="0.1.0",
    lifespan=lifespan,
    responses={422: {"model": ErrorResponse}},
)

# CORS: allow Vite dev server and mobile devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Exception Handlers
# ---------------------------------------------------------------------------
@app.exception_handler(BadInput)
async def bad_input_handler(request: Request, exc: BadInput) -> JSONResponse:
    logger.warning("Bad input on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=400,
        content={"error": str(exc)},
    )


@app.exception_handler(ModelNotReady)
async def model_not_ready_handler(request: Request, exc: ModelNotReady) -> JSONResponse:
    logger.error("ModelNotReady on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={"error": "The model isn't ready yet. Run the training scripts."},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled %s on %s %s: %s",
        type(exc).__name__,
        request.method,
        request.url.path,
        exc,
    )
    return JSONResponse(
        status_code=500,
        content={"error": "Something went wrong. Please try again."},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Return 400 (not 422) for request validation failures (BE2-J)."""
    return JSONResponse(
        status_code=400,
        content={"error": "Some fields are invalid."},
    )


# ---------------------------------------------------------------------------
# Middleware — Cache-Control: no-store on all API responses (BE2-J)
# Skips static asset paths (/assets, /model, /static, /favicon).
# ---------------------------------------------------------------------------
_STATIC_PREFIXES = ("/assets/", "/model/", "/static/", "/favicon")


class NoCacheAPIMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if not any(path.startswith(p) for p in _STATIC_PREFIXES):
            response.headers["Cache-Control"] = "no-store"
        return response


app.add_middleware(NoCacheAPIMiddleware)


_DIST_DIR = ROOT / "frontend" / "dist"
_INDEX_HTML = _DIST_DIR / "index.html"


# ---------------------------------------------------------------------------
# 404 handler — return JSON for known API prefixes, HTML otherwise (BE2-J)
# ---------------------------------------------------------------------------
from starlette.exceptions import HTTPException as StarletteHTTPException


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse | HTMLResponse:
    if exc.status_code == 404 and any(request.url.path.startswith(p) for p in _API_PREFIXES):
        return JSONResponse(status_code=404, content={"error": "Not found"})
    # Re-raise as JSON for all other HTTP errors on API paths
    if any(request.url.path.startswith(p) for p in _API_PREFIXES):
        return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})
    # For frontend SPA routes, serve index.html when dist exists
    if exc.status_code == 404 and _INDEX_HTML.exists() and not request.url.path.startswith(("/assets/", "/icons/")):
        return HTMLResponse(content=_INDEX_HTML.read_text(encoding="utf-8"))
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get(
    "/health",
    summary="Backend health check",
    response_description="Status, component availability, active model version, and config.",
    tags=["system"],
)
async def health() -> JSONResponse:
    """Returns component availability flags, active model version, and configuration."""
    try:
        from backend.pipeline.ocr import get_ocr
        _state.components["ocr"] = bool(get_ocr().ready)
    except Exception:
        _state.components.setdefault("ocr", False)

    all_core_ready = all(
        _state.components.get(k, False)
        for k in ("text_model", "rules")
    )
    status = "ok" if all_core_ready else "degraded"

    # Build a typed component dict per FIX 1 contract:
    # - translator: STRING "not_loaded" | "loaded" (never a bool)
    # - translator_engine: null (translator not yet integrated)
    # - ocr: boolean
    components_out = {
        "text_model": bool(_state.components.get("text_model", False)),
        "url_model": bool(_state.components.get("url_model", False)),
        "rules": bool(_state.components.get("rules", False)),
        "ocr": bool(_state.components.get("ocr", False)),
        "translator": "not_loaded",
        "translator_engine": None,
        "llm_gemini": bool(_state.components.get("llm_gemini", False)),
        "llm_groq": bool(_state.components.get("llm_groq", False)),
    }

    return JSONResponse(
        content={
            "status": status,
            "api_version": 2,
            "components": components_out,
            "model_version": _state.active_version,
            "config": config_summary(),
        }
    )


# FIX 2 — GET /languages
_LANGUAGES = [
    {"code": "en", "name": "English", "native_name": "English", "reviewed": True, "beta": False},
    {"code": "hi", "name": "Hindi", "native_name": "हिन्दी", "reviewed": True, "beta": False},
]


@app.get(
    "/languages",
    summary="Supported language list",
    tags=["system"],
)
async def languages() -> JSONResponse:
    """Return the list of languages supported by the analysis and templates."""
    return JSONResponse(content={
        "languages": _LANGUAGES,
        "translator": "not_loaded",
        "translator_engine": None,
    })



@app.post(
    "/analyze",
    summary="Analyze SMS, link or screenshot for scam indicators",
    response_model=AnalyzeResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad input or unreadable data"},
        503: {"model": ErrorResponse, "description": "Core model not ready"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["analysis"],
)
async def analyze_endpoint(request: Request) -> AnalyzeResponse:
    """
    Main analysis endpoint conforming to FR1 specification.
    Accepts both multipart/form-data and application/json.
    """
    content_type = request.headers.get("content-type", "").lower()
    text = None
    url = None
    lang: Literal["en", "hi", "both"] = "both"
    image_bytes = None

    if content_type.startswith("application/json"):
        try:
            body = await request.json()
        except Exception:
            raise BadInput("Invalid JSON payload.")
        if not isinstance(body, dict):
            raise BadInput("JSON body must be an object.")
        text = body.get("text")
        url = body.get("url")
        lang_val = body.get("lang", "both")
        if lang_val in ("en", "hi", "both"):
            lang = lang_val

    elif (
        content_type.startswith("multipart/form-data")
        or content_type.startswith("application/x-www-form-urlencoded")
    ):
        try:
            form = await request.form()
        except Exception:
            raise BadInput("Invalid form-data payload.")

        text = form.get("text")
        url = form.get("url")
        lang_val = form.get("lang", "both")
        if lang_val in ("en", "hi", "both"):
            lang = lang_val

        image_val = form.get("image")
        if image_val is not None:
            if hasattr(image_val, "read"):
                image_bytes = await image_val.read()
            elif isinstance(image_val, (bytes, bytearray)):
                image_bytes = bytes(image_val)
            if image_bytes and len(image_bytes) > MAX_IMAGE_BYTES:
                raise BadInput(
                    f"Image file is too large. Maximum size is {MAX_IMAGE_BYTES // (1024 * 1024)} MB."
                )

    else:
        # Fallback inspection
        try:
            body = await request.json()
            if isinstance(body, dict):
                text = body.get("text")
                url = body.get("url")
                lang_val = body.get("lang", "both")
                if lang_val in ("en", "hi", "both"):
                    lang = lang_val
        except Exception:
            pass

    return analyze(
        text=text,
        url=url,
        image_bytes=image_bytes,
        lang=lang,
    )


@app.get(
    "/mock/analyze",
    summary="Mock analyze response (frontend development only)",
    response_model=AnalyzeResponse,
    tags=["development"],
)
async def mock_analyze() -> AnalyzeResponse:
    """Returns canonical FR1 example for frontend development."""
    return AnalyzeResponse.example()


@app.post(
    "/report",
    summary="Submit user feedback or false positive/negative report",
    response_model=ReportResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error or bad input"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
    },
    tags=["feedback"],
)
async def report_endpoint(req: ReportRequest) -> ReportResponse | JSONResponse:
    """
    Record user feedback / reports (PRD FR10.1).
    Enforces rate limiting (20/min per process). Never logs report text or user inputs.
    """
    now = time.monotonic()
    with _report_rate_lock:
        while _report_timestamps and _report_timestamps[0] <= now - 60.0:
            _report_timestamps.popleft()
        if len(_report_timestamps) >= REPORT_RATE_LIMIT_PER_MIN:
            return JSONResponse(
                status_code=429,
                content={"error": "Too many reports right now. Please try again in a minute."},
            )
        _report_timestamps.append(now)

    # Truncate text to max 2000 characters (PRD NFR / spec)
    safe_text = (req.text or "")[:2000]

    # Store report with status='pending'; never log the text (NFR4)
    add_report(
        text=safe_text,
        urls=req.urls,
        user_label=req.user_label,
        predicted_level=req.predicted_level,
        predicted_score=req.predicted_score,
        model_version=req.model_version,
        status="pending",
    )

    return ReportResponse(status="received")


# ---------------------------------------------------------------------------
# Scam Radar (PRD FR15)
# Aggregated, anonymised trend data. Entity storage uses masked display only.
# Responses cached for 60 seconds.
# ---------------------------------------------------------------------------
_radar_cache: dict[str, Any] = {"timestamp": 0.0, "data": None}
_radar_cache_lock = threading.Lock()


def _mask_phone(phone: str) -> str:
    """Mask phone: first 2 digits + 'XX XXX' + last 3 digits."""
    digits = re.sub(r"\D", "", phone)
    if len(digits) >= 5:
        return f"{digits[:2]}XX XXX {digits[-3:]}"
    return "98XX XXX 234"


def _mask_upi(upi: str) -> str:
    """Mask UPI: first 4 chars + '****' + domain."""
    if "@" in upi:
        prefix, domain = upi.split("@", 1)
        lead = prefix[:4]
        return f"{lead}****@{domain}"
    lead = upi[:4]
    return f"{lead}****"


def _compute_radar_data() -> dict[str, Any]:
    iso_now = datetime.now(timezone.utc).isoformat()
    rows = []
    try:
        from backend.feedback.store import _get_connection
        conn = _get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, text, urls, user_label, category, duplicate_count, created_at "
                "FROM reports WHERE status = 'approved'"
            )
            rows = cursor.fetchall()
        finally:
            conn.close()
    except Exception:
        rows = []

    if len(rows) < 5:
        # Default mock data when fewer than 5 approved reports exist
        return {
            "updated_at": iso_now,
            "top_categories": [
                {"category": "kyc_scam", "count": 42, "trend": "up"},
                {"category": "payment_scam", "count": 31, "trend": "stable"},
                {"category": "job_scam", "count": 19, "trend": "down"},
                {"category": "lottery_scam", "count": 12, "trend": "down"},
                {"category": "phishing", "count": 10, "trend": "up"},
            ],
            "recent_entities": [
                {"type": "phone", "masked": "98XX XXX 234", "category": "kyc_scam", "seen": 3},
                {"type": "upi", "masked": "refe****@ybl", "category": "payment_scam", "seen": 5},
                {"type": "phone", "masked": "91XX XXX 889", "category": "job_scam", "seen": 2},
            ],
            "total_reports": 183,
            "active_hours": {"peak_hour": 14, "timezone": "IST"},
            # Extra fields ensuring compatibility with radar.schema.json
            "demo": True,
            "generated_at": iso_now,
            "top_scam_categories": [
                {"category": "kyc_scam", "count": 42},
                {"category": "payment_scam", "count": 31},
            ],
            "top_entities": [
                {"type": "phone", "value": "98XX XXX 234", "reports": 3},
                {"type": "upi_id", "value": "refe****@ybl", "reports": 5},
            ],
        }

    # Aggregate approved reports
    cat_counts = Counter()
    entities_list = []
    total = 0
    from backend.pipeline.entities import extract_entities
    from backend.pipeline.preprocess import extract_urls

    for r in rows:
        cat = r["category"] or "other"
        dup = r["duplicate_count"] or 1
        cat_counts[cat] += dup
        total += dup

        raw_text = r["text"] or ""
        urls = extract_urls(raw_text)
        ents = extract_entities(raw_text, urls)
        for p in ents.get("phones", []):
            entities_list.append({"type": "phone", "masked": _mask_phone(p), "category": cat, "seen": dup})
        for u in ents.get("upi_ids", []):
            entities_list.append({"type": "upi", "masked": _mask_upi(u), "category": cat, "seen": dup})

    top_cats = [
        {"category": c, "count": count, "trend": "stable"}
        for c, count in cat_counts.most_common(5)
    ]

    return {
        "updated_at": iso_now,
        "top_categories": top_cats if top_cats else [{"category": "other", "count": total, "trend": "stable"}],
        "recent_entities": entities_list[:10],
        "total_reports": total,
        "active_hours": {"peak_hour": 14, "timezone": "IST"},
        "demo": False,
        "generated_at": iso_now,
        "top_scam_categories": [{"category": c["category"], "count": c["count"]} for c in top_cats],
        "top_entities": [{"type": e["type"], "value": e["masked"], "reports": e["seen"]} for e in entities_list[:5]],
    }


@app.get(
    "/radar",
    summary="Scam Radar community trend data",
    tags=["system"],
)
async def radar_endpoint() -> JSONResponse:
    """Returns anonymized, aggregated radar trend data (cached for 60 seconds)."""
    now = time.monotonic()
    with _radar_cache_lock:
        if _radar_cache["data"] is not None and (now - _radar_cache["timestamp"] < 60.0):
            return JSONResponse(content=_radar_cache["data"])

        data = _compute_radar_data()
        _radar_cache["timestamp"] = now
        _radar_cache["data"] = data
        return JSONResponse(content=data)




# ---------------------------------------------------------------------------
# Admin — Authentication & Report management (PRD 16.14, FR10.1)
# ---------------------------------------------------------------------------

def _is_admin_authorized(request: Request) -> tuple[bool, int, str]:
    expected = os.getenv("ADMIN_TOKEN") or ADMIN_TOKEN
    if not expected:
        return False, 503, "Admin is turned off on this server."
    token = request.headers.get("x-admin-token") or request.headers.get("admin-token")
    if not token or token.strip() != expected.strip():
        return False, 401, "That token isn't right."
    return True, 200, "OK"


@app.get(
    "/admin/ping",
    summary="Verify admin token (PRD 16.14)",
    tags=["admin"],
)
async def admin_ping(request: Request) -> JSONResponse:
    """Verify admin token. Returns 200 on match, 401 on wrong token, 503 if ADMIN_TOKEN is unset."""
    ok, status_code, msg = _is_admin_authorized(request)
    if not ok:
        return JSONResponse(status_code=status_code, content={"error": msg})
    return JSONResponse(content={"ok": True})


@app.get(
    "/admin/reports",
    summary="List submitted user reports",
    tags=["admin"],
)
async def admin_list_reports(status: str = "pending") -> JSONResponse:
    """Return reports filtered by status: pending | approved | rejected | all."""
    rows = list_reports(status=None if status == "all" else status)
    # Trim full text for list view — never expose raw user text verbatim (NFR4)
    safe = []
    for r in rows:
        safe.append({
            "id": r["id"],
            "text_summary": (r.get("text") or "")[:120],
            "verdict": r.get("predicted_level") or "unknown",
            "score": r.get("predicted_score") or 0,
            "category": r.get("category") or "uncategorized",
            "user_label": r.get("user_label") or "",
            "status": r.get("status") or "pending",
            "duplicate_count": r.get("duplicate_count") or 1,
            "submitted_at": r.get("created_at") or "",
            "reviewed_at": r.get("reviewed_at") or "",
        })
    return JSONResponse(content=safe)


@app.post(
    "/admin/reports/{report_id}/approve",
    summary="Approve a submitted report",
    tags=["admin"],
)
async def admin_approve_report(report_id: int) -> JSONResponse:
    """Mark a report as approved for use in retraining."""
    updated = set_status(report_id, "approved")
    if updated:
        return JSONResponse(content={"ok": True})
    return JSONResponse(status_code=404, content={"ok": False, "error": "not found"})


@app.post(
    "/admin/reports/{report_id}/reject",
    summary="Reject a submitted report",
    tags=["admin"],
)
async def admin_reject_report(report_id: int) -> JSONResponse:
    """Mark a report as rejected (will not be used in retraining)."""
    updated = set_status(report_id, "rejected")
    if updated:
        return JSONResponse(content={"ok": True})
    return JSONResponse(status_code=404, content={"ok": False, "error": "not found"})


# ---------------------------------------------------------------------------
# Frontend static files — serve the entire dist/ folder
# ---------------------------------------------------------------------------



@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def serve_root() -> HTMLResponse:
    """Serve the React SPA root."""
    if _INDEX_HTML.exists():
        return HTMLResponse(content=_INDEX_HTML.read_text(encoding="utf-8"))
    return HTMLResponse(
        content=(
            "<h2>Frontend not built.</h2>"
            "<p>Run <code>cd frontend &amp;&amp; npm run build</code> "
            "then restart the server.</p>"
        ),
        status_code=503,
    )


# Mount the full dist/ so /assets/index-xxx.js and /assets/index-xxx.css
# are served correctly as real static files.
if _DIST_DIR.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(_DIST_DIR), html=True),
        name="frontend",
    )


if __name__ == "__main__":
    import sys
    import uvicorn
    # Ensure repo root is on sys.path if run directly
    root_str = str(ROOT)
    if root_str not in sys.path:
        sys.path.insert(0, root_str)
    uvicorn.run(app, host="0.0.0.0", port=8000)

