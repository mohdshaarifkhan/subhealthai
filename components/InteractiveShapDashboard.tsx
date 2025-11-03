"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, LineChart as LineChartIcon, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

/**
 * SubHealthAI – Interactive Evaluation Dashboard
 * ------------------------------------------------
 * What this provides:
 * - Live, dynamic charts backed by JSON endpoints (no static PNGs)
 * - Switch between versions (e.g., phase3-v1) and segments
 * - Calibration curve, volatility time-series, lead-time histogram, SHAP bars
 * - Auto-refresh controls and export-to-JSON for IEEE artifact snapshots
 *
 * Expected API contracts (Next.js /api suggested):
 * GET /api/eval/:version/metrics -> {
 *   overall: { brier, ece, volatility, lead_time_days_mean, lead_time_days_p90, n_users, n_days },
 *   reliability: [{ bin: 0.05, pred: 0.08, obs: 0.03 }, ...],
 *   volatility_series: [{ day: "2025-10-01", mean_delta: 0.12 }, ...],
 *   lead_time_hist: [{ days: 1, count: 4 }, ...],
 *   shap_global: [{ feature: "sleep_efficiency", mean_abs_shap: 0.19 }, ...]
 * }
 *
 * GET /api/eval/:version/segments -> ["all", "low-variance", "high-variance", ...]
 * GET /api/eval/:version/metrics?segment=low-variance -> same shape as above (filtered)
 *
 * You can wire these endpoints to Supabase (reads) and your evaluation cache.
 */

const currency = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });

function usePolling<T>(url: string, intervalMs = 30000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetcher() {
    try {
      setError(null);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetcher();
    const id = setInterval(fetcher, intervalMs);
    return () => clearInterval(id);
  }, [url, intervalMs]);

  return { data, loading, error, refresh: fetcher } as const;
}

export default function SubHealthAIInteractiveEval() {
  const [version, setVersion] = useState("phase3-v1");
  const [segment, setSegment] = useState("all");

  const segmentsUrl = useMemo(() => `/api/eval/${version}/segments`, [version]);
  const metricsUrl = useMemo(() => {
    const base = `/api/eval/${version}/metrics`;
    return segment && segment !== "all" ? `${base}?segment=${encodeURIComponent(segment)}` : base;
  }, [version, segment]);

  const { data: segments, loading: segLoading } = usePolling<string[]>(segmentsUrl, 120000);
  const { data: metrics, loading, error, refresh } = usePolling<any>(metricsUrl, 30000);

  const reliability = metrics?.reliability ?? [];
  const volSeries = metrics?.volatility_series ?? [];
  const leadHist = metrics?.lead_time_hist ?? [];
  const shapGlobal = metrics?.shap_global ?? [];

  function exportJSON() {
    if (!metrics) return;
    const blob = new Blob([JSON.stringify(metrics, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${version}_${segment || "all"}_metrics.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-2xl font-semibold tracking-tight">SubHealthAI – Interactive Evaluation</h1>
        <p className="text-sm text-zinc-600 mt-1">Dynamic charts driven by live JSON endpoints. No static PNGs.</p>
      </motion.div>

      <div className="rounded-2xl border border-zinc-800 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-2">
            <label className="text-xs text-zinc-600">Version</label>
            <input 
              value={version} 
              onChange={(e) => setVersion(e.target.value)} 
              placeholder="phase3-v1"
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-600">Segment</label>
            <div className="flex gap-2">
              <input 
                value={segment} 
                onChange={(e) => setSegment(e.target.value)} 
                placeholder="all / low-variance / ..."
                className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={refresh} 
                className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-md text-sm transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {!segLoading && segments && segments.length > 0 && (
              <p className="text-xs text-zinc-600 mt-1">Known: {segments.join(", ")}</p>
            )}
          </div>
          <div className="flex gap-2 md:justify-end">
            <button 
              onClick={exportJSON} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Brier" value={metrics?.overall?.brier} />
        <KPI label="ECE (10-bin)" value={metrics?.overall?.ece} />
        <KPI label="Volatility" value={metrics?.overall?.volatility} />
        <KPI label="Lead mean (days)" value={metrics?.overall?.lead_time_days_mean} />
      </div>

      <Tabs defaultValue="calibration" className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 w-full border border-zinc-300 rounded-lg p-1 bg-zinc-50">
          <TabButton value="calibration" activeValue="calibration">
            <LineChartIcon className="w-4 h-4 mr-2"/>
            Calibration
          </TabButton>
          <TabButton value="volatility" activeValue="calibration">
            <LineChartIcon className="w-4 h-4 mr-2"/>
            Volatility
          </TabButton>
          <TabButton value="lead" activeValue="calibration">
            <BarChart3 className="w-4 h-4 mr-2"/>
            Lead-Time
          </TabButton>
          <TabButton value="shap" activeValue="calibration">
            <BarChart3 className="w-4 h-4 mr-2"/>
            SHAP
          </TabButton>
        </div>

        <TabContent value="calibration" activeValue="calibration">
          <ChartCard title="Reliability Curve" subtitle="Observed vs predicted risk by decile">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={reliability} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bin" tickFormatter={(v) => (v*100).toFixed(0)+"%"} />
                <YAxis domain={[0, 1]} tickFormatter={(v) => (v*100).toFixed(0)+"%"} />
                <Tooltip formatter={(v: any) => typeof v === "number" ? v.toFixed(3) : v} />
                <Legend />
                <Line type="monotone" dataKey="obs" name="Observed" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="pred" name="Predicted" dot={false} strokeWidth={2} />
                {/* perfect diagonal as scatter */}
                <ScatterChart>
                  <Scatter data={reliability.map((d: any) => ({ x: d.bin, y: d.bin }))} fillOpacity={0.0} />
                  <ZAxis range={[0,0]} />
                </ScatterChart>
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabContent>

        <TabContent value="volatility" activeValue="calibration">
          <ChartCard title="Risk Volatility (Δ per day)" subtitle="Mean absolute change in risk score">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={volSeries} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="mean_delta" name="Mean Δ" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabContent>

        <TabContent value="lead" activeValue="calibration">
          <ChartCard title="Lead-Time Distribution" subtitle="Days of advance warning before first event">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={leadHist} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="days" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="# of users" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabContent>

        <TabContent value="shap" activeValue="calibration">
          <ChartCard title="Global Feature Importance (|SHAP|)" subtitle="Mean absolute SHAP values across users/days">
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={shapGlobal} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="feature" width={140} />
                <Tooltip />
                <Legend />
                <Bar dataKey="mean_abs_shap" name="|SHAP|" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </TabContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 p-4 shadow-sm">
      <p className="text-xs text-zinc-600 mb-1">{label}</p>
      <p className="text-xl font-semibold">{typeof value === "number" ? currency.format(value) : "—"}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Simple tab implementation
function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <div className="w-full">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeValue: activeTab, setActiveValue: setActiveTab });
        }
        return child;
      })}
    </div>
  );
}

