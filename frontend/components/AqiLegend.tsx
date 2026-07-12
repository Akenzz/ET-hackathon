import { AQI_BANDS } from "@/lib/aqi";

export default function AqiLegend() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-elevated/80 px-3 py-2 backdrop-blur-sm">
      {AQI_BANDS.map((band) => (
        <div key={band.label} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: band.color }}
          />
          <span className="text-[10px] text-fg-muted whitespace-nowrap">{band.label}</span>
        </div>
      ))}
    </div>
  );
}
