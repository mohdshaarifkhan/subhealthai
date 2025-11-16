"use client";

import { useEffect, useState } from "react";

type TrendRow = {
  day: string;
  steps: number | null;
  sleep_min: number | null;
  hr_avg: number | null;
  hrv_avg: number | null;
  rhr: number | null;
};

export function Last7Table({ user }: { user: string }) {
  const [rows, setRows] = useState<TrendRow[]>([]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/trends?user=${encodeURIComponent(user)}&days=7`
        );
        const json = await res.json();
        if (!ignore) {
          setRows(json?.table || []);
        }
      } catch {
        if (!ignore) {
          setRows([]);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [user]);

  if (!rows.length) return null;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-2 font-semibold">Last 7 Days (metrics)</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1 pr-3">Day</th>
              <th className="py-1 pr-3">Steps</th>
              <th className="py-1 pr-3">Sleep (min)</th>
              <th className="py-1 pr-3">HR avg</th>
              <th className="py-1 pr-3">HRV avg</th>
              <th className="py-1 pr-0">RHR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.day}-${i}`} className="border-t">
                <td className="py-1 pr-3">{r.day}</td>
                <td className="py-1 pr-3">{r.steps ?? "—"}</td>
                <td className="py-1 pr-3">{r.sleep_min ?? "—"}</td>
                <td className="py-1 pr-3">
                  {typeof r.hr_avg === "number" ? r.hr_avg.toFixed(1) : "—"}
                </td>
                <td className="py-1 pr-3">
                  {typeof r.hrv_avg === "number" ? r.hrv_avg.toFixed(1) : "—"}
                </td>
                <td className="py-1 pr-0">
                  {typeof r.rhr === "number" ? r.rhr.toFixed(1) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


