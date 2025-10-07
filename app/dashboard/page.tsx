// app/dashboard/page.tsx
'use client'
import { useState, useEffect } from "react"
import { supabase } from '../../lib/supabase'
import Trendchart from '../../components/TrendChart'

type RiskRow = { day: string; risk_score: number; model_version: string };
type Explain = {
  day: string; riskPercent: number; modelVersion: string;
  reasons: string[]; imageUrl?: string; disclaimer: string;
};

const DEMO_USER_ID = "b2ea6462-6916-43d1-9c36-50d040ad8dc0"; // TODO: swap with session user

function RiskBadge({ score }: { score: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const color = score >= 0.66 ? "bg-red-600" : score >= 0.33 ? "bg-yellow-600" : "bg-green-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white ${color}`}>
      Risk {pct}%
    </span>
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
    }
    fetchData()
  }, [today]);

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

      {/* ===== AI Risk (new) ===== */}
      <section>
        <h2 className="text-xl font-medium mb-3">AI Risk (non-diagnostic)</h2>

        <div className="bg-gray-50 p-6 rounded-2xl border space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {riskSeries.length
                ? <>Latest: <span className="font-medium">{riskSeries[riskSeries.length - 1].day}</span> • Model: <code>{riskSeries[riskSeries.length - 1].model_version}</code></>
                : "No risk data yet."}
            </div>
            {riskSeries.length ? <RiskBadge score={riskSeries[riskSeries.length - 1].risk_score} /> : null}
          </div>

          {/* quick mini-bars as a sparkline substitute */}
          {riskSeries.length > 1 && (
            <div className="mt-3 flex items-end gap-1 h-16">
              {riskSeries.map((r, i) => (
                <div
                  key={i}
                  title={`${r.day}: ${(r.risk_score * 100).toFixed(0)}%`}
                  className="w-2 bg-gray-200 rounded-sm"
                  style={{ height: `${8 + r.risk_score * 56}px` }}
                />
              ))}
            </div>
          )}

          {/* Explainability bullets + image */}
          <div className="mt-4">
            <h4 className="font-medium mb-2">Why this score?</h4>
            {exp ? (
              <>
                <div className="text-sm text-gray-600">
                  Latest: <span className="font-medium">{exp.day}</span> • Model: <code>{exp.modelVersion}</code> • Risk: <span className="font-medium">{exp.riskPercent}%</span>
                </div>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                  {exp.reasons?.length ? exp.reasons.map((r, i) => <li key={i}>{r}</li>) : <li>No major deviations from baseline detected.</li>}
                </ul>
                {exp.imageUrl && (
                  <div className="mt-4">
                    <img src={exp.imageUrl} alt="Explainability plot" className="rounded-lg border max-w-full" />
                  </div>
                )}
                <p className="mt-4 text-xs text-gray-500">{exp.disclaimer}</p>
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
