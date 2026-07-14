#!/usr/bin/env python3
"""
scripts/test_integration.py
────────────────────────────
Smoke-tests the full context assembly pipeline by running
assemble_context() against several sample queries and printing
the resulting context strings to stdout.

Usage
─────
    # from the RAG/ project root:
    python scripts/test_integration.py [station_id]

    # example:
    python scripts/test_integration.py DEL-001

If no station_id is provided, it defaults to "DEL-001".

The Java / AI services don't need to be running — any unavailable
upstream call will be omitted from the context with a clear warning,
and the ChromaDB retrieval will still run against the local vector
store (as long as ingestion has been done).
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# ── path fix: make `app` importable from project root ────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

# ── suppress sentence-transformers / torch noise ─────────────────────────────
import logging
logging.basicConfig(
    level=logging.WARNING,           # silence INFO chatter during the test
    format="%(levelname)-8s | %(name)s — %(message)s",
)
# Show our own context_builder / retrieval warnings clearly
for mod in ("app.services.context_builder", "app.services.retrieval",
            "app.clients.java_client", "app.clients.ai_client"):
    logging.getLogger(mod).setLevel(logging.WARNING)

from app.services.context_builder import assemble_context  # noqa: E402


# ─────────────────────────────────────────────────────────────────────────────
# Sample queries — cover a range of populations and AQI concerns
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_QUERIES: list[str] = [
    "Is it safe to go for a morning jog today?",
    "My son has asthma — should he wear a mask and stay indoors?",
    "My grandmother is 78, is it safe for her to go to the market?",
    "I have hypertension. What precautions should I take with the current air quality?",
]


def _divider(char: str = "═", width: int = 72) -> str:
    return char * width


def main() -> None:
    station_id: str = sys.argv[1] if len(sys.argv) > 1 else "DEL-001"

    print(_divider())
    print(f"  RAG Integration Test  |  station_id = {station_id}")
    print(_divider())
    print()

    for i, query in enumerate(SAMPLE_QUERIES, start=1):
        print(_divider("─"))
        print(f"  TEST {i}/{len(SAMPLE_QUERIES)}")
        print(f"  Query: \"{query}\"")
        print(_divider("─"))

        t0 = time.perf_counter()
        context = assemble_context(query=query, station_id=station_id)
        elapsed = time.perf_counter() - t0

        print(context)
        print(f"\n  ⏱  assemble_context() completed in {elapsed:.2f}s")
        print()

    print(_divider())
    print("  All test queries completed.")
    print(_divider())


if __name__ == "__main__":
    main()
