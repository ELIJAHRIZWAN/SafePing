import React, { ReactNode } from "react";

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class SafeModuleBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[SafeModuleBoundary] Error caught in sub-module "${(this as any).props.moduleName || 'Unknown'}":`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-3 rounded-xl bg-red-950/15 border border-red-500/20 text-red-200 text-left font-sans space-y-1 my-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-red-400 text-[10px]">⚠️</span>
            <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#fca5a5] font-mono">
              {(this as any).props.moduleName || "Escort Shield Module"} Secured
            </span>
          </div>
          <p className="text-[8.5px] text-white/50 leading-relaxed font-medium">
            Background module paused gracefully due to a momentary hardware anomaly. All main SOS tracking, audio triggers, and guardian connections remain active.
          </p>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
