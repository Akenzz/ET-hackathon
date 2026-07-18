# AQI Command Center — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS 4 frontend for the AI-Powered Urban Air Quality Intelligence platform. Hyperlocal AQI prediction, source-attribution reasoning, citizen health advisory, and an admin model-retraining panel, built for a mixed live/mock data architecture.

---

## Tech Stack

- **Framework:** Next.js (App Router), TypeScript
- **Styling:** Tailwind CSS 4 (CSS-based `@theme`, no `tailwind.config.js`)
- **Map:** `react-leaflet` + `react-leaflet-cluster`
- **Charts:** `recharts` (forecast chart)
- **Icons:** `lucide-react`
- **HTTP:** `axios` (all calls funneled through one file)

---

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # then edit as needed — see Env Reference below
npm run dev
```

> Runs entirely on mock data out of the box — no backend required to explore the UI.

---

## Architecture

```
Component (UI)
      ↓
lib/api.ts   ← the ONLY file that calls axios. Nothing else does.
      ↓
   ┌──────────────┬──────────────┬──────────────┐
   ↓              ↓              ↓
 Java (:8000)   AI service    RAG service
 stations,      (:8001)       (:8002)
 readings,      forecast,     POST /api/v1/chat
 weather, geo   attribution,
                retrain,
                health-advisory
```

Every component fetches data exclusively through named functions in `lib/api.ts` — **never** axios directly, **never** `lib/mockData.ts` directly. This keeps the mock/live decision, and the real-API field-name translation, in one place.

### Three Independent Backend Services

| Service | Default URL | Owns |
|---|---|---|
| **Java** | `http://localhost:8000` | `/stations`, `/readings/latest`, `/readings/history`, `/weather/latest`, `/geo/features` |
| **AI service** | `http://localhost:8001` | `/forecast/{id}`, `/attribution/{id}`, `/retrain/{id}`, `/health-advisory/{id}` |
| **RAG service** | `http://localhost:8002` | `POST /api/v1/chat` |

> ⚠️ **Naming collision:** Java also exposes a path called `/forecast/{id}` — but it means something completely different there (a raw feature vector for ML model input, not a prediction). The AI service's `/forecast/{id}` is the one that returns the actual predicted AQI. Don't conflate the two; see the warning comment directly above `getForecast()` in `lib/api.ts`.

### Real Backends Use camelCase; the Frontend Stays snake_case Internally

Java and the AI service both use camelCase on the wire (`stationId`, `likelySource`, `contributingFactors`, etc.) — confirmed via the backend teams' own troubleshooting notes. Rather than let that leak through the whole app, `lib/api.ts` translates every real response into a stable, snake_case internal shape (defined in `lib/types.ts`). Components only ever see the internal shape — if a real field name changes, only `lib/api.ts` needs updating, not every component that displays that data.

---

## Mock vs. Live Data — How Routing Actually Works

Two layers, not one:

1. **Global switch** — `NEXT_PUBLIC_USE_MOCKS` in `.env.local`. `"false"` allows real calls to be attempted at all. Anything else forces 100% mock data everywhere, regardless of the next point.
2. **Per-station allowlist** — `lib/liveStations.ts` (`LIVE_STATION_IDS`). Even with the global switch off, only stations in this list ever attempt a real call. Every other station stays on mock data **permanently** — this is the actual final architecture (a handful of real Delhi stations proving the pipeline end-to-end, mock data providing coverage across the rest of India for the demo), not a temporary bootstrapping state.

**Currently live:** `2553` (Anand Vihar), `2554` (Mandir Marg), `2556` (RK Puram), `3715` (ITO) — confirmed real station IDs from the team.

> The station **list** itself (`getStations()`) always returns the curated list in `lib/mockData.ts`, even in live mode — Java's real `/stations` only knows about Delhi-area stations from a WAQI city search, so switching to it would collapse map coverage down to Delhi only. This is intentional, and documented in `lib/api.ts`.

### Per-Station Data-Source Badge

`StationPanel` shows a real three-state badge, not just "is this ID on the live list":

| State | Meaning |
|---|---|
| **Demo** | Not a live station, or mocks are globally forced |
| **Live** | Live station, real fetch actually succeeded |
| **Offline** | Live station, real fetch was attempted and failed |

The map also reflects this: a station with no reading renders as a neutral dashed-gray marker, not green (an earlier bug defaulted missing readings to AQI 0, which rendered as misleadingly "Good").

---

## Env File Reference

