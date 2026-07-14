#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"
WRAPPER_PROPS="$BACKEND_DIR/.mvn/wrapper/maven-wrapper.properties"

# ── Load .env so Spring Boot can resolve ${DATABASE_URL}, ${DB_USER}, etc. ──
if [ -f "$BACKEND_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$BACKEND_DIR/.env"
  set +a
fi

if [ ! -x "$BACKEND_DIR/mvnw" ] || [ ! -f "$WRAPPER_PROPS" ]; then
  if command -v mvn > /dev/null 2>&1; then
    exec mvn -f "$BACKEND_DIR/pom.xml" -DskipTests spring-boot:run
  fi

  echo "Neither a complete backend/mvnw setup nor mvn was available." >&2
  exit 1
fi

cd "$BACKEND_DIR"
./mvnw -q -DskipTests dependency:go-offline
exec ./mvnw spring-boot:run