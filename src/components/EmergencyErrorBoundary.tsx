import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class EmergencyErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Emergency system error caught:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-[#0c0d10] text-[#E8E6F0] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[10%] left-[10%] w-[60%] h-[30%] bg-[#6a3de8]/8 blur-[120px] rounded-full" />
            <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[30%] bg-red-500/5 blur-[120px] rounded-full" />
          </div>
          <div className="relative z-10 max-w-md w-full flex flex-col items-center gap-6 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.25)]">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="space-y-2">
              <span className="text-red-400 font-extrabold tracking-[0.35em] text-[9px] uppercase block">
                SYSTEM RECOVERY ACTIVE
              </span>
              <h2 className="text-white text-lg font-bold tracking-tight">
                Emergency Escort Stabilizer Triggered
              </h2>
              <p className="text-[#E8E6F0]/60 text-xs leading-relaxed font-medium">
                The companion's protective matrix experienced an unexpected error. Don't worry, your background safety tracking remains fully operational.
              </p>
            </div>
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => {
                  try {
                    localStorage.setItem('safeping_emergency_state', 'idle');
                    localStorage.setItem('safeping_emergency_active', 'false');
                  } catch {}
                  window.location.reload();
                }}
                className="w-full bg-[#1DBB8A] hover:bg-[#159a71] text-white py-3 rounded-2xl text-xs font-bold transition-all shadow-[0_4px_20px_rgba(29,187,138,0.25)] flex items-center justify-center gap-2"
              >
                Reset & Restore Sentinel Connection
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('safeping_emergency_state');
                    localStorage.removeItem('safeping_emergency_active');
                  } catch {}
                  window.location.href = '/dashboard';
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-white/80 py-2.5 rounded-2xl text-[10px] font-semibold transition-all border border-white/5"
              >
                Force Stand Down & Exit
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
