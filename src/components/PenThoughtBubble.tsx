import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useEmergency } from '../context/EmergencyContext';

interface PenThoughtBubbleProps {
  screenName: 'home' | 'guardians' | 'journey' | 'logs' | 'settings' | 'status' | 'emergency' | 'chat';
  className?: string;
  pointerPosition?: 'left' | 'right' | 'top' | 'bottom';
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  messageStyle?: React.CSSProperties;
}

export default function PenThoughtBubble({ 
  screenName, 
  className = "", 
  pointerPosition = "bottom",
  style,
  contentStyle,
  messageStyle
}: PenThoughtBubbleProps) {
  const { 
    activeJourney, 
    userStatus, 
    guardians, 
    connectionsList, 
    recentCheckins,
    sosCountdownDuration,
    autoStatusUpdates
  } = useApp();

  const {
    isCameraEvidenceEnabled,
    isAudioEvidenceEnabled,
    threatScore
  } = useEmergency();

  // Define screen titles and action messages
  const bubbleConfig = {
    home: {
      message: "Heading somewhere? Tell your circle with one tap.",
      context: () => `Current Screen: Home/Dashboard
Active Journey: ${activeJourney ? activeJourney.destination : "None"}
User Status: ${userStatus || "Safe"}
Guardians Count: ${guardians?.length || 0}
Connections Count: ${connectionsList?.length || 0}`
    },
    guardians: {
      message: "Need help adding a guardian? Ask me.",
      context: () => `Current Screen: Trusted Circle (Guardians)
Guardians: ${guardians?.map(g => g.name).join(', ') || "None"}
Pending Invites: ${connectionsList?.filter(c => c.status === 'pending').length || 0}
Active Connections: ${connectionsList?.filter(c => c.status === 'accepted').length || 0}`
    },
    journey: {
      message: "Need help setting up your safe route? Ask me.",
      context: () => `Current Screen: Safe Journey Map (Walk-With-Me Companion)
Active Journey: ${activeJourney ? activeJourney.destination : "None"}`
    },
    logs: {
      message: "I can explain any event in your timeline.",
      context: () => `Current Screen: Activity Logs / Temporal Timeline
Recent Events Count: ${recentCheckins?.length || 0}
Recent Events Detail: ${recentCheckins?.slice(0, 3).map(c => `"${c.message || c.title || 'Check-in'}"`).join(', ') || "None"}`
    },
    settings: {
      message: "Not sure what a setting does? Ask me.",
      context: () => `Current Screen: Settings
Countdown Duration: ${sosCountdownDuration}s
Auto Status Updates: ${autoStatusUpdates ? "Enabled" : "Disabled"}
Camera Recording: ${isCameraEvidenceEnabled ? "Enabled" : "Disabled"}
Audio Recording: ${isAudioEvidenceEnabled ? "Enabled" : "Disabled"}`
    },
    status: {
      message: "Need help updating your status? Ask me.",
      context: () => `Current Screen: Quick Status presets
Current Status: ${userStatus || "Safe"}`
    },
    emergency: {
      message: "Emergency mode is active. I can explain next steps.",
      context: () => `Current Screen: SOS / Emergency Mode
Emergency Status: Active SOS!
Threat Score: ${threatScore}/100`
    },
    chat: {
      message: "Want help replying to your family quickly?",
      context: () => `Current Screen: Companion Chat Overlay
User Status: ${userStatus || "Safe"}`
    }
  };

  const config = bubbleConfig[screenName];
  if (!config) return null;

  const handleTapped = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Package context details inside the CustomEvent detail property
    const contextPrompt = config.context();
    const event = new CustomEvent('open-penguin-assistant', {
      detail: {
        context: contextPrompt,
        initialText: `I am tuned in to the ${screenName === 'guardians' ? 'Trusted Circle' : screenName === 'journey' ? 'Safe Journey' : screenName} view. How can I help?`
      }
    });

    window.dispatchEvent(event);
  };

  // Pointer styles
  const pointerStyles = {
    bottom: "bottom-[-4.5px] left-1/2 -translate-x-1/2 border-r border-b",
    top: "top-[-4.5px] left-1/2 -translate-x-1/2 border-l border-t",
    left: "left-[-4.5px] top-1/2 -translate-y-1/2 border-l border-b",
    right: "right-[-4.5px] top-1/2 -translate-y-1/2 border-r border-t"
  };

  return (
    <motion.div
      onClick={handleTapped}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: pointerPosition === 'top' ? 8 : -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      style={style}
      className={`relative max-w-[210px] sm:max-w-[230px] bg-[#0b101c]/90 border border-white/10 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-xl cursor-pointer pointer-events-auto select-none group leading-normal ${className}`}
    >
      {/* Cloud Bubble Pointer */}
      <div 
        className={`absolute w-2 h-2 bg-[#0b101c] border-white/10 rotate-45 ${pointerStyles[pointerPosition]}`}
      />

      {/* Cloud bubble contents */}
      <div className="flex flex-col text-left" style={contentStyle}>
        <p className="text-[7.5px] tracking-[0.25em] font-sans font-black uppercase text-[#3BE0B9] group-hover:text-[#1DBB8A] transition-colors leading-none mb-1">
          Pen Companion
        </p>
        <p 
          className="text-[10px] sm:text-[10.5px] font-semibold text-white/90 font-happy-monkey tracking-wide leading-tight"
          style={messageStyle}
        >
          {config.message}
        </p>
      </div>
    </motion.div>
  );
}
