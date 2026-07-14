"""
app/services/llm_client.py
───────────────────────────
Groq LLM client using the OpenAI-compatible SDK.

Reads GROQ_API_KEY from env and hits the Groq inference endpoint.
Model defaults to llama-3.3-70b-versatile (fast, free-tier friendly).

Public API
──────────
    generate_response(query, context, language, conversation_history) -> str
"""

from __future__ import annotations

import logging
import os
from typing import Any

from openai import OpenAI

logger = logging.getLogger(__name__)

# ── Groq config ───────────────────────────────────────────────────────────────
_GROQ_API_KEY: str | None = None
_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_DEFAULT_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

_client: OpenAI | None = None

# ── Language instructions ─────────────────────────────────────────────────────
_LANG_INSTRUCTIONS: dict[str, str] = {
    "en": "Respond entirely in English.",
    "kn": (
        "Respond entirely in Kannada (ಕನ್ನಡ). "
        "Use simple, clear Kannada that is easy for the general public to understand. "
        "Write complete sentences — do not truncate or trail off mid-sentence."
    ),
    "hi": (
        "Respond entirely in Hindi (हिंदी). "
        "Use simple, clear Hindi that is easy for the general public to understand. "
        "Write complete sentences — do not truncate or trail off mid-sentence."
    ),
}

# Extra tokens reserved for non-Latin scripts (Kannada/Hindi glyphs encode less
# content per token than English, so the same 3-5 sentences needs more tokens).
_LANG_MAX_TOKENS: dict[str, int] = {
    "en": 1200,
    "kn": 1800,
    "hi": 1500,
}

# ── System prompt template ────────────────────────────────────────────────────
_SYSTEM_TEMPLATE = """\
You are an evidence-based Air Quality Health Advisor for an Indian city.
Your job is to give safe, clear, and grounded health guidance based ONLY on
the context passages provided — never invent medical facts beyond what is given.

STRICT RULES you must follow in every response:
1. Base your answer EXCLUSIVELY on the provided context. Do not speculate or
   add information not present in the context.
2. {lang_instruction}
3. Reference the ACTUAL AQI number and forecast trend from the context
   specifically (e.g. "With an AQI of 142 and a rising trend…"), never
   generically (e.g. "the air quality is poor").
4. Write a thorough, helpful response of 5–7 sentences. Structure it naturally:
   • Start with the current AQI and what it means for the activity asked about.
   • Explain the practical impact (why it's safe/unsafe, what the pollutants do).
   • Give concrete actionable advice (e.g. wear a mask, stay indoors, use an air purifier).
   • If forecast data is available, mention the trend or best window.
   • Close with a specific, grounded recommendation — not a generic disclaimer.
5. ONLY add "For specific medical advice, please consult a qualified doctor."
   if the user explicitly asks for a medical diagnosis, a medication name, or a
   treatment recommendation. Do NOT add this sentence to general activity or
   safety questions (jogging, walking, opening windows, etc.).
6. If the context mentions a dominant pollution source or forecast trend,
   mention it to help the user understand why the conditions are what they are.
7. BEST-TIME RULE — If the user's question implies timing flexibility
   (contains words like "when", "best time", "what time", "later", "morning",
   "evening", "tonight", or asks about a recurring activity like a walk, jog,
   or exercise), you MUST scan the AQI Forecast section in the context and:
   a. Identify the hour or window in the next 24 h with the LOWEST predicted AQI.
   b. Name that specific time window explicitly (e.g. "The lowest forecast AQI
      is 213 at 19:00, which is still Poor — consider an indoor alternative").
   c. If all forecast hours remain in a dangerous category, say so clearly and
      recommend staying indoors instead of picking a "least bad" window without
      a caveat.
   This rule overrides the generic yes/no answer for right-now conditions.

CONTEXT:
{context}
"""


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GROQ_API_KEY is not set. Add it to your .env file."
            )
        _client = OpenAI(api_key=api_key, base_url=_GROQ_BASE_URL)
    return _client


