import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { MessageSquareText } from 'lucide-react';
import { useState, useEffect } from 'react';
import PenguinVideo from "./PenguinVideo";
import assistantPenguin from "../assets/PA4.webm";

export default function AIAssistant() {
  const { penguinMessage, isEmergencyActive } = useApp();
  const [showBubble, setShowBubble] = useState(true);

  useEffect(() => {
    setShowBubble(true);
    const timer = setTimeout(() => setShowBubble(false), 8000);
    return () => clearTimeout(timer);
  }, [penguinMessage]);

  return (
    <div className="fixed bottom-32 right-4 z-[60] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="mb-3 p-3 px-4 glass-dark rounded-2xl max-w-[200px] pointer-events-auto border-blue-500/30"
          >
            <p className="text-[10px] text-white/90 leading-relaxed font-medium">
              {penguinMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={isEmergencyActive ? {
          scale: [1, 1.1, 1],
          rotate: [0, -5, 5, 0]
        } : {
          y: [0, -10, 0]
        }}
        transition={{
          duration: isEmergencyActive ? 0.5 : 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        onClick={() => setShowBubble(!showBubble)}
        className="w-16 h-16 rounded-full bg-navy-dark border-2 border-white/10 glass-dark flex items-center justify-center pointer-events-auto shadow-2xl relative group overflow-hidden"
      >
        {/* Penguin Avatar Emoji/Art */}
        <PenguinVideo
          src={assistantPenguin}
          size={140}
        />

        {/* Glow behind penguin */}
        <div className={`absolute inset-0 transition-colors duration-500 ${isEmergencyActive ? 'bg-red-500/20' : 'bg-blue-500/10'
          }`} />

        {/* Pulse Ring */}
        {isEmergencyActive && (
          <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-ping" />
        )}
      </motion.div>
    </div>
  );
}
