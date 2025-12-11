import { createClient } from "@supabase/supabase-js";

import type { DashboardViewData } from "@/lib/dashboardViewData";

// Service-role client for server-side use ONLY.
// Make sure these env vars are set on Vercel / server:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RiskRow = {
  day: string;
  risk_score: number;
  model_version: string;
};

type MetricsRow = {
  day: string;
  rhr: number | null;
  hrv_avg: number | null;
  sleep_minutes: number | null;
  stress_proxy: number | null;
};

type VitalsRow = {
  taken_at: string;
  heart_rate_bpm: number | null;
  temperature_c: number | null;
};

type LabsCoreRow = {
  date: string;
  fasting_glucose_mg_dl: number | null;
  hba1c_percent: number | null;
  bun_mg_dl: number | null;
  creatinine_mg_dl: number | null;
  egfr_ml_min_1_73: number | null;
  chol_total_mg_dl: number | null;
  hdl_mg_dl: number | null;
  ldl_mg_dl: number | null;
  trig_mg_dl: number | null;
  alt_u_l: number | null;
  ast_u_l: number | null;
  alk_phos_u_l: number | null;
  tsh_ulu_ml: number | null;
  vitd_25oh_ng_ml: number | null;
};

function classifyStatus(score: number): DashboardViewData["status"] {
  if (score < 25) return "STABLE";
  if (score < 60) return "ELEVATED";
  return "VOLATILE";
}

function buildNarrative(
  status: DashboardViewData["status"],
  labs: LabsCoreRow | null
): string {
  if (!labs) {
    if (status === "STABLE") {
      return "Instability signal is low vs your recent baseline. No clear evidence of metabolic or hemodynamic stress from available data.";
    }
    if (status === "ELEVATED") {
      return "Instability signal is moderately elevated vs your recent baseline. Correlate with sleep, workload, and symptom pattern if present.";
    }
    return "Instability signal is high vs your recent baseline. Consider whether there is ongoing autonomic, inflammatory, or metabolic stress.";
  }

  const parts: string[] = [];
  parts.push(
    status === "STABLE"
      ? "Instability signal is low vs your recent baseline."
      : status === "ELEVATED"
      ? "Instability signal is moderately elevated vs your recent baseline."
      : "Instability signal is high vs your recent baseline."
  );

  if (labs.fasting_glucose_mg_dl != null && labs.hba1c_percent != null) {
    if (
      labs.fasting_glucose_mg_dl < 100 &&
      labs.hba1c_percent < 5.7
    ) {
      parts.push(
        "Glycemic markers (fasting glucose and HbA1c) are in the normal range."
      );
    } else {
      parts.push(
        "Glycemic markers show mild elevation; monitor trend and lifestyle factors."
      );
    }
  }

  if (labs.ldl_mg_dl != null && labs.hdl_mg_dl != null) {
    if (labs.ldl_mg_dl < 100 && labs.hdl_mg_dl >= 40) {
      parts.push("Lipid profile appears cardiometabolically favorable.");
    } else {
      parts.push(
        "Lipid profile has borderline features; long-term cardiometabolic risk should be monitored."
      );
    }
  }

  if (labs.egfr_ml_min_1_73 != null) {
    if (labs.egfr_ml_min_1_73 >= 60) {
      parts.push("Estimated GFR is within the preserved range.");
    } else {
      parts.push(
        "Estimated GFR is reduced; kidney function warrants longitudinal follow-up."
      );
    }
  }

  if (labs.vitd_25oh_ng_ml != null) {
    if (labs.vitd_25oh_ng_ml >= 30) {
      parts.push("25-OH Vitamin D is in the sufficient range.");
    } else {
      parts.push("25-OH Vitamin D is in the insufficient range.");
    }
  }

  return parts.join(" ");
}

