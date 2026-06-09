import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useEmergency } from '../context/EmergencyContext';
import { 
  Home, Compass, MapPin, Briefcase, GraduationCap, Clock, Navigation, Plus, 
  CheckCircle, AlertTriangle, ChevronRight, ShieldAlert, Sparkles, Phone, PhoneCall, 
  Mail, Share2, ChevronDown, ChevronUp, Bell, Volume2, VolumeX, Flashlight, AlertOctagon,
  Shield, Siren
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import MapComponent from '../components/MapComponent';
import guardianPenguinVideo from '../assets/ANIMATIONS/guardian_penguin.webm';
import PenThoughtBubble from '../components/PenThoughtBubble';

export default function SafeJourneyView() {
  const {
    activeJourney,
    startJourney,
    cancelJourney,
    completeJourney,
    triggerDelayAlert,
    isDarkMode,
    isWalkWithMeActive,
    setIsWalkWithMeActive,
    penguinMessage,
    setPenguinMessage,
    guardians,
    setActiveCallGuardian,
    triggerSOS
  } = useApp();

  const {
    isSirenActive,
    startSiren,
    stopSiren,
  } = useEmergency();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customDestination, setCustomDestination] = useState('');
  const [customMinutes, setCustomMinutes] = useState('20');
  
  const [isEmergencyToolsExpanded, setIsEmergencyToolsExpanded] = useState(false);
  const [isFlashlightActive, setIsFlashlightActive] = useState(false);

  // Quick preset destinations
  const journeyPresets = [
    { name: 'Home', category: 'Home', icon: Home, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { name: 'Office', category: 'Work', icon: Briefcase, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { name: 'Campus', category: 'School', icon: GraduationCap, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  ];

  const handleStartPreset = (name: string, category: string) => {
    startJourney(name, category, 20);
    // Auto-arm escort when starting a journey to make walk-with-me active
    setIsWalkWithMeActive(true);
    setPenguinMessage("Active overwatch armed. Journey started! I'll be walking with you. 🐧");
  };

  const handleStartCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDestination.trim()) return;
    const mins = parseInt(customMinutes) || 20;
    startJourney(customDestination.trim(), 'Custom', mins);
    setIsWalkWithMeActive(true);
    setPenguinMessage(`Target: ${customDestination.trim()}. Safe check interval set. Walking with you! 🐧`);
    setCustomDestination('');
    setIsModalOpen(false);
  };

  // Quick actions logic
  const handleShareLocation = () => {
    setPenguinMessage("Live GPS location coordinates synced with all guardians! 📍 Tracking actively.");
  };

  const handleCallGuardian = () => {
    const priorityGuardian = guardians.find((g: any) => g.isPriority) || guardians[0];
    if (priorityGuardian) {
      setActiveCallGuardian(priorityGuardian);
      setPenguinMessage(`Diverting to direct vocal channel with ${priorityGuardian.name}... 📞`);
    } else {
      setPenguinMessage("Please add a backup contact in your Guardians tab to call! 🐧");
    }
  };

  const handleSOS = () => {
    triggerSOS();
  };

  // Emergency Tools logic
  const handleToggleFlashlight = async () => {
    setIsFlashlightActive(prev => {
      const next = !prev;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then(stream => {
            const track = stream.getVideoTracks()[0];
            if (track) {
              const capabilities = track.getCapabilities() as any;
              if (capabilities.torch) {
                track.applyConstraints({
                  advanced: [{ torch: next }]
                } as any).catch(err => {
                  console.warn("Torch constraints application error:", err);
                });
              }
            }
          }).catch(err => {
            console.warn("Torch stream capture error:", err);
          });
      }
      return next;
    });
  };

  const handleFakeCall = () => {
    const backupContact = {
      id: 'mock_fake_caller',
      name: 'SafePing Companion Net',
      phone: '800-555-0199',
      relationship: 'Support Agent',
      avatar: 'FRIEND 1.png',
      isPriority: true,
      status: 'safe' as any
    };
    setActiveCallGuardian(backupContact);
    setPenguinMessage("Deploying simulated incoming audio channel to divert attention... 🎭");
  };

  const handleEmergencyMessage = () => {
    const backupContact = guardians.find((g: any) => g.isPriority) || guardians[0];
    const name = backupContact ? backupContact.name : "contacts";
    setPenguinMessage(`Emergency coordinates text sent to ${name}! 📩`);
  };

  const textColor = isDarkMode ? 'text-white' : 'text-navy-dark';
  const subTextColor = isDarkMode ? 'text-white/40' : 'text-navy-dark/40';

  return (
    <div className="flex flex-col gap-5 py-2 h-full select-none max-w-md mx-auto pb-24">
      {/* Redesigned Active Companion Mode / Walk With Me view */}
      {activeJourney ? (
        <div className="flex flex-col gap-5 text-white">
          
          {/* HEADER (Mockup Item 1) */}
          <div className="flex justify-between items-start pt-1.5 px-1">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                  <Shield size={12} className="stroke-[2.5px]" />
                </div>
                <span className="text-base font-extrabold text-white tracking-tight">SafePing Active</span>
              </div>
              <span className="text-[11px] text-white/50 font-semibold pl-7">Walking with you</span>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold shadow-lg shadow-emerald-500/4 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Protected
            </div>
          </div>

          {/* GUARDIAN PENGUIN HERO SECTION (Mockup Item 2) */}
          <div className="flex items-center gap-4 bg-slate-900/10 border border-white/[0.03] p-4 rounded-3xl relative overflow-hidden">
            <div className="absolute inset-y-0 right-0 w-32 bg-teal-500/3 blur-3xl rounded-full" />
            
            {/* Dynamic Thought Bubble */}
            <div className="flex-1 min-w-0">
              <PenThoughtBubble screenName="journey" pointerPosition="right" className="w-full max-w-full" />
            </div>

            {/* Mascot on the right */}
            <div className="w-24 h-24 relative shrink-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-teal-500/8 blur-xl rounded-full animate-pulse" />
              <motion.div
                animate={{
                  y: [0, -3, 0],
                  scale: [1, 1.02, 1]
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-20 h-20 relative z-10"
              >
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain pointer-events-none filter drop-shadow-[0_4px_10px_rgba(29,187,138,0.1)]"
                  poster="/guardianPenguin.png"
                >
                  <source src={guardianPenguinVideo} type="video/webm" />
                </video>
              </motion.div>
            </div>
          </div>

          {/* QUICK ACTIONS GRID (Mockup Item 3) */}
          <div className="grid grid-cols-3 gap-3">
            {/* Share Location */}
            <button
              type="button"
              onClick={handleShareLocation}
              className="flex flex-col items-center justify-center gap-2.5 px-3 py-4 rounded-[24px] bg-slate-900/40 border border-white/5 hover:bg-slate-800/45 hover:border-white/10 active:scale-95 transition-all text-center aspect-[1/0.95] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">
                <MapPin size={18} className="stroke-[2.5px]" />
              </div>
              <div className="flex flex-col leading-tight select-none">
                <span className="text-xs font-black text-white">Share</span>
                <span className="text-[9px] text-white/50 font-bold mt-0.5">Location</span>
              </div>
            </button>

            {/* Call Guardian */}
            <button
              type="button"
              onClick={handleCallGuardian}
              className="flex flex-col items-center justify-center gap-2.5 px-3 py-4 rounded-[24px] bg-slate-900/40 border border-white/5 hover:bg-slate-800/45 hover:border-white/10 active:scale-95 transition-all text-center aspect-[1/0.95] cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">
                <Phone size={18} className="stroke-[2.5px]" />
              </div>
              <div className="flex flex-col leading-tight select-none">
                <span className="text-xs font-black text-white">Call</span>
                <span className="text-[9px] text-white/50 font-bold mt-0.5">Guardian</span>
              </div>
            </button>

            {/* SOS */}
            <button
              type="button"
              onClick={handleSOS}
              className="flex flex-col items-center justify-center gap-2.5 px-3 py-4 rounded-[24px] bg-rose-950/20 border border-rose-500/25 hover:bg-rose-900/30 hover:border-rose-500/40 active:scale-95 transition-all text-center aspect-[1/0.95] cursor-pointer shadow-lg shadow-rose-950/10"
            >
              <div className="w-9 h-9 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 animate-pulse">
                <span className="font-extrabold text-[10px] tracking-tighter uppercase">SOS</span>
              </div>
              <div className="flex flex-col leading-tight select-none">
                <span className="text-xs font-black text-[#fbcfe8]">Emergency</span>
                <span className="text-[9px] text-rose-400/80 font-bold mt-0.5">SOS Channels</span>
              </div>
            </button>
          </div>

          {/* JOURNEY OVERVIEW CARD (Mockup Item 4) */}
          <div className="rounded-[28px] border border-white/10 bg-slate-900/30 p-5 flex flex-col gap-4 text-left shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Compass size={15} className="text-[#3BE0B9]" />
                <span className="text-sm font-extrabold text-white tracking-tight">Journey Overview</span>
              </div>
              <span className="text-[9px] font-bold text-teal-400 bg-teal-500/8 border border-teal-500/15 px-2.5 py-0.5 rounded-full select-none">
                Active Tracking
              </span>
            </div>

            {/* Travel stats grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-white/5 pt-4">
              <div className="flex items-start gap-2.5">
                <Clock size={14} className="text-white/30 shrink-0 mt-0.5" />
                <div className="flex flex-col leading-none">
                  <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Started</span>
                  <span className="text-sm font-bold text-white mt-1">{activeJourney.startTime || '7:18 PM'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock size={14} className="text-[#3BE0B9]/45 shrink-0 mt-0.5" />
                <div className="flex flex-col leading-none">
                  <span className="text-[9px] font-black uppercase text-[#3BE0B9]/45 tracking-wider">ETA</span>
                  <span className="text-sm font-bold text-[#3BE0B9] mt-1">{activeJourney.eta || '12 min'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="text-white/30 shrink-0 mt-0.5" />
                <div className="flex flex-col leading-none">
                  <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Destination</span>
                  <span className="text-sm font-bold text-white mt-1 truncate max-w-[125px]">{activeJourney.destination}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Navigation size={13} className="rotate-45 text-white/30 shrink-0 mt-0.5" />
                <div className="flex flex-col leading-none">
                  <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Distance</span>
                  <span className="text-sm font-bold text-white mt-1">
                    {activeJourney.distanceRemaining ? `${activeJourney.distanceRemaining} km` : '1.2 km'}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar & Walking Person */}
            <div className="flex flex-col gap-1.5 bg-slate-950/20 border border-white/5 rounded-2xl p-3 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs animate-bounce">🚶</span>
                <span className="text-[9.5px] font-bold text-white/60 leading-none">Monitoring your journey</span>
              </div>
              {(() => {
                const percent = Math.min(100, Math.floor((activeJourney.elapsedMinutes / activeJourney.totalDuration) * 100));
                return (
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-1 pb-[1px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(12, percent)}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-[#1dbb8a]"
                    />
                  </div>
                );
              })()}
            </div>

            {/* Compact Simulation control discrete test toggle */}
            <button
              type="button"
              onClick={activeJourney.status === 'delayed' ? cancelJourney : triggerDelayAlert}
              className="w-full py-2 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 text-amber-500/60 font-bold uppercase tracking-wider text-[8px] rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <AlertTriangle size={10} className="animate-pulse" />
              <span>{activeJourney.status === 'delayed' ? 'Disarm simulation delay' : '🔬 Test Delay Simulation'}</span>
            </button>
          </div>

          {/* AI COMPANION SECTION (Mockup Item 5) */}
          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('open-penguin-assistant'))}
            className="rounded-[28px] border border-white/5 bg-slate-900/30 p-4 flex flex-col gap-3 text-left shadow-2xl relative cursor-pointer hover:border-white/10 active:scale-[0.99] transition-all backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-[#3BE0B9]/25 flex items-center justify-center text-sm leading-none shrink-0 select-none">
                  🐧
                </div>
                <div className="flex flex-col text-left justify-center leading-none">
                  <span className="text-xs font-black text-white">Guardian Penguin AI</span>
                  <span className="text-[9px] text-white/45 mt-1">Your AI safety companion</span>
                </div>
              </div>
              
              <span className="text-[9px] font-black uppercase text-[#3be0b9] tracking-widest bg-[#3be0b9]/5 border border-[#3be0b9]/10 px-2 py-0.5 rounded">
                Gemini
              </span>
            </div>

            <div className="relative w-full h-11 bg-slate-950/20 border border-white/5 rounded-xl px-4 flex items-center justify-between text-white/40">
              <span className="text-[10px] font-medium truncate pr-6 select-none">Ask anything about safety, travel, or emergencies...</span>
              <div className="w-[28px] h-[28px] rounded-lg bg-[#3be0b9]/10 flex items-center justify-center text-[#3be0b9] border border-[#3be0b9]/25 transition-all shrink-0">
                <Sparkles size={12} className="shrink-0 animate-pulse" />
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE EMERGENCY TOOLS (Mockup Item 6) */}
          <div className="rounded-[28px] border border-white/5 bg-slate-900/30 overflow-hidden shadow-2xl backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setIsEmergencyToolsExpanded(prev => !prev)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.01] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertOctagon size={12} className="stroke-[2.5px]" />
                </div>
                <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">Emergency Tools</span>
              </div>
              
              <div>
                {isEmergencyToolsExpanded ? (
                  <ChevronUp size={15} className="text-white/40" />
                ) : (
                  <ChevronDown size={15} className="text-white/40" />
                )}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isEmergencyToolsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-white/5"
                >
                  <div className="px-5 py-5 grid grid-cols-5 gap-1.5 bg-slate-950/15">
                    {/* LOUD ALARM */}
                    <button
                      type="button"
                      onClick={() => isSirenActive ? stopSiren() : startSiren('classic')}
                      className="flex flex-col items-center gap-2 p-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                        isSirenActive 
                          ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-lg shadow-red-500/25' 
                          : 'bg-red-500/10 border-red-500/15 text-red-400 hover:bg-red-500/20'
                      }`}>
                        <Siren size={18} className={`${isSirenActive ? 'rotate-12 duration-200' : ''}`} />
                      </div>
                      <span className="text-[8px] font-black text-rose-200 leading-none text-center">Loud Alarm</span>
                    </button>

                    {/* FLASHLIGHT */}
                    <button
                      type="button"
                      onClick={handleToggleFlashlight}
                      className="flex flex-col items-center gap-2 p-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                        isFlashlightActive 
                          ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/25' 
                          : 'bg-amber-500/10 border-amber-500/15 text-amber-400 hover:bg-amber-500/20'
                      }`}>
                        <Flashlight size={18} />
                      </div>
                      <span className="text-[8px] font-black text-amber-200 leading-none text-center">Flashlight</span>
                    </button>

                    {/* QUICK CALL */}
                    <button
                      type="button"
                      onClick={handleCallGuardian}
                      className="flex flex-col items-center gap-2 p-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/15 text-teal-400 hover:bg-teal-500/20 flex items-center justify-center">
                        <PhoneCall size={18} />
                      </div>
                      <span className="text-[8px] font-black text-teal-200 leading-none text-center">Quick Call</span>
                    </button>

                    {/* FAKE CALL */}
                    <button
                      type="button"
                      onClick={handleFakeCall}
                      className="flex flex-col items-center gap-2 p-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/15 text-purple-400 hover:bg-purple-500/20 flex items-center justify-center">
                        <span className="text-base select-none leading-none">🎭</span>
                      </div>
                      <span className="text-[8px] font-black text-purple-200 leading-none text-center">Fake Call</span>
                    </button>

                    {/* EMERGENCY MESSAGE */}
                    <button
                      type="button"
                      onClick={handleEmergencyMessage}
                      className="flex flex-col items-center gap-2 p-0.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/15 text-orange-400 hover:bg-orange-500/20 flex items-center justify-center">
                        <Mail size={18} />
                      </div>
                      <span className="text-[8px] font-black text-orange-200 leading-none text-center">Message</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PRIMARY ACTION BUTTON (Mockup Item 7) */}
          <button
            type="button"
            onClick={completeJourney}
            className="w-full py-4 px-4 bg-gradient-to-r from-teal-400 to-[#1dbb8a] hover:brightness-110 active:scale-95 text-[#030612] font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-teal-500/15 transition-all cursor-pointer font-sans"
          >
            <div className="w-4.5 h-4.5 rounded-full bg-black/10 flex items-center justify-center">
              <CheckCircle size={11} className="stroke-[3px] text-black/85" />
            </div>
            <span>I'M SAFE NOW</span>
          </button>
        </div>
      ) : (
        /* INACTIVE / PRE-JOURNEY SELECT STATE (redesigned cohesive visual style) */
        <div className="flex flex-col gap-5">
          {/* Header */}
          <header className="flex flex-col gap-1 text-left pt-1.5">
            <span className={`text-[10px] uppercase tracking-[0.25em] font-black flex items-center gap-1.5 ${subTextColor}`}>
              <Navigation size={10} className="text-[#3BE0B9]" />
              Sentinel tracking
            </span>
            <h1 className={`text-3xl font-black tracking-tight ${textColor}`}>
              Safe Journey
            </h1>
            <p className={`text-[11.5px] ${subTextColor} leading-relaxed mt-1 font-medium`}>
              Share your travels passively. Get auto safety alerts when delayed.
            </p>
          </header>

          {/* Map */}
          <div className="relative w-full aspect-[4/3] rounded-[28px] overflow-hidden border border-white/10 shadow-xl bg-slate-950/40">
            <MapComponent />
          </div>

          {/* Start Journey Selector Card */}
          <div className="rounded-[28px] border border-white/5 bg-slate-900/35 p-5 flex flex-col gap-4 text-left shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute right-[-20px] top-[-20px] opacity-5 blur-sm pointer-events-none">
              <Compass size={130} className="text-[#3BE0B9]" />
            </div>

            <div className="space-y-1 relative z-10">
              <h3 className="font-extrabold text-white text-sm">Heading Somewhere?</h3>
              <p className="text-[11px] text-white/50 leading-relaxed font-semibold">
                Start check-in path watch. Guardians will be notified automatically of departures and secure arrivals.
              </p>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1.5">
              {journeyPresets.map((preset, index) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleStartPreset(preset.name, preset.category)}
                    className="py-3 px-2 rounded-2xl flex flex-col items-center gap-2.5 border border-white/[0.03] bg-[#05060a]/40 hover:bg-white/[0.04] transition-all group active:scale-95 text-center cursor-pointer"
                  >
                    <div className={`p-2 rounded-xl border ${preset.color} transition-all duration-300 group-hover:scale-105`}>
                      <Icon size={15} />
                    </div>
                    <span className="text-[9.5px] font-bold text-white/85">{preset.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-400 to-cyan-500 hover:brightness-110 active:scale-95 text-[#030612] font-black uppercase tracking-widest text-[9.5px] rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-teal-400/10 transition-all cursor-pointer"
            >
              <Plus size={13} className="stroke-[3.5px]" />
              <span>Customize Journey Check-In</span>
            </button>
          </div>

          {/* COMPANION OVERWATCH BANNER */}
          <div className="rounded-[28px] border border-[#3be0b9]/15 bg-gradient-to-br from-cyan-950/10 to-transparent p-5 text-left relative overflow-hidden backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-[#3BE0B9] bg-[#3BE0B9]/15 px-2.5 py-0.5 rounded border border-[#3BE0B9]/20 self-start">
                  Companion Escort Protocol
                </span>
                <h2 className="text-lg font-bold text-white">Live Walk With Me</h2>
                <p className="text-[11px] leading-relaxed text-white/50 font-semibold">
                  Trigger real-time positioning updates to contacts. Pen checks in regularly.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextVal = !isWalkWithMeActive;
                  setIsWalkWithMeActive(nextVal);
                  if (nextVal) {
                    setPenguinMessage("Active overwatch armed. I'm staying right beside you! 🐧");
                    // Start a default journey if none exists to instantly show the gorgeous active screen!
                    startJourney("Custom Walk", "Custom", 20);
                  } else {
                    setPenguinMessage("Escort model suspended. Standing by watcher enabled. 🐧");
                  }
                }}
                className={`px-4 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-wider shadow-md pointer-events-auto cursor-pointer shrink-0 ${
                  isWalkWithMeActive
                    ? 'bg-rose-500 border border-rose-400 text-white'
                    : 'bg-gradient-to-r from-teal-400 to-[#1dbb8a] text-[#030612] hover:scale-105 active:scale-95'
                }`}
              >
                {isWalkWithMeActive ? 'Disarm Escort' : 'Arm Escort'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM Destination modal check-in */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1500] flex items-end justify-center sm:items-center px-4"
          >
            <div
              className="absolute inset-0 bg-black/85 backdrop-blur-md pointer-events-auto"
              onClick={() => setIsModalOpen(false)}
            />

            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.96 }}
              className="relative rounded-t-[36px] sm:rounded-[36px] w-full max-w-sm border border-white/10 p-6 flex flex-col gap-5 pointer-events-auto bg-[#070b1e] pb-10 sm:pb-6 overflow-hidden"
            >
              <header className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#3be0b9] bg-[#3be0b9]/10 border border-[#3be0b9]/25 px-2 py-0.5 rounded-full">
                    Custom Journey
                  </span>
                  <h3 className="text-xl font-black text-white tracking-tight">Set Travel Check-In</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                >
                  ✕
                </button>
              </header>

              <form onSubmit={handleStartCustom} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black tracking-widest text-white/40 uppercase pl-1">Destination Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grandma's House"
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black tracking-widest text-white/40 uppercase pl-1">Estimated Journey Time (Minutes)</label>
                  <input
                    type="number"
                    required
                    placeholder="Minutes"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[#3be0b9] text-navy-dark font-black uppercase tracking-widest text-[9px] rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-[#3be0b9]/25"
                >
                  <span>Start Live Journey Check</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
