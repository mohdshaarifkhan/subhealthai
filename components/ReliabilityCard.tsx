"use client";

import { useEffect, useState } from "react";

type ReliabilityResponse = {
  ece?: number | null;
  brier?: number | null;
  bins?: Array<{
    predicted_prob: number;
    observed_rate: number;
    n: number;
    bin: number;
  }>;
};

export function ReliabilityCard({ version = "phase3-v1-wes" }: { version?: string }) {
  const [data, setData] = useState<ReliabilityResponse | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch(`/api/reliability?version=${encodeURIComponent(version)}`);
        const json = await res.json();
        if (!ignore) {
          setData(json);
        }
      } catch {
        if (!ignore) {
          setData(null);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [version]);

  if (!data) return null;

  const bins = data.bins ?? [];
  const barWidth = `${Math.max(2, 100 / Math.max(bins.length, 10) - 2)}%`;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Reliability (Calibration)</div>
        <div className="text-xs text-gray-500">
          ECE: {typeof data.ece === "number" ? data.ece.toFixed(3) : "—"} • Brier:{" "}
          {typeof data.brier === "number" ? data.brier.toFixed(3) : "—"}
        </div>
      </div>

      <div className="relative mt-3 h-40 w-full overflow-hidden rounded-md bg-gray-50">
        <svg className="absolute inset-0 h-full w-full">
          <line x1="0" y1="100%" x2="100%" y2="0" stroke="currentColor" strokeOpacity="0.2" />
        </svg>
        <div className="absolute inset-0 flex items-end gap-1 px-2">
          {bins.map((bin, idx) => {
            const predicted = clamp(Number(bin.predicted_prob));
            const observed = clamp(Number(bin.observed_rate));
            return (
              <div
                key={`${bin.bin}-${idx}`}
                className="flex flex-1 flex-col items-center"
                style={{ width: barWidth }}
              >
                <div
                  className="w-full rounded-sm bg-gray-200"
                  style={{ height: `${observed * 100}%` }}
                  title={`Observed ${(observed * 100).toFixed(1)}%`}
                />
                <div
                  className="mt-0.5 w-full rounded-sm bg-black/40"
                  style={{ height: `${predicted * 100}%` }}
                  title={`Predicted ${(predicted * 100).toFixed(1)}%`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Bars show observed (light) vs predicted (dark). Closer to the diagonal means better
        calibration.
      </p>
    </div>
  );
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}


