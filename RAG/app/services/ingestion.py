"""
app/services/ingestion.py
─────────────────────────
Parses air-quality health-guideline Markdown files, splits them into
semantically meaningful chunks, embeds them with sentence-transformers,
and persists everything in a ChromaDB PersistentClient collection.

Public API
──────────
    build_vector_store(guidelines_dir, chroma_db_path, collection_name)
        → dict   {processed, chunks_created, per_category}
"""

from __future__ import annotations

import hashlib
import os
import re
import warnings
from pathlib import Path
from typing import Any

import yaml
from chromadb import PersistentClient
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# ── tunables ─────────────────────────────────────────────────────────────────
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
GUIDELINES_DIR: str = os.getenv("GUIDELINES_DIR", "data/health_guidelines")
CHROMA_DB_PATH: str = os.getenv("CHROMA_DB_PATH", "data/chroma_db")
CHROMA_COLLECTION: str = os.getenv("CHROMA_COLLECTION", "aqi_health_guidelines")

# A section is split further only when it exceeds this character count
LONG_SECTION_THRESHOLD: int = 1_200

# Required frontmatter keys — files missing any are skipped
REQUIRED_FM_KEYS: set[str] = {
    "title",
    "aqi_category",
    "aqi_min",
    "aqi_max",
    "population",
}


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────


def _stable_id(text: str) -> str:
    """Deterministic, collision-resistant chunk ID derived from content."""
    return hashlib.sha256(text.encode()).hexdigest()[:32]


def _parse_markdown(raw: str, filename: str) -> tuple[dict[str, Any], str, str] | None:
    """
    Split a Markdown file into (frontmatter_dict, body, keywords_line).

    Returns None if the frontmatter is missing or malformed (and prints a
    warning so the caller can skip the file gracefully).
    """
    # ── strip frontmatter ────────────────────────────────────────────────────
    fm_pattern = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
    fm_match = fm_pattern.match(raw)
    if not fm_match:
        warnings.warn(
            f"[ingestion] ⚠  SKIPPED '{filename}': no YAML frontmatter block found.",
            stacklevel=2,
        )
        return None

    try:
        fm: dict[str, Any] = yaml.safe_load(fm_match.group(1)) or {}
    except yaml.YAMLError as exc:
        warnings.warn(
            f"[ingestion] ⚠  SKIPPED '{filename}': YAML parse error — {exc}",
            stacklevel=2,
        )
        return None

    # ── validate required keys ───────────────────────────────────────────────
    missing = REQUIRED_FM_KEYS - fm.keys()
    if missing:
        warnings.warn(
            f"[ingestion] ⚠  SKIPPED '{filename}': frontmatter missing keys {missing}.",
            stacklevel=2,
        )
        return None

    body = raw[fm_match.end():]

    # ── extract trailing Keywords line ────────────────────────────────────────
    kw_match = re.search(r"(?im)^keywords\s*:(.*)$", body)
    keywords_line = kw_match.group(0).strip() if kw_match else ""
    if kw_match:
        body = body[: kw_match.start()].rstrip()

    return fm, body, keywords_line


def _split_into_sections(body: str) -> list[tuple[str, str]]:
    """
    Split body on ## headers.  Returns list of (section_name, section_text).

    If a section is long AND contains ### sub-headers, those sub-headers are
    each returned as their own chunk (labelled 'ParentSection > SubSection').
    Short sections keep all ### content inline.
    """
    # Split on ## (but not ###) lines
    h2_pattern = re.compile(r"^(## .+)$", re.MULTILINE)
    parts = h2_pattern.split(body)

    # parts alternates: [preamble, header, text, header, text, ...]
    sections: list[tuple[str, str]] = []
    i = 1  # skip preamble
    while i < len(parts) - 1:
        header = parts[i].lstrip("#").strip()
        text = parts[i + 1].strip()
        i += 2

        if len(text) <= LONG_SECTION_THRESHOLD:
            # Short — keep as one chunk (### stays inline)
            sections.append((header, text))
            continue

        # Long — try to split on ### sub-headers
        h3_pattern = re.compile(r"^(### .+)$", re.MULTILINE)
        sub_parts = h3_pattern.split(text)

        if len(sub_parts) == 1:
            # No sub-headers even though it's long — keep as one chunk
            sections.append((header, text))
            continue

        # Preamble before first ### (if any)
        preamble = sub_parts[0].strip()
        if preamble:
            sections.append((header, preamble))

        j = 1
        while j < len(sub_parts) - 1:
            sub_header = sub_parts[j].lstrip("#").strip()
            sub_text = sub_parts[j + 1].strip()
            j += 2
            label = f"{header} > {sub_header}"
            sections.append((label, sub_text))

    return sections


def _build_chunk_text(title: str, section_name: str, body: str, keywords: str) -> str:
    """
    Assemble the final text that will be embedded and stored.

    Format:
        [Document: <title>]
        [Section: <section_name>]
        <body text>
        <Keywords line>
    """
    parts = [
        f"[Document: {title}]",
        f"[Section: {section_name}]",
        body,
    ]
    if keywords:
        parts.append(keywords)
    return "\n".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────


