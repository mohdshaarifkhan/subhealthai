// app/dashboard/page.tsx
'use client'
import { useState, useEffect } from "react"
import Image from 'next/image'
import { supabase } from '../../lib/supabase'
import Trendchart from '../../components/TrendChart'

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
  const [explainabilityImageUrl, setExplainabilityImageUrl] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10)

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

      // Fetch explainability image via API (bypasses RLS)
      try {
        const res = await fetch("/api/explainability/latest", { cache: "no-store" });
        const { url } = await res.json();
        console.log("Explainability image URL:", url);
        setExplainabilityImageUrl(url ?? null);
      } catch (err) {
        console.error("Failed to fetch explainability image:", err);
        setExplainabilityImageUrl(null);
      }
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
        <h1 className="text-2xl font-semibold">SubHealthAI — Demo Dashboard</h1>
        <a href="/api/report" className="inline-block px-3 py-2 rounded-lg border hover:bg-gray-50">
          Download Demo PDF
        </a>
      </div>

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
                {explainabilityImageUrl && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Feature Contribution (Explainability Plot)
                    </h3>
                    <div className="text-xs text-gray-400 mb-2">URL: {explainabilityImageUrl}</div>
                    <img
                      src={explainabilityImageUrl}
                      alt="Explainability SHAP Plot"
                      width={650}
                      height={400}
                      className="rounded-lg border border-gray-200 shadow-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      SHAP visualization showing feature influence on current risk prediction.
                    </p>
                  </div>
                )}
                {!explainabilityImageUrl && (
                  <div className="mt-4 text-xs text-gray-400">
                    No explainability image available.
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
    </div>
  )
}
