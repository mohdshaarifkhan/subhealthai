import { useEffect, useMemo, useState } from "react";

import { confidenceFromCalibration } from "@/lib/calcConfidence";

type RiskResponse = {
  forecast_risk?: number;
  baseline_risk?: number;
  message?: string;
};

type ReliabilityResponse = {
  points?: Array<{ pred: number; obs: number; n: number }>;
};

type SummaryResponse = {
  summary?: string;
};

function pct(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value) * 100)}%`;
}

export default function RiskHero({ user, version = "phase3-v1-wes" }: { user: string; version?: string }) {
  const [risk, setRisk] = useState<RiskResponse | null>(null);
  const [reliability, setReliability] = useState<ReliabilityResponse | null>(null);
  const [summary, setSummary] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const riskRes = await fetch(
          `/api/risk?user=${encodeURIComponent(user)}&version=${encodeURIComponent(version)}`,
          { cache: "no-store" }
        ).then((res) => res.json());
        if (mounted) setRisk(riskRes);
      } catch {
        if (mounted) setRisk(null);
      }

      try {
        const relRes = await fetch(
          `/api/reliability?version=${encodeURIComponent(version)}`,
          { cache: "no-store" }
        ).then((res) => res.json());
        if (mounted) setReliability(relRes);
      } catch {
        if (mounted) setReliability(null);
      }

      try {
        const summaryRes: SummaryResponse = await fetch(
          `/api/explain/summary?user=${encodeURIComponent(user)}&version=${encodeURIComponent(version)}`,
          { cache: "no-store" }
        ).then((res) => res.json());
        if (mounted) setSummary(summaryRes?.summary ?? "");
      } catch {
        if (mounted) setSummary("");
      }
    }

    if (user) {
      load();
    } else {
      setRisk(null);
      setReliability(null);
      setSummary("");
    }

    return () => {
      mounted = false;
    };
  }, [user, version]);

  const confidence = useMemo(() => {
    if (risk?.forecast_risk == null || !reliability?.points) return { level: "—", gap: null };
    return confidenceFromCalibration(Number(risk.forecast_risk), reliability.points);
  }, [risk?.forecast_risk, reliability?.points]);

  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm md:flex-row md:items-center">
      <div className="space-y-2">
        <div className="text-sm text-gray-500">Forecast Risk (model {version})</div>
        <div className="text-4xl font-bold text-gray-900">{pct(risk?.forecast_risk ?? null)}</div>
        <div className="text-sm text-gray-700">{summary || "No clear contributing factors today."}</div>
        <div className="text-xs text-gray-500">Non-diagnostic. Compared to your own baseline.</div>
      </div>

      <div className="flex flex-col items-end gap-2 text-xs text-gray-600">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
            Confidence: {confidence.level}
            {confidence.gap != null ? ` (gap ${confidence.gap})` : ""}
          </span>
          {risk?.baseline_risk != null ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Baseline: {pct(risk.baseline_risk)}</span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <QuickAction label="Why this score?" q="Explain today's risk" user={user} version={version} />
          <QuickAction label="Baseline z-scores" q="Show baseline z-scores" user={user} version={version} />
          <QuickAction label="Weekly PDF" q="Download my weekly report" user={user} version={version} />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, q, user, version }: { label: string; q: string; user: string; version: string }) {
  async function click() {
    try {
      const res = await fetch("/api/copilot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, version, query: q }),
      });
      const json = await res.json();
      if (json?.blocks?.[0]?.href) {
        window.open(json.blocks[0].href, "_blank");
      } else {
        alert(json?.answer || "No answer");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to complete action.");
    }
  }

  return (
    <button
      onClick={click}
      type="button"
      className="rounded bg-black px-3 py-1 text-xs font-medium text-white hover:bg-gray-900"
    >
      {label}
    </button>
  );
}


