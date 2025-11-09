"use client";

import { useEffect, useMemo, useState } from "react";

import { GUIDELINES } from "@/lib/guidelines";
import { joinShapWithSnapshot } from "@/lib/joinExplain";
import { Sparkline } from "@/components/Sparkline";

type ExplainData = {
  day?: string;
  rationale?: string;
  top_contributors?: Array<{ feature: string; shap_value: number }>;
  tips?: string[];
};

type SnapshotResponse = {
  items: Record<
    string,
    {
      unit: string;
      today: number | null;
      baseline: number | null;
      delta: number | null;
      z: number | null;
    }
  >;
};

type TrendSeries = {
  day: string;
  value: number | null;
}[];

export default function ExplainPanel({
  user,
  version,
}: {
  user: string;
  version: string;
}) {
  const [explainData, setExplainData] = useState<ExplainData | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [trendMap, setTrendMap] = useState<Record<string, TrendSeries>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadExplain() {
      setLoading(true);
      setError(null);
      setExplainData(null);
      setSnapshot(null);
      setTrendMap({});

      try {
        const res = await fetch(
          `/api/explain?user=${encodeURIComponent(user)}&version=${encodeURIComponent(version)}`
        );
        const json = await res.json();
        if (ignore) return;
        if (!res.ok) {
          setError(json?.error ?? "Unable to load explainability data.");
        } else {
          setExplainData(json);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unexpected error.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadExplain();
    return () => {
      ignore = true;
    };
  }, [user, version]);

  useEffect(() => {
    let ignore = false;

    async function loadSnapshot(day?: string) {
      if (!day) {
        setSnapshot(null);
        return;
      }
      setSnapshotLoading(true);
      try {
        const res = await fetch(
          `/api/metric_snapshot?user=${encodeURIComponent(user)}&day=${encodeURIComponent(day)}`
        );
        const json = await res.json();
        if (!ignore && res.ok) {
          setSnapshot(json);
        }
      } catch {
        if (!ignore) setSnapshot(null);
      } finally {
        if (!ignore) setSnapshotLoading(false);
      }
    }

    loadSnapshot(explainData?.day);
    return () => {
      ignore = true;
    };
  }, [explainData?.day, user]);

  const merged = useMemo(() => {
    if (!explainData?.top_contributors?.length || !snapshot) return [];
    return joinShapWithSnapshot(explainData.top_contributors, snapshot);
  }, [explainData?.top_contributors, snapshot]);

  const summary = useMemo(() => {
    if (!merged.length) return null;

    const riskShift = merged.reduce((acc, item) => {
      if (item.delta == null) return acc;
      const direction = Math.sign(-item.delta);
      if (!direction) return acc;
      return acc + item.shap * direction;
    }, 0);

    const riskShiftPct = riskShift * 100;
    const magnitude = Math.abs(riskShiftPct);

    let qualifier = "roughly";
    if (magnitude >= 8) qualifier = "significantly";
    else if (magnitude >= 4) qualifier = "moderately";
    else if (magnitude >= 1.5) qualifier = "slightly";

    let direction = "in line";
    if (riskShiftPct <= -1.5) direction = "better";
    else if (riskShiftPct >= 1.5) direction = "worse";

    const summaryLine = direction === "in line"
      ? `Today's physiological state is ${qualifier} aligned with your baseline (${formatPercent(riskShiftPct)} estimated risk shift).`
      : `Today's physiological state is ${qualifier} ${direction} than your baseline (${formatPercent(riskShiftPct)} estimated risk shift).`;

    const driverPhrases = merged
      .slice()
      .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap))
      .slice(0, 2)
      .map((item) => describeDriver(item));

    const driverLine = driverPhrases.length
      ? `Driven by ${driverPhrases.join(" and ")}.`
      : "";

    return { summaryLine, driverLine };
  }, [merged]);

  useEffect(() => {
    if (!merged.length) {
      setTrendMap({});
      return;
    }

    let ignore = false;
    async function loadTrends() {
      setTrendLoading(true);
      try {
        const features = Array.from(new Set(merged.map((m) => m.feature))).join(",");
        const res = await fetch(
          `/api/metric_trends?user=${encodeURIComponent(user)}&features=${encodeURIComponent(features)}&days=7`
        );
        const json = await res.json();
        if (!ignore && res.ok) {
          setTrendMap(json.series ?? {});
        }
      } catch {
        if (!ignore) setTrendMap({});
      } finally {
        if (!ignore) setTrendLoading(false);
      }
    }

    loadTrends();
    return () => {
      ignore = true;
    };
  }, [merged, user]);

  if (loading) return <p>Loading explainability...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!explainData?.top_contributors?.length) return <p>No explainability available yet.</p>;

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Why this score?</h3>
        {(snapshotLoading || trendLoading) && (
          <span className="text-xs text-gray-500">Loading metrics…</span>
        )}
      </div>

      {summary ? (
        <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <p>{summary.summaryLine}</p>
          {summary.driverLine ? (
            <p className="text-xs text-slate-500">{summary.driverLine}</p>
          ) : null}
        </div>
      ) : null}

      {explainData.rationale ? (
        <p className="text-sm text-gray-600">{explainData.rationale}</p>
      ) : (
        <p className="text-sm text-gray-500">No rationale available for this day.</p>
      )}

      <div className="divide-y">
        {merged.map((entry) => (
          <MetricRow
            key={entry.feature}
            {...entry}
            trend={trendMap[entry.feature]}
          />
        ))}
      </div>

      {explainData.tips?.length ? (
        <div className="space-y-1 text-xs text-gray-500">
          {explainData.tips.map((tip) => (
            <p key={tip}>• {tip}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetricRow({
  feature,
  shap,
  unit,
  today,
  baseline,
  delta,
  z,
  trend,
}: {
  feature: string;
  shap: number;
  unit: string;
  today: number | null;
  baseline: number | null;
  delta: number | null;
  z: number | null;
  trend?: TrendSeries;
}) {
  const pretty = (value: number | null) => {
    if (value == null) return "—";
    if (feature === "sleep_debt" && unit === "min") return `${(value / 60).toFixed(1)} h`;
    if ((feature === "hrv" || feature === "hrv_avg") && unit === "ms")
      return `${Math.round(value)} ms`;
    if (feature === "rhr" && unit === "bpm") return `${Math.round(value)} bpm`;
    if ((feature === "forecast_delta" || feature === "steps") && unit === "steps")
      return `${Math.round(value).toLocaleString()} steps`;
    return String(value);
  };

  const deltaDisplay = (() => {
    if (delta == null) return "—";
    if (feature === "sleep_debt") {
      const hours = delta / 60;
      return `${hours > 0 ? "+" : ""}${hours.toFixed(1)} h`;
    }
    if (feature === "forecast_delta" || feature === "steps") {
      return `${delta > 0 ? "+" : ""}${Math.round(delta).toLocaleString()}`;
    }
    return `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`;
  })();

  const zDisplay = z != null ? `${z > 0 ? "+" : ""}${z.toFixed(1)} z` : null;
  const deviationClass = colorForZ(z);
  const barWidth = `${Math.min(50, Math.abs(shap) * 500)}%`;
  const guideline = GUIDELINES[feature] ?? "";
  const sparkColor = shap >= 0 ? "#dc2626" : "#16a34a";
  const trendSeries = trend ?? [];
  const hasTrend = trendSeries.some((point) => point.value != null);
  const baselineValue = baseline ?? null;

  return (
    <div className="py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1 text-sm">
          <div className="font-semibold capitalize">{feature.replace(/_/g, " ")}</div>
          <div className="text-gray-600">
            <span>{pretty(today)}</span>
            <span className="mx-1">•</span>
            <span>baseline {pretty(baseline)}</span>
            <span className="mx-1">•</span>
            <span>
              Δ <span className={`${deviationClass} font-medium`}>{deltaDisplay}</span>
              {zDisplay ? (
                <span className={`${deviationClass} font-medium ml-1`}>({zDisplay})</span>
              ) : null}
            </span>
          </div>
        </div>
        {hasTrend ? (
          <Sparkline
            points={trendSeries}
            width={120}
            height={28}
            color={sparkColor}
            baseline={baselineValue}
          />
        ) : null}
      </div>
      <div className="relative mt-1 h-2 w-full rounded-full bg-gray-100">
        <div
          className={`absolute top-0 h-2 rounded-full ${shap >= 0 ? "bg-red-400" : "bg-green-400"}`}
          style={{
            left: "50%",
            width: barWidth,
            transform: shap < 0 ? "translateX(-100%)" : "none",
          }}
        />
      </div>
      {guideline ? <div className="mt-1 text-xs text-gray-500">{guideline}</div> : null}
    </div>
  );
}

function colorForZ(z: number | null) {
  if (z == null) return "text-gray-500";
  if (z > 1.5) return "text-red-600";
  if (z < -1.5) return "text-green-600";
  return "text-yellow-600";
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

const DRIVER_LABELS: Record<string, string> = {
  rhr: "resting HR",
  hrv: "HRV",
  hrv_avg: "HRV",
  sleep_debt: "sleep duration",
  sleep_minutes: "sleep duration",
  forecast_delta: "activity pattern",
  steps: "activity pattern",
};

function describeDriver(item: {
  feature: string;
  delta: number | null;
}) {
  const label = DRIVER_LABELS[item.feature] ?? item.feature.replace(/_/g, " ");
  if (item.delta == null) {
    return `stable ${label}`;
  }
  const absDelta = Math.abs(item.delta);
  const isSmall = absDelta < 0.05 * Math.abs(item.delta || 1) + 1;
  if (isSmall) return `stable ${label}`;

  const direction = item.delta > 0 ? "higher" : "lower";
  return `${direction} ${label}`;
}

