import type {
  Station, LatestReading, HistoryPoint, WeatherLatest,
  GeoFeatures, Forecast, Attribution, ChatResponse,
} from "./types";

// Multi-city station set. The 4 Delhi stations use the real, team-confirmed
// station IDs (numeric CPCB/WAQI-style codes) and are the live set — see
// lib/liveStations.ts. Every other station, including the extra Delhi one
// below, is placeholder mock data pending the full trimmed list.
export const MOCK_STATIONS: Station[] = [
  // Delhi — first 4 are the real, confirmed live stations
  { station_id: "2553", name: "Anand Vihar", lat: 28.6469, lon: 77.3152, city: "Delhi" }, // LIVE
  { station_id: "2554", name: "Mandir Marg", lat: 28.6367, lon: 77.2006, city: "Delhi" }, // LIVE
  { station_id: "2556", name: "RK Puram", lat: 28.5645, lon: 77.1861, city: "Delhi" }, // LIVE
  { station_id: "3715", name: "ITO", lat: 28.6289, lon: 77.2410, city: "Delhi" }, // LIVE
  { station_id: "DL005", name: "Dwarka Sector 8", lat: 28.5710, lon: 77.0720, city: "Delhi" }, // demo-only, extra map coverage
  // Mumbai
  { station_id: "MH001", name: "Bandra Kurla Complex", lat: 19.0596, lon: 72.8656, city: "Mumbai" },
  { station_id: "MH002", name: "Chembur", lat: 19.0522, lon: 72.9006, city: "Mumbai" },
  { station_id: "MH003", name: "Borivali East", lat: 19.2321, lon: 72.8697, city: "Mumbai" },
  { station_id: "MH004", name: "Colaba", lat: 18.9067, lon: 72.8147, city: "Mumbai" },
  // Bengaluru
  { station_id: "BLR001", name: "Silk Board", lat: 12.9172, lon: 77.6228, city: "Bengaluru" },
  { station_id: "BLR002", name: "Hebbal", lat: 13.0355, lon: 77.5970, city: "Bengaluru" },
  { station_id: "BLR003", name: "BTM Layout", lat: 12.9166, lon: 77.6101, city: "Bengaluru" },
  { station_id: "BLR004", name: "Peenya", lat: 13.0284, lon: 77.5199, city: "Bengaluru" },
  // Chennai
  { station_id: "TN001", name: "Manali", lat: 13.1670, lon: 80.2590, city: "Chennai" },
  { station_id: "TN002", name: "Alandur", lat: 12.9975, lon: 80.2000, city: "Chennai" },
  { station_id: "TN003", name: "Velachery", lat: 12.9791, lon: 80.2212, city: "Chennai" },
  // Kolkata
  { station_id: "WB001", name: "Rabindra Sarobar", lat: 22.5090, lon: 88.3670, city: "Kolkata" },
  { station_id: "WB002", name: "Victoria", lat: 22.5450, lon: 88.3426, city: "Kolkata" },
  // Hyderabad
  { station_id: "TS001", name: "Sanathnagar", lat: 17.4530, lon: 78.4440, city: "Hyderabad" },
  { station_id: "TS002", name: "Bollaram", lat: 17.5300, lon: 78.3730, city: "Hyderabad" },
];

// Deterministic pseudo-random generator, seeded from the station_id, so every
// station has a stable-but-distinct mock AQI across reloads instead of every
// unlisted station collapsing to the same fallback value.
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return (Math.abs(h) % 1000) / 1000;
}

// Looked up by city rather than ID prefix — the 4 real Delhi station IDs are
// numeric (2553, 2554, 2556, 3715), so a "DL"-prefix check would silently
// miss them and only catch the leftover mock-only "DL005" entry.
const STATION_CITY: Record<string, string> = Object.fromEntries(
  MOCK_STATIONS.map((s) => [s.station_id, s.city])
);

function buildReading(stationId: string): LatestReading {
  const r = seededRandom(stationId);
  const isDelhi = STATION_CITY[stationId] === "Delhi";
  const base = isDelhi ? 180 : 70;
  const spread = isDelhi ? 220 : 160;
  const aqi = Math.round(base + r * spread);
  return {
    station_id: stationId,
    timestamp: new Date().toISOString(),
    aqi,
    pollutants: {
      pm25: Math.round(aqi * 0.5),
      pm10: Math.round(aqi * 0.8),
      no2: Math.round(aqi * 0.22),
      so2: Math.round(aqi * 0.06),
      co: +(aqi * 0.007).toFixed(2),
      o3: Math.round(aqi * 0.12),
    },
  };
}