function TabButton({ value, activeValue, setActiveValue, children }: { 
  value: string; 
  activeValue: string; 
  setActiveValue?: (value: string) => void;
  children: React.ReactNode;
}) {
  const isActive = value === activeValue;
  
  return (
    <button
      onClick={() => setActiveValue?.(value)}
      className={`flex items-center justify-center px-3 py-2 text-sm rounded-md transition-colors ${
        isActive 
          ? "bg-white text-zinc-900 shadow-sm" 
          : "text-zinc-600 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

function TabContent({ value, activeValue, children }: { 
  value: string; 
  activeValue: string; 
  children: React.ReactNode;
}) {
  if (value !== activeValue) return null;
  
  return <div className="mt-4">{children}</div>;
}

/**
 * Example Next.js route (drop into /app/api/eval/[version]/metrics/route.ts):
 *
 * import { NextResponse } from "next/server";
 * import { createClient } from "@supabase/supabase-js";
 *
 * export async function GET(req: Request, { params }: { params: { version: string } }) {
 *   const { searchParams } = new URL(req.url);
 *   const segment = searchParams.get("segment") ?? "all";
 *   const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
 *
 *   // Example: read cached metrics table; or compute on the fly from risk_scores/explain_contribs
 *   const { data: overall } = await supabase
 *     .from("evaluation_cache")
 *     .select("*")
 *     .eq("version", params.version)
 *     .eq("segment", segment)
 *     .single();
 *
 *   // Also fetch reliability bins, volatility series, lead hist, shap global (from child tables or materialized views)
 *   const { data: reliability } = await supabase
 *     .from("eval_reliability")
 *     .select("bin, pred, obs")
 *     .eq("version", params.version)
 *     .eq("segment", segment)
 *     .order("bin");
 *
 *   const { data: volatility_series } = await supabase
 *     .from("eval_volatility_series")
 *     .select("day, mean_delta")
 *     .eq("version", params.version)
 *     .eq("segment", segment)
 *     .order("day");
 *
 *   const { data: lead_time_hist } = await supabase
 *     .from("eval_lead_hist")
 *     .select("days, count")
 *     .eq("version", params.version)
 *     .eq("segment", segment)
 *     .order("days");
 *
 *   const { data: shap_global } = await supabase
 *     .from("eval_shap_global")
 *     .select("feature, mean_abs_shap")
 *     .eq("version", params.version)
 *     .eq("segment", segment)
 *     .order("mean_abs_shap", { ascending: false });
 *
 *   return NextResponse.json({ overall, reliability, volatility_series, lead_time_hist, shap_global });
 * }
 */




