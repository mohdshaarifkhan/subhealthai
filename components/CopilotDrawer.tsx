"use client";

import React from 'react';
import { X, MessageSquare, Brain, ArrowRight } from 'lucide-react';

type CopilotDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  profile: 'healthy' | 'risk';
  data: any;
};

export function CopilotDrawer({ isOpen, onClose, profile, data }: CopilotDrawerProps) {
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
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">U</div>
          <div className="bg-slate-800/50 rounded-2xl rounded-tl-none p-4 border border-slate-700 text-sm text-slate-300">
            Why did my risk score change today?
          </div>
        </div>

        <div className="flex gap-4 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-cyan-900/30 border border-cyan-500/30 flex-shrink-0 flex items-center justify-center">
            <Brain size={14} className="text-cyan-400" />
          </div>
          <div className="bg-cyan-950/10 rounded-2xl rounded-tr-none p-4 border border-cyan-900/30 text-sm text-slate-300">
            <p className="mb-2">
              Your Instability Score moved to <span className="font-bold text-white">{data?.instabilityScore ?? 0}</span> ({data?.status ?? 'STABLE'}) primarily due to these factors:
            </p>
            <ul className="list-disc pl-4 space-y-1 mb-3 text-slate-400 text-xs">
              {data?.drivers?.slice(0, 2).map((d: any, i: number) => (
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
}

