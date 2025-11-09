"use client";

import { useEffect, useState } from "react";

import { riskColor, toPct } from "@/lib/riskFormat";

type RiskResp = {
  user: string;
  version: string;
  forecast_risk?: number;
  last_update?: string;
  non_diagnostic?: boolean;
  day?: string;
  message?: string;
};

type ExplainResp = {
  user: string;
  version: string;
  day: string;
  top_contributors: { feature: string; shap_value: number }[];
  rationale: string;
  tips?: string[];
};

type ChipVariant = "default" | "outline" | "danger" | "success";

export default function RiskCard({
  user,
  version = "phase3-v1-wes",
}: {
  user: string;
  version?: string;
}) {
  const [risk, setRisk] = useState<RiskResp | null>(null);
  const [explain, setExplain] = useState<ExplainResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      setRisk(null);
      setExplain(null);

      try {
        const res = await fetch(
          `/api/risk?user=${encodeURIComponent(user)}&version=${encodeURIComponent(version)}`
        );
        const json = await res.json();
        if (ignore) return;

        if (!res.ok) {
          setError(json?.error || "Unable to load risk right now.");
          return;
        }

        setRisk(json);

        if (json?.forecast_risk || json?.forecast_risk === 0) {
          if (json?.day) {
            setInsightLoading(true);
            try {
              const explainRes = await fetch(
                `/api/explain?user=${encodeURIComponent(user)}&version=${encodeURIComponent(
                  version
                )}&day=${encodeURIComponent(json.day)}`
              );
              const explainJson = await explainRes.json();
              if (!ignore && explainRes.ok) {
                setExplain(explainJson);
              }
            } catch {
              if (!ignore) setExplain(null);
            } finally {
              if (!ignore) setInsightLoading(false);
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Unexpected error.");
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
    return (
      <CardContainer>
        <p className="text-sm text-gray-500">Loading risk…</p>
      </CardContainer>
    );
  }

  if (error) {
    return (
      <CardContainer>
        <p className="text-sm text-red-600">{error}</p>
      </CardContainer>
    );
  }

  if (!risk?.forecast_risk && risk?.forecast_risk !== 0) {
    return (
      <CardContainer>
        <p className="text-sm text-gray-700">
          {risk?.message ?? "No risk available for this user right now."}
        </p>
        <NonDiagnosticBanner nonDiagnostic={risk?.non_diagnostic} />
      </CardContainer>
    );
  }

  const badge = riskColor(risk.forecast_risk);
  const metaChips: ChipProps[] = [
    { label: "Model", value: risk.version },
  ];

  if (risk.last_update) {
    metaChips.push({
      label: "Last update",
      value: new Date(risk.last_update).toLocaleString(),
    });
  }

  if (risk.day) {
    metaChips.push({
      label: "Day",
      value: new Date(risk.day).toLocaleDateString(),
    });
  }

  const contributorChips: ChipProps[] =
    explain?.top_contributors?.map((c) => ({
      label: c.feature,
      value: c.shap_value >= 0 ? "↑ risk" : "↓ risk",
      variant: c.shap_value >= 0 ? "danger" : "success",
    })) ?? [];

  return (
    <CardContainer>
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Forecast Risk</h2>
          <p className="text-xs text-gray-500">
            Probability of instability today vs. your baseline.
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge}`}>
          {toPct(risk.forecast_risk)}
        </span>
      </header>

      <ChipGroup title="Summary" chips={metaChips} />

      <section className="space-y-2">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Why this risk?</h3>
          {insightLoading && (
            <span className="text-xs text-gray-500">Loading insights…</span>
          )}
        </header>
        {explain?.rationale ? (
          <p className="text-sm text-gray-600">{explain.rationale}</p>
        ) : (
          !insightLoading && (
            <p className="text-sm text-gray-500">
              No contributing factors available for this day.
            </p>
          )
        )}
        {!!contributorChips.length && (
          <ChipGroup chips={contributorChips} />
        )}
        {explain?.tips?.length ? (
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
            {explain.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <NonDiagnosticBanner nonDiagnostic={risk.non_diagnostic} />
    </CardContainer>
  );
}

function CardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">{children}</div>
  );
}

type ChipProps = {
  label: string;
  value: string;
  variant?: ChipVariant;
};

function ChipGroup({
  title,
  chips,
}: {
  title?: string;
  chips: ChipProps[];
}) {
  if (!chips.length) return null;

  return (
    <div className="space-y-1">
      {title ? <h3 className="text-sm font-medium text-gray-900">{title}</h3> : null}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Chip key={`${chip.label}-${chip.value}`} {...chip} />
        ))}
      </div>
    </div>
  );
}

function Chip({ label, value, variant = "default" }: ChipProps) {
  const styles: Record<ChipVariant, string> = {
    default: "bg-gray-100 text-gray-700",
    outline: "border border-gray-200 text-gray-700",
    danger: "bg-red-100 text-red-800",
    success: "bg-green-100 text-green-800",
  };
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${styles[variant]}`}>
      <span className="uppercase tracking-wide text-[10px] text-gray-500">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function NonDiagnosticBanner({ nonDiagnostic }: { nonDiagnostic?: boolean }) {
  const text = nonDiagnostic
    ? "Non-diagnostic indicator intended for preventive context and clinician discussion only."
    : "This AI insight is informational and not a diagnosis. Share with your clinician for context.";

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      {text}
    </div>
  );
}


