import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Info,
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  Check,
  ChevronDown,
  Heart,
  Shield,
  Zap,
  Sunset,
  Bell,
  Eye,
  Activity,
  Compass,
  AlertTriangle,
  Radio,
  UserCheck
} from 'lucide-react';

import GlassCard from '../components/GlassCard';
import { useApp } from '../context/AppContext';
import { speakWithBrowserSpeech, stopSpeaking } from '../services/elevenlabsService';
import listenerPenguin from "../assets/ANIMATIONS/listener_penguin.webm";
import speakingPenguin from "../assets/ANIMATIONS/speaking penguin.webm";

interface VoicePreset {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  pitch: number;
  rate: number;
  pacingLabel: string;
  pitchLabel: string;
  toneLabel: string;
  responsivenessLabel: string;
  themeColor: string; // Tailwind classes
  accentGlow: string; // Shadow / aura colors
  borderTheme: string;
  mascotMode: 'calm' | 'talk' | 'protect' | 'quiet';
  sampleText: string;
}

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'calm_companion',
    name: 'Calm Companion 🌙',
    subtitle: 'Gentle, slow, reassuring',
    description: 'A comforting whisper designed to ground you with soft, unhurried check-ins.',
    icon: '🌙',
    pitch: 1.10,
    rate: 0.75,
    pacingLabel: 'Gentle & Tender',
    pitchLabel: 'Warm & Low',
    toneLabel: 'Deep Reassurance',
    responsivenessLabel: 'Moderate',
    themeColor: 'from-indigo-500/15 via-purple-500/5 to-transparent',
    accentGlow: 'shadow-[0_0_30px_rgba(139,92,246,0.18)] text-purple-400',
    borderTheme: 'border-purple-500/30 hover:border-purple-400/50',
    mascotMode: 'quiet',
    sampleText: "I'm right here beside you. Take a deep breath. We will walk together safely."
  },
  {
    id: 'guardian_pen',
    name: 'Guardian Pen 🐧',
    subtitle: 'Warm, balanced, comforting',
    description: 'Our standard balanced protector. Combines crisp pronunciation with comforting presence.',
    icon: '🐧',
    pitch: 1.15,
    rate: 0.88,
    pacingLabel: 'Balanced & Cozy',
    pitchLabel: 'Comforting Anchor',
    toneLabel: 'Balanced Overwatch',
    responsivenessLabel: 'Immediate',
    themeColor: 'from-emerald-500/15 via-teal-500/5 to-transparent',
    accentGlow: 'shadow-[0_0_30px_rgba(16,185,129,0.18)] text-emerald-400',
    borderTheme: 'border-emerald-500/30 hover:border-emerald-400/50',
    mascotMode: 'calm',
    sampleText: "Hey there! I'm Pen, your personal safety anchor. Let's get you home safely tonight."
  },
  {
    id: 'alert_guardian',
    name: 'Alert Guardian 🚨',
    subtitle: 'Bright, vigilant, immediate',
    description: 'Heightened voice energy designed for rapid responses, clear directions, and swift pace.',
    icon: '🚨',
    pitch: 1.25,
    rate: 1.05,
    pacingLabel: 'Rapid & Alert',
    pitchLabel: 'Bright & Vigilant',
    toneLabel: 'Strategic Alert Defenses',
    responsivenessLabel: 'Instantaneous',
    themeColor: 'from-rose-500/15 via-amber-500/5 to-transparent',
    accentGlow: 'shadow-[0_0_30px_rgba(244,63,94,0.22)] text-rose-400',
    borderTheme: 'border-rose-500/30 hover:border-rose-400/50',
    mascotMode: 'protect',
    sampleText: "Active overwatch loaded. My sensors are awake and scanning every path ahead. We are ready."
  },
  {
    id: 'friendly_buddy',
    name: 'Friendly Buddy ✨',
    subtitle: 'Cheerful, lively, chatty',
    description: 'High voice energy and responsive rhythm to keep you light-hearted and engaged.',
    icon: '✨',
    pitch: 1.22,
    rate: 0.95,
    pacingLabel: 'Sprightly & Warm',
    pitchLabel: 'Light & Vivid',
    toneLabel: 'Lighthearted Companionship',
    responsivenessLabel: 'Highly Social',
    themeColor: 'from-cyan-500/15 via-sky-500/5 to-transparent',
    accentGlow: 'shadow-[0_0_30px_rgba(6,182,212,0.18)] text-cyan-400',
    borderTheme: 'border-cyan-500/30 hover:border-cyan-400/50',
    mascotMode: 'talk',
    sampleText: "I'm so glad we're walking! Tell me about your evening. I'm keeping a super close eye on us!"
  },
  {
    id: 'silent_watch',
    name: 'Silent Watch 🛡',
    subtitle: 'Discreet, quiet, sentinel',
    description: 'Does not speak aloud unless you speak your private safe phrase or tap SOS trigger markers.',
    icon: '🛡',
    pitch: 1.00,
    rate: 0.90,
    pacingLabel: 'Absolute Silence',
    pitchLabel: 'Muted Sentinel',
    toneLabel: 'Silent Stealth Focus',
    responsivenessLabel: 'Trigger-Only',
    themeColor: 'from-slate-500/15 via-slate-700/5 to-transparent',
    accentGlow: 'shadow-[0_0_30px_rgba(148,163,184,0.15)] text-slate-400',
    borderTheme: 'border-slate-500/30 hover:border-slate-400/50',
    mascotMode: 'quiet',
    sampleText: "Initiating quiet overwatch standby. I am watching silently."
  }
];

