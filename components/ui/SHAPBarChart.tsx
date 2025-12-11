"use client";

import React from 'react';
import { specialtyLabel } from '@/lib/utils/dashboardUtils';

type Driver = {
  name: string;
  impact: number;
  domain?: string;
  specialties?: string[];
};

type SHAPBarChartProps = {
  drivers: Driver[];
  onSelect?: (driver: Driver) => void;
};

export const SHAPBarChart = ({ drivers, onSelect }: SHAPBarChartProps) => {
  const maxVal = Math.max(...drivers.map(d => Math.abs(d.impact)));
  
  return (
    <div className="flex flex-col gap-4 w-full">
      {drivers.map((d, i) => {
        const isNegative = d.impact < 0; // Negative impact lowers risk (Good)
        const width = (Math.abs(d.impact) / maxVal) * 100;
        const color = isNegative ? 'bg-emerald-500' : 'bg-rose-500';
        const domain = d.domain ? ` · ${d.domain}` : '';
        const specialties = d.specialties ? d.specialties.map((s: string) => specialtyLabel(s as any)).join(', ') : '';
        
        return (
          <div 
            key={i} 
            className="flex flex-col gap-1 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
            onClick={() => onSelect && onSelect(d)}
          >
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="w-24 text-right text-slate-400 truncate">{d.name}</div>
              <div className="flex-1 h-6 bg-slate-900 rounded relative overflow-hidden flex items-center">
                <div className="absolute left-1/2 w-px h-full bg-slate-700 z-10" />
                <div 
                  className={`h-4 rounded ${color} transition-all duration-1000 ease-out`}
                  style={{ 
                    width: `${width/2}%`, 
                    marginLeft: isNegative ? `${50 - (width/2)}%` : '50%',
                    opacity: 0.8,
                    borderRadius: '4px'
                  }} 
                />
              </div>
              <div className={`w-12 tabular-nums text-right text-[10px] font-mono uppercase tracking-wider ${d.impact > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {d.impact > 0 ? '+' : ''}{d.impact}
              </div>
            </div>
            {(domain || specialties) && (
              <div className="text-[9px] text-slate-500 ml-28">
                {domain}
                {specialties && ` · ${specialties}`}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex justify-between text-[9px] text-slate-500 uppercase font-mono px-4 mt-1">
        <span>← Lowers Instability</span>
        <span>Increases Instability →</span>
      </div>
    </div>
  );
};

