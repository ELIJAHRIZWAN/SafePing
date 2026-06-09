import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, AlertTriangle, ArrowRight, Activity, Cpu } from 'lucide-react';
import introPenguin from "../assets/ANIMATIONS/introductive_penguin.webm";
import PenguinVideo from '../components/PenguinVideo';
import welcomeVideo from '../assets/images/SAFEPING ANIMATED BACKGROUND.mp4';

export default function WelcomeView() {
  const { signInWithGoogle, enterGuestMode, triggerSOS } = useApp();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cinematic Floating Cursor Spotlight Refs & State with smooth LERP easing
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const parallaxBgRef = useRef<HTMLDivElement | null>(null);
  const cloudsRef = useRef<HTMLDivElement | null>(null);
  const raysRef = useRef<HTMLDivElement | null>(null);
  
  // Elements tracking for dynamic glow intensification
  const mascotRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const intensityRef = useRef(1.0);
  
  const mouseRef = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500 });
  const currentRef = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500 });
  const hasMouseMoved = useRef(false);

  useEffect(() => {
    const isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth < 768);

    const handleMouseMove = (e: MouseEvent) => {
      if (isTouchDevice) return;
      hasMouseMoved.current = true;
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    if (!isTouchDevice) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    let animationId: number;
    const updatePosition = () => {
      const time = performance.now();
      
      let targetX = mouseRef.current.x;
      let targetY = mouseRef.current.y;

      if (isTouchDevice || !hasMouseMoved.current) {
        // Slow floating autonomous drift movement on mobile / until first mouse move
        const t = time * 0.00025; // extremely slow
        const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
        const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 500;
        const rX = typeof window !== 'undefined' ? window.innerWidth * 0.22 : 150;
        const rY = typeof window !== 'undefined' ? window.innerHeight * 0.18 : 120;
        
        targetX = cx + Math.sin(t) * rX + Math.cos(t * 0.6) * (rX * 0.3);
        targetY = cy + Math.cos(t * 0.8) * rY + Math.sin(t * 0.4) * (rY * 0.2);
      } else {
        // Desktop mouse tracking with subtle perpetual drift/breathing even when cursor stops
        const driftT = time * 0.0006;
        targetX += Math.sin(driftT) * 18;
        targetY += Math.cos(driftT * 0.8) * 14;
      }

      // Interpolated motion (0.04 ease for softly gliding cinematic lag and trail layout)
      const ease = 0.04;
      const dx = targetX - currentRef.current.x;
      const dy = targetY - currentRef.current.y;

      currentRef.current.x += dx * ease;
      currentRef.current.y += dy * ease;

      // Calculate dynamic intensity based on proximity to nearest key element
      let nearestDist = Infinity;
      const checkRefs = [mascotRef.current, heroRef.current, ctaRef.current];
      
      checkRefs.forEach((element) => {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const elementX = rect.left + rect.width / 2;
        const elementY = rect.top + rect.height / 2;
        
        const dist = Math.hypot(currentRef.current.x - elementX, currentRef.current.y - elementY);
        if (dist < nearestDist) {
          nearestDist = dist;
        }
      });
      
      // Calculate dynamic intensity based on proximity to nearest key element (within 240px)
      let targetIntensity = 1.0;
      if (nearestDist < 240) {
        // Smoothly interpolate: 1.0 at 240px away, up to 1.45 at 0px away
        const factor = 1 - (nearestDist / 240); // 0 to 1
        targetIntensity = 1.0 + (factor * factor * 0.45); 
      }
      
      // Interpolate intensity for liquid-smooth transitions
      intensityRef.current += (targetIntensity - intensityRef.current) * 0.08;

      if (spotlightRef.current) {
        const x = currentRef.current.x;
        const y = currentRef.current.y;
        const intensity = intensityRef.current;
        
        // Premium, highly diffused moonlit halo tailored to the environment:
        // - Rich subtle warm mint-white core (opacity increased by 45%)
        // - Gorgeous, soothing ocean teal/cyan diffused layer for softer blending
        // - Soft, massive atmospheric turquoise/blue base layer ensuring gentle protective visibility
        const coreOpacity = (0.022 * intensity).toFixed(4);
        const midOpacity = (0.024 * intensity).toFixed(4);
        const outerOpacity = (0.011 * intensity).toFixed(4);
        
        const coreRad = Math.round(250 * intensity);
        const midRad = Math.round(620 * intensity);
        const outerRad = Math.round(1050 * intensity);

        spotlightRef.current.style.background = `
          radial-gradient(${coreRad}px circle at ${x}px ${y}px, rgba(228, 248, 242, ${coreOpacity}), transparent 82%),
          radial-gradient(${midRad}px circle at ${x}px ${y}px, rgba(124, 214, 202, ${midOpacity}), transparent 86%),
          radial-gradient(${outerRad}px circle at ${x}px ${y}px, rgba(74, 185, 196, ${outerOpacity}), transparent 92%)
        `.trim();
      }

      // Parallax shifts react to cursor position relative to screen center
      if (typeof window !== 'undefined') {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const rx = currentRef.current.x - centerX;
        const ry = currentRef.current.y - centerY;

        if (parallaxBgRef.current) {
          // Subtle backdrop shifting to ground the layered view with depth
          parallaxBgRef.current.style.transform = `translate3d(${rx * -0.008}px, ${ry * -0.008}px, 0) scale(1.04)`;
        }
        if (cloudsRef.current) {
          // Drifting atmospheric clouds move slightly faster for deeper perspective separation
          cloudsRef.current.style.transform = `translate3d(${rx * -0.018}px, ${ry * -0.015}px, 0)`;
        }
        if (raysRef.current) {
          // Guardian light rays tilt/shift minimally in the same direction, creating parallax look
          raysRef.current.style.transform = `translate3d(${rx * 0.012}px, ${ry * 0.008}px, 0)`;
        }
      }

      animationId = requestAnimationFrame(updatePosition);
    };

    animationId = requestAnimationFrame(updatePosition);

    return () => {
      if (!isTouchDevice) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleSOSBypass = () => {
    // 1. Enter Guest mode instantly
    enterGuestMode();
    // 2. Trigger critical SOS flow instantly
    triggerSOS();
    // 3. Navigate straight to active emergency controls
    navigate('/dashboard');
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg('Google authentication bypassed or offline. Let\'s use Sign In options.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex flex-col items-center justify-between py-10 px-6 sm:py-14 sm:px-8 text-[#E8E6F0] min-h-screen overflow-y-auto bg-transparent"
    >
      {/* Self-contained CSS for smooth GPU-accelerated motion */}
      <style>{`
        @keyframes spfloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(0.3deg); }
        }
        @keyframes sprotate-1 {
          0% { transform: rotate(0deg) scaleY(0.35); }
          100% { transform: rotate(360deg) scaleY(0.35); }
        }
        @keyframes sprotate-2 {
          0% { transform: rotate(120deg) scaleY(0.4) scaleX(1.1); }
          100% { transform: rotate(480deg) scaleY(0.4) scaleX(1.1); }
        }
        @keyframes sprotate-3 {
          0% { transform: rotate(240deg) scaleY(0.3) scaleX(0.9); }
          100% { transform: rotate(600deg) scaleY(0.3) scaleX(0.9); }
        }
        @keyframes sppulse-ring {
          0%, 100% { transform: scale(0.98); opacity: 0.15; }
          50% { transform: scale(1.04); opacity: 0.45; }
        }
        @keyframes spshadow-breathe {
          0%, 100% { transform: scale(1.02); opacity: 0.7; filter: blur(3px); }
          50% { transform: scale(0.88); opacity: 0.4; filter: blur(4.5px); }
        }
        @keyframes sp-ambient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes sp-fog-drift-1 {
          0%, 100% { transform: translate3d(0px, 0px, 0) scale(1) rotate(0deg); opacity: 0.03; }
          33% { transform: translate3d(40px, -20px, 0) scale(1.08) rotate(3deg); opacity: 0.06; }
          66% { transform: translate3d(-15px, 25px, 0) scale(0.95) rotate(-2deg); opacity: 0.04; }
        }
        @keyframes sp-fog-drift-2 {
          0%, 100% { transform: translate3d(0px, 0px, 0) scale(1.03) rotate(0deg); opacity: 0.02; }
          50% { transform: translate3d(-40px, 15px, 0) scale(0.96) rotate(-5deg); opacity: 0.05; }
        }
        @keyframes sp-fog-drift-3 {
          0%, 100% { transform: translate3d(0px, 0px, 0) scale(0.97) rotate(0deg); opacity: 0.015; }
          50% { transform: translate3d(30px, 20px, 0) scale(1.05) rotate(4deg); opacity: 0.04; }
        }
        @keyframes sp-beam-pulse {
          0%, 100% { opacity: 0.01; transform: scaleX(1) rotate(-22deg); }
          50% { opacity: 0.03; transform: scaleX(1.04) rotate(-20deg); }
        }
        @keyframes sp-beam-pulse-delayed {
          0%, 100% { opacity: 0.02; transform: scaleX(1.03) rotate(-26deg); }
          50% { opacity: 0.01; transform: scaleX(0.97) rotate(-28deg); }
        }
        @keyframes sp-grid-breath {
          0%, 100% { opacity: 0.04; }
          50% { opacity: 0.09; }
        }
        @keyframes sp-ambient-drift-slow {
          0% { transform: translate3d(0, 0, 0) scale(0.7); opacity: 0; }
          12% { opacity: 0.28; }
          88% { opacity: 0.28; }
          100% { transform: translate3d(24px, -60px, 0) scale(1.2); opacity: 0; }
        }
        @keyframes sp-ambient-drift-alt {
          0% { transform: translate3d(0, 0, 0) scale(1.1); opacity: 0; }
          18% { opacity: 0.22; }
          82% { opacity: 0.22; }
          100% { transform: translate3d(-28px, -45px, 0) scale(0.75); opacity: 0; }
        }
        @keyframes spripple-expand {
          0% { transform: scale(0.78) rotateX(75deg); opacity: 0; }
          15% { opacity: 0.26; }
          85% { opacity: 0.26; }
          100% { transform: scale(1.24) rotateX(75deg); opacity: 0; }
        }
      `}</style>

      {/* Atmospheric Full-Screen Parallax Environment (Edge-to-Edge) */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#010408] overflow-hidden select-none">
        
        {/* Layer 1: Dark Base Gradient Backplate */}
        <div 
          className="absolute inset-0 bg-gradient-to-tr from-[#01050a] via-[#010b14] to-[#010408]"
          style={{
            backgroundSize: '200% 200%',
            animation: 'sp-ambient-shift 35s ease-in-out infinite',
          }}
        />
 
        {/* Layer 1b: Cinematic animated background video overlaid on top of the backplate */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none"
        >
          <source src={welcomeVideo} type="video/mp4" />
        </video>
 
        {/* Layer 2: Parallax Depth Plane B Particles */}
        <div 
          ref={parallaxBgRef}
          className="absolute inset-x-[-3%] inset-y-[-3%] pointer-events-none opacity-[0.03]"
          style={{
            willChange: 'transform'
          }}
        >
          {/* Sparse, very slow-drifting premium background ambient particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            <div className="absolute top-[35%] right-[25%] w-[1.5px] h-[1.5px] rounded-full bg-[#FAF8F5]" style={{ animation: 'sp-ambient-drift-slow 48s linear infinite', opacity: 0 }} />
            <div className="absolute bottom-[45%] left-[30%] w-[1px] h-[1px] rounded-full bg-[#94E1D0]" style={{ animation: 'sp-ambient-drift-alt 52s linear infinite 5s', opacity: 0 }} />
          </div>
        </div>
 
        {/* Layer 3: Floating Fog & Parallax Depth Plane A Particles */}
        <div 
          ref={cloudsRef}
          className="absolute inset-0 pointer-events-none"
          style={{ willChange: 'transform' }}
        >
          {/* Large warm cyan/teal blur cloud */}
          <div 
            className="absolute rounded-full bg-cyan-500/[0.012] w-[900px] h-[700px]"
            style={{
              top: '-15%',
              left: '15%',
              animation: 'sp-fog-drift-1 65s ease-in-out infinite',
              mixBlendMode: 'screen',
              filter: 'blur(160px)',
            }}
          />
          {/* Volumetric soft Indigo/Blue breathing cloud */}
          <div 
            className="absolute rounded-full bg-indigo-500/[0.009] w-[1100px] h-[850px]"
            style={{
              bottom: '-10%',
              left: '-15%',
              animation: 'sp-fog-drift-2 75s ease-in-out infinite',
              mixBlendMode: 'screen',
              filter: 'blur(180px)',
            }}
          />
          {/* Soft emerald protective glow blob */}
          <div 
            className="absolute rounded-full bg-emerald-500/[0.006] w-[800px] h-[650px]"
            style={{
              bottom: '15%',
              right: '5%',
              animation: 'sp-fog-drift-3 70s ease-in-out infinite',
              mixBlendMode: 'screen',
              filter: 'blur(140px)',
            }}
          />
          {/* Central emotional soft breathing glow */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-600/[0.008] w-[900px] h-[900px] pointer-events-none"
            style={{
              animation: 'sp-grid-breath 12s ease-in-out infinite',
              mixBlendMode: 'screen',
              filter: 'blur(200px)',
            }}
          />
 
          {/* Cinematic Slow Drifting Atmospheric Particles (Strategic placement near light rays and horizon) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            {/* Soft Teal Particles */}
            <div className="absolute bottom-[38%] left-[18%] w-[1.5px] h-[1.5px] rounded-full bg-[#94E1D0]" style={{ animation: 'sp-ambient-drift-slow 38s linear infinite', opacity: 0 }} />
            <div className="absolute bottom-[48%] right-[22%] w-[2px] h-[2px] rounded-full bg-[#94E1D0]" style={{ animation: 'sp-ambient-drift-alt 46s linear infinite 4s', opacity: 0 }} />
            <div className="absolute top-[42%] left-[28%] w-[1.2px] h-[1.2px] rounded-full bg-[#A2DEC3]" style={{ animation: 'sp-ambient-drift-slow 52s linear infinite 8s', opacity: 0 }} />
            <div className="absolute top-[38%] right-[32%] w-[1.8px] h-[1.8px] rounded-full bg-[#94E1D0]" style={{ animation: 'sp-ambient-drift-alt 42s linear infinite 12s', opacity: 0 }} />

            {/* Soft Ivory/White Particles */}
            <div className="absolute bottom-[44%] left-[45%] w-[1.5px] h-[1.5px] rounded-full bg-[#FAF8F5]" style={{ animation: 'sp-ambient-drift-slow 32s linear infinite 2s', opacity: 0 }} />
            <div className="absolute bottom-[52%] right-[40%] w-[1.2px] h-[1.2px] rounded-full bg-[#FAF8F5]" style={{ animation: 'sp-ambient-drift-alt 48s linear infinite 6s', opacity: 0 }} />
            <div className="absolute top-[45%] left-[62%] w-[1.8px] h-[1.8px] rounded-full bg-[#FAF8F5]" style={{ animation: 'sp-ambient-drift-slow 40s linear infinite 10s', opacity: 0 }} />
            <div className="absolute top-[31%] right-[15%] w-[1.5px] h-[1.5px] rounded-full bg-[#FAF8F5]" style={{ animation: 'sp-ambient-drift-alt 56s linear infinite 14s', opacity: 0 }} />
          </div>
        </div>
 
        {/* Layer 4: Volumetric Light Beams (Ambient energy waves) */}
        <div 
          ref={raysRef}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ willChange: 'transform' }}
        >
          <div 
            className="absolute pointer-events-none mix-blend-screen"
            style={{
              width: '400px',
              height: '140%',
              left: '10%',
              top: '-20%',
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.006) 0%, rgba(14, 165, 233, 0.0015) 50%, transparent 100%)',
              transformOrigin: 'top left',
              animation: 'sp-beam-pulse 28s ease-in-out infinite',
              filter: 'blur(70px)',
            }}
          />
          <div 
            className="absolute pointer-events-none mix-blend-screen"
            style={{
              width: '420px',
              height: '140%',
              right: '10%',
              top: '-15%',
              background: 'linear-gradient(225deg, rgba(16, 185, 129, 0.005) 0%, rgba(14, 165, 233, 0.0015) 45%, transparent 90%)',
              transformOrigin: 'top right',
              animation: 'sp-beam-pulse-delayed 32s ease-in-out infinite',
              filter: 'blur(75px)',
            }}
          />
        </div>
 
        {/* Fixed Fullscreen Div for Ambient Cursor Glow (Behind All UI Content) */}
        <div 
          ref={spotlightRef}
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen transition-opacity duration-1000"
          style={{
            background: `radial-gradient(600px circle at 50% 50%, rgba(162, 222, 195, 0.015), transparent 85%)`,
          }}
        />
 
        {/* Layer 7: Symmetrical Vignette Overlay & Screen Edge Framing - Softer shadow to prevent crushed blacks */}
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(circle at center, transparent 35%, rgba(1, 4, 8, 0.3) 72%, rgba(1, 4, 8, 0.85) 100%)'
          }}
        />
 
        {/* Layer 7b: Low-opacity distant cinematic skyline silhouette representing protective space - Enhanced visibility */}
        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none opacity-[0.06] z-0 select-none overflow-hidden">
          <svg className="w-full h-full text-[#FAF8F5]" viewBox="0 0 1440 200" preserveAspectRatio="none" fill="currentColor">
            <path d="M0,170 L40,170 L45,155 L55,155 L60,170 L110,170 L120,130 L155,130 L160,170 L210,170 L220,120 L275,120 L285,170 L340,170 L350,140 L380,140 L390,170 L450,170 L460,110 L510,110 L520,170 L600,170 L610,145 L645,145 L655,170 L720,170 L730,125 L775,125 L785,170 L840,170 L850,150 L890,150 L900,170 L960,170 L975,115 L1025,115 L1035,170 L1110,170 L1120,135 L1160,135 L1170,170 L1240,170 L1250,120 L1310,120 L1320,170 L1400,170 L1410,140 L1430,140 L1440,165 L1440,200 L0,200 Z" />
            <path d="M0,185 L80,185 L90,160 L140,160 L150,185 L260,185 L270,150 L330,150 L340,185 L490,185 L500,140 L570,140 L582,185 L700,185 L710,162 L760,162 L770,185 L910,185 L925,145 L995,145 L1005,185 L1190,185 L1205,155 L1275,155 L1285,185 L1440,185 L1440,200 L0,200 Z" opacity="0.4" />
          </svg>
        </div>
 
        {/* Layer 8: Faint Depth Fog near the bottom of the screen - Softer opacity */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none bg-gradient-to-t from-[#010408] via-[#010408]/40 to-transparent opacity-75"
        />
      </div>
 
 
      {/* 1. Header Branded Area */}
      <motion.header 
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full max-w-sm flex flex-col items-center text-center mt-4 sm:mt-6 relative z-10 gap-1"
      >
        <div className="flex items-center gap-2">
          <span 
            className="text-[9px] tracking-[0.18em] uppercase font-medium text-[#94E1D0]/70 select-none font-sans"
          >
            Your Personal Safety Companion
          </span>
        </div>
        <div className="relative flex items-center justify-center mt-1 select-none">
          {/* Extremely subtle warm/teal cinematic backing glow */}
          <div className="absolute w-24 h-5 bg-[#FAF8F5]/[0.015] blur-md pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute w-28 h-6 bg-[#94E1D0]/[0.025] blur-lg pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
          
          <span 
            className="font-cormorant font-bold text-[24px] sm:text-[27px] text-[#FAF8F5]/95 tracking-[0.06em] flex items-center justify-center antialiased"
            style={{ textShadow: '0 1px 3.5px rgba(0,0,0,0.65), 0 0 14px rgba(250, 248, 245, 0.06)' }}
          >
            SafeP
            <span className="relative inline-flex items-center">
              ı
              <span 
                className="absolute top-[2.5px] sm:top-[3px] left-1/2 -translate-x-[45%] w-[3px] h-[3px] rounded-full bg-[#52D2B4] shadow-[0_0_6px_rgba(82,210,180,0.95),_0_0_12px_rgba(82,210,180,0.45)] animate-pulse"
                style={{ animationDuration: '3.5s' }}
              />
            </span>
            ng
          </span>
        </div>
      </motion.header>
       {/* 2. Emotional Focus & Title (Spacious, breathable layout) */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
        className="w-full max-w-sm flex flex-col items-center justify-center text-center gap-4 my-auto py-5 relative z-10"
      >
        
        {/* Animated Companion Video Indicator with soft ambient light bloom behind the mascot only */}
        <div ref={mascotRef} className="relative group flex items-center justify-center mb-0.5 select-none pointer-events-none">
          {/* Soft ambient light bloom behind the mascot only representing calm protective space */}
          <div className="absolute w-36 h-36 rounded-full bg-[#3BE0B9]/[0.035] blur-[40px] pointer-events-none select-none" />
 
          {/* Faint reflected ambient light from the mascot onto nearby mist/clouds */}
          <div className="absolute -inset-12 bg-[#49BAC4]/[0.015] blur-[45px] rounded-full mix-blend-screen pointer-events-none" />

          {/* Floated Mascot with safe shadow */}
          <div 
            className="relative z-20 flex items-center justify-center pointer-events-none" 
            style={{ 
              animation: 'spfloat 6s ease-in-out infinite',
              filter: 'drop-shadow(0 0 6px rgba(59, 224, 185, 0.05)) drop-shadow(0 0 12px rgba(14, 165, 233, 0.02))'
            }}
          >
            <PenguinVideo src={introPenguin} size={155} />
          </div>
   
          {/* Soft teal atmospheric glow beneath the mascot */}
          <div className="absolute bottom-[-16px] w-48 h-10 bg-[#3BE0B9]/[0.08] blur-[20px] rounded-full pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '6s' }} />

          {/* Concentric subtle circular floor light ripples where the mascot hovers */}
          <div className="absolute bottom-[-16px] w-[90px] h-[22px] rounded-full border border-teal-500/[0.08] pointer-events-none -z-10" style={{ animation: 'spripple-expand 6s linear infinite' }} />
          <div className="absolute bottom-[-16px] w-[90px] h-[22px] rounded-full border border-[#52D2B4]/[0.04] pointer-events-none -z-10" style={{ animation: 'spripple-expand 6s linear infinite 3s' }} />

          {/* Faint Grounding Pedestal & Breathing Ambient Shadow underneath */}
          <div className="absolute bottom-[-16px] flex flex-col items-center pointer-events-none z-10 select-none">
            {/* Ambient occlusion shadow */}
            <div 
              className="w-16 h-1.5 rounded-full bg-[#030509]/80 blur-[3px]"
              style={{
                animation: 'spshadow-breathe 6s ease-in-out infinite',
              }}
            />
            {/* Holographic safety light disc halo */}
            <div 
              className="w-20 h-2 rounded-full border border-teal-500/[0.02] bg-teal-500/[0.01] -mt-[4px]"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(59, 224, 185, 0.03) 0%, transparent 80%)',
                animation: 'spshadow-breathe 6s ease-in-out infinite',
              }}
            />
          </div>
        </div>
  
        <div ref={heroRef} className="flex flex-col gap-3 mt-3.5 select-none">
          <h1 className="flex flex-col items-center justify-center text-center -space-y-1 sm:-space-y-1.5 font-playfair font-semibold">
            <span 
              className="text-[2.1rem] sm:text-[2.5rem] text-[#FAF8F5]/95 tracking-[0.015em] leading-tight"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 0 12px rgba(250, 248, 245, 0.04)' }}
            >
              Feel Safe,
            </span>
            <span 
              className="text-[2.25rem] sm:text-[2.65rem] bg-gradient-to-r from-[#FAF8F5] via-[#A2DEC3] to-[#7BC2C7] bg-clip-text text-transparent tracking-[0.015em] leading-[1.1]"
              style={{ textShadow: '0 0 20px rgba(123, 194, 199, 0.12)' }}
            >
              Wherever You Go.
            </span>
          </h1>
          <div className="flex flex-col gap-2.5 mt-2.5">
            <p className="text-[#FAF8F5]/90 text-[13px] sm:text-[13.5px] max-w-[315px] mx-auto leading-relaxed font-sans font-normal tracking-wide antialiased">
              Someone is always closer than panic makes you believe.
            </p>
            <p className="text-[#FAF8F5]/60 text-[11.5px] sm:text-[12px] max-w-[295px] mx-auto leading-relaxed font-sans font-light tracking-wide antialiased">
              SafePing quietly keeps your trusted circle connected — ready to notice, respond, and reach you when it matters most.
            </p>
          </div>
        </div>
 
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-[#E8452A]/30 text-[#E8452A] rounded-xl text-[11px] leading-relaxed w-full flex items-start gap-2.5">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </motion.div>
 
      {/* 3. Action Gateways with spacious relative distancing */}
      <motion.div 
        ref={ctaRef}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        className="w-full max-w-xs flex flex-col gap-4 mb-4 mt-3 relative z-10"
      >
        
        {/* Emotionally calming small micro-label above SOS button */}
        <div className="text-[10.5px] sm:text-[11.5px] text-center text-[#FAF8F5]/35 tracking-[0.12em] font-sans font-light select-none">
          One tap to connect with your safety circle
        </div>
  
        {/* Grounded & Calm Emergency SOS Button */}
        <div className="relative group/sos w-full">
          {/* Faint ambient crimson glow beneath the button */}
          <div className="absolute inset-x-5 bottom-[-10px] h-8 bg-[#9E2A27]/[0.16] blur-[14px] rounded-full pointer-events-none transition-all duration-500 group-hover/sos:scale-105" />
 
          <button
            onClick={handleSOSBypass}
            className="group relative w-full h-13 rounded-[20px] bg-[#7E1E1C] text-[#FAF8F5] font-medium text-xs uppercase tracking-[0.18em] flex items-center justify-center shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.08),_inset_0_-1px_1px_rgba(0,0,0,0.3),_0_6px_20px_rgba(126,30,28,0.14)] border border-[#4F0F0D]/60 transition-all duration-300 hover:bg-[#6C1614] active:scale-[0.985] z-20 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                <Activity size={10} className="stroke-[#FAF8F5]/70" />
              </div>
              <span className="font-semibold tracking-[0.18em]">Emergency SOS</span>
            </div>
            <ArrowRight size={11} className="absolute right-5 opacity-0 group-hover/sos:opacity-85 group-hover/sos:translate-x-1 transition-all duration-300 text-[#FAF8F5]/80" />
          </button>
        </div>
 
        <div className="flex items-center gap-3 justify-center py-1">
          <div className="h-px bg-[#FAF8F5]/10 w-full" />
          <span className="text-[10px] sm:text-[10.5px] tracking-[0.14em] uppercase font-medium shrink-0 text-[#FAF8F5]/35 font-sans">
            Secure Member Gateways
          </span>
          <div className="h-px bg-[#FAF8F5]/10 w-full" />
        </div>
 
        {/* Continue with Google */}
        <button
          onClick={handleGoogleAuth}
          disabled={isSubmitting}
          className="w-full h-13 rounded-2xl bg-[#FAF8F5]/95 text-[#0A0D14] font-medium text-[13.5px] tracking-[0.02em] flex items-center justify-center gap-3 hover:bg-white active:scale-[0.99] transition-all duration-300 shadow-[0_4px_15px_rgba(250,248,245,0.02)] disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0 opacity-90" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66.6-.35 1.36-.35 2.09z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="font-semibold text-neutral-900">Continue with Google</span>
        </button>
 
        {/* Credentials Email Sign In */}
        <button
          onClick={() => navigate('/auth')}
          className="w-full h-13 rounded-2xl bg-[#FAF8F5]/[0.03] text-[#FAF8F5]/85 hover:bg-[#FAF8F5]/[0.06] border border-[#FAF8F5]/10 font-medium text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer"
        >
          <Mail size={12} className="text-[#A6E1D5]/70" />
          <span>Sign In with Email</span>
        </button>
 
        {/* Premium, comforting, human-centered trust indicators */}
        <div className="flex flex-col items-center gap-1.5 mt-5">
          <div className="text-[10px] text-center text-[#FAF8F5]/45 font-light tracking-[0.06em] flex items-center justify-center gap-1.5 select-none pointer-events-none font-sans antialiased">
            <span>You are protected</span>
            <span className="text-[#A6E1D5]/40">&bull;</span>
            <span>You are not alone</span>
          </div>
          <div className="text-[9.5px] text-center text-[#FAF8F5]/30 font-light tracking-[0.04em] flex items-center justify-center gap-1.5 select-none pointer-events-none font-sans antialiased">
            <span>Someone is quietly watching over your steps</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

