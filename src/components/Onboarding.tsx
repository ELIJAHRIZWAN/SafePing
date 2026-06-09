import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Heart, ArrowRight, MapPin, Mic, Shield, Check, Info } from 'lucide-react';
import introPenguin from "../assets/ANIMATIONS/introductive_penguin.webm"
import PenguinVideo from '../components/PenguinVideo';
import GuardianMascot from './GuardianMascot';

export default function Onboarding() {
  const { setUser, setPenguinMessage } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    bloodGroup: '',
    role: 'protected',
  });

  const handleNext = async () => {
    const totalSteps = steps.length;
    const currentStepObj = steps[step - 1];

    // Calmly trigger actual request or save settings state on explainers
    if (currentStepObj.id === 'location_perm') {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 4000 });
        }
      } catch (err) {
        console.warn('Geolocation trigger ignored or offline', err);
      }
    } else if (currentStepObj.id === 'voice_perm') {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            stream.getTracks().forEach(t => t.stop());
          }).catch(() => null);
        }
      } catch (err) {
        console.warn('Mic trigger ignored or offline', err);
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
      if (currentStepObj.id === 'name') setPenguinMessage(`Nice to meet you, ${formData.name}! 🐧`);
      if (currentStepObj.id === 'age') setPenguinMessage(`Got it! Safety is about knowing the details. 🐧`);
      if (currentStepObj.id === 'bloodGroup') setPenguinMessage(`Let's walk securely together. 🐧`);
    } else {
      setUser({ ...formData, isOnboarded: true } as any);
      setPenguinMessage(`Welcome ${formData.name}! Your safety network is ready. 🐧`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    }
  };

  const steps = [
    {
      id: 'role',
      title: "Choose your role",
      subtitle: "Select how you'll be using SafePing today.",
      icon: Shield,
      isCustom: true
    },
    {
      id: 'name',
      title: "What's your name?",
      subtitle: "I'll use this to greet you every day!",
      icon: User,
      field: 'name',
      placeholder: 'Enter your name',
      type: 'text'
    },
    {
      id: 'age',
      title: "How old are you?",
      subtitle: "This helps in emergency situations.",
      icon: Calendar,
      field: 'age',
      placeholder: 'Enter your age',
      type: 'number'
    },
    {
      id: 'bloodGroup',
      title: "Your blood group?",
      subtitle: "Vital information for first responders.",
      icon: Heart,
      field: 'bloodGroup',
      placeholder: 'e.g. O+, A-',
      type: 'text'
    },
    {
      id: 'location_perm',
      title: "Walk with Me",
      subtitle: "Location helps me support emergency protection and guide you safely to nearby havens.",
      icon: MapPin,
      isExplainer: true,
      explanation: "I’ll scan safe corridors when you walk alone and make sure your safety contacts know you are safe. Your route remains completely secure on your device and is never monitored out of context.",
      buttonText: "Enable Companion Map Link",
    },
    {
      id: 'voice_perm',
      title: "Listen with Care",
      subtitle: "Microphone access helps me stay present with you when you need an attentive ear.",
      icon: Mic,
      isExplainer: true,
      explanation: "I listen closely for your quiet safety phrase to trigger helpful support instantly. No recordings are saved during standard safety. Keeping things local preserves your quiet comfort.",
      buttonText: "Activate Voice Hearing",
    },
    {
      id: 'evidence_perm',
      title: "Evidence Safeguard",
      subtitle: "If something ever feels wrong, I can preserve important details to defend you.",
      icon: Shield,
      isExplainer: true,
      explanation: "In moments of high-threat escalation, I can quietly compile locations and optional webcam slides so you are fully prepared and supported. You can adjust this anytime inside your Settings dashboard.",
      buttonText: "Secure Protection Safeguards",
    }
  ].filter(s => {
    if (formData.role === 'guardian') {
      return s.id === 'role' || s.id === 'name';
    }
    return true;
  });

  const currentStep = steps[step - 1];

  return (
    <div className="fixed inset-0 z-[200] bg-navy-dark flex flex-col items-center justify-center p-6 text-white min-h-screen">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/25 blur-[100px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-secondary/15 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-sm flex flex-col items-center justify-center gap-6 relative z-10">
        
        {/* Subtle emotional Guardian mascot representation during permission steps */}
        {currentStep.isExplainer ? (
          <div className="w-40 h-40 rounded-full bg-white/5 border border-white/10 p-4 shadow-inner flex items-center justify-center relative">
            <GuardianMascot 
              mode="quiet" 
              isListening={currentStep.id === 'voice_perm'} 
              isSpeaking={false}
              isLateNight={true}
            />
          </div>
        ) : (
          <PenguinVideo
            src={introPenguin}
            size={180}
          />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full text-center flex flex-col gap-2"
          >
            <h2 className="text-3xl font-display font-semibold tracking-tight">{currentStep.title}</h2>
            <p className="text-white/60 text-xs tracking-wide max-w-xs mx-auto leading-relaxed">{currentStep.subtitle}</p>

            {currentStep.isCustom ? (
              <div className="flex flex-col gap-3 my-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'protected' })}
                  id="role_protected"
                  className={`p-5 rounded-3xl border text-left flex flex-col gap-1 transition-all ${
                    formData.role === 'protected'
                      ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="font-bold text-sm text-primary flex items-center gap-2">
                    <Shield size={16} />
                    Protected Person
                  </span>
                  <span className="text-white/60 text-[11px] leading-relaxed">
                    Set up your companion, share routing, and check-in with your guardians.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'guardian' })}
                  id="role_guardian"
                  className={`p-5 rounded-3xl border text-left flex flex-col gap-1 transition-all ${
                    formData.role === 'guardian'
                      ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="font-bold text-sm text-primary flex items-center gap-2">
                    <User size={16} />
                    Safety Guardian
                  </span>
                  <span className="text-white/60 text-[11px] leading-relaxed">
                    Enter invite code, monitor journeys/SOS, and check on safety prompts.
                  </span>
                </button>
              </div>
            ) : currentStep.isExplainer ? (
              <div className="mt-4 p-5 rounded-3xl bg-white/[0.03] border border-white/10 text-left flex flex-col gap-2.5">
                <span className="text-[10px] tracking-widest uppercase font-black text-primary flex items-center gap-1.5 leading-none">
                  <Info size={11} className="text-primary" />
                  Why we share this
                </span>
                <p className="text-white/70 text-[11px] leading-relaxed font-normal">
                  {currentStep.explanation}
                </p>
              </div>
            ) : (
              <div className="relative my-4 w-full">
                <currentStep.icon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" />
                <input
                  type={currentStep.type}
                  value={(formData as any)[currentStep.field]}
                  onChange={(e) => setFormData({ ...formData, [currentStep.field]: e.target.value })}
                  placeholder={currentStep.placeholder}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-4.5 pl-13 pr-6 outline-none focus:border-primary/50 transition-colors text-base"
                  onKeyDown={(e) => e.key === 'Enter' && (formData as any)[currentStep.field] && handleNext()}
                />
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={!currentStep.isExplainer && !currentStep.isCustom && !(formData as any)[currentStep.field]}
              className="w-full h-14 sm:h-15 rounded-full bg-primary text-white font-bold uppercase tracking-[0.2em] text-xs mt-4 transition-all duration-300 hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <span>{currentStep.isCustom ? 'Next' : currentStep.isExplainer ? currentStep.buttonText : (step === steps.length) ? 'Get Started' : 'Next Step'}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-5">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${step > idx
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-white/20'
                    }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

