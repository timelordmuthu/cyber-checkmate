"""backend/feedback/store.py

SQLite feedback and report store for CyberCheckmate per PRD FR10.1 and Section 16.12.

Stores user-reported false positives / false negatives and admin variants.
Used for adaptive learning and retraining.

Privacy constraint (NFR4):
- Stores message text and analysis metadata only.
- Never stores user identifiers, personal identities, IP addresses, or images.
- Write operations protected by a module-level threading.Lock.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

import backend.config
from backend.config import FEEDBACK_DB

# Module-level lock protecting all write operations
_WRITE_LOCK = threading.Lock()


def _get_connection(db_path: Path | None = None) -> sqlite3.Connection:
    """Return a new SQLite connection with row factory enabled."""
    target = Path(db_path or getattr(backend.config, "FEEDBACK_DB", FEEDBACK_DB))
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path | None = None) -> None:
    """Create feedback database tables if they do not exist."""
    with _WRITE_LOCK:
        conn = _get_connection(db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    urls TEXT,
                    user_label TEXT NOT NULL,
                    predicted_level TEXT,
                    predicted_score INTEGER,
                    model_version TEXT,
                    status TEXT DEFAULT 'pending',
                    category TEXT,
                    template_id TEXT,
                    duplicate_count INTEGER DEFAULT 1,
                    created_at TEXT,
                    reviewed_at TEXT
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS variants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    report_id INTEGER,
                    text TEXT NOT NULL,
                    label TEXT NOT NULL,
                    template_id TEXT,
                    created_at TEXT,
                    FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
                )
                """
            )
            conn.commit()
        finally:
            conn.close()


def _normalise_text(text: str) -> str:
    """Lowercase and collapse whitespace for duplicate detection."""
    return " ".join(text.strip().lower().split())


def add_report(
    text: str,
    urls: list[str] | str | None,
    user_label: str,
    predicted_level: str | None = None,
    predicted_score: int | None = None,
    model_version: str | None = None,
    status: str = "pending",
    category: str | None = None,
    template_id: str | None = None,
    db_path: Path | None = None,
) -> int:
    """Add a report or increment duplicate_count if exact normalised text exists.

    Returns the report ID (new or existing).
    """
    init_db(db_path)
    norm_text = _normalise_text(text)

    with _WRITE_LOCK:
        conn = _get_connection(db_path)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, text, duplicate_count FROM reports")
            for row in cursor.fetchall():
                if _normalise_text(row["text"]) == norm_text:
                    existing_id = row["id"]
                    cursor.execute(
                        "UPDATE reports SET duplicate_count = duplicate_count + 1 WHERE id = ?",
                        (existing_id,),
                    )
                    conn.commit()
                    return existing_id

            now_iso = datetime.now(timezone.utc).isoformat()
            urls_val = json.dumps(urls if isinstance(urls, list) else ([urls] if urls else []))
            cursor.execute(
                """
                INSERT INTO reports (
                    text, urls, user_label, predicted_level, predicted_score,
                    model_version, status, category, template_id, duplicate_count,
                    created_at, reviewed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NULL)
                """,
                (
                    text,
                    urls_val,
                    user_label,
                    predicted_level,
                    predicted_score,
                    model_version,
                    status,
                    category,
                    template_id,
                    now_iso,
                ),
            )
            new_id = cursor.lastrowid
            conn.commit()
            return new_id
        finally:
            conn.close()


def list_reports(
    status: str | None = None,
    db_path: Path | None = None,
) -> list[dict[str, Any]]:
    """List reports, optionally filtered by status ('pending', 'approved', 'rejected')."""
    init_db(db_path)
    conn = _get_connection(db_path)
    try:
        cursor = conn.cursor()
        if status is not None:
            cursor.execute(
                "SELECT * FROM reports WHERE status = ? ORDER BY id DESC",
                (status,),
            )
        else:
            cursor.execute("SELECT * FROM reports ORDER BY id DESC")
        rows = cursor.fetchall()
        results: list[dict[str, Any]] = []
        for r in rows:
            d = dict(r)
            if isinstance(d.get("urls"), str):
                try:
                    d["urls"] = json.loads(d["urls"])
                except Exception:
                    pass
            results.append(d)
        return results
    finally:
        conn.close()


