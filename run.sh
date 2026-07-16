#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR"

declare -a PIDS=()

cleanup() {
  local exit_code=$?

  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done

  wait 2>/dev/null || true
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

bash "$REPO_DIR/backend/run_linux.sh" &
PIDS+=("$!")

bash "$REPO_DIR/AI/run_linux.sh" &
PIDS+=("$!")

bash "$REPO_DIR/RAG/run_linux.sh" &
PIDS+=("$!")

wait -n