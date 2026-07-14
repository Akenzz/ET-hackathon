"use client";

import { useState } from "react";
import { X, MapPin, Droplets, Sparkles, Hash, Loader2, ChevronRight, ShieldCheck, Gauge } from "lucide-react";
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
    <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-border/80 bg-bg-elevated/95 backdrop-blur-xl">
      <div className="border-b border-border/80 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 text-fg-faint">
              <MapPin size={12} />
              <span className="text-[11px]">{station.city}</span>
              <span className={"rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] " + badgeStyles[dataBadge]}>
                {badgeLabel[dataBadge]}
              </span>
              {isEngineer && (
                <span className="font-data flex items-center gap-0.5 rounded-full border border-border bg-bg-elevated-2 px-2 py-0.5 text-[10px] text-indigo">
                  <Hash size={9} />{station.station_id}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-fg">{station.name}</h2>
              <p className="mt-1 text-sm text-fg-faint">Station detail view, with forecast on demand and reasoning directly below it.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-fg-faint transition-colors hover:bg-bg-elevated-2 hover:text-fg"
            aria-label="Close station panel"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-3xl border border-border/80 bg-bg-elevated-2/70 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">Current AQI</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated px-2 py-1 text-[10px] text-fg-faint">
              <ShieldCheck size={11} className="text-cyan" />
              Baseline reading
            </span>
          </div>
          {reading ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] sm:items-end">
              <div>
                <p className="font-data text-6xl font-semibold leading-none tracking-tight" style={{ color: band ? band.color : undefined }}>
                  {reading.aqi}
                </p>
                <p className="mt-2 text-sm font-semibold" style={{ color: band ? band.color : undefined }}>
                  {band ? band.label : ""}
                </p>
                {band && <p className="mt-1 text-[11px] leading-5 text-fg-faint">{band.advisory}</p>}
              </div>
              <div className="rounded-2xl border border-border/70 bg-bg-elevated px-3 py-3">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-fg-faint">
                  <Gauge size={12} className="text-teal" />
                  Current conditions
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-fg-faint">Reading age</p>
                    {isEngineer ? (
                      <p className="font-data mt-0.5 text-sm text-fg">{new Date(reading.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}</p>
                    ) : (
                      <p className="mt-0.5 text-sm text-fg">Latest available station value</p>
                    )}
                  </div>
                  <div className="rounded-full border border-teal/20 bg-teal/10 px-2.5 py-1 text-[11px] text-teal">
                    {isLiveStation(station.station_id) && !isMockModeForced() ? "Live route" : "Demo route"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <ErrorNotice message="No reading available for this station right now." compact />
            </div>
          )}
        </div>

        <div className="rounded-3xl border-2 border-teal/30 bg-gradient-to-br from-teal/12 via-bg-elevated to-bg-elevated-2 p-4 shadow-lg shadow-teal/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal/15 text-teal">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">Headline workflow</p>
                <h3 className="font-display text-base font-semibold text-fg">Predict AQI</h3>
              </div>
            </div>
            <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan">
              Forecast on demand
            </span>
          </div>

          {!predicted && !predicting && !predictError && (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-6 text-fg-muted">
                Run the forecast only when you need it. This keeps the model call explicit and makes the result the clear center of attention.
              </p>
              <button
                onClick={handlePredict}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal px-4 py-3.5 text-sm font-semibold text-navy transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal/20"
              >
                <Sparkles size={15} />
                Predict AQI for this station
              </button>
            </div>
          )}

          {predicting && (
            <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-bg-elevated/80 py-4 text-sm text-fg-muted">
              <Loader2 size={15} className="animate-spin text-teal" />
              Calling forecast model…
            </div>
          )}

          {predictError && (
            <div className="mt-4">
              <ErrorNotice message={predictError} onRetry={handlePredict} />
            </div>
          )}

          {predicted && forecast && (
            <div className="mt-4 space-y-4">
              <ForecastChart forecast={forecast} loading={false} />
              <button
                onClick={handlePredict}
                className="inline-flex items-center gap-1.5 self-start rounded-full border border-border bg-bg-elevated-2 px-3 py-1.5 text-[11px] text-fg-muted transition-colors hover:border-teal/40 hover:text-fg"
              >
                Re-run prediction
                <ChevronRight size={12} />
              </button>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">Why this prediction</p>
                  <span className="text-[10px] text-fg-faint">Reasoning follows the forecast result</span>
                </div>
                {attribution ? (
                  <AttributionBadge attribution={attribution} loading={false} />
                ) : (
                  <p className="rounded-2xl border border-dashed border-border/80 bg-bg-elevated-2/60 px-3 py-3 text-[11px] text-fg-faint">
                    Reasoning unavailable for this prediction.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {reading && (
          <div className="rounded-2xl border border-border/70 bg-bg/20 p-4 opacity-90">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-fg-faint">
              <Droplets size={12} /> Pollutant breakdown{isEngineer ? " (raw)" : ""}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(reading.pollutants).map(([key, val]) => (
                <div key={key} className="rounded-xl border border-border/70 bg-bg-elevated-2/80 px-2 py-2 text-center">
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