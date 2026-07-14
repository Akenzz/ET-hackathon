"""
app/services/population_classifier.py
──────────────────────────────────────
Maps a free-text user query to one of five population groups used as
metadata filters in the ChromaDB collection.

Population labels (match frontmatter values exactly):
    general | children | elderly | respiratory | cardiac

Public API
──────────
    classify_population(query: str) -> str
"""

from __future__ import annotations

import re

# ─────────────────────────────────────────────────────────────────────────────
# Keyword rules  (ordered — first match wins)
# ─────────────────────────────────────────────────────────────────────────────

_RULES: list[tuple[re.Pattern[str], str]] = [
    # ── Respiratory ──────────────────────────────────────────────────────────
    (
        re.compile(
            r"\b(asthma|asthmatic|copd|bronchitis|wheez|inhaler|lung\s*disease"
            r"|respiratory|breathless|shortness\s+of\s+breath|pulmonary)\b",
            re.IGNORECASE,
        ),
        "Respiratory",
    ),
    # ── Cardiac ──────────────────────────────────────────────────────────────
    (
        re.compile(
            r"\b(heart|cardiac|cardiovascular|hypertension|high\s+blood\s+pressure"
            r"|coronary|angina|arrhythmia|palpitation|chest\s+pain)\b",
            re.IGNORECASE,
        ),
        "Cardiac",
    ),
    # ── Children ─────────────────────────────────────────────────────────────
    (
        re.compile(
            r"\b(my\s+kid|my\s+son|my\s+daughter|my\s+child|my\s+baby"
            r"|infant|toddler|children|child|kids?|teen|student|school\s*going)\b",
            re.IGNORECASE,
        ),
        "Children",
    ),
    # ── Elderly ──────────────────────────────────────────────────────────────
    (
        re.compile(
            r"\b(elder|elderly|senior|aged|old\s+person|old\s+people|grandparent"
            r"|grandmother|grandfather|grandma|grandpa|ageing|aging)\b",
            re.IGNORECASE,
        ),
        "Elderly",
    ),
]

# Title-Case values match the ChromaDB frontmatter exactly
_VALID_POPULATIONS: frozenset[str] = frozenset(
    {"General", "Children", "Elderly", "Respiratory", "Cardiac"}
)


def classify_population(query: str) -> str:
    """
    Return the most specific population group detected in *query*.

    Applies keyword rules in priority order:
        respiratory > cardiac > children > elderly > general

    Always returns a valid label string — falls back to "general" if no
    rule fires.

    Examples
    --------
    >>> classify_population("Is it safe for my asthmatic daughter to play outside?")
    'respiratory'
    >>> classify_population("My grandmother is 80, should she wear a mask?")
    'elderly'
    >>> classify_population("Can I go for a morning run?")
    'general'
    """
    for pattern, label in _RULES:
        if pattern.search(query):
            return label
    return "General"


def resolve_population(query: str, explicit: str | None = None) -> str:
    """
    Convenience wrapper used by the chat router.

    If *explicit* is provided and is a known population label, it takes
    priority over auto-classification.  Otherwise the query is classified
    automatically.
    """
    if explicit and explicit.capitalize() in _VALID_POPULATIONS:
        return explicit.capitalize()
    return classify_population(query)
