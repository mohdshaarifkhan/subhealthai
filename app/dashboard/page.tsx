// app/dashboard/page.tsx
'use client'
import React, { useState, useEffect } from "react"
import useSWR from "swr"
import { supabase } from '../../lib/supabase'
import Trendchart from '../../components/TrendChart'
import { useEval } from '../hooks/useEval'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type RiskRow = { day: string; risk_score: number; model_version: string };
type Explain = {
  day: string; riskPercent: number; modelVersion: string;
  reasons: string[]; disclaimer: string;
};

const DEMO_USER_ID = "c1454b12-cd49-4ae7-8f4d-f261dcda3136"; // TODO: swap with session user

function RiskBadge({ score }: { score: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const color = score >= 0.66 ? "bg-red-600" : score >= 0.33 ? "bg-yellow-600" : "bg-green-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white ${color}`}>
      Risk {pct}%
    </span>
  );
}

function LabeledStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function fmt(dt?: string | null) {
  return dt ? new Date(dt).toLocaleString() : ''
}

function confidence(overall: { ece?: number; volatility?: number }) {
  const e = overall.ece ?? 1;
  const v = overall.volatility ?? 1;
  const score = 1 - (0.7 * e + 0.3 * v); // weight calibration more
  if (score >= 0.8) return { label: "High", color: "green" };
  if (score >= 0.6) return { label: "Moderate", color: "amber" };
  return { label: "Low", color: "red" };
}

function ConfidenceBadge({ overall }: { overall: { ece?: number; volatility?: number } }) {
  const conf = confidence(overall);
  const colorClass = conf.color === "green" ? "bg-green-100 text-green-800 border-green-200" :
                     conf.color === "amber" ? "bg-amber-100 text-amber-800 border-amber-200" :
                     "bg-red-100 text-red-800 border-red-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border ${colorClass}`}>
      Confidence: {conf.label}
    </span>
  );
}

function getVolatilityLevel(vol: number): { label: string; color: string } {
  if (vol < 0.1) return { label: "Low", color: "bg-green-100 text-green-800 border-green-200" };
  if (vol <= 0.25) return { label: "Med", color: "bg-amber-100 text-amber-800 border-amber-200" };
  return { label: "High", color: "bg-red-100 text-red-800 border-red-200" };
}

