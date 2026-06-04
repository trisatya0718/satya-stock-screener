"""Endpoint refresh data: jalankan di thread latar agar request tidak menggantung."""
from __future__ import annotations

import threading

from fastapi import APIRouter

from app.data import cache, refresh as refresh_mod

router = APIRouter(prefix="/api", tags=["refresh"])

_state = {"running": False, "last_result": None}
_lock = threading.Lock()


def _run():
    try:
        result = refresh_mod.refresh_all()
        _state["last_result"] = result
    finally:
        with _lock:
            _state["running"] = False


@router.post("/refresh")
def trigger_refresh():
    with _lock:
        if _state["running"]:
            return {"status": "already_running"}
        _state["running"] = True
    threading.Thread(target=_run, daemon=True).start()
    return {"status": "started"}


@router.get("/refresh/status")
def refresh_status():
    return {
        "running": _state["running"],
        "last_refresh": cache.get_meta("last_refresh"),
        "cached_emiten": cache.count_emiten(),
        "last_result": _state["last_result"],
    }
