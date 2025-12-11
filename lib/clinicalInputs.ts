// lib/clinicalInputs.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const sb = createClient(supabaseUrl, supabaseAnonKey);

export type ClinicalInputs = {
  glucose: number;
  bmi: number;
  age: number;
  systolic_bp: number;
  cholesterol: number;
  pregnancies: number;
  insulin: number;
  skin_thickness: number;
  avg_hrv: number;
  daily_steps: number;
  sleep_hours: number;
};

export async function buildClinicalInputs(userId: string): Promise<ClinicalInputs | null> {
  // 1) Labs (fasting_glucose, chol, maybe insulin later)
  const { data: labs } = await sb
    .from("labs_core")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2) Vitals for BP (optional)
  const { data: vitals } = await sb
    .from("vitals")
    .select("*")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3) Profile for age, weight/height
  const { data: profile } = await sb
    .from("user_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // 4) Recent metrics for HRV, steps, sleep
  const { data: metricsRow } = await sb
    .from("metrics")
    .select("*")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!labs || !profile) {
    // Without core labs + profile we can't run Pima/Cleveland.
    return null;
  }

  // BMI from vitals if present, else from profile, else fallback
  let bmi = 26;
  if (vitals?.weight_kg && vitals?.height_cm && vitals.height_cm > 0) {
    const hM = Number(vitals.height_cm) / 100;
    bmi = Number(vitals.weight_kg) / (hM * hM);
  } else if (profile?.weight_kg && profile?.height_cm && profile.height_cm > 0) {
    const hM = Number(profile.height_cm) / 100;
    bmi = Number(profile.weight_kg) / (hM * hM);
  }

  const age = profile?.age_years ?? 33; // you can set this properly later

  return {
    glucose: Number(labs.fasting_glucose_mg_dl ?? 94),
    bmi,
    age,
    systolic_bp: Number(vitals?.systolic_mm_hg ?? 120),
    cholesterol: Number(labs.chol_total_mg_dl ?? 180),
    pregnancies: 0, // not used for you, but required by model signature
    insulin: 79.0,
    skin_thickness: 20.0,
    avg_hrv: Number(metricsRow?.hrv_avg ?? 45),
    daily_steps: Number(metricsRow?.steps ?? 5000),
    sleep_hours: Number(metricsRow?.sleep_minutes ?? 7 * 60) / 60,
  };
}

