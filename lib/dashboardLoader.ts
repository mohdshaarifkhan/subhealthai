import { createClient } from "@supabase/supabase-js";

import type {
  DashboardViewData,
  ForecastPoint,
  VolatilityPoint,
  ReliabilityBin,
} from "@/lib/dashboardViewData";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-side only

// Database type is optional - generate with: npx supabase gen types typescript --project-id <your-project-id> > lib/supabase.types.ts
// For now, using 'any' as fallback if types don't exist
type Database = any;

const supabase = createClient<Database>(supabaseUrl, serviceKey);

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

type LabsCoreRow = {
  date: string;
  hba1c_percent: number | null;
  chol_total_mg_dl: number | null;
  hdl_mg_dl: number | null;
  fasting_glucose_mg_dl: number | null;
  vitd_25oh_ng_ml: number | null;
  ldl_mg_dl: number | null;
  [key: string]: any;
};

type MetricsRow = {
  day: string;
  hrv_avg: number | null;
  rhr: number | null;
  hr_avg: number | null;
  sleep_minutes: number | null;
  [key: string]: any;
};

function classifyStatus(score: number): DashboardViewData["status"] {
  if (score < 33) return "STABLE";
  if (score < 66) return "ELEVATED";
  return "VOLATILE";
}

function inferDriftFromLabs(labs: LabsCoreRow | null): DashboardViewData["drift"] {
  if (!labs) {
    return {
      metabolic: "Unknown",
      cardio: "Unknown",
      inflammation: "Unknown",
    };
  }

  // Very simple thresholds – you can refine later
  const metabolic =
    labs.hba1c_percent != null && labs.hba1c_percent >= 5.7
      ? "Moderate"
      : "Low";

  const cardio =
    labs.chol_total_mg_dl != null && labs.chol_total_mg_dl >= 200
      ? "Elevated"
      : "Low";

  // No hs-CRP yet → keep neutral
  const inflammation = "Normal";

  return { metabolic, cardio, inflammation };
}

function buildNarrative(
  instabilityScore: number,
  vitals: DashboardViewData["vitals"],
  drift: DashboardViewData["drift"],
): string {
  const parts: string[] = [];

  if (instabilityScore < 33) {
    parts.push(
      "Current instability risk is low vs your 28-day baseline. Autonomic load appears well controlled.",
    );
  } else if (instabilityScore < 66) {
    parts.push(
      "Instability risk is moderately elevated vs your 28-day baseline. There are early signs of stress accumulation.",
    );
  } else {
    parts.push(
      "Instability risk is high vs your 28-day baseline, suggesting sustained sympathetic load and incomplete recovery.",
    );
  }

  parts.push(
    `Latest resting HR is ~${Math.round(vitals.rhr)} bpm with HRV around ${Math.round(
      vitals.hrv,
    )} ms.`,
  );

  parts.push(
    `Model-level drift signals: metabolic = ${drift.metabolic}, cardio = ${drift.cardio}, inflammation = ${drift.inflammation}.`,
  );

  return parts.join(" ");
}

function buildDrivers(
  instabilityScore: number,
  vitals: DashboardViewData["vitals"],
  labs: LabsCoreRow | null,
): DashboardViewData["drivers"] {
  const drivers: DashboardViewData["drivers"] = [];

  // HRV / RHR based driver
  if (vitals.hrv && vitals.rhr) {
    drivers.push({
      name: "Autonomic Balance (HRV vs RHR)",
      impact: instabilityScore > 50 ? 25 : -15,
      value: `HRV ${Math.round(vitals.hrv)} ms, RHR ${Math.round(vitals.rhr)} bpm`,
    });
  }

  if (labs) {
    if (labs.hba1c_percent != null) {
      drivers.push({
        name: "Long-term Glycemic Load (HbA1c)",
        impact: labs.hba1c_percent >= 5.7 ? 15 : -5,
        value: `${labs.hba1c_percent.toFixed(1)} %`,
      });
    }

    if (labs.chol_total_mg_dl != null && labs.hdl_mg_dl != null) {
      const ratio = labs.chol_total_mg_dl / labs.hdl_mg_dl;
      drivers.push({
        name: "Lipid Profile (TC/HDL ratio)",
        impact: ratio >= 4 ? 10 : -5,
        value: `TC ${labs.chol_total_mg_dl} mg/dL, HDL ${labs.hdl_mg_dl} mg/dL (ratio ~${ratio.toFixed(
          1,
        )})`,
      });
    }

    if (labs.vitd_25oh_ng_ml != null) {
      drivers.push({
        name: "Vitamin D Status",
        impact: labs.vitd_25oh_ng_ml < 30 ? 5 : -5,
        value: `${labs.vitd_25oh_ng_ml} ng/mL`,
      });
    }
  }

  if (drivers.length === 0) {
    drivers.push({
      name: "Data coverage",
      impact: 0,
      value: "No dominant driver detected – limited data coverage.",
    });
  }

  // Cap at 3 for readability
  return drivers.slice(0, 3);
}

