import type {
  Station, LatestReading, HistoryPoint, WeatherLatest,
  GeoFeatures, Forecast, Attribution, ChatResponse, HealthAdvisory,
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
  // Skew toward higher AQI for Delhi stations, moderate for others — roughly
  // reflects real relative severity without pretending to be a real reading.
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
    hospital_count: Math.round(2 + r * 12),
    school_count: Math.round(3 + r * 18),
    kindergarten_count: Math.round(1 + r * 6),
    park_count: Math.round(1 + r * 5),
    bus_stop_count: Math.round(5 + r * 25),
    market_count: Math.round(2 + r * 10),
    last_fetched: new Date().toISOString(),
  };
}

export function mockForecast(stationId: string, hours = 24): Forecast {
  const base = mockLatest(stationId).aqi;
  const pointCount = Math.round(hours / 3); // mock stays 3h-spaced regardless of real hourly grain
  const predictions = Array.from({ length: pointCount }, (_, i) => {
    const t = new Date(Date.now() + i * 3 * 60 * 60 * 1000);
    const drift = Math.sin((i / pointCount) * Math.PI * 2) * 30 + (i > pointCount / 2 ? 15 : 0);
    const aqi = Math.max(20, Math.round(base + drift));
    return {
      ts: t.toISOString(),
      aqi_predicted: aqi,
      confidence_low: Math.round(aqi * 0.88),
      confidence_high: Math.round(aqi * 1.12),
      category: aqi > 200 ? "Poor" : aqi > 100 ? "Moderate" : "Satisfactory",
    };
  });
  return { station_id: stationId, station_name: undefined, forecast_horizon: hours, predictions };
}

export function mockAttribution(stationId: string): Attribution {
  const geo = mockGeoFeatures(stationId);
  if (geo.industrial_zones_count >= 2) {
    return {
      station_id: stationId,
      likely_source: "Industrial",
      confidence: 0.74,
      contributing_factors: ["Wind blowing from nearby industrial zone", "High industrial zone density", "PM10/PM2.5 ratio elevated"],
    };
  }
  if (geo.construction_sites_count >= 2) {
    return {
      station_id: stationId,
      likely_source: "Construction",
      confidence: 0.68,
      contributing_factors: ["Multiple active construction sites nearby", "Elevated PM10 relative to PM2.5"],
    };
  }
  return {
    station_id: stationId,
    likely_source: "Traffic",
    confidence: 0.72,
    contributing_factors: ["High road density nearby", "Reading during rush hour window", "Low wind speed trapping pollutants"],
  };
}

export function mockHealthAdvisory(stationId: string): HealthAdvisory {
  const station = MOCK_STATIONS.find((s) => s.station_id === stationId);
  const forecast = mockForecast(stationId, 24);
  const geo = mockGeoFeatures(stationId);
  const peak = forecast.predictions.reduce((max, p) => (p.aqi_predicted > max.aqi_predicted ? p : max), forecast.predictions[0]);
  const severe = peak.aqi_predicted > 300;
  const poor = peak.aqi_predicted > 200;

  const advisories: Record<string, { message: string; recommendations: string[] }> = {
    "General Public": {
      message: `Air quality near ${station?.name ?? "this station"} is expected to reach AQI ${Math.round(peak.aqi_predicted)}. ${severe ? "Avoid non-essential outdoor travel." : poor ? "Limit prolonged outdoor exposure." : "Generally safe for most outdoor activity."} There are ${geo.hospital_count} hospitals nearby if needed.`,
      recommendations: severe
        ? ["Reduce outdoor exposure", "Avoid non-essential outdoor travel"]
        : ["Monitor air quality before outdoor plans"],
    },
    "School Administrators": {
      message: `${geo.school_count} schools and ${geo.kindergarten_count} kindergartens in the area should ${severe ? "suspend outdoor sports and activities" : "monitor conditions before outdoor activities"} given the forecast AQI of ${Math.round(peak.aqi_predicted)}.`,
      recommendations: severe ? ["Suspend outdoor sports", "Monitor students' health"] : ["Check AQI before recess/sports"],
    },
    "Elderly Citizens": {
      message: `Elderly residents should ${severe ? "remain indoors as much as possible" : "limit strenuous outdoor activity"}. With ${geo.park_count} nearby parks, consider indoor alternatives during peak pollution hours.`,
      recommendations: severe ? ["Remain indoors", "Avoid outdoor walks"] : ["Prefer indoor activity during peak hours"],
    },
    "Outdoor Workers": {
      message: `Workers near ${geo.construction_sites_count} construction sites and ${geo.industrial_zones_count} industrial zones should wear N95 masks. ${geo.bus_stop_count} bus stops and ${geo.market_count} markets nearby offer break locations.`,
      recommendations: ["Wear N95 masks", "Take regular breaks indoors where possible"],
    },
    "Public Transport Commuters": {
      message: `Commuters at the area's ${geo.bus_stop_count} bus stops should take precautions, especially near the ${geo.industrial_zones_count} industrial zones and ${geo.construction_sites_count} construction sites nearby.`,
      recommendations: ["Wear a mask while waiting at stops", "Avoid prolonged waiting outdoors"],
    },
  };

  return {
    station_id: stationId,
    station_name: station ? `${station.name}, ${station.city}, India` : stationId,

    highest_forecast_aqi: peak.aqi_predicted,

    vulnerability: geo,

    advisories,

    situation: {
      station: station ? `${station.name}, ${station.city}, India` : stationId,
      highest_forecast_aqi: peak.aqi_predicted,
      expected_time: peak.ts,
      aqi_category: peak.category ?? "Unknown",
      nearest_industrial_zone: geo.nearest_industrial_dist_km,
    },
  };
}

export function mockChatResponse(query: string, stationId: string): ChatResponse {
  const reading = mockLatest(stationId);
  const band = reading.aqi > 300 ? "Very Poor" : reading.aqi > 200 ? "Poor" : reading.aqi > 100 ? "Moderate" : "Satisfactory";
  return {
    response: `With an AQI of ${reading.aqi} (${band}), sensitive groups — children, the elderly, and those with respiratory conditions — should limit prolonged outdoor exertion. Avoid peak traffic hours (7-10am, 6-9pm) when local readings tend to spike.`,
    aqi_context: {
      station_id: stationId,
      aqi: reading.aqi,
      category: band,
      pm25: reading.pollutants.pm25,
      pm10: reading.pollutants.pm10,
      no2: reading.pollutants.no2,
      so2: reading.pollutants.so2,
      co: reading.pollutants.co,
      o3: reading.pollutants.o3,
      timestamp: reading.timestamp,
    },
    sources: ["Outdoor Activities > Can I go jogging or running?", "CPCB National AQI Category Guidance"],
    session_id: "mock-session-" + stationId,
  };
}