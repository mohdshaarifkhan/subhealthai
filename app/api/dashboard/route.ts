import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { type DashboardViewData } from "@/lib/dashboardViewData";
import { DEMO_PROFILES } from "@/lib/dashboardViewData";
import { buildRealUserDashboard } from "@/lib/dashboardRealUser";
import { resolveUserId } from "@/lib/resolveUser";

const ENGINE_VERSION = "phase3-v1-wes";

// ========== Condition Risk Types & Helpers ==========

type ConditionRiskRow = {
  condition?: string | null;
  condition_name?: string | null;
  risk_index?: number | null;
  risk_tier?: string | null;
  risk_bucket?: string | null;
  risk_label?: string | null;
  reason?: any;   // some migrations used "reason"
  reasons?: any;  // your current column name
};

type ClinicalDriverMarker = {
  name: string;
  value: number;
  units: string;
  direction: 'up' | 'down';
  weight: 'low' | 'medium' | 'high';
};

type ClinicalDriverBlock = {
  condition: string;
  label: string;
  risk_bucket: string;
  markers: ClinicalDriverMarker[];
};

/**
 * Extract qualitative reasons (array of strings or notes) from raw reason data
 */
function extractQualitativeReasons(raw: any): string[] {
  if (!raw) return [];

  let reason = raw;
  if (typeof reason === 'string') {
    try {
      reason = JSON.parse(reason);
    } catch {
      // If it's a plain string, treat it as a single reason
      return [reason.trim()].filter(Boolean);
    }
  }

  // 1) Array of strings - return all strings
  if (Array.isArray(reason)) {
    return reason.filter((r) => typeof r === 'string' && r.trim().length > 0);
  }

  // 2) Object - extract both notes and any array fields
  if (typeof reason === 'object' && reason !== null) {
    const reasons: string[] = [];
    
    // Extract notes if present
    if (typeof reason.notes === 'string' && reason.notes.trim().length > 0) {
      reasons.push(reason.notes.trim());
    }
    
    // Check for common array fields that might contain reasons
    const arrayFields = ['reasons', 'items', 'factors', 'drivers'];
    for (const field of arrayFields) {
      if (Array.isArray(reason[field])) {
        const arrayReasons = reason[field]
          .filter((r: any) => typeof r === 'string' && r.trim().length > 0)
          .map((r: string) => r.trim());
        reasons.push(...arrayReasons);
      }
    }
    
    return reasons;
  }

  return [];
}

/**
 * Extract clinical markers from object-style reasons
 */
function extractMarkersFromReasonObject(
  obj: any
): ClinicalDriverMarker[] {
  if (!obj || typeof obj !== 'object') return [];

  const markers: ClinicalDriverMarker[] = [];

  const addNumeric = (
    key: string,
    name: string,
    units: string,
    logic: (v: number) => { direction: 'up' | 'down'; weight: 'low' | 'medium' | 'high' }
  ) => {
    const raw = obj[key];
    const v = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(v)) return;

    const { direction, weight } = logic(v);
    markers.push({
      name,
      value: v,
      units,
      direction,
      weight,
    });
  };

  // BMI: high BMI ↑ risk
  addNumeric('bmi', 'BMI', 'kg/m²', (v) => ({
    direction: v >= 25 ? 'up' : 'down',
    weight: v >= 30 ? 'high' : v >= 25 ? 'medium' : 'low',
  }));

  // HDL: low HDL ↑ risk
  addNumeric('hdl_mg_dl', 'HDL-C', 'mg/dL', (v) => ({
    direction: v < 40 ? 'up' : 'down', // low HDL = higher risk
    weight: v < 35 ? 'high' : v < 40 ? 'medium' : 'low',
  }));

  // Triglycerides: high TG ↑ risk
  addNumeric('trig_mg_dl', 'Triglycerides', 'mg/dL', (v) => ({
    direction: v > 150 ? 'up' : 'down',
    weight: v > 200 ? 'high' : v > 150 ? 'medium' : 'low',
  }));

  // (Optional) if you later add ldl_mg_dl, hs_crp_mg_l, etc,
  // you can add more addNumeric() calls here.

  return markers;
}

