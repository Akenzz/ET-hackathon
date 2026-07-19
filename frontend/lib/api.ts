import axios from "axios";
import type {
  Station, LatestReading, HistoryPoint, WeatherLatest,
  GeoFeatures, Forecast, Attribution, ChatResponse, RetrainResponse, HealthAdvisory,
} from "./types";
import {
  MOCK_STATIONS, mockLatest, mockHistory, mockWeather,
  mockGeoFeatures, mockForecast, mockAttribution, mockChatResponse, mockHealthAdvisory,
} from "./mockData";
import { isLiveStation } from "./liveStations";
import { getAqiBand } from "./aqi";

// Three independent upstream services, confirmed via the RAG service's
// readme (which documents real field shapes for all three, including
// bugs the RAG team already hit and fixed against the live Java/AI
// services):
//   Java (D)   -> stations, readings, weather, geo   — camelCase on the wire
//   AI (B)     -> forecast, attribution                — camelCase on the wire
//   RAG (A)    -> chat                                  — its own shape, port 8002, /api/v1/chat
const JAVA_BASE_URL = process.env.NEXT_PUBLIC_JAVA_API_URL ?? "http://localhost:8000";
const AI_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL ?? "http://localhost:8001";
const RAG_BASE_URL = process.env.NEXT_PUBLIC_RAG_API_URL ?? "http://localhost:8002";

const FORCE_ALL_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

const javaClient = axios.create({ baseURL: JAVA_BASE_URL, timeout: 8000 });
const aiClient = axios.create({ baseURL: AI_BASE_URL, timeout: 15000 });
const ragClient = axios.create({ baseURL: RAG_BASE_URL, timeout: 20000 });

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

function useMockFor(stationId: string): boolean {
  return FORCE_ALL_MOCKS || !isLiveStation(stationId);
}

export function isMockModeForced(): boolean {
  return FORCE_ALL_MOCKS;
}

export async function getStations(): Promise<Station[]> {
  await wait();
  // DELIBERATE: Java's real GET /stations exists, but it only returns
  // Delhi-area stations (from WAQI's city search, configured via
  // waqi.city=Delhi) — not our multi-city curated list. Switching to it
  // would collapse the map down to Delhi-only. Keeping the curated list
  // for map breadth; only readings/forecast/attribution for the 4 live
  // station IDs are ever real.
  return MOCK_STATIONS;
}

// --- Java (camelCase on the wire — confirmed via RAG's troubleshooting notes) ---

export async function getLatestReading(stationId: string): Promise<LatestReading> {
  if (useMockFor(stationId)) { await wait(); return mockLatest(stationId); }
  const res = await javaClient.get("/readings/latest", { params: { stationId } });
  const raw = res.data;
  // Java's real response has no `category` field and uses `stationId` — map
  // into our stable internal shape.
  return {
    station_id: raw.stationId,
    timestamp: raw.timestamp,
    aqi: raw.aqi,
    pollutants: raw.pollutants,
  };
}

