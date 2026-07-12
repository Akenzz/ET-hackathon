import axios from "axios";
import type {
  Station, LatestReading, HistoryPoint, WeatherLatest,
  GeoFeatures, Forecast, Attribution, ChatResponse, RetrainResponse,
} from "./types";
import {
  MOCK_STATIONS, mockLatest, mockHistory, mockWeather,
  mockGeoFeatures, mockForecast, mockAttribution, mockChatResponse,
} from "./mockData";
import { isLiveStation } from "./liveStations";

const JAVA_BASE_URL = process.env.NEXT_PUBLIC_JAVA_API_URL ?? "http://localhost:8080";
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";

const FORCE_ALL_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

const javaClient = axios.create({ baseURL: JAVA_BASE_URL, timeout: 8000 });
const aiClient = axios.create({ baseURL: FASTAPI_BASE_URL, timeout: 15000 });

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

function useMockFor(stationId: string): boolean {
  return FORCE_ALL_MOCKS || !isLiveStation(stationId);
}

export async function getStations(): Promise<Station[]> {
  if (FORCE_ALL_MOCKS) { await wait(); return MOCK_STATIONS; }
  await wait();
  return MOCK_STATIONS;
}

export async function getLatestReading(stationId: string): Promise<LatestReading> {

  if (useMockFor(stationId)) {
    await wait();
    return mockLatest(stationId);
  }

  const res = await javaClient.get<LatestReading>("/readings/latest",
    { params: { station_id: stationId } }
  );

  return res.data;
}

export async function getHistory(stationId: string, from: string, to: string): Promise<HistoryPoint[]> {
  if (useMockFor(stationId)) { await wait(); return mockHistory(stationId); }
  const res = await javaClient.get<HistoryPoint[]>("/readings/history", { params: { station_id: stationId, from, to } });
  return res.data;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherLatest> {
  if (FORCE_ALL_MOCKS) { await wait(); return mockWeather(); }
  const res = await javaClient.get<WeatherLatest>("/weather/latest", { params: { lat, lon } });
  return res.data;
}

export async function getGeoFeatures(lat: number, lon: number, radiusKm = 2): Promise<GeoFeatures> {
  if (FORCE_ALL_MOCKS) { await wait(); return mockGeoFeatures(lat + "," + lon); }
  const res = await javaClient.get<GeoFeatures>("/geo/features", { params: { lat, lon, radius_km: radiusKm } });
  return res.data;
}

const DEFAULT_FORECAST_HOURS = 72;

export async function getForecast(stationId: string, hours: number = DEFAULT_FORECAST_HOURS): Promise<Forecast> {
  if (useMockFor(stationId)) { await wait(400); return mockForecast(stationId, hours); }
  const res = await aiClient.get<Forecast>("/forecast/" + stationId, { params: { hours } });
  return res.data;
}

export async function getAttribution(stationId: string): Promise<Attribution> {
  if (useMockFor(stationId)) { await wait(400); return mockAttribution(stationId); }
  const res = await aiClient.get<Attribution>("/attribution/" + stationId);
  return res.data;
}

export async function postRetrainStation(stationId: string): Promise<RetrainResponse> {
  if (useMockFor(stationId)) {
    await wait(3000 + Math.random() * 2000);
    if (Math.random() < 0.08) {
      return { station_id: stationId, status: "error", trained_at: new Date().toISOString(), message: "Training data unavailable for this station." };
    }
    return { station_id: stationId, status: "success", trained_at: new Date().toISOString() };
  }
  const res = await aiClient.post<RetrainResponse>("/admin/retrain/" + stationId);
  return res.data;
}

export async function postChat(query: string, stationId: string, language = "en"): Promise<ChatResponse> {
  if (useMockFor(stationId)) { await wait(600); return mockChatResponse(query, stationId); }
  const res = await aiClient.post<ChatResponse>("/chat", { query, station_id: stationId, language });
  return res.data;
}

export function isMockModeForced(): boolean {
  return FORCE_ALL_MOCKS;
}