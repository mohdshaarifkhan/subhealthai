// app/dashboard/page.tsx
'use client'
import React, { useState, useEffect } from "react"
import { supabase } from '../../lib/supabase'
import Trendchart from '../../components/TrendChart'
import { useEval } from '../hooks/useEval'

type RiskRow = { day: string; risk_score: number; model_version: string };
type Explain = {
  day: string; riskPercent: number; modelVersion: string;
  reasons: string[]; imageUrl?: string; disclaimer: string;
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

export default function Dashboard() {
  const [riskSeries, setRiskSeries] = useState<RiskRow[]>([]);
  const [exp, setExp] = useState<Explain | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [showModelEvaluation, setShowModelEvaluation] = useState(false);
  const today = new Date().toISOString().slice(0, 10)
  
  // Fetch evaluation metrics
  const { data: evalData, error: evalError, isLoading: evalLoading } = useEval("phase3-v1", "all");

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
                    {/* Headline cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="rounded-xl border bg-white p-4">
                        <div className="text-sm text-gray-600 mb-1">Brier Score</div>
                        <div className="text-2xl font-semibold">
                          {overall.brier?.toFixed(3) ?? '—'}
                        </div>
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
                    
                    {/* SHAP Global */}
                    {shapGlobal.length > 0 && (
                      <section>
                        <h2 className="text-xl font-medium mb-3">Feature Importance (SHAP)</h2>
                        <div className="rounded-xl border bg-white p-4">
                          <div className="space-y-4">
                            {shapGlobal.map((s: any, i: number) => {
                              const maxShap = Math.max(...shapGlobal.map((x: any) => x.mean_abs_shap || 0));
                              const width = maxShap > 0 ? ((s.mean_abs_shap || 0) / maxShap) * 100 : 0;
                              return (
                                <div key={i}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-800">{s.feature}</span>
                                    <span className="text-sm font-semibold text-gray-700">
                                      {s.mean_abs_shap?.toFixed(4) ?? '—'}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                      className="bg-blue-600 h-3 rounded-full transition-all"
                                      style={{ width: `${width}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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
