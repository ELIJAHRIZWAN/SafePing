import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MapPin, 
  Bell, 
  Shield, 
  Lock, 
  ChevronRight, 
  Moon, 
  Sun,
  Eye, 
  LogOut,
  Sparkles,
  Camera,
  Clock,
  CameraOff,
  Mic,
  MicOff,
  Play,
  Pause,
  Volume2,
  Info,
  Trash2,
  Check,
  Zap,
  ShieldCheck,
  EyeOff,
  Sliders,
  Folder,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { useEmergency } from '../context/EmergencyContext';
import { 
  isDevModeEnabled, 
  setDevModeEnabled, 
  speakWithBrowserSpeech, 
  stopSpeaking,
  subscribeToVoiceState
} from '../services/elevenlabsService';
import GuardianMascot from '../components/GuardianMascot';
import introPenguin from '../assets/ANIMATIONS/introductive_penguin.webm';
import PenThoughtBubble from '../components/PenThoughtBubble';

export default function SettingsView() {
  const { 
    isDarkMode, 
    setDarkMode, 
    isPrivacyMode, 
    setPrivacyMode, 
    setCurrentView,
    guardians,
    isEmergencyActive,
    user,
    userLocation,
    batteryLevel,
    isPerformanceSave,
    setIsPerformanceSave,
    logout,
    autoStatusUpdates,
    setAutoStatusUpdates,
    sosCountdownDuration,
    setSosCountdownDuration
  } = useApp();

  const navigate = useNavigate();

  const {
    isSilentEvidenceActive,
    isCameraEvidenceEnabled,
    setIsCameraEvidenceEnabled,
    isAudioEvidenceEnabled,
    setIsAudioEvidenceEnabled,
    isSilentEvidenceConsentAcknowledged,
    setIsSilentEvidenceConsentAcknowledged,
    evidenceSnapshots,
    captureEvidenceSnapshot,
    clearEvidenceSnapshots,
    cameraStatus
  } = useEmergency();

  const [isVoiceDevMode, setIsVoiceDevMode] = useState(isDevModeEnabled());
  const [isSimulatingCapture, setIsSimulatingCapture] = useState(false);
  const [showTransparencyModal, setShowTransparencyModal] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  // Floating Status indicator logic
  const [isSystemSpeaking, setIsSystemSpeaking] = useState(false);
  useEffect(() => {
    const unsubscribe = subscribeToVoiceState((speaking) => {
      setIsSystemSpeaking(speaking);
    });
    return () => unsubscribe();
  }, []);

  // Collapse sections (Accordions) state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    security: true,
    voice: false,
    evidence: false,
    intelligence: false,
    automation: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Voice Customization parameter selectors (linked with VoiceTrigger/localStorage)
  const [pitch, setPitch] = useState(() => {
    try {
      const val = localStorage.getItem("safeping_browser_voice_pitch");
      return val ? parseFloat(val) : 1.15;
    } catch {
      return 1.15;
    }
  });

  const [rate, setRate] = useState(() => {
    try {
      const val = localStorage.getItem("safeping_browser_voice_rate");
      return val ? parseFloat(val) : 0.85;
    } catch {
      return 0.85;
    }
  });

  const [selectedVoiceName, setSelectedVoiceName] = useState(() => {
    try {
      return localStorage.getItem("safeping_browser_voice_name") || "";
    } catch {
      return "";
    }
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis) {
        const synth = window.speechSynthesis;
        const getVoicesList = () => {
          try {
            const voices = synth.getVoices() || [];
            const enVoices = voices.filter(v => v && v.lang && v.lang.toLowerCase().startsWith("en"));
            setAvailableVoices(enVoices);
          } catch (e) {
            console.warn("Error retrieving voices list:", e);
          }
        };
        getVoicesList();
        synth.onvoiceschanged = getVoicesList;
      }
    } catch (err) {
      console.warn("speechSynthesis access was blocked or failed in settings view:", err);
    }
  }, []);

  const updatePitch = (val: number) => {
    setPitch(val);
    try {
      localStorage.setItem("safeping_browser_voice_pitch", val.toString());
      localStorage.setItem("safeping_browser_voice_preset", 'custom');
    } catch (e) {}
  };

  const updateRate = (val: number) => {
    setRate(val);
    try {
      localStorage.setItem("safeping_browser_voice_rate", val.toString());
      localStorage.setItem("safeping_browser_voice_preset", 'custom');
    } catch (e) {}
  };

  const updateVoiceName = (val: string) => {
    setSelectedVoiceName(val);
    try {
      localStorage.setItem("safeping_browser_voice_name", val);
      localStorage.setItem("safeping_browser_voice_preset", 'custom');
    } catch (e) {}
  };

  // Quick Panic Automation Options (Interactive local persistence)
  const [tripleTapPower, setTripleTapPower] = useState(() => {
    try {
      return localStorage.getItem('safeping_settings_triple_tap') !== 'false';
    } catch {
      return true;
    }
  });

  const [shakeDevice, setShakeDevice] = useState(() => {
    try {
      return localStorage.getItem('safeping_settings_shake_device') === 'true';
    } catch {
      return false;
    }
  });

  const [longPressVolume, setLongPressVolume] = useState(() => {
    try {
      return localStorage.getItem('safeping_settings_long_press_vol') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleTripleTap = () => {
    const next = !tripleTapPower;
    setTripleTapPower(next);
    try {
      localStorage.setItem('safeping_settings_triple_tap', String(next));
    } catch (e) {}
  };

  const handleToggleShakeDevice = () => {
    const next = !shakeDevice;
    setShakeDevice(next);
    try {
      localStorage.setItem('safeping_settings_shake_device', String(next));
    } catch (e) {}
  };

  const handleToggleLongPressVolume = () => {
    const next = !longPressVolume;
    setLongPressVolume(next);
    try {
      localStorage.setItem('safeping_settings_long_press_vol', String(next));
    } catch (e) {}
  };

  const handleTestSpeech = async (msg: string) => {
    try {
      localStorage.setItem("safeping_browser_voice_pitch", pitch.toString());
      localStorage.setItem("safeping_browser_voice_rate", rate.toString());
      localStorage.setItem("safeping_browser_voice_name", selectedVoiceName);
    } catch (e) {}
    await speakWithBrowserSpeech(msg, true);
  };

  const sectionDivider = (title: string, icon: any, key: string) => {
    const Icon = icon;
    const isExpanded = expandedSections[key];
    return (
      <button 
        onClick={() => toggleSection(key)}
        className="w-full flex items-center justify-between py-3 border-b-2 border-teal-500/20 hover:border-teal-400/40 focus:outline-none group select-none text-left transition-all duration-305"
      >
        <div className="flex items-center gap-2.5 relative pointer-events-none">
          <div className="absolute -left-3 y-1/2 -translate-y-1/2 w-14 h-14 bg-[#3BE0B9]/10 rounded-full blur-xl pointer-events-none group-hover:bg-teal-500/15 transition-colors duration-500 animate-pulse" />
          <span className="text-[#3BE0B9] relative flex items-center justify-center shrink-0 w-6.5 h-6.5 rounded-lg bg-teal-900/40 border border-teal-500/30 shadow-[0_0_12px_rgba(59,224,185,0.15)]">
            <Icon size={12} className="text-[#3BE0B9]" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-teal-200 font-mono leading-none">
            {title}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 pointer-events-none">
          <span className="text-[8px] uppercase tracking-[0.12em] font-black text-teal-400/40 group-hover:text-teal-450 transition-colors">
            {isExpanded ? 'Collapse' : 'Expand'}
          </span>
          <motion.span
            animate={{ rotate: isExpanded ? 90 : 0 }}
            className="text-teal-400/30 group-hover:text-[#3BE0B9] transition-colors"
          >
            <ChevronRight size={13} />
          </motion.span>
        </div>
      </button>
    );
  };

  const [sensitivity, setSensitivity] = useState(() => {
    try {
      const val = localStorage.getItem('safeping_settings_sensitivity');
      return val ? parseInt(val, 10) : 65;
    } catch {
      return 65;
    }
  });

  const [isAutoEscalationEnabled, setIsAutoEscalationEnabled] = useState(() => {
    try {
      const val = localStorage.getItem('safeping_settings_auto_escalation');
      return val !== 'false';
    } catch {
      return true;
    }
  });

  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    try {
      localStorage.setItem('safeping_settings_sensitivity', String(val));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAutoEscalationToggle = () => {
    const nextVal = !isAutoEscalationEnabled;
    setIsAutoEscalationEnabled(nextVal);
    try {
      localStorage.setItem('safeping_settings_auto_escalation', String(nextVal));
    } catch (e) {
      console.error(e);
    }
  };

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const handlePlayAudio = (snapId: string, audioUrl: string) => {
    if (playingAudioId === snapId) {
      if (currentAudio) {
        currentAudio.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (currentAudio) {
        currentAudio.pause();
      }
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setPlayingAudioId(null);
      };
      audio.play().catch(e => console.error("Audio playback interrupted:", e));
      setCurrentAudio(audio);
      setPlayingAudioId(snapId);
    }
  };

  const handleCloseLightbox = () => {
    if (currentAudio) {
      currentAudio.pause();
    }
    setPlayingAudioId(null);
    setSelectedSnapshotId(null);
  };

  const textColor = isDarkMode ? 'text-white' : 'text-navy-dark';
  const subTextColor = isDarkMode ? 'text-white/40' : 'text-navy-dark/40';

  const settingsGroups = [
    {
      title: 'Security',
      items: [
        { 
          icon: Shield, 
          label: 'Emergency Contacts', 
          value: `${guardians.length} Active`,
          onClick: () => setCurrentView('guardians')
        },
        { icon: MapPin, label: 'Location Sharing', value: 'Always' },
        { 
          icon: Lock, 
          label: 'Privacy Mode', 
          value: isPrivacyMode ? 'On' : 'Off', 
          isToggle: true, 
          checked: isPrivacyMode,
          onToggle: () => setPrivacyMode(!isPrivacyMode)
        },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { 
          icon: isDarkMode ? Moon : Sun, 
          label: 'Theme Mode', 
          value: isDarkMode ? 'Dark' : 'Light', 
          isToggle: true, 
          checked: isDarkMode,
          onToggle: () => setDarkMode(!isDarkMode)
        },
        { 
          icon: Zap, 
          label: 'Energy & Performance Save', 
          value: isPerformanceSave ? 'Saver Enabled' : 'Normal Power', 
          isToggle: true, 
          checked: isPerformanceSave,
          onToggle: () => setIsPerformanceSave(!isPerformanceSave)
        },
        { 
          icon: Sparkles, 
          label: 'Voice Optimizer (Dev Mode)', 
          value: isVoiceDevMode ? 'On' : 'Off', 
          isToggle: true, 
          checked: isVoiceDevMode,
          onToggle: () => {
            const newVal = !isVoiceDevMode;
            setIsVoiceDevMode(newVal);
            setDevModeEnabled(newVal);
          }
        },
        { icon: Bell, label: 'Push Notifications', value: 'Critical Only' },
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-8 py-6 animate-fade-in">
      <header className="flex flex-col gap-1 px-2">
        <span className={`text-[15px] uppercase tracking-[0.16em] font-bold font-ostrich ${subTextColor}`}>Preferences</span>
        <h1 className={`text-4xl font-landsdowne tracking-wide ${textColor}`}>Settings</h1>
      </header>

      {/* Pen Companion Mascot Card with Thought Bubble */}
      <GlassCard 
        className="rounded-[24px] border border-white/5 bg-transparent relative overflow-visible flex items-center gap-4 mx-2"
        style={{ height: "130px", paddingLeft: "8px", paddingRight: "8px" }}
      >
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-penguin-assistant'))}
          className="rounded-2xl overflow-hidden shrink-0 border border-white/10 flex items-center justify-center bg-white/5 hover:scale-[1.03] active:scale-[0.97] transition-all relative"
          style={{ height: "75px", width: "74px" }}
        >
          <div className="scale-[1.4] flex items-center justify-center" style={{ width: "69px", height: "95px" }}>
            <video
              src={introPenguin}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain pointer-events-none filter brightness-110"
            />
          </div>
        </button>
        <PenThoughtBubble 
          screenName="settings" 
          pointerPosition="left" 
          className="flex-1 max-w-full" 
          style={{ width: "245.375px", height: "42px" }}
        />
      </GlassCard>

      {/* Profile Section */}
      <GlassCard className="p-6 border-none shadow-xl">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-[24px] bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl font-display font-bold text-primary">
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="flex flex-col gap-1">
            <span className={`text-2xl font-bold tracking-tight ${textColor}`}>{user.name || 'Anonymous User'}</span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/10`}>
                {user.age || 'N/A'} Years
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/10`}>
                Type {user.bloodGroup || '?'}
              </span>
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isEmergencyActive ? 'text-red-500' : 'text-green-500'}`}>
              Safety Status: {isEmergencyActive ? 'Alerted' : 'Secure'}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* FLOATING GUARDIAN STATUS PILL */}
      <div className="flex justify-center -mt-2">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#030611]/85 border border-teal-500/20 shadow-xl backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isEmergencyActive ? 'bg-rose-400' : isSystemSpeaking ? 'bg-teal-400' : 'bg-emerald-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isEmergencyActive ? 'bg-rose-500' : isSystemSpeaking ? 'bg-teal-500' : 'bg-emerald-500'
            }`} />
          </span>
          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#3BE0B9] leading-none">
            {isEmergencyActive ? '🔴 SOS ESCALATION ACTIVE' : (isSystemSpeaking ? '🔊 GUARDIAN ADVISING ACTIVE' : '🟢 PASSIVE MONITORING STANDBY')}
          </span>
        </div>
      </div>

      {/* Accordion List Container */}
      <div className="flex flex-col gap-5 w-full">
        
        {/* Section 1: Security & Contacts */}
        <div className="flex flex-col gap-3">
          {sectionDivider('🛡 SECURITY', Shield, 'security')}
          {expandedSections.security && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="flex flex-col gap-2 overflow-hidden pt-1"
            >
              <button 
                onClick={() => setCurrentView('guardians')}
                id="settings-btn-contacts"
                className="w-full flex items-center justify-between p-3.5 bg-[#090D1E]/40 rounded-2xl border border-white/5 hover:border-teal-500/20 active:scale-[0.99] transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-teal-400 shrink-0">
                    <Shield size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">Emergency Contacts</span>
                    <span className="text-[9px] text-white/40 mt-0.5">Quickly coordinates coordinates under distress.</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-teal-500/10 text-teal-450 border border-teal-500/20">
                    {guardians.length} Active
                  </span>
                  <ChevronRight size={14} className="text-white/20" />
                </div>
              </button>

              <div className="w-full flex items-center justify-between p-3.5 bg-[#090D1E]/40 rounded-2xl border border-white/5 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-teal-400 shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">Location Sharing</span>
                    <span className="text-[9px] text-white/40 mt-0.5">Continuously pins route coordinates to local context.</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 text-[8px] font-black uppercase tracking-widest font-mono shrink-0">
                  Always On
                </span>
              </div>

              <button 
                onClick={() => setPrivacyMode(!isPrivacyMode)}
                className="w-full flex items-center justify-between p-3.5 bg-[#090D1E]/40 rounded-2xl border border-white/5 active:scale-[0.99] transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-teal-400 shrink-0">
                    {isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">Privacy Obfuscation</span>
                    <span className="text-[9px] text-white/40 mt-0.5">Hides live route overlay from transient screen lookup.</span>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${isPrivacyMode ? 'bg-[#3BE0B9]' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 bg-slate-950 rounded-full shadow-md transform transition-transform duration-300 ${isPrivacyMode ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            </motion.div>
          )}
        </div>

        {/* Section 2: Voice Settings */}
        <div className="flex flex-col gap-3">
          {sectionDivider('🎙 VOICE & COMPANION', Volume2, 'voice')}
          {expandedSections.voice && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="flex flex-col gap-3 overflow-hidden pt-1"
            >
              <GlassCard className="p-4 border border-white/5 rounded-2xl bg-slate-950/40 flex flex-col gap-3">
                
                {/* Voice Energy Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white/80">Voice Energy Pitch</span>
                    <span className="text-[9px] font-bold text-[#3BE0B9] bg-[#3BE0B9]/15 px-2 py-0.5 rounded border border-[#3BE0B9]/25 uppercase tracking-wide">
                      {pitch > 1.3 ? 'Expressive' : pitch > 1.0 ? 'Comforting' : 'Balanced'} ({pitch.toFixed(2)}x)
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="1.7" 
                    step="0.05"
                    value={pitch} 
                    onChange={(e) => updatePitch(parseFloat(e.target.value))}
                    className="w-full h-1 rounded-lg accent-[#3BE0B9] bg-white/10 cursor-pointer"
                  />
                  <div className="flex justify-between text-[7.5px] uppercase tracking-wide opacity-40">
                    <span>Deep / Calming</span>
                    <span>Warm / Standard</span>
                    <span>Bright / High</span>
                  </div>
                </div>

                {/* Conversation Rhythm Slider */}
                <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white/80">Conversation Rhythm pacing</span>
                    <span className="text-[9px] font-bold text-cyan-400 bg-cyan-400/15 px-2 py-0.5 rounded border border-cyan-400/25 uppercase tracking-wide">
                      {rate > 1.1 ? 'Express' : rate > 0.8 ? 'Supportive' : 'Deliberate'} ({rate.toFixed(2)}x)
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="1.5" 
                    step="0.05"
                    value={rate} 
                    onChange={(e) => updateRate(parseFloat(e.target.value))}
                    className="w-full h-1 rounded-lg accent-cyan-400 bg-white/10 cursor-pointer"
                  />
                  <div className="flex justify-between text-[7.5px] uppercase tracking-wide opacity-40">
                    <span>Deliberate / Thoughtful</span>
                    <span>Steady / Supportive</span>
                    <span>Rapid / Directions</span>
                  </div>
                </div>

                {/* Dropdown speech selection */}
                {availableVoices.length > 0 && (
                  <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
                    <label className="text-[8.5px] uppercase font-black tracking-widest text-[#22d3ee]/60">Speech Synthesis Profile Linkage</label>
                    <div className="relative">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full bg-slate-900/60 transition-all border border-white/10 rounded-xl p-2.5 flex justify-between items-center text-left text-xs text-white"
                      >
                        <div className="truncate pr-4 font-mono text-[11px]">
                          {selectedVoiceName ? (
                            <>
                              <span className="font-bold text-white">{selectedVoiceName}</span>
                              <span className="opacity-40 text-[8px] ml-1.5">(Custom Local)</span>
                            </>
                          ) : (
                            <span className="text-[#3BE0B9] font-bold">Standard Companion Autodetect</span>
                          )}
                        </div>
                        <ChevronDown size={14} className="opacity-50 shrink-0" />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute top-11 left-0 right-0 max-h-40 overflow-y-auto bg-[#0d1226] border border-white/15 rounded-xl shadow-xl z-50 p-1 space-y-1">
                          <button 
                            onClick={() => { updateVoiceName(''); setIsDropdownOpen(false); }}
                            className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-[#3BE0B9]"
                          >
                            Standard Companion Autodetect
                          </button>
                          {availableVoices.map((v) => (
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

                {/* Live Voice Preview actions */}
                <div className="flex flex-col gap-2 border-t border-white/5 pt-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Live Voice Previews</span>
                    <button 
                      onClick={stopSpeaking}
                      className="text-[8.5px] uppercase font-black tracking-wider text-rose-450 hover:text-rose-400 underline decoration-dotted"
                    >
                      Mute Preview
                    </button>
                  </div>
                  
                  {isSystemSpeaking && (
                    <div className="flex justify-center items-center gap-0.5 h-4 my-0.5 px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                      <span className="text-[7.5px] text-teal-400 tracking-wider font-bold mr-1.5 uppercase animate-pulse">Vocal Synthesizer Streaming</span>
                      {[1, 2, 3, 4, 5, 6].map((bar) => {
                        const heights = [6, 12, 16, 10, 14, 8];
                        return (
                          <motion.div
                            key={bar}
                            animate={{ height: [heights[bar % 6] / 2, heights[bar % 6], heights[bar % 6] / 2] }}
                            transition={{ repeat: Infinity, duration: 0.5 + bar * 0.08, ease: "easeInOut" }}
                            className="w-0.5 bg-[#3BE0B9] rounded-full"
                            style={{ height: heights[bar % 6] }}
                          />
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleTestSpeech("Voice adaptive parameters sounding steady and highly secure.")}
                      className="py-2 rounded-xl bg-white/5 hover:bg-teal-500/10 border border-white/5 hover:border-teal-500/20 text-white font-black uppercase text-[8px] tracking-wide transition-all active:scale-95"
                    >
                      ▶ Test Voice
                    </button>
                    <button
                      onClick={() => handleTestSpeech("Take a slow, gentle breath. Everything is safe and under overwatch.")}
                      className="py-2 rounded-xl bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/20 text-white font-black uppercase text-[8px] tracking-wide transition-all active:scale-95"
                    >
                      ▶ Calm Mode
                    </button>
                    <button
                      onClick={() => handleTestSpeech("Alert. Emergency escalation trigger is armed. Safety coordinates sync pending.")}
                      className="py-2 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-white font-black uppercase text-[8px] tracking-wide transition-all active:scale-95"
                    >
                      ▶ Alert Tone
                    </button>
                  </div>
                </div>

              </GlassCard>
            </motion.div>
          )}
        </div>

        {/* Section 3: Silent Evidence & Gallery */}
        <div className="flex flex-col gap-3">
          {sectionDivider('📁 SILENT EVIDENCE', Folder, 'evidence')}
          {expandedSections.evidence && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="flex flex-col gap-3 overflow-hidden pt-1"
            >
              <GlassCard className="p-4 border border-rose-500/15 bg-gradient-to-br from-rose-950/15 via-[#090D1E]/40 to-transparent shadow-[0_0_25px_rgba(244,63,94,0.06)] rounded-2xl flex flex-col gap-4 relative overflow-hidden">
                
                {/* Encrypted badging indicator */}
                <div className="flex justify-between items-center bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-rose-500/15">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                    </span>
                    <span className="text-[8px] font-mono font-extrabold text-rose-400 uppercase tracking-widest">
                      🔒 SECURE CRYPTO VAULT ACTIVE
                    </span>
                  </div>
                  <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-305 border border-rose-500/25">
                    Encrypted
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-[#3BE0B9]" />
                    <h4 className={`text-base font-display font-extrabold tracking-tight ${textColor}`}>
                      Silent Evidence Mode
                    </h4>
                  </div>
                  <p className={`text-[10px] leading-relaxed mt-0.5 font-medium ${subTextColor}`}>
                    Quietly stores location & emergency context. Fully offline, encrypted, and private.
                  </p>
                </div>

                <div className="h-[1px] w-full bg-white/5" />

                {/* Interactive Toggles */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-white/5 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 font-sans">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCameraEvidenceEnabled && cameraStatus === 'available' ? 'bg-teal-500/10 text-teal-400' : 'bg-red-500/10 text-red-400'}`}>
                          {isCameraEvidenceEnabled && cameraStatus === 'available' ? <Camera size={14} /> : <CameraOff size={14} />}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white leading-none">Camera Snapshots</span>
                          <span className="text-[9px] text-white/40 mt-1">Quietly captures video reference points.</span>
                        </div>
                      </div>
                      <button 
                        disabled={cameraStatus !== 'available'}
                        onClick={() => setIsCameraEvidenceEnabled(!isCameraEvidenceEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 duration-305 shrink-0 ${isCameraEvidenceEnabled && cameraStatus === 'available' ? 'bg-[#3BE0B9] cursor-pointer' : 'bg-white/10 opacity-30 cursor-not-allowed'}`}
                        title={cameraStatus !== 'available' ? "Camera hardware is currently unavailable" : "Toggle camera snapshots"}
                      >
                        <div className={`w-4 h-4 bg-slate-950 rounded-full shadow transition-all duration-300 ${isCameraEvidenceEnabled && cameraStatus === 'available' ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {cameraStatus !== 'available' && (
                      <div className="text-[9.5px] text-amber-400 font-semibold flex items-center gap-1.5 border-t border-white/5 pt-2 mt-0.5 select-none leading-normal font-sans">
                        <span className="text-amber-500 text-xs">⚠️</span>
                        <span>Camera unavailable. Safety monitoring continues.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5 text-left">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAudioEvidenceEnabled ? 'bg-teal-500/10 text-teal-400' : 'bg-[#E8452A]/10 text-[#E8452A]'}`}>
                        {isAudioEvidenceEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">Acoustic Preservation</span>
                        <span className="text-[9px] text-white/40">Protective monitoring during escalation.</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsAudioEvidenceEnabled(!isAudioEvidenceEnabled)}
                      className={`w-9 h-5 rounded-full p-0.5 duration-305 shrink-0 ${isAudioEvidenceEnabled ? 'bg-[#3BE0B9]' : 'bg-white/10'}`}
                    >
                      <div className={`w-4 h-4 bg-slate-950 rounded-full shadow transition-all duration-300 ${isAudioEvidenceEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowTransparencyModal(true)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-teal-500/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Info size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">Protection Transparency</span>
                        <span className="text-[9px] text-white/40">Verify data safety standards.</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 shrink-0" />
                  </button>
                </div>

                <div className="h-[1px] w-full bg-white/5" />

                {/* Evidence logs header */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] uppercase tracking-[0.15em] font-mono font-black text-slate-400">Preserved Logs ({evidenceSnapshots.length})</span>
                    {evidenceSnapshots.length > 0 && (
                      <button 
                        onClick={clearEvidenceSnapshots}
                        className="flex items-center gap-1 text-[8px] font-black uppercase text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-500/5 rounded-lg border border-rose-500/10 active:scale-95 transition-all"
                      >
                        <Trash2 size={9} />
                        Format Logs
                      </button>
                    )}
                  </div>

                  {/* SIMULATE SCAN TRIGGER */}
                  <button
                    onClick={async () => {
                      if (isSimulatingCapture) return;
                      setIsSimulatingCapture(true);
                      const loc: [number, number] | null = userLocation ? [userLocation[0], userLocation[1]] : [25.0339, 121.5654];
                      await captureEvidenceSnapshot(loc, batteryLevel, 'Manual Security Diagnostic Test Run');
                      setIsSimulatingCapture(false);
                    }}
                    disabled={isSimulatingCapture}
                    className={`w-full py-2 rounded-xl text-[9.5px] uppercase font-black tracking-widest flex items-center justify-center gap-1.5 border border-rose-500/25 ${
                      isSimulatingCapture 
                        ? 'bg-rose-500/10 text-rose-400 cursor-not-allowed animate-pulse' 
                        : 'bg-rose-500/10 text-rose-350 hover:bg-rose-500/15 active:scale-[0.98]'
                    } transition-all`}
                  >
                    <Zap size={11} className={isSimulatingCapture ? 'animate-spin' : ''} />
                    {isSimulatingCapture ? 'Locking Diagnostic Snap...' : 'Test Protection Setup (Simulate Scan)'}
                  </button>

                  {/* REFINED GALLERY WITH BLURRED PREVIEWS */}
                  {evidenceSnapshots.length === 0 ? (
                    <div className="p-4 rounded-xl bg-black/20 border border-dashed border-white/5 text-center">
                      <EyeOff className="mx-auto text-slate-500 mb-1.5 opacity-35" size={16} />
                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-white/30">Log Vault Isolated</p>
                      <p className="text-[8px] text-white/30 font-semibold mt-0.5">
                        No backup metrics compiled in standby safety.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {evidenceSnapshots.map(snap => {
                        let tag = 'Guardian Session';
                        if (snap.reason.toLowerCase().includes('manual') || snap.reason.toLowerCase().includes('test')) {
                          tag = 'Emergency Route';
                        } else if (snap.audioUrl) {
                          tag = 'Audio Protected';
                        }
                        return (
                          <button 
                            key={snap.id} 
                            onClick={() => setSelectedSnapshotId(snap.id)}
                            className="group relative rounded-lg overflow-hidden aspect-[1.3] bg-[#030611] border border-white/5 hover:border-teal-500/30 text-left transition-all active:scale-[0.97]"
                          >
                            <img 
                              src={snap.imageUrl} 
                              alt="Secured Snapshot" 
                              className="w-full h-full object-cover filter blur-sm group-hover:blur-0 transition-all duration-505 opacity-55 group-hover:opacity-100" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 group-hover:bg-transparent transition-all pointer-events-none">
                              <div className="p-1 px-1.5 rounded bg-black/60 border border-white/11 text-[7px] font-black text-white/80 group-hover:opacity-0 transition-opacity flex items-center gap-1 uppercase tracking-wide">
                                <Lock size={8} className="text-rose-455" />
                                Secure Preview
                              </div>
                            </div>
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-1.5 pointer-events-none">
                              <span className="text-white/40 text-[6.5px] font-bold uppercase tracking-wider block leading-none mb-0.5 font-mono">[{snap.timestamp}]</span>
                              <div className="flex items-center gap-1 w-full justify-between mt-0.5">
                                <span className="text-white font-black text-[8px] uppercase tracking-wide truncate max-w-[60%] font-mono">{snap.reason}</span>
                                <span className="px-1.5 py-0.5 rounded-[4px] bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[6px] font-black uppercase tracking-widest scale-90 origin-right flex-shrink-0">
                                  {tag}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>

              </GlassCard>
            </motion.div>
          )}
        </div>

        {/* Section 4: Preferences & Guardian Memory */}
        <div className="flex flex-col gap-3">
          {sectionDivider('⚙ PREFERENCES', Sliders, 'intelligence')}
          {expandedSections.intelligence && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="flex flex-col gap-2.5 overflow-hidden pt-1"
            >
              
              {/* EMOTIONALLY WARM CHECK-IN MEMORY */}
              <div className="p-4 bg-teal-950/15 border border-teal-500/10 rounded-2xl flex flex-col gap-3 relative overflow-hidden text-left">
                <div className="absolute -right-5 -bottom-5 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex justify-between items-start border-b border-white/5 pb-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase tracking-[0.25em] font-black text-amber-400 font-mono">Companion Memory Node</span>
                    <h4 className="text-xs font-black uppercase text-white tracking-tight mt-0.5">Active Safeguard Memory</h4>
                  </div>
                  <span className="text-[8.5px] font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                    Stable Connection
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center text-xs animate-float">
                    🐧
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] italic text-white/90 font-medium">Last check-in: Reached home safely? — 11 mins ago</span>
                    <span className="text-[9px] text-white/40 font-mono mt-0.5">Standard late-night corridor route logged successfully</span>
                  </div>
                </div>

                <div className="h-[1px] bg-white/5 w-full" />

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    "remembers safe contacts",
                    "remembers comfort tone",
                    "remembers walk habits"
                  ].map(m => (
                    <span key={m} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[8px] font-bold text-white/60 flex items-center gap-1 uppercase tracking-wide">
                      <Check size={9} className="text-amber-400" />
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferences list items */}
              <div className="flex flex-col gap-2">
                
                {/* Theme mode */}
                <button 
                  onClick={() => setDarkMode(!isDarkMode)}
                  className="w-full flex items-center justify-between p-3.5 bg-[#090D1E]/40 rounded-2xl border border-white/5 active:scale-[0.99] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-teal-400 shrink-0">
                      {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Theme Mode
                        <span className="text-[7.5px] uppercase bg-teal-500/15 text-teal-400 px-1 py-0.2 rounded border border-teal-500/10 font-mono">
                          {isDarkMode ? 'Night' : 'Day'}
                        </span>
                      </span>
                      <span className="text-[9px] text-white/40 mt-0.5">Quiet dark visual background selection.</span>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 shrink-0 ${isDarkMode ? 'bg-[#3BE0B9]' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-slate-950 rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* Energy & Power Performance */}
                <button 
                  onClick={() => setIsPerformanceSave(!isPerformanceSave)}
                  className="w-full flex items-center justify-between p-3.5 bg-[#090D1E]/40 rounded-2xl border border-white/5 active:scale-[0.99] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-teal-400 shrink-0">
                      <Zap size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Performance Save
                        <span className="text-[7.5px] uppercase bg-amber-500/15 text-amber-400 px-1 py-0.2 rounded border border-amber-500/10 font-mono">
                          {isPerformanceSave ? 'Saver' : 'Performance'}
                        </span>
                      </span>
                      <span className="text-[9px] text-white/40 mt-0.5">Optimizes battery lifetime mapping corridor logs.</span>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 shrink-0 ${isPerformanceSave ? 'bg-[#3BE0B9]' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-slate-950 rounded-full shadow-md transform transition-transform duration-300 ${isPerformanceSave ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* Voice Optimizer Dev Mode */}
                <button 
                  onClick={() => {
                    const nextVal = !isVoiceDevMode;
                    setIsVoiceDevMode(nextVal);
                    setDevModeEnabled(nextVal);
                  }}
                  className="w-full flex items-center justify-between p-3.5 bg-[#090D1E]/40 rounded-2xl border border-white/5 active:scale-[0.99] transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-teal-400 shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Voice Optimizer API Mode</span>
                      <span className="text-[9px] text-white/40 mt-0.5">Bypasses limits using custom browser speech synthesis.</span>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 shrink-0 ${isVoiceDevMode ? 'bg-[#3BE0B9]' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-slate-950 rounded-full shadow-md transform transition-transform duration-300 ${isVoiceDevMode ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

              </div>

            </motion.div>
          )}
        </div>

        {/* Section 5: Emergency & Alerts Automation */}
        <div className="flex flex-col gap-3">
          {sectionDivider('🔔 ALERTS & AUTOMATION', Bell, 'automation')}
          {expandedSections.automation && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="flex flex-col gap-2 overflow-hidden pt-1"
            >
              
              {/* Quick Panic Automations */}
              <div className="grid grid-cols-1 gap-2">
                
                {/* Automation 1: Triple Tap Power Button */}
                <button 
                  onClick={handleToggleTripleTap}
                  className="w-full flex items-center justify-between p-3 bg-[#090D1E]/40 rounded-xl border border-white/5 text-left active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tripleTapPower ? 'bg-amber-400/10 text-amber-400' : 'bg-white/5 text-white/40'}`}>
                      <Smartphone size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Triple Tap Power Button</span>
                      <span className="text-[9px] text-white/40">Quickly trigger active overwatch on device lockout.</span>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${tripleTapPower ? 'bg-[#3BE0B9]' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-slate-950 rounded-full shadow transform transition-transform duration-300 ${tripleTapPower ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* Automation 2: Shake Device to track */}
                <button 
                  onClick={handleToggleShakeDevice}
                  className="w-full flex items-center justify-between p-3 bg-[#090D1E]/40 rounded-xl border border-white/5 text-left active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${shakeDevice ? 'bg-amber-400/10 text-amber-400' : 'bg-white/5 text-white/40'}`}>
                      <Zap size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Shake Device to Track</span>
                      <span className="text-[9px] text-white/40">Start silent location snapshots on physical shaking.</span>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${shakeDevice ? 'bg-[#3BE0B9]' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-slate-950 rounded-full shadow transform transition-transform duration-300 ${shakeDevice ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* Automation 3: Long Press Volume */}
                <button 
                  onClick={handleToggleLongPressVolume}
                  className="w-full flex items-center justify-between p-3 bg-[#090D1E]/40 rounded-xl border border-white/5 text-left active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${longPressVolume ? 'bg-amber-400/10 text-amber-400' : 'bg-white/5 text-white/40'}`}>
                      <Sliders size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Long Press Volume Toggle</span>
                      <span className="text-[9px] text-white/40">Silently dispatch emergency alerts immediately.</span>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${longPressVolume ? 'bg-[#3BE0B9]' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-slate-950 rounded-full shadow transform transition-transform duration-300 ${longPressVolume ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* Optional Auto Updates: Settings Toggle */}
                <button 
                  onClick={() => setAutoStatusUpdates(!autoStatusUpdates)}
                  className="w-full flex items-center justify-between p-3 bg-[#090D1E]/40 rounded-xl border border-white/5 text-left active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${autoStatusUpdates ? 'bg-amber-400/10 text-amber-400' : 'bg-white/5 text-white/40'}`}>
                      <Sparkles size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Auto Status Updates</span>
                      <span className="text-[9px] text-white/40">Answering guardian requests with journey stats & battery status.</span>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${autoStatusUpdates ? 'bg-[#3BE0B9]' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-slate-950 rounded-full shadow transform transition-transform duration-300 ${autoStatusUpdates ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* Auto countdown escalation */}
                <div className="w-full flex items-center justify-between p-3 bg-[#090D1E]/40 rounded-xl border border-white/5 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAutoEscalationEnabled ? 'bg-[#3BE0B9]/10 text-[#3BE0B9]' : 'bg-white/5 text-white/40'}`}>
                      <Bell size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Auto-Escalate Countdown</span>
                      <span className="text-[9px] text-white/40">Alert contacts on unanswered verification timers.</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleAutoEscalationToggle}
                    className={`w-9 h-2.5 rounded-full bg-white/10 relative shrink-0 overflow-hidden`}
                    disabled
                  >
                    <div className={`w-4 h-4 bg-[#3BE0B9] rounded-full shadow absolute top-0.5 left-0.5`} />
                  </button>
                </div>

                {/* SOS Countdown Duration Selector */}
                <div className="w-full flex flex-col p-3 bg-[#090D1E]/40 rounded-xl border border-white/5 text-left gap-2">
                  <div className="flex items-center gap-2.5 justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#3BE0B9]/10 text-[#3BE0B9]">
                        <Clock size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">SOS Countdown Buffer</span>
                        <span className="text-[9px] text-white/40">Delay seconds before activating distress beacon.</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#3BE0B9]">{sosCountdownDuration}s</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {[5, 10, 15, 20].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setSosCountdownDuration(sec)}
                        className={`py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                          sosCountdownDuration === sec
                            ? 'bg-[#3BE0B9]/10 text-[#3BE0B9] border-[#3BE0B9]'
                            : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </motion.div>
          )}
        </div>

      </div>

      {/* PROTECTION TRANSPARENCY EXPLANATORY CONSOLE */}
      <AnimatePresence>
        {showTransparencyModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-[#030611]/90 backdrop-blur-xl overflow-y-auto">
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              className="w-full max-w-md glass border border-white/10 p-6 sm:p-8 rounded-[36px] shadow-2xl relative text-left my-8"
            >
              <div className="flex flex-col gap-6">
                
                {/* Embedded Mini Companion Reassurance */}
                <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
                  <div className="w-16 h-16 rounded-2xl bg-[#090D1E] border border-white/10 p-1 flex items-center justify-center relative flex-shrink-0">
                    <GuardianMascot 
                      mode="quiet" 
                      isListening={isAudioEvidenceEnabled} 
                      isSpeaking={false} 
                      isLateNight={true} 
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase tracking-[0.25em] font-black text-teal-400">Guardian Protocol</span>
                    <h4 className={`text-sm font-semibold tracking-tight ${textColor}`}>Attentive & Respectful</h4>
                    <p className={`text-[10px] leading-relaxed ${subTextColor} font-medium`}>
                      "I stay quietly present beside you. Your data belongs solely to you, kept offline and secure."
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-teal-500/15 text-teal-400 flex items-center justify-center border border-teal-500/10">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-display font-black tracking-tight ${textColor}`}>Protection Control</h3>
                      <p className={`text-[9px] uppercase tracking-widest font-black text-teal-400 mt-0.5`}>Privacy Safeguard Center</p>
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-white/5 w-full" />

                {/* SENSITIVITY AND ESCALATION CONTROLS (User Control Refinement) */}
                <div className="flex flex-col gap-4 bg-white/[0.01] border border-white/5 p-5 rounded-[24px]">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-teal-400/90 leading-none">Sensitivity Calibration</h4>
                  
                  {/* Slider */}
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center text-xs font-bold font-mono">
                      <span className={textColor}>Trigger Threshold: {sensitivity}%</span>
                      <span className={`text-[10px] tracking-widest uppercase font-black px-2 py-0.5 rounded-md ${
                        sensitivity < 55 ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
                        sensitivity <= 75 ? 'bg-teal-500/10 text-teal-400 border border-teal-500/10' :
                        'bg-slate-500/15 text-slate-400'
                      }`}>
                        {sensitivity < 55 ? 'Vigilant / Fast Trigger' :
                         sensitivity <= 75 ? 'Balanced Support' :
                         'Safe Relaxed Mode'}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="35" 
                      max="85" 
                      value={sensitivity} 
                      onChange={(e) => handleSensitivityChange(parseInt(e.target.value, 10))}
                      className="w-full accent-teal-400 opacity-80 hover:opacity-100 transition-opacity bg-white/10 h-1 rounded-lg cursor-pointer"
                    />
                    <p className={`text-[10.5px] leading-relaxed ${subTextColor} mt-1 font-medium`}>
                      {sensitivity < 55 ? 'Guardian operates on alert, keeping watch and preserving safety details quickly at minor deviations.' :
                       sensitivity <= 75 ? 'Default configuration matching standard physical security and support metrics.' :
                       'Bypasses minor details, securing companion safety snapshots only during severe emergency steps.'}
                    </p>
                  </div>

                  <div className="h-[1px] bg-white/5 my-1" />

                  {/* Auto-Lock / Auto-Escalation Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left gap-0.5 pr-6">
                      <span className={`text-xs font-bold ${textColor}`}>Auto-Escalate Emergency</span>
                      <span className={`text-[9.5px] ${subTextColor} leading-relaxed`}>
                        Allow autonomous contact alerts if countdown timers expire unanswered.
                      </span>
                    </div>
                    <button 
                      onClick={handleAutoEscalationToggle}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-300 flex-shrink-0 ${isAutoEscalationEnabled ? 'bg-teal-500' : 'bg-white/10'}`}
                    >
                      <div className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-all duration-300 ${isAutoEscalationEnabled ? 'translate-x-4.5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* EMOTIONALLY REASSURING ACCESS LIST */}
                <div className="flex flex-col gap-3 font-mono text-[10px] tracking-tight leading-relaxed">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Guaranteed Information Measures</span>
                  
                  {/* Access Item 1 */}
                  <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span className="text-white font-extrabold uppercase">1. Space Geolocation</span>
                    </div>
                    <p className="text-white/60 pl-3 leading-relaxed">
                      "Location helps me support emergency protection when needed." Coordinates trace local corridors, mapping safety nodes. Standby routes are never compiled or saved.
                    </p>
                  </div>

                  {/* Access Item 2 */}
                  <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span className="text-white font-extrabold uppercase">2. Acoustic Presence</span>
                    </div>
                    <p className="text-white/60 pl-3 leading-relaxed">
                      "Microphone access helps me stay present with you." I parse audio streams strictly local on your device to listen for safewords. Ambient data is never recorded out of trigger blocks.
                    </p>
                  </div>

                  {/* Access Item 3 */}
                  <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span className="text-white font-extrabold uppercase">3. Video/Camera Evidence</span>
                    </div>
                    <p className="text-white/60 pl-3 leading-relaxed">
                      "If something ever feels wrong, I can preserve important details for you." Keeps a quiet record securely stored if things scale critical.
                    </p>
                  </div>
                </div>

                {/* PRIVACY METRIC GUARANTEES */}
                <div className="flex items-center gap-2 p-3.5 bg-teal-500/5 rounded-2xl border border-teal-500/10 text-[9px] font-mono leading-relaxed text-teal-400/90">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse flex-shrink-0" />
                  <span>
                    <strong>Zero Remote Surveillance:</strong> Zero cloud servers parse your snapshots. All emergency packages reside in private application cache on-device and format on disarm.
                  </span>
                </div>

                <div className="flex flex-col gap-3.5 mt-2">
                  <button 
                    onClick={() => {
                      setIsSilentEvidenceConsentAcknowledged(true);
                      setShowTransparencyModal(false);
                    }}
                    className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-[#030611] font-black uppercase tracking-widest text-xs rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/15"
                  >
                    <Check size={14} strokeWidth={2.5} />
                    Confirm Calibration & Sync
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SNAPSHOT INTERACTIVE VIEW MODAL LIGHTBOX */}
      <AnimatePresence>
        {selectedSnapshotId && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-[#030611]/90 backdrop-blur-xl">
            {(() => {
              const snap = evidenceSnapshots.find(s => s.id === selectedSnapshotId);
              if (!snap) return null;
              return (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md flex flex-col gap-4 text-left"
                >
                  <div className="flex justify-between items-center px-1">
                    <div className="flex flex-col">
                      <span className="text-teal-400 font-extrabold tracking-widest text-[8.5px] uppercase font-mono">[{snap.timestamp}] SECURE RECORD</span>
                      <h4 className={`text-base font-display font-bold ${textColor}`}>{snap.reason}</h4>
                    </div>
                    <button 
                      onClick={handleCloseLightbox}
                      className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full transition-all"
                    >
                      <LogOut size={14} className="rotate-180" />
                    </button>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-black aspect-[4/3] relative">
                    <img 
                      src={snap.imageUrl} 
                      alt="Telemetry Close Look" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {snap.audioUrl && (
                    <div className="glass p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePlayAudio(snap.id, snap.audioUrl!)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            playingAudioId === snap.id 
                              ? 'bg-teal-500 text-[#030611] scale-105 shadow-lg shadow-teal-500/25' 
                              : 'bg-white/5 border border-white/15 text-white hover:bg-white/10 active:scale-95'
                          }`}
                        >
                          {playingAudioId === snap.id ? <Pause size={14} className="fill-[#030611]" /> : <Play size={14} className="translate-x-[1px] fill-white" />}
                        </button>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              {playingAudioId === snap.id && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                              )}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${playingAudioId === snap.id ? 'bg-teal-400' : 'bg-slate-500'}`}></span>
                            </span>
                            {playingAudioId === snap.id ? 'Playing Preserved Audio...' : 'Quiet Audio Context Preserved'}
                          </span>
                          <span className="text-[9.5px] text-[#94a3b8] font-mono leading-none mt-1">
                            Segment • 3.0s | Secure PCM Data Stream
                          </span>
                        </div>
                      </div>
                      
                      {/* Subtle Simulated Waveform Bars */}
                      <div className="flex items-center gap-0.5 h-6 opacity-60">
                        {[0.3, 0.7, 0.4, 0.8, 0.5, 0.9, 0.6, 0.4, 0.8, 0.3].map((height, i) => {
                          const isPlaying = playingAudioId === snap.id;
                          return (
                            <motion.div
                              key={i}
                              animate={isPlaying ? {
                                height: [height * 4, height * 24, height * 4]
                              } : { height: height * 12 }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.8 + (i % 3) * 0.15,
                                ease: "easeInOut"
                              }}
                              className={`w-0.75 rounded-full ${isPlaying ? 'bg-teal-400' : 'bg-slate-600'}`}
                              style={{ height: height * 12 }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {snap.location ? (
                    <div className="glass p-4 rounded-xl font-mono text-[9px] text-[#94a3b8] border border-white/5 flex flex-col gap-1 leading-relaxed">
                      <p><span className="text-teal-400 font-extrabold">CORRIDOR FOCUS:</span> {snap.location[0].toFixed(5)}, {snap.location[1].toFixed(5)}</p>
                      <p><span className="text-teal-400 font-extrabold">ACCURACY SATELLITE METRIC:</span> ±12 Meters Locked</p>
                      <p><span className="text-teal-400 font-extrabold">CELL CHARGE VALUE:</span> {snap.battery}% Standard Capacity</p>
                    </div>
                  ) : (
                    <div className="glass p-4 rounded-xl font-mono text-[9px] text-[#94a3b8] border border-white/5 flex flex-col gap-1 leading-relaxed text-center">
                      <p className="text-red-400 font-extrabold uppercase">GPS SIGNAL LOCK PENDING</p>
                    </div>
                  )}
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>

      {/* Logout */}
      <button 
        onClick={async () => {
          await logout();
          navigate('/auth');
        }}
        className={`flex items-center justify-center gap-3 w-full py-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all shadow-xl bg-red-500/5 text-red-500 border border-[#E8452A]/10`}
      >
        <LogOut size={16} />
        <span>Terminate Session</span>
      </button>
    </div>
  );
}
