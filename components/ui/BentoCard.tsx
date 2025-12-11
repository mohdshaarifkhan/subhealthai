"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

const COLORS = {
  card: 'bg-slate-900/40',
  border: 'border-white/5',
};

type BentoCardProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: LucideIcon;
  delay?: number;
  colSpan?: string;
  rowSpan?: string;
  glowing?: boolean;
  warning?: boolean;
};

export const BentoCard = ({ 
  children, 
  className = "", 
  title, 
  icon: Icon, 
  delay = 0, 
  colSpan = "col-span-1", 
  rowSpan = "row-span-1", 
  glowing = false, 
  warning = false 
}: BentoCardProps) => (
  <div
    className={`
      group relative overflow-hidden ${COLORS.card} backdrop-blur-md
      border ${glowing ? 'border-amber-500/30' : warning ? 'border-rose-500/30' : COLORS.border}
      hover:border-cyan-500/30 transition-all duration-700 ease-out
      flex flex-col p-6 rounded-2xl
      ${colSpan} ${rowSpan} ${className}
    `}
    style={{ animation: `fadeInUp 0.6s ease-out forwards ${delay}ms`, opacity: 0, transform: 'translateY(10px)' }}
  >
    {glowing && <div className="absolute inset-0 bg-amber-500/5 animate-pulse pointer-events-none" />}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/[0.03] to-transparent translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 ease-in-out pointer-events-none z-0" />
    
    {(title || Icon) && (
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />}
          {title && (
            <span className="text-[12px] uppercase tracking-wider text-[#6F7A8A] font-mono group-hover:text-slate-300 transition-colors">
              {title}
            </span>
          )}
        </div>
        <div className={`h-1.5 w-1.5 rounded-full ${glowing ? 'bg-amber-500 shadow-[0_0_8px_2px_rgba(245,158,11,0.5)]' : warning ? 'bg-rose-500' : 'bg-slate-800 group-hover:bg-cyan-500'} transition-colors duration-300 mt-0.5`} />
      </div>
    )}
    <div className="relative z-10 flex-1 flex flex-col min-h-0">
      {children}
    </div>
  </div>
);

