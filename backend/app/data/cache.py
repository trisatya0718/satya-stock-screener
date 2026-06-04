"""Cache SQLite sederhana: simpan snapshot data per emiten sebagai JSON blob.

Tabel:
  emiten_cache(code TEXT PK, payload TEXT, updated_at TEXT)
  meta(key TEXT PK, value TEXT)         -- mis. last_refresh
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

from app.core.config import CACHE_DB


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(CACHE_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS emiten_cache ("
            "code TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL)"
        )
        conn.execute(
            "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)"
        )
        conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def put_emiten(code: str, payload: dict[str, Any]) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO emiten_cache(code, payload, updated_at) VALUES(?,?,?) "
            "ON CONFLICT(code) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
            (code.upper(), json.dumps(payload), _now()),
        )
        conn.commit()


def get_emiten(code: str) -> dict[str, Any] | None:
    with _conn() as conn:
        row = conn.execute(
            "SELECT payload, updated_at FROM emiten_cache WHERE code=?", (code.upper(),)
        ).fetchone()
    if not row:
        return None
    data = json.loads(row["payload"])
    data["_updated_at"] = row["updated_at"]
    return data


def get_all_emiten() -> list[dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT code, payload, updated_at FROM emiten_cache"
        ).fetchall()
    out = []
    for row in rows:
        data = json.loads(row["payload"])
        data["_updated_at"] = row["updated_at"]
        out.append(data)
    return out


def count_emiten() -> int:
    with _conn() as conn:
        return conn.execute("SELECT COUNT(*) AS c FROM emiten_cache").fetchone()["c"]


def set_meta(key: str, value: str) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO meta(key, value) VALUES(?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )
        conn.commit()


def get_meta(key: str) -> str | None:
    with _conn() as conn:
        row = conn.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
    return row["value"] if row else None
