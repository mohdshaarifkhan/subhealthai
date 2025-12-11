"use client";

import React, { useState } from 'react';
import { Activity, Zap, Layers, Brain, Microscope, Stethoscope, Watch, CheckCircle, Smartphone, UploadCloud } from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { MiniAreaChart } from '@/components/ui/MiniAreaChart';
import { formatNumber } from '@/lib/utils/dashboardUtils';
import type { DashboardViewData } from '@/lib/dashboardViewData';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type MultimodalViewProps = {
  profile: 'healthy' | 'risk';
  data: DashboardViewData;
  trendsData?: any;
  isDemo: boolean;
  isRealUser: boolean;
  currentEmail?: string;
  userId?: string | null;
};

export const MultimodalView = ({ profile, data, trendsData, isDemo, isRealUser, currentEmail, userId }: MultimodalViewProps) => {
  const [tab, setTab] = useState('vitals');
  const TABS = ['vitals', 'sleep', 'labs', 'symptoms', 'devices'];
  
  // Determine if we should fetch data (skip for demo users or if no userId)
  const shouldFetch = userId && userId !== 'demo-healthy' && userId !== 'demo-risk';
  const userParam = userId ? `user_id=${userId}` : '';
  
  // Fetch data from insights API routes
  const { data: vitalsData } = useSWR(
    shouldFetch ? `/api/insights/vitals?${userParam}` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
  
  const { data: sleepData } = useSWR(
    shouldFetch ? `/api/insights/sleep?${userParam}` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
  
  const { data: labsData, isLoading: labsLoading, error: labsError } = useSWR(
    shouldFetch ? `/api/insights/labs?${userParam}` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
  
  const { data: symptomsData } = useSWR(
    shouldFetch ? `/api/insights/symptoms?${userParam}` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
  
  const { data: devicesData } = useSWR(
    shouldFetch ? `/api/insights/devices?${userParam}` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
  
  // Use API data if available, otherwise fall back to props data or demo data
  const hrvTrend = vitalsData?.trend || trendsData?.series?.hrv_avg || [];
  const currentVitals = vitalsData?.current || { rhr: data.vitals.rhr, hrv: data.vitals.hrv };
  const sleepTrend = sleepData?.trend || [];
  // For labs: if we're fetching and data is undefined, it's loading. If data exists, use it (even if empty array).
  // If not fetching (demo or no userId), use fallback data.
  const labsList = shouldFetch 
    ? (labsData !== undefined ? (labsData?.labs || []) : [])
    : (isDemo ? (data.labs || []) : []);
  const symptomsSnapshot = symptomsData?.snapshot || null;
  const devicesList = devicesData?.devices || [];

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
              <div className="h-64 mt-4 relative pb-3">
                 <div className="absolute top-0 right-0 flex gap-4 text-[10px] font-mono" style={{ opacity: 0.65 }}>
                   <span className="text-cyan-400">● HRV</span>
                   <span className="text-slate-500">● Baseline</span>
                 </div>
                 <div className="mt-6 pb-3">
                   <MiniAreaChart 
                     data={hrvTrend.length > 0 
                       ? hrvTrend.map((p: any) => p.hrv || p.y || 0).slice(-7)
                       : (isDemo ? (profile === 'healthy' ? [110, 112, 115, 118, 114, 115, 116] : [45, 42, 38, 35, 30, 25, 22]) : [])
                     } 
                     color={profile === 'healthy' ? '#22d3ee' : '#f59e0b'} 
                     height={100} 
                   />
                 </div>
              </div>
            </BentoCard>
            <BentoCard title="Current Status" icon={Zap}>
              <div className="space-y-5 mt-2">
                <div className="flex flex-col justify-center">
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Resting Heart Rate</div>
                   <div className="text-2xl font-['Unbounded'] text-white">{formatNumber(currentVitals.rhr || data.vitals.rhr, 0)} <span className="text-sm text-slate-600">bpm</span></div>
                   <div className="mt-1.5 w-fit">
                     <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider inline-flex items-center whitespace-nowrap ${profile === 'risk' ? 'bg-rose-950/20 text-rose-400 border border-rose-900/50' : 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/50'}`}>
                       {profile === 'risk' ? '▲ ELEVATED' : '✔ Optimal'}
                     </span>
                   </div>
                </div>
                <hr className="border-slate-800 my-2" />
                <div className="flex flex-col justify-center">
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">HRV (RMSSD)</div>
                   <div className="text-2xl font-['Unbounded'] text-white">{formatNumber(currentVitals.hrv || data.vitals.hrv, 0)} <span className="text-sm text-slate-600">ms</span></div>
                   <div className="mt-1.5 w-fit">
                     <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider inline-flex items-center whitespace-nowrap ${profile === 'risk' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/50' : 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/50'}`}>
                       {profile === 'risk' ? '▼ REDUCED' : '✔ Stable'}
                     </span>
                   </div>
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
                   <div className="w-full bg-cyan-500/70 rounded-sm" style={{ height: `${data.sleep.rem * 10}%` }}></div>
                   <div className="w-full bg-slate-500/50 rounded-sm" style={{ height: `${data.sleep.light * 10}%` }}></div>
                   <div className="w-full bg-rose-500/40 rounded-sm" style={{ height: `${data.sleep.awake * 10}%` }}></div>
                   <div className="text-center text-[10px] font-mono text-slate-500 mt-2">Last Night</div>
                 </div>
                 <div className="flex-1 flex flex-col gap-1 h-full justify-end opacity-50 grayscale">
                    <div className="w-full bg-indigo-500/80 rounded-sm" style={{ height: `${data.sleep.deep * 10}%` }}></div>
                    <div className="w-full bg-cyan-500/60 rounded-sm" style={{ height: `${data.sleep.rem * 10}%` }}></div>
                    <div className="w-full bg-slate-600/40 rounded-sm" style={{ height: `${data.sleep.light * 10}%` }}></div>
                    <div className="w-full bg-rose-500/40 rounded-sm" style={{ height: `${data.sleep.awake * 10}%` }}></div>
                    <div className="text-center text-[10px] font-mono text-slate-500 mt-2">Baseline</div>
                 </div>
               </div>
               <div className="flex justify-center gap-5 mt-6">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-mono"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> Deep</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-mono"><div className="w-2 h-2 bg-cyan-500 rounded-full"></div> REM</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-mono"><div className="w-2 h-2 bg-slate-500 rounded-full"></div> Light</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-mono"><div className="w-2 h-2 bg-rose-500 rounded-full"></div> Awake</div>
               </div>
             </BentoCard>
             <BentoCard title="Analysis" icon={Brain}>
               <div className="border-b border-slate-800 pb-3 mb-4">
                 <h3 className="text-[12px] uppercase tracking-wider text-[#6F7A8A] font-mono">Sleep Quality Assessment</h3>
               </div>
               <p className="text-sm text-slate-300 leading-relaxed font-mono max-w-[85%]">
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
                   {labsList.length > 0 ? (
                     labsList.map((lab: any, i: number) => {
                       const labName = lab.test_name || lab.name || 'Unknown';
                       const labValue = lab.value || 'N/A';
                       const labUnit = lab.unit || '';
                       const labFlag = lab.flag || 'Normal';
                       const status = labFlag === 'Normal' || labFlag === 'NORMAL' ? 'Optimal' : (labFlag === 'HIGH' || labFlag === 'LOW' ? 'Elevated' : 'Optimal');
                       const valueStr = typeof labValue === 'number' ? labValue.toFixed(1) : String(labValue);
                       const hasPercent = labUnit.includes('%');
                       const displayValue = hasPercent ? valueStr.replace(/\s*%/, '') + '%' : `${valueStr} ${labUnit}`.trim();
                       
                       return (
                         <tr key={i} className="hover:bg-slate-800/20 transition-colors h-14">
                           <td className="py-4 px-4 font-bold text-slate-300">{labName}</td>
                           <td className="py-4 px-4 text-white">{displayValue}</td>
                           <td className="py-4 px-4 text-slate-400" style={{ opacity: 0.4 }}>{lab.system || 'Variable'}</td>
                           <td className="py-4 px-4">
                             <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${status === 'Optimal' ? 'bg-emerald-950 text-emerald-400' : status === 'Elevated' ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                               {status}
                             </span>
                           </td>
                           <td className="py-4 px-4">
                             <div className={`w-24 h-1 rounded-full ${status === 'Optimal' ? 'bg-slate-800' : 'bg-amber-900'}`}>
                               <div className={`h-full rounded-full ${status === 'Optimal' ? 'bg-emerald-500 w-[10%]' : 'bg-rose-500 w-[70%]'}`}></div>
                             </div>
                           </td>
                         </tr>
                       );
                     })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs font-mono">
                        {shouldFetch && labsData === undefined && labsLoading 
                          ? 'Loading lab data...' 
                          : (labsError 
                            ? 'Error loading lab data' 
                            : 'No lab data available')}
                      </td>
                    </tr>
                  )}
                 </tbody>
               </table>
             </div>
             <div className="mt-4 p-3 bg-slate-900/50 rounded border border-slate-800 text-[9px] text-slate-600 font-mono">
               DISCLAIMER: Lab data shown for demonstration purposes. Not a medical diagnosis. Consult a physician for interpretation.
             </div>
          </BentoCard>
        )}

        {tab === 'symptoms' && (
          <BentoCard colSpan="lg:col-span-3" title="Self-Reported Signals" icon={Stethoscope}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded bg-slate-900/30 border border-slate-800">
                  <h4 className="text-[12px] uppercase tracking-wider text-[#6F7A8A] font-mono mb-3">Recent Symptoms</h4>
                  <div className="flex flex-wrap gap-2">
                    {symptomsSnapshot ? (
                      symptomsSnapshot.symptoms ? (
                        (Array.isArray(symptomsSnapshot.symptoms) ? symptomsSnapshot.symptoms : [symptomsSnapshot.symptoms]).map((symptom: string, i: number) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-amber-900/20 text-amber-400 border border-amber-900/50 text-xs">
                            {symptom}
                          </span>
                        ))
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">No Symptoms Reported</span>
                      )
                    ) : profile === 'healthy' ? (
                      <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">No Symptoms Reported</span>
                    ) : (
                      <>
                        <span className="px-3 py-1 rounded-full bg-amber-900/20 text-amber-400 border border-amber-900/50 text-xs">Daytime Fatigue</span>
                        <span className="px-3 py-1 rounded-full bg-amber-900/20 text-amber-400 border border-amber-900/50 text-xs">Brain Fog</span>
                        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs">Mild Joint Pain</span>
                      </>
                    )}
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
            {devicesList.length > 0 ? (
              devicesList.map((device: any, i: number) => {
                const isConnected = device.status === 'connected' || device.status === 'active';
                const iconMap: Record<string, any> = {
                  'samsung': Watch,
                  'whoop': Activity,
                  'apple': Smartphone,
                  'oura': Watch,
                };
                const Icon = iconMap[device.provider?.toLowerCase()] || Watch;
                
                return (
                  <div key={i} className={`p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-4 transition-all hover:bg-slate-900/60 hover:brightness-105 max-w-sm ${isConnected ? 'opacity-100' : 'opacity-60'}`}>
                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-slate-700 flex-shrink-0">
                      <Icon size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white">{device.device_name || device.provider || 'Unknown Device'}</div>
                      <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${isConnected ? 'bg-emerald-950/20 text-emerald-400/90 border border-emerald-900/50' : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'}`}>
                        {isConnected && <CheckCircle size={10} />}
                        {isConnected ? 'Connected' : (device.status || 'Not Connected')}
                      </div>
                      {device.last_sync_at && (
                        <div className="text-[9px] text-slate-600 font-mono mt-1">
                          Last sync: {new Date(device.last_sync_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : isRealUser ? (
              <>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-4 opacity-100">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-slate-700"><Watch size={18} className="text-white" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Samsung Health</div>
                    <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-950/20 text-emerald-400/90 border border-emerald-900/50 inline-flex items-center gap-1">
                      <CheckCircle size={10} /> 
                      {currentEmail === "shaarif@subhealth.ai" 
                        ? "Connected (Early Access)" 
                        : "Connected"}
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-4 opacity-60">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-slate-700"><Activity size={18} className="text-white" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Whoop (Beta)</div>
                    <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800/50 text-slate-500 border border-slate-700/50 inline-flex">Coming Soon</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-4 opacity-60">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-slate-700"><Smartphone size={18} className="text-white" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Apple Health</div>
                    <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800/50 text-slate-500 border border-slate-700/50 inline-flex">Planned</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-4 opacity-100">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-slate-700"><Watch size={18} className="text-white" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Oura Ring</div>
                    <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-950/20 text-emerald-400/90 border border-emerald-900/50 inline-flex items-center gap-1"><CheckCircle size={10} /> Connected (Demo)</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-4 opacity-60">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-slate-700"><Activity size={18} className="text-white" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Apple Health</div>
                    <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800/50 text-slate-500 border border-slate-700/50 inline-flex">Sync Paused</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

