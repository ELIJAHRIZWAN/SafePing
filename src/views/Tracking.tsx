import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Shield,
  Clock,
  Plus,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Navigation,
  MessageCircle,
  TrendingDown
} from 'lucide-react';

import GlassCard from '../components/GlassCard';
import MapComponent from '../components/MapComponent';
import { useApp } from '../context/AppContext';

export default function TrackingView() {

  const {
    checkpoints,
    addCheckpoint,
    updateCheckpointStatus,
    isEmergencyActive,
    isDarkMode,
    isSafeModeActive,
    setIsSafeModeActive,
    isWalkWithMeActive,
    setIsWalkWithMeActive,
    activeSafeHavenId,
    setActiveSafeHavenId,
    selectedRouteType,
    setSelectedRouteType,
    setPenguinMessage,
    safePlaces,
    isLoadingSafePlaces
  } = useApp();

  const handleUnsafeToggle = () => {
    const newState = !isSafeModeActive;
    setIsSafeModeActive(newState);
    if (!newState) {
      setActiveSafeHavenId(null);
      setSelectedRouteType('safer');
      setPenguinMessage("Glad you feel better! I'm still watching. 🐧");
    } else {
      setPenguinMessage("I'm here with you. Let's get somewhere safe. 🐧");
    }
  };

  const handlePlaceSelect = (id: string) => {
    setActiveSafeHavenId(id);
    const place = safePlaces.find(p => p.id === id);
    if (place) {
      setPenguinMessage(`Analyzing routes to ${place.name}... 🐧`);
    }
  };

  const handleRouteSelect = (type: 'faster' | 'safer') => {
    setSelectedRouteType(type);
    if (type === 'safer') {
      setPenguinMessage("Slightly longer, but stays near active streets. 🐧");
    } else {
      setPenguinMessage("Fastest path detected. Proceed with caution. 🐧");
    }
  };

  const textColor = isDarkMode ? 'text-white' : 'text-navy-dark';
  const subTextColor = isDarkMode ? 'text-white/40' : 'text-navy-dark/40';

  return (
    <div className="flex flex-col gap-8 py-6 h-full">

      {/* Header */}
      <header className="flex flex-col gap-1 px-2">
        <span className={`text-[10px] uppercase tracking-[0.4em] font-bold ${subTextColor}`}>
          Live Journey
        </span>

        <h1 className={`text-4xl font-display font-bold tracking-tight ${textColor}`}>
          Tracking Shield
        </h1>
      </header>

      {/* MAP */}
      <div className="relative w-full aspect-[4/5] sm:aspect-square md:h-[420px] md:aspect-auto lg:h-[520px] rounded-[40px] shadow-2xl border border-white/10">
        <MapComponent />
      </div>

      {/* STATUS */}
      <div className="grid grid-cols-2 gap-4">

        <GlassCard className="border-none shadow-xl">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-primary" />

            <div className="flex flex-col">
              <span className={`text-[10px] uppercase tracking-widest font-bold ${subTextColor}`}>
                ETA Home
              </span>

              <span className={`text-2xl font-bold ${textColor}`}>
                14 mins
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="border-none shadow-xl">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-secondary" />

            <div className="flex flex-col">
              <span className={`text-[10px] uppercase tracking-widest font-bold ${subTextColor}`}>
                Route Safety
              </span>

              <span className={`text-2xl font-bold ${textColor}`}>
                98%
              </span>
            </div>
          </div>
        </GlassCard>

      </div>

      {/* PREMIUM WALK WITH ME OPTION CARD */}
      <GlassCard className="border border-cyan-400/20 bg-gradient-to-br from-cyan-950/10 via-[#070B13] to-transparent py-5 px-6 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-400/[0.03] blur-3xl pointer-events-none rounded-full" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 relative">
          <div className="flex flex-col gap-1.5 md:max-w-[70%]">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#3BE0B9] px-2 py-0.5 rounded bg-[#3BE0B9]/10 border border-[#3BE0B9]/20 animate-pulse">
                Companion Protocol
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-400">
                Premium Escort
              </span>
            </div>
            <h2 className="text-xl font-display font-bold tracking-tight text-white uppercase">Walk With Me</h2>
            <p className="text-xs leading-relaxed text-white/50">
              Arm active companion overwatch. Guardians receive real-time map sync notifications, and Pen initiates voice/text check-ins every 2 minutes.
            </p>
          </div>

          <button
            onClick={() => {
              const nextVal = !isWalkWithMeActive;
              setIsWalkWithMeActive(nextVal);
              if (nextVal) {
                setPenguinMessage("Active overwatch armed. I'm staying right beside you! 🐧");
              } else {
                setPenguinMessage("Escort model suspended. Standing by watcher enabled. 🐧");
              }
            }}
            className={`px-5 py-2.5 rounded-full transition-all text-xs font-black uppercase tracking-wider shadow-lg pointer-events-auto cursor-pointer ${
              isWalkWithMeActive 
                ? 'bg-rose-500 border border-rose-400 text-white shadow-rose-500/20' 
                : 'bg-primary border border-primary/20 text-navy-dark hover:scale-105 active:scale-95'
            }`}
          >
            {isWalkWithMeActive ? 'Disarm Escort' : 'Arm Escort'}
          </button>
        </div>

        {/* Active status pulse display if enabled */}
        {isWalkWithMeActive && (
          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3.5">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3BE0B9] animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#3BE0B9]">
                Path Secure • Live Guardian Overwatch Synced
              </span>
            </div>
            <span className="text-[9px] font-mono text-white/40">
              PENGUIN_ESCORT_SEC_01
            </span>
          </div>
        )}
      </GlassCard>

      {/* Walk With Me - Safe Mode UI */}
      <AnimatePresence>
        {isSafeModeActive && (
          <div className="flex flex-col gap-4 mt-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3 px-2 pb-24"
            >
              <h3 className={`text-xs uppercase tracking-widest font-bold ${subTextColor} mb-1`}>
                Recommended Safe Havens
              </h3>
              
              {isLoadingSafePlaces && (
                <div className="flex flex-col gap-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-32 w-full rounded-3xl bg-white/5 border border-white/10 animate-pulse flex items-center justify-center">
                      <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  ))}
                </div>
              )}

              {safePlaces.length === 0 && !isLoadingSafePlaces && (
                <div className="p-8 text-center text-[11px] font-bold text-white/20 uppercase tracking-widest border border-dashed border-white/10 rounded-3xl">
                  No safe havens detected in immediate range.
                </div>
              )}

              {safePlaces.map((place, idx) => (
                <motion.div
                  key={place.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => handlePlaceSelect(place.id)}
                >
                  <GlassCard 
                    className={`
                      border-white/5 transition-all cursor-pointer group shadow-lg overflow-hidden relative
                      ${activeSafeHavenId === place.id ? 'border-primary shadow-[0_0_30px_rgba(59,130,246,0.3)] bg-primary/5' : 'hover:border-primary/30'}
                    `}
                  >
                    {/* Tactical Scanline Accent */}
                    {activeSafeHavenId === place.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                    )}

                    <div className="flex flex-col gap-3 relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl ${place.color}/10 flex items-center justify-center relative border border-white/5 shadow-inner`}>
                            <MapPin size={24} className={`text-${place.color.split('-')[1]}-400`} />
                            {activeSafeHavenId === place.id && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-navy-dark animate-pulse shadow-[0_0_8px_rgba(59,130,246,1)]" />
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-base font-black uppercase tracking-tight ${textColor}`}>{place.name}</h4>
                              <div className="flex gap-1">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-sm border uppercase tracking-widest
                                  ${place.tier === 'Immediate' ? 'bg-primary/20 text-primary border-primary/30' : 
                                    place.tier === 'Nearby' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 
                                    'bg-white/5 text-white/40 border-white/10 opacity-60'}
                                `}>
                                  {place.tierLabel}
                                </span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10 ${subTextColor} uppercase tracking-widest`}>
                                  {place.status}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5">
                              {place.tacticalTags.map(tag => (
                                <span key={tag} className="text-[8px] font-black text-primary/70 uppercase tracking-tighter flex items-center gap-1">
                                  <div className="w-1 h-1 bg-primary/40 rounded-full" /> {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-1.5">
                          <div className="flex flex-col items-end">
                            <span className={`text-[14px] font-black ${place.color.replace('bg-', 'text-')} drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]`}>
                              {place.score} <span className="text-[8px] font-bold opacity-70">SAFE</span>
                            </span>
                            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden mt-0.5">
                              <div className={`h-full ${place.color}`} style={{ width: `${place.score}%` }} />
                            </div>
                            <span className={`text-[10px] font-bold ${subTextColor} mt-1`}>
                              {place.distance ? (place.distance < 1000 ? `${Math.round(place.distance)}m` : `${(place.distance / 1000).toFixed(1)}km`) : ''}
                            </span>
                          </div>
                          <span className="text-[9px] font-black text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                            <TrendingDown size={10} /> {place.time}
                          </span>
                        </div>
                      </div>

                      {/* Penguin Recommendation Mini-Bar */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px]">🐧</div>
                        <p className={`text-[10px] font-medium italic ${subTextColor}`}>
                          "{place.penguinRec}"
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WALK WITH ME STATUS PILL & ROUTE SELECTOR */}
      <AnimatePresence>
        {activeSafeHavenId && (
          <div className="fixed top-24 left-0 right-0 z-[1000] flex flex-col items-center gap-3">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-5 py-2.5 rounded-full bg-primary/10 border border-primary/50 backdrop-blur-xl flex items-center gap-3 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
            >
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,1)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Safe Route Navigation</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2 bg-navy-dark/60 backdrop-blur-2xl p-1.5 rounded-3xl border border-white/10 shadow-2xl"
            >
              <button
                onClick={() => handleRouteSelect('safer')}
                className={`px-4 py-2 rounded-2xl flex items-center gap-2 transition-all ${selectedRouteType === 'safer' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-white/40 hover:text-white/60'}`}
              >
                <Shield size={14} />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] font-black uppercase tracking-wider">Safer</span>
                  <span className="text-[8px] opacity-60">High Activity</span>
                </div>
              </button>
              <button
                onClick={() => handleRouteSelect('faster')}
                className={`px-4 py-2 rounded-2xl flex items-center gap-2 transition-all ${selectedRouteType === 'faster' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white/60'}`}
              >
                <Clock size={14} />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] font-black uppercase tracking-wider">Faster</span>
                  <span className="text-[8px] opacity-60">-2 mins avg.</span>
                </div>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSafeModeActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ y: -5 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-10 right-6 z-50"
          >
            <button
              onClick={() => setIsSafeModeActive(false)}
              className="w-16 h-16 rounded-full bg-green-500 border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-bounce-subtle glass"
            >
              <CheckCircle size={28} className="text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
