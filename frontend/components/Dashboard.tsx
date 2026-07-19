"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Wind, Users, HardHat, TrendingUp, TrendingDown, MapPinned, ArrowRight, Gauge,
  ShieldCheck, ScrollText, Radar, AlertTriangle, ChevronDown, LayoutGrid,
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
  const nationalColor = stats.national !== null ? getAqiColor(stats.national) : "var(--fg-faint)";
  const nationalBand = stats.national !== null ? getAqiBand(stats.national) : null;

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-navy">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-teal/10 via-transparent to-transparent" />

      {/* The ONLY thing forced on a returning user: one live number.
          Everything else below is opt-in via accordion sections. */}
      <section className="relative border-b border-border/80 bg-bg-elevated/55 px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-fg-faint">
            {role === "engineer" ? <HardHat size={12} className="text-indigo" /> : <Users size={12} className="text-teal" />}
            {role === "engineer" ? "Engineer view" : "Citizen view"}
          </div>

          <div className="relative mt-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="pulse-live absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: nationalColor }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: nationalColor }} />
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">National avg AQI</span>
          </div>
          <p className="font-data-readout mt-2 text-7xl font-bold leading-none sm:text-8xl" style={{ color: nationalColor }}>
            {stats.national !== null ? stats.national : "—"}
          </p>
          <p className="mt-2 text-base font-medium text-fg-muted">
            {nationalBand ? nationalBand.label : "Awaiting first sync"}
          </p>

          <button
            onClick={() => onExplore()}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-teal px-5 py-3 text-sm font-semibold text-navy transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal/20"
          >
            Explore full map
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-6 sm:px-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-3xl border border-border/70 bg-bg-elevated-2" />
            ))}
          </div>
        ) : (
          <>
            <AccordionSection
              title="At a glance"
              subtitle="National, worst city, best city, stations to watch"
              icon={<Gauge size={17} />}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                  label="Stations tracked"
                  value={String(stations.length)}
                />
                <StatCard
                  icon={<ShieldCheck size={16} />}
                  label="Poor+ stations"
                  value={`${stats.severeCount} / ${stations.length}`}
                  color="var(--aqi-poor)"
                />
              </div>
            </AccordionSection>

            <AccordionSection
              title="Hotspots"
              subtitle={`Top ${HOTSPOT_COUNT} stations by current AQI`}
              icon={<AlertTriangle size={17} />}
              badge={
                stats.hotspots.length > 0 ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${getAqiColor(stats.hotspots[0].reading.aqi)}22`, color: getAqiColor(stats.hotspots[0].reading.aqi) }}
                  >
                    worst {stats.hotspots[0].reading.aqi}
                  </span>
                ) : undefined
              }
            >
              <div className="overflow-hidden rounded-2xl border border-border/70">
                {stats.hotspots.map(({ station, reading }, i) => {
                  const band = getAqiBand(reading.aqi);
                  return (
                    <button
                      key={station.station_id}
                      onClick={() => onExplore(station.station_id)}
                      className="flex w-full items-center gap-3 border-b border-border/70 bg-bg-elevated px-4 py-3 text-left last:border-b-0 transition-colors hover:bg-bg-elevated-2"
                    >
                      <span className="font-data-readout w-5 text-xs text-fg-faint">{i + 1}</span>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-inset ring-white/10" style={{ backgroundColor: band.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-fg">{station.name}</p>
                        <p className="text-[11px] text-fg-faint">{station.city}</p>
                      </div>
                      <span className="font-data-readout text-right text-sm font-semibold" style={{ color: band.color }}>
                        {reading.aqi}
                      </span>
                    </button>
                  );
                })}
                {stats.hotspots.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-fg-faint">No readings available yet.</p>
                )}
              </div>
            </AccordionSection>

            {role === "engineer" && (
              <AccordionSection
                title="Forecast model validation"
                subtitle="RMSE vs. persistence baseline"
                icon={<ScrollText size={17} />}
              >
                {metrics.isPending ? (
                  <p className="text-sm text-fg-muted">RMSE vs. persistence baseline is pending the validation run.</p>
                ) : (
                  <p className="font-data-readout text-sm text-fg">
                    Forecast RMSE {metrics.forecastRmse} vs. persistence baseline {metrics.persistenceRmse}
                  </p>
                )}
              </AccordionSection>
            )}

            <AccordionSection
              title="Switch view"
              subtitle={role === "engineer" ? "Currently: Engineer" : "Currently: Citizen"}
              icon={<LayoutGrid size={17} />}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <RoleCard
                  active={role === "citizen"}
                  icon={<Users size={18} />}
                  title="Citizen view"
                  description="Clear air-quality status, simple advisories, lighter density."
                  onClick={() => onSelectRole("citizen")}
                  accent="teal"
                />
                <RoleCard
                  active={role === "engineer"}
                  icon={<HardHat size={18} />}
                  title="Engineer view"
                  description="Raw precision, station IDs, model-validation detail."
                  onClick={() => onSelectRole("engineer")}
                  accent="indigo"
                />
              </div>
            </AccordionSection>
          </>
        )}
      </div>
    </div>
  );
}

function AccordionSection({
  title, subtitle, icon, badge, defaultOpen = false, children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-bg-elevated/85 shadow-lg backdrop-blur-xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/15 text-teal">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-semibold text-fg">{title}</h2>
            {subtitle && <p className="truncate text-xs text-fg-faint">{subtitle}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          <ChevronDown size={16} className={"text-fg-faint transition-transform duration-200 " + (open ? "rotate-180" : "")} />
        </div>
      </button>
      {open && <div className="border-t border-border/70 p-4 pt-4">{children}</div>}
    </div>
  );
}

function RoleCard({
  active, icon, title, description, onClick, accent,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  accent: "teal" | "indigo";
}) {
  const activeClasses = accent === "teal" ? "border-teal/40 bg-teal/10" : "border-indigo/40 bg-indigo/10";
  const idleClasses = accent === "teal"
    ? "border-border/80 bg-bg-elevated-2/80 hover:border-teal/40"
    : "border-border/80 bg-bg-elevated-2/80 hover:border-indigo/40";

  return (
    <button
      onClick={onClick}
      className={"rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 " + (active ? activeClasses : idleClasses)}
    >
      <div className="flex items-start gap-3">
        <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + (accent === "teal" ? "bg-teal/15 text-teal" : "bg-indigo/15 text-indigo")}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-fg">{title}</h3>
            {active && <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-cyan">Selected</span>}
          </div>
          <p className="mt-1 text-sm leading-6 text-fg-faint">{description}</p>
        </div>
      </div>
    </button>
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
      <p className="font-data-readout mt-1.5 truncate text-lg font-semibold" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-fg-faint">{sub}</p>}
    </div>
  );
}