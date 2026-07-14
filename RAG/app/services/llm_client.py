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
        "Use simple, clear Kannada that is easy for the general public to understand."
    ),
    "hi": (
        "Respond entirely in Hindi (हिंदी). "
        "Use simple, clear Hindi that is easy for the general public to understand."
    ),
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
4. Keep your response to 3–5 sentences. Be concise and direct.
5. If the question asks for a specific medical diagnosis, medication name, or
   treatment recommendation, politely decline that specific part and redirect:
   "For specific medical advice, please consult a qualified doctor."
6. If the context mentions a dominant pollution source or forecast trend,
   mention it to help the user understand why the conditions are what they are.

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


def generate_response(
    query: str,
    context: str,
    language: str = "en",
    conversation_history: list[dict[str, str]] | None = None,
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 512,
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
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""
