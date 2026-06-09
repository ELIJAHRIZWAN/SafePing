import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Shield, X, Phone, User, Trash2, Plus, Edit3, Heart, Sparkles, Star, ChevronDown, MessageSquare, Battery, Activity, Send, CheckCircle2, Navigation } from 'lucide-react';
import callingPenguin from '../assets/ANIMATIONS/calling_penguin.webm';
import GlassCard from '../components/GlassCard';
import GuardianModal from '../components/GuardianModal';
import AIGuardianCompanion from '../components/AIGuardianCompanion';
import MessageYourCircle from '../components/MessageYourCircle';
import { useApp } from '../context/AppContext';
import { Guardian } from '../types';
import { CompanionAvatar } from '../components/CompanionAvatar';
import { acceptInviteCode } from '../services/firebase';
import PenThoughtBubble from '../components/PenThoughtBubble';

export default function GuardiansView() {
  const { 
    guardians, 
    removeGuardian, 
    isDarkMode, 
    setActiveCallGuardian, 
    safeMessages, 
    replyToSafeMessage, 
    simulateIncomingSafeMessage,
    recentCheckins,
    user,
    connectionsList,
    firebaseUser,
    userStatus,
    updateUserStatus,
    addCheckin
  } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Active Selected Guardian for top horizontal bar
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeGuardian = useMemo(() => {
    return guardians.find(g => g.id === selectedId) || guardians[0] || null;
  }, [guardians, selectedId]);

  // Circle Broadcast Custom Message states
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [msgSentSuccess, setMsgSentSuccess] = useState(false);

  React.useEffect(() => {
    if (guardians.length > 0 && selectedRecipientIds.length === 0) {
      setSelectedRecipientIds(guardians.map(g => g.id));
    }
  }, [guardians]);

  const handleSendCustomMessage = () => {
    const finalMsg = customMessage.trim() || "SafePing quick check-in: I am safe.";
    const selectedGuardians = guardians.filter(g => selectedRecipientIds.includes(g.id));
    if (selectedGuardians.length === 0) return;

    const phones = selectedGuardians.map(g => g.phone).filter(Boolean);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const linkSeparator = isIOS ? '&' : '?';
    const smsHref = `sms:${phones.join(',')}${linkSeparator}body=${encodeURIComponent(finalMsg)}`;

    window.location.href = smsHref;

    addCheckin(`Update shared with ${selectedGuardians.length} guardians: "${finalMsg}"`, 'status');

    setIsSendingMsg(true);
    setTimeout(() => {
      setIsSendingMsg(false);
      setMsgSentSuccess(true);
      setTimeout(() => {
        setMsgSentSuccess(false);
        setCustomMessage('');
      }, 4000);
    }, 800);
  };

  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [acceptingStatus, setAcceptingStatus] = useState('');

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim() || !firebaseUser) return;
    setAcceptingStatus('Connecting...');
    try {
      const res = await acceptInviteCode(firebaseUser.uid, user.name, firebaseUser.email || '', inviteCodeInput.trim());
      if (res) {
         setAcceptingStatus('Success! Circle safely linked.');
         setInviteCodeInput('');
      } else {
         setAcceptingStatus('Invalid code or expired.');
      }
    } catch (err) {
      setAcceptingStatus('Invalid code or expired.');
    }
    setTimeout(() => setAcceptingStatus(''), 4000);
  };

  const handleOpenAddModalWithPrefilled = (prefilled?: Partial<Guardian>) => {
    if (prefilled) {
      setEditingGuardian({
        id: "", // empty id specifies dynamic prefilled new addition
        name: prefilled.name || "",
        phone: prefilled.phone || "",
        relationship: prefilled.relationship || "",
        avatar: "", // GuardianModal will dynamically assign default based on relationship
        isPriority: !!prefilled.isPriority
      });
    } else {
      setEditingGuardian(null);
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    removeGuardian(id);
    setDeleteConfirmId(null);
  };

  const handleEdit = (guardian: Guardian) => {
    setEditingGuardian(guardian);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingGuardian(null);
    setIsModalOpen(true);
  };

  const textColor = isDarkMode ? 'text-white' : 'text-navy-dark';
  const subTextColor = isDarkMode ? 'text-white/40' : 'text-navy-dark/40';

  // Sort: Emergency Priority contacts float to top
  const sortedGuardians = useMemo(() => {
    return [...guardians].sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return 0;
    });
  }, [guardians]);

  // Read latest 3 historic checkin activities for the interactive timeline
  const recentGuardianLogs = useMemo(() => {
    return recentCheckins
      .filter((item: any) => item.type === 'checkin')
      .slice(0, 3);
  }, [recentCheckins]);

  // Select an emotional greeting phrase based on contacts present
  const emotionalHeading = useMemo(() => {
    if (guardians.length === 0) {
      return "You don't have to handle difficult moments alone. Let's make sure someone you trust is close by.";
    }
    const hasPriority = guardians.some(g => g.isPriority);
    if (!hasPriority) {
      return "Want me to know who to reach if something ever feels wrong? Let's mark someone as a priority contact.";
    }
    return "Your safety contacts are secured. If something feels unsafe, I've got a direct channel ready to protect you.";
  }, [guardians]);

  // Get tailored handwritten note for each guardian in Happy Monkey font
  const getGuardianCustomNote = (guardian: Guardian): string => {
    const rel = guardian.relationship.toLowerCase();
    const name = guardian.name.toLowerCase();
    if (rel.includes('mother') || rel.includes('mom') || name.includes('mum') || name.includes('mom')) {
      return "Call me when you arrive.";
    }
    if (rel.includes('father') || rel.includes('dad') || name.includes('papa') || name.includes('dad')) {
      return "Everything okay?";
    }
    if (name.includes('riya') || rel.includes('friend') || rel.includes('bestie')) {
      return "Text me when you're home.";
    }
    if (guardian.isPriority) {
      return "Take care.";
    }
    return "Proud of you.";
  };

  if (user.role === 'guardian') {
    return (
      <div className="flex flex-col gap-8 min-h-[85vh] py-6 select-none pb-24 animate-fade-in font-sans">
        
        {/* Header */}
        <header className="flex flex-col gap-1 px-2">
          <span className={`text-[12px] uppercase tracking-[0.18em] font-extrabold flex items-center gap-1.5 font-plus-jakarta ${subTextColor}`}>
            <Heart size={10} className="fill-current text-[#5cdeff]" />
            Safety Circle Connect
          </span>
          <h1 className={`text-4xl font-plus-jakarta font-extrabold tracking-tight ${textColor}`}>
            Link Circle
          </h1>
        </header>

        {/* Invite Code Connect Box */}
        <GlassCard className="p-6 rounded-[24px] border border-white/[0.04] bg-[#0d1324]/30 backdrop-blur-2xl flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-sm text-white">Accept Connection Invitation</h3>
            <p className="text-white/50 text-xs">Enter the secure 6-letter invite code shared by the protected person to join their circle.</p>
          </div>

          <form onSubmit={handleAcceptInvite} className="flex gap-2.5">
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. EX8F7A"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-center font-mono font-black tracking-[0.25em] uppercase outline-none focus:border-primary/50 text-white placeholder-white/30"
              required
            />
            <button
              type="submit"
              disabled={inviteCodeInput.length !== 6}
              className="px-6 rounded-2xl bg-primary text-white font-bold text-xs uppercase tracking-wider transition-all hover:brightness-110 active:scale-95 disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
            >
              Connect
            </button>
          </form>

          {acceptingStatus && (
            <div className={`text-xs pl-1 font-semibold ${
              acceptingStatus.includes('Success') ? 'text-[#3be0b9]' : 'text-rose-450'
            }`}>
              {acceptingStatus}
            </div>
          )}
        </GlassCard>

        {/* Existing links they handle */}
        <div className="flex flex-col gap-4 px-1">
          <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-[#3BE0B9] pl-1">
            MUTUAL SECURITY CIRCLES ({connectionsList.length})
          </h2>

          {connectionsList.length === 0 ? (
            <GlassCard className="p-6 text-center text-[#E8E6F0]/40 text-xs font-semibold">
              You are not monitoring anyone yet. Please ask the member to share an invitation code with you.
            </GlassCard>
          ) : (
            connectionsList.map((conn) => (
              <GlassCard key={conn.id} className="p-5 rounded-[24px] border border-white/[0.04] bg-white/[0.015] flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-4.5">
                  <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-primary font-mono select-none">
                    {conn.guardianName ? conn.guardianName[0].toUpperCase() : 'P'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-sm text-white tracking-wide">
                      {conn.guardianName}
                    </span>
                    <span className="text-[11px] text-white/50">
                      Connected as {conn.relationship || 'Guardian'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-[#3be0b9] text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider font-mono">
                    ✓ Connected
                  </span>
                  <button
                    onClick={() => handleDelete(conn.id)}
                    className="p-2 text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                    title="Disconnect circle"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    )  }  return (
    <div className="relative flex flex-col gap-7 min-h-[85vh] py-6 select-none pb-24 animate-fade-in text-white">

      <div className="relative z-10 flex flex-col gap-6 font-sans">
        {/* HEADER */}
        <header className="flex flex-col gap-2 px-1 text-left mt-2">
          <span className="text-[11px] uppercase tracking-[0.25em] font-black flex items-center gap-1.5 text-[#3be0b9]">
            <Heart size={11} className="fill-current text-[#3be0b9]" />
            Your Escort Loop
          </span>
          <div className="flex justify-between items-center mt-1">
            <h1 className="text-5xl font-black tracking-widest text-white font-plus-jakarta uppercase select-none leading-none">
              TRUSTED CIRCLE
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed font-inter mt-1">
            Your family and trusted protectors. Standing by to guarantee you make it back home safely.
          </p>
        </header>

        {/* SECTION 1: Guardian Penguin 🐧 */}
        <section className="bg-[#0b101c]/50 backdrop-blur-xl border border-white/10 p-5 rounded-[28px] text-center shadow-2xl relative overflow-hidden flex flex-col items-center gap-4 bg-gradient-to-br from-[#121c33]/25 via-[#0a0f1d]/55 to-[#050811]/65">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#0ef]/[0.02] blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/[0.02] blur-3xl pointer-events-none" />

          {/* Side-by-side mascot and message layout */}
          <div className="rounded-[24px] border border-white/5 bg-transparent relative overflow-visible flex items-center justify-between gap-4 w-full"
               style={{ height: "130px", paddingLeft: "8px", paddingRight: "8px" }}
          >
            <div className="flex items-center gap-4 w-full">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-penguin-assistant'))}
                className="rounded-2xl overflow-hidden shrink-0 border border-white/10 flex items-center justify-center bg-white/5 hover:scale-[1.03] active:scale-[0.97] transition-all relative"
                style={{ height: "75px", width: "74px" }}
              >
                <div className="scale-[1.4] flex items-center justify-center" style={{ width: "69px", height: "95px" }}>
                  <video
                    src={callingPenguin}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain pointer-events-none filter brightness-110"
                  />
                </div>
                <span className="absolute bottom-0 right-1 w-3.5 h-3.5 rounded-full bg-[#1DBB8A] border-2 border-[#090e1b] shadow-md z-20 animate-pulse" />
              </button>
              
              <div className="flex-1 text-left">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#3be0b9] font-sans mb-1.5 pl-0.5 leading-none">
                  Companion Pen
                </h4>
                <PenThoughtBubble 
                  screenName="guardians" 
                  pointerPosition="left" 
                  className="w-full max-w-full" 
                  style={{ width: "245.375px", height: "42px" }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full font-sans relative z-10">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('safeping-open-chat'))}
              className="flex-1 h-11.5 rounded-2xl bg-[#03060c]/45 border border-[#3BE0B9]/20 hover:border-[#3BE0B9]/45 hover:bg-[#121a2e]/60 text-[#3be0b9] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.97] cursor-pointer outline-none"
            >
              <MessageSquare size={13} className="text-[#3BE0B9]" />
              <span>Ask Pen</span>
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('safeping-trigger-fake-call'))}
              className="flex-1 h-11.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/25 text-cyan-300 hover:text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.97] cursor-pointer outline-none"
            >
              <Phone size={13} className="fill-current text-cyan-300" />
              <span>Call Pen</span>
            </button>
          </div>
        </section>

        {/* SECTION 2: My Guardians (Vertical row list) */}
        <section className="bg-[#0b101c]/50 backdrop-blur-xl border border-white/10 p-5 rounded-[28px] text-left shadow-2xl space-y-4">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">
                My Guardians
              </h3>
              <p className="text-[11px] text-slate-350 mt-1.5 font-inter">
                People actively linked to receive real-time updates and emergency alerts
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {sortedGuardians.map((guardian) => {
              const isExpanded = expandedId === guardian.id;
              const hasEmergency = guardian.status === 'attention' || guardian.status === 'emergency';
              const relText = guardian.relationship;
              const titlePrefix = relText.includes('Mother') || relText.includes('Mom') || guardian.name.toLowerCase().includes('mum') ? '👩' : relText.includes('Father') || relText.includes('Dad') || guardian.name.toLowerCase().includes('papa') ? '👨' : '👥';

              return (
                <div 
                  key={guardian.id}
                  className={`rounded-[24px] border transition-all duration-300 overflow-hidden ${
                    isExpanded 
                      ? 'bg-[#121c32]/65 border-[#5cdeff]/40 shadow-lg' 
                      : 'bg-[#060a12]/45 border-white/[0.04] hover:bg-[#0a0f1c]/65 hover:border-white/10'
                  }`}
                >
                  {/* Clickable Header Row */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : guardian.id)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <CompanionAvatar
                        avatar={guardian.avatar}
                        relationship={guardian.relationship}
                        status={guardian.status}
                        size={46}
                        isPriority={guardian.isPriority}
                        name={guardian.name}
                      />
                      <div className="min-w-0 text-left font-sans">
                        <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5 leading-none">
                          <span className="text-base select-none">{titlePrefix}</span>
                          <span>{guardian.name}</span>
                          {guardian.isPriority && (
                            <span className="bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider scale-90 origin-left">
                              Primary
                            </span>
                          )}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            guardian.isPending 
                              ? 'bg-yellow-400' 
                              : hasEmergency 
                                ? 'bg-red-500 animate-pulse' 
                                : guardian.status === 'offline' 
                                  ? 'bg-zinc-500' 
                                  : 'bg-[#1DBB8A]'
                          }`} />
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            guardian.isPending 
                              ? 'text-yellow-400' 
                              : hasEmergency 
                                ? 'text-red-400 font-extrabold animate-pulse' 
                                : guardian.status === 'offline' 
                                  ? 'text-zinc-500' 
                                  : 'text-[#1DBB8A]'
                          }`}>
                            {guardian.isPending ? 'Pending' : 'Connected'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Compact Shortcut Action Buttons on Row */}
                      {!guardian.isPending && (
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCallGuardian(guardian);
                            }}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-[#5cdeff]/10 hover:text-[#5cdeff] transition-all cursor-pointer"
                            title="Call Guardian"
                          >
                            <Phone size={13} className="fill-current text-[#5cdeff]" />
                          </button>
                          <a
                            href={`sms:${guardian.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-[#3BE0B9]/10 hover:text-[#3BE0B9] transition-all flex items-center justify-center cursor-pointer"
                            title="Message Guardian"
                          >
                            <MessageSquare size={13} className="text-[#3BE0B9]" />
                          </a>
                        </div>
                      )}
                      
                      <ChevronDown 
                        size={16} 
                        className={`text-white/40 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-white/90' : ''}`} 
                      />
                    </div>
                  </div>

                  {/* Expanded Settings Detail */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-white/[0.05] bg-[#03060c]/40 text-left"
                      >
                        <div className="p-4 space-y-4 font-sans">
                          {guardian.isPending ? (
                            <div className="space-y-3">
                              <p className="text-slate-300 text-xs leading-relaxed">
                                Share this security invitation code with <strong>{guardian.name}</strong> to let them connect instantly.
                              </p>
                              <div className="bg-[#3BE0B9]/12 border border-[#3BE0B9]/25 p-3 rounded-xl flex items-center justify-between gap-2">
                                <span className="font-mono text-xs sm:text-sm font-black tracking-widest text-[#3BE0B9] uppercase selection:bg-teal-900 leading-none">
                                  {guardian.inviteCode || 'CODE_ERR'}
                                </span>
                                <span className="text-[10px] font-black uppercase text-slate-400 select-none">Copy Code</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-1">
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block leading-none">
                                Intimate Custom Update Note
                              </span>
                              <p className="font-happy-monkey text-[14px] text-[#a0cfe4] leading-relaxed mt-1 font-normal">
                                "{getGuardianCustomNote(guardian)}"
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(guardian)}
                              className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/90 font-bold text-xs flex items-center justify-center gap-1.5 transition-all outline-none cursor-pointer"
                            >
                              <Edit3 size={13} />
                              <span>Configure</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(guardian.id)}
                              className="h-10 px-4 rounded-xl bg-rose-500/10 border border-rose-500/15 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all outline-none cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Sever Link</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {guardians.length === 0 && (
              <div className="p-6 rounded-[24px] border border-dashed border-white/10 bg-white/[0.01] text-center text-slate-400 text-xs py-8">
                No family or trusted contacts added yet. Secure your loop below!
              </div>
            )}

            {/* Direct Add Guardian button row */}
            <button
              type="button"
              onClick={handleAdd}
              className="w-full p-4 rounded-2xl border border-dashed border-[#3BE0B9]/20 hover:border-[#3BE0B9]/40 bg-[#3BE0B9]/[0.02] hover:bg-[#3BE0B9]/[0.05] text-[#3be0b9] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer mt-1"
            >
              <Plus size={15} />
              <span>Add Guardian</span>
            </button>
          </div>
        </section>

        {/* SECTION 3: Circle Chat */}
        <section className="bg-[#0b101c]/50 backdrop-blur-xl border border-white/10 p-5 rounded-[28px] text-left shadow-2xl space-y-4">
          <div className="flex flex-col text-left px-0.5 font-sans">
            <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">
              Circle Chat
            </h3>
            <p className="text-[11px] text-slate-350 mt-1.5 font-inter">
              Direct and automatic reassurance exchanges with your family
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#03060c]/40 border border-white/[0.04] flex flex-col gap-3 font-sans">
            {/* Mumma prompt bubble */}
            <div className="flex flex-col gap-1 max-w-[85%] self-start text-left">
              <span className="text-[10px] font-black text-[#5cdeff] pl-1.5 flex items-center gap-1 uppercase tracking-wider select-none">
                👩 Mumma
              </span>
              <div className="p-3 bg-white/[0.03] border border-white/5 rounded-[18px] rounded-tl-none">
                <p className="text-[13.5px] text-white/95 font-happy-monkey font-medium leading-relaxed">Reached?</p>
              </div>
            </div>

            {/* Papa prompt bubble */}
            <div className="flex flex-col gap-1 max-w-[85%] self-start text-left">
              <span className="text-[10px] font-black text-amber-300 pl-1.5 flex items-center gap-1 uppercase tracking-wider select-none">
                👨 Papa
              </span>
              <div className="p-3 bg-white/[0.03] border border-white/5 rounded-[18px] rounded-tl-none">
                <p className="text-[13.5px] text-white/95 font-happy-monkey font-medium leading-relaxed">Call me when home.</p>
              </div>
            </div>

            {/* Dynamic Interactive Safe Messages Waiting for Safety confirm replies */}
            {safeMessages.length > 0 && (
              <div className="pt-2.5 border-t border-white/10 space-y-3">
                <span className="text-[9px] font-black tracking-widest text-[#3be0b9] uppercase pl-1.5 block">
                  Active Safety Prompts ({safeMessages.length})
                </span>
                <div className="flex flex-col gap-3">
                  {safeMessages.map((msg) => (
                    <SafeMessageCard
                      key={msg.id}
                      msg={msg}
                      replyToSafeMessage={replyToSafeMessage}
                      isDarkMode={isDarkMode}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Open Chat button */}
          <div className="flex">
            <button
              onClick={() => {
                // Trigger Pen companion chat window open
                window.dispatchEvent(new CustomEvent('safeping-open-chat'));
                const messageSection = document.getElementById('message-circle-module') || document.getElementById('custom-message-broadcast-section');
                if (messageSection) messageSection.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full h-11.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <MessageSquare size={13} className="text-[#3BE0B9]" />
              <span>Open Chat</span>
            </button>
          </div>
        </section>

        {/* SECTION 4: Quick Updates */}
        <section className="bg-[#0b101c]/50 backdrop-blur-xl border border-white/10 p-5 rounded-[28px] text-left shadow-2xl space-y-4">
          <div className="flex flex-col text-left px-0.5">
            <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">
              Quick Updates
            </h3>
            <p className="text-[11px] text-slate-350 mt-1.5 font-inter">
              Instantly adjust your status and notify all guardians in your circle
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              {
                statusValue: 'Reached Home',
                emoji: '🏠',
                label: 'Reached Home',
                desc: 'Notify guardians that I arrived safely'
              },
              {
                statusValue: 'Leaving Now',
                emoji: '📍',
                label: 'Leaving Now',
                desc: 'Notify guardians that my journey has started'
              },
              {
                statusValue: 'At Destination',
                emoji: '🎯',
                label: 'At Destination',
                desc: 'Send arrival confirmation'
              },
              {
                statusValue: 'Good Night',
                emoji: '🌙',
                label: 'Good Night',
                desc: 'Send evening safety check-in'
              }
            ].map((act) => {
              const isCurrent = (userStatus || 'Safe').toLowerCase() === act.statusValue.toLowerCase();

              return (
                <button
                  key={act.statusValue}
                  type="button"
                  onClick={() => {
                    updateUserStatus(act.statusValue);
                    addCheckin(`Update shared: "${act.statusValue}"`, 'status');
                  }}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all duration-300 relative group active:scale-[0.99] select-none cursor-pointer ${
                    isCurrent
                      ? 'bg-[#3BE0B9]/15 border-[#3BE0B9]/45 text-[#3BE0B9] shadow-[0_4px_16px_rgba(59,224,185,0.06)] bg-gradient-to-br from-[#3BE0B9]/5 to-transparent'
                      : 'bg-[#06080e]/65 border-white/[0.04] text-white/70 hover:bg-white/[0.02] hover:border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-[40px] h-[40px] rounded-xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center text-xl shrink-0">
                      {act.emoji}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-sm font-bold tracking-tight text-white/95 group-hover:text-[#3BE0B9] transition-colors">{act.label}</span>
                      <span className="text-[11px] font-medium text-slate-300 block mt-0.5 leading-tight">{act.desc}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center pr-1">
                    {isCurrent ? (
                      <span className="h-5 px-2.5 rounded-full bg-[#3BE0B9]/20 border border-[#3BE0B9]/30 text-[9px] font-black uppercase tracking-wider text-[#3BE0B9] flex items-center justify-center">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
                        Send
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION 4.5: Custom Broadcast SMS Composer Box  */}
        <section id="custom-message-broadcast-section" className="bg-[#0b101c]/50 backdrop-blur-xl border border-white/10 p-5 rounded-[28px] text-left shadow-2xl space-y-4">
          <div className="flex flex-col text-left px-0.5 font-sans">
            <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">
              Broadcast Message
            </h3>
            <p className="text-[11px] text-slate-350 mt-1.5 font-inter">
              Compose a custom reassurance message to broadcast to your loop
            </p>
          </div>

          {/* Recipients select chip panel */}
          {guardians.length > 0 && (
            <div className="flex flex-col gap-2 font-sans">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 select-none">
                Broadcast Recipients
              </span>
              <div className="flex flex-wrap gap-2">
                {guardians.map(g => {
                  const isChecked = selectedRecipientIds.includes(g.id);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => {
                        setSelectedRecipientIds(prev =>
                          prev.includes(g.id)
                            ? prev.filter(id => id !== g.id)
                            : [...prev, g.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold font-plus-jakarta flex items-center gap-1.5 transition-all outline-none border active:scale-95 cursor-pointer ${
                        isChecked
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                          : 'bg-white/[0.02] border-white/5 text-slate-400'
                      }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-black/35 text-[9px] flex items-center justify-center font-bold text-cyan-300 select-none">
                        {isChecked ? '✓' : g.name[0].toUpperCase()}
                      </span>
                      <span>{g.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Typing area and Send button */}
          <div className="space-y-3.5 font-sans">
            <div className="relative">
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type dynamic message (e.g. 'Stuck in heavy traffic but perfectly fine! Will home by 7:15...')"
                className="w-full bg-[#03060c]/40 text-white border border-white/10 hover:border-white/20 focus:border-[#3BE0B9]/40 text-xs rounded-xl p-3 pr-10 outline-none resize-none transition-all font-medium font-inter placeholder:text-slate-500 text-left"
              />
              {customMessage && (
                <button
                  type="button"
                  onClick={() => setCustomMessage('')}
                  className="absolute right-3 top-3 text-slate-500 hover:text-white text-[11px]"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSendCustomMessage}
              disabled={isSendingMsg || !customMessage.trim() || selectedRecipientIds.length === 0}
              className={`w-full h-11.5 rounded-xl flex items-center justify-center gap-2 font-black font-plus-jakarta text-xs uppercase tracking-widest transition-all active:scale-[0.98] ${
                !customMessage.trim() || selectedRecipientIds.length === 0
                  ? 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                  : msgSentSuccess
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-lg'
                    : 'bg-[#3BE0B9] hover:bg-[#3BE0B9]/90 text-slate-950 font-black'
              }`}
            >
              {msgSentSuccess ? (
                <>
                  <CheckCircle2 size={14} className="stroke-[3px]" />
                  <span>Update Shared</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Send to Circle</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* SECTION 5: Activity History */}
        <section className="bg-[#0b101c]/50 backdrop-blur-xl border border-white/10 p-5 rounded-[28px] text-left shadow-2xl space-y-4">
          <div className="flex flex-col text-left px-0.5">
            <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">
              Activity History
            </h3>
            <p className="text-[11px] text-slate-350 mt-1.5 font-inter">
              Timeline logs of check-ins, safety confirmations, and escort responses
            </p>
          </div>

          <div className="relative pl-4 border-l border-white/10 ml-2.5 space-y-4">
            {recentGuardianLogs.length > 0 ? (
              recentGuardianLogs.map((log: any) => {
                const containsAuto = log.description.toLowerCase().includes("auto-replied") || log.description.toLowerCase().includes("automatic");
                return (
                  <div key={log.id} className="relative text-left leading-normal">
                    {/* Bullet indicator */}
                    <div className={`absolute left-[-21.5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#0b101c] z-10 ${
                      containsAuto ? 'bg-[#1DBB8A]' : 'bg-[#5cdeff]'
                    }`} />
                    
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2.5">
                        <span className="text-[12.5px] font-bold text-white tracking-tight truncate">
                          {log.title}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0">
                          {log.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-inter pr-1">
                        {log.description}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-1 font-inter">
                No recent activity logged in this Circle. Keep everyone in loop below.
              </p>
            )}
          </div>

          {/* Simulation button for active tester updates */}
          <div className="flex justify-center pt-2">
            <button
              onClick={simulateIncomingSafeMessage}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-bold text-[#5cdeff] font-sans transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={11} className="text-[#5cdeff]" />
              Simulate Guardian Reply Check-In Request
            </button>
          </div>
        </section>
      </div>

      {/* Embedded AIGuardianCompanion so its global events, dialogs & voice are active and ready */}
      <div className="hidden">
        <AIGuardianCompanion onOpenAddModal={handleOpenAddModalWithPrefilled} />
      </div>

      {/* Delete Confirmation Modal Overlay */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1500] flex items-center justify-center px-6"
          >
            <div className="absolute inset-x-0 inset-y-0 bg-black/80 backdrop-blur-md" onClick={() => setDeleteConfirmId(null)} />

            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="relative rounded-[36px] p-8 flex flex-col items-center gap-6 max-w-sm text-center border border-white/10 shadow-2xl pointer-events-auto bg-[#070b1e] text-white"
            >
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 animate-pulse">
                <Trash2 size={24} />
              </div>

              <div className="space-y-2 font-sans">
                <h3 className="text-xl font-plus-jakarta font-extrabold text-white tracking-tight">Sever Connection?</h3>
                <p className="text-xs leading-relaxed text-slate-350 font-inter px-2">
                  Are you absolutely sure you want to remove this person from your emergency security loop?
                </p>
              </div>

              <div className="flex flex-col w-full gap-2.5 font-sans">
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold font-plus-jakarta uppercase tracking-widest text-[9px] shadow-lg shadow-rose-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  Yes, Remove
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-4 rounded-2xl font-bold font-plus-jakarta uppercase tracking-widest text-[9px] active:scale-95 transition-all bg-white/5 hover:bg-white/10 text-white/60 cursor-pointer"
                >
                  Keep Contact
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GuardianModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingGuardian={editingGuardian}
      />
    </div>
  );
}

function SafeMessageCard({ msg, replyToSafeMessage, isDarkMode }: { msg: any; replyToSafeMessage: any; isDarkMode: boolean; key?: any }) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customReply, setCustomReply] = useState("");

  const shortcuts = ["I'm Safe", "5 Min Away", "Call Me"];

  return (
    <div className="p-4 border border-white/10 bg-[#151f32]/65 backdrop-blur-md rounded-2xl shadow-lg flex flex-col gap-3 text-left animate-fade-in">
      {/* Header Info */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <CompanionAvatar
            avatar={msg.senderAvatar}
            relationship={msg.senderRelationship}
            size={36}
            name={msg.senderName}
          />
          <div className="flex flex-col text-left">
            <span className="text-xs font-black text-white leading-tight">
              {msg.senderName}
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-350 leading-none">
              {msg.senderRelationship}
            </span>
          </div>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {msg.timestamp}
        </span>
      </div>

      {/* Message content */}
      <p className="text-[13.5px] font-medium text-slate-200 leading-relaxed font-happy-monkey pl-0.5">
        "{msg.text}"
      </p>

      {/* Response interface */}
      <div className="flex flex-col gap-2">
        {!msg.replied ? (
          <>
            {/* Quick replies pills */}
            <div className="flex flex-wrap gap-1.5 font-sans">
              {shortcuts.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => replyToSafeMessage(msg.id, text)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-[#3BE0B9]/20 hover:border-[#3BE0B9]/30 text-[11px] font-bold text-white transition-all cursor-pointer"
                >
                  {text}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustomInput(!showCustomInput)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${showCustomInput ? 'bg-[#3BE0B9] text-slate-950 font-black' : 'bg-white/5 border border-white/5 text-white/90 hover:bg-white/10'}`}
              >
                Custom
              </button>
            </div>

            {/* Custom Reply inline input form */}
            {showCustomInput && (
              <div className="pt-1 flex items-center gap-1 w-full">
                <input
                  type="text"
                  placeholder="Type safe update..."
                  value={customReply}
                  onChange={(e) => setCustomReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customReply.trim()) {
                      replyToSafeMessage(msg.id, customReply.trim());
                    }
                  }}
                  className="flex-1 bg-[#090d16] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none text-left font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customReply.trim()) {
                      replyToSafeMessage(msg.id, customReply.trim());
                    }
                  }}
                  disabled={!customReply.trim()}
                  className="px-3.5 py-2 rounded-lg bg-[#3BE0B9] disabled:opacity-45 text-slate-950 font-extrabold text-xs cursor-pointer"
                >
                  Send
                </button>
              </div>
            )}
          </>
        ) : (
          /* Replied state visual marker */
          <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-left animate-fade-in font-sans">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1dbb8a] flex items-center gap-1">
                ✓ Replied Securely
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {msg.replyTimestamp || "Just now"}
              </span>
            </div>
            <p className="text-[13.5px] text-slate-250 mt-1 pl-0.5 font-happy-monkey font-medium">
              "{msg.replyText}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
