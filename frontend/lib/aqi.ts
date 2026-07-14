// CPCB National AQI standard bands. Fixed regardless of brand palette —
// these colors are semantic and judges will recognize them on sight.

export interface AqiBand {
  label: string;
  min: number;
  max: number;
  color: string; // CSS var name (see globals.css)
  advisory: string;
}

export const AQI_BANDS: AqiBand[] = [
  { label: "Good", min: 0, max: 50, color: "var(--aqi-good)", advisory: "Minimal impact" },
  { label: "Satisfactory", min: 51, max: 100, color: "var(--aqi-satisfactory)", advisory: "Minor breathing discomfort to sensitive people" },
  { label: "Moderate", min: 101, max: 200, color: "var(--aqi-moderate)", advisory: "Breathing discomfort to people with lung disease" },
  { label: "Poor", min: 201, max: 300, color: "var(--aqi-poor)", advisory: "Breathing discomfort on prolonged exposure" },
  { label: "Very Poor", min: 301, max: 400, color: "var(--aqi-very-poor)", advisory: "Respiratory illness on prolonged exposure" },
  { label: "Severe", min: 401, max: 500, color: "var(--aqi-severe)", advisory: "Affects healthy people, serious impact on those with disease" },
];

export function getAqiBand(aqi: number): AqiBand {
  return (
    AQI_BANDS.find((b) => aqi >= b.min && aqi <= b.max) ??
    AQI_BANDS[AQI_BANDS.length - 1]
  );
}

export function getAqiColor(aqi: number): string {
  return getAqiBand(aqi).color;
}

const SOURCE_LABELS: Record<string, string> = {
  traffic: "Traffic",
  construction: "Construction dust",
  industrial: "Industrial",
  meteorological_inversion: "Wind inversion",
  waste_burning: "Waste burning",
};

export function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}
