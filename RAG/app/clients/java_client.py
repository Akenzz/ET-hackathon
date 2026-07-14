"""
app/clients/java_client.py
───────────────────────────
HTTP client for the Java data service.

Base URL is read from env var JAVA_SERVICE_URL (default: http://localhost:8000).
All calls use a 3-second timeout and return None on any failure so the RAG
pipeline can degrade gracefully without crashing.

Public API
──────────
    get_latest_reading(station_id) -> dict | None
    get_weather(lat, lon)          -> dict | None
    get_stations()                 -> list | None
    log_chat_session(data)         -> bool
"""

from __future__ import annotations

import logging
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)

_BASE_URL: str = os.getenv("JAVA_SERVICE_URL", "http://localhost:8000").rstrip("/")
_TIMEOUT: int = 3  # seconds — keep the RAG pipeline snappy


# ─────────────────────────────────────────────────────────────────────────────
# Internal helper
# ─────────────────────────────────────────────────────────────────────────────

def _get(path: str, params: dict[str, Any] | None = None) -> Any | None:
    """
    Perform a GET request against the Java data service.

    Returns the parsed JSON body on success, or None on any error (connection
    refused, timeout, non-2xx status, bad JSON).
    """
    url = f"{_BASE_URL}{path}"
    try:
        resp = requests.get(url, params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        logger.warning("[java_client] Cannot reach Java data service at %s", _BASE_URL)
    except requests.exceptions.Timeout:
        logger.warning("[java_client] Request to %s timed out after %ds", url, _TIMEOUT)
    except requests.exceptions.HTTPError as exc:
        logger.warning("[java_client] HTTP %s from %s: %s", exc.response.status_code, url, exc)
    except Exception as exc:
        logger.warning("[java_client] Unexpected error calling %s: %s", url, exc)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_latest_reading(station_id: str) -> dict[str, Any] | None:
    """
    GET /readings/latest?station_id=<station_id>

    Returns the latest AQI sensor reading for the given station, e.g.:
        {
            "station_id": "DEL-001",
            "aqi": 142,
            "pm25": 58.3,
            "pm10": 95.1,
            "timestamp": "2026-07-14T07:30:00Z",
            "category": "Poor"
        }
    Returns None if the service is unreachable or returns an error.
    """
    data = _get("/readings/latest", params={"station_id": station_id})
    if data is None:
        logger.warning(
            "[java_client] get_latest_reading: no data for station '%s'", station_id
        )
    return data


def get_weather(lat: float, lon: float) -> dict[str, Any] | None:
    """
    GET /weather/latest?lat=<lat>&lon=<lon>

    Returns current weather metadata for the given coordinates, e.g.:
        {
            "temperature_c": 32.1,
            "humidity_pct": 65,
            "wind_speed_kmh": 12.4,
            "wind_direction": "SW",
            "conditions": "Partly cloudy"
        }
    Returns None if the service is unreachable or returns an error.
    """
    data = _get("/weather/latest", params={"lat": lat, "lon": lon})
    if data is None:
        logger.warning(
            "[java_client] get_weather: no data for lat=%s lon=%s", lat, lon
        )
    return data


def get_stations() -> list[dict[str, Any]] | None:
    """
    GET /stations

    Returns a list of all monitoring stations, e.g.:
        [
            {"station_id": "DEL-001", "name": "Anand Vihar", "lat": 28.65, "lon": 77.32},
            ...
        ]
    Returns None if the service is unreachable or returns an error.
    """
    data = _get("/stations")
    if data is None:
        logger.warning("[java_client] get_stations: failed to fetch station list")
    return data


def log_chat_session(session_data: dict[str, Any]) -> bool:
    """
    POST a chat session payload back to the Java service for audit / analytics.

    Returns True on success, False on any failure.
    """
    url = f"{_BASE_URL}/api/chat/log"
    try:
        resp = requests.post(url, json=session_data, timeout=_TIMEOUT)
        resp.raise_for_status()
        return True
    except Exception as exc:
        logger.warning("[java_client] log_chat_session failed: %s", exc)
        return False
