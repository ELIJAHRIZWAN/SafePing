import React, { ReactNode } from 'react';
import { motion, MotionProps } from 'motion/react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

interface GlassCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, keyof MotionProps>, MotionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function GlassCard({ children, className = '', delay = 0, ...props }: GlassCardProps) {
  const { isDarkMode } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-[32px] p-5 overflow-hidden relative group transition-colors duration-700",
        isDarkMode ? "glass-dark" : "glass-light",
        className
      )}
      {...props}
    >
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br transition-all duration-700 blur-xl opacity-0 group-hover:opacity-100",
        isDarkMode ? "from-white/10 to-transparent" : "from-black/5 to-transparent"
      )} />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
