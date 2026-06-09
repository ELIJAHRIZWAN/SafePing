/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import { AppProvider, useApp } from './context/AppContext';
import Onboarding from './components/Onboarding';
import SOSOverlay from './components/SOSOverlay';
import AIPenguinAssistant from './components/AIPenguinAssistant';
import SimulatedCallOverlay from './components/SimulatedCallOverlay';
import EmergencyErrorBoundary from './components/EmergencyErrorBoundary';
import { initializeVoiceSystem, unlockAudio } from './services/elevenlabsService';
import { View } from './types';

// Views
import HomeView from './views/Home';
import GuardiansView from './views/Guardians';
import QuickStatusView from './views/QuickStatus';
import SafeJourneyView from './views/SafeJourney';
import ActivityLogsView from './views/ActivityLogs';
import SettingsView from './views/Settings';
import Auth from './views/Auth';
import WelcomeView from './views/Welcome';
import cityBg from './assets/images/city_background_1780320392720.png';
import welcomeVideo from './assets/images/SAFEPING ANIMATED BACKGROUND.mp4';

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user } = useApp();

  if (!firebaseUser) {
    return <Navigate to="/welcome" replace />;
  }

  if (user.isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, user, isGuest } = useApp();
  const location = useLocation();

  const hasSession = !!firebaseUser || isGuest;

  if (!hasSession) {
    // Redirect to welcome, saving the place they wanted to go
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  // If firebaseUser is logged in but profile is not onboardinged yet
  if (firebaseUser && !user.isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children, type }: { children: React.ReactNode; type: 'auth' | 'welcome' }) {
  const { firebaseUser, user, isGuest } = useApp();

  const hasSession = !!firebaseUser || isGuest;

  if (hasSession) {
    if (firebaseUser && !user.isOnboarded) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { firebaseUser, user, isGuest } = useApp();

  const hasSession = !!firebaseUser || isGuest;

  if (hasSession) {
    if (firebaseUser && !user.isOnboarded) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/welcome" replace />;
}

function Layout() {
  const { isEmergencyActive, isDarkMode, penguinMessage } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const getSelectedView = (): View => {
    const path = location.pathname;
    if (path === '/guardians') return 'guardians';
    if (path === '/quick-status') return 'status';
    if (path === '/safe-journey') return 'journey';
    if (path === '/activity-logs') return 'logs';
    if (path === '/settings') return 'settings';
    return 'home';
  };

  const handleViewChange = (view: View) => {
    if (view === 'home') navigate('/dashboard');
    else if (view === 'status') navigate('/quick-status');
    else if (view === 'journey') navigate('/safe-journey');
    else if (view === 'logs') navigate('/activity-logs');
    else navigate(`/${view}`);
  };

  const currentView = getSelectedView();

  // Floating Cursor Spotlight Refs & State with smooth LERP easing
  const spotlightRef = React.useRef<HTMLDivElement | null>(null);
  const parallaxBgRef = React.useRef<HTMLDivElement | null>(null);
  const cloudsRef = React.useRef<HTMLDivElement | null>(null);
  const raysRef = React.useRef<HTMLDivElement | null>(null);
  const mouseRef = React.useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500 });
  const currentRef = React.useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500 });
  const hasMouseMoved = React.useRef(false);

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

      // Interpolated motion (0.05 ease for smoothly gliding cinematic delay)
      const ease = 0.05;
      const dx = targetX - currentRef.current.x;
      const dy = targetY - currentRef.current.y;

      currentRef.current.x += dx * ease;
      currentRef.current.y += dy * ease;

      if (spotlightRef.current) {
        spotlightRef.current.style.setProperty('--x', `${currentRef.current.x}px`);
        spotlightRef.current.style.setProperty('--y', `${currentRef.current.y}px`);
      }

      if (typeof window !== 'undefined') {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const rx = currentRef.current.x - centerX;
        const ry = currentRef.current.y - centerY;

        if (parallaxBgRef.current) {
          parallaxBgRef.current.style.transform = `translate3d(${rx * -0.005}px, ${ry * -0.005}px, 0) scale(1.02)`;
        }
        if (cloudsRef.current) {
          cloudsRef.current.style.transform = `translate3d(${rx * -0.012}px, ${ry * -0.01}px, 0)`;
        }
        if (raysRef.current) {
          raysRef.current.style.transform = `translate3d(${rx * 0.008}px, ${ry * 0.005}px, 0)`;
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

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-700 ${
      isDarkMode ? 'dark' : 'light'
    }`}>
      {/* Premium CSS Keyframe Styles */}
      <style>{`
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
        @keyframes sp-wave-drift-1 {
          0%, 100% { transform: translate3d(-3%, 0, 0) scale(1); opacity: 0.12; }
          50% { transform: translate3d(3%, -15px, 0) scale(1.01); opacity: 0.28; }
        }
        @keyframes sp-wave-drift-2 {
          0%, 100% { transform: translate3d(3%, 0, 0) scale(1.01); opacity: 0.09; }
          50% { transform: translate3d(-3%, 12px, 0) scale(0.99); opacity: 0.22; }
        }
        @keyframes sp-beam-pulse {
          0%, 100% { opacity: 0.01; transform: scaleX(1) rotate(-22deg); }
          50% { opacity: 0.03; transform: scaleX(1.04) rotate(-20deg); }
        }
        @keyframes sp-beam-pulse-delayed {
          0%, 100% { opacity: 0.02; transform: scaleX(1.03) rotate(-26deg); }
          50% { opacity: 0.01; transform: scaleX(0.97) rotate(-28deg); }
        }
        @keyframes sp-holographic-particle {
          0% { transform: translateY(0px) translateX(0px) scale(0.5); opacity: 0; }
          15% { opacity: 0.22; }
          85% { opacity: 0.22; }
          100% { transform: translateY(-160px) translateX(25px) scale(1.1); opacity: 0; }
        }
        @keyframes sp-holographic-particle-delayed {
          0% { transform: translateY(0px) translateX(0px) scale(0.6); opacity: 0; }
          20% { opacity: 0.18; }
          80% { opacity: 0.18; }
          100% { transform: translateY(-120px) translateX(-30px) scale(1.0); opacity: 0; }
        }
        @keyframes sp-grid-breath {
          0%, 100% { opacity: 0.04; }
          50% { opacity: 0.09; }
        }
      `}</style>

      {/* Atmospheric Full-Screen Parallax Environment (Edge-to-Edge) */}
      <div className="fixed inset-0 pointer-events-none -z-20 bg-[#010408] overflow-hidden select-none">
        
        {/* Layer 1: Dark Base Gradient */}
        <div 
          className="absolute inset-0 bg-gradient-to-tr from-[#01060c] via-[#020b15] to-[#010408]"
          style={{
            backgroundSize: '200% 200%',
            animation: 'sp-ambient-shift 35s ease-in-out infinite',
          }}
        />

        {/* Layer 1.2: Cinematic animated background video overlaid on top of the backplate */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none z-[1]"
        >
          <source src={welcomeVideo} type="video/mp4" />
        </video>

        {/* Layer 1.5: City Background underlay (rendered when on home layout dashboard) */}
        {currentView === 'home' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.22 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-[2]"
          >
            <div 
              className="absolute inset-x-[-10px] inset-y-[-10px] bg-cover bg-center bg-no-repeat filter scale-[1.015]"
              style={{
                backgroundImage: `url(${cityBg})`,
                backgroundPosition: 'center center',
                backgroundSize: 'cover',
                filter: 'blur(3.5px) brightness(0.65)'
              }}
            />
            {/* Soft linear black overlay gradient directly above the city image - higher opacity for text readability */}
            <div 
              className="absolute inset-0 z-[1]"
              style={{
                background: 'linear-gradient(to bottom, rgba(1, 4, 8, 0.5) 0%, rgba(1, 4, 8, 0.3) 50%, rgba(1, 4, 8, 0.5) 100%)'
              }}
            />
            {/* Symmetrical dark edges and natural faint vignette falloff for deep home depth - highly transparent */}
            <div 
              className="absolute inset-0 z-[2]"
              style={{
                background: 'radial-gradient(circle at center, rgba(0, 1, 3, 0.05) 20%, rgba(0, 1, 3, 0.12) 65%, rgba(0, 1, 3, 0.22) 100%)'
              }}
            />
          </motion.div>
        )}

        {/* Layer 2: Parallax Depth Plane B Particles */}
        <div 
          ref={parallaxBgRef}
          className="absolute inset-x-[-3%] inset-y-[-3%] pointer-events-none opacity-[0.006]"
          style={{
            willChange: 'transform'
          }}
        >
          {/* Sparse Depth Plane B Particles - highly quiet and minimal */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-20">
            <div className="absolute bottom-[40%] right-[20%] w-[1px] h-[1px] rounded-full bg-emerald-300/10" style={{ animation: 'sp-holographic-particle-delayed 34s linear infinite 2s' }} />
            <div className="absolute top-[20%] right-[45%] w-[1px] h-[1px] rounded-full bg-emerald-300/10" style={{ animation: 'sp-holographic-particle 38s linear infinite 5s' }} />
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
            className="absolute rounded-full bg-teal-500/[0.012] w-[900px] h-[700px]"
            style={{
              top: '-15%',
              left: '15%',
              animation: 'sp-fog-drift-1 65s ease-in-out infinite',
              mixBlendMode: 'screen',
              filter: 'blur(180px)',
            }}
          />
          {/* Volumetric soft Indigo/Blue breathing cloud */}
          <div 
            className="absolute rounded-full bg-indigo-600/[0.005] w-[1100px] h-[850px]"
            style={{
              bottom: '-10%',
              left: '-15%',
              animation: 'sp-fog-drift-2 75s ease-in-out infinite',
              mixBlendMode: 'screen',
              filter: 'blur(200px)',
            }}
          />
          {/* Soft emerald protective glow blob */}
          <div 
            className="absolute rounded-full bg-emerald-500/[0.004] w-[800px] h-[650px]"
            style={{
              bottom: '15%',
              right: '5%',
              animation: 'sp-fog-drift-3 70s ease-in-out infinite',
              mixBlendMode: 'screen',
              filter: 'blur(160px)',
            }}
          />
          {/* Central emotional soft breathing glow */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/[0.008] w-[900px] h-[900px] pointer-events-none"
            style={{
              animation: 'sp-grid-breath 12s ease-in-out infinite',
              mixBlendMode: 'screen',
              filter: 'blur(180px)',
            }}
          />

          {/* Dual-Depth Parallax Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-[0.05]">
            <div className="absolute bottom-[25%] left-[15%] w-[1px] h-[1px] rounded-full bg-cyan-300/10" style={{ animation: 'sp-holographic-particle 28s linear infinite' }} />
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
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.008) 0%, rgba(14, 165, 233, 0.001) 50%, transparent 100%)',
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
              background: 'linear-gradient(225deg, rgba(16, 185, 129, 0.006) 0%, rgba(14, 165, 233, 0.001) 45%, transparent 90%)',
              transformOrigin: 'top right',
              animation: 'sp-beam-pulse-delayed 32s ease-in-out infinite',
              filter: 'blur(75px)',
            }}
          />
        </div>

        {/* Fixed Fullscreen Div for Ambient Cursor Glow (Behind All UI Content) */}
        <div 
          ref={spotlightRef}
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen"
          style={{
            background: `radial-gradient(600px circle at var(--x, 50vw) var(--y, 50vh), rgba(0, 255, 180, 0.06), transparent 40%), radial-gradient(800px circle at var(--x, 50vw) var(--y, 50vh), rgba(0, 180, 255, 0.03), transparent 60%)`,
          }}
        />

        {/* Layer 7: Symmetrical Vignette Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, transparent 55%, rgba(1, 4, 8, 0.4) 85%, rgba(1, 4, 8, 0.75) 100%)'
          }}
        />
      </div>

      <div className="fixed top-20 right-6 z-[150] pointer-events-none hidden sm:block">
        <motion.div
          key={penguinMessage}
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          className="relative group pointer-events-auto cursor-help"
        >
          {/* Tooltip on hover */}
          <div className="absolute top-0 right-full mr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-48">
            <div className={`glass p-4 rounded-2xl text-[10px] font-bold leading-relaxed shadow-2xl ${
              isDarkMode ? 'bg-navy-dark/90 text-white' : 'bg-white/90 text-navy-dark'
            }`}>
              "{penguinMessage}"
            </div>
            <div className={`absolute top-4 -right-2 w-4 h-4 rotate-45 ${
              isDarkMode ? 'bg-navy-dark/90' : 'bg-white/90'
            }`} />
          </div>
        </motion.div>
      </div>

      <main id="app-container" className={`relative z-10 mx-auto px-6 pt-12 pb-32 min-h-screen transition-all duration-300 ${
        currentView === 'home' || currentView === 'status' || currentView === 'journey' ? 'max-w-6xl w-full' : 'max-w-lg'
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {!isEmergencyActive && <BottomNav currentView={currentView} onViewChange={handleViewChange} />}

      <AIPenguinAssistant />
      <SimulatedCallOverlay />

      {/* SOS Cinematic Overlay with smooth fade in/out transitions */}
      <AnimatePresence mode="wait">
        {isEmergencyActive && (
          <EmergencyErrorBoundary>
            <SOSOverlay />
          </EmergencyErrorBoundary>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { isAuthLoading } = useApp();

  return (
    <AnimatePresence mode="wait">
      {isAuthLoading ? (
        <motion.div
          key="global-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 flex flex-col items-center justify-center bg-[#0c0d10] z-[1000]"
        >
          {/* Soft elegant atmospheric drifting ocean currents behind loader */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[50%] bg-[#6a3de8]/8 blur-[140px] rounded-full" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[45%] bg-[#1DBB8A]/3 blur-[120px] rounded-full" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Elegant glowing spinner element matching core SafePing identity */}
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-[#6a3de8]/15 border-t-[#1DBB8A] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[#1DBB8A] text-[9px] font-mono uppercase tracking-[0.2em] font-black animate-pulse">
                Safe
              </div>
            </div>
            
            <h2 className="text-white text-sm font-semibold tracking-wide mb-1 select-none font-sans">
              Securing Your SafePing Node
            </h2>
            <p className="text-[#E8E6F0]/40 text-[10px] font-mono tracking-widest uppercase select-none">
              Connecting to Sentinel Net...
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="app-content-mounted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

let hasBootstrappedRedirect = false;

function AppContent() {
  const { firebaseUser, isAuthLoading, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // One-time startup routing evaluator
    if (!isAuthLoading && !hasBootstrappedRedirect) {
      hasBootstrappedRedirect = true;
      console.log("[SafePing Startup] Clean app launch routing triggered. Previous URL path:", location.pathname);
      
      if (firebaseUser) {
        // Rule 1: Active authenticated credentials -> route directly to Dashboard
        if (!user.isOnboarded) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        // Rule 2: Guests or unauthenticated sessions -> route directly to Welcome
        navigate('/welcome', { replace: true });
      }
    }
  }, [isAuthLoading, firebaseUser, user.isOnboarded, navigate, location.pathname]);

  useEffect(() => {
    initializeVoiceSystem();
    const handleGesture = () => {
      unlockAudio();
    };
    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('touchend', handleGesture, { passive: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchend', handleGesture);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      
      {/* Public routes */}
      <Route path="/auth" element={
        <PublicRoute type="auth">
          <Auth />
        </PublicRoute>
      } />
      
      <Route path="/welcome" element={
        <PublicRoute type="welcome">
          <WelcomeView />
        </PublicRoute>
      } />

      <Route path="/onboarding" element={
        <OnboardingRoute>
          <Onboarding />
        </OnboardingRoute>
      } />

      {/* Routes wrapped in Layout, guarded by standard session protection */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<HomeView />} />
        <Route path="/guardians" element={<GuardiansView />} />
        <Route path="/quick-status" element={<QuickStatusView />} />
        <Route path="/safe-journey" element={<SafeJourneyView />} />
        <Route path="/activity-logs" element={<ActivityLogsView />} />
        <Route path="/settings" element={<SettingsView />} />
        
        {/* Redirect aliases */}
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        <Route path="/status" element={<Navigate to="/quick-status" replace />} />
        <Route path="/journey" element={<Navigate to="/safe-journey" replace />} />
        <Route path="/tracking" element={<Navigate to="/safe-journey" replace />} />
        <Route path="/logs" element={<Navigate to="/activity-logs" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppBootstrap>
          <AppContent />
        </AppBootstrap>
      </BrowserRouter>
    </AppProvider>
  );
}
