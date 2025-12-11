// app/settings/page.tsx
import React from "react";

async function fetchClinicalSummary() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || "http://localhost:3000";
  
  try {
    const res = await fetch(
      `${baseUrl}/api/clinical-summary`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch clinical summary:", error);
    return null;
  }
}

const badgeClass: Record<string, string> = {
  connected: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  uploaded: "bg-sky-500/10 text-sky-300 border-sky-500/40",
  derived: "bg-sky-500/10 text-sky-300 border-sky-500/40",
  active: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  missing: "bg-slate-700/60 text-slate-300 border-slate-600",
  stale: "bg-amber-900/30 text-amber-200 border-amber-700/80",
  not_connected: "bg-slate-800/80 text-slate-300 border-slate-700",
  error: "bg-rose-900/40 text-rose-200 border-rose-700/80",
  inactive: "bg-slate-700/60 text-slate-300 border-slate-600",
};

export default async function SettingsPage() {
  const clinical = await fetchClinicalSummary();
  const ds = clinical?.dataSources;

  return (
    <main className="min-h-screen bg-[#02040a] text-slate-300 mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-lg font-semibold text-slate-50">Data Sources</h1>
        <p className="mt-1 text-sm text-slate-400">
          Which inputs are currently driving SubHealthAI&apos;s risk estimates
          for your account.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <Card
          title="Samsung Health"
          description="Steps, HRV, resting HR, and sleep staging over the last 28 days."
          status={ds?.samsungHealth ?? "not_connected"}
        />
        <Card
          title="Bloodwork (Labs)"
          description="Comprehensive metabolic, lipid, thyroid, and A1c panel."
          status={ds?.bloodwork ?? "missing"}
        />
        <Card
          title="Allergy Panel"
          description="IgE aeroallergen panel (dust mite, pollen, dander, etc.)."
          status={ds?.allergyPanel ?? "missing"}
        />
        <Card
          title="Vitals"
          description="Blood pressure, heart rate, and derived BMI."
          status={ds?.vitals ?? "missing"}
        />
        <Card
          title="Chronic Disease Models"
          description="Metabolic and cardiovascular risk models (Pima & Cleveland)."
          status={ds?.chronicModels ?? "inactive"}
        />
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-950/60 px-4 py-3">
        <p className="text-[11px] leading-snug text-slate-400">
          This system is a{" "}
          <span className="font-semibold text-slate-200">
            research prototype
          </span>{" "}
          and is{" "}
          <span className="font-semibold text-slate-200">non-diagnostic</span>.
          Data sources are used to surface early warning signals and
          instability—not to make definitive medical diagnoses. Always interpret
          outputs with a clinician.
        </p>
      </section>
    </main>
  );
}

function Card({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: string;
}) {
  const cls = badgeClass[status] ?? badgeClass["missing"];
  const label = status.replace("_", " ");

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-3">
      <div>
        <h2 className="text-sm font-medium text-slate-100">{title}</h2>
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 font-medium capitalize ${cls}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

