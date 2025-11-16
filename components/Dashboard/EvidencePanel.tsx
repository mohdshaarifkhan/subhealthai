"use client";

import * as React from "react";

type HealthResponse = {
  status: "ok" | "degraded" | string;
  engine_version: string;
  db: {
    ok: boolean;
    risk_scores_accessible: boolean;
  };
  jobs: {
    last_risk_job_at: string | null;
    last_export_at: string | null;
  };
  time_utc: string;
};

type EvidenceBundle = {
  id: string;
  created_at: string;
  label: string | null;
  engine_version: string | null;
  export_zip_url: string | null;
  metrics_csv_url: string | null;
  risk_scores_csv_url: string | null;
  shap_csv_url: string | null;
  reliability_csv_url: string | null;
  volatility_csv_url: string | null;
  plots_base_url: string | null;
  notes: string | null;
};

type EvidenceResponse = { ok: true; bundle: EvidenceBundle } | { ok: false; message: string };

function formatDateTime(dt: string | null) {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch {
    return dt;
  }
}

export default function EvidencePanel() {
  const [health, setHealth] = React.useState<HealthResponse | null>(null);
  const [evidence, setEvidence] = React.useState<EvidenceResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const [healthRes, evidRes] = await Promise.allSettled([fetch("/api/health"), fetch("/api/evidence/latest")]);
        if (!cancelled) {
          if (healthRes.status === "fulfilled" && (healthRes.value as Response).ok) {
            const json = (await (healthRes.value as Response).json()) as HealthResponse;
            setHealth(json);
          } else {
            setHealth(null);
          }
          if (evidRes.status === "fulfilled" && (evidRes.value as Response).ok) {
            const json = (await (evidRes.value as Response).json()) as EvidenceResponse;
            setEvidence(json);
          } else {
            setEvidence({ ok: false, message: "Unable to load evidence bundle." });
          }
        }
      } catch {
        if (!cancelled) {
          setHealth(null);
          setEvidence({ ok: false, message: "Unable to load evidence bundle." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl border bg-card">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Evidence & Engine Status</h3>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent inline-block" />
        </div>
        <div className="mt-2 text-sm text-muted-foreground">Loading engine status and evidence bundle…</div>
      </div>
    );
  }

  const statusBadge =
    health?.status === "ok"
      ? "bg-emerald-600 text-white"
      : health?.status
      ? "bg-red-600 text-white"
      : "bg-gray-300 text-gray-800";

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Engine & Health</h3>
          </div>
          {health && <span className={`text-xs px-2 py-1 rounded-full ${statusBadge}`}>{health.status === "ok" ? "Healthy" : health.status || "Unknown"}</span>}
        </div>
        <div className="mt-2 space-y-2 text-xs">
          {health ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  <span className="font-semibold">Engine version:</span> {health.engine_version}
                </span>
                <span>
                  <span className="font-semibold">Risk scores table:</span> {health.db.risk_scores_accessible ? "OK" : "Unavailable"}
                </span>
                <span>
                  <span className="font-semibold">DB status:</span> {health.db.ok ? "OK" : "Degraded"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                <span>Last risk job: {formatDateTime(health.jobs.last_risk_job_at)}</span>
                <span>Last export: {formatDateTime(health.jobs.last_export_at)}</span>
                <span>Health time (UTC): {formatDateTime(health.time_utc)}</span>
              </div>
              <div className="mt-2 p-3 rounded-xl border border-dashed">
                <div className="text-xs font-semibold">Reviewer note</div>
                <div className="text-xs">
                  This section shows that the SubHealthAI engine is versioned and that key tables and jobs are reachable at the time of
                  review. It is intended for peer reviewers, lawyers, and regulators.
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Health status is currently unavailable.</p>
          )}
        </div>
      </div>

      <div className="p-4 rounded-2xl border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Evidence Bundle</h3>
          </div>
        </div>
        <div className="mt-2 space-y-3 text-xs">
          {!evidence || (evidence as any).ok === false ? (
            <p className="text-xs text-muted-foreground">
              {(evidence as any)?.message ?? "No evidence bundle is registered yet. Once exports are generated, they will appear here."}
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <div>
                  <span className="font-semibold">Label:</span> {(evidence as any).bundle.label || "Unnamed evidence bundle"}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-semibold">Created at:</span> {formatDateTime((evidence as any).bundle.created_at)}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-semibold">Engine version:</span> {(evidence as any).bundle.engine_version || "—"}
                </div>
              </div>
              {(evidence as any).bundle.notes && <div className="text-xs text-muted-foreground">{(evidence as any).bundle.notes}</div>}
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {[
                  [(evidence as any).bundle.export_zip_url, "Download ZIP (all evidence)"],
                  [(evidence as any).bundle.metrics_csv_url, "Metrics CSV"],
                  [(evidence as any).bundle.risk_scores_csv_url, "Risk Scores CSV"],
                  [(evidence as any).bundle.shap_csv_url, "SHAP CSV"],
                  [(evidence as any).bundle.reliability_csv_url, "Reliability CSV"],
                  [(evidence as any).bundle.volatility_csv_url, "Volatility CSV"],
                  [(evidence as any).bundle.plots_base_url, "Plots directory"],
                ].map(([href, label]) =>
                  href ? (
                    <a
                      key={label as string}
                      className="inline-flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-accent"
                      href={href as string}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="truncate">{label as string}</span>
                      <span className="ml-2 text-muted-foreground">↗</span>
                    </a>
                  ) : null
                )}
              </div>
              {!((evidence as any).bundle.export_zip_url ||
              (evidence as any).bundle.metrics_csv_url ||
              (evidence as any).bundle.risk_scores_csv_url ||
              (evidence as any).bundle.shap_csv_url ||
              (evidence as any).bundle.reliability_csv_url ||
              (evidence as any).bundle.volatility_csv_url ||
              (evidence as any).bundle.plots_base_url) && (
                <p className="text-xs text-muted-foreground">
                  This evidence bundle has been registered, but no file URLs have been attached yet. Once exports are uploaded (CSV, plots,
                  ZIP), they will be linked here.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


