#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RAG_DIR="$SCRIPT_DIR"
VENV_DIR="$REPO_DIR/.venv"
PYTHON_BIN="$VENV_DIR/bin/python"

if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_CMD=""
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
  fi

  if [ -z "$PYTHON_CMD" ]; then
    echo "Python 3 is required to create the shared .venv, but no python executable was found." >&2
    exit 1
  fi

  "$PYTHON_CMD" -m venv "$VENV_DIR"
fi

"$PYTHON_BIN" -m pip install --upgrade pip
"$PYTHON_BIN" -m pip install -r "$REPO_DIR/requirements.txt"

cd "$RAG_DIR"
exec "$PYTHON_BIN" -m uvicorn app.main:app --reload --port 8002