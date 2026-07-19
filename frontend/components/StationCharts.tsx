"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LatestReading, HistoryPoint } from "@/lib/types";

const POLLUTANT_LABELS: Record<string, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  no2: "NO₂",
  so2: "SO₂",
  co: "CO",
  o3: "O₃",
};

const POLLUTANT_COLORS: Record<string, string> = {
  pm25: "#27E6EC",
  pm10: "#5AA5CD",
  no2: "#7F9BFF",
  so2: "#F08C3A",
  co: "#B68CFF",
  o3: "#18A3B7",
};

function formatPollutantValue(key: string, value: number, isEngineer: boolean): string {
  if (key === "co") {
    return value.toFixed(2);
  }
  return isEngineer ? value.toFixed(2) : String(Math.round(value));
}

function ChartShell({
  loading,
  empty,
  emptyLabel,
  children,
}: {
  loading: boolean;
  empty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return <div className="h-56 w-full animate-pulse rounded-3xl bg-bg-elevated-2/80" />;
  }

  if (empty) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-3xl border border-dashed border-border bg-bg-elevated-2/60 px-4 text-center text-sm text-fg-faint">
        {emptyLabel}
      </div>
    );
  }

  return <>{children}</>;
}

type PollutantDataPoint = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type PollutantTooltipProps = {
  active?: boolean;
  payload?: {
    payload: PollutantDataPoint;
  }[];
};

function PollutantTooltip({
  active,
  payload,
}: PollutantTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-2xl border border-border bg-bg-elevated-2 px-3 py-2.5 text-xs shadow-xl">
      <p className="text-fg-faint">Pollutant mix</p>

      <p
        className="mt-1 font-semibold text-fg"
        style={{ color: point.color }}
      >
        {point.label}:{" "}
        {point.key === "co"
          ? point.value.toFixed(2)
          : Math.round(point.value)}
      </p>
    </div>
  );
}

export function PollutantMixChart({ reading, loading, isEngineer }: {
  reading: LatestReading | undefined;
  loading: boolean;
  isEngineer: boolean;
}) {
  const data = reading
    ? Object.entries(reading.pollutants)
      .map(([key, value]) => {
        if (typeof value !== "number") return null;
        return {
          key,
          label: POLLUTANT_LABELS[key] ?? key.toUpperCase(),
          value,
          color: POLLUTANT_COLORS[key] ?? "#5AA5CD",
        } satisfies PollutantDataPoint;
      })
      .filter((item): item is PollutantDataPoint => item !== null)
    : [];

  return (
    <ChartShell loading={loading} empty={!reading || data.length === 0} emptyLabel="No pollutant data is available for this station yet.">
      <div className="rounded-3xl border border-border/80 bg-bg-elevated-2/70 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">Pollutant mix</p>
            <h4 className="mt-1 font-display text-base font-semibold text-fg">What is driving the AQI</h4>
          </div>
          <span className="rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-[10px] text-fg-faint">
            hover bars
          </span>
        </div>

        <div className="mt-4 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 12, bottom: 0 }}>
              <CartesianGrid stroke="#2C5674" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="#7FA6BE" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                stroke="#7FA6BE"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<PollutantTooltip />} cursor={{ fill: "rgba(90, 165, 205, 0.08)" }} />
              <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {data.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-[10px] text-fg-faint"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}: {formatPollutantValue(item.key, item.value, isEngineer)}
            </span>
          ))}
        </div>
      </div>
    </ChartShell>
  );
}

type HistoryDataPoint = HistoryPoint & {
  label: string;
};

type HistoryTooltipProps = {
  active?: boolean;
  payload?: {
    payload: HistoryDataPoint;
  }[];
  label?: string | number;
};

function HistoryTooltip({
  active,
  payload,
  label,
}: HistoryTooltipProps) {
  if (!active || !payload || payload.length === 0 || label === undefined) {
    return null;
  }

  const point = payload[0].payload;
  const d = new Date(label);

  return (
    <div className="rounded-2xl border border-border bg-bg-elevated-2 px-3 py-2.5 text-xs shadow-xl">
      <p className="text-fg-faint">
        {d.toLocaleDateString([], {
          month: "short",
          day: "numeric",
        })}{" "}
        {d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <p className="mt-1 text-sm font-semibold text-fg">
        AQI {Math.round(point.aqi)}
      </p>
    </div>
  );
}

export function AQIHistoryChart({ history, loading }: { history: HistoryPoint[] | null; loading: boolean; }) {
  const data = history?.map((point) => ({
    ...point,
    label: new Date(point.timestamp).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
  })) ?? [];

  return (
    <ChartShell loading={loading} empty={!history || history.length === 0} emptyLabel="No history is available for this station yet.">
      <div className="rounded-3xl border border-border/80 bg-bg-elevated-2/70 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">AQI trend</p>
            <h4 className="mt-1 font-display text-base font-semibold text-fg">Recent movement in air quality</h4>
          </div>
          <span className="rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-[10px] text-fg-faint">
            scroll to inspect
          </span>
        </div>

        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="stationHistoryFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#27E6EC" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#27E6EC" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2C5674" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="timestamp"
                stroke="#7FA6BE"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#2C5674" }}
                interval={Math.max(1, Math.floor(data.length / 6))}
                tickFormatter={(value) => new Date(value).toLocaleDateString([], { weekday: "short", day: "numeric" })}
              />
              <YAxis stroke="#7FA6BE" fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<HistoryTooltip />} />
              <Line type="monotone" dataKey="aqi" stroke="#27E6EC" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#27E6EC", stroke: "#0D1420", strokeWidth: 2 }} />
              <Area type="monotone" dataKey="aqi" stroke="none" fill="url(#stationHistoryFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartShell>
  );
}