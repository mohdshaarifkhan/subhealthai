"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GitCommit, AlertCircle, Search, Shield } from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { SHAPBarChart } from '@/components/ui/SHAPBarChart';
import type { DashboardViewData } from '@/lib/dashboardViewData';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type ExplainabilityViewProps = {
  profile: 'healthy' | 'risk';
  data: DashboardViewData;
  userId?: string | null;
  version?: string;
};

const ENGINE_VERSION = "phase3-v1-wes";

export const ExplainabilityView = ({ profile, data, userId, version = ENGINE_VERSION }: ExplainabilityViewProps) => {
  // Fetch explain data directly from API if userId is provided
  const shouldFetchExplain = userId && userId !== 'demo-healthy' && userId !== 'demo-risk';
  const { data: explainData } = useSWR(
    shouldFetchExplain ? `/api/explain?user=${userId}&version=${version}` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // Memoize drivers to prevent unnecessary recalculations
  const drivers = useMemo(() => {
    if (explainData?.drivers && Array.isArray(explainData.drivers) && explainData.drivers.length > 0) {
      const mapped = explainData.drivers.map((d: any) => {
        const deltaRaw = Number(d.delta_raw) || 0;
        const impact = Math.round(deltaRaw); // Preserve sign - negative delta_raw = negative impact (green bar)
        console.log('[ExplainabilityView] Driver:', d.feature, 'delta_raw:', deltaRaw, 'impact:', impact, 'sign:', d.sign);
        return {
          name: d.feature,
          impact: impact, // Negative if delta_raw is negative
          value: d.value != null ? String(d.value) : '—',
          delta_raw: deltaRaw,
          sign: d.sign || (deltaRaw >= 0 ? '+' : '-'),
        };
      });
      // Log driver impacts for debugging (with explicit type annotation)
      if (process.env.NODE_ENV === 'development') {
        type DriverItem = { name: string; impact: number };
        console.log('[ExplainabilityView] All drivers impacts:', mapped.map((d: DriverItem) => ({ name: d.name, impact: d.impact })));
      }
      return mapped;
    }
    // Transform fallback drivers to ensure impact values are correct (not multiplied by 100)
    const transformedDrivers = (data.drivers || []).map((d: any) => {
      // If impact is already in the old format (large numbers), convert it
      // Otherwise use it as-is
      const impact = Math.abs(d.impact) > 100 ? Math.round(d.impact / 100) : d.impact;
      return {
        ...d,
        impact: d.impact >= 0 ? Math.abs(impact) : -Math.abs(impact), // Preserve sign
      };
    });
    console.log('[ExplainabilityView] Using props drivers from data (transformed):', transformedDrivers.map((d: any) => ({ name: d.name, impact: d.impact })));
    return transformedDrivers;
  }, [
    explainData?.drivers?.length,
    explainData?.drivers?.[0]?.feature,
    data.drivers?.length,
    data.drivers?.[0]?.name
  ]);
  
  // Get first driver name as a stable string for comparison
  const firstDriverName = drivers.length > 0 ? drivers[0]?.name : null;
  
  const [selectedDriver, setSelectedDriver] = useState<typeof drivers[0] | null>(null);
  const initializedRef = useRef(false);
  
  // Fetch model hygiene data
  const { data: hygieneData } = useSWR('/api/eval/current/metrics', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  // Initialize selected driver only once when drivers first become available
  useEffect(() => {
    if (!initializedRef.current && firstDriverName && drivers.length > 0) {
      setSelectedDriver(drivers[0]);
      initializedRef.current = true;
    } else if (!firstDriverName && initializedRef.current) {
      setSelectedDriver(null);
      initializedRef.current = false;
    }
  }, [firstDriverName, drivers.length]);

  // Calculate data completeness (simplified - can be enhanced)
  const dataCompleteness = data.dataSources 
    ? Math.round(
        ((data.dataSources.samsungHealth === 'connected' ? 1 : 0) +
         (data.dataSources.bloodwork === 'uploaded' ? 1 : 0) +
         (data.dataSources.vitals === 'derived' ? 1 : 0)) / 3 * 100
      )
    : 94; // Default fallback

  // Get volatility index from data
  const volatilityIndex = typeof data.volatilityIndex === 'number' 
    ? data.volatilityIndex 
    : parseFloat(String(data.volatilityIndex || '0'));
  const volatilityLabel = volatilityIndex < 0.1 ? 'Low' : volatilityIndex < 0.3 ? 'Moderate' : 'High';

  // Get Brier score from hygiene data
  const brierScore = hygieneData?.overall?.brier ?? 0.13;
  const brierStatus = brierScore < 0.15 ? 'Optimal' : brierScore < 0.25 ? 'Good' : 'Needs Attention';

  // Generate driver description based on delta_raw
  const getDriverDescription = (driver: typeof selectedDriver) => {
    if (!driver) return '';
    
    // Use delta_raw if available (from new API format), otherwise derive from impact
    const deltaRaw = (driver as any).delta_raw ?? driver.impact;
    const absDelta = Math.abs(deltaRaw);
    const points = Math.round(absDelta);
    
    // Determine direction based on sign or impact
    const sign = (driver as any).sign || (driver.impact >= 0 ? '+' : '-');
    const isPositive = sign === '+' || driver.impact > 0;
    
    if (isPositive) {
      return `Compared to your baseline, ${driver.name} is increasing today's Instability Score by ${points} points.`;
    } else {
      return `Compared to your baseline, ${driver.name} is reducing today's Instability Score by ${points} points.`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {/* Left: SHAP Chart - Biggest (2/3 width) */}
      <BentoCard colSpan="lg:col-span-2" title="Local Feature Attribution (SHAP)" icon={GitCommit}>
         <div className="mb-6 max-w-[75ch]">
           <p className="text-sm text-slate-300 leading-relaxed font-mono border-l-4 border-cyan-500/30 pl-4 py-1">
             This chart visualizes exactly which features pushed your Instability Score up or down today.
           </p>
           <p className="text-sm text-slate-300 leading-relaxed font-mono border-l-4 border-cyan-500/30 pl-4 py-1 mt-2">
             <span className="text-emerald-400">Green</span> factors provided stability, while <span className="text-rose-400">red</span> factors introduced volatility.
           </p>
         </div>
         {drivers.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-48 gap-2">
             <AlertCircle className="w-8 h-8 text-slate-600" />
             <p className="text-xs text-slate-500 font-mono">No explainability data available yet.</p>
           </div>
         ) : (
           <SHAPBarChart drivers={drivers} onSelect={setSelectedDriver} />
         )}
      </BentoCard>

      {/* Right: Stacked Cards (1/3 width) */}
      <div className="space-y-6">
        {/* Driver Detail - Top */}
        <BentoCard title="Driver Detail" icon={Search}>
           {selectedDriver ? (
             <div className="space-y-4">
               <div>
                 <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">Selected Driver</span>
                 <h4 className="text-sm font-bold text-white mb-2 mt-2">{selectedDriver.name}</h4>
                 <div className="flex justify-between items-center mb-4">
                   <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">Value</span>
                   <span className="text-xs font-mono text-white">{selectedDriver.value || 'N/A'}</span>
                 </div>
                 <p className="text-sm text-slate-300 leading-relaxed font-mono mt-4">
                   {getDriverDescription(selectedDriver)}
                 </p>
               </div>
               <div className="pt-4 border-t border-slate-700">
                 <p className="text-[10px] text-slate-600 font-mono leading-relaxed">
                   Non-diagnostic. This attribution is for explanatory and research purposes only.
                 </p>
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-48 gap-2">
               <p className="text-xs text-slate-500 font-mono">Select a feature to view details</p>
             </div>
           )}
        </BentoCard>

        {/* Model Hygiene - Bottom */}
        <BentoCard title="Model Hygiene" icon={Shield}>
           <div className="space-y-4">
             <div className="text-left">
               <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Calibration (Brier Score)</div>
               <div className="text-xs font-bold font-mono">
                 <span className="text-emerald-400">{brierScore.toFixed(2)}</span>
                 <span className="text-slate-400 ml-2">({brierStatus})</span>
               </div>
             </div>
             <div className="text-left">
               <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Data Completeness</div>
               <div className="text-xs font-bold font-mono text-white">{dataCompleteness}%</div>
             </div>
             <div className="text-left">
               <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Volatility Index</div>
               <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${volatilityLabel === 'Low' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/5' : volatilityLabel === 'Moderate' ? 'text-amber-400 border-amber-500/40 bg-amber-500/5' : 'text-rose-400 border-rose-500/40 bg-rose-500/5'}`}>
                 {volatilityLabel}
               </span>
             </div>
           </div>
        </BentoCard>
      </div>
    </div>
  );
};

