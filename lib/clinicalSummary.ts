import { createClient } from "@supabase/supabase-js";
import type { ClinicalCondition, DataSourceStatus } from "@/lib/dashboardViewData";

const CLINICAL_API_URL = process.env.CLINICAL_API_URL ?? "http://localhost:8000";

function tierFromProb(p: number): "Low" | "Moderate" | "High" {
  if (p >= 70) return "High";
  if (p >= 40) return "Moderate";
  return "Low";
}

export async function getClinicalSummary(userId: string): Promise<{
  clinicalConditions: ClinicalCondition[];
  dataSources: DataSourceStatus;
  overallInstability: number;
  drivers: { factor: string; impact: string }[];
} | null> {
  // Use service role client to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // --- 1) Fetch latest labs_core (for glucose & cholesterol) ---
  const { data: labsCore, error: labsError } = await supabase
    .from("labs_core")
    .select(
      "date, fasting_glucose_mg_dl, chol_total_mg_dl, hba1c_percent, bun_mg_dl, creatinine_mg_dl, egfr_ml_min_1_73"
    )
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // --- 2) Latest vitals (for systolic_bp, BMI if present) ---
  const { data: latestVitals } = await supabase
    .from("vitals")
    .select("systolic_mm_hg, diastolic_mm_hg, height_cm, weight_kg, bmi")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // --- 3) Profile (age, sex) ---
  const { data: profile } = await supabase
    .from("user_profile")
    .select("age_years, sex_at_birth, height_cm, weight_kg")
    .eq("user_id", userId)
    .maybeSingle();

  // --- 4) Wearables: use last 7 days metrics average ---
  const { data: metrics } = await supabase
    .from("metrics")
    .select("hrv_avg, steps, sleep_minutes")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(7);

  const avgHrv =
    metrics && metrics.length
      ? metrics.reduce((s, m) => s + (m.hrv_avg ?? 0), 0) / metrics.length
      : 45;

  const avgSteps =
    metrics && metrics.length
      ? Math.round(
          metrics.reduce((s, m) => s + (m.steps ?? 0), 0) / metrics.length
        )
      : 5000;

  const avgSleepHours =
    metrics && metrics.length
      ? metrics.reduce((s, m) => s + (m.sleep_minutes ?? 0), 0) /
        metrics.length /
        60
      : 7;

  // --- 5) Derive clinical input for FastAPI ---
  const glucose = labsCore?.fasting_glucose_mg_dl ?? 90;
  const chol = labsCore?.chol_total_mg_dl ?? 170;
  const age = profile?.age_years ?? 33;

  // Compute BMI fallback if not provided
  let bmi: number | null = null;
  if (latestVitals?.bmi != null) {
    bmi = Number(latestVitals.bmi);
  } else {
    const h_cm = latestVitals?.height_cm ?? profile?.height_cm;
    const w_kg = latestVitals?.weight_kg ?? profile?.weight_kg;
    if (h_cm && w_kg) {
      const h_m = Number(h_cm) / 100;
      bmi = w_kg / (h_m * h_m);
    }
  }

  if (bmi == null) bmi = 28; // reasonable fallback

  const systolic = latestVitals?.systolic_mm_hg ?? 120;

  // --- 6) Call FastAPI clinical backend ---
  let diabetesRisk = 0;
  let cardioRisk = 0;
  let overallInstability = 0;
  let drivers: { factor: string; impact: string }[] = [];

  try {
    const resp = await fetch(`${CLINICAL_API_URL}/predict/clinical_risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        glucose,
        bmi,
        age,
        systolic_bp: systolic,
        cholesterol: chol,
        pregnancies: 0,
        insulin: 79.0,
        skin_thickness: 20.0,
        avg_hrv: avgHrv,
        daily_steps: avgSteps,
        sleep_hours: avgSleepHours,
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => "Unknown error");
      console.warn("Clinical backend returned error:", errorText);
      // Don't throw, just use default values
    } else {
      const json = await resp.json();
      diabetesRisk = json.analysis?.diabetes_risk_percent ?? 0;
      cardioRisk = json.analysis?.cardio_risk_percent ?? 0;
      overallInstability = json.analysis?.overall_instability_score ?? 0;
      drivers = json.drivers ?? [];
    }
  } catch (e: any) {
    // Gracefully handle connection errors - don't break the flow
    if (e.name === 'AbortError' || e.code === 'ECONNREFUSED' || e.message?.includes('fetch failed')) {
      console.warn("Clinical backend unavailable, using default values. Is FastAPI running?", CLINICAL_API_URL);
    } else {
      console.warn("Clinical backend error (non-fatal):", e.message || e);
    }
    // Continue with default values (0 risk, empty drivers)
  }

  const clinicalConditions: ClinicalCondition[] = [
    {
      name: "Type 2 Diabetes / Metabolic Risk",
      shortName: "Diabetes",
      riskPercent: diabetesRisk,
      riskTier: tierFromProb(diabetesRisk),
      modelId: "pima_diabetes_gb_v1",
      dataSource: "Pima Indians Diabetes Database",
      notes:
        "Model trained on Pima Indians Diabetes Dataset. Non-diagnostic; for preventive screening context only.",
    },
    {
      name: "Atherosclerotic Cardiovascular Risk",
      shortName: "Cardio",
      riskPercent: cardioRisk,
      riskTier: tierFromProb(cardioRisk),
      modelId: "cleveland_cardio_rf_v1",
      dataSource: "UCI Cleveland Heart Disease Dataset",
      notes:
        "Random Forest trained on UCI Cleveland Heart Disease dataset. Non-diagnostic.",
    },
  ];

  // --- 7) Data source status snapshot for Settings UI ---
  // Check if allergies_lab exists
  const { data: allergiesLab } = await supabase
    .from("allergies_lab")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const dataSources: DataSourceStatus = {
    samsungHealth: metrics && metrics.length ? "connected" : "not_connected",
    bloodwork: labsCore ? "uploaded" : "missing",
    allergyPanel: allergiesLab ? "uploaded" : "missing",
    vitals: latestVitals ? "derived" : "missing",
    chronicModels:
      diabetesRisk > 0 || cardioRisk > 0 ? "active" : "inactive",
  };

  return {
    clinicalConditions,
    dataSources,
    overallInstability,
    drivers,
  };
}

