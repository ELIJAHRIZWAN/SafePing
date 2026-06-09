import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Lock, Shield, Sparkles, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import callingPenguin from '../assets/ANIMATIONS/calling_penguin.webm';

export default function SimulatedCallOverlay() {
  const { activeCallGuardian, setActiveCallGuardian } = useApp();
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected'>('connecting');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!activeCallGuardian) {
      setCallStatus('connecting');
      setTimer(0);
      return;
    }

    // Progression of call simulation
    const ringTimeout = setTimeout(() => {
      setCallStatus('ringing');
    }, 1500);

    const connectTimeout = setTimeout(() => {
      setCallStatus('connected');
    }, 4500);

    return () => {
      clearTimeout(ringTimeout);
      clearTimeout(connectTimeout);
    };
  }, [activeCallGuardian]);

  // Hook up timer count when connected
  useEffect(() => {
    if (callStatus !== 'connected' || !activeCallGuardian) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus, activeCallGuardian]);

  if (!activeCallGuardian) return null;

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleNativeCall = () => {
    window.location.href = `tel:${activeCallGuardian.phone}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-between py-16 px-6 text-white select-none"
      >
        {/* Secure channel banner */}
        <div className="flex flex-col items-center gap-1.5 animate-fade-in">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#3BE0B9]/10 border border-[#3BE0B9]/20 text-[#3BE0B9] text-[9px] font-black uppercase tracking-[0.25rem] shadow-sm">
            <Lock size={10} className="text-[#3BE0B9] fill-current" />
            <span>SAFEPING SECURED DIAL</span>
          </div>
          <span className="text-[10px] font-mono tracking-widest text-white/35 font-bold uppercase mt-1">
            End-to-End Encryption Escort Active
          </span>
        </div>

        {/* Mascot Center Stage with perfectly circular aspect-ratio, transparent frame */}
        <div className="flex flex-col items-center justify-center relative w-full max-w-sm">
          {/* Symmetrical glowing energy circles */}
          <motion.div
            animate={{
              scale: callStatus === 'connected' ? [1, 1.12, 1] : [1, 1.05, 1],
              opacity: callStatus === 'connected' ? [0.25, 0.45, 0.25] : [0.15, 0.3, 0.15],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-44 h-44 rounded-full bg-cyan-500/20 blur-[40px] pointer-events-none -z-10"
          />

          <div className="w-40 h-40 rounded-full border border-white/10 bg-[#070b1a]/95 flex items-center justify-center p-2 shadow-2xl relative overflow-hidden">
            {/* The official CALLING TRUSTED CONTACTS mascot loop */}
            <video
              src={callingPenguin}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain pointer-events-none filter brightness-110 drop-shadow-[0_4px_16px_rgba(92,222,255,0.35)]"
              style={{ scale: '1.15' }}
            />
          </div>

          <div className="mt-8 text-center space-y-2">
            <h2 className="text-2xl font-black tracking-tight font-display text-white">
              {activeCallGuardian.name}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-cyan-300 uppercase tracking-widest">
                {activeCallGuardian.relationship}
              </span>
              {activeCallGuardian.isPriority && (
                <span className="bg-yellow-400/15 text-yellow-300 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                  <Star size={7} className="fill-current" />
                  Primary
                </span>
              )}
            </div>
          </div>

          {/* Connection Status Messaging */}
          <div className="mt-8 flex flex-col items-center gap-1 min-h-[48px]">
            <span className="text-[11px] font-black tracking-[0.25em] text-[#3BE0B9]/80 uppercase font-mono animate-pulse">
              {callStatus === 'connecting' && 'Opening Satellite Voice Corridor...'}
              {callStatus === 'ringing' && `Calling ${activeCallGuardian.name}...`}
              {callStatus === 'connected' && 'SECURED CHOPPER CONNECTED'}
            </span>
            <span className="text-xs font-mono font-bold text-white/50 tracking-wider">
              {callStatus === 'connected' ? formatTime(timer) : 'Securing Frequency'}
            </span>
          </div>
        </div>

        {/* Action button controllers */}
        <div className="w-full max-w-xs flex flex-col gap-4">
          {/* Direct Native Call (Direct Carrier Dial) */}
          <button
            type="button"
            onClick={handleNativeCall}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-[#3BE0B9] text-navy-dark font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all outline-none"
          >
            <Phone size={14} className="fill-current" />
            <span>Open Carrier Line</span>
          </button>

          {/* Disconnect Call */}
          <button
            type="button"
            onClick={() => setActiveCallGuardian(null)}
            className="w-full h-14 rounded-2xl bg-white/[0.03] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-red-400 font-extrabold text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3 active:scale-95 transition-all outline-none"
          >
            <PhoneOff size={14} />
            <span>End Secure Line</span>
          </button>

          {/* Reassurance text */}
          <div className="flex items-center justify-center gap-1.5 opacity-40 text-[9px] font-bold uppercase tracking-wider text-center pt-2">
            <Shield size={10} />
            <span>Encrypted Dial • SafePing Companion Network</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
