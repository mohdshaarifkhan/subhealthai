"use client";

import React, { useState } from 'react';
import { 
  Activity, Heart, Brain, TrendingUp, Zap, 
  Moon, Droplet, Bell, ChevronRight, ShieldCheck, 
  Watch, Search, Menu, User, Flame, Wind, AlertCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ReferenceLine, CartesianGrid
} from 'recharts';

/**
 * SUBHEALTH AI - DASHBOARD UI
 * A hybrid scientific/consumer interface for NIW Evidence & VC Demos.
 */

// --- 1. MOCK DATA (The "Backend" Simulation) ---

const riskHistory = [
  { day: 'Mon', score: 12, type: 'history' }, 
  { day: 'Tue', score: 15, type: 'history' }, 
  { day: 'Wed', score: 18, type: 'history' }, 
  { day: 'Thu', score: 22, type: 'history' }, 
  { day: 'Fri', score: 35, type: 'history' }, 
  { day: 'Sat', score: 45, type: 'history' }, 
  { day: 'Sun', score: 62, type: 'history' }, 
  { day: 'Today', score: 68, type: 'current' },
  { day: 'Tom', score: 72, type: 'forecast' }, 
  { day: 'Day+2', score: 75, type: 'forecast' },
];

const shapDrivers = [
  { label: 'HRV Suppression', value: '-22ms', impact: 'High', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { label: 'Sleep Debt', value: '4h 12m', impact: 'Med', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Inflammation (IgE)', value: 'Elevated', impact: 'Med', color: 'text-orange-400', bg: 'bg-orange-500/10' },
];

const conditions = [
  { name: 'Metabolic Stability', score: 85, status: 'High Risk', color: 'bg-rose-500', text: 'text-rose-400' },
  { name: 'Cardiovascular Load', score: 45, status: 'Moderate', color: 'bg-amber-500', text: 'text-amber-400' },
  { name: 'Inflammation', score: 20, status: 'Stable', color: 'bg-emerald-500', text: 'text-emerald-400' },
];

const devices = [
  { name: 'Oura Ring', status: 'Synced', time: '10m ago', icon: 'O' },
  { name: 'Garmin', status: 'Synced', time: '2m ago', icon: 'G' },
  { name: 'Dexcom G7', status: 'Syncing...', time: 'Now', icon: 'D' },
];

// --- 2. REUSABLE UI COMPONENTS ---

const accentColors = {
  blue: { glow: 'bg-blue-500/20', icon: 'text-blue-400' },
  rose: { glow: 'bg-rose-500/20', icon: 'text-rose-400' },
  purple: { glow: 'bg-purple-500/20', icon: 'text-purple-400' },
  amber: { glow: 'bg-amber-500/20', icon: 'text-amber-400' },
  emerald: { glow: 'bg-emerald-500/20', icon: 'text-emerald-400' },
  teal: { glow: 'bg-teal-500/20', icon: 'text-teal-400' },
};

const BentoCard = ({ children, className = "", title, icon: Icon, accent = "blue", glow = false }: any) => {
  const colors = accentColors[accent as keyof typeof accentColors] || accentColors.blue;
  
  return (
    <div className={`relative overflow-hidden rounded-[24px] bg-zinc-900/80 border border-zinc-800/60 shadow-xl backdrop-blur-xl p-6 flex flex-col ${className}`}>
      {glow && (
        <div className={`absolute -top-20 -right-20 w-40 h-40 ${colors.glow} blur-[80px] rounded-full pointer-events-none`}></div>
      )}
      
      <div className="flex justify-between items-center mb-4 z-10">
        <div className="flex items-center gap-2 text-zinc-400 font-medium text-sm">
          {Icon && <Icon size={16} className={colors.icon} />}
          <span className="uppercase tracking-wider text-[11px] font-semibold">{title}</span>
        </div>
        <ChevronRight size={16} className="text-zinc-600 hover:text-white transition-colors cursor-pointer" />
      </div>
      <div className="z-10 flex-1 flex flex-col justify-between">{children}</div>
    </div>
  );
};

const RiskRing = ({ percentage }: { percentage: number }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  // Dynamic Color based on risk
  const color = percentage < 30 ? "#10b981" : percentage < 60 ? "#f59e0b" : "#ef4444"; 

  return (
    <div className="relative w-44 h-44 flex items-center justify-center">
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background Track */}
        <circle cx="88" cy="88" r={radius} stroke="#27272a" strokeWidth="10" fill="transparent" />
        {/* Progress Arc */}
        <circle 
          cx="88" cy="88" r={radius} stroke={color} strokeWidth="10" 
          fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="text-5xl font-bold text-white tracking-tighter">{percentage}<span className="text-xl text-zinc-500">%</span></span>
        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">Instability</span>
      </div>
    </div>
  );
};

// --- 3. MAIN PAGE COMPONENT ---

export default function SubHealthDashboard() {
  // Determine top-level status
  const currentRisk = 68; 
  const riskColor = currentRisk > 60 ? '#ef4444' : '#f59e0b';

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-rose-500/30 pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-900/20">
              <Activity className="text-white" size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">
              SubHealth<span className="text-teal-400">AI</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-black"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
              JD
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        
        {/* HERO SECTION: Score & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: The Ring (Visual Anchor) */}
          <div className="lg:col-span-4">
            <BentoCard title="Daily Risk Score" icon={Activity} accent="rose" glow className="h-full min-h-[320px] items-center justify-center">
               <RiskRing percentage={currentRisk} />
               <div className="mt-6 text-center space-y-2">
                 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                    <Flame size={12} /> High Anomaly Detected
                 </div>
                 <p className="text-zinc-500 text-xs max-w-[220px] mx-auto leading-relaxed">
                   Significant deviation from your 30-day baseline across multiple modalities.
                 </p>
               </div>
            </BentoCard>
          </div>

          {/* RIGHT: The Forecast Chart */}
          <div className="lg:col-span-8">
            <BentoCard title="AI Forecast Trend (GRU Model)" icon={TrendingUp} accent="blue" className="h-full min-h-[320px]">
               <div className="flex justify-between items-end mb-4 px-2">
                  <div>
                    <span className="text-3xl font-bold text-white tracking-tight">Trending Up</span>
                    <p className="text-zinc-500 text-xs mt-1">Risk projected to increase over next 48h</p>
                  </div>
                  <div className="flex gap-3 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-zinc-400"><span className="w-2 h-2 rounded-full bg-zinc-600"></span>History</span>
                    <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>AI Forecast</span>
                  </div>
               </div>
               
               <div className="flex-1 w-full min-h-[180px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={riskHistory} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                     <defs>
                       <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor={riskColor} stopOpacity={0.3}/>
                         <stop offset="95%" stopColor={riskColor} stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                     <XAxis dataKey="day" stroke="#52525b" tick={{fontSize: 11}} tickLine={false} axisLine={false} />
                     <YAxis stroke="#52525b" tick={{fontSize: 11}} tickLine={false} axisLine={false} />
                     <Tooltip 
                        contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }} 
                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                        cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.3 }}
                      />
                     <ReferenceLine x="Today" stroke="#52525b" strokeDasharray="3 3" label={{ value: "NOW", position: 'top', fill: '#71717a', fontSize: 10 }} />
                     <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke={riskColor} 
                        strokeWidth={3} 
                        fill="url(#colorRisk)" 
                        activeDot={{ r: 6, strokeWidth: 0 }}
                     />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
            </BentoCard>
          </div>
        </div>

        {/* ROW 2: Key Metrics & Explainability */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Sleep */}
          <BentoCard title="Sleep Debt" icon={Moon} accent="purple" className="min-h-[180px]">
            <div className="mt-auto">
               <span className="text-3xl font-bold text-white">4<span className="text-lg text-zinc-500">h</span> 12<span className="text-lg text-zinc-500">m</span></span>
               <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                   <div className="bg-purple-500 h-full w-[40%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
               </div>
               <p className="text-[10px] text-zinc-500 mt-2 font-medium">Severe Deviation (-3h)</p>
            </div>
          </BentoCard>

          {/* 2. HRV */}
          <BentoCard title="HRV Status" icon={Heart} accent="rose" className="min-h-[180px]">
             <div className="mt-auto">
                <span className="text-3xl font-bold text-white">22 <span className="text-lg text-zinc-500">ms</span></span>
                <p className="text-xs text-rose-400 mt-1 font-medium">Significantly Depressed</p>
                <div className="flex gap-1 mt-3 items-end h-5">
                    {[40,45,42,38,30,25,22].map((h, i) => (
                        <div key={i} style={{height: `${(h/50)*100}%`}} className={`w-2 rounded-sm ${i > 4 ? 'bg-rose-500' : 'bg-zinc-800'}`}></div>
                    ))}
                </div>
             </div>
          </BentoCard>

          {/* 3. SHAP Drivers (The "Why") */}
          <BentoCard title="Top Risk Drivers (SHAP)" icon={Brain} accent="amber" className="lg:col-span-2">
             <div className="space-y-3 mt-2">
               {shapDrivers.map((driver, i) => (
                 <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className={`w-1.5 h-8 rounded-full ${driver.text === 'text-rose-400' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                       <div>
                          <p className="text-sm text-zinc-200 font-medium">{driver.label}</p>
                          <p className="text-[10px] text-zinc-500">{driver.value}</p>
                       </div>
                    </div>
                    <span className={`text-xs font-bold ${driver.color}`}>{driver.impact}</span>
                 </div>
               ))}
             </div>
          </BentoCard>
        </div>

        {/* ROW 3: Conditions & Integrations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Condition Risks */}
          <div className="lg:col-span-2">
            <BentoCard title="Condition Risk Profile" icon={ShieldCheck} accent="emerald">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                    {conditions.map((c) => (
                        <div key={c.name} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/50 flex flex-col justify-between h-full">
                            <div className="space-y-2">
                                <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{c.name}</span>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${c.color}`} style={{width: `${c.score}%`}}></div>
                                </div>
                            </div>
                            <div className="mt-4">
                                <span className={`text-sm font-bold ${c.text}`}>{c.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </BentoCard>
          </div>

          {/* Connected Devices */}
          <div className="lg:col-span-1">
            <BentoCard title="Device Hub" icon={Watch} accent="teal">
               <div className="space-y-3">
                  {devices.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-700">
                                {d.icon}
                            </div>
                            <div>
                                <p className="text-sm text-zinc-200">{d.name}</p>
                                <p className="text-[10px] text-zinc-500">{d.time}</p>
                            </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${d.status.includes('Syncing') ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    </div>
                  ))}
               </div>
               <button className="mt-4 w-full py-2 rounded-lg border border-zinc-700 text-zinc-400 text-xs hover:bg-zinc-800 transition-colors">
                  + Add Source
               </button>
            </BentoCard>
          </div>
        </div>

        {/* COPILOT BAR */}
        <div className="fixed bottom-6 left-0 right-0 px-4 pointer-events-none">
             <div className="max-w-2xl mx-auto pointer-events-auto">
                 <div className="bg-zinc-900/90 backdrop-blur-md border border-teal-500/30 rounded-2xl p-2 flex items-center gap-3 shadow-2xl shadow-teal-900/20">
                     <div className="p-2 bg-teal-500/10 rounded-xl">
                         <Zap className="text-teal-400" size={20} />
                     </div>
                     <input 
                        type="text" 
                        placeholder="Ask Dr. AI (e.g., 'Why did my metabolic risk spike today?')"
                        className="bg-transparent border-none outline-none flex-1 text-sm text-zinc-200 placeholder-zinc-500"
                     />
                     <button className="p-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-colors">
                        <ChevronRight size={20} />
                     </button>
                 </div>
             </div>
        </div>

      </main>
    </div>
  );
}

