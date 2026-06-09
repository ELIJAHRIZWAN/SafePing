import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";

interface GuardianMascotProps {
  mode?: "talk" | "quiet" | "calm" | "protect";
  isSpeaking?: boolean;
  isListening?: boolean;
  isProcessing?: boolean;
  isLateNight?: boolean;
}

export default function GuardianMascot({
  mode = "calm",
  isSpeaking = false,
  isListening = false,
  isProcessing = false,
  isLateNight = false,
}: GuardianMascotProps) {
  // Lifelike blinking cycle (randomized interval to avoid sterile repetitive pacing)
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blinkActiveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let active = true;
    const triggerBlink = () => {
      if (!active) return;
      setIsBlinking(true);
      
      if (blinkActiveTimerRef.current) clearTimeout(blinkActiveTimerRef.current);
      blinkActiveTimerRef.current = setTimeout(() => {
        if (active) setIsBlinking(false);
      }, 160); // quick natural blink duration

      // Schedule next blink randomly between 2.5 and 6 seconds
      const nextDelay = Math.random() * 3500 + 2500;
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = setTimeout(triggerBlink, nextDelay);
    };

    blinkTimerRef.current = setTimeout(triggerBlink, 3000);
    return () => {
      active = false;
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      if (blinkActiveTimerRef.current) clearTimeout(blinkActiveTimerRef.current);
    };
  }, []);

  // Posture Shifting: subtle postural micro-movements to signify live weight and balance
  const [posture, setPosture] = useState({ rotate: 0, x: 0, y: 0 });
  const postureTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let active = true;
    const shiftPosture = () => {
      if (!active) return;
      
      // Keep movements exceptionally subtle, elegant, and cinematic
      setPosture({
        rotate: (Math.random() - 0.5) * 2.2, // max -1.1 to +1.1 deg tilt
        x: (Math.random() - 0.5) * 1.8,      // subtle sway left/right
        y: (Math.random() - 0.5) * 1.0,      // subtle center-of-mass shift
      });

      // Shift every 5 to 10 seconds organically
      const nextShift = Math.random() * 5000 + 5000;
      if (postureTimerRef.current) clearTimeout(postureTimerRef.current);
      postureTimerRef.current = setTimeout(shiftPosture, nextShift);
    };

    postureTimerRef.current = setTimeout(shiftPosture, 1500);
    return () => {
      active = false;
      if (postureTimerRef.current) clearTimeout(postureTimerRef.current);
    };
  }, []);

  // Soft Adaptive Breathing duration and depth based on mode and late-night parameters
  // - Slower breathing in Quiet and Late Night setups to maintain peaceful restiveness
  // - Regular warm breathing in Calm setups
  // - Slightly faster, alert focus breathing in Protect mode
  const breathingDuration = 
    isLateNight || mode === "quiet" 
      ? 6.8 
      : mode === "protect" 
        ? 3.9 
        : 5.0;

  const breatheScaleY = 
    isLateNight || mode === "quiet"
      ? [1, 1.02, 1] 
      : mode === "protect"
        ? [1, 1.045, 1]
        : [1, 1.033, 1];

  const breatheScaleX = 
    mode === "protect" 
      ? [1, 1.015, 1] 
      : [1, 1.008, 1];

  // Colors & glows based on companion state
  const companionTheme = React.useMemo(() => {
    switch (mode) {
      case "talk":
        return {
          glowColor: "rgba(244, 114, 182, 0.4)", // Pink
          insigniaFill: "#F472B6",
          badgePulse: [0.65, 0.95, 0.65],
        };
      case "quiet":
        return {
          glowColor: "rgba(20, 184, 166, 0.22)", // Teal
          insigniaFill: "#2DD4BF",
          badgePulse: [0.4, 0.65, 0.4], // soft, dim pulse at night
        };
      case "protect":
        return {
          glowColor: "rgba(245, 158, 11, 0.45)", // Amber
          insigniaFill: "#F59E0B",
          badgePulse: [0.75, 1.0, 0.75],
        };
      case "calm":
      default:
        return {
          glowColor: "rgba(34, 211, 238, 0.35)", // Cyan
          insigniaFill: "#22D3EE",
          badgePulse: [0.6, 0.9, 0.6],
        };
    }
  }, [mode]);

  // Derive Eye Shapes dynamically to accommodate emotional expression realism
  const renderCompanionEyes = () => {
    // 1. Blinking state is absolute priority for believable realism
    if (isBlinking) {
      return (
        <g strokeLinecap="round" strokeWidth="2.5">
          {/* Closed Left Eye line */}
          <line x1="31" y1="41" x2="39" y2="41" stroke={companionTheme.insigniaFill} opacity={isLateNight ? 0.6 : 0.8} />
          {/* Closed Right Eye line */}
          <line x1="61" y1="41" x2="69" y2="41" stroke={companionTheme.insigniaFill} opacity={isLateNight ? 0.6 : 0.8} />
        </g>
      );
    }

    // 2. Active listening or processing overrides
    if (isListening) {
      // Extremely attentive wide arches focused upwards
      return (
        <g>
          {/* Left Arc Eye */}
          <ellipse cx="35" cy="40" rx="4.5" ry="5.5" fill="#38BDF8" />
          <circle cx="36" cy="38" r="1.5" fill="#FFFFFF" />
          {/* Right Arc Eye */}
          <ellipse cx="65" cy="40" rx="4.5" ry="5.5" fill="#38BDF8" />
          <circle cx="66" cy="38" r="1.5" fill="#FFFFFF" />
        </g>
      );
    }

    if (isProcessing || isSpeaking) {
      // Expressive wide look
      return (
        <g>
          <ellipse cx="35" cy="41" rx="4.2" ry="4.8" fill={companionTheme.insigniaFill} />
          <circle cx="36" cy="39" r="1.2" fill="#FFFFFF" />
          <ellipse cx="65" cy="41" rx="4.2" ry="4.8" fill={companionTheme.insigniaFill} />
          <circle cx="66" cy="39" r="1.2" fill="#FFFFFF" />
        </g>
      );
    }

    // 3. Mode configurations
    if (mode === "talk") {
      // Comforting cozy smiling eyes (arcs)
      return (
        <g fill="none" strokeWidth="2.8" strokeLinecap="round">
          {/* Left Smile Arch */}
          <path d="M 30,42 Q 35,36 40,42" stroke={companionTheme.insigniaFill} />
          {/* Right Smile Arch */}
          <path d="M 60,42 Q 65,36 70,42" stroke={companionTheme.insigniaFill} />
        </g>
      );
    }

    if (mode === "quiet") {
      // Relaxed, sleepy, resting eyes to convey safety and calm
      return (
        <g fill="none" strokeWidth="2.2" strokeLinecap="round" opacity="0.7">
          <path d="M 31,39 Q 35,42 39,39" stroke={companionTheme.insigniaFill} />
          <path d="M 61,39 Q 65,42 69,39" stroke={companionTheme.insigniaFill} />
        </g>
      );
    }

    if (mode === "protect") {
      // Highly focused alert eyes
      return (
        <g>
          <ellipse cx="35" cy="41" rx="4.5" ry="2.2" fill={companionTheme.insigniaFill} />
          <circle cx="35" cy="41" r="1" fill="#FFFFFF" />
          <ellipse cx="65" cy="41" rx="4.5" ry="2.2" fill={companionTheme.insigniaFill} />
          <circle cx="65" cy="41" r="1" fill="#FFFFFF" />
        </g>
      );
    }

    // Default Calm Mode: Standard, warm, gentle digital companion eyes
    return (
      <g>
        <ellipse cx="35" cy="41" rx="4.5" ry="4.5" fill={companionTheme.insigniaFill} />
        <circle cx="36.5" cy="39" r="1.2" fill="#FFFFFF" />
        <ellipse cx="65" cy="41" rx="4.5" ry="4.5" fill={companionTheme.insigniaFill} />
        <circle cx="66.5" cy="39" r="1.2" fill="#FFFFFF" />
      </g>
    );
  };

  return (
    <motion.div
      className="w-full h-full flex items-center justify-center relative select-none"
      animate={{
        rotate: posture.rotate,
        x: posture.x,
        y: posture.y,
      }}
      transition={{
        duration: 4.0,
        ease: "easeInOut",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full object-contain"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Premium body metallic/soft gradient */}
          <linearGradient id="companionBodyGrad" x1="50" y1="12" x2="50" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="60%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Clean soft white stomach area */}
          <linearGradient id="companionBellyGrad" x1="50" y1="44" x2="50" y2="84" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.94" />
            <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.82" />
          </linearGradient>

          {/* Inner atmospheric chest glow depending on companion state */}
          <radialGradient id="companionChestGlow" cx="50" cy="67" r="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={companionTheme.insigniaFill} stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* COMPANION BREATHING ENVELOPE */}
        <motion.g
          animate={{
            scaleY: breatheScaleY,
            scaleX: breatheScaleX,
            transformOrigin: "50px 86px",
          }}
          transition={{
            duration: breathingDuration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Subtle Back Shadow */}
          <ellipse cx="50" cy="85" rx="26" ry="3" fill="rgba(0,0,0,0.5)" filter="blur(1.5px)" />

          {/* FLIPPERS / SIDE WINGS (Subtly sway during breathing or speech) */}
          {/* Left Wing */}
          <motion.path
            d="M 23,54 C 11,54 8,66 16,74 C 20,74 23,63 23,54 Z"
            fill="#111827"
            animate={{
              rotate: isSpeaking ? [2, -3, 2] : isListening ? 3 : [0, -1, 0],
              transformOrigin: "23px 54px"
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Right Wing */}
          <motion.path
            d="M 77,54 C 89,54 92,66 84,74 C 80,74 77,63 77,54 Z"
            fill="#111827"
            animate={{
              rotate: isSpeaking ? [-2, 3, -2] : isListening ? -3 : [0, 1, 0],
              transformOrigin: "77px 54px"
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* OUTER SOLID BODY */}
          <path
            d="M 50,15 C 29,15 23,28 23,54 C 23,80 33,86 50,86 C 67,86 77,80 77,54 C 77,28 71,15 50,15 Z"
            fill="url(#companionBodyGrad)"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="0.8"
          />

          {/* COZY STOMACH BELLY */}
          <path
            d="M 50,44 C 35,44 32,51 32,65 C 32,79 39,83 50,83 C 61,83 68,79 68,65 C 68,51 65,44 50,44 Z"
            fill="url(#companionBellyGrad)"
          />

          {/* DYNAMIC SAFETY REASSURANCE COLLAR / BADGE */}
          <circle cx="50" cy="67" r="14" fill="url(#companionChestGlow)" />
          
          {/* Beautiful glowing shield heart badge: pulses warmly with life */}
          <motion.path
            d="M 50,62 C 48.5,63.2 46,63.2 46,65 C 46,67 48.5,68.8 50,71 C 51.5,68.8 54,67 54,65 C 54,63.2 51.5,63.2 50,62 Z"
            fill={companionTheme.insigniaFill}
            animate={{
              scale: isSpeaking || isListening ? [0.95, 1.25, 0.95] : companionTheme.badgePulse,
              opacity: isLateNight ? [0.35, 0.7, 0.35] : [0.75, 1.0, 0.75],
            }}
            transition={{
              duration: isListening ? 1.4 : isLateNight ? 6.0 : 3.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "50px 66px" }}
          />

          {/* COMPANION HEAD & FACE ASSETS */}
          <motion.g
            animate={{
              y: isSpeaking ? [0, -0.8, 0] : [0, 0, 0],
            }}
            transition={{
              duration: 1.4,
              repeat: isSpeaking ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            {/* Dark background eye-mask structure */}
            <path
              d="M 29,33 C 36,27 64,27 71,33 C 73,41 69,51 64,51 C 57,51 50,47 50,47 C 50,47 43,51 36,51 C 31,51 27,41 29,33 Z"
              fill="#0F172A"
              opacity="0.25"
            />

            {/* EYELIDS & EYE ELEMENTS RENDERING */}
            <g>
              {renderCompanionEyes()}
            </g>

            {/* HIGH END COMPANION BEAK */}
            {/* Animates lightly during conversations to communicate vocal synergy */}
            <motion.path
              d="M 46.5,46 L 53.5,46 L 50,52.5 Z"
              fill="#F59E0B"
              animate={{
                y: isSpeaking ? [0, 1.0, 0] : 0,
                scaleY: isSpeaking ? [1, 1.15, 1] : 1,
              }}
              transition={{
                duration: 0.32,
                repeat: isSpeaking ? Infinity : 0,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "50px 46px" }}
            />
          </motion.g>

          {/* SLEEK LOW-GLOW COMPANION HEADPHONES HEADBAND */}
          <path
            d="M 29,36 C 29,15 71,15 71,36"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.2"
            fill="none"
          />
          {/* Headphones ear cushions */}
          <circle cx="28.5" cy="36" r="3.2" fill="#1E293B" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          <circle cx="71.5" cy="36" r="3.2" fill="#1E293B" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />

        </motion.g>
      </svg>
    </motion.div>
  );
}
