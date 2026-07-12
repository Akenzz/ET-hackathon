"use client";

import { Wind, Radio } from "lucide-react";

interface HeaderProps {
  lastUpdated: Date | null;
  liveStationCount: number;
  totalStationCount: number;
}

export default function Header({ lastUpdated, liveStationCount, totalStationCount }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-bg-elevated/60 px-6 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal/15 text-teal">
          <Wind size={18} strokeWidth={2.25} />
        </div>
        <div className="leading-tight">
          <h1 className="font-display text-[15px] font-semibold tracking-tight text-fg">
            AQI Command Center
          </h1>
          <p className="text-[11px] text-fg-faint">India · Hyperlocal Intelligence</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border bg-navy/40 px-3 py-1.5 text-[11px] text-fg-muted">
        <span className="relative flex h-2 w-2">
          <span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-cyan" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
        </span>
        <Radio size={12} className="text-cyan" />
        <span className="font-data">
          {liveStationCount > 0
            ? `${liveStationCount} station${liveStationCount === 1 ? "" : "s"} LIVE · ${totalStationCount - liveStationCount} demo`
            : "DEMO DATA"}
          {lastUpdated && (
            <span className="text-fg-faint">
              {" · updated "}
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </span>
      </div>
    </header>
  );
}