export async function loadDashboardViewData(
  userId: string,
): Promise<DashboardViewData> {
  // ----------------------------
  // 1) Risk timeline (forecast & volatility)
  // ----------------------------
  const today = new Date();
  const since = new Date();
  since.setDate(today.getDate() - 13); // last 14 days inclusive
  const sinceStr = since.toISOString().slice(0, 10);

  // Try v_risk_timeline view first, fallback to risk_scores table
  let timeline: Array<{ day: string; risk: number; model_version: string }> | null = null;
  let modelVersion = "phase3-v1-wes";

  const { data: timelineView, error: tlViewErr } = await supabase
    .from("v_risk_timeline")
    .select("day,risk,model_version")
    .eq("user_id", userId)
    .gte("day", sinceStr)
    .order("day", { ascending: true });

  if (!tlViewErr && timelineView) {
    timeline = timelineView as Array<{ day: string; risk: number; model_version: string }>;
  } else {
    // Fallback to risk_scores table
    const { data: riskRows, error: tlErr } = await supabase
      .from("risk_scores")
      .select("day,risk_score,model_version")
      .eq("user_id", userId)
      .gte("day", sinceStr)
      .order("day", { ascending: true });

    if (tlErr) {
      throw tlErr;
    }

    timeline = (riskRows ?? []).map((row: any) => ({
      day: row.day,
      risk: Number(row.risk_score),
      model_version: row.model_version,
    }));
  }

  const latestPoint = timeline?.[timeline.length - 1] ?? null;
  const instabilityScore = latestPoint ? Math.round(Number(latestPoint.risk) * 100) : 0;
  modelVersion = latestPoint?.model_version ?? "phase3-v1-wes";

  const status = classifyStatus(instabilityScore);

  const forecast: ForecastPoint[] =
    (timeline ?? []).map((row) => ({
      date: fmtDate(row.day as string),
      value: Math.round(Number(row.risk) * 100),
    }));

  let volatilityIndex: string | undefined;
  let volatilityTrail: VolatilityPoint[] | undefined;

  if (timeline && timeline.length > 1) {
    const diffs: number[] = [];
    for (let i = 1; i < timeline.length; i++) {
      const prev = Number(timeline[i - 1].risk);
      const curr = Number(timeline[i].risk);
      diffs.push(Math.abs(curr - prev));
    }

    const meanDelta = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    volatilityIndex = (meanDelta / 100).toFixed(3); // 0.000–1.000 style

    volatilityTrail = timeline.map((row, idx) => {
      if (idx === 0) {
        return { date: fmtDate(row.day as string), value: "0.000" };
      }

      const prev = Number(timeline[idx - 1].risk);
      const curr = Number(row.risk);
      const delta = Math.abs(curr - prev) / 100;

      return {
        date: fmtDate(row.day as string),
        value: delta.toFixed(3),
      };
    });
  }

  // ----------------------------
  // 2) Latest vitals / sleep from metrics
  // ----------------------------
  const { data: metricsRows, error: mErr } = await supabase
    .from("metrics")
    .select("day,hrv_avg,rhr,hr_avg,sleep_minutes")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(7);

  if (mErr) throw mErr;

  const latestMetrics: MetricsRow | undefined = metricsRows?.[0] as MetricsRow | undefined;

  const vitals: DashboardViewData["vitals"] = {
    hrv: latestMetrics?.hrv_avg ?? 0,
    rhr: latestMetrics?.rhr ?? 0,
    // You can wire actual resp from a dedicated table later
    resp: latestMetrics?.hr_avg ? Math.round(Number(latestMetrics.hr_avg) / 4) : 14,
    temp: 98.6, // placeholder until you connect vitals.temperature
  };

  let trends: DashboardViewData["trends"] = { hrv: "stable", rhr: "stable" };

  if (metricsRows && metricsRows.length >= 4) {
    const recent = metricsRows[0];
    const prev = metricsRows.slice(1);

    const avgHrv =
      prev.reduce((sum, row: any) => sum + Number(row.hrv_avg ?? 0), 0) /
      prev.length;

    const avgRhr =
      prev.reduce((sum, row: any) => sum + Number(row.rhr ?? 0), 0) /
      prev.length;

    const hrvDelta = Number(recent.hrv_avg ?? 0) - avgHrv;
    const rhrDelta = Number(recent.rhr ?? 0) - avgRhr;

    const classifyDelta = (
      d: number,
    ): "up" | "down" | "stable" => (d > 3 ? "up" : d < -3 ? "down" : "stable");

    trends = {
      hrv: classifyDelta(hrvDelta),
      rhr: classifyDelta(rhrDelta),
    };
  }

  const sleepMinutes = latestMetrics?.sleep_minutes ?? 0;
  const totalHours = sleepMinutes / 60;

  const sleep: DashboardViewData["sleep"] = {
    // simple 20/25/45/10 split for now; can replace with real staging later
    deep: Number((totalHours * 0.2).toFixed(1)),
    rem: Number((totalHours * 0.25).toFixed(1)),
    light: Number((totalHours * 0.45).toFixed(1)),
    awake: Number((totalHours * 0.1).toFixed(1)),
  };

  // ----------------------------
  // 3) Labs (labs_core)
  // ----------------------------
  const { data: labsCoreRows, error: labsErr } = await supabase
    .from("labs_core")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1);

  if (labsErr) throw labsErr;

  const labsCore: LabsCoreRow | null = (labsCoreRows?.[0] as LabsCoreRow | null) ?? null;

  const labs: DashboardViewData["labs"] = [];

  if (labsCore) {
    if (labsCore.hba1c_percent != null) {
      labs.push({
        name: "HbA1c",
        value: labsCore.hba1c_percent.toFixed(1),
        unit: "%",
        status:
          labsCore.hba1c_percent < 5.7
            ? "Optimal"
            : labsCore.hba1c_percent < 6.5
            ? "Borderline"
            : "High",
      });
    }

    if (labsCore.fasting_glucose_mg_dl != null) {
      labs.push({
        name: "Fasting Glucose",
        value: labsCore.fasting_glucose_mg_dl.toString(),
        unit: "mg/dL",
        status:
          labsCore.fasting_glucose_mg_dl < 100
            ? "Optimal"
            : labsCore.fasting_glucose_mg_dl < 126
            ? "Elevated"
            : "High",
      });
    }

    if (labsCore.vitd_25oh_ng_ml != null) {
      labs.push({
        name: "25-OH Vitamin D",
        value: labsCore.vitd_25oh_ng_ml.toString(),
        unit: "ng/mL",
        status:
          labsCore.vitd_25oh_ng_ml < 20
            ? "Low"
            : labsCore.vitd_25oh_ng_ml < 30
            ? "Insufficient"
            : "Optimal",
      });
    }

    if (labsCore.ldl_mg_dl != null) {
      labs.push({
        name: "LDL Cholesterol",
        value: labsCore.ldl_mg_dl.toString(),
        unit: "mg/dL",
        status:
          labsCore.ldl_mg_dl < 100
            ? "Optimal"
            : labsCore.ldl_mg_dl < 130
            ? "Borderline"
            : "High",
      });
    }
  }

  // ----------------------------
  // 4) Engine calibration / reliability
  // ----------------------------
  const { data: evalRow } = await supabase
    .from("evaluation_cache")
    .select("ece,volatility")
    .eq("version", modelVersion)
    .eq("segment", "all")
    .maybeSingle();

  let reliability: string | undefined;

  if (evalRow && evalRow.ece != null) {
    // Convert ECE to "reliability %" (1 - ECE) * 100
    reliability = (100 - Number(evalRow.ece) * 100).toFixed(1);
  }

  if (!volatilityIndex && evalRow?.volatility != null) {
    volatilityIndex = Number(evalRow.volatility).toFixed(3);
  }

  // Try v_eval_reliability view, fallback to eval_reliability table
  let relBinsRows: any[] | null = null;

  const { data: relBinsView } = await supabase
    .from("v_eval_reliability")
    .select("bin,predicted_prob,observed_rate,n")
    .eq("version", modelVersion)
    .eq("segment", "all")
    .order("bin", { ascending: true });

  if (relBinsView) {
    relBinsRows = relBinsView;
  } else {
    // Fallback to eval_reliability table
    const { data: relBinsTable } = await supabase
      .from("eval_reliability")
      .select("bin,pred,obs,n")
      .eq("version", modelVersion)
      .eq("segment", "all")
      .order("bin", { ascending: true });

    if (relBinsTable) {
      relBinsRows = relBinsTable.map((row: any) => ({
        bin: row.bin,
        predicted_prob: row.pred,
        observed_rate: row.obs,
        n: row.n,
      }));
    }
  }

  const reliabilityBins: ReliabilityBin[] | undefined = relBinsRows?.map(
    (row) => ({
      bin: row.bin,
      pred: Number(row.predicted_prob ?? row.pred) * 100,
      obs: Number(row.observed_rate ?? row.obs) * 100,
      n: row.n,
    }),
  );

  const drift = inferDriftFromLabs(labsCore);
  const drivers = buildDrivers(instabilityScore, vitals, labsCore);
  const narrative = buildNarrative(instabilityScore, vitals, drift);

  return {
    instabilityScore,
    status,
    narrative,
    vitals,
    trends,
    drivers,
    drift,
    sleep,
    labs,
    forecast,
    volatilityIndex,
    volatilityTrail,
    reliabilityBins,
    reliability,
  };
}

