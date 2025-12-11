"use client";

import React, { useState } from 'react';
import { UploadCloud, File, ArrowRight, CheckSquare } from 'lucide-react';

type LabUploadWizardProps = {
  onComplete: () => void;
  onCancel: () => void;
  userId?: string | null;
};

export const LabUploadWizard = ({ onComplete, onCancel, userId }: LabUploadWizardProps) => {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<any>(null);
  
  const handleFileUpload = (e: any) => {
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

