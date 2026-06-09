import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { X, User, Phone, Shield, Heart, Sparkles, Check } from 'lucide-react';
import { parsePhoneNumberFromString, AsYouType } from 'libphonenumber-js';
import { useApp } from '../context/AppContext';
import { Guardian } from '../types';
import { AVATAR_MAP, CATEGORY_AVATARS, getCategoryForRelationship } from './CompanionAvatar';

interface GuardianModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGuardian?: Guardian | null;
}

const RELATIONSHIPS = ["Mother", "Father", "Brother", "Sister", "Boyfriend", "Girlfriend", "Friend"];

export default function GuardianModal({ isOpen, onClose, editingGuardian }: GuardianModalProps) {
  const { addGuardian, updateGuardian, guardians } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = new Image();
          img.onload = () => {
            const MAX_DIM = 120;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round(height * (MAX_DIM / width));
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round(width * (MAX_DIM / height));
                height = MAX_DIM;
              }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              setSelectedAvatar(dataUrl);
            } else {
              setSelectedAvatar(event.target?.result as string);
            }
          };
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [phoneTouched, setPhoneTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const isNameValid = (val: string): boolean => {
    return val.trim().length >= 2;
  };

  const validatePhoneNumber = (rawPhone: string): boolean => {
    // Strip spaces, dashes, parentheses
    const cleaned = rawPhone.replace(/[\s-()]/g, '');
    
    // Must only contain numeric digits of correct length with an optional leading '+'
    const validPattern = /^\+?[0-9]+$/.test(cleaned);
    if (!validPattern) return false;
    
    const digitsOnly = cleaned.replace(/^\+/, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;
    
    try {
      const parsed = parsePhoneNumberFromString(cleaned);
      if (parsed) {
        return parsed.isValid() || (digitsOnly.length >= 10 && digitsOnly.length <= 15);
      }
    } catch (err) {
      // ignore
    }
    
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  };

  const isDuplicateNumber = (phoneNum: string): boolean => {
    const digits = phoneNum.replace(/[^0-9]/g, '');
    if (!digits) return false;
    
    return (guardians || []).some(g => {
      if (editingGuardian && g.id === editingGuardian.id) {
        return false;
      }
      return g.phone.replace(/[^0-9]/g, '') === digits;
    });
  };

  const nameValid = isNameValid(name);
  const phoneValid = validatePhoneNumber(phone);
  const isDuplicate = isDuplicateNumber(phone);
  const formValid = nameValid && phoneValid && !isDuplicate && relationship.trim().length > 0;

  const isValidPhone = phone.length > 0 && phoneValid && !isDuplicate;
  const isInvalidPhone = phoneTouched && phone.length > 0 && (!phoneValid || isDuplicate) && !isDuplicate;
  const isDupError = phoneTouched && phone.length > 0 && isDuplicate;

  const isValidName = name.length > 0 && nameValid;
  const isInvalidName = nameTouched && name.length > 0 && !nameValid;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhoneTouched(true);
    
    // Automatically remove invalid characters, prevent alphabets (only keep '+' at start, and digits throughout)
    let filtered = '';
    for (let i = 0; i < val.length; i++) {
      const char = val[i];
      if (char === '+' && i === 0) {
        filtered += char;
      } else if (/[0-9]/.test(char)) {
        filtered += char;
      }
    }
    
    // Auto-detect and format the numeric digits using AsYouType
    if (filtered.length > 0) {
      const formatted = new AsYouType().input(filtered);
      setPhone(formatted);
    } else {
      setPhone('');
    }
  };

  const handleRelationshipChange = (rel: string) => {
    setRelationship(rel);
    // Auto-assign default avatar based on relationship if none selected or if changing
    const category = getCategoryForRelationship(rel);
    const available = CATEGORY_AVATARS[category] || CATEGORY_AVATARS["Friend"];
    if (available && available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      setSelectedAvatar(available[randomIndex]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingGuardian) {
        setName(editingGuardian.name);
        setPhone(editingGuardian.phone);
        setRelationship(editingGuardian.relationship);
        setIsPriority(!!editingGuardian.isPriority);
        
        const oldAvatar = editingGuardian.avatar || '';
        const isCustom = oldAvatar && (oldAvatar.startsWith('data:') || oldAvatar.startsWith('http') || oldAvatar.startsWith('blob:'));
        if (!isCustom && oldAvatar && !oldAvatar.endsWith('.png')) {
          const category = getCategoryForRelationship(editingGuardian.relationship);
          const available = CATEGORY_AVATARS[category] || CATEGORY_AVATARS["Friend"];
          setSelectedAvatar(available[0] || 'FRIEND 1.png');
        } else {
          setSelectedAvatar(oldAvatar);
        }
      } else {
        setName('');
        setPhone('');
        setRelationship('');
        setIsPriority(false);
        setSelectedAvatar('');
      }
      setPhoneTouched(false);
      setNameTouched(false);
      setIsSaving(false);
      setIsSuccess(false);
    }
  }, [isOpen, editingGuardian]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;

    setIsSaving(true);
    
    const finalAvatar = selectedAvatar || (() => {
      const category = getCategoryForRelationship(relationship);
      const available = CATEGORY_AVATARS[category] || CATEGORY_AVATARS["Friend"];
      return available && available.length > 0 ? available[0] : 'FRIEND 1.png';
    })();

    // Smooth delay for reassuring cinematic feedback
    setTimeout(() => {
      if (editingGuardian && editingGuardian.id) {
        updateGuardian(editingGuardian.id, {
          name,
          phone,
          relationship,
          avatar: finalAvatar,
          isPriority,
        });
      } else {
        addGuardian({
          name,
          phone,
          relationship,
          avatar: finalAvatar,
          isPriority,
        });
      }
      setIsSaving(false);
      setIsSuccess(true);
      
      // Delay closing to let success animation breathe
      setTimeout(() => {
        onClose();
      }, 1000);
    }, 700);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
          
          {/* Background Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ y: '100%', scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: '100%', scale: 0.98 }}
            transition={{
              type: 'spring',
              damping: 24,
              stiffness: 220,
            }}
            className="relative w-full max-w-md bg-[#070b1e] rounded-t-[36px] sm:rounded-[36px] overflow-hidden border border-white/10 p-8 shadow-2xl z-[1201]"
          >

            {/* Ambient Cyan/Indigo Glow Effects */}
            <div className="absolute top-[-80px] right-[-80px] w-[200px] h-[200px] bg-cyan-500/10 blur-[90px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-80px] left-[-80px] w-[200px] h-[200px] bg-primary/10 blur-[90px] rounded-full pointer-events-none" />

            {/* Success Micro-Overlay */}
            <AnimatePresence>
              {isSuccess && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#070b1e]/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.6, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400"
                  >
                    <Check size={32} />
                  </motion.div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-display font-medium text-white tracking-tight">
                      {editingGuardian ? 'Contact Updated' : 'Guardian Secured'}
                    </h4>
                    <p className="text-xs text-white/50 px-8 leading-relaxed font-sans">
                      {editingGuardian 
                        ? 'Changes were saved smoothly in your secure circle.'
                        : "They're now woven into your local support safety net. Walk with companion confidence."
                      }
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="relative flex justify-between items-center mb-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#5cdeff]/60 font-black mb-1.5 flex items-center gap-1.5">
                  <Heart size={10} className="fill-current text-[#5cdeff]" />
                  {editingGuardian ? 'Update Connection' : 'Safe Circle Expansion'}
                </p>

                <h3 className="text-2xl font-display font-black text-white tracking-tight">
                  {editingGuardian ? 'Edit Connection' : 'Trust Someone Close'}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-all hover:bg-white/10"
              >
                <X size={16} className="text-white/60" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="relative flex flex-col gap-6">

              {/* Name */}
              <div className="flex flex-col gap-2.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-extrabold ml-1">
                  Full Name
                </label>

                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-primary"
                  />

                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameTouched(true);
                    }}
                    onBlur={() => setNameTouched(true)}
                    placeholder="Enter trusted name"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={`w-full bg-white/5 text-white border rounded-3xl py-4.5 pl-13 pr-12 outline-none transition-all text-xs font-semibold ${
                      isValidName 
                        ? 'border-[#3BE0B9]/40 focus:border-[#3BE0B9]/60 shadow-[0_0_10px_rgba(59,224,185,0.15)] bg-[#3BE0B9]/[0.02]' 
                        : isInvalidName
                          ? 'border-rose-500/40 focus:border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.12)] bg-rose-500/[0.01]'
                          : 'border-white/10 focus:border-[#5cdeff]/40'
                    }`}
                  />
                  {/* Validation check state layout */}
                  {isValidName && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#3BE0B9] animate-fade-in flex items-center justify-center">
                      <Check size={16} />
                    </div>
                  )}
                  {isInvalidName && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-rose-400 animate-fade-in flex items-center justify-center font-bold text-xs select-none">
                      !
                    </div>
                  )}
                </div>
                {isInvalidName && (
                  <span className="text-[11px] text-rose-400/85 font-medium ml-2 mt-0.5 animate-fade-in">
                    Enter a valid name (minimum 2 characters)
                  </span>
                )}
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-2.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-extrabold ml-1">
                  Phone Number
                </label>

                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-primary"
                  />

                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="+1 (555) 019-2834"
                    inputMode="tel"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={`w-full bg-white/5 text-white border rounded-3xl py-4.5 pl-13 pr-12 outline-none transition-all text-xs font-semibold ${
                      isValidPhone 
                        ? 'border-[#3BE0B9]/40 focus:border-[#3BE0B9]/60 shadow-[0_0_10px_rgba(59,224,185,0.15)] bg-[#3BE0B9]/[0.02]' 
                        : isInvalidPhone || isDupError
                          ? 'border-rose-500/40 focus:border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.12)] bg-rose-500/[0.01]'
                          : 'border-white/10 focus:border-[#5cdeff]/40'
                    }`}
                  />
                  {/* Validation check state layout */}
                  {isValidPhone && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#3BE0B9] animate-fade-in flex items-center justify-center">
                      <Check size={16} />
                    </div>
                  )}
                  {(isInvalidPhone || isDupError) && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-rose-400 animate-fade-in flex items-center justify-center font-bold text-xs select-none">
                      !
                    </div>
                  )}
                </div>
                {isInvalidPhone && (
                  <span className="text-[11px] text-rose-400/85 font-medium ml-2 mt-0.5 animate-fade-in">
                    Enter a valid phone number
                  </span>
                )}
                {isDupError && (
                  <span className="text-[11px] text-rose-400/85 font-medium ml-2 mt-0.5 animate-fade-in">
                    This guardian is already added.
                  </span>
                )}
              </div>

              {/* Relationship Custom Pills */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-extrabold ml-1">
                  Relationship Label
                </label>

                <div className="flex flex-wrap gap-2">
                  {RELATIONSHIPS.map((rel) => (
                    <button
                      key={rel}
                      type="button"
                      onClick={() => handleRelationshipChange(rel)}
                      className={`px-4.5 py-2.5 rounded-full border text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap ${
                        relationship === rel
                          ? 'bg-primary/25 text-[#5cdeff] border-primary/45 shadow-[0_0_15px_rgba(92,222,255,0.15)]'
                          : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/15'
                      }`}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Displays a horizontal avatar picker showing relevant avatars from the assets */}
              {relationship && (
                <div className="flex flex-col gap-3 mt-1 animate-fade-in font-sans">
                  <label className="text-[10px] uppercase tracking-widest text-[#5cdeff]/60 font-extrabold ml-1 flex items-center gap-1.5 font-sans">
                    <Sparkles size={11} className="text-[#5cdeff]" />
                    Select Character Avatar
                  </label>
                  
                  <div className="w-full flex items-center gap-4 overflow-x-auto py-2 px-1 scrollbar-none">
                    {/* Render custom base64/url avatar option if active */}
                    {selectedAvatar && (selectedAvatar.startsWith('data:') || selectedAvatar.startsWith('http') || selectedAvatar.startsWith('blob:')) && (
                      <button
                        type="button"
                        onClick={() => setSelectedAvatar(selectedAvatar)}
                        className={`relative rounded-full flex-shrink-0 transition-all duration-300 active:scale-90 cursor-pointer overflow-hidden flex items-center justify-center bg-white/[0.02] ring-1 ring-[#5cdeff] ring-offset-2 ring-offset-[#070b1e] scale-105 shadow-[0_0_10px_rgba(92,222,255,0.35)] opacity-100`}
                        style={{ width: 76, height: 76 }}
                      >
                        <img 
                          src={selectedAvatar} 
                          alt="Custom upload" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover pointer-events-none select-none max-w-full max-h-full rounded-full"
                        />
                      </button>
                    )}

                    {(CATEGORY_AVATARS[getCategoryForRelationship(relationship)] || CATEGORY_AVATARS["Friend"]).map((imgName, idx) => {
                      const isSelected = selectedAvatar === imgName;
                      const resolvedSrc = AVATAR_MAP[imgName];
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedAvatar(imgName)}
                          className={`relative rounded-full flex-shrink-0 transition-all duration-300 active:scale-90 cursor-pointer overflow-hidden flex items-center justify-center bg-white/[0.02] ${
                            isSelected 
                              ? 'ring-1 ring-[#5cdeff] ring-offset-2 ring-offset-[#070b1e] scale-105 shadow-[0_0_10px_rgba(92,222,255,0.35)] opacity-100' 
                              : 'border border-white/10 hover:opacity-100 opacity-60'
                          }`}
                          style={{
                            width: 76,
                            height: 76
                          }}
                        >
                          <img 
                            src={resolvedSrc} 
                            alt={imgName} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain pointer-events-none select-none max-w-full max-h-full"
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Photo Drag and Drop Upload Area */}
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={onButtonClick}
                    className={`mt-1 border-2 border-dashed rounded-3xl p-5 text-center cursor-pointer transition-all ${
                      dragActive 
                        ? 'border-[#5cdeff] bg-[#5cdeff]/10 text-[#5cdeff]' 
                        : selectedAvatar && (selectedAvatar.startsWith('data:') || selectedAvatar.startsWith('http') || selectedAvatar.startsWith('blob:'))
                          ? 'border-[#3BE0B9]/40 bg-[#3BE0B9]/[0.02] text-[#3BE0B9] hover:bg-white/5'
                          : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 focus:border-[#5cdeff]/40'
                    }`}
                  >
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      id="guardian-avatar-upload"
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload-cloud"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
                      <span className="text-xs font-bold font-plus-jakarta">
                        {selectedAvatar && (selectedAvatar.startsWith('data:') || selectedAvatar.startsWith('http') || selectedAvatar.startsWith('blob:'))
                          ? 'Custom Avatar Uploaded! Tap or drag to replace'
                          : 'Drag & drop profile picture or Browse files'
                        }
                      </span>
                      <span className="text-[10px] text-white/40 leading-none">Supports PNG, JPG, GIF</span>
                    </div>
                  </div>

                </div>
              )}

              {/* Contact Priority Toggle */}
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl mt-1">
                <div className="flex flex-col gap-0.5 max-w-[75%] pointer-events-none">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#5cdeff]">
                    <Shield size={12} className="fill-current text-[#5cdeff]" />
                    <span>Emergency Priority</span>
                  </div>
                  <span className="text-[9.5px] text-white/40 leading-normal font-sans">
                    Flag as primary backup recipient for instant safe routing.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPriority(!isPriority)}
                  className={`w-11 h-6 rounded-full p-1.5 transition-colors duration-300 relative flex items-center ${
                    isPriority ? 'bg-[#5cdeff] shadow-[0_0_12px_rgba(92,222,255,0.15)]' : 'bg-white/10'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-300 ${
                    isPriority ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col w-full gap-3 mt-4">
                <button
                  type="submit"
                  disabled={isSaving || !formValid}
                  className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-black uppercase tracking-[0.2em] py-5 rounded-3xl active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#3b82f6]/10"
                >
                  {isSaving ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{editingGuardian ? 'Update Contact' : 'Wrap with Protection'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