def get_report(id: int, db_path: Path | None = None) -> dict[str, Any] | None:
    """Retrieve a single report by ID."""
    init_db(db_path)
    conn = _get_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reports WHERE id = ?", (id,))
        row = cursor.fetchone()
        if row is None:
            return None
        d = dict(row)
        if isinstance(d.get("urls"), str):
            try:
                d["urls"] = json.loads(d["urls"])
            except Exception:
                pass
        return d
    finally:
        conn.close()


def set_status(
    id: int,
    status: str,
    final_label: str | None = None,
    category: str | None = None,
    template_id: str | None = None,
    db_path: Path | None = None,
) -> bool:
    """Update report review status, label, category, and template_id."""
    init_db(db_path)
    with _WRITE_LOCK:
        conn = _get_connection(db_path)
        try:
            cursor = conn.cursor()
            now_iso = datetime.now(timezone.utc).isoformat()
            updates = ["status = ?", "reviewed_at = ?"]
            params: list[Any] = [status, now_iso]

            if final_label is not None:
                updates.append("user_label = ?")
                params.append(final_label)
            if category is not None:
                updates.append("category = ?")
                params.append(category)
            if template_id is not None:
                updates.append("template_id = ?")
                params.append(template_id)

            params.append(id)
            query = f"UPDATE reports SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


def add_variants(
    report_id: int,
    texts: list[str],
    label: str,
    template_id: str | None = None,
    db_path: Path | None = None,
) -> list[int]:
    """Add synthetic/admin variants for a report for retraining."""
    init_db(db_path)
    with _WRITE_LOCK:
        conn = _get_connection(db_path)
        try:
            cursor = conn.cursor()
            now_iso = datetime.now(timezone.utc).isoformat()
            created_ids: list[int] = []
            for t in texts:
                cursor.execute(
                    """
                    INSERT INTO variants (report_id, text, label, template_id, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (report_id, t, label, template_id, now_iso),
                )
                created_ids.append(cursor.lastrowid)
            conn.commit()
            return created_ids
        finally:
            conn.close()


def list_variants(
    report_id: int | None = None,
    db_path: Path | None = None,
) -> list[dict[str, Any]]:
    """List variants, optionally filtered by report_id."""
    init_db(db_path)
    conn = _get_connection(db_path)
    try:
        cursor = conn.cursor()
        if report_id is not None:
            cursor.execute(
                "SELECT * FROM variants WHERE report_id = ? ORDER BY id ASC",
                (report_id,),
            )
        else:
            cursor.execute("SELECT * FROM variants ORDER BY id ASC")
        return [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()


def delete_variant(id: int, db_path: Path | None = None) -> bool:
    """Delete a variant by ID."""
    init_db(db_path)
    with _WRITE_LOCK:
        conn = _get_connection(db_path)
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM variants WHERE id = ?", (id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


def approved_training_rows(db_path: Path | None = None) -> pd.DataFrame:
    """Return approved reports and their variants as a pandas DataFrame.

    Returns DataFrame with columns: ['text', 'label', 'template_id', 'source'].
    """
    init_db(db_path)
    conn = _get_connection(db_path)
    try:
        cursor = conn.cursor()
        # 1. Approved reports
        cursor.execute(
            """
            SELECT id, text, user_label AS label, template_id
            FROM reports
            WHERE status = 'approved'
            """
        )
        reports = cursor.fetchall()

        # 2. Variants of approved reports
        cursor.execute(
            """
            SELECT v.text, v.label, v.template_id
            FROM variants v
            WHERE v.report_id IN (SELECT id FROM reports WHERE status = 'approved')
            """
        )
        variants = cursor.fetchall()

        rows: list[dict[str, Any]] = []
        for r in reports:
            rows.append({
                "text": r["text"],
                "label": r["label"],
                "template_id": r["template_id"] or f"feedback_{r['id']}",
                "source": "feedback",
            })
        for v in variants:
            rows.append({
                "text": v["text"],
                "label": v["label"],
                "template_id": v["template_id"] or "",
                "source": "feedback_variant",
            })

        return pd.DataFrame(rows, columns=["text", "label", "template_id", "source"])
    finally:
        conn.close()
