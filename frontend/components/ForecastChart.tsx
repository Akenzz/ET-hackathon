"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { Forecast } from "@/lib/types";
import { getAqiColor } from "@/lib/aqi";

interface ForecastChartProps {
  forecast: Forecast | null;
  loading: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const d = new Date(label);
  return (
    <div className="rounded-md border border-border bg-bg-elevated-2 px-3 py-2 text-xs shadow-lg">
      <p className="text-fg-faint">
        {d.toLocaleDateString([], { weekday: "short" })} {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p className="mt-1 font-data text-sm font-semibold" style={{ color: getAqiColor(p.aqi_predicted) }}>
        AQI {p.aqi_predicted}
      </p>
      <p className="text-fg-faint">range {p.confidence_low}–{p.confidence_high}</p>
    </div>
  );
}

export default function ForecastChart({ forecast, loading }: ForecastChartProps) {
  if (loading) {
    return <div className="h-48 w-full animate-pulse rounded-lg bg-bg-elevated-2" />;
  }
  if (!forecast || forecast.predictions.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-fg-faint">
        No forecast available for this station yet.
      </div>
    );
  }

  const data = forecast.predictions.map((p) => ({ ...p }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18A3B7" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#18A3B7" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2C5674" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="ts"
            tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: "numeric" })}
            stroke="#7FA6BE"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: "#2C5674" }}
            interval={3}
          />
          <YAxis stroke="#7FA6BE" fontSize={10} tickLine={false} axisLine={false} width={32} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={100} stroke="#F4C542" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine y={200} stroke="#F08C3A" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Area
            type="monotone"
            dataKey="aqi_predicted"
            stroke="#18A3B7"
            strokeWidth={2}
            fill="url(#forecastFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
