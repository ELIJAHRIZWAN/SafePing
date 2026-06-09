import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useEmergency } from '../context/EmergencyContext';
import useLiveLocation from "../hooks/useLiveLocation";
import {
  Shield,
  Battery,
  Users,
  X,
  AlertTriangle,
  Navigation,
  CheckCircle2,
  Activity,
  History,
  Heart,
  HelpCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Volume2,
  VolumeX,
  Siren,
  Radio,
  Megaphone,
  Phone,
  Menu,
  Bell,
  MapPin,
  Compass,
  Sparkles,
  Flashlight,
  PhoneCall,
  Mail,
  Home as HomeIcon,
  ShieldAlert,
  MessageSquare,
  PhoneOff
} from 'lucide-react';

import MapComponent from './MapComponent';
import SafeModuleBoundary from './SafeModuleBoundary';
import sosPenguin from "../assets/ANIMATIONS/sos_penguin.webm";
import guardianPenguin from "../assets/ANIMATIONS/guardian_penguin.webm";
import { speakWithElevenLabs, stopSpeaking } from '../services/elevenlabsService';

export default function SOSOverlay() {
  const {
    emergencyState,
    setEmergencyState,
    guardianAlert,
    setGuardianAlert,
    isEscalated,
    setIsEscalated,
    isUserSafe,
    setIsUserSafe,
    incidentLogs,
    addIncidentLog,
    clearIncidentLogs,
    threatScore,
    setThreatScore,
    isFullyDispatched,
    setIsFullyDispatched,
    sessionStartTime,
    setSessionStartTime,
    escalationCount,
    setEscalationCount,
    deviationCount,
    setDeviationCount,
    isSilentEvidenceActive,
    isCameraEvidenceEnabled,
    isSirenActive,
    isVoiceMuted,
    sirenTone,
    setSirenTone,
    startSiren,
    stopSiren,
    setIsVoiceMuted
  } = useEmergency();
  const { location, error } = useLiveLocation();
  const {
    isEmergencyActive,
    setIsEmergencyActive,
    isWalkWithMeActive,
    setIsWalkWithMeActive,
    activeSafeHavenId,
    setActiveSafeHavenId,
    triggerEscortInstant,
    setSelectedRouteType,
    userLocation,
    safePlaces,
    batteryLevel,
    setBatteryLevel,
    guardians,
    activeCallGuardian,
    setActiveCallGuardian,
    logActivity,
    isSOSCountingDown,
    sosCountdownSeconds,
    sosStatus,
    cancelSOSCountdown
  } = useApp();

  const primaryGuardian = useMemo(() => {
    return guardians.find(g => g.isPriority) || guardians[0];
  }, [guardians]);

  const [dispatchStep, setDispatchStep] = React.useState(0);
  const [isEmergencyToolsExpanded, setIsEmergencyToolsExpanded] = React.useState(true);
  const [isFlashlightActive, setIsFlashlightActive] = React.useState(false);
  const [guidanceIndex, setGuidanceIndex] = React.useState(0);
  const [showSafetyConfirmation, setShowSafetyConfirmation] = React.useState(false);
  const [showEndSOSConfirmation, setShowEndSOSConfirmation] = React.useState(false);
  const [customGuardianObservation, setCustomGuardianObservation] = React.useState<string | null>(null);
  const [activeSignal, setActiveSignal] = React.useState<string | null>(null);

  // --- NEW WORK WORKFLOW STATES & REFS ---
  // 1. Inline Chat States and Refs (Task 1)
  const [chatHistory, setChatHistory] = React.useState<{ role: 'user' | 'assistant'; text: string }[]>(() => {
    try {
      const saved = localStorage.getItem('safeping_guardian_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [inputMessage, setInputMessage] = React.useState("");
  const [isChatProcessing, setIsChatProcessing] = React.useState(false);
  const [keywordMatchedAlert, setKeywordMatchedAlert] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const chatInputRef = React.useRef<HTMLInputElement>(null);

  // 2. Mascot Interactive & Feedback States (Task 2)
  const [isMascotAnimating, setIsMascotAnimating] = React.useState(false);
  const [mascotHintOverride, setMascotHintOverride] = React.useState<string | null>(null);

  // 3. Tactical safety tool detailed modal states (Task 3)
  const [showAlarmModal, setShowAlarmModal] = React.useState(false);
  const [showFlashlightSimulation, setShowFlashlightSimulation] = React.useState(false);
  const [showFakeCallSetup, setShowFakeCallSetup] = React.useState(false);
  const [showFakeCallSimulation, setShowFakeCallSimulation] = React.useState(false);
  const [fakeCallName, setFakeCallName] = React.useState("Security Dispatch Desk");
  const [fakeCallStatus, setFakeCallStatus] = React.useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [fakeCallDuration, setFakeCallDuration] = React.useState(0);
  const [showSMSComposer, setShowSMSComposer] = React.useState(false);
  const [smsSelectedGuardians, setSmsSelectedGuardians] = React.useState<string[]>([]);
  const [smsMessageText, setSmsMessageText] = React.useState("");

  const ringtoneTimerRef = React.useRef<any>(null);

  const nearestPlace = useMemo(() => safePlaces[0], [safePlaces]);

  // Intelligent adaptive battery preservation stages
  const isBatteryAttention = batteryLevel < 40;
  const isBatteryCritical = batteryLevel < 20;
  const isBatteryPreservation = batteryLevel < 10;

  React.useEffect(() => {
    if (!isEmergencyActive) return;
    if (isBatteryPreservation) {
      addIncidentLog("safety", "Battery Preservation Active: Core connection stabilized.");
    } else if (isBatteryCritical) {
      addIncidentLog("safety", "Battery level is low. Sound optimization active to preserve connection.");
    }
  }, [isBatteryAttention, isBatteryCritical, isBatteryPreservation, isEmergencyActive]);

  React.useEffect(() => {
    if (isEmergencyActive && nearestPlace && !activeSafeHavenId) {
      setActiveSafeHavenId(nearestPlace.id);
      setSelectedRouteType('safer');
    }
  }, [isEmergencyActive, nearestPlace, activeSafeHavenId]);

  React.useEffect(() => {
    if (!isEmergencyActive || !isFullyDispatched) {
      setDispatchStep(0);
      return;
    }
    setDispatchStep(1);
    const timer = setInterval(() => {
      setDispatchStep(prev => {
        if (prev < 5) {
          return prev + 1;
        } else {
          clearInterval(timer);
          return prev;
        }
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [isEmergencyActive, isFullyDispatched]);

  // Synchronized Voice Narrative Triggering
  React.useEffect(() => {
    if (!isEmergencyActive) return;
    if (isBatteryPreservation) return;

    if (!isFullyDispatched || dispatchStep === 0) {
      const initialMessage = "I'm staying with you. Help is being contacted.";
      if (isBatteryCritical) {
        speakWithElevenLabs("I'm staying with you. Your location is being shared.", true);
      } else {
        speakWithElevenLabs(initialMessage, true);
      }
      return;
    }

    if (isBatteryCritical) return;

    const voiceLines: Record<number, string> = {
      1: "Your guardians have been notified.",
      2: "I'm staying with you.",
      3: "Help is being contacted.",
      4: "Stay where other people can see you.",
      5: "You're not alone. Your location is being shared."
    };

    const textToSpeak = voiceLines[dispatchStep];
    if (textToSpeak) {
      speakWithElevenLabs(textToSpeak, true);
    }
  }, [dispatchStep, isEmergencyActive, isFullyDispatched, isBatteryCritical, isBatteryPreservation]);

  const guidanceMessages = useMemo(() => {
    if (mascotHintOverride) {
      return [mascotHintOverride];
    }

    const base = [
      "Your guardians have been notified.",
      "I'm staying with you.",
      "Help is being contacted.",
      "Stay where other people can see you.",
      "You're not alone. Your location is being shared."
    ];

    if (customGuardianObservation) {
      return [customGuardianObservation, ...base];
    }
    return base;
  }, [customGuardianObservation, mascotHintOverride]);

  React.useEffect(() => {
    if (!isEmergencyActive) return;
    const interval = setInterval(() => {
      setGuidanceIndex(prev => (prev + 1) % guidanceMessages.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isEmergencyActive, guidanceMessages]);

  // Keep connected call ticking timer
  React.useEffect(() => {
    let interval: any = null;
    if (showFakeCallSimulation && fakeCallStatus === 'connected') {
      interval = setInterval(() => {
        setFakeCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showFakeCallSimulation, fakeCallStatus]);

  // Clean ringtone generator on unmount
  React.useEffect(() => {
    return () => {
      if (ringtoneTimerRef.current) {
        clearInterval(ringtoneTimerRef.current);
      }
    };
  }, []);

  // Web Audio Ringtone oscillators (Task 3 Ringtone requirement)
  const startRingtoneSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playInterval = () => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(450, ctx.currentTime);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(490, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.9);
        osc2.stop(ctx.currentTime + 1.9);
      };
      
      playInterval();
      ringtoneTimerRef.current = setInterval(playInterval, 3000);
    } catch (e) {
      console.warn("Audio blocked or unsupported:", e);
    }
  };

  const stopRingtoneSound = () => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
  };

  // Chat inline helper submit call
  const handleChatSubmitInline = async (textToSend?: string) => {
    const rawMsg = textToSend || inputMessage;
    if (!rawMsg.trim() || isChatProcessing) return;

    const userQuery = rawMsg.trim();
    setInputMessage("");
    setIsChatProcessing(true);

    const updatedHistory = [...chatHistory, { role: "user" as const, text: userQuery }];
    setChatHistory(updatedHistory);
    try {
      localStorage.setItem("safeping_guardian_chat_history", JSON.stringify(updatedHistory));
    } catch {}

    // Auto-scroll Down
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    // Journey Dashboard keyword triggers (Task 4)
    const lowerQuery = userQuery.toLowerCase();
    const alertKeywords = ["scared", "unsafe", "lost", "emergency", "help"];
    const isKeywordMatched = alertKeywords.some(keyword => lowerQuery.includes(keyword));
    if (isKeywordMatched) {
      setKeywordMatchedAlert(true);
      setThreatScore(Math.min(100, Math.max(threatScore, 75)));
      speakWithElevenLabs("Crisis keyword recognized. High-alert safe assets surfaced.", true);
      addIncidentLog("safety", `Distress alert triggered by input: "${userQuery}"`);
    }

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userQuery,
          history: updatedHistory,
          userName: "Elijah",
          locationState: location || {},
          emergencyState: emergencyState,
          isEmergency: isEmergencyActive,
          isWalkWithMeActive: isWalkWithMeActive,
          batteryLevel: batteryLevel,
          threatScore: threatScore,
          localHour: new Date().getHours()
        })
      });

      if (!response.ok) {
        throw new Error("Chat server error");
      }

      const data = await response.json();
      const reply = data.reply;

      const finalHistory = [...updatedHistory, { role: "assistant" as const, text: reply }];
      setChatHistory(finalHistory);
      try {
        localStorage.setItem("safeping_guardian_chat_history", JSON.stringify(finalHistory));
      } catch {}

      speakWithElevenLabs(reply, true);
    } catch (err) {
      console.error(err);
      const fallback = "I'm right here walking with you. Breathe slowly. Let's head straight towards a safe location.";
      const finalHistory = [...updatedHistory, { role: "assistant" as const, text: fallback }];
      setChatHistory(finalHistory);
      speakWithElevenLabs(fallback, true);
    } finally {
      setIsChatProcessing(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Mascot interaction click handler (Task 2)
  const handleMascotTap = () => {
    setIsMascotAnimating(true);
    setTimeout(() => setIsMascotAnimating(false), 550);

    setMascotHintOverride("Hi! Ask me anything about your journey.");
    
    // Smooth scroll to chat box
    const element = document.getElementById('guardian-ai-companion');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }

    // Auto focus search field
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 450);

    addIncidentLog("action", "Initiated companion consultation by tapping mascot.");
  };

  const handleShareLocation = () => {
    addIncidentLog("telemetry", `Location updated.`);
    speakWithElevenLabs("Updating and sharing your location coordinates.", true);
  };

  const handleToggleFlashlight = async () => {
    const nextText = !isFlashlightActive;
    setIsFlashlightActive(nextText);
    
    // Unconditionally show Simulator Overlay (Task 3 flash simulation)
    setShowFlashlightSimulation(nextText);
    addIncidentLog("action", `Flashlight flipped: ${nextText ? "ON" : "OFF"}`);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then((stream) => {
            const track = stream.getVideoTracks()[0];
            if (track) {
              const capabilities = track.getCapabilities() as any;
              if (capabilities && capabilities.torch) {
                track.applyConstraints({
                  advanced: [{ torch: nextText } as any]
                });
              }
            }
          }).catch(e => {
            console.log("Using full brightness simulation mode instead.");
          });
      }
    } catch (e) {}
  };

  const handleQuickCall = () => {
    if (primaryGuardian) {
      addIncidentLog("action", `Calling Guardian ${primaryGuardian.name}.`);
      setActiveCallGuardian(primaryGuardian);
    } else {
      handleFakeCall();
    }
  };

  const handleFakeCall = () => {
    // Open Quick customizable call setup (Task 3 fake call parameters)
    setShowFakeCallSetup(true);
  };

  const handleEmergencyMessage = () => {
    // SMS Predefined configuration modal composer (Task 3 SMS constraints)
    const lat = location?.latitude || 41.55502;
    const lng = location?.longitude || -122.56041;
    const presetSms = `SafePing Alert: Elijah Jensen's Walk With Me is active. Tracker GPS link: https://maps.google.com/?q=${lat},${lng} (Lat:${lat.toFixed(5)}, Lng:${lng.toFixed(5)}).`;
    setSmsMessageText(presetSms);

    const matchIds = guardians.filter(g => g.isPriority).map(g => g.id);
    setSmsSelectedGuardians(matchIds.length > 0 ? matchIds : guardians.map(g => g.id));
    
    setShowSMSComposer(true);
  };

  const handleItsSafeNow = () => {
    setShowEndSOSConfirmation(true);
  };

  const handleContact911 = () => {
    addIncidentLog("action", "Initiated urgent dial-out to emergency dispatch coordinates.");
    speakWithElevenLabs("Executing immediate telephone relay to Emergency Services. Standby.", true);
    window.location.href = "tel:911";
  };

  const handleFinalStandDown = () => {
    stopSpeaking();
    setShowSafetyConfirmation(false);
    setIsEmergencyActive(false);
    setIsWalkWithMeActive(false);
    setActiveSafeHavenId(null);
    setGuardianAlert(false);
    setIsEscalated(false);
    setIsUserSafe(true);
    setEmergencyState('idle');
    setIsFullyDispatched(false);
    setSessionStartTime(null);
    setEscalationCount(0);
    setDeviationCount(0);
    clearIncidentLogs();

    logActivity({
      type: "sos",
      title: "SOS CANCELLED",
      description: "Emergency alarm de-escalated. Standard watch restored safely.",
      severity: "safe"
    });
  };

  if (isSOSCountingDown) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[3000] flex flex-col justify-between bg-[#040914] text-slate-100 p-6 select-none"
      >
        <div className="absolute inset-x-0 top-0 h-96 bg-red-950/20 blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex justify-between items-center text-[10px] uppercase tracking-widest font-mono text-white/40">
          <span>Secure Overwatch System</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Escalation Preparing</span>
          </div>
        </div>

        <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center">
          <div className="relative w-48 h-48 flex items-center justify-center rounded-full bg-red-950/20 border border-red-500/15 shadow-[0_0_50px_rgba(239,68,68,0.1)] mb-8 animate-pulse">
            <div className="absolute inset-0 rounded-full border-2 border-red-500/25 animate-ping opacity-60 pointer-events-none" />
            
            <div className="flex flex-col items-center">
              <span className="text-7xl font-sans font-black tracking-tight text-white mb-0">
                {sosCountdownSeconds}
              </span>
              <span className="text-[10px] uppercase tracking-widest font-mono text-red-400/80 mt-1">SECONDS</span>
            </div>
          </div>

          <h2 className="text-xl font-bold font-sans tracking-tight text-white">Emergency Countdown Active</h2>
          <p className="text-xs text-white/60 max-w-xs mt-2 leading-relaxed">
            SafePing is preparing to deploy your coordinates and alert <span className="font-semibold text-white">{guardians.length || 1} guardian(s).</span>
          </p>

          <div className="mt-8 w-full max-w-sm bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-left flex flex-col gap-3">
            <span className="text-[9px] uppercase tracking-widest font-mono text-white/30">PENDING PROTOCOLS:</span>
            
            <div className="flex items-center gap-2.5 text-xs text-white/70">
              <div className="w-4 h-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-mono text-[9px] font-bold">1</div>
              <span>Notify trusted circle of emergency distress.</span>
            </div>
            
            <div className="flex items-center gap-2.5 text-xs text-white/70">
              <div className="w-4 h-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-mono text-[9px] font-bold">2</div>
              <span>Share live satellite coordinates via SMS gateway.</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-white/70">
              <div className="w-4 h-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-mono text-[9px] font-bold">3</div>
              <span>Persist GPS telemetry evidence snapshots to Firestore database.</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col gap-3">
          <button
            onClick={cancelSOSCountdown}
            className="w-full py-4 rounded-2xl bg-white text-slate-950 font-bold hover:bg-slate-200 transition-all text-center flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <ShieldAlert size={16} />
            <span>CANCEL SOS ESCALATION</span>
          </button>
          <p className="text-[10px] text-center text-white/30 uppercase tracking-widest leading-none font-mono">
            Safety de-escalation is fully encrypted
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] overflow-y-auto select-none text-slate-100 min-h-screen pb-6 flex flex-col justify-between bg-[#040914]"
    >
      <div className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full px-6 pt-4 pb-6 gap-6">
        
        {/* TOP SECTION: Panic mode header */}
        <div className="flex flex-col gap-2 text-left pt-2 pb-1 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[11px] font-black uppercase text-red-500 tracking-[0.25em] flex items-center gap-1">
              🚨 EMERGENCY MODE ACTIVE
            </span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none mt-1">
            Help is on the way
          </h1>
          <p className="text-sm text-slate-300 font-medium leading-relaxed mt-1.5 font-sans">
            We are contacting your guardians and sharing your location.
          </p>
        </div>

        {/* Live system indicators array */}
        <div className="grid grid-cols-3 gap-2.5 my-1">
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 text-left select-none">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">LIVE LOCATION</span>
            <span className="text-xs font-semibold text-white truncate text-slate-200">
              {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "GPS Sharing"}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 text-left select-none">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">GUARDIANS</span>
            <span className="text-xs font-semibold text-white text-slate-200">Notified</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 text-left select-none">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">BATTERY STATUS</span>
            <span className="text-xs font-semibold text-white flex items-center gap-1 text-slate-200">
              <Battery size={13} className={batteryLevel < 20 ? "text-red-400" : "text-[#3be0b9]"} />
              {batteryLevel}%
            </span>
          </div>
        </div>

        {!showSafetyConfirmation ? (
          <>
            {/* PRIMARY ACTIONS: 3 Large touch targets */}
            <div className="flex flex-col gap-3.5 w-full">
              {/* Button A: Share Live Location */}
              <button
                onClick={handleShareLocation}
                className="w-full min-h-[64px] rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] active:scale-[0.98] transition-all flex items-center justify-between px-5 py-3 text-left cursor-pointer select-none font-sans font-bold"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white uppercase tracking-wider">Location Shared</span>
                    <span className="text-[11px] font-medium text-slate-400 mt-0.5 leading-none">Tap to send another update</span>
                  </div>
                </div>
                <span className="text-[10px] text-sky-400 uppercase font-bold tracking-wider font-mono shrink-0">Resend</span>
              </button>

              {/* Button B: Call Guardian */}
              <button
                onClick={handleQuickCall}
                className="w-full min-h-[64px] rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] active:scale-[0.98] transition-all flex items-center justify-between px-5 py-3 text-left cursor-pointer select-none font-sans font-bold"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📞</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white uppercase tracking-wider">Call Guardian</span>
                    <span className="text-[11px] font-medium text-slate-400 mt-0.5 leading-none">Direct line to primary contact</span>
                  </div>
                </div>
                <span className="text-[10px] text-teal-400 uppercase font-bold tracking-wider font-mono shrink-0">Call</span>
              </button>

              {/* Button C: Contact Emergency Services (911) */}
              <button
                onClick={handleContact911}
                className="w-full min-h-[74px] rounded-2xl bg-[#1e0a0c]/80 hover:bg-[#281013] active:scale-[0.98] transition-all flex items-center justify-between px-5 py-4 text-left cursor-pointer select-none border border-red-500/20 hover:border-red-500/35 shadow-[0_8px_32px_rgba(239,68,68,0.06)] ring-1 ring-red-500/10 font-sans font-bold"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl drop-shadow-md">🚓</span>
                  <div className="flex flex-col">
                    <span className="text-base font-black text-white tracking-wide uppercase leading-none">Contact Emergency Services</span>
                    <span className="text-xs font-semibold text-slate-300 mt-1 leading-none">Dial 911 immediately for help</span>
                  </div>
                </div>
                <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-black px-3 py-1.5 rounded-full tracking-wider font-mono shadow-sm animate-pulse shrink-0">DIAL 911</span>
              </button>
            </div>

            {/* AI COMPANION: Guardian Penguin 🐧 with rotating tip messages and active speech synthesis */}
            <div className="p-5 rounded-3xl border border-white/5 bg-[#081224]/30 flex flex-col gap-4 text-left select-none relative overflow-hidden">
              <div className="absolute inset-y-0 right-0 w-32 bg-teal-500/3 blur-3xl rounded-full" />
              
              <div className="flex items-center gap-4">
                {/* Clickable mascot circular video player */}
                <button
                  onClick={handleMascotTap}
                  className="w-16 h-16 rounded-full shrink-0 overflow-hidden border border-white/10 flex items-center justify-center bg-slate-900/60 shadow-lg relative cursor-pointer active:scale-95 transition-all"
                  title="Tap to speak guidelines"
                >
                  <video autoPlay loop muted playsInline className="w-full h-full scale-[1.35] object-contain">
                    <source src={isSirenActive ? sosPenguin : guardianPenguin} type="video/webm" />
                  </video>
                  <div className="absolute inset-0 rounded-full border border-[#3be0b9]/25 animate-pulse" />
                </button>

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase text-[#3be0b9] tracking-wider flex items-center gap-1">
                    Guardian Penguin 🐧
                  </span>
                  
                  {/* Reassuring tips sequentially rotating, speaking on click */}
                  <div className="bg-[#03060c] border border-white/5 px-3.5 py-2.5 rounded-2xl mt-1.5 shadow-sm text-xs text-white/90 font-medium font-sans italic relative">
                    <div className="absolute left-[-4px] top-[14px] w-2 h-2 bg-[#03060c] border-l border-b border-white/5 rotate-45" />
                    "{guidanceMessages[guidanceIndex] || "Everything looks good. Your guardians have been updated."}"
                  </div>
                </div>
              </div>

              {/* Tap to cycle trigger button */}
              <div className="flex justify-end items-center pr-1 mt-0.5">
                <button
                  onClick={handleMascotTap}
                  className="px-4 py-2 bg-white/[0.04] border border-white/10 hover:border-[#3be0b9] hover:text-[#3be0b9] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer font-sans"
                >
                  Next Reassurance
                </button>
              </div>
            </div>

            {/* 5. TACTILE EMERGENCY TOOLS (Larger, simple, easy-to-tap square buttons - Task 3) */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden text-left">
              <button 
                onClick={() => setIsEmergencyToolsExpanded(!isEmergencyToolsExpanded)}
                className="w-full px-4 py-3 flex justify-between items-center hover:bg-white/[0.02] bg-white/[0.01]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🧳</span>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Safety Tools</span>
                </div>
                <div className="text-slate-400">
                  {isEmergencyToolsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              
              {isEmergencyToolsExpanded && (
                <div className="grid grid-cols-5 gap-2 p-3 bg-white/[0.01] border-t border-white/[0.04]">
                  {/* Alarm */}
                  <button 
                    onClick={() => {
                      if (isSirenActive) {
                        stopSiren();
                        setShowAlarmModal(false);
                      } else {
                        setShowAlarmModal(true);
                        startSiren('classic');
                        if (navigator.vibrate) {
                          navigator.vibrate([500, 250, 500, 250, 500]);
                        }
                      }
                    }}
                    className={`flex flex-col items-center justify-center h-16 rounded-xl transition-all gap-1.5 ${isSirenActive ? "bg-red-500 text-white animate-pulse" : "bg-white/[0.03] text-rose-400 hover:bg-white/[0.06] border border-white/[0.04]"}`}
                  >
                    <Siren size={16} />
                    <span className="text-[9px] font-semibold tracking-wide">Alarm</span>
                  </button>

                  {/* Flashlight */}
                  <button 
                    onClick={handleToggleFlashlight}
                    className={`flex flex-col items-center justify-center h-16 rounded-xl transition-all gap-1.5 ${isFlashlightActive ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-white/[0.03] text-amber-400 hover:bg-white/[0.06] border border-white/[0.04]"}`}
                  >
                    <Flashlight size={16} />
                    <span className="text-[9px] font-semibold tracking-wide">Light</span>
                  </button>

                  {/* Quick Call */}
                  <button 
                    onClick={handleQuickCall}
                    className="flex flex-col items-center justify-center h-16 rounded-xl bg-white/[0.03] text-teal-400 hover:bg-white/[0.06] border border-white/[0.04] transition-all gap-1.5"
                  >
                    <PhoneCall size={16} />
                    <span className="text-[9px] font-semibold tracking-wide">Call</span>
                  </button>

                  {/* Fake Call */}
                  <button 
                    onClick={handleFakeCall}
                    className={`flex flex-col items-center justify-center h-16 rounded-xl transition-all gap-1.5 ${showFakeCallSimulation ? "bg-indigo-600 text-white animate-pulse" : "bg-white/[0.03] text-indigo-400 hover:bg-white/[0.06] border border-white/[0.04]"}`}
                  >
                    <MessageSquare size={16} />
                    <span className="text-[9px] font-semibold tracking-wide">Fake Call</span>
                  </button>

                  {/* SMS */}
                  <button 
                    onClick={handleEmergencyMessage}
                    className={`flex flex-col items-center justify-center h-16 rounded-xl transition-all gap-1.5 ${showSMSComposer ? "bg-orange-600 text-white" : "bg-white/[0.03] text-orange-400 hover:bg-white/[0.06] border border-white/[0.04]"}`}
                  >
                    <Mail size={16} />
                    <span className="text-[9px] font-semibold tracking-wide">S M S</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reassuring Big Primary CTA: I'm Safe Now */}
            <button 
              onClick={handleItsSafeNow} 
              className="w-full py-4.5 rounded-[22px] bg-[#1DBB8A] hover:bg-[#1dbb8a]/90 text-navy-dark font-black uppercase text-xs tracking-[0.25em] shadow-[0_12px_44px_rgba(29,187,138,0.25)] active:scale-[0.98] transition-all cursor-pointer text-center select-none"
            >
              I Am Safe Now
            </button>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="flex flex-col items-center justify-center gap-6 text-center py-6 w-full"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
              <CheckCircle2 size={28} />
            </div>
            
            <div className="space-y-1.5">
              <span className="text-emerald-400 font-bold tracking-widest text-[10px] uppercase">Session Ended</span>
              <h2 className="text-white text-xl font-bold tracking-tight leading-none animate-fadeIn">You are safely home</h2>
              <p className="text-xs text-slate-400">Your guardians have been notified that you are safe.</p>
            </div>
            
            {/* Resolution Statement */}
            <div className="w-full bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 text-left space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.04] pb-2.5">
                <Activity size={14} className="text-[#3be0b9]" />
                <span className="text-white font-bold uppercase text-[10px] tracking-wider">Journey summary</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Elapsed Time</span>
                  <span className="text-white font-bold text-sm tracking-tight mt-1 block">
                    {(() => {
                      if (!sessionStartTime) return "04m 12s";
                      const diffMs = Date.now() - sessionStartTime;
                      const minutes = Math.floor(diffMs / 60000);
                      const seconds = Math.floor((diffMs % 60000) / 1000);
                      return `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
                    })()}
                  </span>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Status Code</span>
                  <span className="text-[#3be0b9] font-bold text-sm tracking-tight mt-1 block">VERIFIED SAFE</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleFinalStandDown} 
              className="w-full py-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs tracking-wider text-center transition-all active:scale-95 cursor-pointer"
            >
              Exit walk mode
            </button>
          </motion.div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ==================== MODAL OVERLAYS ===================== */}
      {/* ========================================================= */}

      {/* 1. EMERGENCY HAZARD ALARM MODAL OVERLAY */}
      <AnimatePresence>
        {showAlarmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[4000] bg-rose-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center"
          >
            <div className="w-24 h-24 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-500 animate-pulse mb-6">
              <Megaphone size={48} className="animate-bounce" />
            </div>
            
            <h2 className="text-3xl font-black tracking-tight mb-2 text-rose-300">EMERGENCY ALARM ACTIVE</h2>
            <p className="text-sm text-slate-300 max-w-xs mb-8">
              A high-frequency alert horn is broadcasting at maximum volume to recruit local assistance and deter threats.
            </p>

            <button
              onClick={() => {
                stopSiren();
                setShowAlarmModal(false);
              }}
              className="px-10 py-4 rounded-full bg-white text-rose-950 font-black tracking-wider text-xs shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              STOP EMERGENCY ALARM
            </button>
            <div className="absolute bottom-6 text-[10px] text-slate-500 tracking-wide">
              SafePing Emergency Override System
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. FLASHLIGHT AMP SIMULATOR OVERLAY */}
      <AnimatePresence>
        {showFlashlightSimulation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsFlashlightActive(false);
              setShowFlashlightSimulation(false);
            }}
            className="fixed inset-0 z-[4000] bg-white flex flex-col items-center justify-center p-6 text-stone-900 text-center cursor-pointer"
          >
            <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 shadow-2xl mb-6">
              <Flashlight size={48} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider mb-2">FLASHLIGHT SIMULATOR ACTIVE</h2>
            <p className="text-xs text-stone-600 max-w-xs leading-relaxed">
              Your device screen is amplified to full white luminosity helper level. Tap anywhere on the screen to deactivate.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. FAKE CALL CONFIGURATION SETUP */}
      <AnimatePresence>
        {showFakeCallSetup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[2500] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 text-white"
          >
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4">
              <div className="flex justify-between items-center border-b border-white/[0.04] pb-3">
                <h3 className="text-sm font-bold tracking-tight text-white uppercase">Setup Simulated Call</h3>
                <button onClick={() => setShowFakeCallSetup(false)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Caller Name</label>
                <input
                  type="text"
                  value={fakeCallName}
                  onChange={(e) => setFakeCallName(e.target.value)}
                  placeholder="e.g. Dad, Sheriff, Sarah"
                  className="w-full bg-white/[0.03] border border-white/5 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  setShowFakeCallSetup(false);
                  setShowFakeCallSimulation(true);
                  setFakeCallStatus('ringing');
                  setFakeCallDuration(0);
                  startRingtoneSound();
                  addIncidentLog("action", `Simulated incoming call from: ${fakeCallName}`);
                }}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
              >
                Trigger Incoming Ringing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. FULL-SCREEN INCOMING / CONNECTED CALL SCREEN SIMULATOR */}
      <AnimatePresence>
        {showFakeCallSimulation && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[4000] bg-stone-950 text-white flex flex-col justify-between py-16 px-6 select-none"
          >
            {/* Caller Header */}
            <div className="flex flex-col items-center justify-center pt-8 text-center space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-teal-400">Simulated Call</span>
              <h2 className="text-3xl font-black tracking-tight">{fakeCallName}</h2>
              <p className="text-xs text-slate-400 font-mono tracking-wider font-semibold">
                {fakeCallStatus === 'ringing' ? 'INCOMING CALL...' : `CONNECTED • ${Math.floor(fakeCallDuration / 60).toString().padStart(2, '0')}:${(fakeCallDuration % 60).toString().padStart(2, '0')}`}
              </p>
            </div>

            {/* Mascot Video Frame */}
            <div className="flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border border-white/10 bg-slate-900/60 shadow-xl flex items-center justify-center p-1 relative overflow-hidden">
                <video autoPlay loop muted playsInline className="w-full h-full object-contain">
                  <source src={guardianPenguin} type="video/webm" />
                </video>
              </div>
            </div>

            {/* Dial actions */}
            <div className="w-full max-w-xs mx-auto flex flex-col gap-6 items-center">
              {fakeCallStatus === 'ringing' ? (
                /* Ringing Actions: Two sliding columns */
                <div className="flex w-full items-center justify-around gap-12">
                  {/* Decline */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => {
                        stopRingtoneSound();
                        setShowFakeCallSimulation(false);
                      }}
                      className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer"
                    >
                      <PhoneOff size={24} />
                    </button>
                    <span className="text-xs text-slate-400 font-bold">Decline</span>
                  </div>

                  {/* Accept */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => {
                        stopRingtoneSound();
                        setFakeCallStatus('connected');
                        speakWithElevenLabs(`Hello Elijah, I am checking in. Please stay on the line and act natural. What is your status?`, true);
                      }}
                      className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg active:scale-95 animate-pulse cursor-pointer"
                    >
                      <Phone size={24} className="fill-current" />
                    </button>
                    <span className="text-xs text-slate-400 font-bold">Accept</span>
                  </div>
                </div>
              ) : (
                /* Connected Actions */
                <div className="flex flex-col gap-6 items-center w-full">
                  <div className="grid grid-cols-3 gap-6 text-slate-300 py-3 w-full border-t border-b border-white/[0.04]">
                    <div className="flex flex-col items-center gap-1 cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.05] flex items-center justify-center">
                        <span className="text-xs">🎤</span>
                      </div>
                      <span className="text-[9px] font-bold">Mute</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.05] flex items-center justify-center">
                        <span className="text-xs">🔢</span>
                      </div>
                      <span className="text-[9px] font-bold">Keypad</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.05] flex items-center justify-center">
                        <span className="text-xs">🔊</span>
                      </div>
                      <span className="text-[9px] font-bold">Speaker</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowFakeCallSimulation(false)}
                    className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg active:scale-95 cursor-pointer"
                  >
                    <PhoneOff size={24} />
                  </button>
                  <span className="text-xs text-slate-400 font-bold">End Call</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. SMS DISPATCH SELECTION & COMPOSE MODAL */}
      <AnimatePresence>
        {showSMSComposer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[2500] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-white text-left"
          >
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-white/[0.04] pb-3">
                <h3 className="text-xs font-bold tracking-tight uppercase">Quick SMS Dispatch</h3>
                <button onClick={() => setShowSMSComposer(false)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipients (Guardians)</label>
                <div className="max-h-24 overflow-y-auto flex flex-col gap-1.5 border border-white/5 bg-white/[0.02] p-2 rounded-xl">
                  {guardians.map(g => (
                    <label key={g.id} className="flex items-center justify-between text-xs cursor-pointer hover:bg-white/[0.02] p-1.5 rounded-lg select-none">
                      <span className="font-semibold text-slate-200">{g.name} ({g.relationship})</span>
                      <input
                        type="checkbox"
                        checked={smsSelectedGuardians.includes(g.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSmsSelectedGuardians(prev => [...prev, g.id]);
                          } else {
                            setSmsSelectedGuardians(prev => prev.filter(id => id !== g.id));
                          }
                        }}
                        className="accent-teal-500 rounded scale-110"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Message editor */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Predefined Message (includes GPS)</label>
                <textarea
                  value={smsMessageText}
                  onChange={(e) => setSmsMessageText(e.target.value)}
                  rows={4}
                  className="w-full bg-white/[0.03] border border-white/5 focus:border-teal-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={() => {
                  const names = smsSelectedGuardians
                    .map(id => guardians.find(g => g.id === id)?.name)
                    .filter(Boolean)
                    .join(", ");
                  
                  addIncidentLog("action", `Dispatched SMS to: [${names || 'All Priority'}]. Content: "${smsMessageText}"`);
                  logActivity({
                    type: "guardian",
                    title: "GUARDIANS CONTACTED",
                    description: `Dispatched secure overwatch SMS alerts to priority contacts: ${names || 'All Priority'}.`,
                    severity: "warning"
                  });
                  speakWithElevenLabs(`Tracking link SMS alert dispatched to your circle.`, true);
                  setShowSMSComposer(false);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-black text-xs font-black uppercase tracking-wider active:scale-95 transition-all text-center cursor-pointer"
              >
                Send SMS Alert
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. END EMERGENCY MODE CONFIRMATION SHEET */}
      <AnimatePresence>
        {showEndSOSConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] bg-slate-950/80 backdrop-blur-sm flex items-end justify-center px-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-sm bg-[#081224] border border-white/10 rounded-t-3xl p-6 pb-10 space-y-6 text-left select-none shadow-[0_-8px_32px_rgba(0,0,0,0.5)]"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">End Emergency Mode?</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  We'll notify your guardians that you're safe and stop emergency monitoring.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowEndSOSConfirmation(false);
                    speakWithElevenLabs("Safety confirmed. Standard watch restored.", true);
                    setShowSafetyConfirmation(true);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-[#1DBB8A] hover:bg-[#1dbb8a]/90 text-slate-950 font-black uppercase text-xs tracking-wider transition-all cursor-pointer text-center select-none"
                >
                  Yes, I'm Safe
                </button>
                <button
                  onClick={() => setShowEndSOSConfirmation(false)}
                  className="w-full py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-white font-bold text-xs tracking-wider transition-all cursor-pointer text-center select-none"
                >
                  Stay in Emergency Mode
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
