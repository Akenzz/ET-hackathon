"""
app/services/context_builder.py
────────────────────────────────
Assembles a single, clearly-labelled context string from all upstream
data sources and the ChromaDB knowledge base.

Public API
──────────
    assemble_context(query, station_id) -> str
    build_context(chunks, max_tokens)   -> str   (legacy helper for the chat router)
"""

from __future__ import annotations

import logging
from typing import Any

from app.clients import ai_client, java_client
from app.services.population_classifier import classify_population
from app.services.retrieval import GuidanceChunk, get_relevant_guidance

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Internal formatting helpers
# ─────────────────────────────────────────────────────────────────────────────

_SEP = "─" * 60


def _section(title: str, body: str) -> str:
    return f"{_SEP}\n### {title}\n{body.strip()}\n"


def _fmt_reading(reading: dict[str, Any]) -> str:
    aqi      = reading.get("aqi", reading.get("aqi_value", "N/A"))
    category = reading.get("category", reading.get("aqi_category", "N/A"))
    pm25     = reading.get("pm25", "N/A")
    pm10     = reading.get("pm10", "N/A")
    ts       = reading.get("timestamp", "N/A")
    station  = reading.get("station_id", reading.get("station", "N/A"))

    return (
        f"Station   : {station}\n"
        f"AQI       : {aqi}  ({category})\n"
        f"PM2.5     : {pm25} µg/m³\n"
        f"PM10      : {pm10} µg/m³\n"
        f"Recorded  : {ts}"
    )


def _fmt_forecast(forecast: dict[str, Any]) -> str:
    summary = forecast.get("summary", "")
    points  = forecast.get("forecast", [])
    lines   = [summary] if summary else []
    for pt in points[:4]:          # show up to 4 horizon points
        lines.append(f"  +{pt.get('hour', '?')}h → AQI {pt.get('aqi', '?')} ({pt.get('trend', '')})")
    return "\n".join(lines) if lines else "No forecast details available."


def _fmt_attribution(attr: dict[str, Any]) -> str:
    dominant = attr.get("dominant_source", "Unknown")
    sources  = attr.get("sources", {})
    notes    = attr.get("notes", "")
    conf     = attr.get("confidence", "")

    lines = [f"Dominant source : {dominant}  (confidence: {conf})"]
    for src, pct in sorted(sources.items(), key=lambda x: -x[1]):
        lines.append(f"  {src:<22} {pct * 100:.0f}%")
    if notes:
        lines.append(f"Notes : {notes}")
    return "\n".join(lines)


def _fmt_guidance(chunks: list[GuidanceChunk]) -> str:
    if not chunks:
        return "No matching guideline chunks found in the knowledge base."
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        title    = chunk.metadata.get("title", "Guideline")
        section  = chunk.section
        score    = f"{chunk.score * 100:.1f}%"
        snippet  = chunk.text[:800] + ("…" if len(chunk.text) > 800 else "")
        parts.append(
            f"[{i}] {title} — {section}  (relevance: {score})\n{snippet}"
        )
    return "\n\n".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def assemble_context(query: str, station_id: str) -> str:
    """
    Build a complete, LLM-ready context string for *query* at *station_id*.

    Pipeline
    ────────
    1. Fetch live AQI reading          (java_client.get_latest_reading)
    2. Fetch AQI forecast              (ai_client.get_forecast)
    3. Fetch pollution attribution     (ai_client.get_attribution)
    4. Classify population group       (population_classifier.classify_population)
    5. Retrieve guideline chunks       (retrieval.get_relevant_guidance)
    6. Assemble all sections into one string

    Any upstream call that returns None (service down / timeout) is silently
    omitted from the context — the rest of the pipeline still runs.

    Returns
    ───────
    A multi-section string ready to be injected into an LLM system prompt.
    """
    sections: list[str] = [
        f"USER QUERY: {query}\n",
    ]

    # ── 1. Live AQI reading ──────────────────────────────────────────────────
    reading = java_client.get_latest_reading(station_id)
    current_aqi: int = 0

    if reading is not None:
        current_aqi = int(reading.get("aqi", reading.get("aqi_value", 0)))
        sections.append(_section("Current Air Quality Reading", _fmt_reading(reading)))
    else:
        logger.warning("[context_builder] Java data service unavailable — skipping AQI reading.")
        sections.append(_section("Current Air Quality Reading", "⚠  Data unavailable (Java service offline)."))

    # ── 2. AQI Forecast ──────────────────────────────────────────────────────
    forecast = ai_client.get_forecast(station_id)
    if forecast is not None:
        sections.append(_section("AQI Forecast (next 24 h)", _fmt_forecast(forecast)))
    else:
        logger.warning("[context_builder] AI service unavailable — skipping forecast.")

    # ── 3. Pollution Attribution ─────────────────────────────────────────────
    attribution = ai_client.get_attribution(station_id)
    if attribution is not None:
        sections.append(_section("Pollution Source Attribution", _fmt_attribution(attribution)))
    else:
        logger.warning("[context_builder] AI service unavailable — skipping attribution.")

    # ── 4. Population Classification ─────────────────────────────────────────
    population = classify_population(query)
    sections.append(_section("Classified Population Group", population))

    # ── 5. Relevant Guideline Chunks ─────────────────────────────────────────
    # Fall back to AQI=100 ("Moderate") if the Java service was down so we
    # can still surface some guidance rather than returning nothing.
    effective_aqi = current_aqi if current_aqi > 0 else 100
    chunks = get_relevant_guidance(
        query=query,
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
