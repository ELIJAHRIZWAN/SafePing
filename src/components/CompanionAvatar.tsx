import React from "react";
import { motion } from "motion/react";

import mother1 from "../assets/images/MOTHER 1.png";
import mother2 from "../assets/images/MOTHER 2.png";
import mother3 from "../assets/images/MOTHER 3.png";
import father1 from "../assets/images/FATHER 1.png";
import father2 from "../assets/images/FATHER 2.png";
import father3 from "../assets/images/FATHER 3.png";
import brother1 from "../assets/images/BROTHER 1.png";
import brother2 from "../assets/images/BROTHER 2.png";
import brother3 from "../assets/images/BROTHER 3.png";
import sister1 from "../assets/images/SISTER 1.png";
import sister2 from "../assets/images/SISTER 2.png";
import sister3 from "../assets/images/SISTER 3.png";
import bf1 from "../assets/images/BF 1.png";
import bf2 from "../assets/images/BF 2.png";
import bf3 from "../assets/images/BF 3.png";
import gf1 from "../assets/images/GF 1.png";
import gf2 from "../assets/images/GF 2.png";
import gf3 from "../assets/images/GF 3.png";
import friend1 from "../assets/images/FRIEND 1.png";
import friend2 from "../assets/images/FRIEND 2.png";
import friend3 from "../assets/images/FRIEND 3.png";
import friend4 from "../assets/images/FRIEND 4.png";

export const AVATAR_MAP: Record<string, string> = {
  "MOTHER 1.png": mother1,
  "MOTHER 2.png": mother2,
  "MOTHER 3.png": mother3,
  "FATHER 1.png": father1,
  "FATHER 2.png": father2,
  "FATHER 3.png": father3,
  "BROTHER 1.png": brother1,
  "BROTHER 2.png": brother2,
  "BROTHER 3.png": brother3,
  "SISTER 1.png": sister1,
  "SISTER 2.png": sister2,
  "SISTER 3.png": sister3,
  "BF 1.png": bf1,
  "BF 2.png": bf2,
  "BF 3.png": bf3,
  "GF 1.png": gf1,
  "GF 2.png": gf2,
  "GF 3.png": gf3,
  "FRIEND 1.png": friend1,
  "FRIEND 2.png": friend2,
  "FRIEND 3.png": friend3,
  "FRIEND 4.png": friend4,
};

export const CATEGORY_AVATARS: Record<string, string[]> = {
  "Mother": ["MOTHER 1.png", "MOTHER 2.png", "MOTHER 3.png"],
  "Father": ["FATHER 1.png", "FATHER 2.png", "FATHER 3.png"],
  "Brother": ["BROTHER 1.png", "BROTHER 2.png", "BROTHER 3.png"],
  "Sister": ["SISTER 1.png", "SISTER 2.png", "SISTER 3.png"],
  "Boyfriend": ["BF 1.png", "BF 2.png", "BF 3.png"],
  "Girlfriend": ["GF 1.png", "GF 2.png", "GF 3.png"],
  "Friend": ["FRIEND 1.png", "FRIEND 2.png", "FRIEND 3.png", "FRIEND 4.png"],
};

export function getCategoryForRelationship(relationship: string): string {
  const norm = relationship.trim().toLowerCase();
  if (["mother", "mom", "mum", "guardian (female)", "guardian(female)", "mommy"].includes(norm)) {
    return "Mother";
  }
  if (["father", "dad", "parent", "guardian (male)", "guardian(male)", "daddy"].includes(norm)) {
    return "Father";
  }
  if (["brother", "younger brother", "older brother", "bro"].includes(norm)) {
    return "Brother";
  }
  if (["sister", "younger sister", "older sister", "sis"].includes(norm)) {
    return "Sister";
  }
  if (["boyfriend", "boyfriend contact", "bf"].includes(norm)) {
    return "Boyfriend";
  }
  if (["girlfriend", "girlfriend contact", "gf"].includes(norm)) {
    return "Girlfriend";
  }
  return "Friend";
}

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
}

export function CompanionAvatar({ 
  avatar, 
  relationship = "Friend", 
  status, 
  size = 56, 
  isPriority,
  name
}: { 
  avatar: string; 
  relationship?: string; 
  status?: "safe" | "traveling" | "offline" | "attention" | "emergency" | string; 
  size?: number;
  isPriority?: boolean;
  name?: string;
}) {
  const resolvedSrc = AVATAR_MAP[avatar] || (avatar && (avatar.startsWith('data:') || avatar.startsWith('http') || avatar.startsWith('blob:')) ? avatar : null);
  
  // Status dot mapping
  let statusColor = "bg-zinc-500";
  const s = (status || "safe").toLowerCase();
  if (s === "safe") {
    statusColor = "bg-green-500";
  } else if (s === "traveling") {
    statusColor = "bg-yellow-500";
  } else if (s === "offline") {
    statusColor = "bg-zinc-500";
  } else if (s === "attention" || s === "emergency") {
    statusColor = "bg-red-500";
  }

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* PERFECT CIRCULAR CROP */}
      <div 
        className="w-full h-full rounded-full overflow-hidden bg-white/[0.02] border border-white/10 shadow-lg flex items-center justify-center relative transition-all duration-300"
      >
        {resolvedSrc ? (
          <img 
            src={resolvedSrc} 
            alt={relationship} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none select-none max-w-full max-h-full"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1a2342] to-[#0d1326] flex items-center justify-center border border-white/10">
            <span className="text-white font-bold leading-none" style={{ fontSize: size * 0.4 }}>
              {getInitials(name)}
            </span>
          </div>
        )}
      </div>
      
      {/* Subtle outer ambient status pulsing ring (emergency/unsafe) */}
      {(s === "attention" || s === "emergency") && (
        <motion.div
          animate={{ scale: [1, 1.35, 1], opacity: [0.75, 0, 0.75] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-0.5 rounded-full border border-red-500/50 z-0 pointer-events-none"
        />
      )}
      
      {/* STATIC AVATAR remains unmoving, only the STATUS INDICATOR animations / pulses */}
      <div 
        className={`absolute bottom-0 right-0 rounded-full border-2 border-[#070b1e] ${statusColor} transition-colors duration-300 flex items-center justify-center z-10 shadow-sm`}
        style={{
          width: Math.max(10, size * 0.22),
          height: Math.max(10, size * 0.22),
        }}
      >
        {(s === "attention" || s === "emergency") && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
        )}
      </div>

      {/* Priority star badge */}
      {isPriority && (
        <div className="absolute -top-1 -left-1 bg-yellow-400 text-black w-4 h-4 rounded-full flex items-center justify-center shadow-md border border-black/10 z-10 select-none">
          <span className="text-[9px] font-black leading-none">★</span>
        </div>
      )}
    </div>
  );
}
