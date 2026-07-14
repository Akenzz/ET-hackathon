"""
RAG Service — FastAPI entry point.

Startup behaviour:
  • Loads .env via python-dotenv
  • Checks if ChromaDB collection is populated; if empty (or not yet ingested),
    runs build_vector_store() automatically — so first boot after a fresh clone
    "just works" without a separate ingestion step.
  • Registers /api/v1/chat router and /health check.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load env vars FIRST — before any module that reads them at import time
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chat

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── ChromaDB path (resolved at startup) ──────────────────────────────────────
_CHROMA_DB_PATH = Path(os.getenv("CHROMA_DB_PATH", "data/chroma_db"))


def _chroma_is_empty() -> bool:
    """Return True if the ChromaDB directory doesn't exist or contains no data."""
    if not _CHROMA_DB_PATH.exists():
        return True
    # ChromaDB stores at least a chroma.sqlite3 file once seeded
    sqlite_files = list(_CHROMA_DB_PATH.glob("*.sqlite3"))
    if not sqlite_files:
        return True
    # Extra check: try counting docs in the collection
    try:
        from chromadb import PersistentClient
        from chromadb.config import Settings

        collection_name = os.getenv("CHROMA_COLLECTION", "aqi_health_guidelines")
        client = PersistentClient(
            path=str(_CHROMA_DB_PATH),
            settings=Settings(anonymized_telemetry=False),
        )
        col = client.get_or_create_collection(collection_name)
        return col.count() == 0
    except Exception:
        return True


# ---------------------------------------------------------------------------
# Lifespan — auto-ingestion on first boot
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 RAG service starting up …")

    if _chroma_is_empty():
        logger.info("📥 ChromaDB is empty — running build_vector_store() now …")
        try:
            from app.services.ingestion import build_vector_store

            result = build_vector_store()
            logger.info(
                "✅ Auto-ingestion complete: %d files → %d chunks",
                result["processed"],
                result["chunks_created"],
            )
        except Exception as exc:
            logger.error("❌ Auto-ingestion failed: %s", exc)
            logger.error(
                "   The service will still start but /chat may return empty results. "
                "Run scripts/run_ingestion.py manually."
            )
    else:
        logger.info("✅ ChromaDB already populated — skipping ingestion.")

    yield
    logger.info("🛑 RAG service shutting down …")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Air Quality RAG Service",
    description=(
        "Retrieval-Augmented Generation service providing air quality "
        "health advisories using ChromaDB + sentence-transformers + Groq LLM."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])


@app.get("/health", tags=["Health"])
async def health_check():
    """Lightweight liveness probe."""
    chroma_ready = not _chroma_is_empty()
    return {
        "status": "ok",
        "service": "RAG",
        "chroma_ready": chroma_ready,
    }
