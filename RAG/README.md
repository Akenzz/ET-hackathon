# RAG Service — Air Quality Health Advisory

A FastAPI-based Retrieval-Augmented Generation (RAG) service that answers health questions about air quality in natural language (English, Hindi, Kannada). It integrates with a Java data backend and an AI forecasting service, queries a ChromaDB vector store of health guidelines, and calls the Groq LLM to generate context-aware responses.

---

## Architecture

```
User Query
    │
    ▼
POST /api/v1/chat
    │
    ├── Input guardrail (block off-topic / harmful)
    ├── Station validation (via Java /stations)
    │
    ├── assemble_context()
    │       ├── java_client  → GET /readings/latest?stationId=<id>    (live AQI)
    │       ├── ai_client    → GET /forecast/<id>                      (24h forecast)
    │       ├── ai_client    → GET /attribution/<id>                   (source breakdown)
    │       ├── population_classifier                                  (general/elderly/…)
    │       └── ChromaDB retrieval                                     (guideline chunks)
    │
    ├── generate_response()  →  Groq LLM (llama-3.3-70b-versatile)
    └── Response safety check
```

**Services and ports**

| Service | Port | Purpose |
|---|---|---|
| RAG (this service) | `8002` | Chat endpoint + RAG pipeline |
| Java backend | `8000` | AQI readings, stations, forecast data |
| AI service | `8001` | XGBoost AQI forecast + source attribution |

---

## Project Structure

```
RAG/
├── app/
│   ├── clients/
│   │   ├── java_client.py     # HTTP client for the Java backend (port 8000)
│   │   └── ai_client.py       # HTTP client for the AI service (port 8001)
│   ├── routers/
│   │   └── chat.py            # POST /api/v1/chat endpoint
│   └── services/
│       ├── context_builder.py # Assembles LLM context from all sources
│       ├── retrieval.py       # ChromaDB vector search
│       ├── guardrails.py      # Input/output safety checks
│       ├── llm_client.py      # Groq LLM wrapper
│       └── population_classifier.py
├── data/
│   ├── chroma_db/             # Persisted ChromaDB vector store
│   └── health_guidelines/     # Source markdown/text files for ingestion
├── scripts/
│   ├── run_ingestion.py       # One-time: ingest guidelines into ChromaDB
│   ├── test_chat.py           # End-to-end smoke test (5 queries via HTTP)
│   └── test_integration.py   # Context assembly test (no server needed)
├── .env                       # Environment variables (see below)
├── requirements.txt
└── run_linux.sh               # Start script for Linux
```

---

## Setup

### 1. Create and activate the virtual environment

```bash
cd /path/to/et-hack/RAG
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Key variables:

```env
# Groq LLM
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Upstream services
JAVA_SERVICE_URL=http://localhost:8000
AI_SERVICE_URL=http://localhost:8001

# ChromaDB
CHROMA_DB_PATH=data/chroma_db
CHROMA_COLLECTION=aqi_health_guidelines

# Embedding model
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Set to "production" to disable debug output in API responses
APP_ENV=development
```

### 3. Ingest health guidelines (one-time)

```bash
cd RAG/
.venv/bin/python scripts/run_ingestion.py
```

This reads files from `data/health_guidelines/`, embeds them, and writes to ChromaDB at `data/chroma_db/`.

---

## Running the Server

```bash
cd RAG/
.venv/bin/uvicorn app.main:app --port 8002 --reload
```

Or use the convenience script:

```bash
bash run_linux.sh
```

The API will be available at: `http://localhost:8002`

Interactive docs: `http://localhost:8002/docs`

---

## API

### `POST /api/v1/chat`

**Request body:**

