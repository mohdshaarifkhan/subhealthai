"use client";

import { useEffect, useState } from "react";

import { riskColor, toPct } from "@/lib/riskFormat";

type SummaryResponse = {
  baseline: { day: string; model: string; risk: number } | null;
  forecast: { day: string; model: string; risk: number; updated_at?: string | null } | null;
  last14: Array<{ day: string; risk: number }>;
};

export default function Summary({
  user,
  version = "phase3-v1-wes",
}: {
  user: string;
  version?: string;
}) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/summary?user=${encodeURIComponent(user)}&version=${encodeURIComponent(version)}`
        );
        const json = await res.json();

        if (ignore) return;

        if (!res.ok) {
          setError(json?.error ?? "Unable to load summary.");
          setData(null);
        } else {
          setData(json);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unexpected error.");
          setData(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [user, version]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading summary…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card
        title="Latest Baseline"
        kpi={data.baseline ? toPct(data.baseline.risk) : "—"}
        badgeClass={riskColor(data.baseline?.risk)}
        sub={data.baseline ? `${data.baseline.day} • ${data.baseline.model}` : "—"}
      />
      <Card
        title="Most Recent Forecast"
        kpi={data.forecast ? toPct(data.forecast.risk) : "—"}
        badgeClass={riskColor(data.forecast?.risk)}
        sub={
          data.forecast
            ? `${data.forecast.day} • ${data.forecast.model}`
            : "—"
        }
      />
      <TrendCard title="14-day Trend" series={data.last14} />
    </div>
  );
}

function Card({
  title,
  kpi,
  sub,
  badgeClass,
}: {
  title: string;
  kpi: string;
  sub?: string;
  badgeClass?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-1">
        <span className={`rounded-full px-3 py-1 text-sm ${badgeClass || "bg-gray-100 text-gray-700"}`}>
          {kpi}
        </span>
      </div>
      <div className="mt-2 text-xs text-gray-500">{sub ?? ""}</div>
    </div>
  );
}

function TrendCard({
  title,
  series,
}: {
  title: string;
  series: { day: string; risk: number }[];
}) {
  const points = series?.map((d, i) => ({ x: i, y: Math.round((d?.risk || 0) * 100) })) || [];
  const max = Math.max(1, ...points.map((p) => p.y));

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <svg className="mt-2 h-16 w-full">
        {points.map((p, i) => {
          const x = (i / Math.max(points.length - 1, 1)) * 100;
          const width = Math.max(0, 100 / Math.max(points.length, 1) - 2);
          const height = (p.y / max) * 100;
          return (
            <rect
              key={`${p.x}-${p.y}-${i}`}
              x={`${x}%`}
              y={`${100 - height}%`}
              width={`${width}%`}
              height={`${height}%`}
              rx="2"
              className="fill-blue-300"
            />
          );
        })}
      </svg>
    </div>
  );
}


