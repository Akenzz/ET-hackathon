// Types mirror the API contract in Section 0 of the team build doc, exactly.
// Java (D) -> raw data. FastAPI (B) -> forecast/attribution. FastAPI (A) -> chat.

export interface Station {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  city: string;
}

export interface Pollutants {
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
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
}

export interface GeoFeatures {
  major_roads_count: number;
  construction_sites_count: number;
  industrial_zones_count: number;
  nearest_industrial_dist_km: number;
}

export interface ForecastPoint {
  ts: string;
  aqi_predicted: number;
  confidence_low: number;
  confidence_high: number;
}

export interface Forecast {
  station_id: string;
  forecast_horizon?: number; // hours requested — present in the real service's response
  predictions: ForecastPoint[];
}

export type SourceCategory =
  | "traffic"
  | "construction"
  | "industrial"
  | "meteorological_inversion"
  | "waste_burning";

export interface Attribution {
  station_id: string;
  likely_source: SourceCategory;
  confidence: number;
  contributing_factors: string[];
}

export interface ChatSource {
  title: string;
  snippet?: string;
}

export interface ChatResponse {
  response: string;
  aqi_context: Partial<LatestReading> & { attribution?: SourceCategory };
  sources: ChatSource[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  timestamp: string;
}

// --- Admin: model retraining ---
// NOT part of the original Section 0 contract — proposed shape, pending
// Person B actually building this endpoint. Adjust to match once confirmed.
export type RetrainStatus = "idle" | "training" | "success" | "error";

export interface RetrainResponse {
  station_id: string;
  status: "success" | "error";
  trained_at: string;
  message?: string;
}