interface SimStep {
  label: string;
  description: string;
  status: 'pending' | 'active' | 'success';
}

export default function VoiceTriggerView() {
  const {
    isVoiceTriggerActive,
    setIsVoiceTriggerActive,
    triggerPhrase,
    setTriggerPhrase,
    penguinMessage,
    isDarkMode,
    setPenguinMessage
  } = useApp();

  const [isListening, setIsListening] = useState(false);
  const [customPhraseInput, setCustomPhraseInput] = useState('');
  
  // App States for Browser Voice Tuner
  const [pitch, setPitch] = useState<number>(1.15);
  const [rate, setRate] = useState<number>(0.88);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activePreset, setActivePreset] = useState<string>('guardian_pen');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTestSpeaking, setIsTestSpeaking] = useState<boolean>(false);

  // Presence Level state
  const [presenceLevel, setPresenceLevel] = useState(() => {
    try {
      return localStorage.getItem('safeping_companion_presence_level') || 'balanced';
    } catch {
      return 'balanced';
    }
  });

  // Context Awareness Toggles
  const [nightWalk, setNightWalk] = useState(() => {
    try {
      return localStorage.getItem('safeping_night_walk') === 'true';
    } catch {
      return false;
    }
  });
  const [rapidMovement, setRapidMovement] = useState(() => {
    try {
      return localStorage.getItem('safeping_rapid_move') === 'true';
    } catch {
      return false;
    }
  });
  const [silenceMonitoring, setSilenceMonitoring] = useState(() => {
    try {
      return localStorage.getItem('safeping_silence_monitor') === 'true';
    } catch {
      return false;
    }
  });
  const [triggerEscalation, setTriggerEscalation] = useState(() => {
    try {
      return localStorage.getItem('safeping_trigger_escalation') === 'true';
    } catch {
      return false;
    }
  });

  // Emergency Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStepIdx, setSimStepIdx] = useState(0);
  const [simulationSteps, setSimulationSteps] = useState<SimStep[]>([]);
  const simTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync states from localStorage on mount
  useEffect(() => {
    try {
      const savedPct = localStorage.getItem("safeping_browser_voice_pitch");
      const savedRt = localStorage.getItem("safeping_browser_voice_rate");
      const savedVc = localStorage.getItem("safeping_browser_voice_name");
      const savedPr = localStorage.getItem("safeping_browser_voice_preset");

      if (savedPct) setPitch(parseFloat(savedPct));
      if (savedRt) setRate(parseFloat(savedRt));
      if (savedVc) setSelectedVoiceName(savedVc);
      if (savedPr) setActivePreset(savedPr);
    } catch (e) {
      console.warn("[VoiceTrigger] Failed to sync localStorage metadata:", e);
    }
  }, []);

  // Update states to localStorage
  const updatePitch = (val: number) => {
    setPitch(val);
    try {
      localStorage.setItem("safeping_browser_voice_pitch", val.toString());
    } catch (e) {}
    setActivePreset('custom');
  };

  const updateRate = (val: number) => {
    setRate(val);
    try {
      localStorage.setItem("safeping_browser_voice_rate", val.toString());
    } catch (e) {}
    setActivePreset('custom');
  };

  const updateVoiceName = (val: string) => {
    setSelectedVoiceName(val);
    try {
      localStorage.setItem("safeping_browser_voice_name", val);
    } catch (e) {}
    setActivePreset('custom');
  };

  const updatePresenceLevel = (level: string) => {
    setPresenceLevel(level);
    try {
      localStorage.setItem('safeping_companion_presence_level', level);
    } catch (e) {}
    
    // Announce setting warmly
    let msg = "";
    if (level === 'quiet') msg = "Presence minimized. I will keep watch from the shadows.";
    if (level === 'balanced') msg = "Balanced presence enabled. Ready to support when needed.";
    if (level === 'constant') msg = "Active escort armed. I will speak frequently to guide you home.";
    
    setPenguinMessage(msg);
    speakWithBrowserSpeech(msg, true);
  };

  // Context Toggles
  const handleToggleNightWalk = () => {
    const val = !nightWalk;
    setNightWalk(val);
    try {
      localStorage.setItem('safeping_night_walk', String(val));
    } catch (e) {}
  };

  const handleToggleRapidMove = () => {
    const val = !rapidMovement;
    setRapidMovement(val);
    try {
      localStorage.setItem('safeping_rapid_move', String(val));
    } catch (e) {}
  };

  const handleToggleSilence = () => {
    const val = !silenceMonitoring;
    setSilenceMonitoring(val);
    try {
      localStorage.setItem('safeping_silence_monitor', String(val));
    } catch (e) {}
  };

  const handleToggleEscalation = () => {
    const val = !triggerEscalation;
    setTriggerEscalation(val);
    try {
      localStorage.setItem('safeping_trigger_escalation', String(val));
    } catch (e) {}
  };

  // Load browser voices safely
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis) {
        const synth = window.speechSynthesis;
        const loadVoices = () => {
          try {
            const voices = synth.getVoices() || [];
            const maleKeywords = ["male", "david", "mark", "george", "ravi", "richard", "sean", "james", "stefan", "pavel", "sam", "josh", "adam", "patrick", "harry", "callum", "daniel", "charles", "thomas"];
            const engFemaleVoices = voices.filter(v => {
              if (!v || !v.lang || !v.name) return false;
              const isEn = v.lang.toLowerCase().startsWith("en");
              const nameLower = v.name.toLowerCase();
              const hasMaleKeyword = maleKeywords.some(kw => nameLower.includes(kw));
              return isEn && !hasMaleKeyword;
            });

            const engVoicesAll = voices.filter(v => v && v.lang && v.lang.toLowerCase().startsWith("en"));
            const sorted = [...engFemaleVoices, ...engVoicesAll];
            const unique = sorted.filter((v, idx, self) => v && self.findIndex(t => t && t.name === v.name) === idx);
            setAvailableVoices(unique);
          } catch (e) {
            console.warn("Error loading voices internally in voice trigger view:", e);
          }
        };

        loadVoices();
        synth.onvoiceschanged = loadVoices;
      }
    } catch (err) {
      console.warn("speechSynthesis access was blocked or failed in voice trigger view:", err);
    }
  }, []);

  // Update when listening changes (silently except when simulation overrides)
  useEffect(() => {
    if (!isSimulating) {
      if (isListening) {
        setPenguinMessage('Listening closely. Just say your private safe phrase to sync protection. 🐧');
      } else {
        setPenguinMessage('Ready. Select your companion mode above to walk safely.');
      }
    }
  }, [isListening, isSimulating, setPenguinMessage]);

  // Save customized safe phrase
  const handleSavePhrase = (newPhrase: string) => {
    if (!newPhrase.trim()) return;
    const trimmed = newPhrase.trim();
    setTriggerPhrase(trimmed);
    
    const introductionSpeech = `Private phrase updated. If you can't speak openly, just say: "${trimmed}". I will alert your guardians immediately.`;
    setPenguinMessage(introductionSpeech);
    speakWithBrowserSpeech(introductionSpeech, true);
    setCustomPhraseInput('');
  };

  // Handle preset selection
  const handlePresetSelect = (preset: VoicePreset) => {
    setActivePreset(preset.id);
    setPitch(preset.pitch);
    setRate(preset.rate);

    try {
      localStorage.setItem("safeping_browser_voice_pitch", preset.pitch.toString());
      localStorage.setItem("safeping_browser_voice_rate", preset.rate.toString());
      localStorage.setItem("safeping_browser_voice_preset", preset.id);
    } catch (e) {}

    // Prompt change speaking sample
    setPenguinMessage(`Companion modified to ${preset.name}.`);
    speakWithBrowserSpeech(preset.sampleText, true);
  };

  // Humanize Slider descriptors
  const getPitchLabel = (v: number) => {
    if (v < 0.85) return 'Gentle Grounded';
    if (v < 1.05) return 'Warm Deep Anchor';
    if (v < 1.24) return 'Calm Comforting';
    if (v < 1.45) return 'Bright Spark';
    return 'Hyper Sparkle';
  };

  const getRateLabel = (v: number) => {
    if (v < 0.70) return 'Tender Whisper (Slow)';
    if (v < 0.82) return 'Calming Restive';
    if (v < 0.98) return 'Fluid Conversation';
    if (v < 1.15) return 'Attentive Alert';
    return 'Vigilant Safe Command';
  };

  // Test speaking customized samplephrase
  const handleTestSpeech = async () => {
    if (isTestSpeaking) {
      stopSpeaking();
      setIsTestSpeaking(false);
      return;
    }

    setIsTestSpeaking(true);
    try {
      const activeObj = VOICE_PRESETS.find(p => p.id === activePreset);
      const textToSpeak = activeObj ? activeObj.sampleText : "Your customized companion is online and fully protective.";
      await speakWithBrowserSpeech(textToSpeak, true);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setIsTestSpeaking(false);
      }, 5500);
    }
  };

  // EMERGENCY SIMULATION CONTROLLERS
  const startEmergencySimulation = () => {
    if (isSimulating) {
      stopEmergencySimulation();
      return;
    }

    stopSpeaking();
    setIsListening(false);
    setIsTestSpeaking(false);
    setIsSimulating(true);
    setSimStepIdx(0);

    const stepsList: SimStep[] = [
      {
        label: "Vigilance Acoustic Guard",
        description: `Running high-efficiency continuous microphone scanning for: "${triggerPhrase}"`,
        status: 'active'
      },
      {
        label: "Keyword Detection registered",
        description: `Private safe phrase accurately detected on dry device. Locking location coords...`,
        status: 'pending'
      },
      {
        label: "Tactical Voice Escort Triggered",
        description: `Synthesizing immediate soothing verbal confirmation on this speaker...`,
        status: 'pending'
      },
      {
        label: "Guardian Overwatch Dispatched",
        description: `Sending encrypted coordinate packets and active route tokens to live networks...`,
        status: 'pending'
      },
      {
        label: "Protection Secured Successfully",
        description: `Simulation completed. Live GPS sync corridor armed. Safe zone guidelines activated.`,
        status: 'pending'
      }
    ];

    setSimulationSteps(stepsList);
    setPenguinMessage("Simulation loaded. Acoustic trigger scanning initiated.");

    runSimulationStage(0, stepsList);
  };

  const runSimulationStage = (idx: number, currentList: SimStep[]) => {
    setSimStepIdx(idx);
    
    // Update statuses
    const updated = currentList.map((st, i) => {
      if (i < idx) return { ...st, status: 'success' as const };
      if (i === idx) return { ...st, status: 'active' as const };
      return { ...st, status: 'pending' as const };
    });
    setSimulationSteps(updated);

    if (idx === 0) {
      setPenguinMessage("Simulation initiated. Listening for safe path phrase...");
      simTimeoutRef.current = setTimeout(() => runSimulationStage(1, updated), 3000);
    } else if (idx === 1) {
      setPenguinMessage(`⚠️ SAFE PHRASE RECOGNIZED: "${triggerPhrase}"`);
      simTimeoutRef.current = setTimeout(() => runSimulationStage(2, updated), 2200);
    } else if (idx === 2) {
      const speechNode = `I hear you clearly. Keep moving. I am setting a safe corridor and alerting your guardians right this second.`;
      setPenguinMessage(`💬 Voice response speaker active: "${speechNode}"`);
      
      // Physically speaks simulated trigger response
      setIsTestSpeaking(true);
      speakWithBrowserSpeech(speechNode, true).then(() => {
        setIsTestSpeaking(false);
      });

      simTimeoutRef.current = setTimeout(() => runSimulationStage(3, updated), 5000);
    } else if (idx === 3) {
      setPenguinMessage("📡 Sending live telemetry packets to connected guardians securely...");
      simTimeoutRef.current = setTimeout(() => runSimulationStage(4, updated), 2500);
    } else if (idx === 4) {
      setPenguinMessage("🛡️ System successfully armed! Secure route guidelines active. Real-time protection test locked.");
      const finalMsg = "Simulation secure. You're ready to walk safely.";
      speakWithBrowserSpeech(finalMsg, true);
    }
  };

  const stopEmergencySimulation = () => {
    if (simTimeoutRef.current) {
      clearTimeout(simTimeoutRef.current);
    }
    setIsSimulating(false);
    setSimStepIdx(0);
    stopSpeaking();
    setIsTestSpeaking(false);
    setPenguinMessage("Simulation suspended. Returned to active standby tracker feed.");
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
    };
  }, []);

  const textColor = isDarkMode ? 'text-white' : 'text-navy-dark';
  const subTextColor = isDarkMode ? 'text-white/40' : 'text-navy-dark/40';
  const activePresetObj = VOICE_PRESETS.find(p => p.id === activePreset) || VOICE_PRESETS[1];

  return (
    <div className="flex flex-col gap-2.5 py-2.5 sm:py-3.5 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-all">
      {/* HEADER COZY DESIGN */}
      <header className="w-full flex justify-between items-center bg-slate-900/10 border-b border-white/5 pb-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] font-black text-[#3BE0B9] px-2 py-0.5 rounded bg-[#3BE0B9]/15 border border-[#3BE0B9]/20 animate-pulse">
              Companion Overwatch
            </span>
            <span className="text-[10px] text-white/50">• Secure Walk Escort v2</span>
          </div>
          <h1 className={`text-xl sm:text-2.5xl md:text-3.5xl font-display font-black tracking-tighter uppercase ${textColor}`}>
            Guardian Companion Setup
          </h1>
          <p className="text-xs text-white/40 max-w-xl">
            Choose how your Guardian Companion speaks, watches, and protects you. No more complex tech jargon—just choose a mode and let us escort you.
          </p>
        </div>

        {/* Small live heartbeat signal */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/40 border border-[#3BE0B9]/15">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3BE0B9] animate-ping" />
          <span className="text-[10px] font-mono font-bold text-cyan-400">ACOUSTIC CORE ACTIVE</span>
        </div>
      </header>

      {/* TWO COLUMN COMPACT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3.5 items-start w-full leading-relaxed">
        
        {/* LEFT COLUMN: ACTIVE INTERACTIVE LIVE PENGUIN ASSISTANT */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          
          <GlassCard className={`p-3 sm:p-4 flex flex-col items-center gap-3 border rounded-[22px] bg-gradient-to-b ${activePresetObj.themeColor} transition-all duration-700 relative overflow-hidden ${activePresetObj.accentGlow.split(' ')[0]}`}>
            
            {/* Visual background atmospheric drifting glow depending on personality */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-r from-transparent via-[#3BE0B9]/10 to-transparent rounded-full blur-[60px] pointer-events-none" />
            
            <div className="flex justify-between items-center w-full z-10">
              <span className="text-[9px] uppercase tracking-[0.3em] font-black text-cyan-200">
                Companion Feed
              </span>
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/60">
                <Compass size={10} className="text-[#3BE0B9]" />
                <span>{activePresetObj.name.split(' ')[0]} Active</span>
              </div>
            </div>

            {/* LIVE PULSING COMPANION CIRCULAR WINDOW */}
            <div className="relative flex items-center justify-center z-10 w-36 h-36 sm:w-44 sm:h-44">
              
              {/* Expanding visual sound ripples when speaking */}
              <AnimatePresence>
                {isTestSpeaking && (
                  <>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.8 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.5 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                      className="absolute inset-0 rounded-full border border-[#3BE0B9]/20"
                    />
                  </>
                )}
              </AnimatePresence>

              {/* Reactive voice waveform rings overlay */}
              {isTestSpeaking && (
                <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none z-20">
                  <div className="flex flex-col gap-1 items-center">
                    {[...Array(4)].map((_, i) => (
                      <motion.div
                        key={`l-${i}`}
                        animate={{ width: [4, 16, 4] }}
                        transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                        className="h-1 bg-[#3BE0B9] rounded-full"
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-1 items-center">
                    {[...Array(4)].map((_, i) => (
                      <motion.div
                        key={`r-${i}`}
                        animate={{ width: [4, 16, 4] }}
                        transition={{ duration: 0.45 + i * 0.12, repeat: Infinity, ease: 'easeInOut' }}
                        className="h-1 bg-[#3BE0B9] rounded-full"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Core Avatar Frame with matching drop-colors */}
              <div 
                onClick={() => setIsListening(!isListening)}
                className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden flex items-center justify-center p-4 transition-all duration-700 bg-slate-950/90 cursor-pointer border ${
                  isTestSpeaking 
                    ? 'scale-105 border-[#3BE0B9] shadow-[0_0_30px_rgba(59,224,185,0.2)]' 
                    : isListening 
                      ? 'scale-105 border-primary shadow-[0_0_20px_rgba(20,180,255,0.15)] ring-2 ring-primary/20'
                      : 'border-white/10 hover:border-white/20'
                }`}
              >
                <video
                  key={(isSimulating ? simStepIdx === 2 : isTestSpeaking) ? 'speaking' : 'listening'}
                  src={(isSimulating ? simStepIdx === 2 : isTestSpeaking) ? speakingPenguin : listenerPenguin}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Micro Listening indicator shield */}
                <div className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300 ${
                  isListening ? 'bg-primary border-primary text-navy-dark' : 'bg-black/60 border-white/5 text-white/60'
                }`}>
                  {isListening ? (
                    <Mic size={14} className="animate-pulse" />
                  ) : (
                    <MicOff size={14} />
                  )}
                </div>
              </div>
            </div>

            {/* PENGUIN MESSAGE BOX */}
            <div className="w-full relative z-10">
              <div className="w-full bg-slate-950/60 border border-white/5 p-2.5 rounded-xl flex flex-col gap-0.5 text-center">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.15em]">Live Vocal Response</span>
                <p className={`text-xs leading-normal italic text-white/90 select-none`}>
                  "{penguinMessage}"
                </p>
              </div>
            </div>

            {/* "HEAR MY COMPANION" PREMIUM BUTTON */}
            <div className="w-full flex flex-col gap-2 z-10 border-t border-white/5 pt-2.5">
              <button
                onClick={handleTestSpeech}
                id="btn-hear-my-companion"
                className={`w-full py-3 rounded-[16px] transition-all duration-300 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest border pointer-events-auto cursor-pointer select-none active:scale-95 ${
                  isTestSpeaking 
                    ? 'bg-rose-500 border-rose-400 text-white shadow-xl shadow-rose-500/10' 
                    : 'bg-gradient-to-r from-[#3BE0B9] to-cyan-400 text-slate-950 border-[#3BE0B9] hover:brightness-105 shadow-xl shadow-[#3BE0B9]/15'
                }`}
              >
                {isTestSpeaking ? (
                  <>
                    <VolumeX size={14} className="animate-pulse" />
                    <span>Mute Companion Voice</span>
                  </>
                ) : (
                  <>
                    <Volume2 size={11} className="animate-pulse" />
                    <span>Hear My Companion</span>
                  </>
                )}
              </button>

              <div className="flex gap-2">
                {/* Acoustic scanning arm switcher */}
                <button
                  onClick={() => setIsVoiceTriggerActive(!isVoiceTriggerActive)}
                  className={`flex-grow py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-500 flex items-center justify-center gap-1.5 cursor-pointer ${
                    isVoiceTriggerActive 
                      ? 'bg-primary/10 border-primary/30 text-primary-light' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  <Activity size={11} className={isVoiceTriggerActive ? 'animate-pulse' : ''} />
                  <span>{isVoiceTriggerActive ? 'Armed' : 'Standby'}</span>
                </button>

                {/* EMERGENCY SIMULATION TRIGGER */}
                <button
                  onClick={startEmergencySimulation}
                  id="btn-run-simulation"
                  className={`px-3.5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    isSimulating 
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 animate-pulse' 
                      : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Radio size={11} className={isSimulating ? 'animate-spin' : ''} />
                  <span>{isSimulating ? 'Stop Sim' : 'Simulate'}</span>
                </button>
              </div>
            </div>

          </GlassCard>

          {/* PRESENCE LEVEL COMPARTMENT */}
          <GlassCard className="p-3 sm:p-3.5 flex flex-col gap-2.5 border border-white/5 rounded-2xl bg-[#090D1E]/40">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Presence Controls</span>
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">Companion Presence Level</h3>
              <p className="text-[10px] text-white/40 leading-normal">
                Adjust how chatty, interactive, and proactive your escort speaks during late-night pathways.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'quiet', label: 'Shadow Presence', desc: 'Alert-only checks', icon: VolumeX },
                { id: 'balanced', label: 'Balanced Guard', desc: 'Occasional voice', icon: Bell },
                { id: 'constant', label: 'Active Escort', desc: 'Ongoing walk chat', icon: Heart }
              ].map((lvl) => {
                const isCur = presenceLevel === lvl.id;
                const Icon = lvl.icon;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => updatePresenceLevel(lvl.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center gap-1 transition-all duration-300 cursor-pointer ${
                      isCur 
                        ? 'bg-[#3BE0B9]/10 border-[#3BE0B9] text-white shadow-lg' 
                        : 'bg-white/[0.02] border-transparent hover:bg-white/5 text-white/50 hover:text-white'
                    }`}
                  >
                    <Icon size={12} className={isCur ? 'text-[#3BE0B9]' : ''} />
                    <div className="flex flex-col pointer-events-none">
                      <span className="text-[9px] font-bold uppercase leading-none">{lvl.label.split(' ')[0]}</span>
                      <span className="text-[7.5px] opacity-40 mt-0.5 leading-none">{lvl.desc.split(' ')[0]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

        </div>

        {/* RIGHT COLUMN: CONFIGURATION, EMOTIONAL MODES & HUMANIZED SLIDERS */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">

          {/* SIMULATION CONSOLE PREVIEW (CONDITIONAL ON SIMULATING) */}
          <AnimatePresence>
            {isSimulating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <GlassCard className="p-4 border border-rose-500/30 bg-rose-950/5 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-rose-500/10 pb-1.5">
                    <div className="flex items-center gap-1.5 text-rose-400">
                      <AlertTriangle size={12} className="animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Active Safety Simulation</span>
                    </div>
                    <button 
                      onClick={stopEmergencySimulation}
                      className="text-[9px] uppercase font-black tracking-widest text-white/60 hover:text-white"
                    >
                      Exit Simulation
                    </button>
                  </div>

                  {/* Step status bar */}
                  <div className="flex flex-col gap-2">
                    {simulationSteps.map((step, idx) => {
                      const isActive = idx === simStepIdx;
                      const isCompleted = idx < simStepIdx;
                      return (
                        <div 
                          key={step.label}
                          className={`flex items-start gap-2.5 p-2 rounded-lg transition-all duration-300 border ${
                            isActive 
                              ? 'bg-rose-500/10 border-rose-500/30 text-white shadow-md' 
                              : isCompleted 
                                ? 'bg-slate-900/10 border-dashed border-white/5 opacity-50' 
                                : 'bg-transparent border-transparent opacity-30'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-black shrink-0 ${
                            isCompleted 
                              ? 'bg-[#3BE0B9] text-slate-950' 
                              : isActive 
                                ? 'bg-rose-500 text-white animate-pulse' 
                                : 'bg-white/10 text-white/40'
                          }`}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>

                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold leading-none">{step.label}</span>
                            <span className="text-[9px] leading-tight opacity-70 mt-0.5">{step.description}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* EMOTIONALLY GUIDED COMPANION MODES LIST */}
          <GlassCard className="p-3.5 sm:p-4 border border-white/5 shadow-xl rounded-2xl sm:rounded-[22px] bg-gradient-to-br from-white/[0.01] to-transparent flex flex-col gap-2.5">
            <div className="flex flex-col gap-0.5 border-b border-white/5 pb-2">
              <span className="text-[9px] uppercase tracking-[0.25em] font-black text-[#22d3ee]">
                Protection Personalities
              </span>
              <h2 className="text-base sm:text-lg font-display font-black text-white uppercase tracking-tight">
                Choose Companion Personality
              </h2>
              <p className="text-[11px] text-white/40">
                Instantly adjust the vocal energy, protective pace, and reassurance flow.
              </p>
            </div>

            {/* Premium Modes List (Compressed to reduce fatigue) */}
            <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5">
              {VOICE_PRESETS.map((p) => {
                const isActive = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePresetSelect(p)}
                    className={`group p-2 sm:p-2.5 rounded-xl flex items-center justify-between border text-left transition-all duration-300 cursor-pointer pointer-events-auto ${
                      isActive
                        ? `bg-slate-950/80 border-cyan-400/40 shadow-lg ${p.accentGlow.split(' ')[0]}`
                        : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-3 max-w-[85%]">
                      {/* Highlighted miniature mode icon */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all duration-500 bg-slate-950/80 border ${
                        isActive ? 'border-[#3BE0B9]' : 'border-white/5'
                      }`}>
                        {p.icon}
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-[13px] font-black text-white leading-tight">{p.name}</span>
                          <span className="text-[7.5px] font-extrabold uppercase px-1 rounded bg-white/5 border border-white/5 text-white/55">
                            {p.subtitle.split(',')[0]}
                          </span>
                        </div>
                        <span className="text-[10px] leading-normal opacity-40 group-hover:opacity-75 transition-opacity line-clamp-1">
                          {p.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center shrink-0">
                      {isActive ? (
                        <div className="w-4 h-4 rounded-full bg-[#3BE0B9]/20 flex items-center justify-center border border-[#3BE0B9]/30">
                          <div className="w-2 h-2 rounded-full bg-[#3BE0B9]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/10 group-hover:border-white/30" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* HUMANIZED TUNING PANEL */}
          <GlassCard className="p-3.5 sm:p-4 border border-white/5 rounded-2xl sm:rounded-[22px] bg-slate-950/40 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Vocal Wave Synthesizer</span>
                <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight">Physical Voice Harmonizer</span>
              </div>
              <span className="text-[8.5px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-cyan-400">
                {activePreset === 'custom' ? 'CUSTOM PROFILE' : 'CHIP LINKED'}
              </span>
            </div>

            {/* Slider 1: Voice energy (Humanized pitch) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-white/80">Voice Energy</span>
                <span className="text-[9.5px] font-bold text-[#3BE0B9] bg-[#3BE0B9]/15 px-2 py-0.5 rounded border border-[#3BE0B9]/25 uppercase tracking-wide">
                  {getPitchLabel(pitch)} ({pitch.toFixed(2)}x)
                </span>
              </div>
              <input 
                type="range"
                min="0.60"
                max="1.70"
                step="0.05"
                value={pitch}
                onChange={(e) => updatePitch(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg accent-[#3BE0B9] bg-white/10 cursor-pointer"
              />
              <div className="flex justify-between text-[8px] uppercase tracking-wide opacity-40">
                <span>Grounded Guard</span>
                <span>Warm Reassuring (Ideal)</span>
                <span>Anxious Focus High</span>
              </div>
            </div>

            {/* Slider 2: Conversation rhythm (Humanized speed) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-white/80">Conversation Rhythm</span>
                <span className="text-[9.5px] font-bold text-cyan-400 bg-cyan-400/15 px-2 py-0.5 rounded border border-cyan-400/25 uppercase tracking-wide">
                  {getRateLabel(rate)} ({rate.toFixed(2)}x)
                </span>
              </div>
              <input 
                type="range"
                min="0.55"
                max="1.30"
                step="0.05"
                value={rate}
                onChange={(e) => updateRate(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg accent-cyan-400 bg-white/10 cursor-pointer"
              />
              <div className="flex justify-between text-[8px] uppercase tracking-wide opacity-40">
                <span>Relaxed & Thoughtful</span>
                <span>Steady & Supportive (Ideal)</span>
                <span>Rapid Safe Directions</span>
              </div>
            </div>

            {/* Voice dropdown */}
            {availableVoices.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                <label className="text-[9px] uppercase font-black tracking-widest text-[#22d3ee]/60">Speech Synthesis Profile Linkage</label>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-slate-900/60 transition-all border border-white/10 rounded-xl p-2.5 flex justify-between items-center text-left text-xs text-white"
                  >
                    <div>
                      {selectedVoiceName ? (
                        <>
                          <span className="font-bold">{selectedVoiceName}</span>
                          <span className="opacity-40 text-[9px] ml-1.5">(Custom Local Driver)</span>
                        </>
                      ) : (
                        <span className="text-cyan-400 font-bold">Standard Companion Autodetect</span>
                      )}
                    </div>
                    <ChevronDown size={14} className="opacity-50" />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-11 left-0 right-0 max-h-40 overflow-y-auto bg-[#0d1226] border border-white/15 rounded-xl shadow-xl z-50 p-1 space-y-1">
                      <button 
                        onClick={() => { updateVoiceName(''); setIsDropdownOpen(false); }}
                        className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-[#3BE0B9]"
                      >
                        Standard Companion Autodetect
                      </button>
                      {availableVoices.slice(0, 15).map(v => (
                        <button
                          key={v.name}
                          onClick={() => { updateVoiceName(v.name); setIsDropdownOpen(false); }}
                          className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-white/80"
                        >
                          {v.name} ({v.lang.toUpperCase()})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </GlassCard>

          {/* INTELLIGENT ADAPTIVE BEHAVE SYSTEMS */}
          <GlassCard className="p-3.5 sm:p-4 border border-white/5 rounded-2xl sm:rounded-[22px] bg-slate-950/20 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-cyan-400 animate-pulse" />
              <span className="text-xs font-black text-white uppercase tracking-wider">Context Awareness Systems</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { 
                  id: 'night_walk', 
                  label: 'Night Walk Awareness', 
                  desc: 'Softens tone and dims map glows after 9 PM.', 
                  state: nightWalk, 
                  toggle: handleToggleNightWalk,
                  icon: Sunset 
                },
                { 
                  id: 'rapid_move', 
                  label: 'Rapid Move Sense', 
                  desc: 'Escalates guidance checks if you start running.', 
                  state: rapidMovement, 
                  toggle: handleToggleRapidMove,
                  icon: Activity 
                },
                { 
                  id: 'silence_monitor', 
                  label: 'Silence Monitoring', 
                  desc: 'Soft-checks your status if you stop speaking.', 
                  state: silenceMonitoring, 
                  toggle: handleToggleSilence,
                  icon: VolumeX 
                },
                { 
                  id: 'trigger_escal', 
                  label: 'Trigger Phrase Escalation', 
                  desc: 'Elevates to rescue channels if distress is heard.', 
                  state: triggerEscalation, 
                  toggle: handleToggleSilence, // wait, let's keep handleToggleEscalation if correct
                  icon: Radio 
                }
              ].map((sw) => {
                const Icon = sw.icon;
                const toggleFn = sw.id === 'trigger_escal' ? handleToggleEscalation : sw.toggle;
                return (
                  <div 
                    key={sw.id}
                    className="p-2 sm:p-2.5 rounded-xl bg-[#090d1e]/30 border border-white/5 flex gap-2.5 items-center justify-between"
                  >
                    <div className="flex gap-2 items-start">
                      <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${
                        sw.state ? 'bg-[#3BE0B9]/15 border-[#3BE0B9]/20 text-[#3BE0B9]' : 'bg-white/5 border-white/5 text-white/40'
                      }`}>
                        <Icon size={12} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-black text-white leading-tight">{sw.label}</span>
                        <span className="text-[9px] opacity-40 leading-tight">{sw.desc}</span>
                      </div>
                    </div>

                    {/* Styled Switch Toggle */}
                    <button 
                      onClick={toggleFn}
                      className={`relative w-8 h-4.5 rounded-full p-0.5 transition-all outline-none flex items-center cursor-pointer shrink-0 ${
                        sw.state ? 'bg-[#3BE0B9]' : 'bg-white/10'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-slate-950 shadow-md transform transition-all duration-300 ${
                        sw.state ? 'translate-x-3.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </GlassCard>

        </div>

      </div>

      {/* DISCREET SAFE PHRASE CORE CONFIGURATION PANEL */}
      <GlassCard className="p-3.5 sm:p-4 border border-white/5 shadow-xl rounded-2xl sm:rounded-[22px] bg-gradient-to-b from-white/[0.02] to-transparent flex flex-col gap-2.5">
        <div className="flex flex-col gap-0.5 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5">
            <Heart size={12} className="text-primary animate-pulse" />
            <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">
              Voice Trigger Guards
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-display font-black text-white uppercase tracking-tight">
            Vigilant Safe Phrase Settings
          </h2>
          <p className="text-[11px] text-white/50 max-w-2xl leading-normal">
            Choose or customize a private verbal password. If you ever find yourself in discomfort but can't call openly, say this phrase. Your Companion will silently sync coordinates.
          </p>
        </div>

        {/* Safe Phrase Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[
            { phrase: "I forgot my charger", desc: "Low-power excuse designed for polite departures." },
            { phrase: "Did I leave the lights on?", desc: "Natural distracter appropriate in public." },
            { phrase: "Tell Sarah I'll be late", desc: "Standard family checkout decoy cue phrase." }
          ].map((itm) => {
            const isCur = triggerPhrase.toLowerCase() === itm.phrase.toLowerCase();
            return (
              <button
                key={itm.phrase}
                onClick={() => handleSavePhrase(itm.phrase)}
                className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between gap-1 cursor-pointer ${
                  isCur 
                    ? 'bg-primary/10 border-primary/40 text-primary-light shadow-[0_0_15px_rgba(20,180,255,0.08)]' 
                    : 'bg-white/[0.01] border-transparent hover:bg-white/5 text-white/70'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-bold leading-tight">"{itm.phrase}"</span>
                  {isCur && <Check size={11} className="text-primary shrink-0" />}
                </div>
                <span className="text-[9.5px] opacity-40 leading-normal">{itm.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Custom trigger setup */}
        <div className="flex flex-col md:flex-row gap-2 pt-2 border-t border-white/5">
          <div className="flex-grow flex flex-col justify-center">
            <span className="text-[9.5px] uppercase font-black tracking-wider text-white/40">Custom Personal Trigger Phrase</span>
            <span className="text-[9px] opacity-35 leading-tight">Create a unique code phrase that feels natural for your daily speaking style.</span>
          </div>

          <div className="flex gap-2 shrink-0 md:w-[48%]">
            <input
              type="text"
              value={customPhraseInput}
              onChange={(e) => setCustomPhraseInput(e.target.value)}
              placeholder="e.g. Is the grocery store open?"
              className="flex-grow bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-primary/40 transition-all font-sans"
            />
            <button
              onClick={() => handleSavePhrase(customPhraseInput)}
              disabled={!customPhraseInput.trim()}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                customPhraseInput.trim()
                  ? 'bg-primary text-navy-dark hover:brightness-105 shadow-md shadow-primary/15'
                  : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
              }`}
            >
              Save Custom
            </button>
          </div>
        </div>
      </GlassCard>

    </div>
  );
}