function classifyDrift(labs: LabsCoreRow | null): DashboardViewData["drift"] {
  if (!labs) {
    return {
      metabolic: "Unknown",
      cardio: "Unknown",
      inflammation: "Unknown",
    };
  }

  // Metabolic drift
  let metabolic: string;
  if (
    labs.fasting_glucose_mg_dl != null &&
    labs.hba1c_percent != null
  ) {
    if (
      labs.fasting_glucose_mg_dl < 100 &&
      labs.hba1c_percent < 5.7
    ) {
      metabolic = "Low";
    } else if (
      labs.fasting_glucose_mg_dl < 110 &&
      labs.hba1c_percent < 6.0
    ) {
      metabolic = "Moderate";
    } else {
      metabolic = "Elevated";
    }
  } else {
    metabolic = "Unknown";
  }

  // Cardio drift (simple rule-of-thumb on LDL)
  let cardio: string;
  if (labs.ldl_mg_dl != null) {
    if (labs.ldl_mg_dl < 100) cardio = "Low";
    else if (labs.ldl_mg_dl < 130) cardio = "Moderate";
    else cardio = "Elevated";
  } else {
    cardio = "Unknown";
  }

  // Inflammatory drift – hs-CRP is not in labs_core, so we leave as "Normal/Unknown"
  const inflammation = "Normal";

  return { metabolic, cardio, inflammation };
}

function buildLabsSummary(labs: LabsCoreRow | null): DashboardViewData["labs"] {
  if (!labs) return [];

  const out: DashboardViewData["labs"] = [];

  if (labs.fasting_glucose_mg_dl != null) {
    let status = "Optimal";
    if (labs.fasting_glucose_mg_dl >= 100 && labs.fasting_glucose_mg_dl < 126)
      status = "Borderline";
    if (labs.fasting_glucose_mg_dl >= 126) status = "High";

    out.push({
      name: "Fasting Glucose",
      value: labs.fasting_glucose_mg_dl.toString(),
      unit: "mg/dL",
      status,
    });
  }

  if (labs.hba1c_percent != null) {
    let status = "Optimal";
    if (labs.hba1c_percent >= 5.7 && labs.hba1c_percent < 6.5)
      status = "Borderline";
    if (labs.hba1c_percent >= 6.5) status = "High";

    out.push({
      name: "HbA1c",
      value: labs.hba1c_percent.toString(),
      unit: "%",
      status,
    });
  }

  if (labs.ldl_mg_dl != null) {
    let status = "Optimal";
    if (labs.ldl_mg_dl >= 100 && labs.ldl_mg_dl < 130) status = "Borderline";
    if (labs.ldl_mg_dl >= 130) status = "High";

    out.push({
      name: "LDL-C",
      value: labs.ldl_mg_dl.toString(),
      unit: "mg/dL",
      status,
    });
  }

  if (labs.hdl_mg_dl != null) {
    let status = "Low";
    if (labs.hdl_mg_dl >= 40) status = "Optimal";

    out.push({
      name: "HDL-C",
      value: labs.hdl_mg_dl.toString(),
      unit: "mg/dL",
      status,
    });
  }

  if (labs.trig_mg_dl != null) {
    let status = "Optimal";
    if (labs.trig_mg_dl >= 150 && labs.trig_mg_dl < 200) status = "Borderline";
    if (labs.trig_mg_dl >= 200) status = "High";

    out.push({
      name: "Triglycerides",
      value: labs.trig_mg_dl.toString(),
      unit: "mg/dL",
      status,
    });
  }

  if (labs.vitd_25oh_ng_ml != null) {
    let status = "Insufficient";
    if (labs.vitd_25oh_ng_ml >= 30) status = "Optimal";

    out.push({
      name: "25-OH Vitamin D",
      value: labs.vitd_25oh_ng_ml.toString(),
      unit: "ng/mL",
      status,
    });
  }

  return out;
}

