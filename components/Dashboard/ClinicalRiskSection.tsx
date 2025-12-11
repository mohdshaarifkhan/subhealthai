// components/dashboard/ClinicalRiskSection.tsx
"use client";

import React from "react";

export type ClinicalCondition = {
  name: string;
  shortName: string;
  riskPercent: number;
  riskTier: "Low" | "Moderate" | "High";
  modelId: string;
  dataSource: string;
  notes?: string;
};

type Props = {
  conditions: ClinicalCondition[];
  overallInstability?: number;
  drivers?: { factor: string; impact: string }[];
};

const tierColor: Record<ClinicalCondition["riskTier"], string> = {
  Low: "text-emerald-400 border-emerald-500/40 bg-emerald-500/5",
  Moderate: "text-amber-400 border-amber-500/40 bg-amber-500/5",
  High: "text-rose-400 border-rose-500/40 bg-rose-500/5",
};

export const ClinicalRiskSection: React.FC<Props> = ({
  conditions,
  overallInstability,
  drivers,
}) => {
  if (!conditions?.length) return null;

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-200/90">
            Chronic Disease Risk Snapshot
          </h2>
          <p className="text-xs text-slate-400/80">
            Non-diagnostic preview of metabolic and cardiovascular risk using
            structured labs + vitals.
          </p>
        </div>
        {typeof overallInstability === "number" && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Model Instability Lens
            </p>
            <p className="text-sm font-semibold text-slate-100">
              {overallInstability.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {conditions.map((c) => (
          <div
            key={c.shortName}
            className="rounded-2xl border border-slate-700/60 bg-slate-900/60 px-3.5 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.7)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {c.shortName}
                </p>
                <p className="text-xs text-slate-400">{c.name}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-slate-50">
                  {c.riskPercent.toFixed(1)}%
                </p>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${tierColor[c.riskTier]}`}
                >
                  {c.riskTier} risk
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                Model: <span className="text-slate-300">{c.modelId}</span>
              </p>
              <p className="text-[11px] text-slate-500 text-right">
                Data: <span className="text-slate-300">{c.dataSource}</span>
              </p>
            </div>
            {c.notes && (
              <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
                {c.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {drivers && drivers.length > 0 && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 px-3.5 py-2.5">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Model Drivers (fusion of labs + wearable load)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {drivers.map((d, idx) => (
              <span
                key={`${d.factor}-${idx}`}
                className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-200"
              >
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                {d.factor}
                <span className="ml-1 text-[10px] text-slate-400">
                  · {d.impact}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

