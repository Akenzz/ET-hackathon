"use client";

import { useMemo, type ReactNode } from "react";
import {
  Wind, Users, HardHat, TrendingUp, TrendingDown, MapPinned, ArrowRight, Gauge, ShieldCheck, ScrollText, Radar,
} from "lucide-react";
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
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-navy">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-teal/10 via-transparent to-transparent" />

      <section className="relative border-b border-border/80 bg-bg-elevated/55 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div className="rounded-3xl border border-border/80 bg-bg-elevated/85 p-5 shadow-xl backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-fg-faint">
              <Radar size={12} className="text-cyan" />
              Command overview
            </div>
            <div className="mt-4 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal/20 bg-teal/15 text-teal">
                <Wind size={24} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                  AQI Command Center
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-faint sm:text-[15px]">
                  Hyperlocal forecasting, source attribution, and city operations data in one trusted cockpit.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <RoleCard
                active={role === "citizen"}
                icon={<Users size={18} />}
                title="Citizen view"
                description="Clear air-quality status, simple advisories, and a lighter information density."
                note="Best for public-facing briefings"
                onClick={() => onSelectRole("citizen")}
                accent="teal"
              />
              <RoleCard
                active={role === "engineer"}
                icon={<HardHat size={18} />}
                title="Engineer view"
                description="Raw precision, station IDs, confidence detail, and model-validation cues."
                note="Best for operations and model debugging"
                onClick={() => onSelectRole("engineer")}
                accent="indigo"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <OverviewCard
              icon={<Gauge size={16} />}
              label="National avg AQI"
              value={stats.national !== null ? String(stats.national) : "—"}
              color={stats.national !== null ? getAqiColor(stats.national) : undefined}
              note="Current countrywide mean"
            />
            <OverviewCard
              icon={<ShieldCheck size={16} />}
              label="Stations in Poor+"
              value={`${stats.severeCount} / ${stations.length}`}
              color="var(--aqi-poor)"
              note="Stations requiring attention"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl border border-border/70 bg-bg-elevated-2" />
              ))}
            </div>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  icon={<Gauge size={16} />}
                  label="National avg AQI"
                  value={stats.national !== null ? String(stats.national) : "—"}
                  color={stats.national !== null ? getAqiColor(stats.national) : undefined}
                />
                <StatCard
                  icon={<TrendingUp size={16} />}
                  label="Worst city right now"
                  value={stats.worstCity ? stats.worstCity.city : "—"}
                  sub={stats.worstCity ? `AQI ${stats.worstCity.avg}` : undefined}
                  color={stats.worstCity ? getAqiColor(stats.worstCity.avg) : undefined}
                />
                <StatCard
                  icon={<TrendingDown size={16} />}
                  label="Best city right now"
                  value={stats.bestCity ? stats.bestCity.city : "—"}
                  sub={stats.bestCity ? `AQI ${stats.bestCity.avg}` : undefined}
                  color={stats.bestCity ? getAqiColor(stats.bestCity.avg) : undefined}
                />
                <StatCard
                  icon={<MapPinned size={16} />}
                  label="Stations in Poor+"
                  value={`${stats.severeCount} / ${stations.length}`}
                  color="var(--aqi-poor)"
                />
              </section>

              {role === "engineer" && (
                <div className="rounded-3xl border border-indigo/25 bg-indigo/10 px-4 py-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-indigo">
                    <ScrollText size={12} />
                    Forecast model validation
                  </div>
                  {metrics.isPending ? (
                    <p className="mt-2 text-sm text-fg-muted">
                      RMSE vs. persistence baseline is pending the validation run.
                    </p>
                  ) : (
                    <p className="mt-2 font-data text-sm text-fg">
                      Forecast RMSE {metrics.forecastRmse} vs. persistence baseline {metrics.persistenceRmse}
                    </p>
                  )}
                </div>
              )}

              <section className="rounded-3xl border border-border/80 bg-bg-elevated/85 p-4 shadow-xl backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">Hotspots</p>
                    <h2 className="mt-1 font-display text-lg font-semibold text-fg">Top {HOTSPOT_COUNT} hotspots right now</h2>
                  </div>
                  <p className="max-w-sm text-right text-xs text-fg-faint">
                    Ranked by current AQI, with the worst areas surfaced first for quick triage.
                  </p>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-border/70">
                  {stats.hotspots.map(({ station, reading }, i) => {
                    const band = getAqiBand(reading.aqi);
                    return (
                      <button
                        key={station.station_id}
                        onClick={() => onExplore(station.station_id)}
                        className="flex w-full items-center gap-3 border-b border-border/70 bg-bg-elevated px-4 py-3 text-left last:border-b-0 transition-colors hover:bg-bg-elevated-2"
                      >
                        <span className="font-data w-5 text-xs text-fg-faint">{i + 1}</span>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-inset ring-white/10" style={{ backgroundColor: band.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-fg">{station.name}</p>
                          <p className="text-[11px] text-fg-faint">{station.city}</p>
                        </div>
                        <span className="font-data text-right text-sm font-semibold" style={{ color: band.color }}>
                          {reading.aqi}
                        </span>
                      </button>
                    );
                  })}
                  {stats.hotspots.length === 0 && (
                    <p className="px-4 py-6 text-center text-xs text-fg-faint">No readings available yet.</p>
                  )}
                </div>
              </section>
            </>
          )}

          <button
            onClick={() => onExplore()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal px-4 py-3 text-sm font-semibold text-navy transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal/20"
          >
            Explore full map
            <ArrowRight size={16} />
          </button>
        </div>

        <aside className="space-y-3 rounded-3xl border border-border/80 bg-bg-elevated/80 p-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-fg-faint">
            <Radar size={12} className="text-cyan" />
            Live operating snapshot
          </div>
          <div className="space-y-3">
            <OverviewCard
              icon={<TrendingUp size={16} />}
              label="Worst city"
              value={stats.worstCity ? stats.worstCity.city : "—"}
              sub={stats.worstCity ? `AQI ${stats.worstCity.avg}` : undefined}
              color={stats.worstCity ? getAqiColor(stats.worstCity.avg) : undefined}
            />
            <OverviewCard
              icon={<TrendingDown size={16} />}
              label="Best city"
              value={stats.bestCity ? stats.bestCity.city : "—"}
              sub={stats.bestCity ? `AQI ${stats.bestCity.avg}` : undefined}
              color={stats.bestCity ? getAqiColor(stats.bestCity.avg) : undefined}
            />
          </div>
          <p className="text-sm leading-6 text-fg-faint">
            Role selection is preserved: citizen mode emphasizes guidance, while engineer mode exposes validation and precision detail.
          </p>
        </aside>
      </div>
    </div>
  );
}

