"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Activity, FileText, ShieldCheck, Settings, 
  LogOut, Menu, Bell, Search, TrendingUp, Zap, Moon, Heart, 
  ChevronRight, Watch, Flame, Droplet, User, ArrowUpRight,
  Dna, Smartphone, Thermometer, Microscope, FileJson, Eye,
  Download, CheckCircle2, AlertTriangle, RefreshCcw, Info,
  Coffee, Cigarette, Dumbbell, BedDouble, Lock, ArrowRight, X,
  MessageSquare, CheckCircle, Database, BarChart2, Share2, Brain, Sparkles, Send, 
  Scale, Footprints, AlertCircle, Calendar
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ReferenceLine, CartesianGrid, ScatterChart, Scatter, LineChart, Line, Legend, BarChart, Bar,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from 'recharts';
import { useActiveUser } from "@/utils/useActiveUser";
import { useRiskData } from "@/app/hooks/useRiskData";
import useSWR from "swr";

// -----------------------------------------------------------------------------
// 1. MOCK DATA & PROFILES
// -----------------------------------------------------------------------------

// Helper for deterministic trend generation
const generateTrend = (base: number, variance: number, length = 30, trend = 0) => {
  return Array.from({ length }, (_, i) => ({
    day: `D-${length - i}`,
    value: Math.max(0, base + (Math.sin(i * 0.5) * variance) + (i * trend)) 
  }));
};

const USER_PROFILES = {
  healthy: {
    id: 'SUB-8821-A',
    name: 'Alex Rivera (Healthy Demo)',
    riskScore: 12, 
    riskLevel: 'Stable',
    statusColor: 'emerald',
    trend: generateTrend(12, 2, 30, -0.05),
    hrv: { current: 68, baseline: 65, status: 'Optimal' },
    rhr: { current: 54, baseline: 55, status: 'Optimal' },
    sleep: { current: 7.8, baseline: 7.5, status: 'Optimal' },
    bp: '118/76',
    bmi: { value: 22.4, status: 'Normal' },
    steps: { current: 10450, status: 'Active' },
    stress: { score: 15, status: 'Low' },
    allergies: ['None Reported'],
    labs: [
      { name: 'HbA1c', value: 5.1, unit: '%', status: 'normal' },
      { name: 'LDL-C', value: 95, unit: 'mg/dL', status: 'normal' },
      { name: 'hs-CRP', value: 0.8, unit: 'mg/L', status: 'normal' },
      { name: 'Vit D', value: 45, unit: 'ng/mL', status: 'normal' },
    ],
    conditions: [
      { name: 'Metabolic', risk: 8, status: 'low' },
      { name: 'Cardiovascular', risk: 14, status: 'low' },
      { name: 'Inflammatory', risk: 5, status: 'low' }
    ],
    predictions: [
        { name: 'Prediabetes', prob: 'Low (<5%)', status: 'normal' },
        { name: 'Sleep Apnea', prob: 'Low (<2%)', status: 'normal' },
        { name: 'Hypertension', prob: 'Low (<10%)', status: 'normal' }
    ],
    shapValues: [
      { feature: 'Sleep Regularity', value: 0.15, impact: 'positive' },
      { feature: 'Resting HR', value: 0.12, impact: 'positive' },
      { feature: 'Activity Lvl', value: 0.08, impact: 'positive' },
      { feature: 'Stress (Crt)', value: -0.02, impact: 'negative' },
    ],
    summary: {
        concern: "Maintenance of Healthy Baseline",
        change: "Improved Sleep Consistency (+12%)",
        actions: [
            "Maintain current sleep schedule (23:00 - 07:00)",
            "Consider increasing Zone 2 cardio to improve VO2 Max",
            "Schedule annual metabolic panel in 3 months"
        ]
    },
    intervention: "Great stability. Maintain your current sleep schedule and zone 2 cardio."
  },
  risk: {
    id: 'SUB-9942-C',
    name: 'Jordan Lee (High-Risk Demo)',
    riskScore: 78, 
    riskLevel: 'Unstable',
    statusColor: 'rose',
    trend: generateTrend(60, 8, 30, 0.8), 
    hrv: { current: 32, baseline: 55, status: 'Critical Drop' },
    rhr: { current: 78, baseline: 62, status: 'Elevated' },
    sleep: { current: 5.2, baseline: 7.0, status: 'Deficit' },
    bp: '148/94',
    bmi: { value: 29.1, status: 'Overweight' },
    steps: { current: 2100, status: 'Sedentary' },
    stress: { score: 85, status: 'High' },
    allergies: ['Ragweed (Seasonal)', 'Penicillin'],
    labs: [
      { name: 'HbA1c', value: 6.2, unit: '%', status: 'warning' },
      { name: 'LDL-C', value: 160, unit: 'mg/dL', status: 'critical' },
      { name: 'hs-CRP', value: 4.2, unit: 'mg/L', status: 'critical' },
      { name: 'Cortisol', value: 22, unit: 'mcg/dL', status: 'warning' },
    ],
    conditions: [
      { name: 'Metabolic', risk: 65, status: 'high' },
      { name: 'Cardiovascular', risk: 82, status: 'critical' },
      { name: 'Inflammatory', risk: 70, status: 'high' }
    ],
    predictions: [
        { name: 'Prediabetes', prob: 'High (85%)', status: 'warning' },
        { name: 'Sleep Apnea', prob: 'Moderate (45%)', status: 'warning' },
        { name: 'Hypertension', prob: 'High (92%)', status: 'critical' }
    ],
    shapValues: [
      { feature: 'HRV Decline', value: -0.35, impact: 'negative' },
      { feature: 'Sleep Debt', value: -0.28, impact: 'negative' },
      { feature: 'BP Spike', value: -0.22, impact: 'negative' },
      { feature: 'Social Jetlag', value: -0.10, impact: 'negative' },
    ],
    summary: {
        concern: "Cardiovascular Instability & Inflammation",
        change: "Spike in Morning Cortisol & HRV Drop",
        actions: [
            "Consult physician regarding potential Prediabetes markers",
            "Screen for Obstructive Sleep Apnea (OSA)",
            "Increase daily steps to 5,000 (Low Intensity)",
            "Reduce caffeine intake after 12:00 PM"
        ]
    },
    intervention: "Significant divergence detected. Reduce caffeine intake and review recent blood panel."
  }
};

