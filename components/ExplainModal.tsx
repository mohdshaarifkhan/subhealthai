"use client";
import { useEffect, useState } from "react";

export default function ExplainModal({
  userId,
  open,
  onClose
}: { userId: string; open: boolean; onClose: () => void }) {
  const [payload, setPayload] = useState<null | {
    day: string; riskPercent: number; modelVersion: string;
    reasons: string[]; imageUrl?: string; disclaimer: string;
  }>(null);

  useEffect(() => {
    if (open) {
      fetch(`/api/risk/explain?user=${userId}`)
        .then(r => r.json())
        .then(setPayload)
        .catch(() => setPayload(null));
    }
  }, [open, userId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Why this risk score?</h3>
          <button className="text-sm opacity-70 hover:opacity-100" onClick={onClose}>Close</button>
        </div>

        {payload ? (
          <>
            <div className="text-sm text-muted-foreground">
              Latest: <span className="font-medium">{payload.day}</span> • Model: <code>{payload.modelVersion}</code> • Risk: <span className="font-medium">{payload.riskPercent}%</span>
            </div>

            <ul className="mt-3 list-disc pl-5 space-y-1 text-sm">
              {payload.reasons.length ? payload.reasons.map((r, i) => (<li key={i}>{r}</li>)) : (
                <li>No major deviations from baseline detected.</li>
              )}
            </ul>

            {payload.imageUrl && (
              <div className="mt-4">
                <img src={payload.imageUrl} alt="Explainability plot" className="rounded-lg border" />
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">{payload.disclaimer}</p>
          </>
        ) : (
          <div className="text-sm">Loading…</div>
        )}
      </div>
    </div>
  );
}
