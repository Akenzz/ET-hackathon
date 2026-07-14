import { Car, HardHat, Factory, Wind as WindIcon, Flame, Sparkles } from "lucide-react";
import type { Attribution } from "@/lib/types";
import { getSourceLabel } from "@/lib/aqi";

const ICONS: Record<string, React.ElementType> = {
  traffic: Car,
  construction: HardHat,
  industrial: Factory,
  meteorological_inversion: WindIcon,
  waste_burning: Flame,
};

export default function AttributionBadge(props: { attribution: Attribution | null; loading: boolean }) {
  const { attribution, loading } = props;
  if (loading) {
    return <div className="h-24 w-full animate-pulse rounded-lg bg-bg-elevated-2" />;
  }
  if (!attribution) return null;

  const Icon = ICONS[attribution.likely_source] || Sparkles;
  const confidencePct = Math.round(attribution.confidence * 100);

  return (
    <div className="rounded-2xl border border-border/80 bg-bg-elevated-2/90 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo/20 bg-indigo/15 text-indigo">
            <Icon size={16} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">Likely cause</p>
            <p className="text-sm font-semibold text-fg">{getSourceLabel(attribution.likely_source)}</p>
          </div>
        </div>
        <div className="rounded-full border border-cyan/20 bg-cyan/10 px-2.5 py-1 text-right">
          <p className="font-data text-sm font-semibold text-cyan">{confidencePct}%</p>
          <p className="text-[10px] text-fg-faint">confidence</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2 border-t border-border/70 pt-2.5">
        {attribution.contributing_factors.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[11px] text-fg-muted">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
