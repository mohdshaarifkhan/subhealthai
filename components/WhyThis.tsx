"use client";

import { useEffect, useState } from "react";

type Item = { feature: string; shap_value: number };
type ExplResp = { top_contributors: Item[]; rationale: string; day: string };

type Mode = "full" | "lite";

export default function WhyThis({ user, version = "phase3-v1-wes", mode = "full" }: { user: string; version?: string; mode?: Mode }) {
  const [data, setData] = useState<ExplResp | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/explain?user=${encodeURIComponent(user)}&version=${encodeURIComponent(version)}`);
        const json = await res.json();
        if (!ignore && res.ok) {
          setData(json);
        }
      } catch {
        if (!ignore) setData(null);
      }
    }
    if (user) {
      load();
    }
    return () => {
      ignore = true;
    };
  }, [user, version]);

  if (mode === "lite") {
    return <p className="text-sm text-gray-600">{data?.rationale ?? "No rationale available."}</p>;
  }

  if (!data) return null;

  // Legacy full rendering (not currently used)
  return (
    <div className="space-y-3 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify_between">
        <h3 className="font-semibold">Why this score?</h3>
        <span className="text-xs text-gray-500">{new Date(data.day).toDateString()}</span>
      </div>

      <ul className="space-y-2">
        {data.top_contributors.map((it, idx) => (
          <li key={idx} className="flex items-center justify-between">
            <span className="text-sm">{prettyFeature(it.feature)}</span>
            <span className={`text-sm font-mono ${it.shap_value >= 0 ? "text-red-600" : "text-green-600"}`}>
              {it.shap_value >= 0 ? "↑" : "↓"} {Math.abs(it.shap_value).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-sm text-gray-700">{data.rationale}</p>
      <p className="text-xs text-gray-500">
        Positive values increase risk; negative values reduce it. Compared to your own baseline.
      </p>
    </div>
  );
}

function prettyFeature(f: string) {
  const map: Record<string, string> = {
    rhr: "Resting HR",
    hrv_avg: "HRV",
    sleep_minutes: "Sleep minutes",
    steps: "Steps",
    stress_proxy: "Stress proxy",
  };
  return map[f] || f;
}


