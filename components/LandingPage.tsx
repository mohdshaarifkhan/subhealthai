"use client";

import React, { useState, useMemo } from 'react';
import { ChevronRight, ScanLine, Brain, Globe, Zap } from 'lucide-react';
import { AnimatedGridBackground } from '@/components/AnimatedGridBackground';
import { TechnicalBrief } from '@/components/TechnicalBrief';
import { ResearchBrief } from '@/components/ResearchBrief';
import { TechnologyBrief } from '@/components/TechnologyBrief';

type LandingPageProps = {
  onNavigateAuth: () => void;
};

export function LandingPage({ onNavigateAuth }: LandingPageProps) {
  const [deepSleepHours, setDeepSleepHours] = useState(7.2);
  const [showTechnicalBrief, setShowTechnicalBrief] = useState(false);
  const [showResearchBrief, setShowResearchBrief] = useState(false);
  const [showTechnologyBrief, setShowTechnologyBrief] = useState(false);
  
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

  const InstabilityRing = ({ size = "large" }: { size?: "large" | "small" }) => {
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
            <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-500 overflow-hidden">
              <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="scale-75">
                <circle cx="100" cy="100" r="90" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4"/>
                <path d="M40 100 C 70 100, 90 100, 160 100" stroke="#f8fafc" strokeWidth="8" strokeLinecap="round"/>
                <path d="M40 100 C 70 100, 90 100, 160 60" stroke="#06b6d4" strokeWidth="8" strokeLinecap="round" strokeDasharray="1 24"/>
                <circle cx="160" cy="60" r="6" fill="#fbbf24"/>
              </svg>
            </div>
            <span className="font-rajdhani font-semibold text-lg tracking-wide text-slate-100">SubHealth<span className="text-cyan-400">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setShowResearchBrief(true)}
              className="text-xs font-mono font-medium text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest"
            >
              Research
            </button>
            <button 
              onClick={() => setShowTechnologyBrief(true)}
              className="text-xs font-mono font-medium text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest"
            >
              Technology
            </button>
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
              <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">Public Access Terminal v1.0</span>
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
              <button 
                onClick={() => setShowTechnicalBrief(true)}
                className="px-8 py-4 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition-all duration-300"
              >
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

        {/* Footer */}
        <div className="border-t border-slate-800/50 pt-8 pb-12">
          <p className="text-xs font-mono text-slate-500 text-center">
            SubHealthAI is a non-diagnostic research and wellness system. It is not a medical device.
          </p>
        </div>
      </div>

      {/* Technical Brief Modal */}
      <TechnicalBrief 
        isOpen={showTechnicalBrief} 
        onClose={() => setShowTechnicalBrief(false)} 
      />

      {/* Research Brief Modal */}
      <ResearchBrief 
        isOpen={showResearchBrief} 
        onClose={() => setShowResearchBrief(false)} 
      />

      {/* Technology Brief Modal */}
      <TechnologyBrief 
        isOpen={showTechnologyBrief} 
        onClose={() => setShowTechnologyBrief(false)} 
      />
    </div>
  );
}

