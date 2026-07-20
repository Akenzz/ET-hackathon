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
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-teal/30 bg-gradient-to-br from-teal/25 via-teal/10 to-transparent text-cyan shadow-[0_0_20px_-6px_rgba(39,230,236,0.45)]">
            <Wind size={19} strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <h1 className="font-display text-[16px] font-semibold tracking-tight text-fg sm:text-lg">
              AQI <span className="text-cyan">Command Center</span>
            </h1>
            <p className="font-data-readout text-[10.5px] uppercase tracking-[0.14em] text-fg-faint sm:text-[11px]">
              India-wide operations view
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">

          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-bg-elevated-2/85 px-3 py-1.5 text-[11px] text-fg-muted">
            <Satellite size={12} className="text-sky" />
            <span className="font-data-readout text-fg">{totalStationCount} monitored stations</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-bg-elevated-2/85 px-3 py-1.5 text-[11px] text-fg-muted">
            <Clock3 size={12} className="text-sky" />
            <span className="font-data-readout">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for first sync"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}