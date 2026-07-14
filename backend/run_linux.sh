#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"

if [ ! -x "$BACKEND_DIR/mvnw" ]; then
  if command -v mvn >/dev/null 2>&1; then
    exec mvn -f "$BACKEND_DIR/pom.xml" -DskipTests spring-boot:run
  fi

  echo "Neither backend/mvnw nor mvn was available." >&2
  exit 1
fi

cd "$BACKEND_DIR"
./mvnw -q -DskipTests dependency:go-offline
exec ./mvnw spring-boot:run