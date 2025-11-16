import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { LabsCore, VitalsSnapshot, LifestyleProfile, AllergySummary, FamilyHistorySummary, WearableSummary } from "@/lib/risk/types";

export async function getLatestLabsCore(userId: string): Promise<LabsCore | null> {
  const { data, error } = await supabaseAdmin
    .from("labs_core")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestLabsCore: ${error.message}`);
  if (!data) return null;
  const {
    fasting_glucose_mg_dl, hba1c_percent, bun_mg_dl, creatinine_mg_dl, egfr_ml_min_1_73,
    chol_total_mg_dl, hdl_mg_dl, ldl_mg_dl, trig_mg_dl, alt_u_l, ast_u_l, alk_phos_u_l,
    tsh_ulU_ml, vitd_25oh_ng_ml
  } = data as any;
  return {
    fasting_glucose_mg_dl, hba1c_percent, bun_mg_dl, creatinine_mg_dl, egfr_ml_min_1_73,
    chol_total_mg_dl, hdl_mg_dl, ldl_mg_dl, trig_mg_dl, alt_u_l, ast_u_l, alk_phos_u_l,
    tsh_ulU_ml, vitd_25oh_ng_ml
  };
}

export async function getLatestVitals(userId: string): Promise<VitalsSnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from("vitals")
    .select("*")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestVitals: ${error.message}`);
  if (!data) return null;
  const { systolic_mm_hg, diastolic_mm_hg, heart_rate_bpm, spo2_percent, bmi } = data as any;
  return { systolic_mm_hg, diastolic_mm_hg, heart_rate_bpm, spo2_percent, bmi };
}

export async function getLifestyleProfile(userId: string): Promise<LifestyleProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("lifestyle_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getLifestyleProfile: ${error.message}`);
  if (!data) return null;
  const { sleep_hours_workdays, activity_level, smoker_status, stress_level, sleep_hours_weekends, work_pattern, alcohol_per_week, meds_json, supplements_json } = data as any;
  return {
    sleep_hours_workdays,
    sleep_hours_weekends,
    activity_level,
    work_pattern,
    smoker_status,
    alcohol_per_week,
    stress_level,
    meds_json,
    supplements_json
  };
}

export async function getAllergySummary(userId: string): Promise<AllergySummary | null> {
  // IgE and sensitizers from allergies_lab
  const { data: labRows, error: labErr } = await supabaseAdmin
    .from("allergies_lab")
    .select("test_name, igE_kU_L, class")
    .eq("user_id", userId);
  if (labErr) throw new Error(`getAllergySummary (labs): ${labErr.message}`);

  const igEValues = (labRows ?? []).map((r: any) => r.igE_kU_L).filter((v: any) => v != null) as number[];
  const igE_total_kU_L = igEValues.length ? Math.max(...igEValues) : null;

  const strong_sensitizers = (labRows ?? [])
    .filter((r: any) => r.class != null && r.class >= 3)
    .map((r: any) => r.test_name as string);

  // Symptom score from allergies_symptom
  const { data: symptom, error: symErr } = await supabaseAdmin
    .from("allergies_symptom")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (symErr) throw new Error(`getAllergySummary (symptom): ${symErr.message}`);

  let symptom_score: number | null = null;
  if (symptom) {
    const sevMap: Record<string, number> = { mild: 0.3, moderate: 0.6, strong: 0.8 };
    const freqMap: Record<string, number> = { rarely: 0.2, sometimes: 0.4, often: 0.7, daily: 1.0 };
    const s = sevMap[(symptom as any).severity] ?? null;
    const f = freqMap[(symptom as any).frequency] ?? null;
    if (s != null || f != null) {
      symptom_score = Math.max(s ?? 0, f ?? 0);
    }
  }

  return {
    igE_total_kU_L,
    strong_sensitizers,
    symptom_score
  };
}

export async function getFamilySummary(userId: string): Promise<FamilyHistorySummary | null> {
  const { data, error } = await supabaseAdmin
    .from("family_history")
    .select("condition")
    .eq("user_id", userId);
  if (error) throw new Error(`getFamilySummary: ${error.message}`);
  if (!data || data.length === 0) return null;

  const lower = (s: string) => (s || "").toLowerCase();
  const has_diabetes = data.some((r: any) => lower(r.condition).includes("diab"));
  const has_cvd = data.some((r: any) => /(cvd|cardio|heart|mi|stroke)/i.test(r.condition));
  const has_ckd = data.some((r: any) => /(ckd|kidney|renal)/i.test(r.condition));
  const has_autoimmune = data.some((r: any) => /(autoimmune|lupus|ra|psoriasis|celiac|hashimoto|graves)/i.test(r.condition));
  return { has_diabetes, has_cvd, has_ckd, has_autoimmune };
}

export async function getWearableSummary(userId: string): Promise<WearableSummary | null> {
  // avg_rhr, avg_hrv over last 30d from metrics
  const { data: last30, error: mErr } = await supabaseAdmin
    .from("metrics")
    .select("rhr, hrv_avg, sleep_minutes, day")
    .eq("user_id", userId)
    .gte("day", new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10))
    .order("day", { ascending: false });
  if (mErr) throw new Error(`getWearableSummary (metrics): ${mErr.message}`);

  let avg_rhr: number | null = null;
  let avg_hrv: number | null = null;
  if (last30 && last30.length > 0) {
    const rhrs = last30.map((r: any) => r.rhr).filter((v: any) => v != null) as number[];
    const hrvs = last30.map((r: any) => r.hrv_avg).filter((v: any) => v != null) as number[];
    if (rhrs.length) avg_rhr = rhrs.reduce((a, b) => a + b, 0) / rhrs.length;
    if (hrvs.length) avg_hrv = hrvs.reduce((a, b) => a + b, 0) / hrvs.length;
  }

  // sleep debt over last 7d vs 8h target
  const { data: last7, error: sErr } = await supabaseAdmin
    .from("metrics")
    .select("sleep_minutes, day")
    .eq("user_id", userId)
    .gte("day", new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10));
  if (sErr) throw new Error(`getWearableSummary (sleep): ${sErr.message}`);
  const totalSleepMin = (last7 ?? []).map((r: any) => r.sleep_minutes ?? 0).reduce((a: number, b: number) => a + b, 0);
  const targetMin = 8 * 60 * 7;
  const sleep_debt_hours = Math.max(0, (targetMin - totalSleepMin) / 60);

  // activity minutes over last 7d from lifestyle_workouts
  const { data: workouts, error: wErr } = await supabaseAdmin
    .from("lifestyle_workouts")
    .select("minutes, start")
    .eq("user_id", userId)
    .gte("start", new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString());
  if (wErr) throw new Error(`getWearableSummary (workouts): ${wErr.message}`);
  const activity_minutes = (workouts ?? []).map((w: any) => w.minutes ?? 0).reduce((a: number, b: number) => a + b, 0);

  return { avg_rhr, avg_hrv, sleep_debt_hours, activity_minutes };
}

export async function getUserProfile(userId: string): Promise<{ age_years: number | null; sex_at_birth: string | null } | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profile")
    .select("age_years, sex_at_birth")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getUserProfile: ${error.message}`);
  if (!data) return null;
  return {
    age_years: (data as any).age_years ?? null,
    sex_at_birth: (data as any).sex_at_birth ?? null
  };
}


