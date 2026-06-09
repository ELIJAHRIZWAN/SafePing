import React from 'react';
import { Shield, MapPin, Radio } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Logo({ className = '' }: { className?: string }) {
  const { isDarkMode } = useApp();
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        {/* Shield Background */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500 ${
          isDarkMode ? 'bg-primary/20 border border-primary/20' : 'bg-primary/10 border border-primary/10'
        }`}>
          {/* Signal Icon Layer */}
          <Radio size={20} className="absolute -top-1 -right-1 text-primary animate-pulse" />
          
          {/* Penguin Face Minimalist */}
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Outer Head */}
              <path
                d="M50 10C35 10 20 25 20 50C20 75 35 90 50 90C65 90 80 75 80 50C80 25 65 10 50 10Z"
                fill={isDarkMode ? "#1F2937" : "#4B5563"}
              />
              {/* Inner Face/White area */}
              <path
                d="M50 20C42 20 30 30 30 50C30 70 42 85 50 85C58 85 70 70 70 50C70 30 58 20 50 20Z"
                fill="white"
              />
              {/* Simple Dots for Eyes */}
              <circle cx="43" cy="45" r="4" fill="#1F2937" />
              <circle cx="57" cy="45" r="4" fill="#1F2937" />
              {/* Tiny Beak */}
              <path d="M47 55L53 55L50 60L47 55z" fill="#FB923C" />
              {/* Minimalist Scarf */}
              <rect x="35" y="65" width="30" height="6" rx="3" fill="#EF4444" />
              <path d="M55 65V75C55 76.5 56.5 77 58 77S61 76.5 61 75V65H55Z" fill="#EF4444" />
            </svg>
          </div>
          
          {/* Map Pin Overlap */}
          <MapPin size={12} className="absolute -bottom-1 -left-1 text-primary" />
        </div>
      </div>
      
      <div className="flex flex-col">
        <span className={`text-xl font-display font-black tracking-tighter uppercase leading-none ${
          isDarkMode ? 'text-white' : 'text-navy-dark'
        }`}>
          Safe<span className="text-primary">Ping</span>
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary/60">Professional Safety</span>
      </div>
    </div>
  );
}
