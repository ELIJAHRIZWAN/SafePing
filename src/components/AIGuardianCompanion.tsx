import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Shield, Phone, MapPin, Battery, Play, Square, 
  Mic, MicOff, Send, X, AlertTriangle, Sparkles, Smile, RefreshCw 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Guardian } from '../types';
import guardianPenguin from '../assets/ANIMATIONS/guardian_penguin.webm';

interface AIGuardianCompanionProps {
  onOpenAddModal?: (prefilled?: Partial<Guardian>) => void;
}

interface ChatMessage {
  sender: 'pen' | 'user';
  text: string;
  isActionFeedback?: boolean;
}

export default function AIGuardianCompanion({ onOpenAddModal }: AIGuardianCompanionProps) {
  const { 
    guardians, 
    activeJourney,
    startJourney,
    cancelJourney,
    batteryLevel,
    setActiveCallGuardian,
    recentCheckins,
    addIncidentLog,
    addCheckin,
    addGuardian,
    setCurrentView
  } = useApp();

  interface AddContactState {
    step: 'none' | 'name' | 'phone' | 'relationship';
    name: string;
    phone?: string;
  }

  const [addContactState, setAddContactState] = useState<AddContactState>({ step: 'none', name: '' });

  // Dialog and chat states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: 'pen', text: "Your trusted circle is active." }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice Dictation States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fake protective call state
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [fakeCallStatus, setFakeCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [fakeCallTimer, setFakeCallTimer] = useState(0);
  const [fakeCallName, setFakeCallName] = useState("SafePing Overwatch Dispatch");
  const callIntervalRef = useRef<any>(null);

  // Auto-scroll chat area
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isDrawerOpen]);

  // Battery low state
  const [batteryLow, setBatteryLow] = useState(false);
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const checkStatus = () => {
          setBatteryLow(battery.level <= 0.2);
        };
        checkStatus();
        battery.addEventListener('levelchange', checkStatus);
      }).catch(() => {});
    }
  }, []);

  // Idle contextual messages loop (rotated when drawer is closed)
  const [rotateIndex, setRotateIndex] = useState(0);
  const contextualMessages = useMemo(() => {
    return [
      "Your trusted circle is active.",
      "Everything looks safe.",
      "You're not alone.",
      "Connections are standing by.",
      "Safe network online.",
      "You're covered.",
      "Standing by."
    ];
  }, []);

  useEffect(() => {
    setRotateIndex(0);
  }, [contextualMessages]);

  useEffect(() => {
    if (contextualMessages.length <= 1) return;
    const interval = setInterval(() => {
      setRotateIndex((prev) => (prev + 1) % contextualMessages.length);
    }, 8500);
    return () => clearInterval(interval);
  }, [contextualMessages.length]);

  // Listen for guardian message events to push an active note from Pen
  useEffect(() => {
    const handleInboundMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { penNote, autoReplied, autoReplyText } = customEvent.detail;
      
      setChatHistory(prev => [
        ...prev,
        { sender: 'pen', text: penNote }
      ]);
      
      if (autoReplied) {
        setChatHistory(prev => [
          ...prev,
          { sender: 'user', text: autoReplyText, isActionFeedback: true }
        ]);
      }
    };
    
    window.addEventListener('safeping-guardian-message', handleInboundMessage);
    return () => {
      window.removeEventListener('safeping-guardian-message', handleInboundMessage);
    };
  }, []);

  // Event listeners to handle global actions from Trusted Circle buttons
  useEffect(() => {
    const handleOpenChat = () => {
      setIsDrawerOpen(true);
    };
    const handleTriggerCall = () => {
      triggerFakeSafetyCall("SafePing Overwatch Dispatch");
    };

    window.addEventListener('safeping-open-chat', handleOpenChat);
    window.addEventListener('safeping-trigger-fake-call', handleTriggerCall);

    return () => {
      window.removeEventListener('safeping-open-chat', handleOpenChat);
      window.removeEventListener('safeping-trigger-fake-call', handleTriggerCall);
    };
  }, []);

  const idleReassuranceMessage = contextualMessages[rotateIndex % contextualMessages.length] || "Everything looks safe.";

  // Browser Dictation Recognition
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Inline visual reassurance error
      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: "Speech recognition is not fully supported in this browser environment. You can type anything directly into our secured channel."
      }]);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          handleSendInput(transcript);
        }
      };
      rec.onerror = () => {
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  // Automated/Natural Command triggers (Zero-latency offline feedback + execution)
  const processLocalCommand = (query: string): boolean => {
    const norm = query.toLowerCase().trim();

    // ==========================================
    // GUARDIAN ADDITION STEP PROGRESSION
    // ==========================================
    if (addContactState.step === 'name') {
      const name = query.trim().charAt(0).toUpperCase() + query.trim().slice(1);
      setAddContactState({
        step: 'phone',
        name: name
      });
      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: `I can add ${name} to your trusted circle. What's ${name}'s phone number?`
      }]);
      return true;
    }

    if (addContactState.step === 'phone') {
      const phone = query.trim();
      setAddContactState({
        step: 'relationship',
        name: addContactState.name,
        phone: phone
      });
      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: `Should ${addContactState.name} be a Guardian or Emergency Contact?`
      }]);
      return true;
    }

    if (addContactState.step === 'relationship') {
      const choice = query.toLowerCase();
      let relationship = "Guardian";
      let isPriority = false;
      if (choice.includes("emergency") || choice.includes("contact") || choice.includes("priority")) {
        relationship = "Emergency Contact";
        isPriority = true;
      }

      // Add the guardian directly to context so it is saved instantly
      if (addGuardian) {
        addGuardian({
          name: addContactState.name,
          phone: addContactState.phone || "",
          relationship: relationship,
          isPriority: isPriority,
          status: 'safe'
        });
      }

      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: `${addContactState.name} has been added to your trusted circle.`
      }]);

      const savedName = addContactState.name;
      const savedPhone = addContactState.phone || "";

      // Reset state
      setAddContactState({ step: 'none', name: '' });

      // Action: Close companion after a short delay and open modal prefilled
      setTimeout(() => {
        setIsDrawerOpen(false);
        if (onOpenAddModal) {
          onOpenAddModal({
            name: savedName,
            phone: savedPhone,
            relationship: relationship,
            isPriority: isPriority
          });
        }
      }, 1500);

      return true;
    }

    // ==========================================
    // PRIORITY 1: SAFEPING ACTIONS / SAFETY STATUS
    // ==========================================
    if (
      norm.includes('am i safe') || 
      norm.includes('how\'s my journey') || 
      norm.includes('how is my journey') || 
      norm.includes('safety status') || 
      norm.trim() === 'safe?' || 
      norm.includes('status report')
    ) {
      const activeCount = guardians.length;
      const journeyActive = activeJourney !== null;
      
      const parts = [
        journeyActive ? "Journey active." : "Journey idle.",
        activeCount === 1 ? "One guardian connected." : (activeCount === 0 ? "No active guardians linked." : `${activeCount} guardians connected.`),
        `Battery ${batteryLevel}%.`
      ];

      if (journeyActive) {
        parts.push("ETA standard.");
        parts.push("Route monitoring active.");
      } else {
        parts.push("Monitoring dormant.");
      }

      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: parts.join(' ')
      }]);
      return true;
    }

    // Checking battery or battery details
    if (norm.includes('battery') || norm.includes('charge') || norm.includes('battery level')) {
      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: `Journey idle. No active guardians linked. Battery ${batteryLevel}%.`
      }]);
      return true;
    }

    // Checking guardian presence
    if (norm.includes('how many') && (norm.includes('guardian') || norm.includes('contact') || norm.includes('friend'))) {
      const activeCount = guardians.length;
      const guardianWord = activeCount === 1 ? "connection" : "connections";
      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: `Trusted Circle is active with ${activeCount} ${guardianWord} online.`
      }]);
      return true;
    }

    // Emergency checks / Unsafe checkouts
    if (norm.includes('unsafe') || norm.includes('help') || norm.includes('emergency') || norm.includes('threat')) {
      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: "Incoming checker call ringing. Ready when you are."
      }]);
      setTimeout(() => {
        setIsDrawerOpen(false);
        triggerFakeSafetyCall();
      }, 1500);
      return true;
    }

    // ==========================================
    // PRIORITY 2: GUARDIAN MANAGEMENT (ADD GUARDIAN)
    // ==========================================
    if (
      norm.includes('add') || 
      norm.includes('register') || 
      norm.includes('save contact') || 
      norm.includes('new guardian') || 
      norm.includes('create contact')
    ) {
      let parsedName = "";
      
      // Attempt to extract name following "add", "register", "save"
      const words = query.split(/\s+/);
      const addIndex = words.findIndex(w => {
        const lw = w.toLowerCase();
        return lw === "add" || lw === "register" || lw === "save" || lw === "create";
      });

      if (addIndex !== -1 && words[addIndex + 1]) {
        parsedName = words[addIndex + 1].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
      }

      // Check if it's a structural name trigger or just a blank "add guardian"
      if (
        !parsedName || 
        ["a", "new", "contact", "guardian", "friend", "member", "emergency", "priority"].includes(parsedName.toLowerCase())
      ) {
        if (addIndex !== -1 && words[addIndex + 2]) {
          parsedName = words[addIndex + 2].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        }
      }

      if (
        !parsedName || 
        ["a", "new", "contact", "guardian", "friend", "member", "emergency", "priority"].includes(parsedName.toLowerCase())
      ) {
        parsedName = "";
      }

      if (!parsedName) {
        setAddContactState({
          step: 'name',
          name: ''
        });
        setChatHistory(prev => [...prev, {
          sender: 'pen',
          text: "I can add a new guardian to your trusted circle. What's their name?"
        }]);
      } else {
        const finalName = parsedName.charAt(0).toUpperCase() + parsedName.slice(1);
        setAddContactState({
          step: 'phone',
          name: finalName
        });
        setChatHistory(prev => [...prev, {
          sender: 'pen',
          text: `I can add ${finalName} to your trusted circle. What's ${finalName}'s phone number?`
        }]);
      }
      return true;
    }

    // ==========================================
    // PRIORITY 3: COMMUNICATION ACTIONS
    // ==========================================
    // 3a. Message Flow (SMS composer)
    if (norm.includes('message') || norm.includes('text') || norm.includes('tell') || norm.includes('sms')) {
      let recipient = "";
      let messageText = "";

      const words = query.split(/\s+/);
      const triggerWordIndex = words.findIndex(w => {
        const lw = w.toLowerCase();
        return lw === "message" || lw === "tell" || lw === "text" || lw === "sms";
      });

      if (triggerWordIndex !== -1 && words[triggerWordIndex + 1]) {
        recipient = words[triggerWordIndex + 1].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        messageText = words.slice(triggerWordIndex + 2).join(' ');
      }

      if (!recipient || ["a", "new", "contact", "guardian", "friend"].includes(recipient.toLowerCase())) {
        recipient = "Mumma";
      }

      const formattedRecipient = recipient.charAt(0).toUpperCase() + recipient.slice(1);
      
      // Match the recipient in guardians base
      const target = guardians.find(g => 
        g.name.toLowerCase().includes(formattedRecipient.toLowerCase()) || 
        g.relationship.toLowerCase().includes(formattedRecipient.toLowerCase())
      );

      const displayRecipient = target ? target.relationship : formattedRecipient;
      const targetPhone = target ? target.phone : "555-0102";

      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: `Preparing message for ${displayRecipient}.`
      }]);

      if (addIncidentLog) {
        addIncidentLog('checkin', `SMS prefilled composer prepared for ${target ? target.name : formattedRecipient}.`);
      }

      // Launch physical SMS prefilled device composition trigger
      setTimeout(() => {
        const linkSeparator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
        const finalMsg = messageText || "I am safe.";
        const smsHref = `sms:${targetPhone}${linkSeparator}body=${encodeURIComponent(finalMsg)}`;
        window.location.href = smsHref;
      }, 1200);

      return true;
    }

    // 3b. Direct Dialing Call Flow
    if (norm.includes('call') || norm.includes('phone') || norm.startsWith('contact')) {
      const target = guardians.find(g => norm.includes(g.name.toLowerCase()) || norm.includes(g.relationship.toLowerCase()));
      const callName = target ? target.name : (query.replace(/call/i, '').trim() || "Papa");
      const formattedCallName = callName.charAt(0).toUpperCase() + callName.slice(1);

      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: `Calling ${formattedCallName}...`
      }]);

      setTimeout(() => {
        setIsDrawerOpen(false);
        if (target) {
          setActiveCallGuardian(target);
        } else {
          setActiveCallGuardian({
            id: 'c-new',
            name: formattedCallName,
            phone: '555-0102',
            relationship: 'Guardian',
            avatar: 'FATHER 1.png',
            status: 'safe'
          });
        }
      }, 1500);

      return true;
    }

    // ==========================================
    // PRIORITY 4: JOURNEY ACTIONS
    // ==========================================
    // Start Journey
    if (norm.includes('start') || norm.includes('tracking') || norm.includes('journey') || norm.includes('heading')) {
      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: "Ready to start journey monitoring."
      }]);

      setTimeout(() => {
        setIsDrawerOpen(false);
        setCurrentView('journey');
      }, 1500);
      return true;
    }

    // Stop Tracking
    if (norm.includes('stop') || norm.includes('cancel') || norm.includes('end tracking')) {
      setChatHistory(prev => [...prev, {
        sender: 'pen',
        text: "Deactivating tracking. Circle is standing by."
      }]);
      setTimeout(() => {
        cancelJourney();
      }, 1200);
      return true;
    }

    return false;
  };

  // Launch Simulated protective Call Overlay
  const triggerFakeSafetyCall = (callerName = "SafePing Dispatch") => {
    setFakeCallName(callerName);
    setFakeCallStatus('ringing');
    setFakeCallTimer(0);
    setShowFakeCall(true);
    
    addIncidentLog?.('action', "Simulated incoming telephone overwatch requested by user.");
  };

  // Speech response helper
  const speakDispatcherVoice = (msg: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Simulate Caller timing
  useEffect(() => {
    if (showFakeCall && fakeCallStatus === 'connected') {
      callIntervalRef.current = setInterval(() => {
        setFakeCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
        callIntervalRef.current = null;
      }
    }
    return () => {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    };
  }, [showFakeCall, fakeCallStatus]);

  // Handle Input Sending (integrates online Gemini backend proxying + offline commands)
  const handleSendInput = async (forcedQuery?: string) => {
    const rawInput = forcedQuery !== undefined ? forcedQuery : inputText;

    // Validate exists, trim whitespace, and reject empty/null/undefined
    if (rawInput === undefined || rawInput === null) {
      setChatHistory(prev => [...prev, { sender: 'pen', text: "Please tell Pen something first." }]);
      return;
    }
    const query = String(rawInput).trim();
    if (query === "") {
      setChatHistory(prev => [...prev, { sender: 'pen', text: "Please tell Pen something first." }]);
      return;
    }

    // Add user question to history
    setChatHistory(prev => [...prev, { sender: 'user', text: query }]);
    if (!forcedQuery) setInputText("");

    // 1. Process Offline Direct Command Translation (Add, Call, Cancel, Stop, Batteries, counts, etc.)
    const matchesLocalCommand = processLocalCommand(query);
    if (matchesLocalCommand) return;

    // 2. Fetch Gemini Dynamic Dialogue for custom comfort conversations
    setIsLoading(true);
    try {
      const historyPayload = chatHistory
        .filter(m => m && typeof m.text === "string" && m.text.trim() !== "")
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text.trim() }]
        }));

      console.log("Pen outgoing message:", query);

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          batteryLevel: batteryLevel,
          emergencyState: activeJourney ? "active_journey" : "idle",
          locationState: { speed: 1.2 }
        })
      });

      if (!res.ok) throw new Error("Gemini network error");
      const data = await res.json();
      
      // Extract botanical/conversational clean response
      let companionRes = data.reply || data.response || "Everything is safe. We are standing by.";
      
      // Clean asterisk thoughts or speech annotations
      companionRes = companionRes.replace(/\*[^*]+\*/g, '').trim();

      setChatHistory(prev => [...prev, { sender: 'pen', text: companionRes }]);
    } catch (err) {
      // Warm, helpful offline fallback message
      setChatHistory(prev => [...prev, { 
        sender: 'pen', 
        text: "Pen couldn't reach the network right now." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formattedCallTime = useMemo(() => {
    const m = Math.floor(fakeCallTimer / 60).toString().padStart(2, '0');
    const s = (fakeCallTimer % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [fakeCallTimer]);

  return (
    <>
      {/* 🐧 Pen Idle Quiet Companion Card on Trusted Circle Screen */}
      <div 
        className="w-full font-sans select-none cursor-pointer" 
        id="pen-companion-card"
        onClick={() => setIsDrawerOpen(true)}
        title="Open Pen Companion chat"
      >
        <div className="glass p-4 sm:p-5 rounded-[24px] border border-white/5 bg-gradient-to-r from-cyan-500/[0.04] via-[#3BE0B9]/[0.01] to-transparent shadow-xl relative overflow-hidden flex items-center justify-between gap-4.5 transition-all hover:bg-white/[0.01] hover:border-cyan-500/20 active:scale-[0.99]">
          
          {/* Ambient Glow */}
          <div className="absolute top-1/2 -translate-y-1/2 right-4 w-28 h-28 bg-[#3BE0B9]/[0.03] blur-[40px] rounded-full pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10 w-full">
            {/* Companion Stage */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-x-0 inset-y-0 -m-1 bg-[#3BE0B9]/15 blur-[8px] rounded-full animate-pulse pointer-events-none" />
              
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-cyan-500/25 bg-[#070c18] shadow-[0_0_15px_rgba(34,211,238,0.2)] flex items-center justify-center">
                <video
                  src={guardianPenguin}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-14 h-14 object-contain pointer-events-none filter scale-[1.25] brightness-110 drop-shadow-[0_2px_8px_rgba(92,222,255,0.25)]"
                  poster="/guardianPenguin.png"
                />
              </div>
            </div>

            {/* Reassuring Handwritten Note in Dear Joe */}
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-[0.16em] text-[#5cdeff]/50 leading-none">
                🐧 Pen
              </span>
              <div className="h-6 flex items-center mt-1">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={idleReassuranceMessage}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="pen-reassurance-styling select-none line-clamp-1 antialiased"
                  >
                    "{idleReassuranceMessage}"
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🗺️ INTERACTIVE COMPANION CHAT DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[1100] flex items-end justify-center">
            {/* Dark Background behind drawer allowing Circle page visibility */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              onClick={() => setIsDrawerOpen(false)}
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg h-[65vh] bg-[#070b1e]/95 border-t border-white/10 rounded-t-[36px] shadow-[0_-12px_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden z-50 font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0c102a]/80">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🐧</span>
                  <div className="text-left">
                    <h3 className="text-base font-extrabold font-plus-jakarta text-white tracking-wide">Pen</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1DBB8A] animate-pulse" />
                      <span className="text-[10px] font-extrabold font-plus-jakarta uppercase tracking-wider text-white/40">Online</span>
                    </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-all"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Chat Viewport */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin">
                {chatHistory.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-[24px] ${
                        msg.sender === 'user'
                          ? (msg.isActionFeedback 
                              ? 'p-3 px-4.5 bg-[#1dbb8a]/10 border border-[#1dbb8a]/20 text-[#3be0b9] font-medium text-[11px] font-sans rounded-tr-sm text-left' 
                              : 'p-3.5 px-4.5 bg-primary border border-primary-light text-white font-medium text-xs font-inter rounded-tr-sm')
                          : 'p-4 bg-white/[0.03] border border-cyan-500/15 rounded-tl-sm'
                      }`}
                    >
                      {msg.isActionFeedback ? (
                        <div className="flex items-center gap-1 mb-1 text-[9px] font-extrabold uppercase tracking-widest text-[#1dbb8a]">
                          <span>⚡</span>
                          <span>Auto Status Updates</span>
                        </div>
                      ) : null}
                      {msg.sender === 'user' ? (
                        <p className={`leading-relaxed whitespace-pre-wrap ${msg.isActionFeedback ? 'italic text-white' : ''}`}>{msg.text}</p>
                      ) : (
                        <p className="font-happy-monkey text-[14.5px] text-[#a0cfe4] italic leading-relaxed antialiased">
                          "{msg.text}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 bg-white/[0.03] border border-cyan-500/10 rounded-[20px] rounded-tl-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Helper Quick Command Recommendation Chips */}
              <div className="px-5 py-2 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none bg-black/10 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => {
                    setInputText("Call Papa");
                    handleSendInput("Call Papa");
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 text-[11px] font-bold font-plus-jakarta text-[#5cdeff] hover:bg-[#5cdeff]/10 hover:text-white border border-white/5 transition-all active:scale-95"
                >
                  📞 Call Papa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputText("Add Riya as a guardian");
                    handleSendInput("Add Riya as a guardian");
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 text-[11px] font-bold font-plus-jakarta text-[#3BE0B9] hover:bg-[#3BE0B9]/10 hover:text-white border border-white/5 transition-all active:scale-95"
                >
                  ➕ Add Riya
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputText("Start journey tracking");
                    handleSendInput("Start journey tracking");
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 text-[11px] font-bold font-plus-jakarta text-yellow-300 hover:bg-yellow-300/10 hover:text-white border border-white/5 transition-all active:scale-95"
                >
                  🚀 Start Journey
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputText("Check battery status");
                    handleSendInput("Check battery status");
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 text-[11px] font-bold font-plus-jakarta text-white/50 hover:bg-white/10 hover:text-white border border-white/5 transition-all active:scale-95"
                >
                  🔋 Battery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputText("I'm feeling unsafe");
                    handleSendInput("I'm feeling unsafe");
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-red-500/10 text-[11px] font-bold font-plus-jakarta text-red-400 hover:bg-red-500/20 hover:text-white border border-red-500/20 transition-all active:scale-95"
                >
                  ⚠️ Unsafe Check
                </button>
              </div>

              {/* Input Bar */}
              <div className="p-4 px-6 border-t border-white/[0.06] bg-[#0c102a] flex items-center gap-3">
                {/* Speech Dictation Mic */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all active:scale-95 ${
                    isListening
                      ? 'bg-red-650 border-red-500 text-white bg-red-600 animate-pulse'
                      : 'bg-white/5 border-white/10 text-cyan-400 hover:bg-cyan-400/10'
                  }`}
                  title={isListening ? "Listening... click to stop" : "Speak to Pen"}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                {/* Input Textbox */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendInput();
                  }}
                  placeholder="Tell Pen what you need..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#5cdeff]/50 font-inter font-sans"
                />

                {/* Send action pointer */}
                <button
                  type="button"
                  onClick={() => handleSendInput()}
                  disabled={!inputText.trim()}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    inputText.trim() 
                      ? 'bg-primary border border-primary-light text-white hover:brightness-110 active:scale-95 cursor-pointer'
                      : 'bg-white/[0.02] border border-white/[0.05] text-white/25 cursor-default'
                  }`}
                >
                  <Send size={15} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚠️ FULL-SCREEN SIMULATED telephone Call PROTOCOL (Deterrence, SOS, Safety check responses) */}
      <AnimatePresence>
        {showFakeCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-gradient-to-b from-[#0b132b] via-[#070b1e] to-[#01040f] flex flex-col justify-between p-10 font-sans"
          >
            {/* Soft decorative visual pulse caller rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <span className="absolute w-72 h-72 rounded-full border border-cyan-500/10 animate-ping [animation-duration:3s]" />
              <span className="absolute w-96 h-96 rounded-full border border-cyan-500/5 animate-ping [animation-duration:5s]" />
            </div>

            {/* Header info */}
            <div className="flex flex-col items-center gap-3 mt-12 text-center h-auto relative z-10">
              <span className="bg-cyan-500/10 border border-cyan-500/20 text-[#5cdeff] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.15em] shadow-sm font-plus-jakarta flex items-center gap-1">
                <Shield size={10} className="fill-current" />
                Deterrence Call Active
              </span>
              <h2 className="text-3xl font-extrabold font-plus-jakarta tracking-tight text-white mt-4">{fakeCallName}</h2>
              <p className="text-cyan-400 font-extrabold tracking-widest text-[11px] font-plus-jakarta mt-1">
                {fakeCallStatus === 'ringing' ? 'INCOMING VOICE OVERWATCH...' : `CONNECTED • ${formattedCallTime}`}
              </p>
            </div>

            {/* Avatar block */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 my-6">
              <div className="w-24 h-24 rounded-full bg-[#0c132c] border-2 border-cyan-400/40 shadow-xl shadow-cyan-500/10 flex items-center justify-center relative">
                <span className="text-4xl text-cyan-400 animate-bounce">🐧</span>
              </div>
              <p className="text-white/40 text-[10.5px] font-inter text-center max-w-[250px] leading-relaxed mt-5 px-4">
                {fakeCallStatus === 'ringing' 
                  ? "Incoming overwatch call generated to simulate active escort, allowing you to confidently redirect attention or bypass bystanders." 
                  : "Security line active. Speak naturally. We are tracking your coordinates continuously."}
              </p>
            </div>

            {/* Actions triggers footer panel */}
            <div className="flex items-center justify-center gap-12 relative z-10 mb-10">
              {fakeCallStatus === 'ringing' ? (
                <>
                  {/* Decline Ringing */}
                  <div className="flex flex-col items-center gap-2 font-sans">
                    <button 
                      type="button"
                      onClick={() => {
                        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                        setShowFakeCall(false);
                      }}
                      className="w-16 h-16 rounded-full bg-red-650 hover:bg-red-700 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-red-500/20 cursor-pointer bg-red-600"
                    >
                      <X size={24} className="text-white" />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/50 font-plus-jakarta">Decline</span>
                  </div>

                  {/* Accept Call linkage */}
                  <div className="flex flex-col items-center gap-2 font-sans">
                    <button 
                      type="button"
                      onClick={() => {
                        setFakeCallStatus('connected');
                        speakDispatcherVoice("Hello, this is SafePing overwatch dispatcher checking on your active GPS walking pathway. We have registered your secure progress home. Elijah, is your current street quiet and safe?");
                      }}
                      className="w-16 h-16 rounded-full bg-[#1DBB8A] hover:bg-[#1dbb8a]/90 active:scale-95 flex items-center justify-center transition-all relative shadow-lg shadow-[#1DBB8A]/25 cursor-pointer"
                    >
                      <span className="absolute inset-0 rounded-full border border-emerald-400/50 animate-ping" />
                      <Phone size={24} className="fill-current text-white" />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-plus-jakarta">Accept</span>
                  </div>
                </>
              ) : (
                /* Hang Up Call */
                <div className="flex flex-col items-center gap-2 font-sans-serif">
                  <button 
                    type="button"
                    onClick={() => {
                      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      setShowFakeCall(false);
                      setFakeCallStatus('ringing');
                    }}
                    className="w-16 h-16 rounded-full bg-red-650 hover:bg-red-700 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-red-500/20 cursor-pointer bg-red-600"
                  >
                    <X size={24} className="text-white" />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/50 font-plus-jakarta">Hang Up</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