```dotenv
# "false" allows real calls for stations in LIVE_STATION_IDS.
# Anything else (or unset) forces 100% mock data everywhere.
NEXT_PUBLIC_USE_MOCKS=false

NEXT_PUBLIC_JAVA_API_URL=http://localhost:8000
NEXT_PUBLIC_AI_API_URL=http://localhost:8001
NEXT_PUBLIC_RAG_API_URL=http://localhost:8002

# Optional — defaults to 60000 (60s) if unset.
NEXT_PUBLIC_POLL_INTERVAL_MS=60000
```

---

## App Structure

```
app/
├── layout.tsx              Root layout, fonts (Space Grotesk / Inter / IBM Plex Mono)
├── page.tsx                Top-level state: stations, readings, geolocation, view/role routing
└── globals.css              Color tokens, fixed CPCB AQI band colors, marker-cluster theming

components/
├── Dashboard.tsx            Landing view — role selection, national/city stats, hotspot list
├── Header.tsx               Live/demo station count, last-updated timestamp
├── AqiMap.tsx                Leaflet map, clustering, CPCB-colored markers, no-data state
├── AqiLegend.tsx             Fixed AQI severity color key
├── StationPanel.tsx          Station drill-down: AQI, Predict AQI flow, pollutants
├── ForecastChart.tsx         Recharts area chart for the prediction curve
├── AttributionBadge.tsx      "Why this prediction" reasoning card
├── HealthAdvisory.tsx        Audience-segmented advisory display
├── ChatWidget.tsx            Floating chat, multi-turn session tracking, EN/HI/KN
├── AdminPanel.tsx            Per-station and bulk model retraining (Engineer role)
└── ErrorNotice.tsx           Shared error banner with optional retry

lib/
├── api.ts                   Single source of truth for every network call
├── types.ts                  Frontend-internal TypeScript shapes
├── mockData.ts                Deterministic mock generators, one per endpoint
├── liveStations.ts            Which station IDs are allowed to attempt real calls
├── aqi.ts                    Fixed CPCB AQI bands/colors, source-label formatting
├── geo.ts                     Haversine distance, nearest-station lookup, geolocation wrapper
├── role.ts                    Citizen/Engineer role, persisted to localStorage
└── modelMetrics.ts             RMSE display, reports "pending" until real numbers exist
```

---

## Key Features

### 🎯 Predict AQI (the headline interaction)

`StationPanel` does **not** auto-fetch a forecast on station select. A "Predict AQI" button explicitly triggers the AI service call — makes the React → FastAPI → model round-trip visible in a demo instead of happening invisibly on load.

On success, it immediately chains into fetching source attribution, displayed directly below as **"Why this prediction."**

> ⚠️ This ordering isn't optional — attribution reads from a cache the forecast call populates; calling attribution first would fail.

### 👥 Citizen vs. Engineer Roles

Chosen once on the Dashboard, persisted across sessions.

- **Citizen:** simplified view
- **Engineer:** reveals denser technical detail throughout — station IDs, exact timestamps, raw pollutant precision, raw confidence decimals — plus an admin model-retraining panel with per-station and bulk-retrain (3 concurrent) controls

### 📍 Geolocation-First Map

On load, the app requests browser location, finds the nearest station via haversine distance, and flies the map there at city zoom — auto-opening that station's panel.

Falls back gracefully to a zoomed-out, clustered all-India view if location is denied or unavailable. "Locate me" and "All-India view" controls let the user re-trigger either state manually.

### 🏥 Health Advisory

`components/HealthAdvisory.tsx` renders the AI service's confirmed `/health-advisory/{id}` response:

- Peak-AQI situation summary
- Vulnerable-infrastructure stats (hospitals, schools, industrial zones, etc.)
- Audience-segmented guidance (General Public, School Administrators, Elderly Citizens, Outdoor Workers, Public Transport Commuters), each with a message and recommendation list

`lib/api.ts` has a working `getHealthAdvisory()` with full mock support. Same cache dependency as attribution: **forecast must be fetched first.**

---

## Known Gaps / Unconfirmed Contracts

- `/readings/history`, `/weather/latest`, `/geo/features` (Java) — field mapping assumed consistent with `/readings/latest`'s confirmed camelCase pattern, not independently verified
- `POST /retrain/{id}` response shape — path confirmed, exact response body still a guess
- `AttributionBadge` / `getSourceLabel` handle unknown source values via a generic fallback, since only `"Traffic"` is confirmed against the real service; other categories (`Industrial`, `Construction`, etc.) are best-guess

---

## Scripts

```bash
npm run dev      # local dev server
npm run build    # production build, also surfaces type errors
npm run start    # serve a production build
```
