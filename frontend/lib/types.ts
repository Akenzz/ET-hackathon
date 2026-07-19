// Frontend-internal shapes. We keep our own field naming (snake_case)
// consistent throughout the app regardless of what each upstream service
// actually uses on the wire — lib/api.ts is responsible for translating
// each real response into these shapes. See lib/api.ts comments for the
// confirmed real contract per service (Java camelCase, AI service
// camelCase, RAG service its own shape).

export interface Station {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  city: string;
}

export interface Pollutants {
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
}

export interface LatestReading {
  station_id: string;
  timestamp: string;
  aqi: number;
  pollutants: Pollutants;
}

export interface HistoryPoint {
  timestamp: string;
  aqi: number;
  pollutants: Pollutants;
}

export interface WeatherLatest {
  temp_c: number;
  humidity: number;
  wind_speed_kmh: number;
  wind_dir_deg: number;
  precip_mm: number;
  pressure_hpa?: number; // present in the real response, wasn't in our original guess
}

export interface GeoFeatures {
  major_roads_count: number;
  construction_sites_count: number;
  industrial_zones_count: number;
  nearest_industrial_dist_km: number;
  // Vulnerability/exposure indicators — present in the real Java response,
  // not in our original contract guess. Genuinely useful for a "vulnerable
  // population near this hotspot" framing (hospitals, schools, kindergartens).
  hospital_count?: number;
  school_count?: number;
  kindergarten_count?: number;
  park_count?: number;
  bus_stop_count?: number;
  market_count?: number;
  last_fetched?: string;
}

export interface ForecastPoint {
  ts: string;
  aqi_predicted: number;
  confidence_low: number;
  confidence_high: number;
  category?: string; // present in the real AI service's response, not in our earlier mock
}

export interface Forecast {
  station_id: string;
  station_name?: string; // real AI service includes this, wasn't in the original spec
  forecast_horizon?: number;
  predictions: ForecastPoint[];
}

// Loosened to string — the real AI service's confirmed value is "Traffic"
// (capitalized, via the RAG team's documented field-mapping notes), not the
// lowercase snake_case enum we originally guessed. Other real values are
// still unconfirmed, so treat this as open rather than a fixed union.
export type SourceCategory = string;

export interface Attribution {
  station_id: string;
  likely_source: SourceCategory;
  confidence: number;
  contributing_factors: string[];
}

// Real RAG /api/v1/chat response shape — flat, not nested pollutants, no
// attribution field. Distinct from LatestReading on purpose.
export interface ChatAqiContext {
  station_id?: string;
  aqi?: number | null;
  category?: string;
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  so2?: number | null;
  co?: number | null;
  o3?: number | null;
  timestamp?: string;
}

export interface ChatResponse {
  response: string;
  aqi_context: ChatAqiContext;
  sources: string[]; // real service returns plain strings (section names), not objects
  session_id?: string; // for multi-turn — reuse on the next request in the same conversation
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: string;
}

// --- Admin: model retraining ---
// NOT covered by any readme yet — still a proposed shape.
export type RetrainStatus = "idle" | "training" | "success" | "error";

export interface RetrainResponse {
  station_id: string;
  status: "success" | "error";
  trained_at: string;
  message?: string;
}

// --- Health advisory (confirmed real response from AI service) ---
export interface AdvisorySegment {
  message: string;
  recommendations: string[];
}

export interface AdvisorySituation {
  station: string;
  highest_forecast_aqi: number;
  expected_time: string;
  aqi_category: string;
  nearest_industrial_zone: number;
}

export interface HealthAdvisory {
  station_id: string;
  station_name: string;
  highest_forecast_aqi: number;
  vulnerability: GeoFeatures;
  advisories: Record<string, AdvisorySegment>;
  situation: AdvisorySituation;
}