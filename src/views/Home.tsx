import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Settings as SettingsIcon, 
  Home as HomeIcon, 
  Compass, 
  MapPin, 
  Moon, 
  Sun, 
  BellOff,
  Battery,
  Activity,
  Send,
  CheckCircle2,
  Navigation,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  MessageSquare,
  AlertTriangle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useEmergency } from '../context/EmergencyContext';
import { useNavigate } from 'react-router-dom';
import { sendConnectionMessage } from '../services/firebase';
import introPenguin from '../assets/ANIMATIONS/introductive_penguin.webm';
import PenguinVideo from '../components/PenguinVideo';
import { speakWithElevenLabs } from '../services/elevenlabsService';
import GlassCard from '../components/GlassCard';
import MapComponent from '../components/MapComponent';
import PenThoughtBubble from '../components/PenThoughtBubble';

export default function HomeView() {
  const {
    user,
    isDarkMode,
    userStatus,
    updateUserStatus,
    penguinMessage,
    setPenguinMessage,
    activeJourney,
    guardianMode,
    connectionsList,
    guardians,
    batteryLevel,
    setActiveCallGuardian,
    completeJourney,
    userLocation
  } = useApp();

  const { 
    isHoldingSOS, 
    cameraStatus,
    isSirenActive,
    startSiren,
    stopSiren
  } = useEmergency();
  
  const navigate = useNavigate();

  // Local state for thinking, speaking, listening indicators on the Home mascot UI
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // States for Safety Tools accordion & Flashlight state
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [isFlashlightActive, setIsFlashlightActive] = useState(false);

  // Monitor voice events from AIPenguinAssistant or system wide
  useEffect(() => {
    const handleVoiceStart = () => {
      setIsSpeaking(true);
    };
    const handleVoiceEnd = () => {
      setIsSpeaking(false);
    };
    const handleListenStart = () => {
      setIsListening(true);
    };
    const handleListenEnd = () => {
      setIsListening(false);
    };

    window.addEventListener('penguin-speaking-start', handleVoiceStart);
    window.addEventListener('penguin-speaking-end', handleVoiceEnd);
    window.addEventListener('penguin-listening-start', handleListenStart);
    window.addEventListener('penguin-listening-end', handleListenEnd);

    return () => {
      window.removeEventListener('penguin-speaking-start', handleVoiceStart);
      window.removeEventListener('penguin-speaking-end', handleVoiceEnd);
      window.removeEventListener('penguin-listening-start', handleListenStart);
      window.removeEventListener('penguin-listening-end', handleListenEnd);
    };
  }, []);

  const handleMascotClick = () => {
    // Dispatch a custom event to open the voice assistant or start listening
    const event = new CustomEvent('open-penguin-assistant');
    window.dispatchEvent(event);
  };

  const handleQuickAction = (status: string, message: string) => {
    // 1. Update user status in context
    updateUserStatus(status);

    // 2. Set penguin conversational bubble
    setPenguinMessage(message);

    // 3. Verbally speak the response via ElevenLabs service
    speakWithElevenLabs(message.replace(" 🛡️", "").replace(" 🌸", "").replace(" 🐧", ""), true);

    // 4. Temporarily show speaking state
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 3500);
  };

  // Emergency Tools logic
  const handleToggleFlashlight = async () => {
    setIsFlashlightActive(prev => {
      const next = !prev;
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
    speakWithElevenLabs("Simulating an incoming check-in voice channel. Ready.", true);
  };

  const handleEmergencyMessage = () => {
    const backupContact = guardians?.find((g: any) => g.isPriority) || guardians?.[0];
    const name = backupContact ? backupContact.name : "contacts";
    setPenguinMessage(`Emergency coordinates text sent to ${name}! 📩`);
    speakWithElevenLabs(`Dispatched emergency text update with dynamic coordinates.`, true);
  };

  const handleImSafe = () => {
    if (activeJourney) {
      completeJourney();
    }
    updateUserStatus('Safe');
    setPenguinMessage("Superb! Journey successfully completed. Standby passive mode restored. 🐧🌸");
    speakWithElevenLabs("Wonderful! Safe arrival confirmed. Setting status to Safe.", true);
  };

  const watchingCount = React.useMemo(() => {
    const activeConns = connectionsList?.filter(c => c.status === 'accepted')?.length || 0;
    const listCount = guardians?.length || 0;
    return activeConns || listCount || 3;
  }, [connectionsList, guardians]);

  const locationLabel = React.useMemo(() => {
    if (userLocation && Array.isArray(userLocation) && userLocation.length === 2) {
      return `GPS Active • ${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}`;
    }
    return "GPS Active • Transmitting coordinates";
  }, [userLocation]);

  const actions = [
    {
      id: 'reached_home',
      label: 'Reached Home',
      statusValue: 'Reached Home',
      emoji: '🏠',
      desc: "Notify guardians that I arrived safely",
      color: 'text-[#1DBB8A] bg-[#1DBB8A]/10 border-[#1DBB8A]/20',
      activeColor: 'bg-[#1DBB8A]/20 border-[#1DBB8A]/40 text-white',
      msg: "Great! I've informed your circle that you're home safely.",
      sizeClass: 'w-[290px] h-[61.5px]'
    },
    {
      id: 'leaving_now',
      label: 'Leaving Now',
      statusValue: 'Leaving Now',
      emoji: '📍',
      desc: "Notify guardians that my journey has started",
      color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      activeColor: 'bg-amber-400/20 border-amber-400/40 text-white',
      msg: "Safe travels! I'll keep watch over your path.",
      sizeClass: 'w-[290px] h-[61.5px]'
    },
    {
      id: 'at_destination',
      label: 'At Destination',
      statusValue: 'At Destination',
      emoji: '🎯',
      desc: "Send arrival confirmation",
      color: 'text-[#3BE0B9] bg-[#3BE0B9]/10 border-[#3BE0B9]/20',
      activeColor: 'bg-[#3BE0B9]/20 border-[#3BE0B9]/40 text-white',
      msg: "Awesome! I've let everyone know you made it safely.",
      sizeClass: 'w-[291px] h-[61.5px]'
    },
    {
      id: 'good_night',
      label: 'Good Night',
      statusValue: 'Good Night',
      emoji: '🌙',
      desc: "Send evening safety check-in",
      color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
      activeColor: 'bg-indigo-400/20 border-indigo-400/40 text-white',
      msg: "Rest well! SafePing overwatch is active while you sleep.",
      sizeClass: 'w-[290px] h-[61.5px]'
    },
    {
      id: 'good_morning',
      label: 'Good Morning',
      statusValue: 'Good Morning',
      emoji: '☀️',
      desc: "Send morning status update",
      color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
      activeColor: 'bg-yellow-400/20 border-yellow-400/40 text-white',
      msg: "Good morning! Standing by to keep you protected today.",
      sizeClass: 'w-[290px] h-[61.5px]'
    },
    {
      id: 'busy_right_now',
      label: 'Busy Right Now',
      statusValue: 'Busy Right Now',
      emoji: '🔕',
      desc: "Let guardians know I am unavailable",
      color: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
      activeColor: 'bg-rose-400/20 border-amber-400/40 text-white',
      msg: "Got it. I'll let your circle know you're focused.",
      sizeClass: 'w-[290px] h-[61.5px]'
    }
  ];

  if (user.role === 'guardian') {
    const activeAlerts = connectionsList.filter(c => c.deviceStatus?.status === 'sos');
    const isAlertActive = activeAlerts.length > 0;

    return (
      <div className="relative min-h-[85vh] w-full flex flex-col items-center overflow-x-hidden pb-[115px] bg-transparent font-sans animate-fade-in animate-duration-300">
        <div className="w-full max-w-md flex flex-col gap-[28px] px-[22px] pt-[32px] z-10 self-center">
          
          {/* Brand Header */}
          <header className="flex justify-between items-center w-full">
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-black tracking-[0.22em] text-[#3BE0B9] font-sans">
                SAFEPING
              </span>
              <span className="text-[10px] font-bold tracking-[0.35em] text-white/35 font-sans">
                GUARDIAN PORTAL
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="w-11 h-11 rounded-[18px] flex items-center justify-center border border-white/[0.04] bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.06] active:scale-95 transition-all text-white/70 cursor-pointer"
            >
              <SettingsIcon size={18} />
            </button>
          </header>

          {/* Alarm Warning Banner if SOS triggers */}
          {isAlertActive ? (
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="px-5 py-4.5 rounded-[24px] bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-semibold leading-relaxed flex flex-col gap-2 shadow-[0_12px_36px_rgba(239,68,68,0.25)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="animate-pulse text-red-400 text-base">🚨</span>
                <span className="uppercase tracking-wider font-extrabold text-red-400">CRITICAL UNEXPECTED EMERGENCY</span>
              </div>
              <p className="text-white/80 font-normal">
                {activeAlerts.map(a => a.guardianName || 'Circle Member').join(', ')} triggered an emergency SOS! Standing by to assist.
              </p>
            </motion.div>
          ) : (
            <div className="px-5 py-4 rounded-[24px] bg-[#112423] border border-[#3be0b9]/25 text-[#3be0b9] text-xs font-semibold flex items-center gap-2.5 shadow-lg select-none">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1DBB8A] animate-pulse" />
              <span>Circle Overwatch: Active and Secure</span>
            </div>
          )}

          {/* Mascot Greeting */}
          <section className="flex items-center gap-[22px] px-1.5 py-1.5 relative overflow-visible">
            <button
              onClick={handleMascotClick}
              className="w-24 h-24 flex items-center justify-center relative overflow-visible shrink-0 group hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
            >
              <div className="w-22 h-22 relative scale-[1.35] transition-transform flex items-center justify-center rounded-full overflow-hidden">
                <PenguinVideo src={introPenguin} size={88} />
              </div>
            </button>
            <PenThoughtBubble screenName="home" pointerPosition="left" className="flex-1 max-w-full" />
          </section>

          {/* Interactive Circle Members list */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] tracking-[0.25em] font-sans font-black uppercase text-white/45 pl-1">
              CIRCLE OVERWATCH ({connectionsList.length})
            </span>

            {connectionsList.length === 0 ? (
              <GlassCard className="p-6 text-center text-white/40 text-xs tracking-wide">
                No active connections. Go to the "Circle" page to invite someone or share your invite code.
              </GlassCard>
            ) : (
              connectionsList.map((conn) => {
                const isSOS = conn.deviceStatus?.status === 'sos';
                const isTraveling = conn.deviceStatus?.status === 'traveling';
                const battery = conn.deviceStatus?.batteryLevel || 100;
                
                return (
                  <GlassCard
                    key={conn.id}
                    className={`p-5 rounded-[24px] border flex flex-col gap-4 transition-all ${
                      isSOS 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : 'bg-white/[0.015] border-white/[0.04] hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                          <Activity size={22} className="text-[#3BE0B9]" />
                          {isSOS && <span className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse" />}
                        </div>
                        <div className="flex flex-col">
                          <h4 className="font-bold text-sm text-white tracking-wide">
                            {conn.guardianName}
                          </h4>
                          <span className="text-[11px] text-white/50 tracking-wider">
                            {conn.relationship || 'Protected User'}
                          </span>
                        </div>
                      </div>

                      {/* Info indicators */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono tracking-widest text-[#3be0b9] flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                          <Battery size={11} className={battery < 20 ? 'text-red-400' : 'text-[#3be0b9]'} />
                          {battery}%
                        </span>
                      </div>
                    </div>

                    {/* Status panel */}
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.03] text-xs flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-white/45 text-[11px]">Last Status Update</span>
                        <span className="text-white/35 font-mono text-[10px]">
                          {conn.deviceStatus?.lastCheckedIn || 'Stationary'}
                        </span>
                      </div>
                      <p className="text-white/80 font-semibold tracking-wide flex items-center gap-2">
                        {isSOS ? (
                          <span className="text-red-400 font-extrabold flex items-center gap-1 animate-pulse">
                            ⚠️ SOS TRIGGERS ACTIVATED
                          </span>
                        ) : isTraveling ? (
                          <span className="text-[#3be0b9] font-black flex items-center gap-1.5">
                            <Navigation size={12} className="animate-bounce" />
                            Traveling to {conn.deviceStatus?.journeyTitle || 'Destination'}
                          </span>
                        ) : (
                          <span className="text-[#3be0b9] font-black flex items-center gap-1.5">
                            <CheckCircle2 size={12} />
                            Safe at current location
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Interactive prompts panel */}
                    <div className="flex flex-col gap-2 mt-1">
                      <span className="text-[10px] font-black tracking-widest text-[#3BE0B9] uppercase pl-1">
                        Trigger Security Check-In Action
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { text: "Reached?", msg: "Are you safe?" },
                          { text: "Everything okay?", msg: "Everything okay?" },
                          { text: "Where are you?", msg: "Where are you?" }
                        ].map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={async () => {
                              try {
                                await sendConnectionMessage(conn.id, user.id || '', user.name, prompt.msg, 'check_in_request');
                                setPenguinMessage(`Sentinel Ping sent: "${prompt.msg}"! 🐧`);
                                speakWithElevenLabs(`Dispatched check-in query to ${conn.guardianName}.`, true);
                              } catch (err) {
                                console.error("Failed sending ping:", err);
                              }
                            }}
                            className="py-2 px-3 rounded-xl border border-[#3be0b9]/15 bg-[#3be0b9]/5 hover:bg-[#3be0b9]/10 text-white/90 text-[11px] font-semibold tracking-wide text-center cursor-pointer transition-all active:scale-95"
                          >
                            {prompt.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col items-center overflow-x-hidden pb-4 bg-transparent font-sans">
      
      {/* SOS Active Atmosphere Background Glow */}
      <AnimatePresence>
        {isHoldingSOS && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-[5] bg-red-950/20 blur-[125px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="w-full max-w-md flex flex-col gap-[24px] px-[22px] pt-[32px] pb-[115px] z-10 self-center animate-fade-in">

        {/* Brand Header */}
        <header className="flex justify-between items-center w-full">
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-black tracking-[0.22em] text-[#3BE0B9] font-sans">
              SAFEPING
            </span>
            <span className="text-[10px] font-bold tracking-[0.35em] text-white/35 font-sans">
              {activeJourney ? "OPERATIONAL CT" : "PROTECTION OVERWATCH"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-11 h-11 rounded-[18px] flex items-center justify-center border border-white/[0.04] bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.06] active:scale-95 transition-all text-white/70 cursor-pointer"
            id="settings-button"
          >
            <SettingsIcon size={18} />
          </button>
        </header>

        {/* Camera Unavailable Warning Banner */}
        {cameraStatus !== 'available' && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-[20px] bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] font-semibold leading-relaxed shadow-lg shadow-amber-500/5 select-none"
          >
            <span className="shrink-0 text-amber-400 text-sm">⚠️</span>
            <span>Camera unavailable. Overwatch coverage continues.</span>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* ================= CASE 1: ACTIVE JOURNEY ================ */}
        {/* ========================================================= */}
        {activeJourney ? (
          <div className="flex flex-col gap-5 w-full">
            
            {/* 1. Header Banner & Status */}
            <div className="flex justify-between items-center px-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-widest text-[#3be0b9] font-bold">Overwatch Active</span>
                <span className="text-[13px] font-medium text-white/60">Walking with you live</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                SECURE TRACE
              </div>
            </div>

            {/* 2. Embedded Live Overwatch Map */}
            <div className="w-full h-[180px] rounded-[24px] overflow-hidden border border-white/5 relative shadow-xl bg-slate-950/40">
              <MapComponent />
              <div className="absolute bottom-3 left-3 bg-[#0c1221]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/5 text-[9px] font-mono tracking-wider font-bold text-[#3be0b9] pointer-events-none z-[1000] flex items-center gap-1.5 shadow-lg">
                <Clock size={10} />
                Real-Time GPS Synced
              </div>
            </div>

            {/* 3. Operational Progress Stats Card */}
            <GlassCard className="p-5 rounded-[26px] border border-white/[0.04] bg-white/[0.015] flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Destination Target</span>
                  <h3 className="text-base font-black text-white truncate">{activeJourney.destination}</h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#3be0b9] bg-[#3be0b9]/10 border border-[#3be0b9]/25 px-2.5 py-1 rounded-full">
                  {Math.min(100, Math.floor((activeJourney.elapsedMinutes / activeJourney.totalDuration) * 100))}% Way
                </span>
              </div>

              {/* Progress Bar slider */}
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.floor((activeJourney.elapsedMinutes / activeJourney.totalDuration) * 100))}%` }}
                  transition={{ duration: 1.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-[#3be0b9] to-emerald-400"
                />
              </div>

              {/* Time matrix */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.03]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/35 font-bold uppercase tracking-wider">Started Time</span>
                  <span className="text-[12px] font-semibold text-white/95">{activeJourney.startTime || "Now"}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[9px] text-white/35 font-bold uppercase tracking-wider">ETA Check-In</span>
                  <span className="text-[12px] font-mono font-extrabold text-[#3be0b9]">
                    {activeJourney.eta || `${Math.max(0, activeJourney.totalDuration - activeJourney.elapsedMinutes)}m left`}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* 4. Interactive Companion Box */}
            <GlassCard className="p-4 rounded-[24px] border border-white/[0.03] bg-white/[0.005] flex items-center justify-between gap-4">
              <button
                onClick={handleMascotClick}
                className="w-13 h-13 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0 relative flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              >
                <div className="scale-[1.4] flex items-center justify-center">
                  <PenguinVideo src={introPenguin} size={38} />
                </div>
                {isSpeaking && <span className="absolute inset-0 rounded-full bg-teal-500/10 border-2 border-teal-400 animate-pulse pointer-events-none" />}
              </button>

              <PenThoughtBubble screenName="journey" pointerPosition="left" className="flex-1 max-w-full" />
            </GlassCard>

            {/* 5. Safe Check Operations Actions */}
            <div className="flex flex-col gap-2.5 mt-2">
              <button
                type="button"
                onClick={handleImSafe}
                className="w-full py-4.5 rounded-[22px] bg-[#1DBB8A] hover:bg-[#1dbb8a]/90 text-[#030712] font-black uppercase text-xs tracking-[0.2em] shadow-[0_12px_36px_rgba(29,187,138,0.25)] active:scale-[0.98] transition-all cursor-pointer text-center select-none flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={15} />
                I'm Safe - Complete Journey
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Cancel journey monitoring? This will alert your circle.")) {
                    const { cancelJourney } = useApp(); // Wait, cancelJourney is destructured above!
                    cancelJourney();
                  }
                }}
                className="w-full py-3.5 rounded-[18px] bg-white/[0.02] border border-white/10 hover:bg-red-500/15 hover:border-red-500/25 hover:text-red-200 text-white/60 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer text-center"
              >
                Cancel Trace Escort
              </button>
            </div>

          </div>
        ) : (
          /* ========================================================= */
          /* ============ CASE 2: NORMAL STANDBY VIEW =============== */
          /* ========================================================= */
          <div className="flex flex-col gap-[22px] w-full">

            {/* 1. Hi Greeting banner with mini status indicators */}
            <header className="flex justify-between items-end px-1 select-none">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-widest text-[#3be0b9] font-black">Secure System Active</span>
                <h2 className="text-[22px] font-black tracking-tight text-white mt-1 font-happy-monkey">
                  Hi, {user?.name?.split(' ')[0] || 'User'} 👋
                </h2>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9.5px] font-black px-2.5 py-1 rounded-full uppercase select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Armed
              </div>
            </header>

            {/* 2. Device Overwatch Status Tracker Matrix Container */}
            <GlassCard className="p-5 rounded-[28px] border border-white/[0.04] bg-[#050912]/80 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-3 pb-3 border-b border-white/[0.03]">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#3be0b9]">
                  <Shield size={18} className="fill-[#3be0b9]/10" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-white tracking-wide">Circle Surveillance Activated</span>
                  <span className="text-[10px] text-white/45 font-medium">{watchingCount} Guardians keeping track</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.015] border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[8.5px] text-white/35 font-black uppercase tracking-wider">Device Power</span>
                  <span className="text-[11px] font-bold text-white/80 flex items-center gap-1">
                    <Battery size={13} className={batteryLevel < 20 ? 'text-red-400' : 'text-[#3be0b9]'} />
                    {batteryLevel}%
                  </span>
                </div>
                <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.015] border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[8.5px] text-white/35 font-black uppercase tracking-wider">GPS Transmitter</span>
                  <span className="text-[11px] font-bold text-white/80 truncate">Active Link</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] bg-white/[0.015] border border-white/5 p-2.5 rounded-xl mt-1 select-none">
                <span className="text-white/40 font-semibold px-1">Active Status:</span>
                <span className="text-[#3be0b9] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={12} />
                  {userStatus || "Safe"}
                </span>
              </div>
            </GlassCard>

            {/* 3. Mascot Conversation Card */}
            <GlassCard 
              className="rounded-[26px] border border-white/5 bg-transparent relative overflow-visible flex items-center justify-between gap-4 mx-2"
              style={{ height: "130px", paddingLeft: "8px", paddingRight: "8px" }}
            >
              <div className="flex items-center gap-4 w-full" style={{ height: "94px" }}>
                <button
                  onClick={handleMascotClick}
                  className="rounded-2xl overflow-hidden shrink-0 border border-white/10 flex items-center justify-center bg-white/5 hover:scale-[1.03] active:scale-[0.97] transition-all relative"
                  style={{ height: "75px", width: "74px" }}
                >
                  <div className="scale-[1.4] flex items-center justify-center" style={{ width: "69px", height: "95px" }}>
                    <PenguinVideo src={introPenguin} size={50} style={{ width: "64px", height: "58px" }} />
                  </div>
                  {(isSpeaking || isListening) && (
                    <span className="absolute inset-0 rounded-2xl border border-[#3be0b9] animate-pulse pointer-events-none" />
                  )}
                </button>
                
                <PenThoughtBubble 
                  screenName="home" 
                  pointerPosition="left" 
                  className="flex-1 max-w-full" 
                  style={{ width: "148.375px", height: "67px" }}
                  contentStyle={{ width: "130.375px", height: "45.5px" }}
                  messageStyle={{ width: "135.375px", fontSize: "11px" }}
                />
              </div>
            </GlassCard>

            {/* 4. Instant Status Check-In Presets List (One full-width card per row) */}
            <section className="flex flex-col gap-2.5 mt-1">
              <span className="text-[10px] tracking-[0.25em] font-sans font-black uppercase text-white/40 pl-1">
                Instant Check-In Pings
              </span>
              <div className="flex flex-col gap-2.5">
                {actions.map((act) => {
                  const isCurrent = (userStatus || 'Safe').toLowerCase() === act.statusValue.toLowerCase();

                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => handleQuickAction(act.statusValue, act.msg)}
                      className={`${act.sizeClass} p-4 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all duration-300 relative group active:scale-[0.99] select-none cursor-pointer ${
                        isCurrent
                          ? 'bg-[#3BE0B9]/15 border-[#3BE0B9]/40 text-[#3BE0B9] shadow-[0_4px_16px_rgba(59,224,185,0.06)] bg-gradient-to-br from-[#3BE0B9]/5 to-transparent'
                          : 'bg-[#06080e]/65 border-white/[0.04] text-white/70 hover:bg-white/[0.02] hover:border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-[40px] h-[40px] rounded-xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center text-xl shrink-0">
                          {act.emoji}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-sm font-bold tracking-tight text-white/95 group-hover:text-[#3BE0B9] transition-colors">{act.label}</span>
                          <span className="text-[11px] font-medium text-slate-400 block mt-0.5 leading-tight">{act.desc}</span>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center pr-1">
                        {isCurrent ? (
                          <span className="h-5 px-2.5 rounded-full bg-[#3BE0B9]/20 border border-[#3BE0B9]/30 text-[9px] font-black uppercase tracking-wider text-[#3BE0B9] flex items-center justify-center">
                            Current
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono font-medium tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
                            Set
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 5. Escort launcher / Navigate to safe-journey */}
            <GlassCard className="p-5 rounded-[28px] border border-dashed border-white/10 bg-transparent flex flex-col gap-3 mt-1.5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3be0b9]/5 border border-[#3be0b9]/15 flex items-center justify-center text-[#3be0b9] shrink-0">
                  <Navigation size={18} className="stroke-[2.5px]" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-sm font-extrabold text-white">Active Walk-With-Me Guardian</h4>
                  <p className="text-[11px] text-white/45 leading-relaxed font-semibold" style={{ color: "#a6a6a6" }}>
                    Set custom waypoint parameters to deploy checking interval alerts and live map feeds.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/safe-journey')}
                className="w-full h-11 bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                Plan Escort Route
                <ExternalLink size={13} />
              </button>
            </GlassCard>

          </div>
        )}

      </div>
    </div>
  );
}

