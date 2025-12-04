// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  Activity, Brain, Shield, ChevronRight, Play, ScanLine, Globe, Zap, 
  ArrowRight, Lock, ShieldCheck, Heart, Wind, Thermometer, 
  Database, Settings, User, Fingerprint, Layers, TrendingUp, 
  GitCommit, MessageSquare, LogOut, Search, Menu, Bell, X,
  Cpu, LayoutGrid, FileText, Mail, Key, AlertTriangle, 
  Stethoscope, Microscope, Watch, CheckCircle, BarChart2,
  UploadCloud, File, Plus, Trash2, Smartphone, CheckSquare, FlaskConical
} from 'lucide-react';

// --- THEME & UTILS ---
const COLORS = {
  bg: 'bg-[#02040a]',
  card: 'bg-slate-900/40',
  border: 'border-white/5',
  borderHover: 'border-cyan-500/30',
  text: 'text-slate-300',
  textMuted: 'text-slate-500',
  accent: 'text-cyan-400',
  accentBg: 'bg-cyan-500',
  risk: 'text-amber-400',
  riskBg: 'bg-amber-500',
  danger: 'text-rose-500',
  dangerBg: 'bg-rose-500',
};

// --- DATA MOCKS ---
const MOCK_DATA = {
  healthy: {
    instabilityScore: 12,
    status: 'STABLE',
    narrative: "Autonomic load is low. Sleep and recovery are aligned with your 28-day baseline. Parasympathetic tone is dominant.",
    vitals: { hrv: 115, rhr: 48, resp: 14, temp: 98.2 },
    trends: { hrv: 'up', rhr: 'stable' },
    drivers: [
      { name: 'Deep Sleep', impact: -15, value: '1.5h' }, // Negative impact = lowers risk (good)
      { name: 'Training Load', impact: 5, value: 'High' },
      { name: 'Caffeine', impact: 2, value: 'Early' }
    ],
    drift: { metabolic: 'Low', cardio: 'Low', inflammation: 'Normal' },
    sleep: { deep: 1.8, rem: 2.1, light: 3.5, awake: 0.4 },
    labs: [
      { name: 'hs-CRP', value: '0.5', unit: 'mg/L', status: 'Optimal' },
      { name: 'Fasting Glucose', value: '85', unit: 'mg/dL', status: 'Optimal' },
      { name: 'HbA1c', value: '5.1', unit: '%', status: 'Optimal' }
    ]
  },
  risk: {
    instabilityScore: 84,
    status: 'VOLATILE',
    narrative: "Suppressed HRV and elevated resting HR vs your 28-day baseline suggest ongoing subclinical stress. Sympathetic overdrive detected.",
    vitals: { hrv: 22, rhr: 68, resp: 18, temp: 99.1 },
    trends: { hrv: 'down', rhr: 'up' },
    drivers: [
      { name: 'Deep Sleep Deficit', impact: 45, value: '0.4h' }, // Positive impact = increases risk (bad)
      { name: 'hs-CRP', impact: 32, value: '3.2mg/L' },
      { name: 'Late Caffeine', impact: 15, value: '9 PM' }
    ],
    drift: { metabolic: 'Moderate', cardio: 'Elevated', inflammation: 'Elevated' },
    sleep: { deep: 0.4, rem: 1.1, light: 4.2, awake: 1.5 },
    labs: [
      { name: 'hs-CRP', value: '3.2', unit: 'mg/L', status: 'High' },
      { name: 'Fasting Glucose', value: '104', unit: 'mg/dL', status: 'Elevated' },
      { name: 'HbA1c', value: '5.8', unit: '%', status: 'Borderline' }
    ]
  }
};

// --- CHART PRIMITIVES (SVG) ---
const MiniAreaChart = ({ data, color, height = 100 }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-hidden relative" style={{ height: `${height}%` }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M0,100 ${points} 100,100 Z`} fill={`url(#grad-${color})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
};

