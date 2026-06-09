import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Home, Compass, MapPin, Moon, Sun, Bell, Mic, Check, HelpCircle, Activity } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import introPenguin from '../assets/ANIMATIONS/introductive_penguin.webm';
import PenThoughtBubble from '../components/PenThoughtBubble';

export default function QuickStatusView() {
  const { userStatus, updateUserStatus, isDarkMode } = useApp();
  const [customStatus, setCustomStatus] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const statusPresets = [
    { title: 'Reached Home', text: 'Reached Home safely', emoji: '🏠', desc: 'Notify your circle that you reached home safely', color: 'text-emerald-400 bg-emerald-500/10' },
    { title: 'Leaving Now', text: 'Leaving Now', emoji: '📍', desc: 'Let guardians know you are on your way', color: 'text-indigo-400 bg-indigo-500/10' },
    { title: 'At Destination', text: 'At Destination safely', emoji: '🎯', desc: 'Signal successful arrival at your final spot', color: 'text-rose-400 bg-rose-500/10' },
    { title: 'Good Night', text: 'Turning in for the night', emoji: '🌙', desc: 'Indicate that you are turning in for the night', color: 'text-purple-400 bg-purple-500/10' },
    { title: 'Good Morning', text: 'Awake and active', emoji: '☀️', desc: 'Start your day active and in monitoring', color: 'text-amber-400 bg-amber-500/10' },
    { title: 'Busy Right Now', text: 'Focused & unavailable', emoji: '🔕', desc: 'Mute/pause alerts while preoccupied', color: 'text-sky-400 bg-sky-500/10' }
  ];

  const handleUpdate = (statusText: string) => {
    updateUserStatus(statusText);
    setStatusMessage(`Status updated to "${statusText}"`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStatus.trim()) return;
    handleUpdate(customStatus.trim());
    setCustomStatus('');
  };

  const textColor = isDarkMode ? 'text-white' : 'text-navy-dark';
  const subTextColor = isDarkMode ? 'text-white/40' : 'text-navy-dark/40';

  return (
    <div className="flex flex-col gap-6 py-6 h-full select-none animate-fade-in max-w-lg mx-auto pb-24">
      {/* Header */}
      <header className="flex flex-col gap-1 px-2">
        <span className={`text-[12px] uppercase tracking-[0.3em] font-black flex items-center gap-1.5 ${subTextColor}`}>
          <Activity size={12} className="text-[#3BE0B9]" />
          Instant Check-In
        </span>
        <h1 className={`text-4xl font-display font-black tracking-tight ${textColor}`}>
          Quick Status
        </h1>
        <p className={`text-xs ${subTextColor} leading-relaxed mt-1 font-medium`}>
          Let your trusted circle know how you're doing in a single tap.
        </p>
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
          screenName="status" 
          pointerPosition="left" 
          className="flex-1 max-w-full" 
          style={{ width: "245.375px", height: "42px" }}
        />
      </GlassCard>

      {/* Toast Alert */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2"
          >
            <Check size={14} className="stroke-[3px]" />
            <span>{statusMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preset Status List */}
      <section className="flex flex-col gap-2.5">
        {statusPresets.map((preset, idx) => {
          const representsCurrent = userStatus === preset.text;
          const isAtDestination = preset.title === 'At Destination';
          const sizeClass = isAtDestination ? 'w-[291px] h-[61.5px]' : 'w-[290px] h-[61.5px]';

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleUpdate(preset.text)}
              className={`${sizeClass} p-4 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all duration-300 relative group active:scale-[0.99] ${
                representsCurrent
                  ? 'bg-[#3BE0B9]/15 border-[#3BE0B9]/40 text-[#3BE0B9] shadow-[0_4px_16px_rgba(59,224,185,0.06)] bg-gradient-to-br from-[#3BE0B9]/5 to-transparent'
                  : 'bg-[#06080e]/65 border-white/[0.04] text-white/70 hover:bg-white/[0.02] hover:border-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-[40px] h-[40px] rounded-xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center text-xl shrink-0">
                  {preset.emoji}
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-bold tracking-tight text-white/90 group-hover:text-[#3BE0B9] transition-colors">{preset.title}</span>
                  <span className="text-[11px] font-medium text-slate-400 block mt-0.5 leading-tight">{preset.desc}</span>
                </div>
              </div>
              <div className="shrink-0 flex items-center pr-1">
                {representsCurrent ? (
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
      </section>

      {/* Custom Status Input Form */}
      <section className="flex flex-col gap-3">
        <h2 className={`text-xs font-bold uppercase tracking-widest ml-1 ${subTextColor}`}>Custom Status</h2>
        <form onSubmit={handleCustomSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Write your own status..."
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              className="w-full h-13 pl-5 pr-12 rounded-2xl bg-[#06080e]/50 border border-white/10 text-white placeholder-white/30 text-xs font-semibold focus:outline-none focus:border-primary/40 transition-all font-sans"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/50 hover:text-white transition-all cursor-help"
              title="Voice status triggered automatically if saying keywords"
            >
              <Mic size={14} />
            </button>
          </div>
          <button
            type="submit"
            className="h-13 px-6 bg-primary hover:bg-primary/95 text-white font-bold uppercase tracking-widest text-[10px] rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            Update
          </button>
        </form>
      </section>

      {/* Mascot Tip Box with Restraint Design */}
      <GlassCard className="p-4 border-dashed border-white/15 bg-transparent rounded-3xl mt-2">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center text-[18px]">🐧</div>
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wide text-white/80">Pen's Companion Note</h4>
            <p className="text-xs text-white/45 leading-relaxed font-sans font-medium">
              Your trusted contacts are instantly sent these check-ins across SafePing endpoints. Keep your circle in sync.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