def build_vector_store(
    guidelines_dir: str | Path | None = None,
    chroma_db_path: str | Path | None = None,
    collection_name: str | None = None,
) -> dict[str, Any]:
    """
    Parse every .md file in *guidelines_dir*, chunk it, embed it, and upsert
    into a ChromaDB persistent collection.

    Parameters
    ──────────
    guidelines_dir   : path to the folder containing guideline .md files
                       (defaults to env GUIDELINES_DIR or 'data/health_guidelines')
    chroma_db_path   : path where ChromaDB stores its on-disk data
                       (defaults to env CHROMA_DB_PATH or 'data/chroma_db')
    collection_name  : ChromaDB collection name
                       (defaults to env CHROMA_COLLECTION or 'aqi_health_guidelines')

    Returns
    ───────
    dict with keys: processed, chunks_created, skipped, per_category
    """
    # ── resolve paths / defaults ─────────────────────────────────────────────
    g_dir = Path(guidelines_dir or GUIDELINES_DIR)
    db_path = Path(chroma_db_path or CHROMA_DB_PATH)
    col_name = collection_name or CHROMA_COLLECTION

    if not g_dir.exists():
        raise FileNotFoundError(f"Guidelines directory not found: {g_dir.resolve()}")

    md_files = sorted(g_dir.glob("*.md"))
    if not md_files:
        print(f"[ingestion] No .md files found in {g_dir.resolve()}")
        return {"processed": 0, "chunks_created": 0, "skipped": 0, "per_category": {}}

    print(f"[ingestion] Found {len(md_files)} Markdown file(s) in {g_dir.resolve()}")

    # ── initialise ChromaDB ───────────────────────────────────────────────────
    db_path.mkdir(parents=True, exist_ok=True)
    client = PersistentClient(
        path=str(db_path),
        settings=Settings(anonymized_telemetry=False),
    )
    collection = client.get_or_create_collection(
        name=col_name,
        metadata={"hnsw:space": "cosine"},
    )
    print(f"[ingestion] ChromaDB collection '{col_name}' ready at {db_path.resolve()}")

    # ── load embedding model ─────────────────────────────────────────────────
    print(f"[ingestion] Loading embedding model '{EMBEDDING_MODEL}' …")
    embedder = SentenceTransformer(EMBEDDING_MODEL)
    print("[ingestion] Embedding model loaded.")

    # ── process files ─────────────────────────────────────────────────────────
    processed = 0
    skipped = 0
    total_chunks = 0
    per_category: dict[str, int] = {}

    all_ids: list[str] = []
    all_embeddings: list[list[float]] = []
    all_documents: list[str] = []
    all_metadatas: list[dict[str, Any]] = []

    for md_path in md_files:
        raw = md_path.read_text(encoding="utf-8")

        parsed = _parse_markdown(raw, md_path.name)
        if parsed is None:
            skipped += 1
            continue

        fm, body, keywords = parsed
        title: str = str(fm["title"])
        aqi_category: str = str(fm["aqi_category"])
        aqi_min: int = int(fm.get("aqi_min", 0))
        aqi_max: int = int(fm.get("aqi_max", 0))
        population: str = str(fm.get("population", "General"))
        severity: str = str(fm.get("severity", ""))

        sections = _split_into_sections(body)
        file_chunks = 0

        for section_name, section_text in sections:
            chunk_text = _build_chunk_text(title, section_name, section_text, keywords)
            chunk_id = _stable_id(chunk_text)

            all_ids.append(chunk_id)
            all_documents.append(chunk_text)
            all_metadatas.append(
                {
                    "aqi_category": aqi_category,
                    "aqi_min": aqi_min,
                    "aqi_max": aqi_max,
                    "population": population,
                    "severity": severity,
                    "section": section_name,
                    "title": title,
                    "source_file": md_path.name,
                }
            )
            file_chunks += 1

        processed += 1
        total_chunks += file_chunks
        per_category[aqi_category] = per_category.get(aqi_category, 0) + file_chunks
        print(
            f"[ingestion]   ✓ {md_path.name:40s} → {file_chunks} chunk(s)"
        )

    # ── embed & upsert in one batch ───────────────────────────────────────────
    if all_documents:
        print(f"\n[ingestion] Embedding {total_chunks} chunk(s) … (this may take a moment)")
        vectors = embedder.encode(all_documents, show_progress_bar=True, batch_size=32)
        all_embeddings = [v.tolist() for v in vectors]

        # Upsert in batches of 500 to respect ChromaDB limits
        BATCH = 500
        for start in range(0, len(all_ids), BATCH):
            end = start + BATCH
            collection.upsert(
                ids=all_ids[start:end],
                embeddings=all_embeddings[start:end],
                documents=all_documents[start:end],
                metadatas=all_metadatas[start:end],
            )
        print(f"[ingestion] Upserted {total_chunks} chunk(s) into ChromaDB.")

    return {
        "processed": processed,
        "chunks_created": total_chunks,
        "skipped": skipped,
        "per_category": per_category,
    }
