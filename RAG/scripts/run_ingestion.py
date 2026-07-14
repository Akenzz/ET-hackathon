#!/usr/bin/env python3
"""
scripts/run_ingestion.py
─────────────────────────
Standalone script to ingest air quality health guideline Markdown files
into the ChromaDB vector store.

Usage
─────
    # from the RAG/ project root:
    python scripts/run_ingestion.py

    # optional overrides:
    GUIDELINES_DIR=data/health_guidelines \\
    CHROMA_DB_PATH=data/chroma_db \\
    python scripts/run_ingestion.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# ── make sure the project root is on sys.path so `app` is importable ────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv

load_dotenv(PROJECT_ROOT / ".env")

from app.services.ingestion import build_vector_store  # noqa: E402 — after path fix


def _banner(text: str, width: int = 60) -> None:
    print("=" * width)
    print(f"  {text}")
    print("=" * width)


def main() -> None:
    _banner("RAG Ingestion — Air Quality Health Guidelines")

    t0 = time.perf_counter()
    result = build_vector_store()
    elapsed = time.perf_counter() - t0

    # ── summary ──────────────────────────────────────────────────────────────
    print()
    _banner("Ingestion Summary")
    print(f"  ✅  Files processed   : {result['processed']}")
    print(f"  ⚠️   Files skipped     : {result['skipped']}")
    print(f"  📦  Total chunks      : {result['chunks_created']}")
    print(f"  ⏱️   Time elapsed      : {elapsed:.2f}s")
    print()
    print("  Chunks per AQI category:")

    per_cat: dict[str, int] = result.get("per_category", {})
    if per_cat:
        max_label = max(len(k) for k in per_cat)
        for category in sorted(per_cat):
            bar_len = per_cat[category]
            bar = "█" * min(bar_len, 50)
            print(f"    {category:<{max_label}}  {bar_len:>4}  {bar}")
    else:
        print("    (no chunks created)")

    print()
    print("  ChromaDB collection is ready for querying. 🎉")
    print("=" * 60)


if __name__ == "__main__":
    main()
