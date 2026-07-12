import { AlertTriangle, RotateCw } from "lucide-react";

interface ErrorNoticeProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export default function ErrorNotice({ message, onRetry, compact }: ErrorNoticeProps) {
  return (
    <div
      className={
        "flex items-start justify-between gap-3 rounded-2xl border border-aqi-very-poor/30 bg-aqi-very-poor/10 shadow-sm " +
        (compact ? "px-3 py-2" : "p-4")
      }
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-aqi-very-poor/15 text-aqi-very-poor">
          <AlertTriangle size={compact ? 13 : 15} />
        </div>
        <p className={compact ? "text-xs text-fg-muted" : "text-sm text-fg-muted"}>{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-bg-elevated-2 px-3 py-1.5 text-[11px] text-fg-muted transition-colors hover:border-teal/40 hover:text-fg"
        >
          <RotateCw size={11} />
          Retry
        </button>
      )}
    </div>
  );
}