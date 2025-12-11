"use client";

import React, { useState } from 'react';
import { Watch, Microscope, FileText, UploadCloud, CheckCircle, Smartphone, AlertTriangle, X, FlaskConical } from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { LabUploadWizard } from '@/components/Dashboard/LabUploadWizard';
import useSWR from 'swr';

type DataSourcesViewProps = {
  userMode: string;
  isRealUser: boolean;
  currentEmail?: string;
  userId?: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const DataSourcesView = ({ userMode, isRealUser, currentEmail, userId }: DataSourcesViewProps) => {
  // Simple mode: DEMO or LIVE (based on isRealUser)
  const mode = isRealUser ? 'LIVE' : 'DEMO';
  
  // Modal state management
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Fetch labs data if in LIVE mode
  const shouldFetchLabs = mode === 'LIVE' && userId && userId !== 'demo-healthy' && userId !== 'demo-risk';
  const { data: labsData } = useSWR(
    shouldFetchLabs ? `/api/insights/labs?user_id=${userId}` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const labs = labsData?.labs || [];
  const hasLabs = labs.length > 0;

  const handleUploadComplete = () => {
    setUploadSuccess(true);
    setShowUploadModal(false);
    setTimeout(() => setUploadSuccess(false), 4000);
    // SWR will auto-refetch labs data
  };

  // Helper to format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Get unique panel types from labs
  const getPanelTypes = () => {
    const systems = new Set(labs.map((lab: any) => lab.system).filter(Boolean));
    return Array.from(systems).join(', ') || 'Metabolic Panel';
  };

  // Get latest lab date
  const getLatestLabDate = () => {
    if (labs.length === 0) return null;
    return labs[0]?.date || null;
  };

  // Handler for showing info modal
  const handleShowInfoModal = () => {
    setShowInfoModal(true);
  };

  return (
    <>
      {/* Success notification */}
      {uploadSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-full text-xs font-mono font-bold flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-4 fade-in">
          <CheckCircle size={14} /> Labs saved. View full history in Insights → Labs.
        </div>
      )}

      {/* Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg relative">
            <button onClick={() => setShowUploadModal(false)} className="absolute -top-12 right-0 text-slate-400 hover:text-white">
              <X />
            </button>
            <LabUploadWizard 
              onComplete={handleUploadComplete} 
              onCancel={() => setShowUploadModal(false)} 
              userId={userId}
            />
          </div>
        </div>
      )}

      {/* Info Modal for Labs Upload Disabled */}
      {showInfoModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" 
          onClick={(e) => {
            e.stopPropagation();
            setShowInfoModal(false);
          }}
        >
          <div 
            className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-950/30 border border-amber-900/50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-['Unbounded'] font-bold text-white">Upload Disabled</h3>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfoModal(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed font-mono">
                Labs upload is disabled in this demo build. Stored-only pipeline will ship in v1.1.
              </p>
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfoModal(false);
                  }}
                  className="w-full px-4 py-2.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-500/60 text-xs font-bold uppercase tracking-wider rounded font-mono transition-all"
                  type="button"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-7xl mx-auto animate-in fade-in duration-500 w-full">
        {/* SECTION 1: Wearables & Devices */}
        <BentoCard colSpan="md:col-span-4 lg:col-span-6" title="WEARABLES & DEVICES" icon={Watch}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2 max-w-md">
              <h4 className="text-sm font-bold text-white">Passive Monitoring</h4>
              <p className="text-xs text-slate-400 font-mono">
                {isRealUser 
                  ? (currentEmail === "shaarif@subhealth.ai"
                    ? "Samsung Health (wearable + phone) data ingested via manual export (early access). Sync is read-only."
                    : "Wearable data synced from connected devices. Sync is read-only.")
                  : "We support read-only sync for sleep, HRV, and activity data. This demo uses synthetic Oura + Apple data."}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center md:justify-end">
              {(isRealUser 
                ? ['Samsung Health', 'Whoop (beta)', 'Apple Health (planned)']
                : ['Oura', 'Whoop', 'Apple Health', 'Garmin', 'Samsung']
              ).map(brand => {
                const isConnectedReal = isRealUser && brand === 'Samsung Health';
                const isConnectedDemo = !isRealUser && (brand === 'Oura' || brand === 'Apple Health');
                const showCheck = isConnectedReal || isConnectedDemo;

                return (
                  <div key={brand} className="group relative flex flex-col items-center gap-2 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer w-24">
                    <div className="w-10 h-10 rounded-full bg-black border border-slate-700 flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-shadow">
                      {showCheck ? (
                        <CheckCircle size={16} className="text-emerald-500" />
                      ) : (
                        <Smartphone size={16} className="text-slate-500 group-hover:text-cyan-400" />
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{brand}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </BentoCard>

        {/* SECTION 2: Lab Reports & Biomarkers */}
        <BentoCard colSpan="md:col-span-4 lg:col-span-4" title="LAB REPORTS & BIOMARKERS" icon={Microscope}>
          {mode === 'DEMO' ? (
            // DEMO MODE: Show sample biomarkers table with disabled banner
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/20 border border-amber-900/50 rounded flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-amber-400">Demo Mode — Upload disabled. Showing sample data.</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">This is sample data for demonstration purposes only.</div>
                </div>
              </div>
              
              <div className="opacity-60 pointer-events-none">
                <table className="w-full text-left text-[10px] font-mono mb-4">
                  <thead className="bg-slate-900/30 text-slate-500 uppercase">
                    <tr>
                      <th className="p-2">Marker</th>
                      <th className="p-2">Value</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 text-slate-400">
                    <tr>
                      <td className="p-2">hs-CRP</td>
                      <td className="p-2">0.5 mg/L</td>
                      <td className="p-2 text-emerald-400">Optimal</td>
                    </tr>
                    <tr>
                      <td className="p-2">Glucose</td>
                      <td className="p-2">85 mg/dL</td>
                      <td className="p-2 text-emerald-400">Optimal</td>
                    </tr>
                    <tr>
                      <td className="p-2">HbA1c</td>
                      <td className="p-2">5.2 %</td>
                      <td className="p-2 text-emerald-400">Optimal</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="opacity-50 pointer-events-none">
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
                  <UploadCloud className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-xs font-mono text-slate-500 mb-4">Upload Lab Report (PDF, image, CSV — up to 10MB)</p>
                  <div className="flex gap-3 justify-center">
                    <button disabled className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-500 text-xs font-bold uppercase tracking-wider rounded cursor-not-allowed">
                      UPLOAD NEW LABS
                    </button>
                    <button disabled className="px-4 py-2 bg-transparent border border-slate-700 text-slate-500 text-xs font-bold uppercase tracking-wider rounded cursor-not-allowed">
                      ENTER MANUALLY
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : mode === 'LIVE' && !hasLabs ? (
            // LIVE MODE + No labs: Show message and upload UI
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-300 font-mono">
                  No lab data uploaded yet.
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  Upload lab reports to improve Instability Score projections.
                </p>
              </div>

              {/* Universal Upload Box */}
              <div className="space-y-3">
                <p className="text-[10px] font-mono text-slate-500 text-center italic">
                  Early access prototype – upload and parsing may be limited.
                </p>
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-colors">
                  <UploadCloud className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-xs font-mono text-slate-400 mb-4">Upload Lab Report (PDF, image, CSV — up to 10MB)</p>
                  <div className="flex gap-3 justify-center">
                    <button 
                      type="button"
                      onClick={handleShowInfoModal}
                      className="px-6 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-500/60 text-xs font-bold uppercase tracking-wider rounded font-mono transition-all"
                    >
                      UPLOAD NEW LABS
                    </button>
                    <button 
                      type="button"
                      onClick={handleShowInfoModal}
                      className="px-4 py-2 bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-bold uppercase tracking-wider rounded font-mono transition-all"
                    >
                      ENTER MANUALLY
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // LIVE MODE + Labs exist: Show latest panel card + upload box below
            <div className="space-y-6">
              {/* Latest Panel Integration Card */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Latest Panel Integration</h4>
                  <p className="text-xs text-slate-400 font-mono">Latest biomarker data integrated into Instability & risk projections.</p>
                </div>
                <div className="px-2 py-1 bg-emerald-950/30 border border-emerald-900/50 rounded text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle size={10} /> INTEGRATED
                </div>
              </div>

              <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Last Lab Event</div>
                {getLatestLabDate() && (
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white">{formatDate(getLatestLabDate()!)}</span>
                    <span className="text-slate-400">{getPanelTypes()}</span>
                  </div>
                )}
              </div>

              {/* Universal Upload Box (always visible in LIVE mode) */}
              <div className="space-y-3">
                <p className="text-[10px] font-mono text-slate-500 text-center italic">
                  Early access prototype – upload and parsing may be limited.
                </p>
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-colors">
                  <UploadCloud className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-xs font-mono text-slate-400 mb-4">Upload Lab Report (PDF, image, CSV — up to 10MB)</p>
                  <div className="flex gap-3 justify-center">
                    <button 
                      type="button"
                      onClick={handleShowInfoModal}
                      className="px-6 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-500/60 text-xs font-bold uppercase tracking-wider rounded font-mono transition-all"
                    >
                      UPLOAD NEW LABS
                    </button>
                    <button 
                      type="button"
                      onClick={handleShowInfoModal}
                      className="px-4 py-2 bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-bold uppercase tracking-wider rounded font-mono transition-all"
                    >
                      ENTER MANUALLY
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </BentoCard>

        {/* SECTION 3: Manual Entries & CSV */}
        <BentoCard colSpan="md:col-span-4 lg:col-span-2" title="MANUAL ENTRIES & CSV" icon={FileText}>
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
            <button disabled className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded cursor-not-allowed font-mono">
              OPEN MANUAL ENTRY
            </button>
          </div>
        </BentoCard>
      </div>
    </>
  );
};
