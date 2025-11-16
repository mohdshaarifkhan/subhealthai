"use client";

import * as React from "react";
import RiskBadge from "@/components/RiskBadge";
import InfoIcon from "@/components/icons/InfoIcon";

type Tier = "low" | "moderate" | "high";
type ConditionRisk = {
  condition:
    | "prediabetes"
    | "kidney_function"
    | "metabolic_strain"
    | "thyroid"
    | "cardio_pattern"
    | "inflammatory_load"
    | "allergy_burden"
    | "autonomic_recovery";
  index: number; // 0..1
  tier: Tier;
  reasons: string[];
  dataSources: string[];
};
type ApiResponse = {
  overall: {
    overall_index: number;
    overall_tier: Tier;
  };
  conditions: ConditionRisk[];
  disclaimer: string;
};

const CONDITION_LABELS: Record<ConditionRisk["condition"], string> = {
  prediabetes: "Prediabetes Pattern",
  kidney_function: "Kidney Function Pattern",
  metabolic_strain: "Metabolic Strain Pattern",
  thyroid: "Thyroid Pattern",
  cardio_pattern: "Cardio-Metabolic Pattern",
  inflammatory_load: "Inflammatory Load",
  allergy_burden: "Allergy Burden",
  autonomic_recovery: "Autonomic Recovery Pattern",
};

const CONDITION_HINTS: Record<ConditionRisk["condition"], string> = {
  prediabetes:
    "Based on HbA1c, fasting glucose, BMI, activity level, and family history.",
  kidney_function:
    "Based on eGFR, creatinine, and BUN patterns versus typical reference values.",
  metabolic_strain:
    "Based on liver enzymes, triglycerides, BMI, sleep debt, and alcohol intake.",
  thyroid:
    "Based on TSH values compared to typical reference ranges (hyper/hypo patterns).",
  cardio_pattern:
    "Based on blood pressure, cholesterol profile, and BMI.",
  inflammatory_load:
    "Based on IgE, allergy symptoms, sleep debt, and stress-related context.",
  allergy_burden:
    "Based on IgE levels, sensitization to specific allergens, and allergy-like symptoms.",
  autonomic_recovery:
    "Based on HRV, resting HR, sleep debt, and activity relative to guidelines.",
};

function formatPercent(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function tierColor(tier: Tier): string {
  if (tier === "high") return "bg-red-500";
  if (tier === "moderate") return "bg-yellow-500";
  return "bg-emerald-500";
}

export default function MultimodalRiskPanel() {
  const [data, setData] = React.useState<ApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/multimodal_risk");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Unable to load multimodal risk patterns right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl shadow-sm border bg-card">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Multimodal Risk Patterns</h3>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent inline-block" />
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Fetching condition-level patterns from labs, vitals, lifestyle, and wearable data…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-2xl shadow-sm border bg-card">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Multimodal Risk Patterns</h3>
          <span className="text-yellow-600">!</span>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {error ?? "No multimodal risk patterns are available yet. Try adding labs, vitals, lifestyle, or wearable data."}
        </div>
      </div>
    );
  }

  const { overall, conditions, disclaimer } = data;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl shadow-sm border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Overall Multimodal Pattern</h3>
            <p className="text-xs text-muted-foreground">
              Combined signal from labs, vitals, lifestyle, allergies, and wearable data.
            </p>
          </div>
          <RiskBadge score={overall.overall_index} />
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-3xl font-semibold">{formatPercent(overall.overall_index)}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">non-diagnostic risk index</span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-muted">
          <div
            className={`h-2 rounded-full ${tierColor(overall.overall_tier)}`}
            style={{ width: `${Math.max(overall.overall_index * 100, 4)}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Higher values indicate stronger pattern overlap with known subclinical risk profiles. This does <strong>not</strong> confirm or
          rule out any diagnosis.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {conditions.map((c) => (
          <div key={c.condition} className="p-4 rounded-2xl shadow-sm border bg-card flex flex-col justify-between">
            <div className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-medium">{CONDITION_LABELS[c.condition]}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{CONDITION_HINTS[c.condition]}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold">{formatPercent(c.index)}</span>
                  <span
                    className={`text-[10px] inline-flex items-center rounded-full px-2 py-1 text-white ${
                      c.tier === "high" ? "bg-red-600" : c.tier === "moderate" ? "bg-yellow-600" : "bg-emerald-600"
                    }`}
                  >
                    {c.tier === "low" ? "Low pattern" : c.tier === "moderate" ? "Moderate" : "Higher pattern"}
                  </span>
                </div>
              </div>
            </div>
            <div className="pt-0">
              {c.reasons && c.reasons.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {c.reasons.slice(0, 4).map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Not enough information to compute detailed reasons. Adding labs, vitals, lifestyle, or allergy data can refine this pattern.
                </p>
              )}
              {c.dataSources && c.dataSources.length > 0 && (
                <p className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">Sources: {c.dataSources.join(" · ")}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-xl border border-dashed bg-card/50 flex items-start gap-2">
        <InfoIcon className="h-4 w-4 mt-0.5" />
        <div>
          <div className="text-xs font-semibold">Non-diagnostic research tool</div>
          <div className="text-xs text-muted-foreground">{disclaimer}</div>
        </div>
      </div>
    </div>
  );
}


