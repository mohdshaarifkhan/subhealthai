"use client";

import React from 'react';
import { Activity, Brain, Zap, GitCommit, TrendingUp, Stethoscope, AlertCircle } from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { MiniAreaChart } from '@/components/ui/MiniAreaChart';
import { StatValue } from '@/components/ui/StatValue';
import { ClinicalReasonsCard } from '@/components/Dashboard/ClinicalReasonsCard';
import { formatNumber, specialtyLabel } from '@/lib/utils/dashboardUtils';
import type { DashboardViewData } from '@/lib/dashboardViewData';

type DashboardViewProps = {
  profile: 'healthy' | 'risk';
  data: DashboardViewData;
  onToggleCopilot: () => void;
  forecastSeries?: any[];
  isDemo: boolean;
  userId: string | null;
  latestMetrics: any;
  clinical: any;
  clinicalReasons: string[];
  version?: string;
};

const ENGINE_VERSION = "phase3-v1-wes";

export const DashboardView = ({ 
  profile, 
  data, 
  onToggleCopilot, 
  forecastSeries, 
  isDemo, 
  userId, 
  latestMetrics, 
  clinical, 
  clinicalReasons,
  version = ENGINE_VERSION
}: DashboardViewProps) => {
  const isRisk = profile === 'risk';
  const chartColor = isRisk ? '#fbbf24' : '#22d3ee';
  const hasForecast = data.hasForecast;
  
  // Demo clinical reasons for demo users
  const demoReasons = isDemo ? (isRisk ? [
    "Low steps",
    "Short sleep",
    "High RHR",
    "Low HRV",
    "High LDL & triglycerides",
    "Prediabetes-range HbA1c"
  ] : [
    "Optimal sleep duration",
    "Stable HRV",
    "Normal RHR",
    "Healthy activity levels",
    "Normal glucose",
    "Optimal lipid profile"
  ]) : [];
  
  // Generate reasons from dashboard data for real users if API didn't provide them
  const generateReasonsFromData = () => {
    if (isDemo) return [];
    const reasons: string[] = [];
    
    // From drivers (top contributors)
    if (data?.drivers && data.drivers.length > 0) {
      data.drivers.slice(0, 3).forEach((driver: any) => {
        if (driver.impact > 0) {
          reasons.push(`${driver.name} increased instability`);
        } else if (driver.impact < 0) {
          reasons.push(`${driver.name} reduced instability`);
        }
      });
    }
    
    // From vitals trends
    if (data?.trends) {
      if (data.trends.hrv === 'down') reasons.push("HRV decreased vs baseline");
      if (data.trends.rhr === 'up') reasons.push("Resting heart rate elevated");
    }
    
    // From labs
    if (data?.labs && data.labs.length > 0) {
      data.labs.forEach((lab: any) => {
        if (lab.status === 'Elevated' || lab.status === 'High' || lab.status === 'Borderline') {
          reasons.push(`${lab.name} ${lab.status.toLowerCase()}`);
        }
      });
    }
    
    // From drift
    if (data?.drift) {
      if (data.drift.metabolic === 'Moderate' || data.drift.metabolic === 'Elevated') {
        reasons.push("Metabolic drift detected");
      }
      if (data.drift.cardio === 'Elevated') {
        reasons.push("Cardiovascular markers elevated");
      }
    }
    
    // From instability score
    if (data?.instabilityScore) {
      if (data.instabilityScore >= 70) {
        reasons.push("High instability signal");
      } else if (data.instabilityScore >= 40) {
        reasons.push("Moderate instability signal");
      }
    }
    
    return reasons.slice(0, 6); // Limit to 6 reasons
  };
  
  // Use provided clinicalReasons, or generate from data, or fall back to demo reasons
  const reasonsToShow = clinicalReasons && clinicalReasons.length > 0 
    ? clinicalReasons 
    : (isDemo ? demoReasons : generateReasonsFromData());
  
  // Use real forecast series if available
  // Only fallback to mock data in demo mode, otherwise show empty array for real users
  const chartData = forecastSeries && forecastSeries.length > 0
    ? forecastSeries.map((point: any) => Math.round((point.risk || point.value || 0) * 100))
    : (isDemo ? (isRisk ? [45, 50, 65, 78, 82, 80, 85, 90, 88, 92, 85, 80] : [12, 15, 10, 14, 12, 18, 15, 12, 10, 14, 12, 15]) : []);

  // For demo users, always show the graph (they have mock data)
  // For real users, only show if hasForecast is true
  const shouldShowGraph = isDemo || hasForecast;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <BentoCard 
        colSpan="md:col-span-2 lg:col-span-3" 
        rowSpan="row-span-2" 
        title="Instability Index" 
        icon={Activity}
        delay={100}
        glowing={isRisk}
        className="pr-4"
      >
        {shouldShowGraph ? (
          <>
            <div className="flex justify-between items-center w-full mb-4 relative z-20 pr-3">
              <div className="flex items-center gap-2">
                 <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border border-opacity-20 ${isRisk ? 'text-amber-400 border-amber-400 bg-amber-400/10' : 'text-cyan-400 border-cyan-400 bg-cyan-400/10'}`}>
                   {data.status}
                 </div>
              </div>
              <div className="text-right flex flex-col justify-center">
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
            <div className="absolute bottom-0 left-0 right-0 h-48 z-10 opacity-60 pr-3">
               <MiniAreaChart data={chartData} color={chartColor} height={100} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start justify-center h-full gap-3">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              No baseline yet
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              We haven&apos;t computed your Instability baseline yet. Once we have enough
              wearable + lab data, this card will activate.
            </p>
          </div>
        )}
      </BentoCard>

      <BentoCard colSpan="md:col-span-2 lg:col-span-3" title="Daily Briefing" icon={Brain} delay={150}>
        <div className="flex flex-col justify-between h-full">
          <p className="text-sm text-slate-300 leading-relaxed font-mono border-l-4 border-cyan-500/30 pl-4 py-1 max-w-[75ch]">
            {data.narrative}
          </p>
          <div className="mt-4 flex gap-2">
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">Model Confidence: 94%</span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">Calibration: Optimal</span>
          </div>
        </div>
      </BentoCard>

      <BentoCard colSpan="md:col-span-2 lg:col-span-3" title="Biometric Telemetry" icon={Zap} delay={200}>
        <div className="grid grid-cols-2 gap-4 h-full">
          <div className="bg-slate-900/50 p-3 rounded border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono mb-2">HRV (rmssd)</span>
            <span className={`text-xl font-['Unbounded'] ${isRisk ? 'text-amber-400' : 'text-white'}`}>{formatNumber(data.vitals.hrv, 0)}<span className="text-[10px] text-slate-500">ms</span></span>
          </div>
          <div className="bg-slate-900/50 p-3 rounded border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono mb-2">RHR</span>
            <span className={`text-xl font-['Unbounded'] ${isRisk ? 'text-amber-400' : 'text-white'}`}>{formatNumber(data.vitals.rhr, 0)}<span className="text-[10px] text-slate-500">bpm</span></span>
          </div>
          <div className="bg-slate-900/50 p-3 rounded border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono mb-2">Resp Rate</span>
            <span className="text-xl font-['Unbounded'] text-white">{data.vitals.resp}<span className="text-[10px] text-slate-500">rpm</span></span>
          </div>
          <div className="bg-slate-900/50 p-3 rounded border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono mb-2">Skin Temp</span>
            <span className="text-xl font-['Unbounded'] text-white">{data.vitals.temp}<span className="text-[10px] text-slate-500">°F</span></span>
          </div>
        </div>
      </BentoCard>

      <BentoCard colSpan="md:col-span-2 lg:col-span-2" title="Top Contributors" icon={GitCommit} delay={250}>
        {data.drivers.length === 0 ? (
          <div className="flex flex-col items-start justify-center h-full gap-2">
            <p className="text-xs text-slate-500">
              Explainability will appear once we have enough risk history for your profile.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mt-2">
              {data.drivers.map((d, i) => {
                const domain = d.domain ? ` · ${d.domain}` : '';
                const specialties = d.specialties ? d.specialties.map(specialtyLabel).join(', ') : '';
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-mono">{d.name}</span>
                      <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${d.impact > 0 ? 'bg-rose-950/20 text-rose-400/90 border border-rose-900/50' : 'bg-emerald-950/20 text-emerald-400/90 border border-emerald-900/50'}`}>
                        {d.impact > 0 ? '↑ Instability' : '↓ Instability'}
                      </div>
                    </div>
                    {(domain || specialties) && (
                      <div className="text-[9px] text-slate-500 ml-1">
                        {domain}
                        {specialties && ` · ${specialties}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-auto pt-4 text-[9px] text-slate-600 font-mono text-center">
              Based on SHAP feature attribution
            </div>
          </>
        )}
      </BentoCard>

      <BentoCard colSpan="md:col-span-4 lg:col-span-2" title="Subclinical Drift" icon={TrendingUp} delay={300} className={isRisk ? "border-amber-500/20 bg-amber-900/5" : ""}>
        <div className="space-y-5 h-full flex flex-col justify-center">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
             <span className="text-xs text-slate-400 font-mono">Metabolic</span>
             <span className={`text-xs font-bold font-mono ${data.drift.metabolic === 'Low' ? 'text-emerald-400' : data.drift.metabolic === 'Moderate' ? 'text-amber-400' : 'text-amber-500'}`}>{data.drift.metabolic}</span>
          </div>
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
             <span className="text-xs text-slate-400 font-mono">Cardiovascular</span>
             <span className={`text-xs font-bold font-mono ${data.drift.cardio === 'Low' ? 'text-emerald-400' : data.drift.cardio === 'Moderate' ? 'text-amber-400' : 'text-amber-500'}`}>{data.drift.cardio}</span>
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

      <BentoCard delay={320} colSpan="col-span-full md:col-span-2 lg:col-span-2" title="Why Your Risk Moved Today" icon={AlertCircle}>
        <ClinicalReasonsCard reasons={reasonsToShow} />
      </BentoCard>

      <ClinicalRiskCard userId={userId} latestMetrics={latestMetrics} isDemo={isDemo} clinical={clinical} profile={profile} />
    </div>
  );
};

// Clinical Risk Card Component - Now includes full Clinical Risk Section
export const ClinicalRiskCard = ({ userId, latestMetrics, isDemo, clinical, profile }: any) => {
  // Use clinical prop if available (from initialClinical)
  const hasClinicalData = clinical?.clinicalConditions?.length > 0;
  
  // Demo data for demo users
  const isRisk = profile === 'risk';
  const demoClinicalData = isDemo ? {
    clinicalConditions: [
      {
        name: isRisk ? "Type 2 Diabetes / Metabolic Risk" : "Type 2 Diabetes / Metabolic Risk",
        shortName: "DIABETES",
        riskPercent: isRisk ? 18.4 : 4.2,
        riskTier: isRisk ? "Moderate" : "Low",
        modelId: "pima_diabetes_gb_v1",
        dataSource: "Pima Indians Diabetes Database",
        notes: "Model trained on Pima Indians Diabetes Dataset. Non-diagnostic; for preventive screening context only."
      },
      {
        name: isRisk ? "Atherosclerotic Cardiovascular Risk" : "Atherosclerotic Cardiovascular Risk",
        shortName: "CARDIO",
        riskPercent: isRisk ? 28.7 : 8.1,
        riskTier: isRisk ? "High" : "Low",
        modelId: "cleveland_cardio_rf_v1",
        dataSource: "UCI Cleveland Heart Disease Dataset",
        notes: "Random Forest trained on UCI Cleveland Heart Disease dataset. Non-diagnostic."
      }
    ],
    overallInstability: isRisk ? 23.5 : 6.2,
    drivers: isRisk 
      ? [
          { factor: "Elevated glucose", impact: "+12%" },
          { factor: "High cholesterol", impact: "+8%" },
          { factor: "Reduced HRV", impact: "+5%" }
        ]
      : [
          { factor: "Optimal glucose", impact: "-3%" },
          { factor: "Normal cholesterol", impact: "-2%" },
          { factor: "Stable HRV", impact: "-1%" }
        ]
  } : null;

  const conditions = hasClinicalData ? clinical?.clinicalConditions || [] : (isDemo ? demoClinicalData?.clinicalConditions || [] : []);
  const overallInstability = hasClinicalData ? clinical?.overallInstability : (isDemo ? demoClinicalData?.overallInstability : undefined);
  const drivers = hasClinicalData ? clinical?.drivers || [] : (isDemo ? demoClinicalData?.drivers || [] : []);

  // Show "No data" message only for real users without clinical data
  if (!hasClinicalData && !isDemo) {
    return (
      <BentoCard 
        title="Clinical Risk (Prototype)" 
        icon={Stethoscope} 
        delay={350}
        colSpan="md:col-span-4 lg:col-span-6"
      >
        <div className="flex items-center justify-center h-32">
          <div className="text-xs text-slate-500 font-mono">No clinical data available yet</div>
        </div>
      </BentoCard>
    );
  }

  // For demo users or users with clinical data, show the full card
  const hasDataToShow = conditions.length > 0;

  const tierColor: Record<string, string> = {
    Low: "text-emerald-400 border-emerald-500/40 bg-emerald-500/5",
    Moderate: "text-amber-400 border-amber-500/40 bg-amber-500/5",
    High: "text-rose-400 border-rose-500/40 bg-rose-500/5",
  };

  return (
    <BentoCard 
      title="Clinical Risk (Prototype)" 
      icon={require('lucide-react').Stethoscope} 
      delay={350}
      colSpan="md:col-span-4 lg:col-span-6"
      warning={overallInstability && overallInstability > 50}
    >
      {!hasDataToShow ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-xs text-slate-500 font-mono">No clinical data available yet</div>
        </div>
      ) : (
      <div className="space-y-4">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-200/90">
              Chronic Disease Risk Snapshot
            </h2>
            <p className="text-xs text-slate-400/80 mt-1">
              Non-diagnostic preview of metabolic and cardiovascular risk using structured labs + vitals.
            </p>
          </div>
          {typeof overallInstability === "number" && (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Model Instability Lens
              </p>
              <p className="text-sm font-semibold text-slate-100">
                {overallInstability.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {/* Risk Conditions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
          {conditions.map((c: any, idx: number) => (
            <div key={c.shortName} className="relative">
              <div
                className="rounded-2xl border border-slate-700/60 bg-slate-900/60 px-3.5 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.7)] flex flex-col min-h-[140px]"
              >
                <div className="flex items-start justify-between flex-1">
                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      {c.shortName}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{c.name}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-semibold text-slate-50 leading-none">
                      {c.riskPercent.toFixed(1)}%
                    </p>
                    <span
                      className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-medium mt-1.5 ${tierColor[c.riskTier] || tierColor['Low']}`}
                    >
                      {c.riskTier} risk
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    Model: <span className="text-slate-300">{c.modelId}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 text-right">
                    Data: <span className="text-slate-300">{c.dataSource}</span>
                  </p>
                </div>
                {c.notes && (
                  <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
                    {c.notes}
                  </p>
                )}
              </div>
              {idx === 0 && conditions.length > 1 && (
                <div className="hidden md:block absolute top-0 bottom-0 right-0 w-px bg-slate-800/50 -mr-1.5"></div>
              )}
            </div>
          ))}
        </div>

        {/* Risk Drivers */}
        {drivers && drivers.length > 0 && (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 px-3.5 py-2.5">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Model Drivers (fusion of labs + wearable load)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {drivers.map((d: any, idx: number) => (
                <span
                  key={`${d.factor}-${idx}`}
                  className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-200"
                >
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                  {d.factor}
                  <span className="ml-1 text-[10px] text-slate-400">
                    · {d.impact}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </BentoCard>
  );
};