/**
 * Wrapper that handles both string and object shapes for reason data
 */
function extractMarkersFromReason(raw: any): ClinicalDriverMarker[] {
  if (!raw) return [];

  let reason = raw;
  if (typeof reason === 'string') {
    try {
      reason = JSON.parse(reason);
    } catch {
      return [];
    }
  }

  // Array-of-strings reasons → treat as qualitative only
  if (Array.isArray(reason)) {
    // we don't create numeric markers here; these will go into clinicalReasons[]
    return [];
  }

  // Object → derive numeric markers (BMI, HDL, Trig, etc.)
  return extractMarkersFromReasonObject(reason);
}

/**
 * Build clinical drivers from condition risk data
 */
function buildClinicalDrivers(
  labs: any | null,
  conditions: ConditionRiskRow[]
): ClinicalDriverBlock[] {
  if (!conditions || conditions.length === 0) return [];

  const getCond = (matcher: (c: string) => boolean) =>
    conditions.find((row) => {
      const name =
        (row.condition_name || row.condition || '').toLowerCase();
      return name && matcher(name);
    }) ?? null;

  const metabolicCond = getCond((c) =>
    c.includes('metabolic') || c.includes('prediabetes') || c.includes('diabetes')
  );

  const cardioCond = getCond((c) =>
    c.includes('atherosclerotic') || c.includes('cvd') || c.includes('cardio')
  );

  const drivers: ClinicalDriverBlock[] = [];

  if (metabolicCond) {
    const rawReason = metabolicCond.reasons ?? metabolicCond.reason;
    const markers = extractMarkersFromReason(rawReason);

    drivers.push({
      condition: 'Metabolic',
      label: 'Metabolic / Glycemic Risk',
      risk_bucket:
        (metabolicCond.risk_tier ||
          metabolicCond.risk_bucket ||
          metabolicCond.risk_label ||
          'Unknown') as string,
      markers,
    });
  }

  if (cardioCond) {
    const rawReason = cardioCond.reasons ?? cardioCond.reason;
    const markers = extractMarkersFromReason(rawReason);

    drivers.push({
      condition: 'Cardiovascular',
      label: 'Atherosclerotic / Vascular Risk',
      risk_bucket:
        (cardioCond.risk_tier ||
          cardioCond.risk_bucket ||
          cardioCond.risk_label ||
          'Unknown') as string,
      markers,
    });
  }

  return drivers;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // e.g. demo-healthy, demo-risk, real
  const userParam = searchParams.get("user") || searchParams.get("userId");
  const version = searchParams.get("version") ?? ENGINE_VERSION;

  // Handle demo users - use DEMO_PROFILES
  if (mode === "demo-healthy" || mode === "demo-risk") {
    return NextResponse.json(DEMO_PROFILES[mode]);
  }

  // Also support legacy demo user IDs
  if (userParam === "demo-healthy" || userParam === "demo-risk") {
    return NextResponse.json(DEMO_PROFILES[userParam === "demo-healthy" ? "demo-healthy" : "demo-risk"]);
  }

  if (!userParam) {
    return NextResponse.json(
      { error: "userId required for real dashboard" },
      { status: 400 }
    );
  }

  // 🔑 Resolve email → UUID if needed
  let userId: string;
  try {
    userId = await resolveUserId(userParam);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Build base dashboard from risk timeline (includes forecast/volatility)
  let view = await buildRealUserDashboard(userId);
  if (!view) {
    // Return a minimal dashboard structure instead of 404
    // This allows the UI to show "No baseline yet" message
    view = {
      instabilityScore: 0,
      status: "STABLE" as const,
      narrative: "No baseline computed yet. Risk scores will appear once we have enough wearable + lab data.",
      vitals: { hrv: 0, rhr: 0, resp: 14, temp: 98.6 },
      trends: { hrv: "stable" as const, rhr: "stable" as const },
      drivers: [],
      drift: { metabolic: "Unknown" as const, cardio: "Unknown" as const, inflammation: "Unknown" as const },
      sleep: { deep: 0, rem: 0, light: 0, awake: 0 },
      labs: [],
      forecast: [],
      volatilityIndex: "0.000",
      volatilityTrail: [],
      hasForecast: false,
    };
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get latest risk score for drivers and other data
    const { data: riskRows, error: riskErr } = await sb
      .from("risk_scores")
      .select("day,risk_score,features")
      .eq("user_id", userId)
      .eq("model_version", version)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (riskErr) throw riskErr;

    if (!riskRows) {
      // Return base view even if no latest risk score
      return NextResponse.json(view);
    }

    const latest = riskRows;

    // 2) Top drivers from explain_contribs (today only)
    const { data: shapRows, error: shapErr } = await sb
      .from("explain_contribs")
      .select("feature,delta_raw,sign,value")
      .eq("user_id", userId)
      .eq("day", latest.day)
      .eq("model_version", version);

    if (shapErr) throw shapErr;

    // Sort by absolute value of delta_raw and take top 5
    const sortedShap = (shapRows ?? [])
      .map((r) => ({
        ...r,
        absDelta: Math.abs(Number(r.delta_raw) || 0),
      }))
      .sort((a, b) => b.absDelta - a.absDelta)
      .slice(0, 5);

    const drivers = sortedShap.map((r) => ({
      name: r.feature,
      impact:
        r.sign === "+" || (r.delta_raw && Number(r.delta_raw) > 0)
          ? +Math.round(Math.abs(Number(r.delta_raw)))
          : -Math.round(Math.abs(Number(r.delta_raw))),
      value: r.value != null ? String(r.value) : "—",
    }));

    // 3) Labs summary from labs_core (latest panel)
    const { data: labsCore, error: labsErr } = await sb
      .from("labs_core")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (labsErr) throw labsErr;

    // 3a) Condition risk data
    const { data: conditionsData, error: conditionsErr } = await sb
      .from("condition_risk")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (conditionsErr) {
      console.warn("Condition risks query error:", conditionsErr);
      // Don't throw - condition risks are optional
    }

    const conditions: ConditionRiskRow[] = (conditionsData ?? []) as ConditionRiskRow[];

    // 3b) Build clinical drivers from conditions
    const clinicalDrivers = buildClinicalDrivers(labsCore, conditions);

    // 3c) Collect qualitative reasons across all conditions
    let clinicalReasons = conditions
      .flatMap((c) => {
        const raw = c.reasons ?? c.reason;
        return extractQualitativeReasons(raw);
      })
      .filter(Boolean)
      .slice(0, 6); // show top 6 bullets

    const labs = labsCore
      ? [
          {
            name: "Fasting Glucose",
            value: String(labsCore.fasting_glucose_mg_dl ?? ""),
            unit: "mg/dL",
            status: labsCore.fasting_glucose_mg_dl && labsCore.fasting_glucose_mg_dl <= 99 ? "Optimal" : "Elevated",
          },
          {
            name: "HbA1c",
            value: String(labsCore.hba1c_percent ?? ""),
            unit: "%",
            status: labsCore.hba1c_percent && labsCore.hba1c_percent < 5.7 ? "Optimal" : "Borderline",
          },
          {
            name: "LDL-C",
            value: String(labsCore.ldl_mg_dl ?? ""),
            unit: "mg/dL",
            status: labsCore.ldl_mg_dl && labsCore.ldl_mg_dl < 100 ? "Optimal" : "Elevated",
          },
        ].filter((lab) => lab.value && lab.value !== "")
      : [];

    // 4) Sleep/vitals from metrics (latest)
    const { data: latestMetrics, error: metricsErr } = await sb
      .from("metrics")
      .select("hrv_avg,rhr,sleep_minutes")
      .eq("user_id", userId)
      .eq("day", latest.day)
      .maybeSingle();

    if (metricsErr) throw metricsErr;

    const sleepHours =
      latestMetrics && latestMetrics.sleep_minutes != null
        ? latestMetrics.sleep_minutes / 60
        : null;

    // 3d) Generate additional reasons from labs and vitals to supplement database reasons
    const additionalReasons: string[] = [];
    
    // From labs - use more lenient thresholds to catch borderline cases
    if (labsCore) {
      if (labsCore.ldl_mg_dl && labsCore.ldl_mg_dl > 100) {
        additionalReasons.push("LDL-C elevated");
      }
      if (labsCore.hba1c_percent && labsCore.hba1c_percent >= 5.5) { // Lowered from 5.7 to catch more cases
        additionalReasons.push(labsCore.hba1c_percent >= 5.7 ? "Prediabetes-range HbA1c" : "Borderline HbA1c");
      }
      if (labsCore.hdl_mg_dl && labsCore.hdl_mg_dl < 50) { // Raised from 40 to catch more cases
        additionalReasons.push(labsCore.hdl_mg_dl < 40 ? "Low HDL-C" : "Suboptimal HDL-C");
      }
      if (labsCore.trig_mg_dl && labsCore.trig_mg_dl > 150) {
        additionalReasons.push("High triglycerides");
      }
      if (labsCore.fasting_glucose_mg_dl && labsCore.fasting_glucose_mg_dl > 99) {
        additionalReasons.push("Elevated fasting glucose");
      }
      // Add more lab-based reasons
      if (labsCore.total_cholesterol && labsCore.total_cholesterol > 200) {
        additionalReasons.push("Elevated total cholesterol");
      }
    }
    
    // From latest metrics if available - use more lenient thresholds
    if (latestMetrics) {
      if (latestMetrics.rhr && latestMetrics.rhr > 65) { // Lowered from 70
        additionalReasons.push(latestMetrics.rhr > 70 ? "Elevated resting heart rate" : "Slightly elevated RHR");
      }
      if (latestMetrics.hrv_avg && latestMetrics.hrv_avg < 40) { // Raised from 30
        additionalReasons.push(latestMetrics.hrv_avg < 30 ? "Low HRV" : "Suboptimal HRV");
      }
      if (latestMetrics.sleep_minutes && latestMetrics.sleep_minutes < 450) { // Raised from 420
        additionalReasons.push(latestMetrics.sleep_minutes < 420 ? "Insufficient sleep" : "Suboptimal sleep duration");
      }
    }
    
    // Also check trends from the view data if available
    if (view && view.trends) {
      if (view.trends.hrv === 'down') {
        additionalReasons.push("HRV trending downward");
      }
      if (view.trends.rhr === 'up') {
        additionalReasons.push("Resting heart rate trending upward");
      }
    }
    
    // Combine with existing reasons, avoiding only exact duplicates
    const allReasons = [...clinicalReasons];
    for (const reason of additionalReasons) {
      // Only check for exact match (case-insensitive), not partial matches
      const isDuplicate = allReasons.some(r => r.toLowerCase().trim() === reason.toLowerCase().trim());
      
      if (!isDuplicate) {
        allReasons.push(reason);
      }
    }
    
    // If we still have very few reasons, always include more from labs/metrics
    if (allReasons.length < 3 && additionalReasons.length > 0) {
      // Add more additional reasons, checking only exact duplicates
      for (const reason of additionalReasons) {
        const isExactDuplicate = allReasons.some(r => r.toLowerCase().trim() === reason.toLowerCase().trim());
        if (!isExactDuplicate) {
          allReasons.push(reason);
          if (allReasons.length >= 3) break;
        }
      }
    }
    
    clinicalReasons = allReasons.slice(0, 6);
    
    // Debug logging
    console.log('[Dashboard API] Clinical reasons:', {
      fromDB: clinicalReasons.length,
      fromLabs: additionalReasons.length,
      final: clinicalReasons,
      labsCore: labsCore ? { ldl: labsCore.ldl_mg_dl, hba1c: labsCore.hba1c_percent, hdl: labsCore.hdl_mg_dl } : null,
      latestMetrics: latestMetrics ? { rhr: latestMetrics.rhr, hrv: latestMetrics.hrv_avg, sleep: latestMetrics.sleep_minutes } : null
    });

    // 5) Compute trends (compare latest to previous 7 days average)
    const { data: recentMetrics } = await sb
      .from("metrics")
      .select("hrv_avg,rhr")
      .eq("user_id", userId)
      .lte("day", latest.day)
      .order("day", { ascending: false })
      .limit(8);

    let trends: DashboardViewData["trends"] = { hrv: "stable", rhr: "stable" };
    if (recentMetrics && recentMetrics.length >= 2) {
      const recent = recentMetrics[0];
      const prev = recentMetrics.slice(1);
      const avgHrv = prev.reduce((sum, m) => sum + (Number(m.hrv_avg) || 0), 0) / prev.length;
      const avgRhr = prev.reduce((sum, m) => sum + (Number(m.rhr) || 0), 0) / prev.length;

      const hrvDelta = (Number(recent.hrv_avg) || 0) - avgHrv;
      const rhrDelta = (Number(recent.rhr) || 0) - avgRhr;

      trends = {
        hrv: hrvDelta > 3 ? "up" : hrvDelta < -3 ? "down" : "stable",
        rhr: rhrDelta > 3 ? "up" : rhrDelta < -3 ? "down" : "stable",
      };
    }

    // 6) Drift classification from labs
    const drift: DashboardViewData["drift"] = {
      metabolic:
        labsCore && labsCore.hba1c_percent != null && labsCore.hba1c_percent >= 5.7
          ? "Moderate"
          : "Low",
      cardio:
        labsCore && labsCore.ldl_mg_dl != null && labsCore.ldl_mg_dl >= 200
          ? "Elevated"
          : "Low",
      inflammation: "Normal",
    };

    // 7) Build narrative
    const instabilityScore = view.instabilityScore ?? 0;
    const narrative =
      instabilityScore < 33
        ? "Instability signal is low vs your recent baseline. No clear evidence of metabolic or hemodynamic stress from available data."
        : instabilityScore < 66
        ? "Instability signal is moderately elevated vs your recent baseline. Correlate with sleep, workload, and symptom pattern if present."
        : "Instability signal is high vs your recent baseline. Consider whether there is ongoing autonomic, inflammatory, or metabolic stress.";

    // Merge the base view (with forecast/volatility) with enriched data
    const viewData: DashboardViewData & {
      clinicalDrivers?: ClinicalDriverBlock[];
      clinicalReasons?: string[];
    } = {
      ...view, // Includes forecast, volatilityIndex, volatilityTrail from buildRealUserDashboard
      narrative, // Override with more detailed narrative
      vitals: {
        hrv: latestMetrics?.hrv_avg ?? view.vitals.hrv,
        rhr: latestMetrics?.rhr ?? view.vitals.rhr,
        resp: 14, // placeholder
        temp: 98.6, // placeholder
      },
      trends,
      drivers,
      drift,
      sleep: {
        deep: sleepHours ? Number((0.25 * sleepHours).toFixed(1)) : view.sleep.deep,
        rem: sleepHours ? Number((0.25 * sleepHours).toFixed(1)) : view.sleep.rem,
        light: sleepHours ? Number((0.4 * sleepHours).toFixed(1)) : view.sleep.light,
        awake: sleepHours ? Number((0.1 * sleepHours).toFixed(1)) : view.sleep.awake,
      },
      labs,
      clinicalDrivers,
      clinicalReasons,
    };

    return NextResponse.json(viewData);
  } catch (e: any) {
    console.error("Dashboard API error:", e);
    return NextResponse.json({ error: e.message ?? "internal error" }, { status: 500 });
  }
}

