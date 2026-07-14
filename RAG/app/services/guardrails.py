"""
app/services/guardrails.py
───────────────────────────
Input and output safety guardrails for the RAG chatbot.

Public API
──────────
    check_input(message)                   -> GuardrailResult
    check_response_safety(response)        -> bool
    get_fallback_response(current_aqi)     -> str
    check_output(response)                 -> GuardrailResult   (legacy)
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ── Off-topic input patterns ──────────────────────────────────────────────────
_OFF_TOPIC_PATTERNS: list[re.Pattern] = [
    re.compile(
        r"\b(weather forecast|stock market|crypto|bitcoin|recipe|movie"
        r"|sport scores?|footbal|cricket score)\b",
        re.I,
    ),
    re.compile(r"\b(write code|program|hack|sql query|javascript|python script)\b", re.I),
    re.compile(r"\b(politic|election|government policy|president|prime\s+minister)\b", re.I),
]

# ── Harmful input patterns ────────────────────────────────────────────────────
_HARMFUL_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b(suicide|self[\-\s]harm|kill\s+(my)?self|overdose)\b", re.I),
]

# ── Diagnosis-like language in output ────────────────────────────────────────
# Patterns that suggest the model may be making specific clinical claims
_DIAGNOSIS_PATTERNS: list[re.Pattern] = [
    re.compile(
        r"\b(you\s+have|you\s+are\s+diagnosed|this\s+is\s+a\s+symptom\s+of"
        r"|you\s+are\s+suffering\s+from|indicates?\s+(that\s+you\s+have)?)\b",
        re.I,
    ),
]

# ── Known drug / medication names to flag ────────────────────────────────────
# Not exhaustive — catches the most common ones that should come from a doctor
_DRUG_PATTERN: re.Pattern = re.compile(
    r"\b(salbutamol|albuterol|budesonide|fluticasone|montelukast|cetirizine"
    r"|loratadine|prednisolone|dexamethasone|azithromycin|amoxicillin"
    r"|metoprolol|atorvastatin|amlodipine|lisinopril|ramipril)\b",
    re.I,
)

# ── Low-confidence output markers (legacy) ───────────────────────────────────
_LOW_CONFIDENCE_PHRASES: list[str] = [
    "I don't know",
    "i'm not sure",
    "i cannot answer",
    "i can't answer",
    "no information",
    "not enough context",
    "unable to answer",
    "as an ai",
    "as a language model",
]


# ─────────────────────────────────────────────────────────────────────────────
# Data model
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class GuardrailResult:
    passed: bool
    reason: str = ""
    flags: list[str] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def check_input(message: str) -> GuardrailResult:
    """
    Validate an incoming user message before the retrieval pipeline runs.

    Returns GuardrailResult(passed=False) with a user-facing reason if the
    message should be blocked.
    """
    if not message or not message.strip():
        return GuardrailResult(passed=False, reason="Message cannot be empty.")

    if len(message) > 2_000:
        return GuardrailResult(
            passed=False, reason="Message is too long (max 2 000 characters)."
        )

    for pattern in _HARMFUL_PATTERNS:
        if pattern.search(message):
            return GuardrailResult(
                passed=False,
                reason=(
                    "Your message contains content that cannot be addressed here. "
                    "If you are in distress, please contact a healthcare professional "
                    "or call a helpline immediately."
                ),
                flags=["harmful_content"],
            )

    for pattern in _OFF_TOPIC_PATTERNS:
        if pattern.search(message):
            return GuardrailResult(
                passed=False,
                reason=(
                    "This service answers questions about air quality and health. "
                    "Your query appears to be on a different topic."
                ),
                flags=["off_topic"],
            )

    return GuardrailResult(passed=True)


def check_response_safety(response: str) -> bool:
    """
    Inspect the LLM's output for diagnosis-like language or specific drug names.

    Returns True  if the response is considered safe.
    Returns False if it contains potentially unsafe clinical content — the
    caller should LOG this event (and optionally append a disclaimer).

    This function NEVER raises; it always returns a bool.
    """
    for pattern in _DIAGNOSIS_PATTERNS:
        if pattern.search(response):
            logger.warning(
                "[guardrails] ⚠  Response flagged: diagnosis-like language detected. "
                "Snippet: %.120s", response
            )
            return False

    if _DRUG_PATTERN.search(response):
        logger.warning(
            "[guardrails] ⚠  Response flagged: specific drug name detected. "
            "Snippet: %.120s", response
        )
        return False

    return True


def get_fallback_response(current_aqi: int | None = None) -> str:
    """
    Return a safe, informative fallback when retrieval yields no matching chunks.

    Always acknowledges that no specific guideline was found and always
    includes the raw AQI number (if available) so the user still has
    actionable information.
    """
    if current_aqi and current_aqi > 0:
        return (
            f"The current AQI at the selected station is {current_aqi}. "
            "I was unable to find specific health guidelines matching your query "
            "and profile in our knowledge base. "
            "As a general precaution, please monitor official CPCB or WHO advisories "
            "and consult a healthcare professional if you have any health concerns."
        )
    return (
        "I was unable to retrieve the current AQI data or find matching health "
        "guidelines for your query. Please check the CPCB website for the latest "
        "air quality readings and consult a healthcare professional if needed."
    )


# ── Legacy helper kept for backward-compat with the old chat router ──────────

def check_output(response: str) -> GuardrailResult:
    """
    Legacy output checker — flags low-confidence phrases.
    Prefer check_response_safety() for new code.
    """
    lower = response.lower()
    triggered = [p for p in _LOW_CONFIDENCE_PHRASES if p.lower() in lower]
    if triggered:
        return GuardrailResult(
            passed=False,
            reason="Response may be incomplete or uncertain.",
            flags=["low_confidence"],
        )
    return GuardrailResult(passed=True)
