"use client";

import { useEffect, useMemo, useState } from "react";

import { Sparkline } from "./Sparkline";

import { METRIC_META, MetricKey, chipForDirection, colorForDirection, fmtNum } from "@/lib/metrics";

type AnomalyRow = {
  signal: string;
  today: number | null;
  baseline_mean: number | null;
  baseline_std: number | null;
  delta?: number | null;
  z?: number | null;
  flag?: boolean | null;
};

type TrendResponse = {
  series?: Array<{ day: string; value: number | null }>;
  points?: Array<{ value: number | null }>;
};

export default function InsightCard({ user, metric }: { user: string; metric: MetricKey }) {
  const meta = METRIC_META[metric];
  const [row, setRow] = useState<AnomalyRow | null>(null);
  const [trend, setTrend] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const anomaly = await fetch(`/api/anomaly?user=${encodeURIComponent(user)}`, {
          cache: "no-store",
        }).then((res) => res.json());
        const found = (anomaly?.items || []).find((item: any) => item.signal === metric);
        if (mounted) setRow(found || null);
      } catch {
        if (mounted) setRow(null);
      }

      try {
        const trendData: TrendResponse = await fetch(
          `/api/metric_trend?user=${encodeURIComponent(user)}&metric=${encodeURIComponent(metric)}&days=7`,
          { cache: "no-store" }
        ).then((res) => res.json());

        let series: number[] = [];
        if (Array.isArray(trendData.series)) {
          series = trendData.series.map((entry) => Number(entry.value)).filter((value) => Number.isFinite(value));
        } else if (Array.isArray(trendData.points)) {
          series = trendData.points
            .map((entry) => Number(entry.value))
            .filter((value) => Number.isFinite(value));
        }

        if (mounted) {
          setTrend(series.length ? series : null);
        }
      } catch {
        if (mounted) setTrend(null);
      }

      if (mounted) setLoading(false);
    }

    if (user) {
      load();
    } else {
      setRow(null);
      setTrend(null);
    }

    return () => {
      mounted = false;
    };
  }, [user, metric]);

  const z = row?.z ?? null;
  const dir = useMemo(() => {
    if (z == null) return "neutral";
    return METRIC_META[metric].direction(Number(z));
  }, [metric, z]);

  const delta = useMemo(() => {
    if (row?.delta != null) return row.delta;
    if (row?.today != null && row?.baseline_mean != null) {
      return row.today - row.baseline_mean;
    }
    return null;
  }, [row?.delta, row?.today, row?.baseline_mean]);

  const deltaPct = useMemo(() => {
    if (row?.today == null || row?.baseline_mean == null || row.baseline_mean === 0) return null;
    return ((row.today - row.baseline_mean) / row.baseline_mean) * 100;
  }, [row?.today, row?.baseline_mean]);

  return (
    <div className={`rounded-2xl border p-4 transition ${colorForDirection(dir)}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">{meta.label}</div>
          <div className="text-2xl font-semibold">
            {fmtNum(row?.today, metric === "steps" ? 0 : 1)}
            {meta.unit ? ` ${meta.unit}` : ""}
          </div>
        </div>
        <div className={`rounded-full px-2 py-1 text-xs ${chipForDirection(dir)}`}>
          {dir === "risk" ? "Risk-raising" : dir === "protective" ? "Protective" : "Neutral"}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-700">
        <span className="inline-flex items-center gap-1">
          <span className="text-gray-500">Baseline:</span>
          <span className="font-medium">
            {fmtNum(row?.baseline_mean, metric === "steps" ? 0 : 1)}
            {meta.unit ? ` ${meta.unit}` : ""}
          </span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-gray-500">Δ:</span>
          <span className="font-medium">
            {fmtNum(delta, metric === "steps" ? 0 : 1)}
            {meta.unit ? ` ${meta.unit}` : ""}
            {deltaPct == null ? "" : ` (${fmtNum(deltaPct, 0)}%)`}
          </span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-gray-500">z:</span>
          <span className="font-medium">{fmtNum(z, 2)}</span>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-600">{meta.guideline}</div>
        <div className="shrink-0 text-gray-600">
          {trend ? (
            <Sparkline points={trend.map((v: number) => ({ value: v }))} />
          ) : (
            <div className="text-xs text-gray-400">no trend</div>
          )}
        </div>
      </div>

      {loading ? <div className="mt-3 text-xs text-gray-400">loading…</div> : null}
      {row?.flag ? (
        <div className="mt-3 rounded bg-red-100 px-2 py-1 text-xs text-red-700">
          Flag: deviation outside normal range today.
        </div>
      ) : null}
    </div>
  );
}


