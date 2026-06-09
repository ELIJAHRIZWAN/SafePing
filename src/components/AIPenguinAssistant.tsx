import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, X, Compass, MapPin, Users, Shield, Phone } from "lucide-react";

import { speakWithElevenLabs, subscribeToVoiceState, stopSpeaking } from "../services/elevenlabsService";
import { useEmergency } from "../context/EmergencyContext";
import { useApp } from "../context/AppContext";
import listenerPenguin from "../assets/ANIMATIONS/listener_penguin.webm";
import speakingPenguin from "../assets/ANIMATIONS/speaking penguin.webm";

interface AIPenguinAssistantProps {
  isEmergency?: boolean;
  location?: any;
  safeHeading?: number;
}

export default function AIPenguinAssistant({
  location,
  safeHeading,
}: AIPenguinAssistantProps) {

  const {
    emergencyState,
    setEmergencyState,
    guardianAlert,
    setGuardianAlert,
    isEscalated,
    setIsEscalated,
    isUserSafe,
    setIsUserSafe,
    addIncidentLog,
    isFullyDispatched,
    setIsFullyDispatched,
    setSessionStartTime,
    setEscalationCount,
    setDeviationCount,
    threatScore,
    setThreatScore,
  } = useEmergency();

  const {
    isEmergencyActive,
    triggerSOS,
    user,
    isWalkWithMeActive,
    penguinMessage,
    isStayWithMeActive,
    setStayWithMeActive,
    isQuietMode,
    setQuietMode,
    guardianMode,
    setGuardianMode,
    isTyping,
    isBreathingGlow,
    setIsBreathingGlow,
    userAnxietyActive,
    handleChipResponse,
    handleUserChatSent,
    batteryLevel,
    triggerPhrase
  } = useApp();

  const currentHour = new Date().getHours();
  const isLateNight = currentHour >= 22 || currentHour < 5;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isGuardianOpen, setIsGuardianOpen] = useState(false);
  const [hasUserActivated, setHasUserActivated] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  
  // Real-time voice states with live transcription details
  const recognitionRef = useRef<any>(null);
  const isRecognizingRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isListeningRef = useRef(false);
  const isExpandedRef = useRef(false);
  const isGuardianOpenRef = useRef(false);
  const hasUserActivatedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);

  const [liveTranscript, setLiveTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [micState, setMicState] = useState<"idle" | "listening" | "thinking" | "speaking" | "error">("idle");

  // Keep state-referencing refs in sync with actual react state to prevent duplicate/race effects
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  useEffect(() => {
    isGuardianOpenRef.current = isGuardianOpen;
  }, [isGuardianOpen]);

  useEffect(() => {
    hasUserActivatedRef.current = hasUserActivated;
  }, [hasUserActivated]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const [currentMessage, setCurrentMessage] = useState(
    user?.name 
      ? `Hey ${user.name.split(' ')[0]} 👋 Where are we heading today?` 
      : "Hey there! 👋 Where are we heading today?"
  );
  
  // Real-time synchronization of companion bubble messages during companion guide sessions
  useEffect(() => {
    if (isStayWithMeActive && penguinMessage && isGuardianOpen) {
      setCurrentMessage(penguinMessage);
    }
  }, [penguinMessage, isStayWithMeActive, isGuardianOpen]);

  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [warningCount, setWarningCount] = useState(0);
  const activeScreenContextRef = useRef<string>("");

  const [subtextIndex, setSubtextIndex] = useState(0);
  const subtextPhrases = React.useMemo(() => [
    "How can I help today?",
    "Need anything?",
    "Let's make sure you're safe."
  ], []);

  useEffect(() => {
    if (!isExpanded) return;
    const interval = setInterval(() => {
      setSubtextIndex(prev => (prev + 1) % subtextPhrases.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isExpanded, subtextPhrases]);

  // Silent chat and action state hooks
  const [quietText, setQuietText] = useState("");
  const [isFocussed, setIsFocussed] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [fakeCallStatus, setFakeCallStatus] = useState<"ringing" | "connected" | "ended">("ringing");
  const [fakeCallTime, setFakeCallTime] = useState(0);

  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Ringtone generator
  const playFakeCallRingtone = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playPulse = () => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 2.0);
        osc2.stop(ctx.currentTime + 2.0);
      };
      
      playPulse();
      const interval = setInterval(() => {
        playPulse();
      }, 3500);
      
      ringtoneIntervalRef.current = interval as any;
    } catch (e) {
      console.warn("Fake Call Ringtone blocked:", e);
    }
  };

  const stopFakeCallRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (showFakeCall && fakeCallStatus === "connected") {
      timer = setInterval(() => {
        setFakeCallTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showFakeCall, fakeCallStatus]);

  useEffect(() => {
    return () => {
      stopFakeCallRingtone();
    };
  }, []);

  const handleCloseCompanion = () => {
    setIsExpanded(false);
    setIsGuardianOpen(false);
    setHasUserActivated(false);

    // Abort any ongoing Gemini API fetch requests
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (err) {
        console.warn("abortController abort error:", err);
      }
      abortControllerRef.current = null;
    }

    // 1. Fully disengage Walk With Me/Stay With Me state in AppContext
    if (setStayWithMeActive) {
      setStayWithMeActive(false);
    }

    // 2. Stop speech synthesis immediately
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (err) {
      console.warn("speechSynthesis cancel error:", err);
    }
    try {
      stopSpeaking();
    } catch (err) {
      console.warn("stopSpeaking error:", err);
    }

    // 3. Stop microphone listening & SpeechRecognition
    stopListeningSession();

    // 4. Cancel any pending responses or active animations
    setIsProcessing(false);
    setIsSpeaking(false);
    setIsListening(false);
    setMicState("idle");

    // 5. Clear all relevant timeouts & intervals
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 6. Stop any ongoing fake call
    setShowFakeCall(false);
    setFakeCallStatus("ended");
    stopFakeCallRingtone();
  };

  const handleChipAction = (id: string) => {
    playWebAudioChime();
    setIsGuardianOpen(true);
    setHasUserActivated(true);
    
    if (id === "stay") {
      setStayWithMeActive(true);
      const stayMsg = "I am holding watch closely now. We'll navigate together and I'll keep talking so you have background sound.";
      setCurrentMessage(stayMsg);
      speakWithElevenLabs(stayMsg, true);
      addIncidentLog("action", "Stay With Me Companion walk activated via Quick Chip.");
    } 
    else if (id === "calm") {
      setGuardianMode("calm");
      setQuietMode(false);
      const calmMsg = "I've settled my pace into Calm. Focus on taking steady, safe strides.";
      setCurrentMessage(calmMsg);
      speakWithElevenLabs(calmMsg, true);
      addIncidentLog("action", "Guardian shifted to Calm Mode via Quick Chip.");
    } 
    else if (id === "silent") {
      setQuietMode(true);
      setGuardianMode("quiet");
      const silentMsg = "Entering Silent Overwatch. All speech suppressed. I'll glow calmly to guide you.";
      setCurrentMessage(silentMsg);
      setIsBreathingGlow(true);
      setTimeout(() => setIsBreathingGlow(false), 4000);
      addIncidentLog("action", "Silent Overwatch enabled via Quick Chip.");
    } 
    else if (id === "fake_call") {
      addIncidentLog("action", "Simulating incoming protective telephone call requested.");
      setShowFakeCall(true);
      setFakeCallStatus("ringing");
      setFakeCallTime(0);
      playFakeCallRingtone();
    } 
    else if (id === "home") {
      setStayWithMeActive(true);
      const routeMsg = "Secure route mapped. Green corridor illuminated on your map. Let's make our way home safely.";
      setCurrentMessage(routeMsg);
      speakWithElevenLabs(routeMsg, true);
      addIncidentLog("action", "Get Me Home secure path alignment established.");
    }
  };

  // Synchronized de-escalation: When emergency active is cleared, reset warning count to 0
  useEffect(() => {
    if (!isEscalated && !isEmergencyActive && warningCount > 0) {
      setWarningCount(0);
    }
  }, [isEscalated, isEmergencyActive, warningCount]);

  // Auto-reset when emergency system disarms to idle
  useEffect(() => {
    if (emergencyState === 'idle') {
      setWarningCount(0);
      if (!isStayWithMeActive) {
        const greeting = user?.name ? `Hello ${user.name}. I am Pen, ready to watch over you. 🐧` : "Hello. I am Pen, ready to watch over you. 🐧";
        setCurrentMessage(greeting);
        setIsExpanded(false);
      }
    }
  }, [emergencyState, user, isStayWithMeActive]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [testHeading, setTestHeading] = useState(0);
  const lastWarningTime = useRef(0);

  // Sync isProcessing with micState
  useEffect(() => {
    if (isProcessing) {
      setMicState("thinking");
    }
  }, [isProcessing]);

  // Synchronize component speaking state with the central voice system and handle continuous dialogue
  useEffect(() => {
    const unsubscribe = subscribeToVoiceState((speakingState) => {
      setIsSpeaking(speakingState);
      if (speakingState) {
        setMicState("speaking");
        // Pause active speech recognition during voice output to avoid loop-back feedback
        stopListeningSession();
      } else {
        // Voice response concluded. Auto-re-engage conversation if dock is still open!
        if (isExpandedRef.current && isGuardianOpenRef.current && !isListeningRef.current && !isProcessingRef.current) {
          triggerSafeRestart();
        }
      }
    });
    return () => {
      unsubscribe();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  // Keep assistant updated on unmount or suspension
  useEffect(() => {
    if (!isExpanded || !isGuardianOpen) {
      stopListeningSession();
      setLiveTranscript("");
      setErrorMessage("");
    }
  }, [isExpanded, isGuardianOpen]);

  useEffect(() => {
    return () => {
      stopListeningSession();
      stopSpeaking();
    };
  }, []);

  // Simulating movement
  useEffect(() => {
    const interval = setInterval(() => {
      setTestHeading(Math.floor(Math.random() * 360));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Wrong direction detection
  useEffect(() => {
    if (!isStayWithMeActive && !isEmergencyActive) {
      if (warningCount > 0) {
        setWarningCount(0);
      }
      return;
    }
    if (warningCount >= 4 || isEscalated) return;

    const currentHeading = location?.heading ?? testHeading;
    const safeValue = safeHeading || 0;

    const difference =
      Math.abs((currentHeading - safeValue + 180) % 360 - 180);

    const now = Date.now();

    if (
      Math.abs(difference) > 45 &&
      now - lastWarningTime.current > 12000 // gentle 12s cooldown
    ) {
      lastWarningTime.current = now;

      setWarningCount((prev) => {
        const next = prev + 1;
        if (next > 3) return prev; 
        return next;
      });
      
      // Layered confidence: route deviation builds threat confidence gradually
      setThreatScore((prev) => Math.min(100, prev + 15));
    }
  }, [testHeading, location, safeHeading, warningCount, isEscalated]);

  // Escalation action warning logs and message cues
  useEffect(() => {
    if (warningCount > 0 && isGuardianOpen) {
      setIsExpanded(true);
    }
  }, [warningCount, isGuardianOpen]);

  useEffect(() => {
    if (!isGuardianOpen) return;
    if (warningCount === 0 || warningCount > 3) return;

    if (warningCount === 1) {
      const msg = "Hey... you're moving away from the safe heading corridor.";
      setCurrentMessage(msg);
      if (guardianMode !== 'quiet') {
        speakWithElevenLabs(msg, true);
      } else {
        // Quiet mode: silent breath glow instead of speech
        setIsBreathingGlow(true);
        setTimeout(() => setIsBreathingGlow(false), 4500);
      }
      addIncidentLog("deviation", "Gently adjusting alignment: User stepped away from the safe heading corridor.");
      setDeviationCount(prev => prev + 1);
    } else if (warningCount === 2) {
      const msg = "I noticed repeated deviations... let's stay focused on the route.";
      setCurrentMessage(msg);
      if (guardianMode !== 'quiet') {
        speakWithElevenLabs(msg, true);
      } else {
        // Quiet mode: silent breath glow instead of speech
        setIsBreathingGlow(true);
        setTimeout(() => setIsBreathingGlow(false), 4500);
      }
      addIncidentLog("deviation", "Attentive tracking: Repeated steps registered outside our safe corridor.");
      setDeviationCount(prev => prev + 1);
    } else if (warningCount === 3) {
      const msg = "Hey... are you doing okay? I'm preparing your safety contacts. You're not alone in this.";
      setCurrentMessage(msg);
      speakWithElevenLabs(msg, true);
      addIncidentLog("deviation", "High Alert: Requesting quiet check-in, keeping safety contacts close on standby.");
      setDeviationCount(prev => prev + 1);

      // Auto escalation trigger
      const escalationTimer = setTimeout(() => {
        setGuardianAlert(true);
        setIsEscalated(true);
        setIsUserSafe(false);
        setEmergencyState('escalating');
        setEscalationCount(prev => prev + 1);

        const emergencyMsg = "I want to reach someone you trust so we can stay surrounded by care. I've sent quiet updates to your safety circle.";
        setCurrentMessage(emergencyMsg);
        speakWithElevenLabs(emergencyMsg, true);
        addIncidentLog("escalation", "Increased watch triggered: Safety check-in timed out. Shared live companion status to safety circle.");

        setWarningCount(4);
      }, 9000);

      return () => clearTimeout(escalationTimer);
    }
  }, [warningCount, isGuardianOpen, guardianMode]);

  // Synthesize a beautiful, premium, two-tone chime using clean Web Audio oscillators
  const playWebAudioChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      // E5 (659.25 Hz) and B5 (987.77 Hz) - a soaring, secure perfect fifth interval
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(987.77, ctx.currentTime);

      // Volume envelope for smooth, sparkling release
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.06);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.82);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);

      osc1.stop(ctx.currentTime + 0.9);
      osc2.stop(ctx.currentTime + 0.9);
    } catch (e) {
      console.warn("Chime Web Audio playback blocked or unsupported:", e);
    }
  };

  // Initialize Audio
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Web Speech recognition function for charming hands-free control flow
  function startListeningSession() {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorMessage("Microphone paused");
      setMicState("error");
      return;
    }

    // Guard: Prevent duplicate start if already recognizing, thinking, or speaking
    if (isRecognizingRef.current || isProcessingRef.current || isSpeakingRef.current) {
      return;
    }

    // Cancel any pending automatic restart timers
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    // Clean up previous instance explicitly by removing callbacks before abort
    if (recognitionRef.current) {
      try {
        const oldRec = recognitionRef.current;
        oldRec.onstart = null;
        oldRec.onresult = null;
        oldRec.onerror = null;
        oldRec.onend = null;
        oldRec.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    setLiveTranscript("");
    setErrorMessage("");

    if (!navigator.onLine) {
      setErrorMessage("Check your internet connection.");
      setMicState("error");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.lang = "en-US";
      recognition.interimResults = true;

      recognition.onstart = () => {
        isRecognizingRef.current = true;
        setIsListening(true);
        setMicState("listening");
        setLiveTranscript("");
        stopSpeaking(); // stop any speaking when user begins speaking
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript && finalTranscript.trim()) {
          setLiveTranscript(finalTranscript);
          // Let's stop listening before submit to avoid overlapping session issues
          stopListeningSession();
          handleChatSubmit(finalTranscript);
        } else if (interimTranscript) {
          setLiveTranscript(interimTranscript);
        }
      };

      recognition.onerror = (err: any) => {
        // Silently capture aborted error without UX alerts or console floods
        if (err.error === "aborted") {
          console.log("Speech recognition session aborted silently.");
          return;
        }

        console.warn("Speech recognition error:", err.error);
        if (err.error === "not-allowed") {
          setErrorMessage("Microphone permission denied.");
          setMicState("error");
          speakWithElevenLabs("Microphone access is needed for hands-free talk. Please check browser settings.", true);
        } else if (err.error === "network") {
          setErrorMessage("Check your internet connection.");
          setMicState("error");
        } else if (err.error === "no-speech") {
          // Restart gently after delay, preventing loops
          console.log("No speech heard, restarting listening with delay...");
          triggerSafeRestart();
        } else {
          setErrorMessage("Listening stopped");
          setMicState("error");
        }
      };

      recognition.onend = () => {
        isRecognizingRef.current = false;
        setIsListening(false);
        if (micState === "listening") {
          setMicState("idle");
        }
      };

      isRecognizingRef.current = true;
      recognition.start();
    } catch (e: any) {
      console.error("Failed to start SpeechRecognition:", e);
      isRecognizingRef.current = false;
      setIsListening(false);
      setMicState("idle");
    }
  }

  function stopListeningSession() {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        const rec = recognitionRef.current;
        // Nullify listener callbacks to avoid triggering state changes/restarts during cleanup
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    isRecognizingRef.current = false;
    setIsListening(false);
    if (micState === "listening" || micState === "idle") {
      setMicState("idle");
    }
  }

  function triggerSafeRestart() {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    restartTimeoutRef.current = setTimeout(() => {
      if (isExpandedRef.current && isGuardianOpenRef.current && !isListeningRef.current && !isProcessingRef.current && !isSpeakingRef.current && !isRecognizingRef.current) {
        startListeningSession();
      }
    }, 1000); // stable 1s delay to prevent infinite loops and let Web Speech close fully
  }

  function handleMicrophoneToggle() {
    if (isListening || isRecognizingRef.current) {
      stopListeningSession();
    } else {
      startListeningSession();
    }
  }

  // Safe server-side Gemini chat interaction
  const handleChatSubmit = async (textToSend?: string) => {
    const rawMsg = textToSend || inputMessage;
    if (!rawMsg.trim() || isProcessing) return;

    const userQuery = rawMsg.trim();
    setInputMessage("");
    setIsProcessing(true);
    setMicState("thinking");
    setCurrentMessage("..."); // thinking delay!

    handleUserChatSent(userQuery);

    const updatedHistory = [...chatHistory, { role: "user" as const, text: userQuery }];
    setChatHistory(updatedHistory);

    const isSafeWord = userQuery.toLowerCase().includes(triggerPhrase.toLowerCase()) && triggerPhrase.trim().length > 2;
    if (isSafeWord) {
      setTimeout(async () => {
        const responses = [
          "Okay… I’m staying very close with you.",
          "I understand. I am paying extra attention now.",
          "I'm keeping watch closely now. We are okay."
        ];
        const botResponse = responses[Math.floor(Math.random() * responses.length)];
        setCurrentMessage(botResponse);
        setChatHistory(prev => [...prev, { role: "assistant" as const, text: botResponse }]);
        setIsProcessing(false);
        try {
          const withReplyHistory = [...updatedHistory, { role: "assistant" as const, text: botResponse }];
          localStorage.setItem("safeping_guardian_chat_history", JSON.stringify(withReplyHistory));
        } catch (e) {}
        await speakWithElevenLabs(botResponse, true);
        addIncidentLog("action", `[Safe Phrase Detected] Private safety overwatch triggered: "${userQuery}"`);
      }, 1000);
      return;
    }

    // Call server Gemini endpoint with a timeout handler
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 9500);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: userQuery,
          history: updatedHistory,
          userName: user?.name || "",
          locationState: location || {},
          emergencyState: emergencyState,
          isEmergency: isEmergencyActive,
          isWalkWithMeActive: isWalkWithMeActive,
          warningCount: warningCount,
          batteryLevel: batteryLevel,
          currentScreenContext: activeScreenContextRef.current || "",
          guardianMode: guardianMode,
          isStayWithMeActive: isStayWithMeActive,
          threatScore: threatScore,
          localHour: new Date().getHours()
        })
      });

      clearTimeout(timeoutId);

      // Guard: if closed or reset in the meantime, drop everything and exit without speaking or state updates
      if (!isGuardianOpenRef.current) {
        return;
      }

      if (!response.ok) {
        throw new Error("Gemini server endpoint failed");
      }

      const data = await response.json();
      const botResponse = data.reply;

      setCurrentMessage(botResponse);
      setChatHistory(prev => [...prev, { role: "assistant" as const, text: botResponse }]);

      try {
        const memoryRecord = {
          userName: user?.name || "Friend",
          timestamp: Date.now(),
          lastEscortLine: botResponse
        };
        localStorage.setItem("safeping_guardian_chat_history", JSON.stringify(updatedHistory));
        localStorage.setItem("safeping_guardian_memory", JSON.stringify(memoryRecord));
      } catch (e) {}

      // Automatically speak browser SpeechSynthesis (initially calm/soft voice via speakWithElevenLabs delegation)
      await speakWithElevenLabs(botResponse, true);

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Guard: if closed or reset in the meantime, drop everything and exit
      if (!isGuardianOpenRef.current) {
        return;
      }

      console.error("Assistant chat error:", error);
      
      let fallback = "I'm right here checking in. Deep breath... let's keep headed home.";
      
      if (error.name === "AbortError") {
        fallback = "I wasn't able to reach the network in time, but I'm still right here with you.";
        setErrorMessage("Gemini timeout.");
        setMicState("error");
      } else {
        setErrorMessage("Network timeout.");
        setMicState("error");
      }

      setCurrentMessage(fallback);
      await speakWithElevenLabs(fallback, true);
    } finally {
      if (isGuardianOpenRef.current) {
        setIsProcessing(false);
      }
    }
  };

  // Listen for global and custom events to toggle the assistant view
  useEffect(() => {
    const handleOpen = (e?: Event) => {
      setIsExpanded(true);
      setIsGuardianOpen(true);
      setHasUserActivated(true);
      
      // Play local Web Audio chime synthesizer
      playWebAudioChime();

      const customEvent = e as CustomEvent;
      const detailContext = customEvent?.detail?.context || "";
      const customText = customEvent?.detail?.initialText || "";

      // Store the screen context in the ref
      activeScreenContextRef.current = detailContext;

      // Read welcoming greeting aloud immediately when companion opens so the user can hear it!
      const userNameOnly = user?.name ? user.name.split(' ')[0] : "friend";
      const greetingText = customText || `Hey ${userNameOnly}! Where are we heading today?`;
      
      setCurrentMessage(greetingText);
      speakWithElevenLabs(greetingText, true).catch((e) => console.warn(e));

      // Re-initialize a listening hands-free session with a safe throttle delay
      triggerSafeRestart();
    };
    const handleClose = () => {
      handleCloseCompanion();
    };
    window.addEventListener('open-penguin-assistant', handleOpen);
    window.addEventListener('close-penguin-assistant', handleClose);
    return () => {
      window.removeEventListener('open-penguin-assistant', handleOpen);
      window.removeEventListener('close-penguin-assistant', handleClose);
    };
  }, []);

  // Truncated transcript selector showing short reassuring status text
  const transcriptLine = React.useMemo(() => {
    if (errorMessage) {
      if (errorMessage.toLowerCase().includes("denied") || errorMessage.toLowerCase().includes("permission")) {
        return "Microphone paused";
      }
      return "Listening stopped";
    }
    if (isProcessing) {
      return "Thinking...";
    }
    if (isListening) {
      return liveTranscript || "I'm listening...";
    }
    if (currentMessage) {
      // Shorten default welcome/stay with me prompt
      if (currentMessage.includes("Click Stay With Me") || currentMessage.includes("begins a calm companion walk") || currentMessage.includes("ready to accompany you")) {
        return "I'm right here with you.";
      }
      if (currentMessage.length > 36) {
        const boundary = currentMessage.match(/[,.!?]/);
        if (boundary && boundary.index !== undefined && boundary.index > 5 && boundary.index < 35) {
          return currentMessage.substring(0, boundary.index + 1);
        }
        return currentMessage.substring(0, 34) + "...";
      }
      return currentMessage;
    }
    return "I'm here.";
  }, [currentMessage, isProcessing, isListening, liveTranscript, errorMessage]);

  // Visual text overlay status subheader
  const stateLabel = React.useMemo(() => {
    if (errorMessage) {
      return "TAP MASCOT TO CONTINUE";
    }
    if (isListening) return "LISTENING HANDS-FREE";
    if (isProcessing) return "THINKING";
    if (isSpeaking) return "GUARDIAN SPEAKING";
    return "GUARDIAN COMPANION";
  }, [isListening, isProcessing, isSpeaking, errorMessage]);

  const activeContextualActions = React.useMemo(() => {
    const textToAnalyze = (
      (liveTranscript || "") + " " + 
      (currentMessage || "") + " " + 
      (chatHistory && chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].text : "")
    ).toLowerCase();

    const actions = [];
    
    if (textToAnalyze.includes("home") || textToAnalyze.includes("journey") || textToAnalyze.includes("walk") || textToAnalyze.includes("heading") || textToAnalyze.includes("navigate") || textToAnalyze.includes("way")) {
      actions.push({ id: "start_journey", label: "Start Journey", icon: Compass });
    }
    if (textToAnalyze.includes("locat") || textToAnalyze.includes("share") || textToAnalyze.includes("where") || textToAnalyze.includes("coordinate") || textToAnalyze.includes("gps") || textToAnalyze.includes("map")) {
      actions.push({ id: "share_location", label: "Share Location", icon: MapPin });
    }
    if (textToAnalyze.includes("circle") || textToAnalyze.includes("notify") || textToAnalyze.includes("guardian") || textToAnalyze.includes("group") || textToAnalyze.includes("people")) {
      actions.push({ id: "notify_circle", label: "Notify Circle", icon: Users });
    }
    if (textToAnalyze.includes("sos") || textToAnalyze.includes("emergenc") || textToAnalyze.includes("unsafe") || textToAnalyze.includes("danger") || textToAnalyze.includes("threat") || textToAnalyze.includes("help") || textToAnalyze.includes("alert")) {
      actions.push({ id: "open_sos", label: "Open SOS", icon: Shield });
    }
    if (textToAnalyze.includes("call") || textToAnalyze.includes("phone") || textToAnalyze.includes("contact") || textToAnalyze.includes("mom") || textToAnalyze.includes("mother")) {
      actions.push({ id: "call_contact", label: "Contact Mother", icon: Phone });
    }

    return actions;
  }, [liveTranscript, currentMessage, chatHistory]);

  const handleExtendedChipAction = (id: string) => {
    playWebAudioChime();
    setIsGuardianOpen(true);
    setHasUserActivated(true);

    if (id === "traveling") {
      setStayWithMeActive(true);
      setGuardianMode("protect");
      const travelMsg = "Traveling Alone mode activated. I'm on high protective alert, watching your route block by block.";
      setCurrentMessage(travelMsg);
      speakWithElevenLabs(travelMsg, true);
      addIncidentLog("action", "Traveling Alone companion escort mode activated.");
    } 
    else if (id === "advice") {
      const adviceMsg = "If you feel followed: Head towards a lit area, stay on the line with me, and look for a nearby Safe Haven.";
      setCurrentMessage(adviceMsg);
      speakWithElevenLabs(adviceMsg, true);
    } 
    else if (id === "share_loc") {
      addIncidentLog("action", "Elijah shared a live GPS coordinate check-in with trusted guardians.");
      const shareMsg = "I've published your live coordinates to your trusted circle. They can see you.";
      setCurrentMessage(shareMsg);
      speakWithElevenLabs(shareMsg, true);
    } 
    else if (id === "unsafe") {
      setThreatScore(70);
      setGuardianAlert(true);
      setIsUserSafe(false);
      setEmergencyState('preparing');
      const unsafeMsg = "I hear you... I'm immediately alerting your trusted circle and preparing an emergency standby.";
      setCurrentMessage(unsafeMsg);
      speakWithElevenLabs(unsafeMsg, true);
      addIncidentLog("escalation", "User reported feeling unsafe. Preparing emergency stand-by logs.");
    }
  };

  const handleQuickActionClick = (id: string) => {
    playWebAudioChime();
    setIsGuardianOpen(true);
    setHasUserActivated(true);

    if (id === "start_journey") {
      setStayWithMeActive(true);
      const startMsg = "Overwatch active. Mapped custom corridor. I'm holding watch block by block.";
      setCurrentMessage(startMsg);
      speakWithElevenLabs(startMsg, true);
      addIncidentLog("action", "Stay With Me secure path overwatch journey started.");
    } 
    else if (id === "share_location") {
      addIncidentLog("action", "Elijah shared a live GPS coordinate check-in with trusted guardians.");
      const shareMsg = "Your secure GPS location check-in has been shared with your trusted circle.";
      setCurrentMessage(shareMsg);
      speakWithElevenLabs(shareMsg, true);
    } 
    else if (id === "notify_circle") {
      addIncidentLog("action", "Elijah alerted trusted circles of live overwatch safety status.");
      const notifyMsg = "Done. I've updated your circle that you are accompanied by Pen overwatch.";
      setCurrentMessage(notifyMsg);
      speakWithElevenLabs(notifyMsg, true);
    } 
    else if (id === "open_sos") {
      const sosMsg = "Emergency SOS protocol activated.";
      setCurrentMessage(sosMsg);
      speakWithElevenLabs(sosMsg, true);
      triggerSOS();
    } 
    else if (id === "call_contact") {
      addIncidentLog("action", "Elijah requested a simulated incoming safety phone call.");
      setShowFakeCall(true);
      setFakeCallStatus("ringing");
      setFakeCallTime(0);
      playFakeCallRingtone();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: "40%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: "30%", scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 210 }}
            className="fixed bottom-4 left-4 right-4 z-[100] mx-auto w-[calc(100%-32px)] max-w-sm bg-stone-950/20 backdrop-blur-2xl border border-white/[0.06] rounded-[24px] p-4 pb-5 shadow-[0_15px_40px_rgba(0,0,0,0.6)] text-white select-none pointer-events-auto flex flex-col gap-3.5 overflow-hidden"
          >
            {/* Header: Animated Mascot, Title, and State Indicator */}
            <div className="flex items-center justify-between w-full relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center p-0.5 overflow-visible flex-shrink-0">
                  {/* Gentle soundwave circular pulse rings emerging from Pen when listening */}
                  {(isListening || micState === "listening") && (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.6, 2.2], opacity: [0.6, 0.3, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border border-teal-400/30"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1.8], opacity: [0.5, 0.2, 0] }}
                        transition={{ duration: 1.8, delay: 0.4, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border border-teal-500/20"
                      />
                    </>
                  )}
                  
                  <motion.div 
                    animate={{ scale: [1, 1.025, 1] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full h-full relative flex items-center justify-center overflow-hidden rounded-full"
                  >
                    <video
                      key={micState === "speaking" || isSpeaking ? 'speaking' : 'listening'}
                      src={micState === "speaking" || isSpeaking ? speakingPenguin : listenerPenguin}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-tight flex items-center gap-1 font-sans text-white/95">
                    Pen
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1DBB8A] animate-pulse" />
                  </h3>
                  <p className="text-[8.5px] text-white/40 uppercase font-mono tracking-wider font-extrabold leading-none mt-0.5">
                    {isListening || micState === "listening" 
                      ? "Listening" 
                      : isProcessing || micState === "thinking" 
                        ? "Thinking" 
                        : isSpeaking || micState === "speaking" 
                          ? "Speaking" 
                          : "Ready to help"}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleCloseCompanion();
                }}
                aria-label="Close Pen"
                className="w-8 h-8 rounded-full border border-white/5 bg-white/[0.03] flex items-center justify-center hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer relative z-10"
              >
                <X size={14} className="text-white/60" />
              </button>
            </div>

            {/* Floating Transcript Area (No bubbles, lightweight, 2-3 lines max) */}
            <div className="flex flex-col items-center justify-center min-h-[58px] px-2 text-center transition-all duration-300 relative z-10 leading-normal">
              {isListening || micState === "listening" ? (
                <div className="space-y-1 py-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-rose-400/80">YOU</span>
                  <p className="text-xs md:text-sm font-medium text-white/90 italic">
                    {liveTranscript ? `"${liveTranscript}"` : "Go ahead, speak to Pen..."}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-white/30">PEN</span>
                  <p className="text-xs md:text-sm font-semibold text-white/90 drop-shadow-sm">
                    {isProcessing || micState === "thinking" 
                      ? "Thinking..." 
                      : currentMessage ? `${currentMessage}` : "I am safeguarding in the background. Tap to speak or type."}
                  </p>
                </div>
              )}
            </div>

            {/* Siri style merged text input and Voice Button line */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (quietText.trim()) {
                  handleChatSubmit(quietText);
                  setQuietText("");
                }
              }}
              className={`w-full flex items-center gap-3 bg-white/[0.01] border rounded-full px-3.5 py-1.5 transition-all duration-200 relative z-10 ${
                isFocussed 
                  ? "border-white/15 bg-white/[0.04]" 
                  : "border-white/[0.05]"
              }`}
            >
              <input
                type="text"
                value={quietText}
                onChange={(e) => setQuietText(e.target.value)}
                onFocus={() => setIsFocussed(true)}
                onBlur={() => setIsFocussed(false)}
                placeholder="Type quietly..."
                className="flex-1 bg-transparent border-none text-[12.5px] font-semibold text-white placeholder-white/30 focus:outline-none focus:ring-0 p-0 leading-normal"
              />
              
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleMicrophoneToggle();
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 relative cursor-pointer flex-shrink-0 ${
                  isListening || micState === "listening"
                    ? "bg-red-500/20 text-red-100 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    : "bg-[#3BE0B9]/15 text-[#3BE0B9] border border-[#3BE0B9]/30 hover:scale-[1.05]"
                }`}
                title={isListening ? "Stop listening" : "Speak hands-free"}
              >
                {isListening || micState === "listening" ? (
                  <>
                    <span className="absolute inset-0 rounded-full bg-red-500/10 animate-ping pointer-events-none" />
                    <MicOff size={14} className="relative z-10" />
                  </>
                ) : (
                  <Mic size={14} className="relative z-10" />
                )}
              </button>
              
              <button
                type="submit"
                disabled={!quietText.trim() || isProcessing}
                className={`p-1.5 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer flex-shrink-0 ${
                  quietText.trim() 
                    ? "text-[#3BE0B9] scale-105 active:scale-95" 
                    : "text-white/20 select-none"
                }`}
                title="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>

            {/* Quick Actions - Converted to clean Lucide icons and generated on text Context matches only */}
            {activeContextualActions.length > 0 && (
              <div className="w-full flex items-center justify-center gap-1.5 flex-wrap pt-0.5 relative z-10">
                {activeContextualActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={(e) => {
                        e.preventDefault();
                        handleQuickActionClick(action.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border border-white/[0.06] bg-white/[0.02] text-white/70 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer shadow-sm"
                    >
                      <Icon size={11} className="shrink-0 text-[#3BE0B9]" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Realistic Simulated Incoming/Connected Phone Call Screen Overlay */}
      <AnimatePresence>
        {showFakeCall && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-0 z-[200] bg-[#070B1F] text-white flex flex-col justify-between p-8 pb-16 select-none"
          >
            {/* Call Info details */}
            <div className="flex flex-col items-center mt-16 space-y-2">
              <span className="text-white/40 text-[9px] tracking-widest font-mono uppercase bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                GUARDIAN COMPANION
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight mt-4 text-center">
                Home Safety Dispatch
              </h2>
              <p className="text-emerald-400 font-semibold text-xs animate-pulse tracking-wide uppercase">
                {fakeCallStatus === "ringing" ? "Incoming Call" : "Call Connected"}
              </p>
              {fakeCallStatus === "connected" && (
                <span className="font-mono text-white/50 text-xs bg-white/5 px-2.5 py-0.5 rounded-md mt-1">
                  {Math.floor(fakeCallTime / 60)}:{(fakeCallTime % 60).toString().padStart(2, "0")}
                </span>
              )}
            </div>

            {/* Simulated Mascot / Interacting Waves */}
            <div className="flex flex-col items-center justify-center my-auto space-y-6">
              <div className="relative w-28 h-28 rounded-full bg-[#111A34] border border-[#3BE0B9]/30 flex items-center justify-center p-4 shadow-[0_0_50px_rgba(59,224,185,0.06)]">
                <AnimatePresence>
                  {fakeCallStatus === "ringing" ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0, 0.3],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.8,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-x-[-8px] inset-y-[-8px] rounded-full border-2 border-[#3BE0B9] opacity-50"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: [12, Math.random() * 45 + 15, 12],
                          }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            delay: i * 0.05,
                          }}
                          className="w-1 mx-[1.5px] bg-[#3BE0B9]/80 rounded-full"
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
                <div className="relative z-10 w-16 h-16 rounded-full bg-[#070b1e] flex items-center justify-center border border-white/10">
                  <span className="text-2xl">🐧</span>
                </div>
              </div>
              <p className="text-white/40 text-[10.5px] text-center max-w-[240px] leading-relaxed">
                {fakeCallStatus === "ringing" 
                  ? "Incoming protective call generated to simulate active tracking, allowing you to confidently pivot or deter bystanders." 
                  : "Voice channel simulation active. Respond normally as if speaking with a dispatcher or support safety check-in."}
              </p>
            </div>

            {/* Answer & End triggers */}
            <div className="flex justify-around items-center px-6">
              {fakeCallStatus === "ringing" ? (
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      stopFakeCallRingtone();
                      setShowFakeCall(false);
                    }}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-red-500/20"
                    title="Decline protective simulated call"
                  >
                    <X size={20} className="text-white" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setFakeCallStatus("connected");
                      stopFakeCallRingtone();
                      speakWithElevenLabs(
                        "Hello, this is SafePing Dispatch line checking on your primary secure walking pathway. We have registered your active GPS beacon heading towards home. Is your route quiet?", 
                        true
                      );
                    }}
                    className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 flex items-center justify-center transition-all cursor-pointer relative shadow-lg shadow-emerald-500/20"
                    title="Accept protective simulated call"
                  >
                    <span className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping" />
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    stopSpeaking();
                    setShowFakeCall(false);
                  }}
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 flex items-center justify-center transition-all cursor-pointer relative shadow-lg shadow-red-500/20"
                  title="End simulated call"
                >
                  <X size={20} className="text-white" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
