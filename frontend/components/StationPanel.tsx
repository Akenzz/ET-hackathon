"use client";

import { useEffect, useState } from "react";
import { X, MapPin, Droplets, Sparkles, Hash, Clock, Loader2 } from "lucide-react";
import type { Station, LatestReading, Forecast, Attribution } from "@/lib/types";
import type { UserRole } from "@/lib/role";
import { getAqiBand } from "@/lib/aqi";
import { getForecast, getAttribution, isMockModeForced } from "@/lib/api";
import { isLiveStation } from "@/lib/liveStations";
import ForecastChart from "./ForecastChart";
import AttributionBadge from "./AttributionBadge";
import ErrorNotice from "./ErrorNotice";

interface StationPanelProps {
  station: Station;
  reading: LatestReading | undefined;
  role: UserRole;
  onClose: () => void;
}

const POLLUTANT_LABELS: Record<string, string> = {
  pm25: "PM2.5", pm10: "PM10", no2: "NO₂", so2: "SO₂", co: "CO", o3: "O₃",
};

export default function StationPanel({ station, reading, role, onClose }: StationPanelProps) {
  const isEngineer = role === "engineer";

  // The prediction is explicit and user-triggered, not fetched on mount —
  // this makes the "React -> FastAPI -> Prophet" call visible in a demo
  // rather than something that happens invisibly in the background.
  const [predicted, setPredicted] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [attribution, setAttribution] = useState<Attribution | null>(null);

  // Reset the prediction whenever the selected station changes, so a stale
  // result from a previous station never lingers under a new one.
  useEffect(() => {
    setPredicted(false);
    setPredicting(false);
    setPredictError(null);
    setForecast(null);
    setAttribution(null);
  }, [station.station_id]);

  async function handlePredict() {
    setPredicting(true);
    setPredictError(null);
    try {
      const f = await getForecast(station.station_id);
      setForecast(f);
      // Reasoning is fetched right after the prediction succeeds — it's
      // presented as "why this prediction," not a separate feature.
      try {
        const a = await getAttribution(station.station_id);
        setAttribution(a);
      } catch {
        // Reasoning failing shouldn't hide a successful prediction — the
        // AttributionBadge area just won't render below it.
      }
      setPredicted(true);
    } catch {
      setPredictError("Couldn't reach the forecast service. Try again.");
    } finally {
      setPredicting(false);
    }
  }

  const band = reading ? getAqiBand(reading.aqi) : null;

  const dataBadge: "demo" | "live" | "offline" =
    !isLiveStation(station.station_id) || isMockModeForced()
      ? "demo"
      : reading
        ? "live"
        : "offline";
  const badgeStyles: Record<typeof dataBadge, string> = {
    demo: "bg-bg-elevated-2 text-fg-faint",
    live: "bg-cyan/20 text-cyan",
    offline: "bg-aqi-very-poor/20 text-aqi-very-poor",
  };
  const badgeLabel: Record<typeof dataBadge, string> = {
    demo: "Demo",
    live: "Live",
    offline: "Offline",
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-border bg-bg-elevated">
      <div className="flex items-start justify-between border-b border-border p-4">
        <div>
          <div className="flex items-center gap-1.5 text-fg-faint">
            <MapPin size={12} />
            <span className="text-[11px]">{station.city}</span>
            <span className={"rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide " + badgeStyles[dataBadge]}>
              {badgeLabel[dataBadge]}
            </span>
            {isEngineer && (
              <span className="font-data flex items-center gap-0.5 rounded bg-bg-elevated-2 px-1.5 py-0.5 text-[10px] text-indigo">
                <Hash size={9} />{station.station_id}
              </span>
            )}
          </div>
          <h2 className="font-display text-lg font-semibold text-fg">{station.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-fg-faint transition-colors hover:bg-bg-elevated-2 hover:text-fg"
          aria-label="Close station panel"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-5 p-4">
        {/* Current AQI — baseline context, not a "feature" */}
        <div className="rounded-lg border border-border bg-bg-elevated-2 p-4 text-center">
          <p className="text-[11px] uppercase tracking-wide text-fg-faint">Current AQI</p>
          {reading ? (
            <>
              <p className="font-data text-5xl font-semibold leading-tight" style={{ color: band ? band.color : undefined }}>
                {reading.aqi}
              </p>
              <p className="mt-1 text-sm font-medium" style={{ color: band ? band.color : undefined }}>
                {band ? band.label : ""}
              </p>
              {band && <p className="mt-1 text-[11px] text-fg-faint">{band.advisory}</p>}
              {isEngineer && (
                <p className="font-data mt-2 flex items-center justify-center gap-1 text-[10px] text-fg-faint">
                  <Clock size={10} />
                  {new Date(reading.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                </p>
              )}
            </>
          ) : (
            <div className="mt-2">
              <ErrorNotice message="No reading available for this station right now." compact />
            </div>
          )}
        </div>

        {/* PRIMARY: Predict AQI — the headline feature, explicitly triggered */}
        <div className="rounded-xl border-2 border-teal/40 bg-teal/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-teal" />
            <h3 className="font-display text-sm font-semibold text-fg">Predict AQI</h3>
          </div>

          {!predicted && !predicting && !predictError && (
            <button
              onClick={handlePredict}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal py-3 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
            >
              <Sparkles size={15} />
              Predict AQI for this station
            </button>
          )}

          {predicting && (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-bg-elevated-2 py-3 text-sm text-fg-muted">
              <Loader2 size={15} className="animate-spin text-teal" />
              Calling forecast model…
            </div>
          )}

          {predictError && (
            <ErrorNotice message={predictError} onRetry={handlePredict} />
          )}

          {predicted && forecast && (
            <div className="space-y-3">
              <ForecastChart forecast={forecast} loading={false} />
              <button
                onClick={handlePredict}
                className="w-full rounded-md border border-border bg-bg-elevated-2 py-1.5 text-[11px] text-fg-muted transition-colors hover:text-fg"
              >
                Re-run prediction
              </button>

              {/* Reasoning — directly beneath the prediction it explains */}
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-fg-faint">Why this prediction</p>
                {attribution ? (
                  <AttributionBadge attribution={attribution} loading={false} />
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-bg-elevated-2 px-3 py-2 text-[11px] text-fg-faint">
                    Reasoning unavailable for this prediction.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Secondary: pollutant breakdown */}
        {reading && (
          <div className="opacity-90">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-fg-faint">
              <Droplets size={12} /> Pollutant breakdown (µg/m³{isEngineer ? " — raw" : ""})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(reading.pollutants).map(([key, val]) => (
                <div key={key} className="rounded-md border border-border bg-bg-elevated-2 px-2 py-1.5 text-center">
                  <p className="font-data text-sm font-semibold text-fg">
                    {isEngineer ? val.toFixed(2) : val}
                  </p>
                  <p className="text-[10px] text-fg-faint">{POLLUTANT_LABELS[key] || key}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}