def translate_to_english(text: str) -> str:
    """
    Translate *text* to English using a fast, small Groq model.

    Used to normalise non-English user queries before ChromaDB retrieval
    so the English-optimised embedding model produces accurate results.
    The original-language query is still used for the final LLM response.

    Returns the original text unchanged if:
    • the text is already English (detected by a cheap heuristic), or
    • the Groq call fails for any reason (graceful degradation).
    """
    # Quick heuristic: if every character is ASCII (or common punctuation),
    # it's almost certainly English already — skip the translation call.
    non_ascii = sum(1 for ch in text if ord(ch) > 127)
    if non_ascii == 0:
        return text

    try:
        client = _get_client()
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",   # fast + cheap — only used for translation
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a translation engine. The user will send text in "
                        "Kannada, Hindi, Tamil, Telugu, or another Indian language. "
                        "Your ONLY job is to output the English translation of that text. "
                        "Rules:\n"
                        "- Output ONLY the English translation. Nothing else.\n"
                        "- Do NOT include any prefix, explanation, or quotes.\n"
                        "- Do NOT say 'Translation:', 'English:', or similar.\n"
                        "- Translate loanwords phonetically if needed "
                        "(e.g., \u0cae\u0cbe\u0cb8\u0ccd\u0c95\u0ccd = mask, \u0c92\u0ca1\u0cbe\u0ca1 = run/jog).\n"
                        "- Even single-word or short inputs must be translated to English."
                    ),
                },
                {"role": "user", "content": text},
            ],
            temperature=0.0,
            max_tokens=256,
        )
        translated = (resp.choices[0].message.content or "").strip()
        logger.info(
            "[llm_client] translate_to_english | original=%.60s… | translated=%.60s…",
            text, translated,
        )
        return translated if translated else text
    except Exception as exc:
        logger.warning("[llm_client] translate_to_english failed (%s) — using original query", exc)
        return text


def generate_response(
    query: str,
    context: str,
    language: str = "en",
    conversation_history: list[dict[str, str]] | None = None,
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int | None = None,   # if None, uses per-language default from _LANG_MAX_TOKENS
) -> str:
    """
    Generate a grounded, safety-aware LLM response via Groq.

    Parameters
    ──────────
    query                : the user's current question
    context              : assembled RAG context from context_builder.assemble_context()
    language             : response language — 'en', 'kn' (Kannada), or 'hi' (Hindi)
    conversation_history : list of prior {"role": "user"|"assistant", "content": "..."}
                           dicts — used to resolve follow-up questions naturally
    model                : override the default Groq model
    temperature          : sampling temperature (lower = more deterministic / safer)
    max_tokens           : max tokens in completion

    Returns
    ───────
    The assistant's reply as a plain string.
    Raises EnvironmentError if GROQ_API_KEY is missing.
    """
    client = _get_client()

    lang_instruction = _LANG_INSTRUCTIONS.get(
        language, _LANG_INSTRUCTIONS["en"]
    )
    system_content = _SYSTEM_TEMPLATE.format(
        lang_instruction=lang_instruction,
        context=context,
    )

    # Resolve max_tokens: caller override > per-language default > English default
    resolved_max_tokens = (
        max_tokens
        if max_tokens is not None
        else _LANG_MAX_TOKENS.get(language, _LANG_MAX_TOKENS["en"])
    )

    # Build messages: system + (optional) history + current query
    messages: list[dict[str, Any]] = [{"role": "system", "content": system_content}]

    if conversation_history:
        # Keep the last 6 turns (3 user + 3 assistant) to respect context limits
        messages.extend(conversation_history[-6:])

    messages.append({"role": "user", "content": query})

    logger.info(
        "[llm_client] Groq call | model=%s | lang=%s | history_turns=%d | query=%.60s…",
        model or _DEFAULT_MODEL,
        language,
        len(conversation_history or []),
        query,
    )

    response = client.chat.completions.create(
        model=model or _DEFAULT_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=resolved_max_tokens,
    )
    return response.choices[0].message.content or ""