// Shared Vitals Data for Charts
const VITALS_DATA = [
  { time: '08:00', hr: 62, bp: 118 }, { time: '10:00', hr: 75, bp: 122 },
  { time: '12:00', hr: 88, bp: 125 }, { time: '14:00', hr: 70, bp: 120 },
  { time: '16:00', hr: 65, bp: 119 }, { time: '18:00', hr: 92, bp: 130 },
];

// Color mapping for dynamic classes
const statusColorMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20'
  },
  rose: {
    bg: 'bg-rose-500',
    text: 'text-rose-400',
    border: 'border-rose-500/20'
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-amber-400',
    border: 'border-amber-500/20'
  },
  teal: {
    bg: 'bg-teal-500',
    text: 'text-teal-400',
    border: 'border-teal-500/20'
  }
};

// -----------------------------------------------------------------------------
// 2. UI COMPONENTS
// -----------------------------------------------------------------------------

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    normal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    critical: 'bg-rose-600/20 text-rose-500 border-rose-600/30',
    'Critical Drop': 'bg-rose-600/20 text-rose-500 border-rose-600/30',
    'Elevated': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Optimal': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Deficit': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Overweight': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Active': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Sedentary': 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };
  
  const style = colors[status] || colors['normal'];

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style}`}>
      {status}
    </span>
  );
};

const Card = ({ children, className = "", title, action, icon: Icon }: any) => (
  <div className={`bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-center mb-4">
        {title && <h3 className="text-slate-400 font-semibold text-xs tracking-widest uppercase flex items-center gap-2">
          {Icon && <Icon size={16} className="text-slate-500" />}
          {title}
        </h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

// -----------------------------------------------------------------------------
// 3. FLOATING COPILOT OVERLAY
// -----------------------------------------------------------------------------

const CopilotOverlay = ({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: any }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  if (!isOpen) return null;

  const initialMessage = user.riskScore > 50 
    ? "I've detected a significant divergence in your cardiovascular baseline. Your HRV has dropped 40% below your 30-day average. Would you like to analyze the potential causes?" 
    : "Your metrics look stable today. Recovery is optimal (HRV: 68ms). Is there anything specific you'd like to review regarding your sleep or activity?";

  return (
    <div className="fixed bottom-24 right-4 md:right-8 w-[90vw] md:w-[450px] h-[600px] max-h-[80vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-10 zoom-in-95 duration-300 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500/10 rounded-lg flex items-center justify-center">
             <Sparkles size={16} className="text-teal-400" />
          </div>
          <div>
             <span className="font-bold text-slate-200 block text-sm">Health Intelligence</span>
             <span className="text-[10px] text-slate-500 flex items-center gap-1"><Lock size={8}/> Private & Secure</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Chat Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
        
        {/* AI Message */}
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-teal-900/20 mt-1">
            <Zap size={14} className="text-white" />
          </div>
          <div className="space-y-2 max-w-[85%]">
             <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-tl-none text-slate-300 text-sm leading-relaxed shadow-sm">
                {initialMessage}
             </div>
          </div>
        </div>

        {/* Context Chips */}
        <div className="flex flex-wrap gap-2 pl-11">
           {user.riskScore > 50 ? (
             <>
                <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded-full">High Anomaly</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded-full">Cortisol Spike</span>
             </>
           ) : (
             <>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full">Optimal State</span>
             </>
           )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <div className="p-2 bg-slate-950 border-t border-slate-900">
        <div className="flex gap-2 overflow-x-auto pb-2 px-2 scrollbar-hide">
          {[
            "Why did my score change?",
            "Explain the HRV drop",
            "Draft clinical summary"
          ].map((prompt, i) => (
            <button key={i} className="whitespace-nowrap text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-teal-400 px-3 py-2 rounded-lg transition-colors border border-slate-800">
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <div className="relative flex items-center gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your biomarkers..." 
            className="flex-1 bg-slate-950 text-slate-200 rounded-xl pl-4 pr-4 py-3 text-sm border border-slate-800 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition-all placeholder:text-slate-600"
          />
          <button className="p-3 bg-teal-600 rounded-xl hover:bg-teal-500 text-white transition-colors shadow-lg shadow-teal-900/20">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 4. PAGE VIEWS
// -----------------------------------------------------------------------------

const OverviewView = ({ user, onAction }: { user: any, onAction: any }) => {
  const isRisk = user.riskScore > 50;
  const colorMap = statusColorMap[user.statusColor] || statusColorMap.emerald;
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Row: Score & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Risk Score */}
        <Card className="lg:col-span-1 relative overflow-hidden group">
          <div className={`absolute top-0 left-0 w-1 h-full ${colorMap.bg} opacity-80`}></div>
          <div className="flex flex-col h-full justify-between relative z-10">
            <div>
              <div className="flex justify-between items-start">
                  <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Activity size={14} /> Instability Score
                  </h2>
                  <StatusBadge status={user.riskLevel} />
              </div>
              <div className="flex items-baseline gap-3 mt-4">
                <span className={`text-7xl font-bold ${colorMap.text} tracking-tighter`}>{user.riskScore}%</span>
              </div>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                Calculated via Isolation Forest + GRU Ensemble.<br/>
                Baseline Ref: 90-day rolling avg.
              </p>
            </div>
            <button 
              onClick={() => onAction('explainability')}
              className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700"
            >
              <Brain size={14} /> Analyze Risk Drivers
            </button>
          </div>
          <div className={`absolute -bottom-10 -right-10 w-32 h-32 ${colorMap.bg}/10 blur-3xl rounded-full pointer-events-none`}></div>
        </Card>

        {/* DAILY HEALTH BRIEF */}
        <Card title="Daily Health Brief" className="lg:col-span-2" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
             <div className="space-y-4 border-r border-slate-800 pr-6">
                <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Primary Concern</label>
                    <p className="text-sm font-medium text-slate-200 mt-1">{user.summary.concern}</p>
                </div>
                <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Notable Change</label>
                    <p className="text-sm font-medium text-slate-200 mt-1">{user.summary.change}</p>
                </div>
                <div className="pt-2">
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isRisk ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width: `${user.riskScore}%`}}></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 text-right">Confidence: 94.2%</p>
                </div>
             </div>

             <div className="pl-2">
                <label className="text-[10px] uppercase text-teal-500 font-bold tracking-wider flex items-center gap-1 mb-3">
                    <Sparkles size={10} /> Suggested Actions
                </label>
                <ul className="space-y-3">
                    {user.summary.actions.map((action: string, i: number) => (
                        <li key={i} className="flex gap-3 text-xs text-slate-300 leading-relaxed group">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 group-hover:bg-teal-400 transition-colors"></span>
                            {action}
                        </li>
                    ))}
                </ul>
             </div>
          </div>
        </Card>
      </div>

      {/* CLINICAL PREDICTIONS (New!) */}
      <Card title="Clinical Risk Projections (ML)" icon={AlertCircle}>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {user.predictions.map((pred: any, i: number) => (
                 <div key={i} className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                         <span className="text-xs text-slate-400 uppercase font-bold">{pred.name}</span>
                         <div className={`w-2 h-2 rounded-full ${pred.status === 'normal' ? 'bg-emerald-500' : pred.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                     </div>
                     <p className={`text-lg font-bold ${pred.status === 'normal' ? 'text-emerald-400' : pred.status === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>
                         {pred.prob}
                     </p>
                 </div>
             ))}
         </div>
      </Card>

      {/* LIFESTYLE METRICS (New!) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card title="Resting Heart Rate" icon={Heart} className="md:col-span-1">
             <div className="space-y-4">
                 <div>
                     <div className="flex justify-between items-center mb-1">
                         <span className="text-sm text-slate-400">Current</span>
                         <span className="text-sm font-bold text-slate-200">{user.rhr.current} bpm</span>
                     </div>
                     <p className="text-[10px] text-slate-600 mb-2">Typical range: 60 - 100 bpm</p>
                 </div>
                 <div className="flex justify-between items-center p-2 bg-slate-950/50 rounded-lg">
                     <span className="text-sm text-slate-400">Baseline</span>
                     <span className="text-sm font-mono text-slate-500">{user.rhr.baseline} bpm</span>
                 </div>
                 <StatusBadge status={user.rhr.status} />
             </div>
         </Card>

         <Card title="Activity & Composition" icon={Footprints} className="md:col-span-1">
             <div className="space-y-4">
                 <div>
                     <div className="flex justify-between items-center mb-1">
                         <span className="text-sm text-slate-400">Step Count</span>
                         <span className="text-sm font-mono text-slate-200">{user.steps.current}</span>
                     </div>
                     <p className="text-[10px] text-slate-600 mb-2">Typical range: 7,000 - 10,000 steps/day</p>
                     <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 rounded-full" style={{width: `${Math.min(100, (user.steps.current/10000)*100)}%`}}></div>
                     </div>
                 </div>
                 <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                     <span className="text-sm text-slate-400">BMI</span>
                     <div className="text-right">
                         <span className="text-sm font-mono text-slate-200 block">{user.bmi.value}</span>
                         <StatusBadge status={user.bmi.status} />
                     </div>
                 </div>
             </div>
         </Card>

         <Card title="Stress Load (HRV Derived)" icon={Zap} className="md:col-span-1">
             <div className="flex flex-col items-center justify-center h-full py-2">
                 <div className="relative w-32 h-32">
                     <svg className="w-full h-full transform -rotate-90">
                         <circle cx="64" cy="64" r="56" stroke="#1e293b" strokeWidth="12" fill="transparent" />
                         <circle cx="64" cy="64" r="56" stroke={user.stress.score > 50 ? '#f43f5e' : '#10b981'} strokeWidth="12" fill="transparent" strokeDasharray="351" strokeDashoffset={351 - (user.stress.score/100)*351} strokeLinecap="round" />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-3xl font-bold text-white">{user.stress.score}</span>
                         <span className="text-[10px] text-slate-500 uppercase">Index</span>
                     </div>
                 </div>
             </div>
         </Card>

         <Card title="Sleep & Recovery" icon={Moon} className="md:col-span-1">
             <div className="space-y-4">
                 <div>
                     <div className="flex justify-between items-center p-3 bg-slate-950/50 rounded-lg mb-1">
                         <span className="text-sm text-slate-400">Duration</span>
                         <span className="text-sm font-bold text-slate-200">{user.sleep.current}h</span>
                     </div>
                     <p className="text-[10px] text-slate-600 px-3 mb-2">Typical range: 7-9 hours/night</p>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-slate-950/50 rounded-lg">
                     <span className="text-sm text-slate-400">Baseline</span>
                     <span className="text-sm font-mono text-slate-500">{user.sleep.baseline}h</span>
                 </div>
                 <StatusBadge status={user.sleep.status} />
             </div>
         </Card>
      </div>
    </div>
  );
};

const MultimodalView = ({ user }: { user: any }) => (
  <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Recent Lab Panel (Simulated)" icon={Microscope}>
        <div className="space-y-4">
          {user.labs.map((lab: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-slate-800/50 hover:border-slate-700 transition-colors">
              <div>
                <p className="text-sm font-medium text-slate-200">{lab.name}</p>
                <p className="text-[10px] text-slate-500">Last updated: 2d ago</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-slate-300">{lab.value} <span className="text-slate-600">{lab.unit}</span></span>
                <div className={`w-2 h-2 rounded-full ${lab.status === 'critical' ? 'bg-rose-500 animate-pulse' : lab.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ALLERGIES & IMMUNE (New!) */}
      <Card title="Allergies & Immunological Status" icon={Dna}>
          <div className="space-y-3">
              {user.allergies.map((allergy: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-950/30 border border-slate-800/50 rounded-xl">
                      <span className="text-sm text-slate-300">{allergy}</span>
                      <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">Active</span>
                  </div>
              ))}
              <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-500 uppercase font-bold">IgE Levels</span>
                      <span className={`text-xs font-bold ${user.id.includes('9942') ? 'text-rose-400' : 'text-emerald-400'}`}>{user.id.includes('9942') ? 'High (245 kU/L)' : 'Normal (<100 kU/L)'}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${user.id.includes('9942') ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width: user.id.includes('9942') ? '80%' : '20%'}}></div>
                  </div>
              </div>
          </div>
      </Card>
    </div>

    <Card title="Vitals Monitoring (24h)" className="h-80">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={VITALS_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 11}} />
                <YAxis stroke="#64748b" tick={{fontSize: 11}} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                <Legend />
                <Line type="monotone" dataKey="bp" stroke="#60a5fa" strokeWidth={2} name="BP (Sys)" dot={{r:3}} />
                <Line type="monotone" dataKey="hr" stroke="#34d399" strokeWidth={2} name="Heart Rate" dot={{r:3}} />
            </LineChart>
        </ResponsiveContainer>
    </Card>
  </div>
);

const ExplainabilityView = ({ user }: { user: any }) => {
  // Baseline reference ranges mapping
  const baselineRanges: Record<string, string> = {
    'Resting HR': '60 - 100 bpm',
    'HRV': '20 - 50 ms (varies by age)',
    'Sleep Minutes': '7 - 9 hours/night (420 - 540 min)',
    'Steps': '7,000 - 10,000 steps/day',
    'Sleep Regularity': 'Consistent bedtime ±30 min',
    'Activity Lvl': '150+ min/week moderate activity',
    'Stress (Crt)': 'Lower is better',
    'HRV Decline': 'Monitor for >20% drop',
    'Sleep Debt': 'Maintain <2h deficit',
    'BP Spike': 'Normal: <120/80 mmHg',
    'Social Jetlag': 'Minimize weekend shift'
  };

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-300">
      <Card title="SHAP Value Analysis (Local Interpretability)">
        <p className="text-slate-500 text-xs mb-4 max-w-2xl">
          Visualizes which features pushed the model's prediction towards instability (Red/Negative) or stability (Green/Positive) for today's score.
        </p>
        
        {/* Baseline Reference Ranges */}
        <div className="mb-4 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Baseline Reference Ranges</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {user.shapValues.map((entry: any, i: number) => {
              const range = baselineRanges[entry.feature] || 'N/A';
              return (
                <div key={i} className="text-[10px] text-slate-400">
                  <span className="font-medium text-slate-300">{entry.feature}:</span> {range}
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={user.shapValues} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tick={{fontSize: 10}} />
              <YAxis dataKey="feature" type="category" stroke="#94a3b8" width={100} tick={{fontSize: 11}} />
              <Tooltip cursor={{fill: '#334155', opacity: 0.2}} contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b'}} />
              <Bar dataKey="value" name="Impact Score" radius={[0, 4, 4, 0]}>
                {user.shapValues.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.impact === 'negative' ? '#f43f5e' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Model Reliability & Calibration">
        <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/30">
          <ShieldCheck size={32} className="mb-3 text-slate-600" />
          <span className="font-mono">Brier Score: 0.042</span>
          <span className="text-xs text-slate-600 mt-1">High Reliability Index</span>
        </div>
      </Card>
      <Card title="Volatility Index">
        <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/30">
          <Activity size={32} className="mb-3 text-slate-600" />
          <span className="font-mono">Signal Noise Ratio: 8.5dB</span>
          <span className="text-xs text-slate-600 mt-1">Acceptable Variance</span>
        </div>
      </Card>
    </div>
  </div>
  );
};

const EvidenceView = ({ reviewerMode }: { reviewerMode: boolean }) => (
  <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
    <Card title="Evidence Bundle" icon={FileText}>
        <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
            <div>
                <h4 className="text-sm font-bold text-slate-200">Clinical Validation Package</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md">Contains model architecture diagrams, calibration curves, SHAP analysis, and anonymized validation dataset samples.</p>
            </div>
            <button 
                disabled={reviewerMode} 
                className={`px-4 py-2 bg-teal-600/10 border border-teal-500/40 rounded-lg text-xs text-teal-300 flex items-center gap-2 hover:bg-teal-600/20 transition-colors ${reviewerMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Download size={14} /> Download Evidence Bundle (ZIP)
            </button>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Model Documentation (v2.1)</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Evaluation Plots (Calibration, Volatility)</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Sample PDF Reports</li>
            </ul>
            <ul className="space-y-3 text-xs text-slate-300">
                 <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Data Schema & Audit Log</li>
                 <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> HIPAA Compliance Cert</li>
                 <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> System Architecture Diagram</li>
            </ul>
        </div>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Model Reliability & Calibration">
        <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/30">
          <ShieldCheck size={32} className="mb-3 text-slate-600" />
          <span className="font-mono">Brier Score: 0.042</span>
          <span className="text-xs text-slate-600 mt-1">High Reliability Index</span>
        </div>
      </Card>
      <Card title="Volatility Index">
        <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/30">
          <Activity size={32} className="mb-3 text-slate-600" />
          <span className="font-mono">Signal Noise Ratio: 8.5dB</span>
          <span className="text-xs text-slate-600 mt-1">Acceptable Variance</span>
        </div>
      </Card>
    </div>

    <Card title="Audit Trail" icon={Calendar}>
      <div className="space-y-4">
        <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-500/10 rounded-lg flex items-center justify-center">
                <Database size={16} className="text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Data Access Log</p>
                <p className="text-[10px] text-slate-500">Last updated: 2 hours ago</p>
              </div>
            </div>
            <StatusBadge status="normal" />
          </div>
          <p className="text-xs text-slate-400 mt-2">All data access events are logged with timestamps, user IDs, and action types for compliance auditing.</p>
        </div>

        <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Lock size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Model Version History</p>
                <p className="text-[10px] text-slate-500">Current: phase3-v1-wes</p>
              </div>
            </div>
            <StatusBadge status="normal" />
          </div>
          <p className="text-xs text-slate-400 mt-2">All model versions are tracked with deployment dates, performance metrics, and rollback capabilities.</p>
        </div>

        <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Eye size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Reviewer Mode Status</p>
                <p className="text-[10px] text-slate-500">{reviewerMode ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
            <StatusBadge status={reviewerMode ? 'warning' : 'normal'} />
          </div>
          <p className="text-xs text-slate-400 mt-2">PII is pseudonymized when reviewer mode is active. All reviewer actions are logged for audit purposes.</p>
        </div>
      </div>
    </Card>
  </div>
);

const SettingsView = () => (
  <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in">
    <Card title="Connected Devices & Sources" icon={Smartphone}>
      <div className="space-y-4">
        {[
          { name: 'Apple Health', connected: true, icon: Activity, lastSync: '2 mins ago' },
          { name: 'Oura Cloud', connected: true, icon: CheckCircle, lastSync: '15 mins ago' },
          { name: 'Samsung Watch', connected: true, icon: Watch, lastSync: '5 mins ago' },
          { name: 'Whoop API', connected: false, icon: Watch, lastSync: '-' },
          { name: 'Fitbit', connected: false, icon: Watch, lastSync: '-' },
          { name: 'Quest Diagnostics', connected: true, icon: Database, lastSync: '1 day ago' },
        ].map((device, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${device.connected ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-800 text-slate-600'}`}>
                <device.icon size={20} />
              </div>
              <div>
                  <p className={`font-medium ${device.connected ? 'text-slate-200' : 'text-slate-500'}`}>{device.name}</p>
                  {device.connected && <p className="text-xs text-slate-500">Synced {device.lastSync}</p>}
              </div>
            </div>
            <button className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${device.connected ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-teal-900/30 bg-teal-900/10 text-teal-400 hover:bg-teal-900/20'}`}>
               {device.connected ? 'Configure' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </Card>
    
    <Card title="Data Privacy & Compliance">
      <div className="p-4 bg-slate-900/50 rounded-xl text-sm text-slate-400 border border-slate-800">
        <div className="flex gap-4 mb-4">
          <div className="p-2 bg-emerald-500/10 rounded-lg h-fit"><Lock size={20} className="text-emerald-400" /></div>
          <div>
              <h4 className="text-slate-200 font-medium mb-1">End-to-End Encryption</h4>
              <p className="text-xs text-slate-500 leading-relaxed">All health data is encrypted at rest (AES-256) and in transit (TLS 1.3). Your private keys are stored locally.</p>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="p-2 bg-blue-500/10 rounded-lg h-fit"><Eye size={20} className="text-blue-400" /></div>
           <div>
              <h4 className="text-slate-200 font-medium mb-1">Reviewer Mode</h4>
              <p className="text-xs text-slate-500 leading-relaxed">PII is currently pseudonymized for demonstration purposes. Session ID: SUB-8821-A.</p>
           </div>
        </div>
      </div>
    </Card>
  </div>
);

// -----------------------------------------------------------------------------
// 4. MAIN CONTROLLER (Navigation & State)
// -----------------------------------------------------------------------------

// Helper to transform backend data to UI format
const transformBackendData = (dash: any, exp: any, multimodal: any, userId: string) => {
  if (!dash || !dash.forecast) return null;
  
  const latestRisk = dash.forecast.latest?.risk || 0;
  const riskScore = Math.round(latestRisk * 100);
  const isHighRisk = riskScore > 50;
  
  // Transform forecast series
  const trend = (dash.forecast.series || []).map((r: any, i: number) => ({
    day: i === dash.forecast.series.length - 1 ? 'Today' : `D-${dash.forecast.series.length - 1 - i}`,
    value: Math.round(r.risk * 100),
    type: i === dash.forecast.series.length - 1 ? 'current' : 'history'
  }));

  // Transform SHAP values
  const shapValues = (exp?.top_contributors || []).map((c: any) => ({
    feature: c.feature === 'rhr' ? 'Resting HR' : 
             c.feature === 'hrv_avg' ? 'HRV' :
             c.feature === 'sleep_minutes' ? 'Sleep Minutes' :
             c.feature === 'steps' ? 'Steps' : c.feature,
    value: c.shap_value || 0,
    impact: (c.shap_value || 0) >= 0 ? 'positive' : 'negative'
  }));

  // Get metrics from anomalies
  const anomalies = dash.anomaly?.items || [];
  const hrvAnomaly = anomalies.find((a: any) => a.signal === 'hrv');
  const rhrAnomaly = anomalies.find((a: any) => a.signal === 'rhr');
  const sleepAnomaly = anomalies.find((a: any) => a.signal === 'sleep');
  const stepsAnomaly = anomalies.find((a: any) => a.signal === 'steps');

  // Transform multimodal conditions
  const conditions = (multimodal?.conditions || []).map((c: any) => ({
    name: c.name || 'Unknown',
    risk: Math.round((c.risk || 0) * 100),
    status: (c.risk || 0) > 0.6 ? 'high' : (c.risk || 0) > 0.3 ? 'warning' : 'low'
  }));

  return {
    id: userId,
    name: `User ${userId.slice(0, 8)}`,
    riskScore,
    riskLevel: isHighRisk ? 'Unstable' : 'Stable',
    statusColor: isHighRisk ? 'rose' : 'emerald',
    trend,
    hrv: { 
      current: hrvAnomaly?.z ? Math.round(50 + hrvAnomaly.z * 10) : 55, 
      baseline: 55, 
      status: hrvAnomaly?.z && hrvAnomaly.z < -2 ? 'Critical Drop' : 'Optimal' 
    },
    rhr: { 
      current: rhrAnomaly?.z ? Math.round(60 + rhrAnomaly.z * 5) : 62, 
      baseline: 62, 
      status: rhrAnomaly?.z && rhrAnomaly.z > 2 ? 'Elevated' : 'Optimal' 
    },
    sleep: { 
      current: sleepAnomaly?.z ? Math.round(7 + sleepAnomaly.z * 0.5) : 7.0, 
      baseline: 7.0, 
      status: sleepAnomaly?.z && sleepAnomaly.z < -2 ? 'Deficit' : 'Optimal' 
    },
    bp: '120/80',
    bmi: { value: 24.5, status: 'Normal' },
    steps: { 
      current: stepsAnomaly?.z ? Math.round(8000 + stepsAnomaly.z * 1000) : 8000, 
      status: stepsAnomaly?.z && stepsAnomaly.z < -1 ? 'Sedentary' : 'Active' 
    },
    stress: { score: Math.round(riskScore * 0.7), status: riskScore > 50 ? 'High' : 'Low' },
    allergies: ['None Reported'],
    labs: [
      { name: 'HbA1c', value: 5.2, unit: '%', status: 'normal' },
      { name: 'LDL-C', value: 100, unit: 'mg/dL', status: 'normal' },
    ],
    conditions,
    predictions: [
      { name: 'Prediabetes', prob: riskScore > 60 ? 'Moderate (45%)' : 'Low (<10%)', status: riskScore > 60 ? 'warning' : 'normal' },
      { name: 'Hypertension', prob: riskScore > 70 ? 'High (75%)' : 'Low (<15%)', status: riskScore > 70 ? 'critical' : 'normal' }
    ],
    shapValues,
    summary: {
      concern: isHighRisk ? "Cardiovascular Instability Detected" : "Maintenance of Healthy Baseline",
      change: isHighRisk ? "Spike in Risk Score & HRV Drop" : "Stable Metrics",
      actions: isHighRisk ? [
        "Review recent metrics and consult physician",
        "Increase daily activity levels",
        "Monitor sleep patterns"
      ] : [
        "Maintain current lifestyle",
        "Continue regular monitoring"
      ]
    },
    intervention: isHighRisk ? "Significant divergence detected. Review metrics and consult healthcare provider." : "Metrics are stable. Continue current routine."
  };
};

export default function SubHealthAI() {
  const [userType, setUserType] = useState<'healthy' | 'risk' | 'real' | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reviewerMode, setReviewerMode] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  
  // Get real user ID
  const realUserId = useActiveUser();
  const version = "phase3-v1-wes";
  
  // Fetch real backend data
  const { dash, exp, loading, error } = useRiskData(
    userType === 'real' && realUserId ? realUserId : '', 
    version
  );
  
  // Fetch multimodal risk data (may require auth, so handle errors gracefully)
  const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) return null; // Return null if auth required or error
    return res.json();
  }).catch(() => null);
  const { data: multimodal } = useSWR(
    userType === 'real' && realUserId ? `/api/multimodal_risk` : null,
    fetcher
  );

  // Transform data or use mock
  const realUserData = userType === 'real' && dash && exp 
    ? transformBackendData(dash, exp, multimodal, realUserId || '') 
    : null;
  
  const currentUser = userType === 'real' ? realUserData : (userType ? USER_PROFILES[userType] : null);

  // Show loading state when fetching real data
  if (userType === 'real' && loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCcw className="animate-spin text-teal-400 mx-auto" size={32} />
          <p className="text-slate-400">Loading real data from backend...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (userType === 'real' && error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="text-rose-400 mx-auto" size={32} />
          <p className="text-slate-400">Error loading data: {error.message || 'Unknown error'}</p>
          <button 
            onClick={() => setUserType(null)}
            className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleGeneratePDF = () => {
    if (!currentUser) return;
    
    setPdfGenerating(true);
    
    // Get user ID - use real user ID if available
    const userId = userType === 'real' && realUserId 
      ? realUserId 
      : null;
    
    if (!userId) {
      alert('User ID required to generate report. Please select a user profile.');
      setPdfGenerating(false);
      return;
    }
    
    // Build PDF URL with parameters
    const params = new URLSearchParams({
      user: userId,
      version: version,
    });
    
    // Open PDF in new window
    const pdfWindow = window.open(`/api/report?${params.toString()}`, '_blank', 'noopener,noreferrer');
    
    // If popup was blocked, show fallback
    if (!pdfWindow) {
      alert('Popup blocked. Please allow popups for this site to download the PDF.');
    }
    
    // Reset loading state after a short delay
    setTimeout(() => {
      setPdfGenerating(false);
    }, 1000);
  };

  // --- 1. AUTH SCREEN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans selection:bg-teal-500/30 relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
           <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[120px]"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-teal-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-900/50">
                <Activity size={40} className="text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-slate-100 tracking-tight">SubHealth<span className="text-teal-400">AI</span></h1>
            <p className="text-slate-400 mt-3 text-sm font-medium">
              Multimodal Health Risk Intelligence Platform<br/>
              <span className="text-slate-600 text-xs font-normal">Research Prototype v0.9.4-beta</span>
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-4">
            <div className="space-y-3">
              <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider ml-1">Select Demo Profile</label>
              
              <button 
                onClick={() => setUserType('healthy')}
                className="w-full p-4 bg-slate-950/50 hover:bg-slate-800 border border-emerald-900/30 hover:border-emerald-500/50 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={20}/>
                    </div>
                    <div className="text-left">
                        <div className="text-emerald-400 font-bold text-sm group-hover:text-emerald-300">Healthy Baseline</div>
                        <div className="text-slate-500 text-xs">Low risk, stable metrics</div>
                    </div>
                </div>
                <ChevronRight className="text-slate-700 group-hover:text-emerald-400 transition-colors" size={18} />
              </button>

              <button 
                onClick={() => setUserType('risk')}
                className="w-full p-4 bg-slate-950/50 hover:bg-slate-800 border border-rose-900/30 hover:border-rose-500/50 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                        <Activity size={20}/>
                    </div>
                    <div className="text-left">
                        <div className="text-rose-400 font-bold text-sm group-hover:text-rose-300">High-Risk Detected</div>
                        <div className="text-slate-500 text-xs">Metabolic instability, stress</div>
                    </div>
                </div>
                <ChevronRight className="text-slate-700 group-hover:text-rose-400 transition-colors" size={18} />
              </button>

              {realUserId && (
                <button 
                  onClick={() => setUserType('real')}
                  className="w-full p-4 bg-slate-950/50 hover:bg-slate-800 border border-teal-900/30 hover:border-teal-500/50 rounded-2xl flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform">
                          <Database size={20}/>
                      </div>
                      <div className="text-left">
                          <div className="text-teal-400 font-bold text-sm group-hover:text-teal-300">Real Backend Data</div>
                          <div className="text-slate-500 text-xs">Connected to database ({realUserId.slice(0, 8)}...)</div>
                      </div>
                  </div>
                  <ChevronRight className="text-slate-700 group-hover:text-teal-400 transition-colors" size={18} />
                </button>
              )}
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider"><span className="bg-slate-900 px-2 text-slate-600">Or Login</span></div>
            </div>

            <form className="space-y-3 opacity-50 pointer-events-none select-none">
              <input type="email" placeholder="researcher@institute.edu" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300" disabled />
              <input type="password" placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300" disabled />
              <button className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50">Sign In</button>
            </form>
          </div>

          <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-xl flex gap-3 items-start">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
            <p className="text-[10px] text-amber-500/80 leading-relaxed">
              <strong>NON-DIAGNOSTIC USE ONLY.</strong> This system uses experimental ML models (Isolation Forests) for pattern detection. Not FDA cleared.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. MAIN DASHBOARD LAYOUT ---
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-teal-500/30">
      
      {/* Sidebar (Desktop) */}
      <aside className="w-20 lg:w-72 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-teal-900/20">
              <Activity size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight hidden lg:block">SubHealth<span className="text-teal-400">AI</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-6">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4 px-2 hidden lg:block">Core Modules</div>
          {[
            { id: 'dashboard', label: 'Daily Overview', icon: BarChart2 },
            { id: 'multimodal', label: 'Multimodal Data', icon: Activity },
            { id: 'explainability', label: 'Risk Drivers (XAI)', icon: Brain },
            { id: 'evidence', label: 'Evidence & Audit', icon: FileText },
            { id: 'settings', label: 'Devices & Settings', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-sm font-medium group ${
                activeTab === item.id 
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'} />
              <span className="hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Profile / Logout */}
        <div className="p-4 border-t border-slate-800">
           <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/50 flex items-center gap-3 hover:bg-slate-800 transition-colors cursor-pointer group" onClick={() => setUserType(null)}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white border border-slate-500">
                 {currentUser.name.charAt(0)}
              </div>
              <div className="hidden lg:block overflow-hidden">
                 <p className="text-sm font-bold text-slate-200 truncate">{currentUser.name}</p>
                 <p className="text-[10px] text-slate-500 font-mono truncate">{currentUser.id}</p>
              </div>
              <LogOut size={14} className="text-slate-600 group-hover:text-rose-400 ml-auto hidden lg:block" />
           </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm md:hidden p-6 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                  <span className="font-bold text-xl">Menu</span>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-800 rounded-full"><X size={20}/></button>
              </div>
              <nav className="space-y-2">
                {[
                  { id: 'dashboard', label: 'Daily Overview', icon: BarChart2 },
                  { id: 'multimodal', label: 'Multimodal Data', icon: Activity },
                  { id: 'explainability', label: 'Risk Drivers (XAI)', icon: Brain },
                  { id: 'evidence', label: 'Evidence & Audit', icon: FileText },
                  { id: 'settings', label: 'Devices & Settings', icon: Settings },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium ${
                      activeTab === item.id ? 'bg-teal-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    <item.icon size={24} />
                    {item.label}
                  </button>
                ))}
              </nav>
              <button onClick={() => setUserType(null)} className="mt-auto w-full py-4 bg-slate-900 rounded-xl text-slate-400 font-bold flex items-center justify-center gap-2">
                  <LogOut size={20}/> Logout
              </button>
          </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-black">
        
        {/* Top Header */}
        <header className="h-20 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-400 p-2 hover:bg-slate-800 rounded-lg"><Menu size={24} /></button>
             <div>
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-3">
                    {activeTab === 'dashboard' && 'Daily Overview'}
                    {activeTab === 'multimodal' && 'Multimodal Intelligence'}
                    {activeTab === 'explainability' && 'Model Explainability'}
                    {activeTab === 'evidence' && 'Evidence & Audit'}
                    {activeTab === 'settings' && 'Settings'}
                    
                    {reviewerMode && <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Audit Mode</span>}
                </h2>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setReviewerMode(!reviewerMode)}
               className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${reviewerMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'}`}
             >
                <Eye size={14} /> {reviewerMode ? 'Reviewer View' : 'Reviewer Mode'}
             </button>
             
             <div className="w-px h-6 bg-slate-800 mx-2 hidden md:block"></div>

             <button 
               onClick={handleGeneratePDF}
               disabled={pdfGenerating}
               className="hidden md:flex items-center gap-2 px-4 py-2 bg-teal-600/10 hover:bg-teal-600/20 border border-teal-600/30 text-teal-400 text-xs font-bold rounded-lg transition-all"
             >
               {pdfGenerating ? <RefreshCcw className="animate-spin" size={14} /> : <FileText size={14} />}
               <span>Export Report</span>
             </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 pb-24 relative">
           <div className="max-w-7xl mx-auto">
              {activeTab === 'dashboard' && <OverviewView user={currentUser} onAction={setActiveTab} />}
              {activeTab === 'multimodal' && <MultimodalView user={currentUser} />}
              {activeTab === 'explainability' && <ExplainabilityView user={currentUser} />}
              {activeTab === 'evidence' && <EvidenceView reviewerMode={reviewerMode} />}
              {activeTab === 'settings' && <SettingsView />}
           </div>
        </main>

        {/* FLOATING COPILOT BAR (Click to open overlay) */}
        {!isCopilotOpen && (
            <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 ml-0 lg:ml-72 pointer-events-none">
                <div className="w-full max-w-2xl px-6 pointer-events-auto">
                    <div 
                        onClick={() => setIsCopilotOpen(true)}
                        className="bg-slate-950/90 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-2 pl-3 flex items-center gap-3 shadow-2xl shadow-black/50 ring-1 ring-white/5 cursor-pointer hover:bg-slate-900/90 transition-all group"
                    >
                        <div className="p-2 bg-teal-500/10 rounded-xl group-hover:bg-teal-500/20 transition-colors"><Zap className="text-teal-400" size={18} /></div>
                        <span className="flex-1 text-sm text-slate-400 group-hover:text-slate-200 transition-colors">Ask Dr. AI about your recent metabolic spike...</span>
                        <button className="p-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-colors"><MessageSquare size={18} /></button>
                    </div>
                </div>
            </div>
        )}
        
        {/* COPILOT OVERLAY COMPONENT */}
        <CopilotOverlay isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} user={currentUser} />

      </div>
    </div>
  );
}

