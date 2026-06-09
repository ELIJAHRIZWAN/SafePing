import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  isActive: boolean;
  onComplete?: () => void;
};

export default function PenguinTransformation({
  isActive,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<
    "idle" | "pulse" | "flash" | "guardian"
  >("idle");

  useEffect(() => {
    if (!isActive) {
      setPhase("idle");
      return;
    }

    setPhase("pulse");

    const flashTimer = setTimeout(() => {
      setPhase("flash");
    }, 900);

    const guardianTimer = setTimeout(() => {
      setPhase("guardian");

      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    }, 1600);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(guardianTimer);
    };
  }, [isActive, onComplete]);

  return (
    <div className="relative w-[220px] h-[220px] flex items-center justify-center">

      {/* ENERGY PULSE */}
      <AnimatePresence>
        {phase === "pulse" && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 2.3, opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className="absolute w-32 h-32 rounded-full bg-pink-500 blur-3xl"
          />
        )}
      </AnimatePresence>

      {/* FLASH */}
      <AnimatePresence>
        {phase === "flash" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-white rounded-full blur-xl z-20"
          />
        )}
      </AnimatePresence>

      {/* NORMAL PENGUIN */}
      <AnimatePresence>
        {(phase === "idle" || phase === "pulse") && (
          <motion.img
            key="normal"
            src="/cute-penguin.png"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, -8, 0],
            }}
            exit={{
              opacity: 0,
              scale: 1.2,
              filter: "blur(8px)",
            }}
            transition={{
              duration: 0.8,
              y: {
                repeat: Infinity,
                duration: 2,
              },
            }}
            className="absolute w-[150px] object-contain z-10 drop-shadow-[0_0_25px_rgba(255,120,220,0.5)]"
          />
        )}
      </AnimatePresence>

      {/* GUARDIAN PENGUIN */}
      <AnimatePresence>
        {phase === "guardian" && (
          <>
            {/* BIG GLOW */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: 1.8,
                opacity: 0.6,
              }}
              transition={{ duration: 1 }}
              className="absolute w-40 h-40 rounded-full bg-cyan-400 blur-3xl"
            />

            {/* PARTICLES */}
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                repeat: Infinity,
                duration: 8,
                ease: "linear",
              }}
              className="absolute w-[240px] h-[240px] border border-pink-400/30 rounded-full"
            />

            <motion.img
              key="guardian"
              src="/guardian-penguin.png"
              initial={{
                opacity: 0,
                scale: 0.6,
                rotate: -10,
                filter: "blur(12px)",
              }}
              animate={{
                opacity: 1,
                scale: 1,
                rotate: 0,
                filter: "blur(0px)",
                y: [0, -10, 0],
              }}
              transition={{
                duration: 1.2,
                y: {
                  repeat: Infinity,
                  duration: 2.5,
                },
              }}
              className="absolute w-[170px] object-contain z-30 drop-shadow-[0_0_45px_rgba(80,220,255,0.8)]"
            />

            {/* GUARDIAN TEXT */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -bottom-12 text-center"
            >
              <p className="text-cyan-300 text-sm font-bold tracking-widest">
                GUARDIAN MODE ACTIVATED ✨
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}