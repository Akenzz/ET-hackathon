"use client";

import { useEffect, useMemo, useState } from "react";
import { X, MapPin, Sparkles, Hash, Loader2, ChevronRight, ShieldCheck, Gauge, Wind, Droplets, CalendarDays, Activity } from "lucide-react";
import type { Station, LatestReading, Forecast, Attribution, WeatherLatest, GeoFeatures, HealthAdvisory, HistoryPoint } from "@/lib/types";
import type { UserRole } from "@/lib/role";
import { getAqiBand } from "@/lib/aqi";
import { getForecast, getAttribution, getWeather, getGeoFeatures, getHealthAdvisory, getHistory, isMockModeForced } from "@/lib/api";
import { mockWeather, mockGeoFeatures, mockHistory } from "@/lib/mockData";
import { isLiveStation } from "@/lib/liveStations";
import ForecastChart from "./ForecastChart";
import AttributionBadge from "./AttributionBadge";
import ErrorNotice from "./ErrorNotice";
import { AQIHistoryChart, PollutantMixChart } from "./StationCharts";

interface StationPanelProps {
  station: Station;
  reading: LatestReading | undefined;
  role: UserRole;
  onClose: () => void;
}

type PanelView = "overview" | "trend" | "forecast";

export default function StationPanel({ station, reading, role, onClose }: StationPanelProps) {
  const isEngineer = role === "engineer";

  const [activeView, setActiveView] = useState<PanelView>("overview");
  const [predicted, setPredicted] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const [healthAdvisory, setHealthAdvisory] = useState<HealthAdvisory | null>(null);
  const [weather, setWeather] = useState<WeatherLatest | null>(null);
  const [geoFeatures, setGeoFeatures] = useState<GeoFeatures | null>(null);
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;

      setActiveView("overview");
      setPredicting(false);
      setPredicted(false);
      setPredictError(null);
      setForecast(null);
      setAttribution(null);
      setHealthAdvisory(null);

      setContextLoading(true);
      setHistoryLoading(true);
      setWeather(null);
      setGeoFeatures(null);
      setHistory(null);

      const historyFrom = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      const historyTo = new Date().toISOString();

      const [nextWeatherResult, nextGeoResult, nextHistoryResult] = await Promise.allSettled([
        getWeather(station.lat, station.lon),
        getGeoFeatures(station.lat, station.lon),
        getHistory(station.station_id, historyFrom, historyTo),
      ]);

      if (cancelled) return;

      setWeather(nextWeatherResult.status === "fulfilled" ? nextWeatherResult.value : mockWeather());
      setGeoFeatures(nextGeoResult.status === "fulfilled" ? nextGeoResult.value : mockGeoFeatures(station.station_id));
      setHistory(nextHistoryResult.status === "fulfilled" ? nextHistoryResult.value : mockHistory(station.station_id));
      setContextLoading(false);
      setHistoryLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [station.lat, station.lon, station.station_id]);

  async function handlePredict() {
    setPredicting(true);
    setPredictError(null);
    setActiveView("forecast");
    try {
      const f = await getForecast(station.station_id);
      setForecast(f);
      try {
        const a = await getAttribution(station.station_id);
        setAttribution(a);
      } catch {
        // Reasoning failing shouldn't hide a successful prediction.
      }
      try {
        const advisory = await getHealthAdvisory(station.station_id);
        setHealthAdvisory(advisory);
      } catch (err) {
        console.error("Health advisory failed:", err);
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

  const historySummary = useMemo(() => {
    if (!history || history.length === 0) return null;

    const values = history.map((point) => point.aqi);
    const first = values[0];
    const last = values[values.length - 1];
    const peak = Math.max(...values);
    const trough = Math.min(...values);

    return {
      change: last - first,
      peak,
      trough,
      average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    };
  }, [history]);

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto rounded-l-3xl border-l border-y border-border/80 bg-bg-elevated/95 shadow-2xl backdrop-blur-xl">
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
                <span className="font-data-readout flex items-center gap-0.5 rounded-full border border-border bg-bg-elevated-2 px-2 py-0.5 text-[10px] text-indigo">
                  <Hash size={9} />{station.station_id}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-fg">{station.name}</h2>
              <p className="mt-1 text-sm text-fg-faint">A quieter, chart-led station view. Start in overview, then drill into trend or forecast when needed.</p>
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

        <div className="mt-4 grid grid-cols-3 rounded-2xl border border-border/80 bg-bg-elevated-2 p-1">
          {[
            { key: "overview", label: "Overview", icon: Gauge },
            { key: "trend", label: "Trend", icon: Activity },
            { key: "forecast", label: "Forecast", icon: CalendarDays },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeView === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key as PanelView)}
                className={
                  "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors " +
                  (active ? "bg-teal text-navy shadow-sm" : "text-fg-faint hover:bg-bg-elevated hover:text-fg")
                }
                aria-pressed={active}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {activeView === "overview" && (
          <>
            <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-bg-elevated-2/70 p-5 shadow-sm">
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{ background: band ? `radial-gradient(circle at 15% 0%, ${band.color}, transparent 60%)` : undefined }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">Current AQI</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated px-2 py-1 text-[10px] text-fg-faint">
                  <ShieldCheck size={11} className="text-cyan" />
                  Baseline reading
                </span>
              </div>
              {reading ? (
                <div className="relative mt-4 grid gap-4 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] sm:items-end">
                  <div>
                    <p className="font-data-readout text-7xl font-bold leading-none tracking-tight" style={{ color: band ? band.color : undefined }}>
                      {reading.aqi}
                    </p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: band ? band.color : undefined }}>
                      {band ? band.label : ""}
                    </p>
                    {band && <p className="mt-1 text-[11px] leading-5 text-fg-faint">{band.advisory}</p>}
                  </div>
                  <div className="space-y-3 rounded-2xl border border-border/70 bg-bg-elevated px-3 py-3">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-fg-faint">
                      <Gauge size={12} className="text-teal" />
                      Reading context
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] text-fg-faint">Reading age</p>
                        {isEngineer ? (
                          <p className="font-data-readout mt-0.5 text-sm text-fg">{new Date(reading.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}</p>
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
                <div className="relative mt-3">
                  <ErrorNotice message="No reading available for this station right now." compact />
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <CompactMetric
                icon={<Wind size={14} />}
                label="Weather"
                value={weather ? `${weather.temp_c.toFixed(1)}°C` : contextLoading ? "Loading…" : "—"}
                note={weather ? `${weather.humidity}% humidity · ${weather.wind_speed_kmh} km/h wind` : "Local conditions"}
              />
              <CompactMetric
                icon={<Droplets size={14} />}
                label="Exposure"
                value={geoFeatures ? `${geoFeatures.hospital_count ?? 0} hospitals` : contextLoading ? "Loading…" : "—"}
                note={geoFeatures ? `${geoFeatures.school_count ?? 0} schools nearby` : "Nearby vulnerable sites"}
              />
              <CompactMetric
                icon={<CalendarDays size={14} />}
                label="Trend window"
                value={historySummary ? `${historySummary.average} avg` : historyLoading ? "Loading…" : "—"}
                note={historySummary ? `${historySummary.peak} peak · ${historySummary.trough} low` : "Recent AQI history"}
              />
            </div>

            <PollutantMixChart reading={reading} loading={!reading} isEngineer={isEngineer} />

            <div className="rounded-2xl border border-border/70 bg-bg/20 p-4 text-sm text-fg-muted">
              This view stays compact on purpose. Tap <span className="text-fg">Trend</span> to inspect recent AQI movement, or <span className="text-fg">Forecast</span> for model output and advisories.
            </div>
          </>
        )}

        {activeView === "trend" && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <CompactMetric
                icon={<Activity size={14} />}
                label="Average"
                value={historySummary ? String(historySummary.average) : historyLoading ? "Loading…" : "—"}
                note="Seven-day mean AQI"
              />
              <CompactMetric
                icon={<ShieldCheck size={14} />}
                label="Peak"
                value={historySummary ? String(historySummary.peak) : historyLoading ? "Loading…" : "—"}
                note="Highest point in range"
              />
              <CompactMetric
                icon={<ChevronRight size={14} />}
                label="Shift"
                value={historySummary ? `${historySummary.change >= 0 ? "+" : ""}${historySummary.change}` : historyLoading ? "Loading…" : "—"}
                note="Latest minus first reading"
              />
            </div>

            <AQIHistoryChart history={history} loading={historyLoading} />

            <div className="rounded-3xl border border-border/80 bg-bg-elevated-2/70 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">What this tells you</p>
              <p className="mt-2 text-sm leading-6 text-fg-muted">
                The trend chart makes direction visible at a glance, so the user does not have to parse every text field first. Hover any point to inspect the exact reading.
              </p>
            </div>
          </>
        )}

        {activeView === "forecast" && (
          <div className="space-y-4 rounded-3xl border border-teal/25 bg-linear-to-br from-teal/8 via-bg-elevated to-bg-elevated-2 p-4 shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal/15 text-teal">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">Next step</p>
                  <h3 className="font-display text-base font-semibold text-fg">Predict AQI</h3>
                </div>
              </div>
              <span className="rounded-full border border-cyan/20 bg-cyan/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan">
                forecast on demand
              </span>
            </div>

            {!predicted && !predicting && !predictError && (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-fg-muted">
                  This is now an explicit action instead of a wall of auto-loaded detail. Run it only when you want the model view.
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
              <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-bg-elevated/80 py-4 text-sm text-fg-muted">
                <Loader2 size={15} className="animate-spin text-teal" />
                Calling forecast model…
              </div>
            )}

            {predictError && (
              <ErrorNotice message={predictError} onRetry={handlePredict} />
            )}

            {predicted && forecast && (
              <div className="space-y-4">
                <ForecastChart forecast={forecast} loading={false} />
                <button
                  onClick={handlePredict}
                  className="inline-flex items-center gap-1.5 self-start rounded-full border border-border bg-bg-elevated-2 px-3 py-1.5 text-[11px] text-fg-muted transition-colors hover:border-teal/40 hover:text-fg"
                >
                  Re-run prediction
                  <ChevronRight size={12} />
                </button>

                <div className="space-y-2 rounded-3xl border border-border/80 bg-bg-elevated-2/70 p-4">
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

                {healthAdvisory && (
                  <div className="space-y-4 rounded-3xl border border-border/80 bg-bg-elevated-2/70 p-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">
                        Health advisory
                      </p>
                      <h4 className="mt-1 font-display text-base font-semibold text-fg">
                        Audience-specific guidance
                      </h4>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-bg-elevated p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-fg-faint">
                            Highest Forecast AQI
                          </p>
                          <p className="font-data-readout mt-2 text-4xl font-bold text-fg">
                            {Math.round(healthAdvisory.highest_forecast_aqi)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-fg">
                            {healthAdvisory.situation.aqi_category}
                          </p>
                          <p className="font-data-readout mt-1 text-xs text-fg-faint">
                            {new Date(healthAdvisory.situation.expected_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-fg-faint">
                        Nearby vulnerable infrastructure
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          ["Schools", healthAdvisory.vulnerability.school_count],
                          ["Kindergartens", healthAdvisory.vulnerability.kindergarten_count],
                          ["Hospitals", healthAdvisory.vulnerability.hospital_count],
                          ["Parks", healthAdvisory.vulnerability.park_count],
                          ["Bus Stops", healthAdvisory.vulnerability.bus_stop_count],
                          ["Markets", healthAdvisory.vulnerability.market_count],
                          ["Major Roads", healthAdvisory.vulnerability.major_roads_count],
                          ["Industrial Zones", healthAdvisory.vulnerability.industrial_zones_count],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-xl border border-border/70 bg-bg-elevated px-3 py-2"
                          >
                            <p className="font-data-readout text-lg font-semibold text-fg">
                              {value ?? 0}
                            </p>
                            <p className="text-[10px] text-fg-faint">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-fg-faint">
                        Guidance by audience
                      </p>
                      <div className="space-y-3">
                        {Object.entries(healthAdvisory.advisories).map(([audience, advisory]) => (
                          <details
                            key={audience}
                            className="rounded-2xl border border-border/70 bg-bg-elevated"
                          >
                            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-fg">
                              {audience}
                            </summary>
                            <div className="border-t border-border/70 px-4 py-3">
                              <p className="text-sm leading-6 text-fg-muted">
                                {advisory.message}
                              </p>
                              <ul className="mt-3 space-y-2">
                                {(advisory.recommendations ?? []).map((item) => (
                                  <li
                                    key={item}
                                    className="flex items-start gap-2 text-sm text-fg-muted"
                                  >
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function CompactMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-bg-elevated-2/80 px-3 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-fg-faint">
        {icon}
        {label}
      </div>
      <p className="font-data-readout mt-2 text-base font-semibold text-fg">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-fg-faint">
        {note}
      </p>
    </div>
  );
}