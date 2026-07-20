"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
  onError?: (err: Error) => void;
}
interface State {
  error: Error | null;
}

export default class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[MapErrorBoundary] Caught error:", error.message);
    console.error("[MapErrorBoundary] Component stack:", info.componentStack);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-bg-elevated p-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-400/15 text-red-400">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-fg">Map failed to load</p>
            <p className="max-w-sm text-xs leading-5 text-fg-faint">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-1 flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated-2 px-4 py-2 text-[11px] text-fg-muted transition-colors hover:border-teal/40 hover:text-fg"
          >
            <RotateCw size={11} />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}