export async function getHistory(stationId: string, from: string, to: string): Promise<HistoryPoint[]> {
  if (useMockFor(stationId)) { await wait(); return mockHistory(stationId); }
  const res = await javaClient.get("/readings/history", { params: { stationId, from, to } });
  // Applying the same camelCase assumption as /readings/latest — unconfirmed
  // for this specific endpoint, adjust if it turns out to differ.
  return res.data;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherLatest> {
  if (FORCE_ALL_MOCKS) { await wait(); return mockWeather(); }
  const res = await javaClient.get("/weather/latest", { params: { lat, lon } });
  const raw = res.data;
  // Real fields: temperature, humidity, windSpeed, windDirection,
  // precipitation, pressure — not what we originally guessed.
  return {
    temp_c: raw.temperature,
    humidity: raw.humidity,
    wind_speed_kmh: raw.windSpeed,
    wind_dir_deg: raw.windDirection,
    precip_mm: raw.precipitation,
    pressure_hpa: raw.pressure,
  };
}

export async function getGeoFeatures(lat: number, lon: number): Promise<GeoFeatures> {
  if (FORCE_ALL_MOCKS) { await wait(); return mockGeoFeatures(lat + "," + lon); }
  // Note: real endpoint takes only lat/lon — radius is hardcoded to 2000m
  // server-side, there's no radius_km param to send.
  const res = await javaClient.get("/geo/features", { params: { lat, lon } });
  const raw = res.data;
  return {
    major_roads_count: raw.majorRoadsCount,
    construction_sites_count: raw.constructionSitesCount,
    industrial_zones_count: raw.industrialZonesCount,
    nearest_industrial_dist_km: raw.nearestIndustrialDistanceKm,
    hospital_count: raw.hospitalCount,
    school_count: raw.schoolCount,
    kindergarten_count: raw.kindergartenCount,
    park_count: raw.parkCount,
    bus_stop_count: raw.busStopCount,
    market_count: raw.marketCount,
    last_fetched: raw.lastFetched,
  };
}

// --- AI service (port 8001, camelCase, confirmed via RAG's field-mapping notes) ---
//
// ⚠️  DO NOT point this at JAVA_BASE_URL. Java ALSO exposes a path called
// /forecast/{stationId} (on port 8000), but it means something completely
// different there: a raw feature vector (aqiHistory + weatherForecast +
// geoFeatures) meant as ML model INPUT, not a prediction. This function
// must stay on aiClient (port 8001), which returns actual predicted AQI
// values. Same-looking path, different service, different purpose — easy
// mistake to reintroduce later if this routing gets "simplified."
// Confirmed by the AI service's own readme: it internally calls Java's
// /forecast/{station_id} exactly once to build its feature vector, then
// runs XGBoost recursively for a fixed 24h horizon. There's no configurable
// `hours` param on the real endpoint — it always forecasts 24h ahead.

const DEFAULT_FORECAST_HOURS = 24;

export async function getForecast(stationId: string, hours: number = DEFAULT_FORECAST_HOURS): Promise<Forecast> {
  if (useMockFor(stationId)) { await wait(400); return mockForecast(stationId, hours); }
  // Real endpoint takes no query params — always a fixed 24h horizon.
  const res = await aiClient.get("/forecast/" + stationId);
  const raw = res.data;
  return {
    station_id: raw.stationId,
    station_name: raw.stationName,
    predictions: (raw.forecast ?? []).map((p: any) => ({
      ts: p.ts,
      aqi_predicted: p.aqi_predicted,
      confidence_low: p.confidence_low,
      confidence_high: p.confidence_high,
      category: p.category,
    })),
  };
}

// ⚠️  Attribution reads from an in-memory cache that ONLY gets populated by
// a prior call to getForecast() for the same station — there is no
// independent data path. Calling this before getForecast() for a station
// will fail (cache miss). Our StationPanel "Predict AQI" flow already calls
// getForecast() then getAttribution() in that exact order — do not reorder.
export async function getAttribution(stationId: string): Promise<Attribution> {
  if (useMockFor(stationId)) { await wait(400); return mockAttribution(stationId); }
  const res = await aiClient.get("/attribution/" + stationId);
  const raw = res.data;
  // Real shape: { stationId, likelySource, confidence, contributingFactors }
  return {
    station_id: raw.stationId,
    likely_source: raw.likelySource,
    confidence: raw.confidence,
    contributing_factors: raw.contributingFactors ?? [],
  };
}

export async function postRetrainStation(stationId: string): Promise<RetrainResponse> {
  if (useMockFor(stationId)) {
    await wait(3000 + Math.random() * 2000);
    if (Math.random() < 0.08) {
      return { station_id: stationId, status: "error", trained_at: new Date().toISOString(), message: "Training data unavailable for this station." };
    }
    return { station_id: stationId, status: "success", trained_at: new Date().toISOString() };
  }
  // Confirmed path is /retrain/{id} — no /admin prefix, corrected from an
  // earlier unconfirmed guess. Exact response shape still unconfirmed.
  const res = await aiClient.post<RetrainResponse>("/retrain/" + stationId);
  return res.data;
}

// GET /health-advisory/{station_id} on the AI service (distinct from RAG's
// conversational /chat) — a structured advisory report segmented by
// audience. Same cache dependency as attribution: forecast must already be
// cached for this station (our "Predict AQI" flow guarantees this before
// this function is ever called).
export async function getHealthAdvisory(stationId: string): Promise<HealthAdvisory> {
  if (useMockFor(stationId)) { await wait(700); return mockHealthAdvisory(stationId); }
  const res = await aiClient.get("/health-advisory/" + stationId);
  const raw = res.data;
  console.log("Raw health advisory response:", raw);
  return {
    station_id: raw.stationId,
    station_name: raw.stationName,
    highest_forecast_aqi: raw.highestForecastAQI.aqi_predicted,
    vulnerability: {
      major_roads_count: raw.vulnerability.majorRoadsCount,
      construction_sites_count: raw.vulnerability.constructionSitesCount,
      industrial_zones_count: raw.vulnerability.industrialZonesCount,
      nearest_industrial_dist_km: raw.vulnerability.nearestIndustrialDistKm,
      hospital_count: raw.vulnerability.hospitalCount,
      school_count: raw.vulnerability.schoolCount,
      kindergarten_count: raw.vulnerability.kindergartenCount,
      park_count: raw.vulnerability.parkCount,
      bus_stop_count: raw.vulnerability.busStopCount,
      market_count: raw.vulnerability.marketCount,
    },
    advisories: raw.advisory.advisories,
    situation: {
      station: raw.stationName,
      highest_forecast_aqi: raw.highestForecastAQI.aqi_predicted,
      expected_time: raw.highestForecastAQI.ts,
      aqi_category: getAqiBand(raw.highestForecastAQI.aqi_predicted).label,
      nearest_industrial_zone: raw.vulnerability.nearestIndustrialDistKm,
    },
  };
}

// --- RAG service (port 8002, /api/v1/chat, its own response shape) ---

export async function postChat(
  query: string,
  stationId: string,
  language = "en",
  sessionId?: string
): Promise<ChatResponse> {
  if (useMockFor(stationId)) { await wait(600); return mockChatResponse(query, stationId); }
  const res = await ragClient.post<ChatResponse>("/api/v1/chat", {
    query,
    station_id: stationId,
    language,
    session_id: sessionId ?? null,
  });
  return res.data;
}