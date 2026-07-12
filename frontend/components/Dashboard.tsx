"use client";

import { useMemo } from "react";
import { Wind, Users, HardHat, TrendingUp, TrendingDown, MapPinned, ArrowRight, Gauge } from "lucide-react";
import type { Station, LatestReading } from "@/lib/types";
import type { UserRole } from "@/lib/role";
import { getAqiBand, getAqiColor } from "@/lib/aqi";
import { getModelMetrics } from "@/lib/modelMetrics";

interface DashboardProps {
  stations: Station[];
  readings: Record<string, LatestReading>;
  loading: boolean;
  role: UserRole | null;
  onSelectRole: (role: UserRole) => void;
  onExplore: (stationId?: string) => void;
}

const HOTSPOT_COUNT = 8;

export default function Dashboard({
  stations, readings, loading, role, onSelectRole, onExplore,
}: DashboardProps) {
  const stats = useMemo(() => {
    const withReadings = stations
      .map((s) => ({ station: s, reading: readings[s.station_id] }))
      .filter((x): x is { station: Station; reading: LatestReading } => !!x.reading);

    if (withReadings.length === 0) {
      return { national: null, worstCity: null, bestCity: null, severeCount: 0, hotspots: [] as typeof withReadings };
    }

    const national = Math.round(
      withReadings.reduce((sum, x) => sum + x.reading.aqi, 0) / withReadings.length
    );

    const byCity = new Map<string, number[]>();
    for (const x of withReadings) {
      const arr = byCity.get(x.station.city) ?? [];
      arr.push(x.reading.aqi);
      byCity.set(x.station.city, arr);
    }
    const cityAverages = Array.from(byCity.entries()).map(([city, vals]) => ({
      city,
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));
    cityAverages.sort((a, b) => b.avg - a.avg);
    const worstCity = cityAverages[0] ?? null;
    const bestCity = cityAverages[cityAverages.length - 1] ?? null;

    const severeCount = withReadings.filter((x) => x.reading.aqi > 200).length;

    const hotspots = [...withReadings].sort((a, b) => b.reading.aqi - a.reading.aqi).slice(0, HOTSPOT_COUNT);

    return { national, worstCity, bestCity, severeCount, hotspots };
  }, [stations, readings]);

  const metrics = getModelMetrics();

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-navy">
      {/* Hero / role selection */}
      <div className="border-b border-border bg-bg-elevated/60 px-6 py-8 text-center sm:py-10">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-teal/15 text-teal">
          <Wind size={22} strokeWidth={2.25} />
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          AQI Command Center
        </h1>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-fg-faint">
          Hyperlocal forecasting, source attribution, and citizen advisory — built on live CPCB data.
        </p>

        <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
          <button
            onClick={() => onSelectRole("citizen")}
            className={
              "flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 text-left transition-colors " +
              (role === "citizen"
                ? "border-teal bg-teal/10"
                : "border-border bg-bg-elevated-2 hover:border-teal/50")
            }
          >
            <Users size={20} className="text-teal" />
            <span className="text-sm font-semibold text-fg">I'm a citizen</span>
            <span className="text-[11px] text-fg-faint">Check air quality, get health advice</span>
          </button>
          <button
            onClick={() => onSelectRole("engineer")}
            className={
              "flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 text-left transition-colors " +
              (role === "engineer"
                ? "border-indigo bg-indigo/10"
                : "border-border bg-bg-elevated-2 hover:border-indigo/50")
            }
          >
            <HardHat size={20} className="text-indigo" />
            <span className="text-sm font-semibold text-fg">I'm a forecasting engineer</span>
            <span className="text-[11px] text-fg-faint">Raw data, attribution detail, model metrics</span>
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-elevated-2" />
            ))}
          </div>
        ) : (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={<Gauge size={16} />}
                label="National avg AQI"
                value={stats.national !== null ? String(stats.national) : "—"}
                color={stats.national !== null ? getAqiColor(stats.national) : undefined}
              />
              <StatCard
                icon={<TrendingUp size={16} />}
                label="Worst city right now"
                value={stats.worstCity ? `${stats.worstCity.city}` : "—"}
                sub={stats.worstCity ? `AQI ${stats.worstCity.avg}` : undefined}
                color={stats.worstCity ? getAqiColor(stats.worstCity.avg) : undefined}
              />
              <StatCard
                icon={<TrendingDown size={16} />}
                label="Best city right now"
                value={stats.bestCity ? `${stats.bestCity.city}` : "—"}
                sub={stats.bestCity ? `AQI ${stats.bestCity.avg}` : undefined}
                color={stats.bestCity ? getAqiColor(stats.bestCity.avg) : undefined}
              />
              <StatCard
                icon={<MapPinned size={16} />}
                label="Stations in Poor+"
                value={`${stats.severeCount} / ${stations.length}`}
                color="var(--aqi-poor)"
              />
            </div>

            {role === "engineer" && (
              <div className="mt-3 rounded-xl border border-indigo/30 bg-indigo/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-indigo">Forecast model validation</p>
                {metrics.isPending ? (
                  <p className="mt-1 text-xs text-fg-muted">
                    RMSE vs. persistence baseline — pending Person B's validation run.
                  </p>
                ) : (
                  <p className="mt-1 font-data text-sm text-fg">
                    Forecast RMSE {metrics.forecastRmse} vs. persistence baseline {metrics.persistenceRmse}
                  </p>
                )}
              </div>
            )}

            {/* Hotspot list */}
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-fg">
                Top {HOTSPOT_COUNT} hotspots right now
              </h2>
              <div className="overflow-hidden rounded-xl border border-border">
                {stats.hotspots.map(({ station, reading }, i) => {
                  const band = getAqiBand(reading.aqi);
                  return (
                    <button
                      key={station.station_id}
                      onClick={() => onExplore(station.station_id)}
                      className="flex w-full items-center gap-3 border-b border-border bg-bg-elevated px-4 py-3 text-left last:border-b-0 transition-colors hover:bg-bg-elevated-2"
                    >
                      <span className="font-data w-5 text-xs text-fg-faint">{i + 1}</span>
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: band.color }}
                      />
                      <span className="flex-1 truncate text-sm text-fg">{station.name}</span>
                      <span className="text-xs text-fg-faint">{station.city}</span>
                      <span
                        className="font-data w-10 shrink-0 text-right text-sm font-semibold"
                        style={{ color: band.color }}
                      >
                        {reading.aqi}
                      </span>
                    </button>
                  );
                })}
                {stats.hotspots.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-fg-faint">No readings available yet.</p>
                )}
              </div>
            </div>
          </>
        )}

        <button
          onClick={() => onExplore()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-3 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
        >
          Explore full map
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated-2 p-3">
      <div className="flex items-center gap-1.5 text-fg-faint">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-data mt-1.5 truncate text-lg font-semibold" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-fg-faint">{sub}</p>}
    </div>
  );
}