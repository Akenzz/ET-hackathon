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
        "flex items-center justify-between gap-3 rounded-lg border border-aqi-very-poor/40 bg-aqi-very-poor/10 " +
        (compact ? "px-3 py-2" : "p-4")
      }
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={compact ? 14 : 16} className="mt-0.5 shrink-0 text-aqi-very-poor" />
        <p className="text-xs text-fg-muted">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-bg-elevated-2 px-2 py-1 text-[11px] text-fg-muted transition-colors hover:text-fg"
        >
          <RotateCw size={11} />
          Retry
        </button>
      )}
    </div>
  );
}