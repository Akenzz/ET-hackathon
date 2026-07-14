"""
app/services/retrieval.py
─────────────────────────
Queries the ChromaDB vector store for guideline chunks relevant to a
user query, filtered by the live AQI value and population group.

Public API
──────────
    get_relevant_guidance(query, current_aqi, population, n_results)
        -> list[GuidanceChunk]
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from chromadb import PersistentClient
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# ── config from environment ───────────────────────────────────────────────────
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
CHROMA_DB_PATH: str = os.getenv("CHROMA_DB_PATH", "data/chroma_db")
CHROMA_COLLECTION: str = os.getenv("CHROMA_COLLECTION", "aqi_health_guidelines")

# Module-level singletons — lazy-initialised on first call
_embedder: SentenceTransformer | None = None
_collection = None


# ─────────────────────────────────────────────────────────────────────────────
# Singleton accessors
# ─────────────────────────────────────────────────────────────────────────────

def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        logger.info("[retrieval] Loading embedding model '%s' …", EMBEDDING_MODEL)
        _embedder = SentenceTransformer(EMBEDDING_MODEL)
    return _embedder


def _get_collection():
    global _collection
    if _collection is None:
        db_path = Path(CHROMA_DB_PATH)
        if not db_path.exists():
            raise FileNotFoundError(
                f"ChromaDB path not found: {db_path.resolve()}. "
                "Run scripts/run_ingestion.py first."
            )
        client = PersistentClient(
            path=str(db_path),
            settings=Settings(anonymized_telemetry=False),
        )
        _collection = client.get_collection(name=CHROMA_COLLECTION)
        logger.info(
            "[retrieval] Connected to ChromaDB collection '%s' (%d docs)",
            CHROMA_COLLECTION,
            _collection.count(),
        )
    return _collection


# ─────────────────────────────────────────────────────────────────────────────
# Data model
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class GuidanceChunk:
    chunk_id: str
    section: str
    text: str
    score: float                           # cosine similarity, 0–1 (higher = better)
    metadata: dict[str, Any] = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_relevant_guidance(
    query: str,
    current_aqi: int,
    population: str,
    n_results: int = 3,
) -> list[GuidanceChunk]:
    """
    Retrieve the *n_results* most semantically relevant guideline chunks for
    *query*, filtering on:
        • aqi_min <= current_aqi <= aqi_max   (document covers this AQI level)
        • population == <classified group>     (document targets this group)

    Results are ranked by cosine similarity to the embedded query.

    Parameters
    ──────────
    query       : natural-language user question
    current_aqi : live AQI integer from the Java data service
    population  : one of general / children / elderly / respiratory / cardiac
    n_results   : number of chunks to return

    Returns an empty list (never raises) if:
        • ChromaDB is unavailable / not yet ingested
        • No matching chunks exist for this AQI + population combination
    """
    try:
        embedder = _get_embedder()
        collection = _get_collection()
    except FileNotFoundError as exc:
        logger.error("[retrieval] %s", exc)
        return []
    except Exception as exc:
        logger.error("[retrieval] Failed to initialise vector store: %s", exc)
        return []

    # Embed the query
    query_vector: list[float] = embedder.encode(query).tolist()

    # Build compound ChromaDB where-filter:
    #   aqi_min <= current_aqi  AND  current_aqi <= aqi_max  AND  population == ...
    where_filter: dict[str, Any] = {
        "$and": [
            {"aqi_min": {"$lte": current_aqi}},
            {"aqi_max": {"$gte": current_aqi}},
            {"population": {"$eq": population}},
        ]
    }

    try:
        results = collection.query(
            query_embeddings=[query_vector],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:
        logger.error("[retrieval] ChromaDB query failed: %s", exc)
        return []

    ids   = results.get("ids",       [[]])[0]
    docs  = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]

    chunks: list[GuidanceChunk] = []
    for cid, doc, meta, dist in zip(ids, docs, metas, dists):
        # ChromaDB cosine space returns distance (0=identical) → convert to similarity
        score = max(0.0, 1.0 - float(dist))
        chunks.append(
            GuidanceChunk(
                chunk_id=cid,
                section=meta.get("section", "Unknown Section"),
                text=doc,
                score=score,
                metadata=meta,
            )
        )

    logger.info(
        "[retrieval] query='%.60s…' | aqi=%d | population=%s | hits=%d",
        query,
        current_aqi,
        population,
        len(chunks),
    )
    return chunks