export async function loadRealUserDashboard(
  userId: string
): Promise<DashboardViewData> {
  // 1) Latest risk score from risk_scores (user-specific, already driven by Samsung/WESAD if your engine uses them)
  const { data: riskRows, error: riskError } = await supabase
    .from("risk_scores")
    .select("day, risk_score, model_version")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(1);

  if (riskError) {
    console.error("Error fetching risk:", riskError);
  }

  const latestRisk: RiskRow | null = riskRows?.[0] ?? null;
  const instabilityScore = latestRisk
    ? Math.round(Number(latestRisk.risk_score) * 100)
    : 0;
  const status = classifyStatus(instabilityScore);

  // 2) Latest metrics for HRV / RHR / sleep
  const { data: metricsRows, error: metricsError } = await supabase
    .from("metrics")
    .select("day, rhr, hrv_avg, sleep_minutes, stress_proxy")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(1);

  if (metricsError) {
    console.error("Error fetching metrics:", metricsError);
  }

  const m: MetricsRow | null = metricsRows?.[0] ?? null;

  // 3) Latest vitals for resp / temp if available
  const { data: vitalsRows, error: vitalsError } = await supabase
    .from("vitals")
    .select("taken_at, heart_rate_bpm, temperature_c")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false })
    .limit(1);

  if (vitalsError) {
    console.error("Error fetching vitals:", vitalsError);
  }

  const v: VitalsRow | null = vitalsRows?.[0] ?? null;

  const vitals: DashboardViewData["vitals"] = {
    hrv: m?.hrv_avg != null ? Number(m.hrv_avg) : 0,
    rhr:
      m?.rhr != null
        ? Number(m.rhr)
        : v?.heart_rate_bpm != null
        ? Number(v.heart_rate_bpm)
        : 0,
    resp: 14, // You can wire real resp if you store it; otherwise constant proxy
    temp:
      v?.temperature_c != null
        ? Number(v.temperature_c) * 9 / 5 + 32 // convert C -> F for display
        : 98.6,
  };

  const trends: DashboardViewData["trends"] = {
    hrv: "stable",
    rhr: "stable",
  };

  // 4) Latest labs_core (you already inserted 2024-07-12 panel)
  const { data: labsRows, error: labsError } = await supabase
    .from("labs_core")
    .select(
      "date, fasting_glucose_mg_dl, hba1c_percent, bun_mg_dl, creatinine_mg_dl, egfr_ml_min_1_73, chol_total_mg_dl, hdl_mg_dl, ldl_mg_dl, trig_mg_dl, alt_u_l, ast_u_l, alk_phos_u_l, tsh_ulu_ml, vitd_25oh_ng_ml"
    )
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1);

  if (labsError) {
    console.error("Error fetching labs_core:", labsError);
  }

  const labsCore: LabsCoreRow | null = labsRows?.[0] ?? null;

  const drift = classifyDrift(labsCore);
  const labs = buildLabsSummary(labsCore);
  const narrative = buildNarrative(status, labsCore);

  // 5) Sleep breakdown – you don't yet have stages in DB, so keep a placeholder
  // consistent with your own sleep pattern. You can later derive from Samsung.
  const sleep: DashboardViewData["sleep"] = {
    deep: 1.5,
    rem: 2.0,
    light: 3.5,
    awake: 0.5,
  };

  // 6) Drivers – simple structured explanation tying risk to physiology.
  const drivers: DashboardViewData["drivers"] = [];

  // Autonomic / recovery proxy from risk + stress_proxy
  if (instabilityScore >= 60) {
    drivers.push({
      name: "Autonomic load vs baseline",
      impact: +30,
      value: `${instabilityScore}% instability`,
    });
  } else if (instabilityScore >= 25) {
    drivers.push({
      name: "Mild autonomic activation",
      impact: +15,
      value: `${instabilityScore}% instability`,
    });
  } else {
    drivers.push({
      name: "Stable autonomic tone",
      impact: -10,
      value: `${instabilityScore}% instability`,
    });
  }

  if (m?.sleep_minutes != null) {
    const hours = Number(m.sleep_minutes) / 60;
    drivers.push({
      name: "Sleep duration (24h)",
      impact: hours < 7 ? +10 : -5,
      value: `${hours.toFixed(1)}h`,
    });
  }

  if (labsCore?.fasting_glucose_mg_dl != null) {
    const fg = labsCore.fasting_glucose_mg_dl;
    drivers.push({
      name: "Glycemic control",
      impact: fg < 100 ? -5 : +10,
      value: `${fg} mg/dL`,
    });
  }

  // 7) Return canonical DashboardViewData
  const result: DashboardViewData = {
    instabilityScore,
    status,
    narrative,
    vitals,
    trends,
    drivers,
    drift,
    sleep,
    labs,
    // No forecast / volatility / reliability yet for real user.
    // ReportDoc is written to only show those sections when present.
  };

  return result;
}
