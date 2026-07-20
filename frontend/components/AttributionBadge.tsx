import { Car, HardHat, Factory, Wind as WindIcon, Flame, Sparkles } from "lucide-react";
import type { Attribution } from "@/lib/types";
import { getSourceLabel } from "@/lib/aqi";

const ICONS: Record<string, React.ElementType> = {
  traffic: Car,
  vehicular: Car,
  construction: HardHat,
  industrial: Factory,
  meteorological_inversion: WindIcon,
  waste_burning: Flame,
};

export default function AttributionBadge(props: { attribution: Attribution | null; loading: boolean }) {
  const { attribution, loading } = props;
  if (loading) {
    return <div className="h-24 w-full animate-pulse rounded-2xl bg-bg-elevated-2" />;
  }
  if (!attribution) return null;

  const source = attribution.likely_source ?? "Unknown";
  const factors = Array.isArray(attribution.contributing_factors) ? attribution.contributing_factors : [];
  const confidence = typeof attribution.confidence === "number" ? attribution.confidence : 0;

  const Icon = ICONS[source.toLowerCase()] || Sparkles;
  const confidencePct = Math.round(confidence * 100);
  const confidenceColor =
    confidencePct >= 75 ? "#27E6EC" : confidencePct >= 45 ? "#5AA5CD" : "#7FA6BE";

  return (
    <div className="rounded-2xl border border-border bg-bg-elevated-2 p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo/20 text-indigo">
            <Icon size={16} />
          </div>
          <div>
            <p className="text-[11px] text-fg-faint">Likely cause</p>
            <p className="text-sm font-semibold text-fg">{getSourceLabel(source)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-data-readout text-sm font-semibold" style={{ color: confidenceColor }}>
            {confidencePct}%
          </p>
          <p className="text-[10px] text-fg-faint">confidence</p>
        </div>
      </div>

      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${confidencePct}%`, backgroundColor: confidenceColor }}
        />
      </div>

      {factors.length > 0 && (
        <ul className="mt-2.5 space-y-1 border-t border-border pt-2.5">
          {factors.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-[11px] text-fg-muted">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}