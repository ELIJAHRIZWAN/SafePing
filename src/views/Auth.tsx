import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Key, Sparkles, AlertCircle, ArrowRight, UserPlus, LogIn, ChevronLeft } from 'lucide-react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../services/firebase';
import welcomeVideo from '../assets/images/SAFEPING ANIMATED BACKGROUND.mp4';

export default function Auth() {
  const { signInWithGoogle, signInWithMock } = useApp();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Only used of signing up
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [sandboxName, setSandboxName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleClick = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg('Google login failed. Please write password/email or select sandbox testing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please populate email and password fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password should contain at least 6 characters.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        // Create user with Email & Password
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Set dynamic user name template
        const { saveDbUserProfile } = await import('../services/firebase');
        await saveDbUserProfile(cred.user.uid, {
          name: fullName || email.split('@')[0],
          age: '',
          bloodGroup: '',
          isOnboarded: false
        });
        navigate('/onboarding');
      } else {
        // Sign In with Email & Password
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Password Authentication failed:', err);
      let friendlyError = 'Incorrect credentials or user already exists. Try testing with Sandbox option!';
      if (err.message) {
        if (err.message.includes('email-already-in-use')) {
          friendlyError = 'That email is already registered. Please sign in instead!';
        } else if (err.message.includes('invalid-credential') || err.message.includes('wrong-password')) {
          friendlyError = 'Incorrect password or email. Double check and try again.';
        } else if (err.message.includes('user-not-found')) {
          friendlyError = 'No account found with this email. Select "Create Account" below.';
        }
      }
      setErrorMsg(friendlyError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSandboxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxName.trim()) {
      setErrorMsg('Please specify a sandbox user avatar name.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await signInWithMock(sandboxName, `${sandboxName.toLowerCase().replace(/\s+/g, '')}@safeping.dev`);
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg('Sandbox registration bypass failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-[#0c0d10] flex flex-col items-center justify-center p-6 text-[#E8E6F0] min-h-screen overflow-y-auto">
      {/* Background User Image & Decor Shadows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[#0c0d10] pointer-events-none" />
        
        {/* Layer 1b: Cinematic animated background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-[0.22] pointer-events-none"
        >
          <source src={welcomeVideo} type="video/mp4" />
        </video>

        <div className="absolute top-[10%] left-[20%] w-[550px] h-[550px] bg-[#6A3DE8]/12 blur-[150px] rounded-full" />
        <div className="absolute bottom-[15%] right-[10%] w-[420px] h-[420px] bg-[#1DBB8A]/4 blur-[110px] rounded-full" />
      </div>

      <div className="w-full max-w-sm my-auto flex flex-col gap-6 relative z-10 items-center">
        {/* Header Branding */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <button 
            onClick={() => navigate('/welcome')}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 self-start transition-colors mb-2"
          >
            <ChevronLeft size={14} className="stroke-white/40" />
            <span>Back to welcome</span>
          </button>
          
          <div className="w-12 h-12 rounded-2xl bg-[#14151b] border border-[#6A3DE8]/25 flex items-center justify-center text-[#1DBB8A] shadow-[0_0_24px_rgba(106,61,232,0.1)] mb-1">
            <Shield size={20} className="stroke-[#1DBB8A]" />
          </div>

          <span 
            className="font-riesling text-3xl sm:text-4xl text-neutral-50 tracking-[0.16em] mb-1.5 select-none antialiased"
            style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.15)' }}
          >
            SafePing
          </span>
          
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-display font-semibold tracking-tight text-white mb-0.5">Full Protection Mode</h1>
            <p className="text-[#E8E6F0]/50 text-xs max-w-xs leading-relaxed font-light">
              Connect to your guardian safety net, sync local threat settings, and back up evidence logs.
            </p>
          </div>
        </div>

        {/* Auth Module Card */}
        <div className="w-full bg-[#13141a]/95 backdrop-blur-3xl rounded-[32px] border border-white/5 p-6.5 shadow-2x shadow-black/80 flex flex-col gap-5">
          
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-950/45 border border-red-500/20 text-[#E8452A] rounded-2xl flex items-start gap-2.5 text-[11px] leading-relaxed"
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {!isSandboxMode ? (
              <motion.div
                key="creds-mode"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
              >
                <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
                  
                  {isSignUp && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] tracking-[0.16em] uppercase font-bold text-white/50">Your Name</label>
                      <div className="relative">
                        <UserPlus size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-[#6A3DE8]/40 text-sm text-white transition-all placeholder:text-white/20"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-[0.16em] uppercase font-bold text-white/50">Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-[#6A3DE8]/40 text-sm text-white transition-all placeholder:text-white/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-[0.16em] uppercase font-bold text-white/50">Security Password</label>
                    <div className="relative">
                      <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-[#6A3DE8]/40 text-sm text-white transition-all placeholder:text-white/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-2xl bg-[#6A3DE8] hover:bg-[#7b51f0] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition duration-200 shadow-md shadow-[#6A3DE8]/15 disabled:opacity-50 mt-1"
                  >
                    {isSignUp ? <UserPlus size={13} /> : <LogIn size={13} />}
                    <span>{isSignUp ? 'Create Secured Account' : 'Sign In Protected'}</span>
                  </button>

                  <div className="flex justify-between items-center text-[11px] mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setErrorMsg('');
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      {isSignUp ? 'Already registered? Sign In' : 'New to SafePing? Create Account'}
                    </button>
                  </div>
                </form>

                <div className="flex items-center gap-3 my-3 text-[#E8E6F0]/15 justify-center">
                  <div className="h-px bg-current w-full" />
                  <span className="text-[8px] tracking-widest uppercase font-mono">or alternative logins</span>
                  <div className="h-px bg-current w-full" />
                </div>

                {/* Google Button */}
                <button
                  onClick={handleGoogleClick}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-2xl bg-white text-[#0A0D14] font-bold text-xs tracking-wider flex items-center justify-center gap-3 hover:bg-neutral-100 active:scale-[0.99] transition-all duration-200 shadow-md disabled:opacity-50 mb-3"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66.6-.35 1.36-.35 2.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Authorize with Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSandboxMode(true)}
                  className="w-full text-center text-primary/80 hover:text-primary text-[11px] font-sans font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles size={11} />
                  <span>Sandbox Testing Gate Bypass</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="sandbox-mode"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
              >
                <form onSubmit={handleSandboxSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1 text-center mb-1">
                    <span className="text-[10px] tracking-widest uppercase font-black text-primary">Sandbox Testing</span>
                    <p className="text-[#E8E6F0]/40 text-[10px]">Create an instant auth session for testing offline features</p>
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] tracking-widest uppercase font-black text-white/50">Tester Username</label>
                    <input
                      type="text"
                      required
                      value={sandboxName}
                      onChange={(e) => setSandboxName(e.target.value)}
                      placeholder="e.g. Sven Tester"
                      className="w-full bg-[#0c0d10] border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/45 text-sm text-white"
                    />
                  </div>

                  <div className="flex gap-3.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsSandboxMode(false)}
                      className="flex-1 h-11 rounded-2xl bg-white/5 border border-white/10 text-white font-medium text-xs transition duration-200 hover:bg-white/10"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] h-11 rounded-2xl bg-[#6136d8] hover:bg-[#6c40e6] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition duration-200 disabled:opacity-50 shadow-md"
                    >
                      <span>Launch Session</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