function ComparisonCards({ 
  primary, 
  secondary, 
  primaryLabel, 
  secondaryLabel 
}: { 
  primary: { brier?: number; ece?: number; volatility?: number } | null;
  secondary: { brier?: number; ece?: number; volatility?: number } | null;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  if (!primary || !secondary) return null;

  const formatDelta = (primary: number, secondary: number) => {
    const delta = secondary - primary; // Secondary relative to primary
    const sign = delta >= 0 ? "+" : "";
    // Lower is better for Brier/ECE/Vol, so negative delta is good (green)
    const color = delta < 0 ? "text-green-600" : delta > 0 ? "text-red-600" : "text-gray-600";
    return { text: `${sign}${delta.toFixed(4)}`, color };
  };

  const brierDelta = formatDelta(primary.brier ?? 0, secondary.brier ?? 0);
  const eceDelta = formatDelta(primary.ece ?? 0, secondary.ece ?? 0);
  const volDelta = formatDelta(primary.volatility ?? 0, secondary.volatility ?? 0);

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      {/* Primary Version */}
      <div className="rounded-xl border bg-white p-4">
        <div className="text-xs text-gray-500 mb-2">{primaryLabel}</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Brier</span>
            <span className="text-sm font-semibold">{primary.brier?.toFixed(4) ?? "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">ECE</span>
            <span className="text-sm font-semibold">{primary.ece?.toFixed(4) ?? "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Volatility</span>
            <span className="text-sm font-semibold">{primary.volatility?.toFixed(4) ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* Arrow & Secondary Version */}
      <div className="relative">
        <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 text-gray-400 text-2xl">→</div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500 mb-2">{secondaryLabel}</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Brier</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{secondary.brier?.toFixed(4) ?? "—"}</span>
                <span className={`text-xs ${brierDelta.color}`}>{brierDelta.text}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">ECE</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{secondary.ece?.toFixed(4) ?? "—"}</span>
                <span className={`text-xs ${eceDelta.color}`}>{eceDelta.text}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Volatility</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{secondary.volatility?.toFixed(4) ?? "—"}</span>
                <span className={`text-xs ${volDelta.color}`}>{volDelta.text}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [riskSeries, setRiskSeries] = useState<RiskRow[]>([]);
  const [exp, setExp] = useState<Explain | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [showModelEvaluation, setShowModelEvaluation] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState<string | null>(null);
  const [shapView, setShapView] = useState<"global" | "perday">("global");
  const [shapDay, setShapDay] = useState<string>("");
  const today = new Date().toISOString().slice(0, 10)
  
  // Load comparison state from localStorage
  useEffect(() => {
    const savedCompareMode = localStorage.getItem("eval_compare_mode") === "true";
    const savedCompareVersion = localStorage.getItem("eval_compare_version");
    if (savedCompareMode) setCompareMode(true);
    if (savedCompareVersion) setCompareVersion(savedCompareVersion);
  }, []);

  // Save comparison state to localStorage
  useEffect(() => {
    localStorage.setItem("eval_compare_mode", compareMode.toString());
  }, [compareMode]);
  useEffect(() => {
    if (compareVersion) {
      localStorage.setItem("eval_compare_version", compareVersion);
    }
  }, [compareVersion]);
  
  // Fetch current default version
  const { data: current } = useSWR(
    "/api/eval/current/metrics",
    (u: string) => fetch(u).then(r => r.json())
  );

  // Set version from current when loaded, or default to phase3-v1-wes
  useEffect(() => {
    if (!version) {
      setVersion(current?.version ?? "phase3-v1-wes");
    }
  }, [current, version]);

  // Set compare version from current when enabled
  useEffect(() => {
    if (compareMode && !compareVersion) {
      const primary = version ?? current?.version ?? "phase3-v1-wes";
      // Set different default comparison based on primary
      if (primary === "phase3-v1-wes") {
        setCompareVersion("phase3-v1-naive-cal");
      } else if (primary === "phase3-v1-self") {
        setCompareVersion("phase3-v1-wes");
      } else {
        setCompareVersion("phase3-v1-wes");
      }
    }
  }, [compareMode, compareVersion, current, version]);

  // Fetch evaluation metrics
  const evalSegment = shapView === "perday" && shapDay ? `day:${shapDay}` : "all";
  const { data: evalData, error: evalError, isLoading: evalLoading } = useEval(
    version ?? current?.version ?? "phase3-v1-wes",
    evalSegment
  );
  
  // Fetch per-day SHAP if needed
  const { data: dayEvalData } = useSWR(
    shapView === "perday" && shapDay && (version ?? current?.version)
      ? `/api/eval/${version ?? current?.version ?? "phase3-v1-wes"}/metrics?day=${shapDay}`
      : null,
    (url: string) => fetch(url).then(r => r.json())
  );

  // Fetch comparison metrics
  const { data: compareData, error: compareError, isLoading: compareLoading } = useEval(
    compareMode ? (compareVersion ?? current?.version ?? "phase3-v1-wes") : "",
    "all"
  );

  // Load all data
  useEffect(() => {
    // Risk data
    fetch(`/api/risk?user=${DEMO_USER_ID}`).then(r => r.json()).then(setRiskSeries).catch(()=>setRiskSeries([]));
    fetch(`/api/risk/explain?user=${DEMO_USER_ID}`).then(r => r.json()).then(setExp).catch(()=>setExp(null));
    
    // Metrics and flags
    async function fetchData() {
      const { data: metricsData } = await supabase
        .from('metrics')
        .select('day,steps,sleep_minutes,hr_avg,hrv_avg,rhr')
        .order('day', { ascending: false })
        .limit(7)
      setMetrics(metricsData ?? [])

      const { data: flagsData } = await supabase
        .from('flags')
        .select('day,flag_type,severity,rationale,created_at')
        .eq('day', today)
        .order('created_at', { ascending: false })
      setFlags(flagsData ?? [])
    }
    fetchData()
  }, [today]);

  // pick latest baseline (today or latest past)
  const latestBaseline = [...riskSeries]
    .filter(r => r.model_version?.startsWith("baseline"))
    .sort((a,b) => a.day.localeCompare(b.day))
    .at(-1);

  // improved forecast logic
  const tomorrowISO = new Date(Date.now() + 86400000).toISOString().slice(0,10);
  
  const forecasts = riskSeries
    .filter(r => (r.model_version || '').toLowerCase().startsWith('forecast'))
    .sort((a,b) => a.day.localeCompare(b.day));

  const forecastTomorrow = forecasts.find(r => r.day === tomorrowISO);
  const latestForecast = forecasts.at(-1);
  
  const forecastRow = forecastTomorrow ?? latestForecast; // fallback

  // simple spark bars from the last 14 risk points (any model)
  const spark = riskSeries.slice(-14);

  const metricsAsc = metrics.slice().reverse()

  const sleepData = metricsAsc.map((m: any) => ({
    day: m.day.slice(5), // MM-DD
    value: m.sleep_minutes ?? 0
  }))
  const hrvData = metricsAsc.map((m: any) => ({
    day: m.day.slice(5),
    value: m.hrv_avg ?? 0
  }))
  const stepsData = metricsAsc.map((m: any) => ({
    day: m.day.slice(5),
    value: m.steps ?? 0
  }))

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {showModelEvaluation ? "SubHealthAI — Model Evaluation" : "SubHealthAI — Demo Dashboard"}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModelEvaluation(!showModelEvaluation)}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
          >
            {showModelEvaluation ? "← Back to Individual Dashboard" : "Model Evaluation →"}
          </button>
          <a href="/api/report" className="inline-block px-3 py-2 rounded-lg border hover:bg-gray-50">
            Download Demo PDF
          </a>
        </div>
      </div>

      {showModelEvaluation ? (
        <>
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm text-gray-600">Dataset:</label>
              <select 
                className="border p-2 rounded text-sm bg-white"
                value={version ?? current?.version ?? "phase3-v1-wes"} 
                onChange={e => setVersion(e.target.value)}
                defaultValue="phase3-v1-wes"
              >
                <option value="phase3-v1-wes">WESAD (Empirical)</option>
                <option value="phase3-v1-self">Samsung (Personal)</option>
                <option value="phase3-v1-naive-cal">Synthetic (Baseline)</option>
              </select>
              {evalData?.overall && <ConfidenceBadge overall={evalData.overall} />}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={e => setCompareMode(e.target.checked)}
                  className="w-4 h-4"
                />
                Compare
              </label>
            </div>
            {compareMode && (
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm text-gray-600">Compare With:</label>
                <select 
                  className="border p-2 rounded text-sm bg-white"
                  value={compareVersion ?? current?.version ?? "phase3-v1-wes"} 
                  onChange={e => setCompareVersion(e.target.value)}
                >
                  <option value="phase3-v1-wes">WESAD (Empirical)</option>
                  <option value="phase3-v1-self">Samsung (Personal)</option>
                  <option value="phase3-v1-naive-cal">Synthetic (Baseline)</option>
                </select>
                {compareData?.overall && <ConfidenceBadge overall={compareData.overall} />}
              </div>
            )}
          </div>
          {evalError && (
            <div className="p-4 text-red-600 bg-red-50 rounded-lg border border-red-200">
              Failed to load metrics: {evalError.message || "Unknown error"}
            </div>
          )}
          {evalLoading || !evalData ? (
            <div className="p-4 text-gray-600">Loading evaluation metrics…</div>
          ) : (
            <>
              {(() => {
                const overall = evalData.overall || {};
                const reliability = evalData.reliability ?? [];
                const volSeries = evalData.volatility_series ?? [];
                const leadHist = evalData.lead_time_hist ?? [];
                const shapGlobal = evalData.shap_global ?? [];
                
                return (
                  <div className="space-y-6">
                    {/* Comparison Cards */}
                    {compareMode && compareData?.overall && (
                      <ComparisonCards
                        primary={evalData.overall}
                        secondary={compareData.overall}
                        primaryLabel={version ?? current?.version ?? "phase3-v1-wes"}
                        secondaryLabel={compareVersion ?? current?.version ?? "phase3-v1-wes"}
                      />
                    )}
                    {/* Headline cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-gray-600 mb-1">Brier Score</div>
                        <div className="text-2xl font-semibold">
                          {overall.brier?.toFixed(3) ?? '—'}
                        </div>
                        {overall.ece !== undefined && (
                          <div className="mt-2 text-xs text-gray-500">
                            Calibrated ✓ (ECE {overall.ece.toFixed(2)})
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-gray-600 mb-1">ECE</div>
                        <div className="text-2xl font-semibold">
                          {overall.ece?.toFixed(3) ?? '—'}
                        </div>
                      </div>
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-gray-600 mb-1">Volatility</div>
                        <div className="text-2xl font-semibold">
                          {overall.volatility?.toFixed(3) ?? '—'}
                        </div>
                        {overall.volatility !== undefined && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getVolatilityLevel(overall.volatility).color}`}>
                              {getVolatilityLevel(overall.volatility).label}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-gray-600 mb-1">Lead Time (mean)</div>
                        <div className="text-2xl font-semibold">
                          {overall.lead_time_days_mean?.toFixed(1) ?? '—'} days
                        </div>
                      </div>
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-gray-600 mb-1">Lead Time (p90)</div>
                        <div className="text-2xl font-semibold">
                          {overall.lead_time_days_p90?.toFixed(1) ?? '—'} days
                        </div>
                        {overall.lead_time_days_p90 !== undefined && (
                          <div className="mt-2">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                              P90: {overall.lead_time_days_p90.toFixed(0)}d
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-gray-600 mb-1">Sample Size</div>
                        <div className="text-2xl font-semibold">
                          {overall.n_users ?? '—'} users, {overall.n_days ?? '—'} days
                        </div>
                      </div>
                    </div>
                    
                    {/* Reliability Chart Section */}
                    {reliability.length > 0 && (
                      <section>
                        <h2 className="text-xl font-medium mb-3">Reliability Curve</h2>
                        <div className="rounded-xl border bg-white p-4">
                          <div className="grid grid-cols-5 gap-2 text-xs mb-4">
                            <div className="font-medium">Bin</div>
                            <div className="font-medium">Predicted</div>
                            <div className="font-medium">Observed</div>
                            <div className="font-medium">Samples</div>
                            <div className="font-medium">Difference</div>
                          </div>
                          <div className="space-y-2">
                            {reliability.map((r: any, i: number) => (
                              <div key={i} className="grid grid-cols-5 gap-2 text-sm border-t pt-2">
                                <div>{r.bin?.toFixed(3) ?? '—'}</div>
                                <div>{r.pred?.toFixed(3) ?? '—'}</div>
                                <div>{r.obs?.toFixed(3) ?? '—'}</div>
                                <div>{r.n ?? '—'}</div>
                                <div className={Math.abs((r.pred ?? 0) - (r.obs ?? 0)) > 0.1 ? 'text-red-600' : 'text-green-600'}>
                                  {((r.pred ?? 0) - (r.obs ?? 0)).toFixed(3)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    )}
                    
                    {/* Volatility Series */}
                    {volSeries.length > 0 && (
                      <section>
                        <h2 className="text-xl font-medium mb-3">Volatility Over Time</h2>
                        <div className="rounded-xl border bg-white p-4">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Day</th>
                                  <th className="text-left p-2">Mean Delta</th>
                                </tr>
                              </thead>
                              <tbody>
                                {volSeries.map((v: any, i: number) => (
                                  <tr key={i} className="border-b">
                                    <td className="p-2">{v.day}</td>
                                    <td className="p-2">{v.mean_delta?.toFixed(4) ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                    )}
                    
                    {/* Lead Time Histogram */}
                    {leadHist.length > 0 && (
                      <section>
                        <h2 className="text-xl font-medium mb-3">Lead Time Distribution</h2>
                        <div className="rounded-xl border bg-white p-4">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="font-medium">Days</div>
                            <div className="font-medium">Count</div>
                            {leadHist.map((h: any, i: number) => (
                              <React.Fragment key={i}>
                                <div className="border-t pt-2">{h.days}</div>
                                <div className="border-t pt-2">{h.count}</div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </section>
                    )}
                    
                    {/* SHAP Global/Per-day */}
                    {shapGlobal.length > 0 && (
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-xl font-medium">Feature Importance (SHAP)</h2>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <button
                                onClick={() => setShapView("global")}
                                className={`px-3 py-1 rounded border ${
                                  shapView === "global"
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                Global
                              </button>
                              <button
                                onClick={() => setShapView("perday")}
                                className={`px-3 py-1 rounded border ${
                                  shapView === "perday"
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                Per-day
                              </button>
                            </div>
                            {shapView === "perday" && (
                              <input
                                type="date"
                                value={shapDay}
                                onChange={(e) => setShapDay(e.target.value)}
                                className="border rounded px-2 py-1 text-sm"
                                max={today}
                              />
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl border bg-white p-4">
                          {shapView === "global" ? (
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={shapGlobal.map((s: any) => ({
                                    feature: s.feature,
                                    value: s.mean_abs_shap || 0
                                  }))}
                                  layout="vertical"
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" />
                                  <YAxis dataKey="feature" type="category" width={100} tick={{ fontSize: 12 }} />
                                  <Tooltip />
                                  <Bar dataKey="value" fill="#2563eb" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : shapDay && dayEvalData?.shap_global ? (
                            dayEvalData.shap_global.length > 0 ? (
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={dayEvalData.shap_global.map((s: any) => ({
                                      feature: s.feature,
                                      value: s.mean_abs_shap || 0
                                    }))}
                                    layout="vertical"
                                  >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="feature" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#2563eb" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <div className="p-4 text-sm text-gray-500">No SHAP data for this day.</div>
                            )
                          ) : (
                            <div className="p-4 text-sm text-gray-500">Select a date to view per-day SHAP values.</div>
                          )}
                        </div>
                      </section>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </>
      ) : (
        <>

      {/* ===== AI Risk (non-diagnostic) ===== */}
      <section>
        <h2 className="text-xl font-medium mb-3">
          AI Risk (non-diagnostic)
          <span className="ml-2 text-xs text-gray-500">
            based on HRV, RHR, Sleep, Steps
          </span>
        </h2>

        <div className="rounded-2xl border bg-white p-4 space-y-4">
          {/* Top row: Baseline vs Forecast side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Latest Baseline</span>
                {latestBaseline && <RiskBadge score={latestBaseline.risk_score} />}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <LabeledStat label="Date" value={latestBaseline ? latestBaseline.day : "—"} />
                <LabeledStat label="Model" value={latestBaseline ? latestBaseline.model_version : "—"} />
              </div>
              {latestBaseline && (
                <div className="mt-2 text-xs">
                  Anomaly vs baseline:&nbsp;
                  <span className="font-medium">
                    {latestBaseline.risk_score >= 0.66 ? "High" :
                     latestBaseline.risk_score >= 0.33 ? "Moderate" : "Low"}
                  </span>
                </div>
              )}
            </div>

        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {forecastTomorrow ? "Tomorrow (Forecast)" : "Most Recent Forecast"}
            </span>
            {forecastRow && <RiskBadge score={forecastRow.risk_score} />}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <LabeledStat label="Date" value={forecastRow?.day ?? "—"} />
            <LabeledStat label="Model" value={forecastRow?.model_version ?? "—"} />
          </div>
          {!forecastRow && (
            <div className="mt-2 text-xs text-gray-500">No forecast available yet.</div>
          )}
        </div>

            {/* Sparkline substitute */}
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">14-day Trend</span>
                {latestBaseline && <RiskBadge score={latestBaseline.risk_score} />}
              </div>
              <div className="mt-2 flex items-end gap-1 h-16">
                {spark.map((r, i) => (
                  <div key={i}
                    title={`${r.day}: ${(r.risk_score*100).toFixed(0)}% (${r.model_version})`}
                    className="w-2 bg-gray-200 rounded-sm"
                    style={{ height: `${8 + r.risk_score * 56}px` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Explainability */}
          <div>
            <h4 className="font-medium mb-2">Why this score?</h4>
            {exp ? (
              <>
                <div className="text-sm text-gray-600">
                  Latest: <span className="font-medium">{exp.day}</span> • Model: <code>{exp.modelVersion}</code> • Risk: <span className="font-medium">{exp.riskPercent}%</span>
                </div>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                  {exp.reasons?.length
                    ? exp.reasons.map((r, i) => <li key={i}>{r}</li>)
                    : <li>No major deviations from baseline detected.</li>}
                </ul>
                {/* Feature Contribution (SHAP) */}
                {evalData?.shap_global && evalData.shap_global.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Feature Contribution (SHAP)
                    </h3>
                    <div className="space-y-3">
                      {evalData.shap_global.map((s: any, i: number) => {
                        const maxShap = Math.max(...evalData.shap_global.map((x: any) => x.mean_abs_shap || 0));
                        const width = maxShap > 0 ? ((s.mean_abs_shap || 0) / maxShap) * 100 : 0;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">{s.feature}</span>
                              <span className="text-xs text-gray-600">{s.mean_abs_shap?.toFixed(4) ?? '—'}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Feature importance based on mean absolute SHAP values from model evaluation.
                    </p>
                  </div>
                )}

                {/* Mini glossary aids (no claims, pure definitions) */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
                  <div title="Beats per minute — overall cardiovascular load."><span className="font-medium">HR</span>: Heart Rate</div>
                  <div title="Average HR at rest — higher can reflect stress or strain."><span className="font-medium">RHR</span>: Resting Heart Rate</div>
                  <div title="Beat-to-beat variation — lower can reflect stress/fatigue."><span className="font-medium">HRV</span>: Heart Rate Variability</div>
                  <div title="Estimated nightly sleep duration."><span className="font-medium">Sleep Hours</span></div>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  This section provides non-diagnostic AI indicators intended for preventive context and clinician discussion only.
                </p>
              </>
            ) : (
              <div className="text-sm text-gray-600">Loading…</div>
            )}
          </div>
        </div>
      </section>

      {/* New: Charts row */}
      <section>
        <h2 className="text-xl font-medium mb-3">Trends (7 days)</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border bg-white">
            <div className="border-b px-4 py-2 font-medium">Sleep (minutes)</div>
            <div className="p-4">
              <Trendchart data={sleepData} label="Sleep (min)" />
            </div>
          </div>
          <div className="rounded-xl border bg-white">
            <div className="border-b px-4 py-2 font-medium">HRV (avg)</div>
            <div className="p-4">
              <Trendchart data={hrvData} label="HRV" />
            </div>
          </div>
          <div className="rounded-xl border bg-white">
            <div className="border-b px-4 py-2 font-medium">Steps (7d)</div>
            <div className="p-4">
              <Trendchart data={stepsData} label="Steps" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium mb-3">Last 7 Days (metrics)</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Day</th>
                <th className="p-2 text-left">Steps</th>
                <th className="p-2 text-left">Sleep (min)</th>
                <th className="p-2 text-left">HR avg</th>
                <th className="p-2 text-left">HRV avg</th>
                <th className="p-2 text-left">RHR</th>
              </tr>
            </thead>
            <tbody>
              {metricsAsc.map((m: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{m.day}</td>
                  <td className="p-2">{m.steps ?? '-'}</td>
                  <td className="p-2">{m.sleep_minutes ?? '-'}</td>
                  <td className="p-2">{m.hr_avg ?? '-'}</td>
                  <td className="p-2">{m.hrv_avg ?? '-'}</td>
                  <td className="p-2">{m.rhr ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium mb-3">Today’s Flags</h2>
        <div className="rounded-xl border divide-y">
          {(flags ?? []).length === 0 && <div className="p-3 text-gray-500">No flags today.</div>}
          {flags?.map((f: any, i: number) => (
            <div key={i} className="p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{f.flag_type}</div>
                <div className="text-sm text-gray-500">Severity {f.severity}</div>
              </div>
              <div className="text-sm text-gray-700">{f.rationale}</div>
              <div className="text-xs text-gray-400 mt-1">Created: {fmt(f.created_at)}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium mb-3">System Jobs (Demo)</h2>
        <form action="/api/cron" method="post">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Run Daily Cron (Demo)
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-500">
          ⚠️ Demo only — in production this runs automatically (nightly job).
        </p>
      </section>
        </>
      )}
    </div>
  )
}
