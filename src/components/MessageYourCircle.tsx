import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Check, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import GlassCard from './GlassCard';

export default function MessageYourCircle() {
  const { guardians, addCheckin } = useApp();
  
  // Recipients selected state (defaults to all active guardians)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => 
    guardians.map(g => g.id)
  );

  // Message draft state
  const [customMessage, setCustomMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  // Preset prompt updates
  const presetMessages = [
    "Just checking in, everything looks safe! 😊",
    "Heading out now. Sharing my live status tracking.",
    "Almost at my destination, will update upon arrival."
  ];

  const handleToggleRecipient = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handleSelectPreset = (preset: string) => {
    setCustomMessage(preset);
    setActivePreset(preset);
  };

  const handleBroadcast = () => {
    const finalMsg = customMessage.trim() || "SafePing quick check-in: I am safe.";
    const selectedGuardians = guardians.filter(g => selectedIds.includes(g.id));
    
    if (selectedGuardians.length === 0) return;

    // Compile recipient phone numbers
    const phones = selectedGuardians.map(g => g.phone).filter(Boolean);
    const namesList = selectedGuardians.map(g => g.name).join(', ');

    // Platform-optimized SMS string
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const linkSeparator = isIOS ? '&' : '?';
    const smsHref = `sms:${phones.join(',')}${linkSeparator}body=${encodeURIComponent(finalMsg)}`;

    // Set location directly to open SMS app drawer
    window.location.href = smsHref;

    // Log the action to AppContext/Firebase safely so it's logged in real-life history
    addCheckin(`Update shared with ${selectedGuardians.length} guardians: "${finalMsg}"`, 'status');

    // Trigger visual success reaction
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setCustomMessage('');
      setActivePreset(null);
    }, 4500);
  };

  if (guardians.length === 0) {
    return (
      <div className="w-full font-sans opacity-45 pointer-events-none" id="message-circle-disabled">
        <h2 className="text-[12px] font-extrabold font-plus-jakarta uppercase tracking-widest ml-1 mb-3 text-white/40">
          Message Your Circle
        </h2>
        <GlassCard className="p-5 border border-white/5 bg-white/[0.01]">
          <p className="text-xs text-white/30 font-inter">
            Add standard or priority emergency contacts to access rapid group broadcasts.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="w-full font-sans flex flex-col gap-3" id="message-circle-module">
      {/* Title */}
      <div className="flex flex-col gap-0.5 ml-1">
        <h2 className="text-[12px] font-extrabold font-plus-jakarta uppercase tracking-widest text-[#5cdeff]/50 leading-none">
          Message Your Circle
        </h2>
      </div>

      <GlassCard className="p-5 border border-white/5 bg-white/[0.02] flex flex-col gap-4 relative z-10">
        
        {/* Recipients Select List */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-wider text-white/40">
            Selected Recipients
          </span>
          <div className="flex flex-wrap gap-2">
            {guardians.map(g => {
              const isChecked = selectedIds.includes(g.id);
              return (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => handleToggleRecipient(g.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold font-plus-jakarta flex items-center gap-1.5 transition-all outline-none border active:scale-95 ${
                    isChecked
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                      : 'bg-white/[0.02] border-white/5 text-white/40'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-black/30 text-[9px] flex items-center justify-center font-bold text-cyan-300">
                    {isChecked ? <Check size={10} className="stroke-cyan-300 stroke-[3px]" /> : g.name[0]}
                  </span>
                  <span>{g.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-wider text-white/40">
            Quick Check-Ins
          </span>
          <div className="flex flex-col gap-1.5">
            {presetMessages.map((msg, idx) => {
              const isActive = activePreset === msg;
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectPreset(msg)}
                  className={`text-left text-xs font-medium font-inter p-2.5 rounded-xl transition-all border outline-none ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/20 to-transparent border-cyan-500/25 text-cyan-300'
                      : 'bg-white/[0.01] hover:bg-white/[0.03] border-white/5 text-white/60'
                  }`}
                >
                  {msg}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input & Sending block */}
        <div className="flex flex-col gap-2.5 mt-1">
          <div className="relative">
            <textarea
              rows={2}
              value={customMessage}
              onChange={(e) => {
                setCustomMessage(e.target.value);
                setActivePreset(null);
              }}
              placeholder="Draft custom status updates..."
              className="w-full bg-[#090f1d]/60 hover:bg-[#0c1426]/70 text-white border border-white/5 focus:border-cyan-500/35 text-xs rounded-xl p-3 pr-10 outline-none resize-none transition-all font-medium font-inter placeholder:text-white/30"
            />
            {customMessage && (
              <button
                type="button"
                onClick={() => {
                  setCustomMessage('');
                  setActivePreset(null);
                }}
                className="absolute right-3.5 top-3.5 text-white/30 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleBroadcast}
            disabled={selectedIds.length === 0}
            className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 font-bold font-plus-jakarta text-xs uppercase tracking-wider transition-all active:scale-[0.98] ${
              selectedIds.length === 0
                ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                : isSent
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-lg'
                  : 'bg-primary text-white border border-primary/10 hover:brightness-110 shadow-lg shadow-primary/20'
            }`}
          >
            {isSent ? (
              <>
                <Check size={14} className="stroke-[3px]" />
                <span>Message Dispatched</span>
              </>
            ) : (
              <>
                <MessageSquare size={14} />
                <span>Broadcast to Circle</span>
              </>
            )}
          </button>
        </div>

      </GlassCard>
    </div>
  );
}
