"""
app/clients/ai_client.py
─────────────────────────
HTTP client for the AI forecasting / attribution service (Teammate B).

Base URL is read from env var AI_SERVICE_URL (default: http://localhost:8001).
All calls use a 3-second timeout and return None on any failure so the RAG
pipeline can degrade gracefully without crashing.

Public API
──────────
    get_forecast(station_id)    -> dict | None
    get_attribution(station_id) -> dict | None
"""

from __future__ import annotations

import logging
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)

_BASE_URL: str = os.getenv("AI_SERVICE_URL", "http://localhost:8001").rstrip("/")
_TIMEOUT: int = 3  # seconds


# ─────────────────────────────────────────────────────────────────────────────
# Internal helper
# ─────────────────────────────────────────────────────────────────────────────

def _get(path: str, params: dict[str, Any] | None = None) -> Any | None:
    """
    Perform a GET request against the AI forecasting service.

    Returns the parsed JSON body on success, or None on any error.
    """
    url = f"{_BASE_URL}{path}"
    try:
        resp = requests.get(url, params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        logger.warning("[ai_client] Cannot reach AI service at %s", _BASE_URL)
    except requests.exceptions.Timeout:
        logger.warning("[ai_client] Request to %s timed out after %ds", url, _TIMEOUT)
    except requests.exceptions.HTTPError as exc:
        logger.warning("[ai_client] HTTP %s from %s: %s", exc.response.status_code, url, exc)
    except Exception as exc:
        logger.warning("[ai_client] Unexpected error calling %s: %s", url, exc)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_forecast(station_id: str) -> dict[str, Any] | None:
    """
    GET /forecast/{station_id}

    Returns a Prophet-based AQI forecast for the next N hours, e.g.:
        {
            "station_id": "DEL-001",
            "horizon_hours": 24,
            "forecast": [
                {"hour": 1,  "aqi": 148, "trend": "rising"},
                {"hour": 6,  "aqi": 162, "trend": "rising"},
                {"hour": 24, "aqi": 135, "trend": "falling"}
            ],
            "summary": "AQI expected to peak in the next 6h then ease overnight."
        }
    Returns None if the AI service is unreachable or returns an error.
    """
    data = _get(f"/forecast/{station_id}")
    if data is None:
        logger.warning(
            "[ai_client] get_forecast: no forecast data for station '%s'", station_id
        )
    return data


def get_attribution(station_id: str) -> dict[str, Any] | None:
    """
    GET /attribution/{station_id}

    Returns rule-based pollution source attribution for the station, e.g.:
        {
            "station_id": "DEL-001",
            "dominant_source": "vehicular",
            "sources": {
                "vehicular": 0.42,
                "industrial": 0.31,
                "biomass_burning": 0.18,
                "dust": 0.09
            },
            "confidence": "medium",
            "notes": "High PM2.5/PM10 ratio suggests vehicular + industrial mix."
        }
    Returns None if the AI service is unreachable or returns an error.
    """
    data = _get(f"/attribution/{station_id}")
    if data is None:
        logger.warning(
            "[ai_client] get_attribution: no attribution data for station '%s'", station_id
        )
    return data
