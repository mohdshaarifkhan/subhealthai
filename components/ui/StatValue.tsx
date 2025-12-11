"use client";

import React from 'react';

type StatValueProps = {
  value: number | string;
  unit?: string;
  size?: "large" | "small";
  trend?: "up" | "down";
  trendVal?: string;
  isRisk?: boolean;
};

export const StatValue = ({ value, unit, size = "large", trend, trendVal, isRisk }: StatValueProps) => (
  <div>
    <div className="flex items-baseline gap-1">
      <span className={`font-['Unbounded'] font-semibold tracking-tighter text-white ${size === "large" ? "text-5xl" : "text-3xl"}`}>
        {value}
      </span>
      {unit && <span className="text-sm font-mono uppercase" style={{ opacity: 0.6 }}>{unit}</span>}
    </div>
    {trend && (
      <div className={`flex items-center gap-1 text-[10px] mt-1 font-mono uppercase tracking-wider ${isRisk ? 'text-amber-400' : 'text-emerald-400'}`}>
        <span>{trend === 'up' ? '▲' : '▼'}</span>
        <span>{trendVal}</span>
      </div>
    )}
  </div>
);

