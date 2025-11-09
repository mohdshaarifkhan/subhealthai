"use client";

import { useEffect, useMemo, useState } from "react";

type VolatilityResponse = {
  stability_index?: number | null;
  series?: Array<{ day: string; vol: number }>;
};

export function VolatilityCard({ version = "phase3-v1-wes" }: { version?: string }) {
  const [data, setData] = useState<VolatilityResponse | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch(`/api/volatility?version=${encodeURIComponent(version)}`);
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

  const points = useMemo(() => data?.series ?? [], [data]);
  const max = useMemo(
    () => Math.max(1, ...points.map((p) => (Number.isFinite(p.vol) ? p.vol : 0))),
    [points]
  );

  if (!data) return null;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Volatility</div>
        <div className="text-xs text-gray-500">
          Stability index:{" "}
          {typeof data.stability_index === "number" ? data.stability_index.toFixed(3) : "—"}
        </div>
      </div>

      <svg className="mt-2 h-16 w-full">
        {points.map((p, i) => {
          const x = (i / Math.max(points.length - 1, 1)) * 100;
          const y = 100 - ((Number.isFinite(p.vol) ? p.vol : 0) / max) * 100;
          return <circle key={`${p.day}-${i}`} cx={`${x}%`} cy={`${y}%`} r="2" className="fill-blue-400" />;
        })}
      </svg>

      <p className="mt-2 text-xs text-gray-500">
        Lower and smoother is better (fewer jittery swings day-to-day).
      </p>
    </div>
  );
}


