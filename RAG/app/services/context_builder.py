"""
app/services/context_builder.py
────────────────────────────────
Assembles a single, clearly-labelled context string from all upstream
data sources and the ChromaDB knowledge base.

Public API
──────────
    assemble_context(query, station_id) -> str
    build_context(chunks, max_tokens)   -> str   (legacy helper for the chat router)

Field-mapping notes (as of 2026-07-14)
──────────────────────────────────────
Java /readings/latest  → { stationId, aqi, timestamp, pollutants:{pm25,pm10,…} }
  • No "category" field  → derived here via _aqi_to_category(aqi)
  • Station label        → stationId (not station_id / station / name)

AI /forecast/{id}      → { stationId, stationName, forecast:[{ts, aqi_predicted,
                           confidence_low, confidence_high, category}, …] }
  • NOT {hour, aqi, trend} — old expected shape was wrong

AI /attribution/{id}   → { stationId, stationName, timestamp, currentAQI,
                           likelySource, confidence, contributingFactors }
  • NOT {dominant_source, sources:{…}} — old expected shape was wrong
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.clients import ai_client, java_client
from app.services.population_classifier import classify_population
from app.services.retrieval import GuidanceChunk, get_relevant_guidance

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# AQI → category (CPCB scale) — Java DTO has no category field
# ─────────────────────────────────────────────────────────────────────────────

def _aqi_to_category(aqi: int | float | None) -> str:
    if aqi is None:
        return "N/A"
    aqi = float(aqi)
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Satisfactory"
    if aqi <= 200:
        return "Moderate"
    if aqi <= 300:
        return "Poor"
    if aqi <= 400:
        return "Very Poor"
    return "Severe"


# ─────────────────────────────────────────────────────────────────────────────
# Internal formatting helpers
# ─────────────────────────────────────────────────────────────────────────────

_SEP = "─" * 60


def _section(title: str, body: str) -> str:
    return f"{_SEP}\n### {title}\n{body.strip()}\n"


def _fmt_reading(reading: dict[str, Any]) -> str:
    """
    Java LatestReadingResponseDto shape:
        { stationId, aqi, timestamp, pollutants: { pm25, pm10, no2, so2, co, o3 } }
    """
    aqi      = reading.get("aqi")
    category = _aqi_to_category(aqi)           # derived — no category field in Java DTO
    pollutants: dict[str, Any] = reading.get("pollutants") or {}
    pm25     = pollutants.get("pm25", "N/A")
    pm10     = pollutants.get("pm10", "N/A")
    ts       = reading.get("timestamp", "N/A")
    # Use stationId as the label (Java has no "name" on the reading DTO)
    station  = reading.get("stationId") or reading.get("station_id") or "N/A"

    return (
        f"Station   : {station}\n"
        f"AQI       : {aqi}  ({category})\n"
        f"PM2.5     : {pm25} µg/m³\n"
        f"PM10      : {pm10} µg/m³\n"
        f"Recorded  : {ts}"
    )


def _fmt_forecast(forecast_data: dict[str, Any]) -> str:
    """
    AI /forecast/{id} response shape:
        {
          "stationId":   "2553",
          "stationName": "...",
          "forecast": [
            { "ts": "2026-07-14T18:00:00", "aqi_predicted": 251.3,
              "confidence_low": 242.0, "confidence_high": 260.6,
              "category": "Poor" },
            …
          ]
        }
    """
    station_name = forecast_data.get("stationName", "")
    points: list[dict] = forecast_data.get("forecast", [])

    if not points:
        return "No forecast details available."

    lines: list[str] = []
    if station_name:
        lines.append(f"Station: {station_name}")

    for pt in points[:4]:          # show up to 4 horizon entries
        ts       = pt.get("ts", "?")
        aqi_pred = pt.get("aqi_predicted", "?")
        category = pt.get("category", "")
        low      = pt.get("confidence_low", "")
        high     = pt.get("confidence_high", "")

        # Format timestamp to just the time portion for brevity
        ts_label = str(ts).split("T")[-1][:5] if "T" in str(ts) else str(ts)

        conf_range = f" [{low}–{high}]" if low != "" and high != "" else ""
        lines.append(
            f"  {ts_label} → AQI {aqi_pred} ({category}){conf_range}"
        )

    return "\n".join(lines) if lines else "No forecast details available."


def _fmt_attribution(attr: dict[str, Any]) -> str:
    """
    AI /attribution/{id} response shape:
        {
          "stationId":          "2553",
          "stationName":        "...",
          "timestamp":          "...",
          "currentAQI":         246,
          "likelySource":       "Traffic",
          "confidence":         0.47,
          "contributingFactors": ["High PM2.5/PM10 ratio", …]
        }
    """
    likely_source = attr.get("likelySource", "Unknown")
    confidence    = attr.get("confidence", "?")
    factors       = attr.get("contributingFactors", [])
    current_aqi   = attr.get("currentAQI", "")

    lines = [
        f"Dominant source : {likely_source}  (confidence: {confidence})",
    ]
    if current_aqi:
        lines.append(f"Current AQI     : {current_aqi}")
    if factors:
        if isinstance(factors, list):
            for f in factors:
                lines.append(f"  • {f}")
        else:
            lines.append(f"  {factors}")

    return "\n".join(lines)


def _fmt_guidance(chunks: list[GuidanceChunk]) -> str:
    if not chunks:
        return "No matching guideline chunks found in the knowledge base."
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        title   = chunk.metadata.get("title", "Guideline")
        section = chunk.section
        score   = f"{chunk.score * 100:.1f}%"
        snippet = chunk.text[:800] + ("…" if len(chunk.text) > 800 else "")
        parts.append(
            f"[{i}] {title} — {section}  (relevance: {score})\n{snippet}"
        )
    return "\n\n".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def assemble_context(query: str, station_id: str, retrieval_query: str | None = None) -> str:
    """
    Build a complete, LLM-ready context string for *query* at *station_id*.

    Parameters
    ──────────
    query          : the user's original query (any language) — displayed verbatim
    station_id     : monitoring station ID
    retrieval_query: English translation of *query* used for ChromaDB embedding
                     and population classification.  If None, falls back to *query*.

    Pipeline
    ────────
    1. Fetch live AQI reading          (java_client.get_latest_reading)
    2. Fetch AQI forecast              (ai_client.get_forecast)
    3. Fetch pollution attribution     (ai_client.get_attribution)
    4. Classify population group       (population_classifier — on retrieval_query)
    5. Retrieve guideline chunks       (retrieval — on retrieval_query)
    6. Assemble all sections into one string

    Any upstream call that returns None (service down / timeout) is silently
    omitted from the context — the rest of the pipeline still runs.
    """
    _retrieval_q = retrieval_query if retrieval_query else query

    sections: list[str] = [
        f"USER QUERY: {query}\n",
    ]

    # ── 1. Live AQI reading ──────────────────────────────────────────────────
    reading = java_client.get_latest_reading(station_id)
    current_aqi: int = 0

    print(f"\n[context_builder] RAW java_client.get_latest_reading({station_id!r}):")
    print(json.dumps(reading, default=str, indent=2) if reading else "  → None (service offline or error)")

    if reading is not None:
        current_aqi = int(reading.get("aqi") or 0)
        sections.append(_section("Current Air Quality Reading", _fmt_reading(reading)))
    else:
        logger.warning("[context_builder] Java data service unavailable — skipping AQI reading.")
        sections.append(_section("Current Air Quality Reading", "⚠  Data unavailable (Java service offline)."))

    # ── 2. AQI Forecast ──────────────────────────────────────────────────────
    forecast_raw = ai_client.get_forecast(station_id)

    print(f"\n[context_builder] RAW ai_client.get_forecast({station_id!r}):")
    print(json.dumps(forecast_raw, default=str, indent=2) if forecast_raw else "  → None (service offline or error)")

    if forecast_raw is not None:
        sections.append(_section("AQI Forecast (next 24 h)", _fmt_forecast(forecast_raw)))
    else:
        logger.warning("[context_builder] AI service unavailable — skipping forecast.")

    # ── 3. Pollution Attribution ─────────────────────────────────────────────
    attribution_raw = ai_client.get_attribution(station_id)

    print(f"\n[context_builder] RAW ai_client.get_attribution({station_id!r}):")
    print(json.dumps(attribution_raw, default=str, indent=2) if attribution_raw else "  → None (service offline or error)")

    if attribution_raw is not None:
        sections.append(_section("Pollution Source Attribution", _fmt_attribution(attribution_raw)))
    else:
        logger.warning("[context_builder] AI service unavailable — skipping attribution.")

    # ── 4. Population Classification ─────────────────────────────────────────
    population = classify_population(_retrieval_q)   # always classify on English text
    print(f"[context_builder] POPULATION: {population!r}  (retrieval_q={_retrieval_q!r:.60})")
    sections.append(_section("Classified Population Group", population))

    # ── 5. Relevant Guideline Chunks ─────────────────────────────────────────
    effective_aqi = current_aqi if current_aqi > 0 else 100
    chunks = get_relevant_guidance(
        query=_retrieval_q,
        current_aqi=effective_aqi,
        population=population,
        n_results=3,
    )
    sections.append(_section("Relevant Health Guidelines", _fmt_guidance(chunks)))

    # ── Assemble ─────────────────────────────────────────────────────────────
    context = "\n".join(sections) + f"\n{_SEP}"
    return context


# ─────────────────────────────────────────────────────────────────────────────
# Legacy helper (used by app/routers/chat.py)
# ─────────────────────────────────────────────────────────────────────────────

_CHARS_PER_TOKEN: int = 4
DEFAULT_MAX_TOKENS: int = 3_000


def build_context(
    chunks,  # list[RetrievedChunk | GuidanceChunk]
    max_tokens: int = DEFAULT_MAX_TOKENS,
) -> str:
    """
    Fit a list of retrieved chunks into a token budget.

    Used by the legacy /chat router path that calls retrieval directly.
    """
    max_chars = max_tokens * _CHARS_PER_TOKEN
    parts: list[str] = []
    used_chars = 0

    for i, chunk in enumerate(chunks, start=1):
        meta     = chunk.metadata if hasattr(chunk, "metadata") else {}
        section  = meta.get("section", getattr(chunk, "section", "Unknown Section"))
        category = meta.get("aqi_category", "")
        pop      = meta.get("population", "")
        doc      = getattr(chunk, "text", getattr(chunk, "document", ""))
        score    = getattr(chunk, "score", 0.0)

        header = (
            f"[Chunk {i} | {category} AQI | {pop} | {section} | "
            f"relevance: {score * 100:.1f}%]"
        )
        block = f"{header}\n{doc}"

        if used_chars + len(block) > max_chars:
            remaining = max_chars - used_chars
            if remaining > 200:
                parts.append(block[:remaining] + "\n… [truncated]")
            break

        parts.append(block)
        used_chars += len(block)

    if not parts:
        return "No relevant context found in the knowledge base."

    return "\n\n---\n\n".join(parts)