const SHAPBarChart = ({ drivers, onSelect }) => {
  const maxVal = Math.max(...drivers.map(d => Math.abs(d.impact)));
  
  return (
    <div className="flex flex-col gap-3 w-full">
      {drivers.map((d, i) => {
        const isNegative = d.impact < 0; // Negative impact lowers risk (Good)
        const width = (Math.abs(d.impact) / maxVal) * 100;
        const color = isNegative ? 'bg-emerald-500' : 'bg-rose-500';
        
        return (
          <div 
            key={i} 
            className="flex items-center gap-4 text-xs font-mono cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
            onClick={() => onSelect && onSelect(d)}
          >
            <div className="w-24 text-right text-slate-400 truncate">{d.name}</div>
            <div className="flex-1 h-6 bg-slate-900 rounded relative overflow-hidden flex items-center">
              <div className="absolute left-1/2 w-px h-full bg-slate-700 z-10" />
              <div 
                className={`h-4 rounded-sm ${color} transition-all duration-1000 ease-out`}
                style={{ 
                  width: `${width/2}%`, 
                  marginLeft: isNegative ? `${50 - (width/2)}%` : '50%',
                  opacity: 0.8
                }} 
              />
            </div>
            <div className="w-12 text-slate-300 tabular-nums text-right">
              {d.impact > 0 ? '+' : ''}{d.impact}
            </div>
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

// --- UI COMPONENTS ---
const BentoCard = ({ children, className = "", title, icon: Icon, delay = 0, colSpan = "col-span-1", rowSpan = "row-span-1", glowing = false, warning = false }) => (
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
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono group-hover:text-slate-300 transition-colors">
              {title}
            </span>
          )}
        </div>
        <div className={`h-1.5 w-1.5 rounded-full ${glowing ? 'bg-amber-500 shadow-[0_0_8px_2px_rgba(245,158,11,0.5)]' : warning ? 'bg-rose-500' : 'bg-slate-800 group-hover:bg-cyan-500'} transition-colors duration-300`} />
      </div>
    )}
    <div className="relative z-10 flex-1 flex flex-col min-h-0">
      {children}
    </div>
  </div>
);

const StatValue = ({ value, unit, size = "large", trend, trendVal, isRisk }) => (
  <div>
    <div className="flex items-baseline gap-1">
      <span className={`font-['Unbounded'] font-light tracking-tighter text-white ${size === "large" ? "text-4xl" : "text-2xl"}`}>
        {value}
      </span>
      {unit && <span className="text-xs font-mono text-slate-600 uppercase">{unit}</span>}
    </div>
    {trend && (
      <div className={`flex items-center gap-1 text-[10px] mt-1 font-mono uppercase tracking-wider ${isRisk ? 'text-amber-400' : 'text-emerald-400'}`}>
        <span>{trend === 'up' ? '▲' : '▼'}</span>
        <span>{trendVal}</span>
      </div>
    )}
  </div>
);

// --- SETTINGS / DATA SOURCES COMPONENTS ---
const LabUploadWizard = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const handleFileUpload = (e) => {
    const selectedFile = e.target?.files?.[0] || { name: 'lab_report_scan.pdf' };
    setFile(selectedFile);
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(2);
    }, 1500);
  };

  const handleCommit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onComplete();
    }, 1000);
  };

  return (
    <div className="w-full bg-black/20 rounded-xl border border-slate-800 overflow-hidden relative">
      <div className="h-1 w-full bg-slate-800">
        <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
      </div>
      <div className="p-6">
        {step === 1 && (
          <div className="text-center space-y-6 py-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto mb-4 relative group cursor-pointer hover:border-cyan-500/50 transition-colors">
              <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              {isProcessing && <div className="absolute inset-0 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Drop your lab report here</h3>
              <p className="text-xs text-slate-500 font-mono">PDF, image, or CSV — up to 10 MB</p>
            </div>
            
            <button 
              onClick={handleFileUpload}
              disabled={isProcessing}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold uppercase tracking-wider text-slate-300 transition-all"
            >
              {isProcessing ? 'Analyzing...' : 'Browse Files'}
            </button>
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
               {['Metabolic', 'Lipid Panel', 'Inflammation', 'CMP / CBC'].map(tag => (
                 <span key={tag} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-500 font-mono uppercase">{tag}</span>
               ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <File className="w-4 h-4 text-cyan-400" />
                   <span className="text-xs font-mono text-slate-300">{file?.name}</span>
                   <span className="text-[10px] bg-emerald-950/30 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded uppercase font-bold">Parsed</span>
                </div>
                <button onClick={() => setStep(1)} className="text-[10px] text-slate-500 hover:text-rose-400 underline">Discard</button>
             </div>
             <div className="overflow-hidden rounded border border-slate-800/50">
               <table className="w-full text-left text-[10px] font-mono">
                 <thead className="bg-slate-900/50 text-slate-500 uppercase">
                   <tr>
                     <th className="p-2">Marker</th>
                     <th className="p-2">Value</th>
                     <th className="p-2">Status</th>
                     <th className="p-2">Risk</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/30 text-slate-400">
                    <tr>
                      <td className="p-2 font-bold text-slate-300">hs-CRP</td>
                      <td className="p-2">3.2 mg/L</td>
                      <td className="p-2"><span className="bg-amber-950/30 text-amber-400 px-1.5 py-0.5 rounded">High</span></td>
                      <td className="p-2 text-rose-400">↑ Instability</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-300">Glucose</td>
                      <td className="p-2">104 mg/dL</td>
                      <td className="p-2"><span className="bg-amber-950/30 text-amber-400 px-1.5 py-0.5 rounded">Elevated</span></td>
                      <td className="p-2 text-rose-400">↑ Instability</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-slate-300">HbA1c</td>
                      <td className="p-2">5.8 %</td>
                      <td className="p-2"><span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Borderline</span></td>
                      <td className="p-2 text-slate-500">Neutral</td>
                    </tr>
                 </tbody>
               </table>
             </div>
             <div className="flex justify-end">
                <button 
                  onClick={() => setStep(3)}
                  className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  Confirm Data <ArrowRight size={14} />
                </button>
             </div>
             <p className="text-[9px] text-slate-600 font-mono text-center">Informational only, not diagnostic.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
             <div className="space-y-2">
               <h3 className="text-sm font-bold text-white uppercase tracking-wide">Commit to Timeline</h3>
               <p className="text-xs text-slate-500 font-mono">This will update your Instability Score baseline.</p>
             </div>
             <div className="space-y-3 bg-slate-900/30 p-4 rounded border border-slate-800">
                <div className="flex items-center gap-2">
                   <CheckSquare className="w-4 h-4 text-cyan-400" />
                   <span className="text-xs text-slate-300 font-mono">Include in calculation</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 flex items-center justify-center"><span className="block w-1.5 h-1.5 bg-slate-600 rounded-full"></span></div>
                   <span className="text-xs text-slate-400 font-mono">Date: <span className="text-white">Oct 24, 2023 (Detected)</span></span>
                </div>
             </div>
             <div className="flex gap-3">
                <button 
                  onClick={handleCommit}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-white text-black font-bold uppercase tracking-wider text-xs rounded hover:bg-cyan-50 transition-colors"
                >
                  {isProcessing ? 'Recalculating...' : 'Save & Recalculate'}
                </button>
                <button 
                  onClick={onCancel}
                  className="px-4 py-3 bg-transparent border border-slate-700 text-slate-400 font-bold uppercase tracking-wider text-xs rounded hover:bg-slate-900 hover:text-white transition-colors"
                >
                  Discard
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DataSourcesView = ({ userMode }) => {
  const [viewState, setViewState] = useState('demo');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    setViewState('demo');
  }, [userMode]);

  const handleUploadComplete = () => {
    setUploadSuccess(true);
    if (showUploadModal) {
       setShowUploadModal(false);
       setViewState('live-populated');
    } else {
       setViewState('live-populated'); 
    }
    setTimeout(() => setUploadSuccess(false), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-center gap-4 mb-8">
         <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">[ Dev Controls ]</span>
         <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
           {['demo', 'live-empty', 'live-populated'].map(s => (
             <button
               key={s}
               onClick={() => setViewState(s)}
               className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition-all ${viewState === s ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
             >
               {s.replace('-', ' ')}
             </button>
           ))}
         </div>
      </div>
      {uploadSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-full text-xs font-mono font-bold flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-4 fade-in">
           <CheckCircle size={14} /> Labs saved. View full history in Insights ? Labs.
        </div>
      )}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg relative">
             <button onClick={() => setShowUploadModal(false)} className="absolute -top-12 right-0 text-slate-400 hover:text-white"><X /></button>
             <LabUploadWizard onComplete={handleUploadComplete} onCancel={() => setShowUploadModal(false)} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <BentoCard colSpan="lg:col-span-3" title="Wearables & Devices" icon={Watch}>
           <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="space-y-2 max-w-md">
                 <h4 className="text-sm font-bold text-white">Passive Monitoring</h4>
                 <p className="text-xs text-slate-400 font-mono">Connect your wearables to enable high-fidelity multimodal monitoring. We support read-only sync for sleep, HRV, and activity data.</p>
              </div>
              <div className="flex flex-wrap gap-4 justify-center md:justify-end">
                  {['Oura', 'Whoop', 'Apple Health', 'Garmin', 'Samsung'].map(brand => (
                    <div key={brand} className="group relative flex flex-col items-center gap-2 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer w-24">
                        <div className="w-10 h-10 rounded-full bg-black border border-slate-700 flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-shadow">
                           {brand === 'Oura' || brand === 'Apple Health' ? <CheckCircle size={16} className="text-emerald-500" /> : <Smartphone size={16} className="text-slate-500 group-hover:text-cyan-400" />}
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{brand}</span>
                    </div>
                  ))}
              </div>
           </div>
        </BentoCard>

        {viewState === 'demo' && (
          <BentoCard colSpan="lg:col-span-2" title="Lab Reports & Biomarkers" icon={Microscope}>
             <div className="space-y-4">
                <div className="p-3 bg-slate-900/50 border border-slate-800 rounded flex items-start gap-3">
                   <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                   <div>
                      <div className="text-xs font-bold text-slate-200">Demo Mode � Upload disabled</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">Showing sample data for demonstration purposes.</div>
                   </div>
                </div>
                <div className="opacity-60 pointer-events-none">
                   <table className="w-full text-left text-[10px] font-mono mb-4">
                     <thead className="bg-slate-900/30 text-slate-500 uppercase">
                       <tr><th className="p-2">Marker</th><th className="p-2">Value</th><th className="p-2">Status</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800/30 text-slate-400">
                        <tr><td className="p-2">hs-CRP</td><td className="p-2">0.5</td><td className="p-2 text-emerald-400">Optimal</td></tr>
                        <tr><td className="p-2">Glucose</td><td className="p-2">85</td><td className="p-2 text-emerald-400">Optimal</td></tr>
                     </tbody>
                   </table>
                </div>
                <button disabled className="w-full py-3 bg-slate-800 border border-slate-700 text-slate-500 text-xs font-bold uppercase tracking-wider rounded cursor-not-allowed flex items-center justify-center gap-2">
                   <UploadCloud size={14} /> Upload Labs (Demo Mode)
                </button>
                <p className="text-[9px] text-slate-600 font-mono text-center pt-2 border-t border-slate-800/50">
                   This is sample data. In real mode you may upload lab reports to refine Instability calculations.
                </p>
             </div>
          </BentoCard>
        )}

        {viewState === 'live-empty' && (
           <BentoCard colSpan="lg:col-span-2" title="Lab Reports & Biomarkers" icon={Microscope}>
             <LabUploadWizard onComplete={handleUploadComplete} onCancel={() => {}} />
           </BentoCard>
        )}

        {viewState === 'live-populated' && (
           <BentoCard colSpan="lg:col-span-2" title="Lab Reports & Biomarkers" icon={Microscope}>
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h4 className="text-sm font-bold text-white mb-1">Latest Panel Integration</h4>
                    <p className="text-xs text-slate-400 font-mono">Latest biomarker data integrated into Instability & risk projections.</p>
                 </div>
                 <div className="px-2 py-1 bg-emerald-950/30 border border-emerald-900/50 rounded text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle size={10} /> Integrated
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Last Lab Event</div>
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                       <span className="text-white">Oct 24, 2023</span>
                       <span className="text-slate-400">Metabolic Panel + CRP</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                       <span className="text-white">Sep 12, 2023</span>
                       <span className="text-slate-400">Lipid Panel</span>
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <button 
                      onClick={() => setShowUploadModal(true)}
                      className="flex-1 py-3 bg-white text-black font-bold uppercase tracking-wider text-xs rounded hover:bg-cyan-50 transition-colors flex items-center justify-center gap-2"
                    >
                       <Plus size={14} /> Upload New Labs
                    </button>
                    <button className="px-4 py-3 bg-transparent border border-slate-700 text-slate-300 font-bold uppercase tracking-wider text-xs rounded hover:bg-slate-800 hover:text-white transition-colors">
                       Enter Manually
                    </button>
                 </div>
              </div>
           </BentoCard>
        )}

        <BentoCard title="Manual Entries & CSV" icon={FileText}>
           <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center opacity-50">
                 <FlaskConical className="w-6 h-6 text-slate-600" />
              </div>
              <div className="space-y-2">
                 <h4 className="text-xs font-bold text-slate-500 uppercase">Coming Soon</h4>
                 <p className="text-[10px] text-slate-600 font-mono px-4 leading-relaxed">
                    Structured manual biomarker input and CSV batch import. This will let researchers backfill historical panels.
                 </p>
              </div>
              <button disabled className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded cursor-not-allowed">
                 Open Manual Entry
              </button>
           </div>
        </BentoCard>
      </div>
    </div>
  );
};

// --- VIEWS ---
const DashboardView = ({ profile, data, onToggleCopilot, forecastSeries }) => {
  const isRisk = profile === 'risk';
  const chartColor = isRisk ? '#fbbf24' : '#22d3ee';
  // Use real forecast series if available, otherwise use mock data
  const chartData = forecastSeries && forecastSeries.length > 0
    ? forecastSeries.map((point: any) => Math.round((point.risk || 0) * 100))
    : (isRisk ? [45, 50, 65, 78, 82, 80, 85, 90, 88, 92, 85, 80] : [12, 15, 10, 14, 12, 18, 15, 12, 10, 14, 12, 15]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <BentoCard 
        colSpan="md:col-span-2 lg:col-span-3" 
        rowSpan="row-span-2" 
        title="Instability Index" 
        icon={Activity}
        delay={100}
        glowing={isRisk}
      >
        <div className="flex justify-between items-start w-full mb-4 relative z-20">
          <div className="flex items-center gap-2">
             <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border border-opacity-20 ${isRisk ? 'text-amber-400 border-amber-400 bg-amber-400/10' : 'text-cyan-400 border-cyan-400 bg-cyan-400/10'}`}>
               {data.status}
             </div>
          </div>
          <div className="text-right">
             <StatValue 
               value={data.instabilityScore} 
               unit="/100" 
               trend={isRisk ? 'up' : 'down'} 
               trendVal={isRisk ? '+42% Drift' : '-2% Stable'}
               isRisk={isRisk} 
             />
             <div className="text-[9px] text-slate-600 font-mono mt-1">vs 28-day baseline</div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-48 z-10 opacity-60">
           <MiniAreaChart data={chartData} color={chartColor} height={100} />
        </div>
      </BentoCard>

      <BentoCard colSpan="md:col-span-2 lg:col-span-3" title="Daily Briefing" icon={Brain} delay={150}>
        <div className="flex flex-col justify-between h-full">
          <p className="text-sm text-slate-300 leading-relaxed font-mono border-l-2 border-slate-700 pl-4 py-1">
            {data.narrative}
          </p>
          <div className="mt-4 flex gap-2">
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">Model Confidence: 94%</span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">Calibration: Optimal</span>
          </div>
        </div>
      </BentoCard>

      <BentoCard colSpan="md:col-span-2 lg:col-span-2" title="Biometric Telemetry" icon={Zap} delay={200}>
        <div className="grid grid-cols-2 gap-4 h-full">
          <div className="bg-slate-900/50 p-3 rounded border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-mono">HRV (rmssd)</span>
            <span className={`text-xl font-['Unbounded'] ${isRisk ? 'text-amber-400' : 'text-white'}`}>{data.vitals.hrv} <span className="text-[10px] text-slate-600">ms</span></span>
          </div>
          <div className="bg-slate-900/50 p-3 rounded border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-mono">RHR</span>
            <span className={`text-xl font-['Unbounded'] ${isRisk ? 'text-amber-400' : 'text-white'}`}>{data.vitals.rhr} <span className="text-[10px] text-slate-600">bpm</span></span>
          </div>
          <div className="bg-slate-900/50 p-3 rounded border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-mono">Resp Rate</span>
            <span className="text-xl font-['Unbounded'] text-white">{data.vitals.resp} <span className="text-[10px] text-slate-600">rpm</span></span>
          </div>
          <div className="bg-slate-900/50 p-3 rounded border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-mono">Skin Temp</span>
            <span className="text-xl font-['Unbounded'] text-white">{data.vitals.temp}° <span className="text-[10px] text-slate-600">F</span></span>
          </div>
        </div>
      </BentoCard>

      <BentoCard colSpan="md:col-span-2 lg:col-span-2" title="Top Contributors" icon={GitCommit} delay={250}>
        <div className="space-y-3 mt-2">
          {data.drivers.map((d, i) => (
             <div key={i} className="flex justify-between items-center text-xs">
               <span className="text-slate-400 font-mono">{d.name}</span>
               <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${d.impact > 0 ? 'bg-rose-950/30 text-rose-400 border border-rose-900' : 'bg-emerald-950/30 text-emerald-400 border border-emerald-900'}`}>
                 {d.impact > 0 ? '↑ Instability' : '↓ Instability'}
               </div>
             </div>
          ))}
        </div>
        <div className="mt-auto pt-4 text-[9px] text-slate-600 font-mono text-center">
          Based on SHAP feature attribution
        </div>
      </BentoCard>

      <BentoCard colSpan="md:col-span-4 lg:col-span-2" title="Subclinical Drift" icon={TrendingUp} delay={300} className={isRisk ? "border-amber-500/20 bg-amber-900/5" : ""}>
        <div className="space-y-4 h-full flex flex-col justify-center">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
             <span className="text-xs text-slate-400 font-mono">Metabolic</span>
             <span className={`text-xs font-bold font-mono ${data.drift.metabolic === 'Low' ? 'text-emerald-400' : 'text-amber-400'}`}>{data.drift.metabolic}</span>
          </div>
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
             <span className="text-xs text-slate-400 font-mono">Cardiovascular</span>
             <span className={`text-xs font-bold font-mono ${data.drift.cardio === 'Low' ? 'text-emerald-400' : 'text-amber-400'}`}>{data.drift.cardio}</span>
          </div>
          <div className="flex justify-between items-center">
             <span className="text-xs text-slate-400 font-mono">Inflammatory</span>
             <span className={`text-xs font-bold font-mono ${data.drift.inflammation === 'Normal' ? 'text-emerald-400' : 'text-rose-400'}`}>{data.drift.inflammation}</span>
          </div>
          <div className="mt-auto pt-2">
            <p className="text-[9px] text-slate-600 leading-tight">
              * Non-diagnostic projections. For informational and research use only. Not FDA cleared.
            </p>
          </div>
        </div>
      </BentoCard>

      <BentoCard title="Copilot Shortcuts" icon={MessageSquare} delay={320} colSpan="col-span-full md:col-span-2 lg:col-span-2">
        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
          <button onClick={onToggleCopilot} className="px-3 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors">
            Why did my risk change?
          </button>
          <button onClick={onToggleCopilot} className="px-3 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors">
            Explain today&apos;s drivers
          </button>
          <button onClick={onToggleCopilot} className="px-3 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors">
            How did sleep impact Instability?
          </button>
        </div>
        <p className="mt-3 text-[9px] text-slate-600">
          All answers are generated on synthetic demo data and are non-diagnostic.
        </p>
      </BentoCard>
    </div>
  );
};

const MultimodalView = ({ profile, data, trendsData }) => {
  const [tab, setTab] = useState('vitals');
  const TABS = ['vitals', 'sleep', 'labs', 'symptoms', 'devices'];
  
  // Get HRV trend from trends API if available
  const hrvTrend = trendsData?.series?.hrv_avg || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {TABS.map(t => (
          <button 
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-t-lg transition-all ${tab === t ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tab === 'vitals' && (
          <>
            <BentoCard colSpan="lg:col-span-2" title="HRV Trend (7-Day)" icon={Activity}>
              <div className="h-64 mt-4 relative">
                 <div className="absolute top-0 right-0 flex gap-4 text-[10px] font-mono">
                   <span className="text-cyan-400">● HRV</span>
                   <span className="text-slate-600">● Baseline</span>
                 </div>
                 <MiniAreaChart 
                   data={hrvTrend.length > 0 
                     ? hrvTrend.map((p: any) => p.y || 0).slice(-7)
                     : (profile === 'healthy' ? [110, 112, 115, 118, 114, 115, 116] : [45, 42, 38, 35, 30, 25, 22])
                   } 
                   color={profile === 'healthy' ? '#22d3ee' : '#f59e0b'} 
                   height={100} 
                 />
              </div>
            </BentoCard>
            <BentoCard title="Current Status" icon={Zap}>
              <div className="space-y-4 mt-2">
                <div>
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Resting Heart Rate</div>
                   <div className="text-2xl font-['Unbounded'] text-white">{data.vitals.rhr} <span className="text-sm text-slate-600">bpm</span></div>
                   <div className={`text-xs font-mono mt-1 ${profile === 'risk' ? 'text-amber-400' : 'text-emerald-400'}`}>{profile === 'risk' ? '▲ Elevated' : '✔ Optimal'}</div>
                </div>
                <hr className="border-slate-800" />
                <div>
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Body Temperature</div>
                   <div className="text-2xl font-['Unbounded'] text-white">{data.vitals.temp} <span className="text-sm text-slate-600">°F</span></div>
                   <div className={`text-xs font-mono mt-1 ${profile === 'risk' ? 'text-amber-400' : 'text-emerald-400'}`}>{profile === 'risk' ? '▲ Mild Elevation' : '✔ Stable'}</div>
                </div>
              </div>
            </BentoCard>
          </>
        )}

        {tab === 'sleep' && (
           <>
             <BentoCard colSpan="lg:col-span-2" title="Hypnogram Architecture" icon={Layers}>
               <div className="h-64 flex items-end gap-4 mt-4 px-4">
                 <div className="flex-1 flex flex-col gap-1 h-full justify-end">
                   <div className="w-full bg-indigo-500/80 rounded-sm relative group" style={{ height: `${data.sleep.deep * 10}%` }}>
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">Deep</span>
                   </div>
                   <div className="w-full bg-cyan-500/60 rounded-sm" style={{ height: `${data.sleep.rem * 10}%` }}></div>
                   <div className="w-full bg-slate-600/40 rounded-sm" style={{ height: `${data.sleep.light * 10}%` }}></div>
                   <div className="w-full bg-rose-500/40 rounded-sm" style={{ height: `${data.sleep.awake * 10}%` }}></div>
                   <div className="text-center text-[10px] font-mono text-slate-500 mt-2">Last Night</div>
                 </div>
                 <div className="flex-1 flex flex-col gap-1 h-full justify-end opacity-50 grayscale">
                    <div className="w-full bg-indigo-500/80 rounded-sm" style={{ height: '20%' }}></div>
                    <div className="w-full bg-cyan-500/60 rounded-sm" style={{ height: '25%' }}></div>
                    <div className="w-full bg-slate-600/40 rounded-sm" style={{ height: '40%' }}></div>
                    <div className="w-full bg-rose-500/40 rounded-sm" style={{ height: '5%' }}></div>
                    <div className="text-center text-[10px] font-mono text-slate-500 mt-2">Baseline</div>
                 </div>
               </div>
               <div className="flex justify-center gap-4 mt-6">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-mono"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> Deep</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-mono"><div className="w-2 h-2 bg-cyan-500 rounded-full"></div> REM</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-mono"><div className="w-2 h-2 bg-slate-600 rounded-full"></div> Light</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-mono"><div className="w-2 h-2 bg-rose-500 rounded-full"></div> Awake</div>
               </div>
             </BentoCard>
             <BentoCard title="Analysis" icon={Brain}>
               <p className="text-sm text-slate-300 leading-relaxed font-mono">
                 {profile === 'healthy' 
                   ? "Deep sleep is within ±10% of your 14-day trailing baseline. Recovery processes are optimal."
                   : "Deep sleep reduced ~60% vs your normal baseline. This acute deprivation is a primary driver of today's Instability Score."
                 }
               </p>
             </BentoCard>
           </>
        )}

        {tab === 'labs' && (
          <BentoCard colSpan="lg:col-span-3" title="Biomarker Panel (Most Recent)" icon={Microscope}>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-xs font-mono">
                 <thead>
                   <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                     <th className="py-3 px-4">Marker</th>
                     <th className="py-3 px-4">Value</th>
                     <th className="py-3 px-4">Ref Range</th>
                     <th className="py-3 px-4">Status</th>
                     <th className="py-3 px-4">Risk Contribution</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800/50">
                   {data.labs.map((lab, i) => (
                     <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                       <td className="py-3 px-4 font-bold text-slate-300">{lab.name}</td>
                       <td className="py-3 px-4 text-white">{lab.value} <span className="text-slate-600 text-[10px]">{lab.unit}</span></td>
                       <td className="py-3 px-4 text-slate-500">Variable</td>
                       <td className="py-3 px-4">
                         <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${lab.status === 'Optimal' ? 'bg-emerald-950 text-emerald-400' : lab.status === 'High' || lab.status === 'Elevated' ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                           {lab.status}
                         </span>
                       </td>
                       <td className="py-3 px-4">
                         <div className={`w-24 h-1 rounded-full ${lab.status === 'Optimal' ? 'bg-slate-800' : 'bg-amber-900'}`}>
                           <div className={`h-full rounded-full ${lab.status === 'Optimal' ? 'bg-emerald-500 w-[10%]' : 'bg-amber-500 w-[70%]'}`}></div>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             <div className="mt-4 p-3 bg-slate-900/50 rounded border border-slate-800 text-[10px] text-slate-500 font-mono">
               DISCLAIMER: Lab data shown for demonstration purposes. Not a medical diagnosis. Consult a physician for interpretation.
             </div>
          </BentoCard>
        )}

        {tab === 'symptoms' && (
          <BentoCard colSpan="lg:col-span-3" title="Self-Reported Signals" icon={Stethoscope}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded bg-slate-900/30 border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Today's Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile === 'healthy' 
                      ? <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">No Symptoms Reported</span>
                      : <>
                          <span className="px-3 py-1 rounded-full bg-amber-900/20 text-amber-400 border border-amber-900/50 text-xs">Daytime Fatigue</span>
                          <span className="px-3 py-1 rounded-full bg-amber-900/20 text-amber-400 border border-amber-900/50 text-xs">Brain Fog</span>
                          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs">Mild Joint Pain</span>
                        </>
                    }
                  </div>
                </div>
                <div className="p-4 rounded bg-slate-900/30 border border-slate-800 flex items-center justify-center text-slate-600 text-xs font-mono uppercase">
                   Timeline View Coming Soon
                </div>
             </div>
          </BentoCard>
        )}
        
        {tab === 'devices' && (
          <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-4 opacity-100">
               <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-slate-700"><Watch size={18} className="text-white" /></div>
               <div>
                 <div className="text-sm font-bold text-white">Oura Ring</div>
                 <div className="text-[10px] text-emerald-400 uppercase tracking-wider flex items-center gap-1"><CheckCircle size={10} /> Connected (Demo)</div>
               </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-4 opacity-60">
               <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-slate-700"><Activity size={18} className="text-white" /></div>
               <div>
                 <div className="text-sm font-bold text-white">Apple Health</div>
                 <div className="text-[10px] text-slate-500 uppercase tracking-wider">Sync Paused</div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ExplainabilityView = ({ profile, data }) => {
  const [selectedDriver, setSelectedDriver] = useState(data.drivers[0]);

  useEffect(() => {
    setSelectedDriver(data.drivers[0]);
  }, [data]);

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <BentoCard colSpan="lg:col-span-2" title="Local Feature Attribution (SHAP)" icon={GitCommit}>
         <div className="mb-6">
           <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
             This chart visualizes exactly which features pushed your Instability Score up or down today. 
             <span className="text-emerald-400"> Green</span> factors provided stability, while <span className="text-rose-400">Red</span> factors introduced volatility.
           </p>
         </div>
         <SHAPBarChart drivers={data.drivers} onSelect={setSelectedDriver} />
      </BentoCard>

      <div className="space-y-6">
        {selectedDriver ? (
            <BentoCard title="Driver Detail" icon={Search}>
              <div className="space-y-3 text-xs font-mono text-slate-300">
                <div className="text-slate-500 uppercase tracking-widest text-[10px]">
                  Selected Driver
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold">{selectedDriver.name}</span>
                  <span className="text-slate-400">{selectedDriver.value}</span>
                </div>
                <p className="text-slate-400">
                  Compared to your baseline, <span className="text-slate-200">{selectedDriver.name}</span> is
                  {selectedDriver.impact > 0 ? ' increasing' : ' reducing'} today&apos;s Instability Score by
                  <span className="text-slate-200"> {Math.abs(selectedDriver.impact)}</span> points.
                </p>
                <p className="text-[10px] text-slate-500 border-t border-slate-800 pt-2">
                  Non-diagnostic. This attribution is for explanatory and research purposes only.
                </p>
              </div>
            </BentoCard>
        ) : (
            <BentoCard title="Driver Detail" icon={Search}>
              <div className="h-full flex flex-col justify-center items-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                  <ScanLine className="text-cyan-400" />
                </div>
                <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest">Select a driver on the left</p>
              </div>
            </BentoCard>
        )}

        <BentoCard title="Model Hygiene" icon={Shield}>
           <div className="space-y-4">
             <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
               <span className="text-slate-400">Calibration (Brier Score)</span>
               <span className="font-mono text-emerald-400">0.13 (Optimal)</span>
             </div>
             <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
               <span className="text-slate-400">Data Completeness</span>
               <span className="font-mono text-white">94%</span>
             </div>
             <div className="flex justify-between items-center text-xs">
               <span className="text-slate-400">Volatility Index</span>
               <span className={`font-mono ${profile === 'risk' ? 'text-amber-400' : 'text-slate-300'}`}>{profile === 'risk' ? 'Moderate' : 'Low'}</span>
             </div>
           </div>
        </BentoCard>
      </div>
    </div>
  );
};

const EvidenceView = () => (
  <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <BentoCard title="System Configuration" icon={Settings}>
         <div className="space-y-4 font-mono text-xs">
           <div className="flex justify-between text-slate-400">
             <span>Engine Version</span>
             <span className="text-white">phase3-v1-wes</span>
           </div>
           <div className="flex justify-between text-slate-400">
             <span>Last Updated</span>
             <span className="text-white">2023-10-24 04:00 UTC</span>
           </div>
           <div className="flex justify-between text-slate-400">
             <span>Environment</span>
             <span className="text-cyan-400">DEMO / SANDBOX</span>
           </div>
         </div>
      </BentoCard>
      
      <BentoCard title="Performance Metrics (Internal)" icon={BarChart2}>
         <div className="space-y-4 font-mono text-xs">
           <div className="flex justify-between text-slate-400">
             <span>AUROC (Validation)</span>
             <span className="text-white">0.88</span>
           </div>
           <div className="flex justify-between text-slate-400">
             <span>PR-AUC</span>
             <span className="text-white">0.72</span>
           </div>
           <div className="mt-4 p-2 bg-amber-900/10 border border-amber-900/50 rounded text-amber-500 text-[9px] leading-tight">
             Internal evaluation metrics only. Not clinically validated for diagnosis.
           </div>
         </div>
      </BentoCard>
    </div>

    <BentoCard colSpan="col-span-full" title="Audit Trail (Immutable)" icon={Database}>
       <div className="overflow-hidden rounded-lg border border-slate-800">
         <table className="w-full text-left text-[10px] font-mono">
           <thead className="bg-slate-900/80 text-slate-500 uppercase">
             <tr>
               <th className="p-3">Timestamp</th>
               <th className="p-3">Actor</th>
               <th className="p-3">Event</th>
               <th className="p-3">Details</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-800 text-slate-400">
             <tr>
               <td className="p-3 text-slate-500">2023-10-25 08:00:01</td>
               <td className="p-3 text-cyan-500">System</td>
               <td className="p-3">INGEST_WEARABLE</td>
               <td className="p-3">Received payload from Oura API (34kb)</td>
             </tr>
             <tr>
               <td className="p-3 text-slate-500">2023-10-25 08:00:05</td>
               <td className="p-3 text-emerald-500">InferenceEngine</td>
               <td className="p-3">RISK_RECALC</td>
               <td className="p-3">Instability Score updated. Latency: 120ms</td>
             </tr>
             <tr>
               <td className="p-3 text-slate-500">2023-10-25 09:14:22</td>
               <td className="p-3 text-white">User_804</td>
               <td className="p-3">VIEW_EXPLAINABILITY</td>
               <td className="p-3">Accessed SHAP detail panel</td>
             </tr>
           </tbody>
         </table>
       </div>
    </BentoCard>
  </div>
);

const CopilotDrawer = ({ isOpen, onClose, profile, data }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#02040a] border-l border-slate-800 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-900/20 border border-cyan-500/30 flex items-center justify-center">
            <MessageSquare size={16} className="text-cyan-400" />
          </div>
          <span className="font-rajdhani font-bold text-lg text-white">SubHealth Copilot</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex gap-4">
           <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">U</div>
           <div className="bg-slate-800/50 rounded-2xl rounded-tl-none p-4 border border-slate-700 text-sm text-slate-300">
             Why did my risk score change today?
           </div>
        </div>

        <div className="flex gap-4 flex-row-reverse">
           <div className="w-8 h-8 rounded-full bg-cyan-900/30 border border-cyan-500/30 flex-shrink-0 flex items-center justify-center"><Brain size={14} className="text-cyan-400" /></div>
           <div className="bg-cyan-950/10 rounded-2xl rounded-tr-none p-4 border border-cyan-900/30 text-sm text-slate-300">
             <p className="mb-2">Your Instability Score moved to <span className="font-bold text-white">{data.instabilityScore}</span> ({data.status}) primarily due to these factors:</p>
             <ul className="list-disc pl-4 space-y-1 mb-3 text-slate-400 text-xs">
               {data.drivers.slice(0,2).map((d,i) => (
                 <li key={i}>{d.name} ({d.value})</li>
               ))}
             </ul>
             <p className="text-xs text-slate-500 italic border-t border-cyan-900/30 pt-2 mt-2">
               Note: These patterns indicate increased physiological instability but do not constitute a medical diagnosis.
             </p>
           </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/30">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Ask a follow up..." 
            disabled
            className="w-full bg-black/50 border border-slate-700 rounded-lg py-3 pl-4 pr-10 text-sm text-slate-500 cursor-not-allowed" 
          />
          <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        </div>
        <div className="text-[9px] text-center text-slate-600 mt-2 font-mono uppercase">AI output may vary. Research Prototype.</div>
      </div>
    </div>
  );
};

// --- ANIMATED GRID BACKGROUND ---
const AnimatedGridBackground = () => {
  const canvasRef = React.useRef(null);
  const animationFrameRef = React.useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const config = {
      gridSpacing: 50,
      mouseRadius: 250,
      stiffness: 0.03,
      damping: 0.9,
      drift: 0.5
    };

    let width, height;
    let particles = [];
    const mouse = { x: null, y: null };

    class Node {
      constructor(originX, originY) {
        this.originX = originX;
        this.originY = originY;
        this.x = originX;
        this.y = originY;
        this.vx = 0;
        this.vy = 0;
        this.phase = Math.random() * Math.PI * 2;
      }

      update() {
        let dx = this.originX - this.x;
        let dy = this.originY - this.y;
        
        let ax = dx * config.stiffness;
        let ay = dy * config.stiffness;
        
        if (mouse.x != null) {
          let mDx = mouse.x - this.x;
          let mDy = mouse.y - this.y;
          let dist = Math.sqrt(mDx*mDx + mDy*mDy);
          
          if (dist < config.mouseRadius) {
            let force = (config.mouseRadius - dist) / config.mouseRadius;
            let pushX = -(mDx / dist) * force * 5;
            let pushY = -(mDy / dist) * force * 5;
            
            ax += pushX;
            ay += pushY;
          }
        }

        this.phase += 0.02;
        ax += Math.cos(this.phase) * config.drift * 0.05;
        ay += Math.sin(this.phase) * config.drift * 0.05;

        this.vx += ax;
        this.vy += ay;
        
        this.vx *= config.damping;
        this.vy *= config.damping;
        
        this.x += this.vx;
        this.y += this.vy;
      }

      draw() {
        ctx.fillStyle = '#22d3ee';
        
        let displacement = Math.sqrt(Math.pow(this.x - this.originX, 2) + Math.pow(this.y - this.originY, 2));
        let alpha = 0.3 + (displacement / 20);
        if(alpha > 1) alpha = 1;
        
        ctx.globalAlpha = alpha;
        ctx.fillRect(this.x - 1, this.y - 1, 2, 2);
        ctx.globalAlpha = 1;
      }
    }

    function init() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles = [];

      const cols = Math.ceil(width / config.gridSpacing);
      const rows = Math.ceil(height / config.gridSpacing);

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * config.gridSpacing;
          const y = j * config.gridSpacing;
          particles.push(new Node(x, y));
        }
      }
    }

    function drawConnections() {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        let p1 = particles[i];
        
        for (let j = i + 1; j < particles.length; j++) {
          let p2 = particles[j];
          
          if (Math.abs(p1.originX - p2.originX) > config.gridSpacing) continue;
          if (Math.abs(p1.originY - p2.originY) > config.gridSpacing) continue;

          let dx = p1.x - p2.x;
          let dy = p1.y - p2.y;
          let dist = dx*dx + dy*dy;

          if (dist < 4500) { 
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      }
      ctx.stroke();
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => p.update());

      drawConnections();
      
      particles.forEach(p => p.draw());

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    init();
    animate();

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
        style={{ background: '#020617' }}
      />
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1] bg-[radial-gradient(circle_at_center,_transparent_20%,_rgba(2,6,23,0.8)_90%)]"></div>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[2] opacity-15 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0),_rgba(255,255,255,0)_50%,_rgba(0,0,0,0.2)_50%,_rgba(0,0,0,0.2))] bg-[length:100%_4px]"></div>
    </>
  );
};

// --- LANDING & AUTH (PRESERVED) ---
const LandingPage = ({ onNavigateAuth }) => {
  const [deepSleepHours, setDeepSleepHours] = useState(7.2);
  
  const { score, status, statusColor, narrative, ringColor } = useMemo(() => {
    let calculatedScore = 0;
    let currentStatus = 'STABLE';
    let color = 'text-cyan-400';
    let ring = '#22d3ee';
    let text = '';

    if (deepSleepHours >= 7.0) {
      calculatedScore = Math.round(18 - ((deepSleepHours - 7) * 5)); 
      currentStatus = 'STABLE';
      color = 'text-cyan-400';
      ring = '#22d3ee';
      text = "Autonomic load remains low. Instability Score stays in the stable band, indicating homeostasis is preserved.";
    } else if (deepSleepHours >= 6.0) {
      calculatedScore = Math.round(42 - ((deepSleepHours - 6) * 17));
      currentStatus = 'ELEVATED';
      color = 'text-amber-400';
      ring = '#fbbf24';
      text = "Reduced deep sleep is increasing sympathetic tone. Instability Score is trending upward, suggesting early drift.";
    } else {
      calculatedScore = Math.round(85 - ((deepSleepHours - 3) * 13));
      currentStatus = 'VOLATILE';
      color = 'text-rose-500';
      ring = '#f43f5e';
      text = "Severe deep sleep loss is driving acute autonomic stress. Instability Score has entered the volatile band.";
    }

    return {
      score: Math.max(0, Math.min(100, calculatedScore)),
      status: currentStatus,
      statusColor: color,
      ringColor: ring,
      narrative: text
    };
  }, [deepSleepHours]);

  const InstabilityRing = ({ size = "large" }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const dimensions = size === "large" ? "w-64 h-64 md:w-80 md:h-80" : "w-48 h-48";
    const strokeWidth = size === "large" ? 4 : 3;

    return (
      <div className={`relative flex items-center justify-center ${dimensions} transition-all duration-500`}>
        <div className={`absolute inset-0 rounded-full opacity-20 blur-2xl transition-colors duration-700`} style={{ backgroundColor: ringColor }}></div>
        <div className="absolute inset-0 border border-slate-800/50 rounded-full animate-[spin_10s_linear_infinite]">
           <div className="absolute top-0 left-1/2 w-1 h-1 bg-slate-600 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        <svg className="absolute inset-0 transform -rotate-90 drop-shadow-2xl" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="#0f172a" strokeWidth={strokeWidth} fill="transparent" />
          <circle cx="50" cy="50" r={radius} stroke={ringColor} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
        </svg>
        <div className="relative flex flex-col items-center justify-center z-10 text-center">
          <span className="text-xs font-mono text-slate-500 tracking-widest mb-1 uppercase">Instability</span>
          <span className={`font-rajdhani font-bold text-5xl md:text-6xl tracking-tight tabular-nums transition-colors duration-300 text-white`}>
            {score}%
          </span>
          <span className={`mt-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border border-opacity-20 ${statusColor} border-current bg-opacity-10 bg-current transition-colors duration-300`}>{status}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full min-h-screen bg-[#02040a] text-slate-300 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
        <AnimatedGridBackground />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/60 bg-[#02040a]/80 backdrop-blur-md h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-500">
              <span className="font-rajdhani font-bold text-lg text-white">S</span>
            </div>
            <span className="font-rajdhani font-semibold text-lg tracking-wide text-slate-100">SubHealth<span className="text-cyan-400">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button className="text-xs font-mono font-medium text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest">Research</button>
            <button className="text-xs font-mono font-medium text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest">Technology</button>
          </div>
          <button onClick={onNavigateAuth} className="relative px-5 py-2 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-slate-200 uppercase tracking-wider hover:bg-slate-800 hover:border-slate-500 transition-all duration-300 shadow-lg">
            Client Login
          </button>
        </div>
      </nav>

      <div className="relative z-10 pt-32 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-4 items-center">
          <div className="space-y-8 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">Public Access Terminal v2.0</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-rajdhani font-bold leading-[1.1] text-white tracking-tight">
              Detect <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-cyan-600">Instability</span><br />
              Before Diagnosis.
            </h1>

            <p className="text-lg text-slate-400 leading-relaxed font-light border-l-2 border-slate-800 pl-6">
              SubHealthAI builds a digital twin of your autonomic nervous system to detect 
              <span className="text-slate-200 font-medium"> sub-clinical drift</span> days before symptoms appear.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button onClick={onNavigateAuth} className="group relative px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-cyan-50 transition-all duration-300 flex items-center justify-center gap-2">
                <span>Initialize Bio-Twin</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition-all duration-300">
                View Technical Brief
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Demo */}
        <div className="relative bg-slate-900/30 border border-slate-800/50 rounded-2xl p-8 lg:p-12 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="inline-block px-2 py-0.5 bg-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-widest rounded">Interactive Demo</div>
                <h2 className="text-3xl md:text-4xl font-rajdhani font-bold text-white">See the invisible.</h2>
                <p className="text-slate-400">Adjust deep sleep duration to see how autonomic drift changes the Instability Score.</p>
              </div>
              <div className="p-6 bg-black/40 border border-slate-800 rounded-xl space-y-6 shadow-inner">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-mono text-slate-400 uppercase tracking-wider">Deep Sleep Duration</label>
                  <div className="text-2xl font-rajdhani font-bold text-white tabular-nums">{deepSleepHours.toFixed(1)} <span className="text-sm text-slate-500 font-normal">hrs</span></div>
                </div>
                <div className="relative h-8 flex items-center">
                  <input type="range" min="3.0" max="9.0" step="0.1" value={deepSleepHours} onChange={(e) => setDeepSleepHours(parseFloat(e.target.value))} className="absolute w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-200 [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-slate-900 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-600 uppercase tracking-widest"><span>Deprived</span><span>Optimal</span></div>
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-start gap-8">
              <div className="flex items-center gap-8">
                <InstabilityRing size="small" />
                <div className="hidden sm:block w-px h-24 bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>
                <div className="hidden sm:block space-y-1">
                    <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Assessment</div>
                    <div className={`text-2xl font-rajdhani font-bold ${statusColor}`}>{status}</div>
                    <div className="text-xs text-slate-600">Confidence: 98.4%</div>
                </div>
              </div>
              <div className={`p-4 border-l-2 ${deepSleepHours >= 7 ? 'border-cyan-500/50 bg-cyan-950/10' : deepSleepHours >= 6 ? 'border-amber-500/50 bg-amber-950/10' : 'border-rose-500/50 bg-rose-950/10' } transition-colors duration-500`}>
                <h4 className="text-xs font-mono text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-2"><Zap className="w-3 h-3" /> System Analysis</h4>
                <p className="text-slate-300 text-sm leading-relaxed max-w-md transition-all duration-300 ease-in-out">{narrative}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Strip */}
        <div className="border-t border-slate-800/50 pt-12 pb-8">
           <div className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-16">
              <span className="text-sm font-mono text-slate-500 uppercase tracking-[0.2em]">How SubHealthAI Thinks:</span>
              <div className="flex flex-wrap gap-12">
                 <div className="flex items-center gap-4 group">
                    <div className="p-3 rounded-lg bg-[#0f172a] border border-slate-800 text-cyan-500 group-hover:border-cyan-500/50 transition-colors shadow-lg">
                       <ScanLine className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="text-sm font-bold text-slate-200 font-rajdhani">Isolation Forest</div>
                       <div className="text-xs text-slate-500">Anomaly detection</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 group">
                    <div className="p-3 rounded-lg bg-[#0f172a] border border-slate-800 text-cyan-500 group-hover:border-cyan-500/50 transition-colors shadow-lg">
                       <Brain className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="text-sm font-bold text-slate-200 font-rajdhani">GRU Sequence Model</div>
                       <div className="text-xs text-slate-500">Baseline learning</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 group">
                    <div className="p-3 rounded-lg bg-[#0f172a] border border-slate-800 text-cyan-500 group-hover:border-cyan-500/50 transition-colors shadow-lg">
                       <Globe className="w-5 h-5" />
                    </div>
                    <div>
                       <div className="text-sm font-bold text-slate-200 font-rajdhani">SHAP Explainer</div>
                       <div className="text-xs text-slate-500">Driver attribution</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const handleSubmit = () => {
    if (userEmail || userId) {
      onLogin(userEmail || userId);
    }
  };

  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <AnimatedGridBackground />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 animate-[fadeInUp_0.5s_ease-out]">
        
        {/* Main Auth Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl mb-6">
           <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                <Lock className="w-5 h-5 text-cyan-400" />
             </div>
             <h2 className="text-2xl font-['Unbounded'] font-bold text-white mb-2">Secure Gateway</h2>
             <p className="text-slate-500 text-xs font-mono uppercase tracking-wide">Restricted Access // Bio-Twin v2.4</p>
           </div>

           {/* Tab Switcher */}
           <div className="flex bg-black/40 p-1 rounded-lg mb-6 border border-white/5">
             <button 
               onClick={() => setMode('login')}
               className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${mode === 'login' ? 'bg-slate-800 text-white shadow-sm border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Identity Login
             </button>
             <button 
               onClick={() => setMode('signup')}
               className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${mode === 'signup' ? 'bg-slate-800 text-white shadow-sm border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Create Protocol
             </button>
           </div>

           <div className="space-y-4">
             {/* User ID/Email Field */}
             <div className="space-y-1.5">
               <label className="text-[9px] font-mono text-slate-400 uppercase tracking-widest ml-1">Bio-ID (Email or UUID)</label>
               <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="text" 
                    value={userEmail || userId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes('@')) {
                        setUserEmail(val);
                        setUserId('');
                      } else {
                        setUserId(val);
                        setUserEmail('');
                      }
                    }}
                    className="w-full bg-black/40 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-700 font-mono" 
                    placeholder="researcher@subhealth.ai or user-uuid" 
                  />
               </div>
             </div>

             {/* Password Field */}
             <div className="space-y-1.5">
               <label className="text-[9px] font-mono text-slate-400 uppercase tracking-widest ml-1">Passphrase</label>
               <div className="relative group">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="password" 
                    className="w-full bg-black/40 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-700 font-mono" 
                    placeholder="••••••••••••" 
                  />
               </div>
             </div>

             {mode === 'signup' && (
               <div className="space-y-1.5 animate-[fadeInUp_0.3s_ease-out]">
                 <label className="text-[9px] font-mono text-slate-400 uppercase tracking-widest ml-1">Confirm Passphrase</label>
                 <div className="relative group">
                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                      type="password" 
                      className="w-full bg-black/40 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-700 font-mono" 
                      placeholder="••••••••••••" 
                    />
                 </div>
               </div>
             )}

             <button 
               onClick={handleSubmit}
               className="w-full py-3 bg-white hover:bg-cyan-50 text-black font-['Unbounded'] font-bold text-xs uppercase tracking-wider rounded-lg transition-all mt-4 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
             >
                {mode === 'login' ? 'Authenticate Session' : 'Initialize New Twin'}
             </button>
           </div>
        </div>

        {/* Reviewer Bypass Section */}
        <div className="relative">
           <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
           <div className="relative flex justify-center mb-6"><span className="bg-[#02040a] px-3 text-[9px] text-slate-600 font-mono uppercase tracking-widest border border-slate-800 rounded-full">Reviewer Bypass</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4 opacity-80 hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onLogin('demo-healthy')}
              className="py-3 px-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-all duration-300 text-[9px] font-mono uppercase tracking-widest flex flex-col items-center gap-2 group"
            >
              <ShieldCheck size={16} className="group-hover:scale-110 transition-transform" />
              <span>Demo: Nominal</span>
            </button>
            <button 
              onClick={() => onLogin('demo-risk')}
              className="py-3 px-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-amber-500/30 hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-all duration-300 text-[9px] font-mono uppercase tracking-widest flex flex-col items-center gap-2 group"
            >
              <Activity size={16} className="group-hover:scale-110 transition-transform" />
              <span>Demo: High Drift</span>
            </button>
        </div>

        <p className="text-center mt-8 text-[9px] text-slate-700 font-mono">
           Authorized Personnel Only. All Access Logged.
        </p>
      </div>
    </div>
  );
}

// --- DASHBOARD SHELL ---
const DashboardShell = ({ children, activePage, setActivePage, onLogout, onToggleCopilot, userId }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'insights', icon: TrendingUp, label: 'Insights' },
    { id: 'shap', icon: GitCommit, label: 'Causal Drivers' },
    { id: 'evidence', icon: Database, label: 'Evidence' },
    { id: 'settings', icon: Settings, label: 'Data Sources' },
  ];

  return (
    <div className="h-screen w-full bg-[#02040a] text-slate-300 flex overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
      
      {/* Sidebar */}
      <div className="w-20 h-full border-r border-white/5 bg-[#02040a]/80 backdrop-blur-xl flex flex-col items-center py-8 z-50 hidden md:flex">
        <div className="mb-10">
          <div className="w-10 h-10 rounded bg-slate-900 border border-white/10 flex items-center justify-center">
            <span className="font-['Unbounded'] font-bold text-cyan-400">S</span>
          </div>
        </div>
        <div className="flex flex-col gap-6 flex-1 w-full items-center">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`p-3 rounded-xl transition-all duration-300 group relative ${activePage === item.id ? 'bg-slate-900 text-cyan-400 border border-white/10 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}
            >
              <item.icon size={20} strokeWidth={1.5} />
              <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 border border-white/10 text-slate-300 text-[10px] font-['Unbounded'] uppercase rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-auto">
           <button onClick={onLogout} className="p-3 rounded hover:bg-slate-900 text-slate-600 hover:text-rose-400 transition-colors"><LogOut size={18} /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Top Bar */}
        <div className="h-20 w-full border-b border-white/5 bg-[#02040a]/80 backdrop-blur-md flex items-center justify-between px-8">
           <div className="flex flex-col">
             <h1 className="text-lg font-['Unbounded'] font-semibold text-white tracking-tight uppercase">{navItems.find(i => i.id === activePage)?.label}</h1>
             <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">SubClinical Intelligence Engine v2.4</span>
             <span className="text-[9px] text-amber-400 font-mono tracking-wider uppercase">Demo Environment · Synthetic data · Non-diagnostic prototype</span>
           </div>
           <div className="flex items-center gap-6">
             {userId && userId !== 'demo-healthy' && userId !== 'demo-risk' && (
               <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded border border-white/5">
                 <User size={12} className="text-cyan-400" />
                 <span className="text-[10px] text-slate-400 font-mono tracking-widest truncate max-w-[120px]">{userId.slice(0, 8)}...</span>
               </div>
             )}
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded border border-white/5 group hover:border-white/10 transition-colors cursor-pointer">
               <Search size={12} className="text-slate-500 group-hover:text-slate-300" />
               <span className="text-[10px] text-slate-600 font-mono group-hover:text-slate-400 tracking-widest">CMD+K</span>
             </div>
             <button onClick={onToggleCopilot} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded flex items-center gap-2 hover:bg-slate-700 hover:text-white transition-colors">
                <MessageSquare size={14} className="text-cyan-400" />
                Ask Copilot
             </button>
             <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center relative">
                <Bell size={14} className="text-slate-400" />
                <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full"></div>
             </div>
           </div>
        </div>

        {/* Page Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 pb-24">
           {children}
        </div>
      </main>
    </div>
  );
};

// --- DATA TRANSFORMATION ---
const transformApiDataToDashboard = (dash, exp, risk) => {
  if (!dash || !exp) return null;

  const riskScore = risk?.forecast_risk ?? dash?.forecast?.latest?.risk ?? 0;
  const instabilityScore = Math.round(riskScore * 100);
  
  // Determine status based on risk score
  let status = 'STABLE';
  if (instabilityScore >= 70) status = 'VOLATILE';
  else if (instabilityScore >= 40) status = 'ELEVATED';
  
  // Get narrative from explain API or generate from risk
  const narrative = exp?.rationale || 
    (instabilityScore >= 70 
      ? "Suppressed HRV and elevated resting HR vs your 28-day baseline suggest ongoing subclinical stress. Sympathetic overdrive detected."
      : "Autonomic load is low. Sleep and recovery are aligned with your 28-day baseline. Parasympathetic tone is dominant.");

  // Get vitals from metric snapshot or dashboard anomaly data
  const anomalies = dash?.anomaly?.items || [];
  const rhrAnomaly = anomalies.find(a => a.signal === 'rhr');
  const hrvAnomaly = anomalies.find(a => a.signal === 'hrv');
  const sleepAnomaly = anomalies.find(a => a.signal === 'sleep');
  
  // Get real metrics from metric_snapshot API if available
  const hrvItem = metricSnapshot?.items?.hrv_avg;
  const rhrItem = metricSnapshot?.items?.rhr;
  const sleepItem = metricSnapshot?.items?.sleep_minutes;
  
  const vitals = {
    hrv: hrvItem?.today ? Math.round(hrvItem.today) : (hrvAnomaly?.z ? Math.round(50 + (hrvAnomaly.z * 15)) : 50),
    rhr: rhrItem?.today ? Math.round(rhrItem.today) : (rhrAnomaly?.z ? Math.round(60 + (rhrAnomaly.z * 5)) : 60),
    resp: 14, // Not in metrics, using default
    temp: 98.2 // Not in metrics, using default
  };

  // Transform SHAP contributors to drivers
  const drivers = (exp?.top_contributors || []).slice(0, 3).map(c => {
    const featureNames = {
      'rhr': 'Resting Heart Rate',
      'hrv_avg': 'HRV',
      'sleep_minutes': 'Deep Sleep',
      'steps': 'Activity Level',
      'stress_proxy': 'Stress Proxy'
    };
    return {
      name: featureNames[c.feature] || c.feature,
      impact: Math.round(c.shap_value * 100),
      value: c.feature === 'hrv_avg' ? `${vitals.hrv}ms` : 
             c.feature === 'rhr' ? `${vitals.rhr}bpm` :
             c.feature === 'sleep_minutes' ? `${Math.round((sleepItem?.today || 420) / 60 * 10) / 10}h` :
             c.feature === 'steps' ? `${metricSnapshot?.items?.steps?.today || 'N/A'}` : 'N/A'
    };
  });

  // Determine drift levels
  const drift = {
    metabolic: instabilityScore >= 60 ? 'Moderate' : 'Low',
    cardio: instabilityScore >= 50 ? 'Elevated' : 'Low',
    inflammation: instabilityScore >= 70 ? 'Elevated' : 'Normal'
  };

  // Sleep data (from metrics or estimated)
  const totalSleepMinutes = sleepItem?.today || (sleepAnomaly?.z ? (420 + (sleepAnomaly.z * 60)) : 420);
  const totalSleepHours = totalSleepMinutes / 60;
  // Estimate sleep stages (rough approximation)
  const sleep = {
    deep: Math.max(0.4, Math.min(2.5, totalSleepHours * 0.25)),
    rem: Math.max(0.5, Math.min(2.5, totalSleepHours * 0.20)),
    light: Math.max(2.0, totalSleepHours * 0.50),
    awake: Math.max(0.2, totalSleepHours * 0.05)
  };

  // Labs (would come from separate API)
  const labs = [
    { name: 'hs-CRP', value: instabilityScore >= 70 ? '3.2' : '0.5', unit: 'mg/L', status: instabilityScore >= 70 ? 'High' : 'Optimal' },
    { name: 'Fasting Glucose', value: instabilityScore >= 70 ? '104' : '85', unit: 'mg/dL', status: instabilityScore >= 70 ? 'Elevated' : 'Optimal' },
    { name: 'HbA1c', value: instabilityScore >= 70 ? '5.8' : '5.1', unit: '%', status: instabilityScore >= 70 ? 'Borderline' : 'Optimal' }
  ];

  return {
    instabilityScore,
    status,
    narrative,
    vitals,
    trends: { hrv: hrvAnomaly?.z > 0 ? 'down' : 'up', rhr: rhrAnomaly?.z > 0 ? 'up' : 'stable' },
    drivers,
    drift,
    sleep,
    labs
  };
};

// --- APP ORCHESTRATOR ---
export default function App() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState('landing'); // 'landing' | 'auth' | 'dashboard'
  const [userId, setUserId] = useState<string | null>(null);
  const [userMode, setUserMode] = useState<'healthy' | 'risk' | 'demo-healthy' | 'demo-risk' | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [version] = useState('phase3-v1-wes');

  // Get user from URL params if available
  useEffect(() => {
    const urlUser = searchParams?.get('user');
    if (urlUser && !userId) {
      setUserId(urlUser);
      setView('dashboard');
    }
  }, [searchParams, userId]);

  // Fetch real data when user is set
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const shouldFetch = Boolean(userId && userId !== 'demo-healthy' && userId !== 'demo-risk');
  
  const { data: dash, error: dashError } = useSWR(
    shouldFetch ? `/api/dashboard?user=${encodeURIComponent(userId || '')}&version=${encodeURIComponent(version)}` : null,
    fetcher
  );

  const { data: exp, error: expError } = useSWR(
    shouldFetch ? `/api/explain?user=${encodeURIComponent(userId || '')}&version=${encodeURIComponent(version)}` : null,
    fetcher
  );

  const { data: riskData } = useSWR(
    shouldFetch ? `/api/risk?user=${encodeURIComponent(userId || '')}&version=${encodeURIComponent(version)}` : null,
    fetcher
  );

  const { data: metricSnapshot } = useSWR(
    shouldFetch ? `/api/metric_snapshot?user=${encodeURIComponent(userId || '')}` : null,
    fetcher
  );

  const { data: trendsData } = useSWR(
    shouldFetch ? `/api/trends?user=${encodeURIComponent(userId || '')}&days=7` : null,
    fetcher
  );

  const loading = shouldFetch ? (!dash || !exp) : false;
  const error = dashError || expError;

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;600;700&family=Space+Mono:wght@400;700&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const handleLogin = (userIdentifier: string) => {
    if (userIdentifier === 'demo-healthy' || userIdentifier === 'demo-risk') {
      setUserMode(userIdentifier);
      setUserId(null);
      setView('dashboard');
    } else {
      setUserId(userIdentifier);
      setUserMode(null);
      // Update URL with user param
      const url = new URL(window.location.href);
      url.searchParams.set('user', userIdentifier);
      router.push(url.toString());
      setView('dashboard');
    }
  };

  // Determine current data source
  const currentData = useMemo(() => {
    if (userMode === 'demo-healthy' || userMode === 'demo-risk') {
      return MOCK_DATA[userMode === 'demo-healthy' ? 'healthy' : 'risk'];
    }
    
    if (userId && dash && exp) {
      const transformed = transformApiDataToDashboard(dash, exp, riskData);
      if (transformed) return transformed;
    }
    
    // Fallback to healthy mock data
    return MOCK_DATA.healthy;
  }, [userMode, userId, dash, exp, riskData]);

  const profile = useMemo(() => {
    if (userMode === 'demo-risk') return 'risk';
    if (userMode === 'demo-healthy') return 'healthy';
    if (currentData?.instabilityScore >= 70) return 'risk';
    return 'healthy';
  }, [userMode, currentData]);

  return (
    <>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      
      {view === 'landing' && <LandingPage onNavigateAuth={() => setView('auth')} />}
      
      {view === 'auth' && <AuthScreen onLogin={handleLogin} />}
      
      {view === 'dashboard' && (
        <>
          <DashboardShell 
            activePage={activePage} 
            setActivePage={setActivePage} 
            onLogout={() => {
              setView('landing');
              setUserId(null);
              setUserMode(null);
              router.push('/');
            }}
            onToggleCopilot={() => setIsCopilotOpen(true)}
            userId={userId}
          >
            {loading && !currentData && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-slate-400 font-mono text-sm">Loading bio-twin data...</p>
                </div>
              </div>
            )}
            
            {error && !currentData && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4 p-6 bg-rose-950/20 border border-rose-900/50 rounded-xl">
                  <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
                  <p className="text-rose-400 font-mono text-sm">Error loading data: {error.message || 'Unknown error'}</p>
                  <button 
                    onClick={() => handleLogin('demo-healthy')}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-mono uppercase"
                  >
                    Use Demo Mode
                  </button>
                </div>
              </div>
            )}
            
            {currentData && !loading && (
              <>
                {activePage === 'dashboard' && <DashboardView profile={profile} data={currentData} forecastSeries={dash?.forecast?.series} onToggleCopilot={() => setIsCopilotOpen(true)} />}
                {activePage === 'insights' && <MultimodalView profile={profile} data={currentData} trendsData={trendsData} />}
                {activePage === 'shap' && <ExplainabilityView profile={profile} data={currentData} />}
                {activePage === 'evidence' && <EvidenceView />}
                {activePage === 'settings' && <DataSourcesView userMode={profile} />}
              </>
            )}
          </DashboardShell>
          
          {currentData && (
            <CopilotDrawer 
              isOpen={isCopilotOpen} 
              onClose={() => setIsCopilotOpen(false)} 
              profile={profile} 
              data={currentData} 
            />
          )}
        </>
      )}
    </>
  );
}
