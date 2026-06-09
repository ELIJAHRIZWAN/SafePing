import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Shield, AlertCircle, Radio, CheckCircle2 } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';


interface SOSButtonProps {
  onTrigger: () => void;
  isEmergencyActive?: boolean;
}

export default function SOSButton({ onTrigger, isEmergencyActive }: SOSButtonProps) {
  const {
    emergencyState,
    setEmergencyState,
    setIsHoldingSOS,
    isFullyDispatched,
    setIsFullyDispatched,
    addIncidentLog,
    setSessionStartTime
  } = useEmergency();

  // REQUIRED STATE REPRESENTATIONS per specification
  const [mounted, setMounted] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isActivated, setIsActivated] = useState(isEmergencyActive || false);
  const [isHovered, setIsHovered] = useState(false);

  const isHoldingRef = useRef(false);
  const lastTouchTimeRef = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const controls = useAnimation();

  const HOLD_DURATION = 2000; // 2 seconds exactly

  useEffect(() => {
    setMounted(true);
  }, []);

  // Interface sync for isEmergencyActive prop
  useEffect(() => {
    setIsActivated(isEmergencyActive || false);
  }, [isEmergencyActive]);

  useEffect(() => {
    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }

    if (isEmergencyActive || isActivated) return;

    // Reject simulated mouse events right after a touch has happened
    if (e.type === 'mousedown' && performance.now() - lastTouchTimeRef.current < 1000) {
      return;
    }

    if (e.type === 'touchstart') {
      lastTouchTimeRef.current = performance.now();
    }

    isHoldingRef.current = true;
    setIsHolding(true);
    setIsHoldingSOS(true);
    setEmergencyState('preparing');
    startTimeRef.current = performance.now();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40); // Gentle initial haptic click cue
    }

    const runLoop = () => {
      if (!isHoldingRef.current) return;
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(pct);

      if (pct >= 100) {
        handleTriggerUninterrupted();
        setEmergencyState('escalating');
        isHoldingRef.current = false;
      } else {
        animationFrameId.current = requestAnimationFrame(runLoop);
      }
    };

    animationFrameId.current = requestAnimationFrame(runLoop);

    controls.start({
      scale: 0.96, // Premium depression scale requested: "scale button to 0.96"
      transition: { duration: 0.18, ease: 'easeOut' }
    });
  };

  const stopHold = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && e.cancelable) {
      e.preventDefault();
    }

    // Reject simulated mouse events right after a touch has happened
    if (e && e.type === 'mouseup' && performance.now() - lastTouchTimeRef.current < 1000) {
      return;
    }

    if (e && e.type === 'touchend') {
      lastTouchTimeRef.current = performance.now();
    }

    if (!isHoldingRef.current) return;

    isHoldingRef.current = false;
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    setIsHolding(false);
    setIsHoldingSOS(false);
    setEmergencyState('idle');
    setHoldProgress(0);

    controls.start({
      scale: 1,
      transition: { type: 'spring', stiffness: 350, damping: 22 }
    });
  };

  const handleTriggerUninterrupted = () => {
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([150, 80, 150]); // Distinct premium tactile vibration sequence
    }

    setIsActivated(true);
    onTrigger();

    setEmergencyState('alerting');
    setIsHoldingSOS(false);
    setIsHolding(false);
    setHoldProgress(0);
  };


  return (
    <motion.div 
      className="relative group w-[172px] h-[172px] flex items-center justify-center"
    >
      {/* Cinematic Full-screen Blur Map Overlay tracking Hold progress */}
      <AnimatePresence>
        {isHolding && mounted && typeof document !== 'undefined' && document.body && createPortal(
          <motion.div
            id="sos-hold-overlay"
            className="fixed inset-0 pointer-events-none z-[9999] flex flex-col items-center justify-center backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: (holdProgress / 100) }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            style={{
              background: 'radial-gradient(circle at center, rgba(153, 27, 27, 0.28) 0%, rgba(45, 12, 14, 0.65) 50%, rgba(15, 3, 4, 0.92) 100%)'
            }}
          >
            {/* System alerts at the top of the full screen */}
            <div className="absolute top-[14%] text-center px-4 select-none w-full">
              <span className="text-red-400 text-[10px] font-mono font-semibold tracking-[0.3em] uppercase block animate-pulse">
                EMERGENCY TRANSMISSION SEQUENCE
              </span>
              <span className="text-white/40 text-[8px] font-mono tracking-widest uppercase block mt-1.5">
                Do not release unless safe
              </span>
            </div>
            
            {/* Bottom hold percent */}
            <div className="absolute bottom-[14%] text-center px-4 select-none w-full">
              <span className="text-red-500/80 font-mono font-medium text-2xl tracking-[0.1em] uppercase block">
                {holdProgress.toFixed(0)}%
              </span>
            </div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      {/* 1. Deep Breathing Soft Teal Ambient Glow (increased depth/subtlety) */}
      <motion.div 
        animate={{
          scale: [0.96, 1.05, 0.96],
          opacity: [0.10, 0.22, 0.10],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-[240px] h-[240px] rounded-full bg-[radial-gradient(circle,rgba(59,224,185,0.18)_0%,transparent_70%)] pointer-events-none filter blur-2xl"
      />

      {/* 2. Dual Subtle Aura */}
      <motion.div 
        animate={{
          scale: [1.02, 0.98, 1.02],
          opacity: [0.05, 0.12, 0.05],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5
        }}
        className="absolute w-[200px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(59,224,185,0.11)_0%,transparent_60%)] pointer-events-none filter blur-lg"
      />

      {/* 3. Outer Accent Rings (fine responsive bounds) */}
      <div 
        className={`absolute w-[184px] h-[184px] rounded-full border transition-all duration-700 pointer-events-none
          ${isHovered 
            ? 'border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.12)]' 
            : 'border-[#3BE0B9]/20 shadow-[0_0_10px_rgba(59,224,185,0.06)]'
          }`} 
      />

      {/* 4. Highly Polished Glass circle outline backdrop (solid premium contrasting backing) */}
      <div className="absolute w-[172px] h-[172px] rounded-full bg-[#010204]/99 backdrop-blur-[36px] border border-white/[0.085] shadow-[0_24px_64px_rgba(0,0,0,0.92),_inset_0_1.5px_3px_rgba(255,255,255,0.04),_inset_0_-2px_4px_rgba(0,0,0,0.95)] pointer-events-none" />

      {/* Cinematic Backdrop Glow */}
      <div 
        className="absolute inset-8 rounded-full blur-[24px] transition-all duration-300 pointer-events-none"
        style={{
          background: (isEmergencyActive || isActivated)
            ? 'rgba(127, 29, 29, 0.12)' 
            : isHolding 
              ? `radial-gradient(circle, rgba(127, 29, 29, ${0.04 + (holdProgress / 100) * 0.12}) 0%, transparent 70%)` 
              : isHovered
                ? 'radial-gradient(circle, rgba(127, 29, 29, 0.05) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(143, 167, 162, 0.01) 0%, transparent 70%)',
          opacity: (isEmergencyActive || isActivated) ? 0.20 : isHolding ? (0.08 + (holdProgress / 100) * 0.12) : isHovered ? 0.10 : 0.03,
        }}
      />

      {/* Pulsing Tactical Rings (reduced visibility for clean minimalism) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {(isEmergencyActive || isActivated) && (
          <motion.div
            initial={{ scale: 1, opacity: 0 }}
            animate={{
              scale: [1, 1.3],
              opacity: [0.05, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeOut'
            }}
            className="absolute w-[172px] h-[172px] rounded-full border border-red-500/5"
          />
        )}
      </div>

      {/* Main Button Body with red pulse on active emergency, sharper contrasts */}
      <motion.button
        animate={controls}
        onMouseEnter={() => setIsHovered(true)}
        onMouseDown={(isEmergencyActive || isActivated) ? undefined : startHold}
        onMouseUp={(isEmergencyActive || isActivated) ? undefined : stopHold}
        onMouseLeave={(e) => {
          setIsHovered(false);
          if (!(isEmergencyActive || isActivated)) {
            stopHold(e);
          }
        }}
        onTouchStart={(isEmergencyActive || isActivated) ? undefined : startHold}
        onTouchEnd={(isEmergencyActive || isActivated) ? undefined : stopHold}
        onTouchCancel={(isEmergencyActive || isActivated) ? undefined : stopHold}
        onClick={() => {
          if ((isEmergencyActive || isActivated) && !isFullyDispatched) {
            setIsFullyDispatched(true);
            setSessionStartTime(Date.now());
            addIncidentLog("activation", "Guardian Active: Safety circle notified. Keeping supportive companion watch with extra attention.");
          }
        }}
        className={`
          relative z-10 w-[172px] h-[172px] rounded-full flex flex-col items-center justify-center gap-15
          transition-all duration-500 select-none touch-none overflow-hidden
          ${(isEmergencyActive || isActivated)
            ? isFullyDispatched
              ? 'bg-[#01140e]/98 text-emerald-100 shadow-[0_12px_36px_rgba(16,185,129,0.08)] border border-[#10b981]/20 cursor-default'
              : 'bg-[#210609]/98 text-rose-100 shadow-[0_12px_36px_rgba(127,29,29,0.15)] border border-[#7f1d1d]/25 hover:scale-101 active:scale-98 cursor-pointer'
            : `text-white transition-all duration-500
               ${isHovered 
                 ? 'bg-[#000102]/99 border-red-500/40 shadow-[0_14px_42px_rgba(0,0,0,0.92),_inset_0_2px_4px_rgba(255,255,255,0.04),_inset_0_-2px_4px_rgba(0,0,0,0.95)]' 
                 : 'bg-[#010204]/98 border-white/[0.06] shadow-[0_24px_48px_rgba(0,0,0,0.95),_inset_0_1.5px_3px_rgba(255,255,255,0.03),_inset_0_-1.5px_3px_rgba(0,0,0,0.9)]'
               }`
          }
        `}
        style={{
          borderColor: isHolding && !(isEmergencyActive || isActivated)
            ? `rgba(127, 29, 29, ${0.08 + (holdProgress / 100) * 0.16})`
            : undefined,
          boxShadow: isHolding && !(isEmergencyActive || isActivated)
            ? `0 0 ${8 + (holdProgress / 100) * 8}px rgba(127, 29, 29, ${0.02 + (holdProgress / 100) * 0.08})`
            : undefined,
          backgroundColor: isHolding && !(isEmergencyActive || isActivated)
            ? `rgba(${1 + (holdProgress / 100) * 20}, ${2 + (holdProgress / 100) * 2}, ${4 + (holdProgress / 100) * 2}, 0.98)`
            : undefined,
        }}
      >

          {/* Dynamic inner red ring that slowly brightens during pressure hold */}
          {isHolding && (
            <div 
              className="absolute inset-1 rounded-full border border-red-500/15 transition-all pointer-events-none"
              style={{
                opacity: holdProgress / 100,
                boxShadow: `inset 0 0 ${3 + (holdProgress / 100) * 5}px rgba(160, 24, 28, 0.2)`
              }}
            />
          )}

          <AnimatePresence mode="wait">
            {(isEmergencyActive || isActivated) ? (
              <motion.div
                key={isFullyDispatched ? "dispatched" : "active"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-1 text-center px-1"
              >
                {isFullyDispatched ? (
                  <>
                    <CheckCircle2 size={20} className="text-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-black tracking-[0.08em] uppercase block leading-tight px-2 py-0.5 bg-emerald-950/80 rounded-full mt-1">
                      SAFETY RESOLVED
                    </span>
                  </>
                ) : (
                  <>
                    <Radio size={20} className="animate-pulse text-rose-400" />
                    <span className="text-[9px] font-black tracking-[0.08em] uppercase block leading-tight mt-1">
                      SAFETY ACTIVATED
                    </span>
                    <span className="text-[7px] opacity-60 font-bold uppercase tracking-[0.12em] mt-0.5">
                      Responders Alerted
                    </span>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-0.5"
              >
                {/* Visual exclamation circle marker */}
                <div 
                  className={`flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-300 mb-1
                    ${isHovered 
                      ? 'border-red-950/50 bg-red-950/5 shadow-[0_0_6px_rgba(160,24,28,0.06)]' 
                      : 'border-[#8FA7A2]/10 bg-[#101726]/5 shadow-[0_0_6px_rgba(143,167,162,0.015)]'
                    }`}
                >
                  <span className={`transition-colors duration-300 text-[10px] font-semibold font-sans leading-none pb-0.5
                    ${isHovered ? 'text-red-400/80' : 'text-[#8FA7A2]/80'}`}
                  >
                    !
                  </span>
                </div>
                <motion.span 
                  animate={{ opacity: [0.90, 1, 0.90] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className={`text-[42px] sm:text-[50px] font-display italic font-extrabold tracking-[0.04em] select-none leading-none mb-1 transition-all duration-300
                    ${isHovered ? 'text-red-500/90' : 'text-[#E3DFD5]'}`}
                  style={{ textShadow: isHovered ? '0 2px 8px rgba(239, 68, 68, 0.3)' : '0 1px 4px rgba(255, 255, 255, 0.05)' }}
                >
                  SOS
                </motion.span>
                <span 
                  className={`text-[7px] font-sans font-medium tracking-[0.2em] uppercase transition-all duration-300
                    ${isHovered ? 'text-red-400/70' : 'text-[#8FA7A2]/70'}`}
                >
                  PRESS & HOLD
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sweep Clean Glow Animation */}
          <motion.div
            animate={{ y: ['-100%', '100%'], opacity: [0, 0.15, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-6 w-full pointer-events-none"
          />
        </motion.button>

        {/* 7. REAL Progress Ring with exact 2-seconds holdProgress mapping tuned to 172px */}
        <svg viewBox="0 0 172 172" className="absolute inset-x-0 inset-y-0 w-full h-full -rotate-90 pointer-events-none z-20">
          <circle
            cx="86"
            cy="86"
            r="82"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            className="text-white/[0.01]"
          />
          <circle
            cx="86"
            cy="86"
            r="82"
            fill="none"
            stroke="rgba(160, 24, 28, 0.75)"
            strokeWidth="1.2"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - holdProgress}
            className="drop-shadow-[0_0_4px_rgba(160,24,28,0.5)]"
            style={{
              transition: isHolding ? 'stroke-dashoffset 60ms linear' : 'none'
            }}
          />
        </svg>

      {/* Helper Microcopy directly BELOW the button (placed at top-[182px]) */}
      <div className="absolute top-[182px] text-center h-5 flex flex-col justify-center items-center select-none pointer-events-none z-10 w-[240px] left-1/2 -translate-x-1/2">
        {(isEmergencyActive || isActivated) ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[8px] font-sans font-medium uppercase tracking-[0.2em] text-[#3BE0B9]/60"
          >
            ● Emergency Watch Enabled
          </motion.div>
        ) : isHolding ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[8px] font-sans font-medium uppercase tracking-[0.15em] text-red-500"
          >
            Activating in {((HOLD_DURATION - (holdProgress * HOLD_DURATION / 100)) / 1000).toFixed(1)}s
          </motion.div>
        ) : (
          <span 
            className={`text-[7px] font-sans font-medium uppercase transition-colors duration-300
              ${isHovered 
                ? 'text-red-400/80' 
                : 'text-[#9cb3b0]/35'
              }`}
            style={{ letterSpacing: '0.24em' }}
          >
            Press & hold for 2 seconds to activate
          </span>
        )}
      </div>
    </motion.div>
  );
}