```json
{
  "query":      "Is it safe to go for a morning jog today?",
  "station_id": "2553",
  "language":   "en",
  "session_id": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | ✅ | Health question (1–2000 chars) |
| `station_id` | string | ✅ | Monitoring station ID (e.g. `"2553"`) |
| `language` | string | no | `"en"` (default), `"hi"`, `"kn"` |
| `session_id` | string | no | Reuse for multi-turn conversations |

**Response:**

```json
{
  "response":    "With an AQI of 246 (Poor), outdoor jogging is unsafe...",
  "aqi_context": {
    "station_id": "2553",
    "aqi":        246,
    "category":   "Poor",
    "pm25":       58.3,
    "pm10":       95.1,
    "no2":        null,
    "timestamp":  "2026-07-14T17:00:00"
  },
  "sources":    ["Outdoor Activities > Can I go jogging or running?"],
  "session_id": "5de6f20c-...",
  "debug": {
    "context_sent_to_llm": "USER QUERY: ...\n### Current Air Quality...",
    "chunks": [
      {
        "section":      "Outdoor Activities > Can I go jogging or running?",
        "score":        0.8912,
        "aqi_category": "Poor",
        "population":   "general",
        "text_snippet": "When AQI exceeds 200..."
      }
    ]
  }
}
```

> `debug` is only populated when `APP_ENV=development` (the default). Set `APP_ENV=production` to omit it.

**Supported languages:**

| Code | Language |
|---|---|
| `en` | English (default) |
| `hi` | Hindi |
| `kn` | Kannada |

---

## Testing

### Option A — End-to-end smoke test (requires server + Java backend running)

```bash
cd RAG/
.venv/bin/python scripts/test_chat.py [base_url] [station_id]

# Default: http://localhost:8002  station: DEL-001
# Example:
.venv/bin/python scripts/test_chat.py http://localhost:8080 2553
```

Runs 5 tests:
1. English — morning jog question
2. Kannada — mask question
3. Hindi — elderly person question
4. Multi-turn follow-up (reuses session ID from test 1)
5. Invalid station ID → expects HTTP 400

### Option B — Context assembly test (no server needed, Java/AI optional)

```bash
cd RAG/
.venv/bin/python scripts/test_integration.py [station_id]

# Example:
.venv/bin/python scripts/test_integration.py 2553
```

Calls `assemble_context()` directly and prints:
- Raw JSON from `java_client` and `ai_client` (to verify field mappings)
- The full assembled context string that would be sent to the LLM

Useful for debugging upstream service response shapes without needing the full HTTP stack.

### Option C — Quick curl test

```bash
curl -X POST http://localhost:8002/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Is it safe to go for a morning jog today?",
    "station_id": "2553",
    "language": "en"
  }' | python3 -m json.tool
```

---

## Service Dependencies

The RAG service degrades gracefully when upstream services are unavailable:

| Service | If offline | Effect |
|---|---|---|
| Java backend (`:8000`) | Station validation skipped; AQI context `null` | LLM uses fallback AQI=100 for chunk retrieval |
| AI service (`:8001`) | Forecast + attribution sections omitted | LLM still answers using live AQI + guidelines |
| ChromaDB | No guideline chunks retrieved | Fallback generic safety message returned |
| Groq LLM | HTTP 503 returned | — |

---

## Field Mapping Notes

### Java `/readings/latest?stationId=<id>` response
```json
{
  "stationId":  "2553",
  "aqi":        246,
  "timestamp":  "2026-07-14T17:00:00",
  "pollutants": { "pm25": 58.3, "pm10": 95.1, "no2": null, "so2": null, "co": null, "o3": null }
}
```
> ⚠ No `category` field — derived by the RAG service using the CPCB scale.

### AI `/forecast/<id>` response
```json
{
  "stationId":   "2553",
  "stationName": "Station Name",
  "forecast": [
    { "ts": "2026-07-14T18:00:00", "aqi_predicted": 251.3,
      "confidence_low": 242.0, "confidence_high": 260.6, "category": "Poor" }
  ]
}
```

### AI `/attribution/<id>` response
```json
{
  "stationId":          "2553",
  "likelySource":       "Traffic",
  "confidence":         0.47,
  "contributingFactors": ["High PM2.5/PM10 ratio", "Peak traffic hours"]
}
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Station 'X' was not found` | Station not in Java DB, or `stationId` param wrong | Check Java `/stations` returns your station; verify station_id value |
| `Available stations: none returned` | `stationId` param sent as `station_id` (snake_case) | Ensure `java_client.py` uses `stationId` (camelCase) |
| `aqi_context.category` is `""` | Java DTO has no category field | Fixed in `context_builder._aqi_to_category()` |
| Forecast shows `+?h → AQI ?` | Wrong field names (`hour`/`aqi` vs `ts`/`aqi_predicted`) | Fixed in `_fmt_forecast()` |
| Attribution shows `Unknown` | Wrong field name (`dominant_source` vs `likelySource`) | Fixed in `_fmt_attribution()` |
| `ChromaDB path not found` | Ingestion not run | Run `scripts/run_ingestion.py` first |