function RoleCard({
  active,
  icon,
  title,
  description,
  note,
  onClick,
  accent,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  note: string;
  onClick: () => void;
  accent: "teal" | "indigo";
}) {
  const activeClasses = accent === "teal"
    ? "border-teal/40 bg-teal/10"
    : "border-indigo/40 bg-indigo/10";
  const idleClasses = accent === "teal"
    ? "border-border/80 bg-bg-elevated-2/80 hover:border-teal/40"
    : "border-border/80 bg-bg-elevated-2/80 hover:border-indigo/40";

  return (
    <button
      onClick={onClick}
      className={"rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 " + (active ? activeClasses : idleClasses)}
    >
      <div className="flex items-start gap-3">
        <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + (accent === "teal" ? "bg-teal/15 text-teal" : "bg-indigo/15 text-indigo") }>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-fg">{title}</h3>
            {active && <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-cyan">Selected</span>}
          </div>
          <p className="mt-1 text-sm leading-6 text-fg-faint">{description}</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-fg-faint">{note}</p>
        </div>
      </div>
    </button>
  );
}

function OverviewCard({
  icon, label, value, sub, color, note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-bg-elevated-2/75 p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-fg-faint">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="font-data mt-2 truncate text-xl font-semibold" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-fg-faint">{sub}</p>}
      {note && <p className="mt-1 text-[11px] text-fg-faint">{note}</p>}
    </div>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: { icon: ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-bg-elevated-2/80 p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-fg-faint">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="font-data mt-1.5 truncate text-lg font-semibold" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-fg-faint">{sub}</p>}
    </div>
  );
}