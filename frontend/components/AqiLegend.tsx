import { AQI_BANDS } from "@/lib/aqi";

export default function AqiLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border/80 bg-bg-elevated/90 px-4 py-3 backdrop-blur-xl shadow-lg">
      <div className="flex items-center gap-1.5 border-r border-border/70 pr-3 text-[10px] uppercase tracking-[0.18em] text-fg-faint">
        <span>AQI scale</span>
      </div>
      {AQI_BANDS.map((band) => (
        <div key={band.label} className="flex items-center gap-1.5 rounded-full bg-bg-elevated-2/70 px-2 py-1">
          <span
            className="h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-white/10"
            style={{ backgroundColor: band.color }}
          />
          <span className="whitespace-nowrap text-[10px] text-fg-muted">{band.label}</span>
        </div>
      ))}
    </div>
  );
}
