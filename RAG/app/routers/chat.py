"""
app/routers/chat.py
────────────────────
FastAPI router for the main /chat endpoint.

POST /api/v1/chat
    Body:
        query      : str          — user's natural-language question
        station_id : str          — monitoring station identifier
        language   : str = "en"  — response language (en / kn / hi)
        session_id : str | None  — conversation session (generated if omitted)

    Response:
        response   : str          — LLM-generated health advisory
        aqi_context: dict | None  — live AQI snapshot (from Java service)
        sources    : list[str]    — section names of retrieved guideline chunks
        session_id : str          — echo / newly generated session ID
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.clients import java_client
from app.services.context_builder import assemble_context
from app.services.guardrails import (
    check_input,
    check_response_safety,
    get_fallback_response,
)
from app.services.llm_client import generate_response
from app.services.retrieval import get_relevant_guidance
from app.services.population_classifier import classify_population

logger = logging.getLogger(__name__)
router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# In-memory session store  { session_id -> list[{"role":…, "content":…}] }
# Each session keeps the last MAX_TURNS * 2 messages (user + assistant pairs)
# ─────────────────────────────────────────────────────────────────────────────
_SESSIONS: dict[str, list[dict[str, str]]] = {}
MAX_TURNS = 4          # keep last 4 full turns  → 8 messages max per session
SUPPORTED_LANGUAGES = {"en", "kn", "hi"}


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2_000, description="User's health question")
    station_id: str = Field(..., description="Air quality monitoring station ID")
    language: str = Field("en", description="Response language: en, kn (Kannada), hi (Hindi)")
    session_id: str | None = Field(None, description="Session ID for multi-turn conversations")


class ChatResponse(BaseModel):
    response: str
    aqi_context: dict[str, Any] | None = None
    sources: list[str]
    session_id: str


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_session(session_id: str | None) -> str:
    """Return the given session_id or generate a fresh uuid4 one."""
    sid = session_id or str(uuid.uuid4())
    if sid not in _SESSIONS:
        _SESSIONS[sid] = []
    return sid


def _get_history(session_id: str) -> list[dict[str, str]]:
    return _SESSIONS.get(session_id, [])


def _append_turn(session_id: str, user_msg: str, assistant_msg: str) -> None:
    """Append a (user, assistant) turn and trim to MAX_TURNS."""
    history = _SESSIONS.setdefault(session_id, [])
    history.append({"role": "user",      "content": user_msg})
    history.append({"role": "assistant", "content": assistant_msg})
    # Keep only the last MAX_TURNS * 2 messages
    if len(history) > MAX_TURNS * 2:
        _SESSIONS[session_id] = history[-(MAX_TURNS * 2):]


def _extract_aqi_context(reading: dict[str, Any] | None) -> dict[str, Any] | None:
    """Convert a raw reading dict into the response aqi_context shape."""
    if not reading:
        return None
    return {
        "station_id":  reading.get("station_id", ""),
        "aqi":         reading.get("aqi", reading.get("aqi_value")),
        "category":    reading.get("category", reading.get("aqi_category", "")),
        "pm25":        reading.get("pm25"),
        "pm10":        reading.get("pm10"),
        "timestamp":   reading.get("timestamp", ""),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Air quality health advisory chat",
)
async def chat(req: ChatRequest) -> ChatResponse:
    """
    Full RAG pipeline:

    1.  Input guardrail          → block harmful / off-topic queries
    2.  Language validation      → default to 'en' if unsupported
    3.  Session management       → resolve / create session_id
    4.  Station validation       → return 400 if station_id unknown
    5.  Context assembly         → java_client + ai_client + ChromaDB
    6.  Retrieval check          → fallback response if no chunks found
    7.  LLM generation           → Groq with history + language
    8.  Response safety check    → log if diagnosis-language detected
    9.  Session update           → store turn in memory
    10. Latency log              → emit total ms to console
    """
    t_start = time.perf_counter()

    # ── 1. Input guardrail ───────────────────────────────────────────────────
    guard = check_input(req.query)
    if not guard.passed:
        raise HTTPException(status_code=400, detail=guard.reason)

    # ── 2. Language validation ───────────────────────────────────────────────
    language = req.language if req.language in SUPPORTED_LANGUAGES else "en"
    if req.language not in SUPPORTED_LANGUAGES:
        logger.warning("[chat] Unsupported language '%s', falling back to 'en'", req.language)

    # ── 3. Session management ────────────────────────────────────────────────
    session_id = _resolve_session(req.session_id)
    history    = _get_history(session_id)

    # ── 4. Station validation ────────────────────────────────────────────────
    # Quick probe: try to fetch the latest reading.
    # If the Java service is offline we allow it through (graceful degradation).
    # But if the service IS online and the station is explicitly unknown (404),
    # return a clear error so the user can correct their station_id.
    reading: dict[str, Any] | None = java_client.get_latest_reading(req.station_id)

    # java_client returns None both on service-down AND on bad station_id.
    # We detect the bad-station case by checking: service is reachable but returned nothing.
    # Since we can't distinguish without a separate /stations call in a 3s window,
    # we do a soft check: if stations list is available, validate against it.
    stations = java_client.get_stations()
    if stations is not None:
        # Service is up — validate station_id
        known_ids = {str(s.get("station_id", "")) for s in stations}
        if req.station_id not in known_ids:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Station '{req.station_id}' was not found. "
                    f"Available stations: {', '.join(sorted(known_ids)) or 'none returned'}. "
                    "Please provide a valid station_id."
                ),
            )

    # ── 5. Context assembly ──────────────────────────────────────────────────
    context = assemble_context(query=req.query, station_id=req.station_id)

    # ── 6. Retrieve chunks to get source section names + detect no-match ─────
    current_aqi: int = 0
    if reading:
        current_aqi = int(reading.get("aqi", reading.get("aqi_value", 0)))

    population = classify_population(req.query)
    effective_aqi = current_aqi if current_aqi > 0 else 100   # fallback for offline Java

    chunks = get_relevant_guidance(
        query=req.query,
        current_aqi=effective_aqi,
        population=population,
        n_results=3,
    )

    sources: list[str] = [c.section for c in chunks]

    if not chunks:
        fallback = get_fallback_response(current_aqi if current_aqi > 0 else None)
        _append_turn(session_id, req.query, fallback)
        t_ms = (time.perf_counter() - t_start) * 1000
        logger.info("[chat] session=%s | FALLBACK | %.0fms", session_id, t_ms)
        return ChatResponse(
            response=fallback,
            aqi_context=_extract_aqi_context(reading),
            sources=[],
            session_id=session_id,
        )

    # ── 7. LLM generation ────────────────────────────────────────────────────
    try:
        answer = generate_response(
            query=req.query,
            context=context,
            language=language,
            conversation_history=history if history else None,
        )
    except EnvironmentError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("[chat] LLM call failed: %s", exc)
        raise HTTPException(status_code=502, detail="LLM service is temporarily unavailable.")

    # ── 8. Response safety check ─────────────────────────────────────────────
    is_safe = check_response_safety(answer)
    if not is_safe:
        # Append a soft disclaimer rather than blocking — log already written
        answer += (
            "\n\n⚠ Note: For specific medical diagnoses or medication advice, "
            "please consult a qualified doctor."
        )

    # ── 9. Session update ────────────────────────────────────────────────────
    _append_turn(session_id, req.query, answer)

    # ── 10. Latency log ──────────────────────────────────────────────────────
    t_ms = (time.perf_counter() - t_start) * 1000
    logger.info(
        "[chat] session=%s | lang=%s | aqi=%s | population=%s | chunks=%d | %.0fms",
        session_id, language, current_aqi or "N/A", population, len(chunks), t_ms,
    )

    return ChatResponse(
        response=answer,
        aqi_context=_extract_aqi_context(reading),
        sources=sources,
        session_id=session_id,
    )
