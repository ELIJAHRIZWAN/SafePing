import { motion } from 'motion/react';
import { Home, Shield, FileText, Lock, Settings as SettingsIcon } from 'lucide-react';
import { View } from '../types';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

interface BottomNavProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function BottomNav({ currentView, onViewChange }: BottomNavProps) {
  const { isDarkMode, isGuest, triggerSOS, user } = useApp();
  
  const tabs = [
    { id: 'home' as View, icon: Home, label: 'Home', isProtected: false },
    { id: 'guardians' as View, icon: Shield, label: 'Circle', isProtected: true },
    ...(user.role !== 'guardian'
      ? [{ id: 'sos' as View, icon: Shield, label: 'SOS', isProtected: false }]
      : []
    ),
    { id: 'logs' as View, icon: FileText, label: 'Logs', isProtected: true },
    { id: 'settings' as View, icon: SettingsIcon, label: 'Profile', isProtected: true },
  ];

  return (
    <nav id="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-5 pointer-events-none bg-gradient-to-t from-[#010203]/95 via-[#010203]/10 to-transparent">
      <div className={cn(
        "max-w-md mx-auto rounded-[28px] p-2.5 flex justify-between items-center pointer-events-auto transition-all duration-700",
        "bg-[#020305]/75 backdrop-blur-[54px] border border-white/[0.04] shadow-[0_16px_48px_rgba(0,0,0,0.95)]"
      )}>
        {tabs.map((tab) => {
          const isActive = currentView === tab.id;

          // Special rendering for the central Physical SOS Button
          if ((tab.id as string) === 'sos') {
            return (
              <button
                key="sos"
                type="button"
                id="bottom-nav-sos-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerSOS();
                }}
                className="relative flex items-center justify-center w-[58px] h-[58px] -mt-8 rounded-full bg-gradient-to-tr from-red-650 to-red-500 border border-red-500/35 shadow-[0_6px_22px_rgba(239,68,68,0.55)] active:scale-90 transition-all cursor-pointer focus:outline-none shrink-0"
                title="Immediate Emergency SOS Broadcast"
              >
                {/* Dynamic radar heartbeat pulse */}
                <span className="absolute inset-0 rounded-full bg-red-500/25 animate-ping opacity-60" />
                <span className="absolute inset-[-4px] rounded-full bg-red-500/10 blur-md" />
                <span className="text-white text-xs font-black tracking-widest font-sans drop-shadow-md relative z-10 select-none">
                  SOS
                </span>
              </button>
            );
          }

          return (
            <button
               key={tab.id}
               type="button"
               id={`bottom-nav-tab-${tab.id}`}
               onClick={() => onViewChange(tab.id)}
               className={cn(
                 "relative flex flex-col items-center justify-center transition-all duration-500 outline-none select-none",
                 isActive 
                   ? "bg-[#030508]/60 border border-white/[0.05] shadow-[0_6px_14px_rgba(0,0,0,0.4)] rounded-2xl px-4 py-2 text-[#3BE0B9] min-w-[72px]" 
                   : "py-2.5 px-3 text-white/35 hover:text-white/60"
               )}
            >
              <div className="relative flex flex-col items-center">
                <tab.icon
                  size={isActive ? 21 : 19}
                  className={cn(
                    "transition-all duration-300",
                    isActive 
                      ? "text-[#3BE0B9] filter drop-shadow-[0_0_3px_rgba(59,224,185,0.2)]" 
                      : "text-white/40"
                  )}
                />
                
                {isGuest && tab.isProtected && (
                   <div className="absolute -top-1.5 -right-2 w-3.5 h-3.5 rounded-full bg-amber-500 border border-[#0d0e12] flex items-center justify-center shadow-lg">
                     <Lock size={8} className="stroke-[#0D1117] fill-none stroke-[2.5px]" />
                   </div>
                )}
 
                 {isActive && (
                   <span className="text-[9px] font-sans font-black tracking-wider mt-1 text-[#3BE0B9] uppercase">
                     {tab.label}
                   </span>
                 )}
              </div>
 
              {isActive && (
                <motion.div
                  layoutId="active-nav-glow-indicator"
                  className="absolute inset-[1px] rounded-[13px] border border-white/[0.02] -z-10 pointer-events-none"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
