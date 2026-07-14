#!/usr/bin/env python3
"""
scripts/test_chat.py
─────────────────────
End-to-end smoke test for the POST /api/v1/chat endpoint.

Sends 5 requests covering:
  1. English  — general outdoor activity question
  2. Kannada  — mask usage question
  3. Hindi    — elderly person query
  4. Multi-turn follow-up  — reuses session_id from request 1
  5. Bad station_id        — tests the 400 error path

Usage
─────
    # Server must be running first:
    #   .venv/bin/uvicorn app.main:app --port 8080 --reload
    #
    python scripts/test_chat.py [base_url] [station_id]

    # defaults:
    #   base_url   = http://localhost:8080
    #   station_id = 2553
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import requests

# ── config ────────────────────────────────────────────────────────────────────
BASE_URL   = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
STATION_ID = sys.argv[2] if len(sys.argv) > 2 else "2553"
ENDPOINT   = f"{BASE_URL}/api/v1/chat"
TIMEOUT    = 60  # Groq can take a moment on first call


# ── helpers ───────────────────────────────────────────────────────────────────

def _divider(char: str = "═", width: int = 72) -> str:
    return char * width


def post_chat(
    query: str,
    station_id: str = STATION_ID,
    language: str = "en",
    session_id: str | None = None,
    expect_error: bool = False,
) -> dict | None:
    payload: dict = {
        "query":      query,
        "station_id": station_id,
        "language":   language,
    }
    if session_id:
        payload["session_id"] = session_id

    try:
        resp = requests.post(ENDPOINT, json=payload, timeout=TIMEOUT)
    except requests.exceptions.ConnectionError:
        print(f"  ❌  Cannot connect to {ENDPOINT}")
        print("      Make sure the server is running:")
        print("      .venv/bin/uvicorn app.main:app --port 8080\n")
        return None

    if expect_error:
        print(f"  Status  : {resp.status_code}  (expected non-200)")
        try:
            body = resp.json()
            print(f"  Detail  : {body.get('detail', body)}")
        except Exception:
            print(f"  Body    : {resp.text[:300]}")
        return None

    if resp.status_code != 200:
        print(f"  ❌  HTTP {resp.status_code}: {resp.text[:300]}")
        return None

    return resp.json()


def print_response(data: dict, label: str = "") -> None:
    if label:
        print(f"  [{label}]")
    print(f"  Response   : {data.get('response', '')}")
    print(f"  Session ID : {data.get('session_id', '')}")
    print(f"  Sources    : {data.get('sources', [])}")
    aqi = data.get("aqi_context")
    if aqi:
        print(f"  AQI ctx    : AQI={aqi.get('aqi')} | {aqi.get('category')} | {aqi.get('station_id')}")
    else:
        print("  AQI ctx    : (Java service offline — expected in local test)")


# ─────────────────────────────────────────────────────────────────────────────
# Test cases
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    print(_divider())
    print(f"  RAG Chat Endpoint Smoke Test")
    print(f"  Endpoint : {ENDPOINT}")
    print(f"  Station  : {STATION_ID}")
    print(_divider())

    session_id_for_followup: str | None = None

    # ── Test 1: English — outdoor jog ─────────────────────────────────────────
    print(f"\n{_divider('─')}")
    print("  TEST 1/5 — English | general | outdoor activity")
    print(f'  Query: "Is it safe to go for a morning jog today?"')
    print(_divider("─"))
    data = post_chat("Is it safe to go for a morning jog today?", language="en")
    if data:
        print_response(data, "en")
        session_id_for_followup = data.get("session_id")

    # ── Test 2: Kannada — mask usage ─────────────────────────────────────────
    print(f"\n{_divider('─')}")
    print("  TEST 2/5 — Kannada | general | mask question")
    print('  Query: "ಇಂದು ಹೊರಗೆ ಹೋದಾಗ ಮಾಸ್ಕ್ ಧರಿಸಬೇಕೇ?"')
    print("         (Should I wear a mask when going outside today?)")
    print(_divider("─"))
    data = post_chat(
        "ಇಂದು ಹೊರಗೆ ಹೋದಾಗ ಮಾಸ್ಕ್ ಧರಿಸಬೇಕೇ?",
        language="kn",
    )
    if data:
        print_response(data, "kn")

    # ── Test 3: Hindi — elderly person ───────────────────────────────────────
    print(f"\n{_divider('─')}")
    print("  TEST 3/5 — Hindi | elderly | outdoor safety")
    print('  Query: "मेरी दादी 75 साल की हैं, क्या वे बाहर जा सकती हैं?"')
    print("         (My grandmother is 75, can she go outside?)")
    print(_divider("─"))
    data = post_chat(
        "मेरी दादी 75 साल की हैं, क्या वे बाहर जा सकती हैं?",
        language="hi",
    )
    if data:
        print_response(data, "hi")

    # ── Test 4: Multi-turn follow-up ─────────────────────────────────────────
    print(f"\n{_divider('─')}")
    print("  TEST 4/5 — English | multi-turn follow-up | same session")
    print('  Query: "What if I jog early morning before 6am, is it better?"')
    print(f"  Session ID: {session_id_for_followup or '(no prior session)'}")
    print(_divider("─"))
    if session_id_for_followup:
        data = post_chat(
            "What if I jog early morning before 6am, is it better?",
            language="en",
            session_id=session_id_for_followup,
        )
    else:
        # No session from test 1 (server offline etc.) — run without
        data = post_chat(
            "What if I jog early morning before 6am, is it better?",
            language="en",
        )
    if data:
        print_response(data, "follow-up")
        # Verify session_id is the same
        returned_sid = data.get("session_id")
        if session_id_for_followup and returned_sid == session_id_for_followup:
            print(f"  ✅ Session ID matches — conversation history preserved")
        elif session_id_for_followup:
            print(f"  ⚠  Session ID mismatch: got {returned_sid}")

    # ── Test 5: Bad station_id — should 400 ──────────────────────────────────
    print(f"\n{_divider('─')}")
    print("  TEST 5/5 — Bad station_id → expect HTTP 400 error")
    print('  Query: "Is it safe outside?" | station_id: "INVALID-STATION-XYZ"')
    print(_divider("─"))
    post_chat(
        "Is it safe outside?",
        station_id="INVALID-STATION-XYZ",
        language="en",
        expect_error=True,
    )

    print(f"\n{_divider()}")
    print("  All tests complete.")
    print(_divider())


if __name__ == "__main__":
    main()
