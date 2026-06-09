import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { 
  CheckCircle2, 
  Navigation, 
  AlertTriangle, 
  Clock, 
  FileText, 
  ChevronRight, 
  Home, 
  Footprints, 
  MapPin, 
  Shield, 
  Phone, 
  Sparkles,
  Send,
  X
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import activityLogsPenguin from '../assets/ANIMATIONS/Activity logs penguin.webm';
import PenThoughtBubble from '../components/PenThoughtBubble';

interface LogItem {
  id?: string;
  type: "checkin" | "journey" | "arrival" | "alert" | "sos" | "guardian" | "pen" | "system";
  title?: string;
  description?: string;
  message?: string;
  severity?: "safe" | "info" | "warning" | "critical";
  timestamp: string;
  createdAtValue?: number;
  metadata?: any;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface LogGroup {
  title: 'Today' | 'Yesterday' | 'Earlier';
  items: LogItem[];
}

export default function ActivityLogsView() {
  const { recentCheckins, isDarkMode, user } = useApp();
  const [activeTab, setActiveTab ] = useState<'all' | 'status' | 'journey' | 'delay'>('all');

  // Lightweight Mascot Assistant States
  const [showBubble, setShowBubble] = useState(true);
  const [bubbleState, setBubbleState] = useState<'idle' | 'active' | 'loading' | 'display'>('idle');
  const [responseText, setResponseText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleMascotClick = () => {
    if (bubbleState === 'idle') {
      setBubbleState('active');
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || bubbleState === 'loading') return;
    
    setErrorText(null);
    setInputValue('');
    setBubbleState('loading');

    try {
      const response = await fetch('/api/gemini/activity-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text.trim(),
          history: responseText ? [{ role: 'assistant', text: responseText }] : [],
          recentCheckins: recentCheckins,
          userName: user?.name || ''
        })
      });

      if (!response.ok) {
        throw new Error('Signal weak. Tap to retry.');
      }

      const data = await response.json();
      setResponseText(data.reply || "I'm right here with you.");
      setBubbleState('display');
    } catch (err: any) {
      console.error('[Activity Assistant client error]:', err);
      setErrorText(err.message || 'Signal lost. Try again.');
      setBubbleState('active');
    }
  };

  const tabs = [
    { id: 'all' as const, label: 'All' },
    { id: 'status' as const, label: 'Check-ins' },
    { id: 'journey' as const, label: 'Journeys' },
    { id: 'delay' as const, label: 'Alerts' }
  ];

  // Compute counts dynamically using actual logging system values
  const safeCount = recentCheckins.filter(
    (c: LogItem) => c.type === 'arrival' || c.type === 'checkin' || c.severity === 'safe'
  ).length;

  const journeyCount = recentCheckins.filter(
    (c: LogItem) => c.type === 'journey' || (c.type as any) === 'start'
  ).length;

  const alertCount = recentCheckins.filter(
    (c: LogItem) => c.type === 'alert' || c.type === 'sos' || c.severity === 'warning' || c.severity === 'critical'
  ).length;

  // Filter logs dynamically
  const filteredLogs = recentCheckins.filter((item: LogItem) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'status') {
      return item.type === 'checkin' || item.type === 'arrival';
    }
    if (activeTab === 'journey') {
      return item.type === 'journey' || (item.type as any) === 'start';
    }
    if (activeTab === 'delay') {
      return item.type === 'alert' || item.type === 'sos' || item.severity === 'warning' || item.severity === 'critical';
    }
    return true;
  });

  // Highlight logs in reverse-chronological order and group safely
  const sortedFilteredLogs = [...filteredLogs].sort((a: LogItem, b: LogItem) => {
    return (b.createdAtValue || Date.now()) - (a.createdAtValue || Date.now());
  });

  const getLogGroups = (logsList: LogItem[]): LogGroup[] => {
    const todayList: LogItem[] = [];
    const yesterdayList: LogItem[] = [];
    const earlierList: LogItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    logsList.forEach((log) => {
      const time = log.createdAtValue || Date.now();
      if (time >= startOfToday) {
        todayList.push(log);
      } else if (time >= startOfYesterday) {
        yesterdayList.push(log);
      } else {
        earlierList.push(log);
      }
    });

    const groups: LogGroup[] = [];
    if (todayList.length > 0) {
      groups.push({ title: 'Today', items: todayList });
    }
    if (yesterdayList.length > 0) {
      groups.push({ title: 'Yesterday', items: yesterdayList });
    }
    if (earlierList.length > 0) {
      groups.push({ title: 'Earlier', items: earlierList });
    }
    return groups;
  };

  const logGroups = getLogGroups(sortedFilteredLogs);

  const textColor = isDarkMode ? 'text-white' : 'text-navy-dark';
  const subTextColor = isDarkMode ? 'text-white/40' : 'text-navy-dark/40';

  // Helper parser mapping for the storytelling element of each log
  const getLogDetails = (item: LogItem) => {
    const logType = item.type;
    const msg = item.description || item.message || '';
    const msgLower = msg.toLowerCase();
    
    let category: 'safe' | 'journey' | 'attention' | 'emergency' = 'safe';
    let eventType = 'Check-in';
    let eventOutcome = 'Status Logged';
    let safetyStatus = 'Secured';
    let Icon = CheckCircle2;

    if (logType === 'sos') {
      category = 'emergency';
      eventType = item.title || 'SOS Activated';
      eventOutcome = 'Critical Response Mode';
      safetyStatus = 'Emergency';
      Icon = Phone;
    } else if (logType === 'alert') {
      category = 'attention';
      eventType = item.title || 'Route Alert';
      eventOutcome = 'Deviation Detected';
      safetyStatus = 'Warning';
      Icon = AlertTriangle;
    } else if (logType === 'pen') {
      if (item.severity === 'critical' || item.severity === 'warning') {
        category = 'attention';
        eventType = item.title || 'Pen AI Intervention';
        eventOutcome = 'Active Safety Guidance';
        safetyStatus = 'Attentive';
      } else {
        category = 'journey';
        eventType = item.title || 'Pen AI Guard';
        eventOutcome = 'Companion Assist Active';
        safetyStatus = 'Guided';
      }
      Icon = Sparkles;
    } else if (logType === 'guardian') {
      category = 'safe';
      eventType = item.title || 'Guardian Action';
      eventOutcome = 'Circle Roster Updated';
      safetyStatus = 'Protected';
      Icon = Shield;
    } else if (logType === 'system') {
      category = 'journey';
      eventType = item.title || 'System Metric';
      eventOutcome = 'Telemetry Verified';
      safetyStatus = 'System';
      Icon = Navigation;
    } else if (logType === 'arrival' || msgLower.includes('arrived') || msgLower.includes('reached')) {
      category = 'safe';
      eventType = item.title || 'Arrival';
      eventOutcome = 'Destination Reached';
      safetyStatus = 'Safe';
      Icon = Home;
    } else if (logType === 'journey' || msgLower.includes('left for') || msgLower.includes('started journey')) {
      category = 'journey';
      eventType = item.title || 'Journey Started';
      eventOutcome = 'Tracking Active';
      safetyStatus = 'Traveling';
      Icon = Footprints;
    } else {
      category = 'safe';
      eventType = item.title || 'Check-in';
      eventOutcome = 'Status Circle Alerted';
      safetyStatus = 'Secured';
      Icon = CheckCircle2;
    }

    return { category, eventType, eventOutcome, safetyStatus, Icon };
  };

  const categoryStyles = {
    safe: {
      textClass: 'text-[#3BE0B9]',
      borderClass: 'border-[#3BE0B9]/20',
      bgClass: 'bg-[#3BE0B9]/[0.04]',
      glowClass: 'bg-[#3BE0B9]/10',
      statusBadge: 'bg-[#3BE0B9]/15 text-[#3BE0B9] border-[#3BE0B9]/20'
    },
    journey: {
      textClass: 'text-cyan-400',
      borderClass: 'border-cyan-500/20',
      bgClass: 'bg-cyan-500/[0.04]',
      glowClass: 'bg-cyan-500/10',
      statusBadge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20'
    },
    attention: {
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/20',
      bgClass: 'bg-amber-500/[0.04]',
      glowClass: 'bg-amber-500/10',
      statusBadge: 'bg-amber-500/15 text-amber-400 border-amber-500/20'
    },
    emergency: {
      textClass: 'text-rose-400',
      borderClass: 'border-rose-500/20',
      bgClass: 'bg-rose-500/[0.04]',
      glowClass: 'bg-rose-500/10',
      statusBadge: 'bg-rose-500/15 text-rose-400 border-rose-500/20'
    }
  };

  // Dedicated dynamic values for reassuring empty states
  const getEmptyStateDetails = (tab: typeof activeTab) => {
    switch (tab) {
      case 'status':
        return {
          title: 'Quiet checkins list',
          description: 'No circle updates logged yet today. Everything is tranquil.',
          message: 'Tranquil monitoring',
          Icon: Sparkles
        };
      case 'journey':
        return {
          title: 'Nothing to report',
          description: 'No active travels recorded. SafePing stands ready for overwatch.',
          message: 'On standby escort',
          Icon: Footprints
        };
      case 'delay':
        return {
          title: 'No alerts detected',
          description: 'Zero anomalies, route deviations, or delays recorded. Safe corridor.',
          message: 'All clears recorded',
          Icon: Shield
        };
      default:
        return {
          title: 'Quiet day',
          description: 'All system checks are optimal. Your absolute protection matches SafePing sentinel benchmarks.',
          message: 'Perfect Order',
          Icon: Shield
        };
    }
  };

  const emptyState = getEmptyStateDetails(activeTab);

  return (
    <div className="flex flex-col gap-6 py-6 h-full select-none animate-fade-in max-w-xl mx-auto pb-24">
      {/* Header section (full width, clean margins, no cramping) */}
      <header className="flex flex-col gap-1 px-2 text-left">
        <span 
          style={{ fontFamily: 'monospace', fontStyle: 'normal', textDecorationLine: 'none', textAlign: 'left', width: '180px', height: '22px' }}
          className={`text-[11px] uppercase tracking-[0.3em] font-black flex items-center gap-1.5 ${subTextColor}`}
        >
          <FileText size={12} className="text-[#3BE0B9]" />
          Protected History
        </span>
        <h1 
          style={{ fontFamily: 'Georgia', fontStyle: 'normal', textDecorationLine: 'none', fontWeight: 'bold', textAlign: 'left' }}
          className={`text-3xl font-display tracking-tight ${textColor}`}
        >
          Activity Logs
        </h1>
        <p 
          className={`${subTextColor} mt-1 font-medium italic text-[11px]`}
        >
          Safety check-ins and sentinel protection logs.
        </p>
      </header>

      {/* Mascot and Premium Home-screen style Chat panel block (mascot on the left, chat card on the right) */}
      <section 
        id="activity-logs-assistant" 
        className="flex items-center gap-4 px-2 py-1.5 relative overflow-visible"
      >
        {/* Left: Mascot representation (increased to w-28 h-28) */}
        <button
          onClick={handleMascotClick}
          className="w-24 h-24 flex items-center justify-center relative overflow-visible shrink-0 group hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
          title="Tap Pen to trigger assistant query state"
        >
          {/* Soft background halo glow */}
          <div className="absolute inset-2 bg-[#3BE0B9]/15 rounded-full blur-xl opacity-70 group-hover:opacity-90 transition-opacity" />
          
          {/* Soundwave ring when querying / talking */}
          {(bubbleState === 'loading' || bubbleState === 'display') && (
            <motion.div
              animate={{
                scale: [1.05, 1.3, 1.05],
                opacity: [0.35, 0.7, 0.35],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-x-[-4px] inset-y-[-4px] rounded-full bg-[#3BE0B9]/20 blur-md pointer-events-none"
            />
          )}

          <div className="w-26 h-26 relative scale-[1.35] group-hover:scale-[1.42] transition-transform duration-500 flex items-center justify-center rounded-full overflow-hidden">
            <video
              src={activityLogsPenguin}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain pointer-events-none filter brightness-110"
            />
          </div>
        </button>

        {/* Right: Premium, Home-screen style companion chat card */}
        <div className="flex-[1.6] bg-stone-950/20 backdrop-blur-2xl border border-white/[0.06] rounded-[24px] p-4 text-white flex flex-col gap-2.5 relative overflow-hidden min-h-[128px] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {/* Card Header details */}
          <div className="flex items-center justify-between w-full relative z-10 border-b border-white/[0.05] pb-2">
            <div className="flex items-center gap-2">
              <div className="relative w-5 h-5 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
                <video src={activityLogsPenguin} autoPlay loop muted playsInline className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col items-start leading-none">
                <h3 className="text-[11px] font-black tracking-tight flex items-center gap-1 font-sans text-white/95">
                  Pen
                  <span className="h-1 w-1 rounded-full bg-[#1DBB8A] animate-pulse" />
                </h3>
                <span className="text-[7px] text-[#3BE0B9] font-mono tracking-wider font-extrabold uppercase mt-0.5">
                  {bubbleState === 'loading' ? 'Waddling thoughts' : bubbleState === 'display' ? 'SPEAKING' : 'GUARD ACTIVE'}
                </span>
              </div>
            </div>
            
            {bubbleState !== 'idle' && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setBubbleState('idle');
                  setResponseText('');
                  setErrorText(null);
                }}
                className="text-white/40 hover:text-white/80 transition-colors p-0.5"
                title="Reset conversation state"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Conversation Text area */}
          <div className="flex-1 min-h-[48px] flex flex-col justify-center text-left py-0.5 text-xs text-white/90">
            {bubbleState === 'idle' && (
              <PenThoughtBubble screenName="logs" pointerPosition="left" className="w-full max-w-full bg-transparent border-none backdrop-blur-none shadow-none px-0" />
            )}

            {bubbleState === 'active' && (
              <p className="text-white/40 italic leading-relaxed">
                Ready. Type your overwatch query below...
              </p>
            )}

            {bubbleState === 'loading' && (
              <div className="flex flex-col gap-1 items-start py-0.5 text-[#3BE0B9]">
                <span className="text-[9px] font-black uppercase tracking-wider font-mono animate-pulse">Waddling thoughts...</span>
                <div className="flex gap-0.5 items-center mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3BE0B9] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3BE0B9] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3BE0B9] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {bubbleState === 'display' && (
              <div className="max-h-[110px] overflow-y-auto pr-0.5 leading-relaxed font-sans scrollbar-hide text-white/90 whitespace-pre-wrap font-medium">
                {responseText}
              </div>
            )}

            {errorText && (
              <span className="text-rose-400 text-[10px] leading-tight font-semibold mt-1 block">{errorText}</span>
            )}
          </div>

          {/* Combined input Form query bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputValue.trim()) {
                handleSendMessage(inputValue);
              }
            }}
            className="w-full flex items-center gap-3 bg-white/[0.01] border border-white/[0.05] rounded-full px-3.5 py-1.5 transition-all duration-200 relative z-10 focus-within:border-[#3BE0B9]/30 focus-within:bg-white/[0.04]"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type quietly..."
              disabled={bubbleState === 'loading'}
              className="flex-1 bg-transparent border-none text-[11px] font-semibold text-white placeholder-white/35 focus:outline-none focus:ring-0 p-0 leading-normal outline-none"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || bubbleState === 'loading'}
              className={`p-1 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer flex-shrink-0 ${
                inputValue.trim() 
                  ? "text-[#3BE0B9] scale-105 active:scale-95" 
                  : "text-white/20 select-none"
              }`}
              title="Submit safety question"
            >
              <Send size={11} />
            </button>
          </form>
        </div>
      </section>

      {/* LIGHTWEIGHT ACTIVITY SUMMARY STATUS METRICS */}
      <div className="flex items-center justify-between px-4 py-2.5 border-y border-white/[0.06] bg-[#05080e]/10 select-none text-left font-mono">
        {/* Security Level Status */}
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3BE0B9] animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black tracking-[0.14em] text-[#3BE0B9] uppercase leading-none">
              {alertCount > 0 ? 'Review Pending' : 'Escorted'}
            </span>
            <span className="text-[7.5px] text-white/35 font-bold uppercase mt-1 leading-none tracking-wider">Security Level</span>
          </div>
        </div>

        <div className="w-[1px] h-4.5 bg-white/[0.08]" />

        {/* Safe Events */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-white font-mono leading-none tracking-tight">{safeCount}</span>
          <div className="flex flex-col">
            <span className="text-[8px] font-black tracking-[0.14em] text-emerald-400 uppercase leading-none">Safe</span>
            <span className="text-[7.5px] text-white/35 font-bold uppercase mt-1 leading-none tracking-wider">Check-ins</span>
          </div>
        </div>

        <div className="w-[1px] h-4.5 bg-white/[0.08]" />

        {/* Transit Events */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-white font-mono leading-none tracking-tight">{journeyCount}</span>
          <div className="flex flex-col">
            <span className="text-[8px] font-black tracking-[0.14em] text-cyan-400 uppercase leading-none">Transit</span>
            <span className="text-[7.5px] text-white/35 font-bold uppercase mt-1 leading-none tracking-wider">Journeys</span>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex border-b border-white/5 pb-2.5 px-1 justify-between gap-1.5 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-4.5 rounded-full text-xs font-bold transition-all relative shrink-0 ${
              activeTab === tab.id
                ? 'text-[#3BE0B9] bg-[#3be0b9]/10 font-black border border-[#3be0b9]/20'
                : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MAIN LOGS LIST (TIMELINE STRUCTURE) */}
      <div className="relative flex flex-col gap-6 min-h-[300px] px-1">
        {/* Vertical visual connector pipeline pathing */}
        {sortedFilteredLogs.length > 1 && (
          <div 
            className="absolute left-6 top-6 bottom-6 w-[1px] bg-gradient-to-b from-[#3BE0B9]/30 via-white/5 to-transparent pointer-events-none" 
            style={{ zIndex: 0 }}
          />
        )}

        {sortedFilteredLogs.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl gap-3 bg-[#060b13]/20"
          >
            {React.createElement(emptyState.Icon, {
              size: 28,
              className: "text-[#3BE0B9]/40 filter drop-shadow-[0_0_8px_rgba(59,224,185,0.2)]"
            })}
            <div className="space-y-1">
              <h3 className="text-xs font-black text-white/70 uppercase tracking-widest font-mono">
                {emptyState.title}
              </h3>
              <p className="text-[11px] text-white/40 max-w-[260px] mx-auto font-medium leading-relaxed">
                {emptyState.description}
              </p>
            </div>
            <div className="mt-1 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-wider">
              {emptyState.message}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {logGroups.map((group) => (
              <div key={group.title} className="flex flex-col gap-4">
                {/* Visual Relative Separator */}
                <div className="flex items-center gap-3.5 px-2 select-none relative z-10">
                  <span className="text-[10px] font-black font-mono tracking-[0.25em] text-[#3BE0B9]/80 uppercase">
                    {group.title}
                  </span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
                </div>

                <div className="flex flex-col gap-4.5">
                  {group.items.map((item, idx) => {
                    const itemDetails = getLogDetails(item);
                    const colors = categoryStyles[itemDetails.category];

                    return (
                      <motion.div
                        key={item.id || idx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.28 }}
                        className="relative z-10 flex gap-4 text-left items-start"
                      >
                        {/* Left Icon Placement forming the timeline node with glow rings */}
                        <div className="relative flex flex-col items-center shrink-0">
                          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-lg relative ${colors.bgClass} ${colors.borderClass} ${colors.textClass}`}>
                            {React.createElement(itemDetails.Icon, { size: 18 })}
                            <span className={`absolute -inset-0.5 rounded-xl blur-md -z-10 ${colors.glowClass} opacity-40`} />
                          </div>
                        </div>

                        {/* Left border action card for detailed visual storytelling */}
                        <div className="flex-1 min-w-0">
                          <GlassCard className="p-4 border border-white/[0.03] bg-[#05080e]/40 hover:bg-[#070b13]/60 transition-all flex flex-col relative overflow-hidden group">
                            {/* Active category light guide rule */}
                            <div className={`absolute top-0 left-0 w-[2.5px] h-full ${colors.textClass} opacity-80`} />

                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                              {/* Event Category Title */}
                              <h3 className="text-xs font-black text-white/90 tracking-wider uppercase font-mono">
                                {itemDetails.eventType}
                              </h3>
                              
                              {/* Instant indicator pill */}
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none font-mono ${colors.statusBadge}`}>
                                {itemDetails.safetyStatus}
                              </span>
                            </div>

                            {/* Supporting description message text */}
                            <p className="text-[11px] font-medium text-white/50 leading-relaxed font-sans break-words pb-2 pr-1">
                              {item.description || item.message}
                            </p>

                            {/* Outcome meta information details */}
                            <div className="flex items-center justify-between border-t border-white/[0.02] pt-2 mt-0.5">
                              <span className="text-[8.5px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-1 font-mono">
                                <span className={`w-1 h-1 rounded-full ${colors.textClass} animate-pulse`} />
                                {itemDetails.eventOutcome}
                              </span>
                              <span className="text-[9px] font-mono font-bold tracking-wider text-[#3BE0B9]/80 flex items-center gap-1 shrink-0">
                                <Clock size={10} className="text-white/20" />
                                {item.timestamp}
                              </span>
                            </div>
                          </GlassCard>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>

    </div>
  );
}