const READING_CACHE = new Map<string, LatestReading>();

export function mockLatest(stationId: string): LatestReading {
  if (!READING_CACHE.has(stationId)) {
    READING_CACHE.set(stationId, buildReading(stationId));
  }
  return READING_CACHE.get(stationId)!;
}

export function mockHistory(stationId: string, days = 7): HistoryPoint[] {
  const base = mockLatest(stationId).aqi;
  const points: HistoryPoint[] = [];
  const now = Date.now();
  for (let i = days * 24; i >= 0; i--) {
    const t = new Date(now - i * 60 * 60 * 1000);
    const diurnal = Math.sin((t.getHours() / 24) * Math.PI * 2) * 25;
    const noise = (seededRandom(stationId + i) - 0.5) * 20;
    const aqi = Math.max(20, Math.round(base + diurnal + noise));
    points.push({
      timestamp: t.toISOString(),
      aqi,
      pollutants: {
        pm25: Math.round(aqi * 0.48), pm10: Math.round(aqi * 0.79),
        no2: Math.round(aqi * 0.22), so2: Math.round(aqi * 0.06),
        co: +(aqi * 0.006).toFixed(2), o3: Math.round(aqi * 0.13),
      },
    });
  }
  return points;
}

export function mockWeather(): WeatherLatest {
  return { temp_c: 26.4, humidity: 68, wind_speed_kmh: 6, wind_dir_deg: 240, precip_mm: 0 };
}

export function mockGeoFeatures(stationId: string): GeoFeatures {
  const r = seededRandom(stationId + "geo");
  return {
    major_roads_count: Math.round(4 + r * 10),
    construction_sites_count: Math.round(r * 4),
    industrial_zones_count: Math.round(r * 3),
    nearest_industrial_dist_km: +(0.5 + r * 4).toFixed(1),
  };
}

export function mockForecast(stationId: string, hours = 72): Forecast {
  const base = mockLatest(stationId).aqi;
  const pointCount = Math.round(hours / 3);
  const predictions = Array.from({ length: pointCount }, (_, i) => {
    const t = new Date(Date.now() + i * 3 * 60 * 60 * 1000);
    const drift = Math.sin((i / pointCount) * Math.PI * 2) * 30 + (i > pointCount / 2 ? 15 : 0);
    const aqi = Math.max(20, Math.round(base + drift));
    return {
      ts: t.toISOString(),
      aqi_predicted: aqi,
      confidence_low: Math.round(aqi * 0.88),
      confidence_high: Math.round(aqi * 1.12),
    };
  });
  return { station_id: stationId, forecast_horizon: hours, predictions };
}

export function mockAttribution(stationId: string): Attribution {
  const geo = mockGeoFeatures(stationId);
  if (geo.industrial_zones_count >= 2) {
    return {
      station_id: stationId,
      likely_source: "industrial",
      confidence: 0.74,
      contributing_factors: ["Wind blowing from nearby industrial zone", "High industrial zone density", "PM10/PM2.5 ratio elevated"],
    };
  }
  if (geo.construction_sites_count >= 2) {
    return {
      station_id: stationId,
      likely_source: "construction",
      confidence: 0.68,
      contributing_factors: ["Multiple active construction sites nearby", "Elevated PM10 relative to PM2.5"],
    };
  }
  return {
    station_id: stationId,
    likely_source: "traffic",
    confidence: 0.72,
    contributing_factors: ["High road density nearby", "Reading during rush hour window", "Low wind speed trapping pollutants"],
  };
}

export function mockChatResponse(query: string, stationId: string): ChatResponse {
  const reading = mockLatest(stationId);
  const band = reading.aqi > 300 ? "Very Poor" : reading.aqi > 200 ? "Poor" : reading.aqi > 100 ? "Moderate" : "Satisfactory";
  return {
    response: `Current AQI near this station is ${reading.aqi} (${band}). Based on CPCB guidance, sensitive groups — children, the elderly, and those with respiratory conditions — should limit prolonged outdoor exertion. Avoid peak traffic hours (7-10am, 6-9pm) when local readings tend to spike.`,
    aqi_context: { ...reading, attribution: "traffic" },
    sources: [
      { title: "CPCB National AQI Category Guidance" },
      { title: "WHO Air Quality Health Advisory" },
    ],
  };
}