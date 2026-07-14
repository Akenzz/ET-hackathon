"use client";

import { Wind, Radio, Satellite, Clock3 } from "lucide-react";

interface HeaderProps {
  lastUpdated: Date | null;
  liveStationCount: number;
  totalStationCount: number;
}

export default function Header({ lastUpdated, liveStationCount, totalStationCount }: HeaderProps) {
  const liveLabel =
    liveStationCount > 0
      ? `${liveStationCount} live · ${totalStationCount - liveStationCount} demo`
      : "Demo feed";

  return (
    <header className="border-b border-border/80 bg-bg-elevated/60 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal/20 bg-teal/15 text-teal shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
            <Wind size={19} strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <h1 className="font-display text-[15px] font-semibold tracking-tight text-fg sm:text-base">
              AQI Command Center
            </h1>
            <p className="text-[11px] text-fg-faint sm:text-xs">India-wide operations view</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <div className="flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1.5 text-[11px] text-fg-muted">
            <span className="relative flex h-2 w-2">
              <span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-cyan" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
            </span>
            <Radio size={12} className="text-cyan" />
            <span className="font-data text-fg">{liveLabel}</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-bg-elevated-2/85 px-3 py-1.5 text-[11px] text-fg-muted">
            <Satellite size={12} className="text-sky" />
            <span className="font-data text-fg">{totalStationCount} monitored stations</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-bg-elevated-2/85 px-3 py-1.5 text-[11px] text-fg-muted">
            <Clock3 size={12} className="text-sky" />
            <span className="font-data">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for first sync"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}