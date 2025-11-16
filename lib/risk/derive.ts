import { ConditionRisk, MultimodalContext } from "./types";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function tierFromIndex(x: number): ConditionRisk["tier"] {
  if (x >= 0.66) return "high";
  if (x >= 0.33) return "moderate";
  return "low";
}

export function computeConditionRisks(ctx: MultimodalContext): ConditionRisk[] {
  const out: ConditionRisk[] = [];

  const { labs, vitals, lifestyle, allergies, family, wearable } = ctx;

  // 0) NOTE: This engine is pattern-based and not diagnostic. It surfaces
  // patterns that could merit attention or further evaluation.

  // 1) Prediabetes pattern
  if (labs || vitals || lifestyle || family) {
    let score = 0;
    const reasons: string[] = [];
    const sources = new Set<string>();

    if (labs?.hba1c_percent != null) {
      sources.add("labs");
      const a1c = labs.hba1c_percent;
      if (a1c >= 5.7 && a1c < 6.5) {
        score += 0.5;
        reasons.push("HbA1c is in the prediabetes range.");
      } else if (a1c >= 6.5) {
        score += 0.8;
        reasons.push("HbA1c is in the diabetes range.");
      }
    }

    if (labs?.fasting_glucose_mg_dl != null) {
      sources.add("labs");
      const g = labs.fasting_glucose_mg_dl;
      if (g >= 100 && g < 126) {
        score += 0.3;
        reasons.push("Fasting glucose is above the normal range.");
      } else if (g >= 126) {
        score += 0.6;
        reasons.push("Fasting glucose is in the diabetes range.");
      }
    }

    if (vitals?.bmi != null) {
      sources.add("vitals");
      const bmi = vitals.bmi;
      if (bmi >= 25 && bmi < 30) {
        score += 0.15;
        reasons.push("BMI is in the overweight range.");
      } else if (bmi >= 30) {
        score += 0.3;
        reasons.push("BMI is in the obesity range.");
      }
    }

    if (lifestyle?.activity_level === "low") {
      sources.add("lifestyle");
      score += 0.1;
      reasons.push("Reported physical activity is low.");
    }

    if (family?.has_diabetes) {
      sources.add("family");
      score += 0.15;
      reasons.push("Family history of diabetes reported.");
    }

    const idx = clamp01(score);
    if (idx > 0) {
      out.push({
        condition: "prediabetes",
        index: idx,
        tier: tierFromIndex(idx),
        reasons,
        dataSources: Array.from(sources)
      });
    }
  }

  // 2) Kidney function pattern
  if (labs) {
    let score = 0;
    const reasons: string[] = [];
    const sources = new Set<string>(["labs"]);

    // Detect creatine supplementation to modulate signals
    const onCreatine =
      !!(ctx.lifestyle as any)?.supplements_json?.creatine?.using ||
      !!(ctx.lifestyle as any)?.supplements_json?.creatine_monohydrate ||
      !!(ctx.lifestyle as any)?.supplements_json?.creatine_like;

    if (labs.egfr_ml_min_1_73 != null) {
      const e = labs.egfr_ml_min_1_73;
      if (e < 90 && e >= 60) {
        score += onCreatine ? 0.15 : 0.3; // down-weight if on creatine
        reasons.push(
          onCreatine
            ? "eGFR is mildly reduced, but creatine use can lower estimated eGFR without true kidney damage."
            : "eGFR is mildly reduced compared to typical reference values."
        );
      } else if (e < 60) {
        score += onCreatine ? 0.5 : 0.8;
        reasons.push(
          onCreatine
            ? "eGFR is significantly below typical reference values; although creatine can lower eGFR estimates, this pattern should still be reviewed with a clinician."
            : "eGFR is significantly below typical reference values."
        );
      }
    }

    if (labs.creatinine_mg_dl != null) {
      const c = labs.creatinine_mg_dl;
      // simple threshold; you can refine by sex later
      if (c > 1.2) {
        score += onCreatine ? 0.1 : 0.2;
        reasons.push(
          onCreatine
            ? "Creatinine is slightly elevated; creatine supplementation and higher muscle mass can raise creatinine without true kidney damage."
            : "Creatinine is slightly elevated compared to typical reference ranges."
        );
      }
    }

    if (labs.bun_mg_dl != null && labs.bun_mg_dl > 20) {
      score += 0.1;
      reasons.push("BUN is above typical range.");
    }

    const idx = clamp01(score);
    if (idx > 0) {
      out.push({
        condition: "kidney_function",
        index: idx,
        tier: tierFromIndex(idx),
        reasons,
        dataSources: Array.from(sources)
      });
    }
  }

  // 3) Metabolic strain (liver + triglycerides + BMI + lifestyle)
  if (labs || vitals || lifestyle || wearable) {
    let score = 0;
    const reasons: string[] = [];
    const sources = new Set<string>();

    if (labs?.alt_u_l != null) {
      sources.add("labs");
      if (labs.alt_u_l > 35 && labs.alt_u_l <= 50) {
        score += 0.2;
        reasons.push("ALT is at the upper end of the reference range.");
      } else if (labs.alt_u_l > 50) {
        score += 0.4;
        reasons.push("ALT is above the typical reference range.");
      }
    }

    if (labs?.ast_u_l != null && labs.ast_u_l > 40) {
      sources.add("labs");
      score += 0.2;
      reasons.push("AST is above the typical reference range.");
    }

    if (labs?.trig_mg_dl != null && labs.trig_mg_dl >= 150) {
      sources.add("labs");
      score += 0.3;
      reasons.push("Triglycerides are elevated.");
    }

    if (vitals?.bmi != null && vitals.bmi >= 30) {
      sources.add("vitals");
      score += 0.2;
      reasons.push("BMI is in the obesity range.");
    }

    if (lifestyle?.alcohol_per_week != null && lifestyle.alcohol_per_week > 7) {
      sources.add("lifestyle");
      score += 0.1;
      reasons.push("Reported alcohol intake is above conservative thresholds.");
    }

    if (wearable?.sleep_debt_hours != null && wearable.sleep_debt_hours > 7) {
      sources.add("wearable");
      score += 0.1;
      reasons.push("Chronic sleep debt over the last week.");
    }

    const idx = clamp01(score);
    if (idx > 0) {
      out.push({
        condition: "metabolic_strain",
        index: idx,
        tier: tierFromIndex(idx),
        reasons,
        dataSources: Array.from(sources)
      });
    }
  }

  // 4) Thyroid pattern (based on TSH only for now)
  if (labs?.tsh_ulU_ml != null) {
    const sources = new Set<string>(["labs"]);
    let score = 0;
    const reasons: string[] = [];
    const tsh = labs.tsh_ulU_ml;

    if (tsh < 0.4) {
      score += 0.5;
      reasons.push("TSH is below the typical reference range (possible hyperthyroid pattern).");
    } else if (tsh > 4.5) {
      score += 0.5;
      reasons.push("TSH is above the typical reference range (possible hypothyroid pattern).");
    }

    const idx = clamp01(score);
    if (idx > 0) {
      out.push({
        condition: "thyroid",
        index: idx,
        tier: tierFromIndex(idx),
        reasons,
        dataSources: Array.from(sources)
      });
    }
  }

  // 5) Cardio-metabolic pattern (BP + lipids + BMI)
  if (vitals || labs) {
    let score = 0;
    const reasons: string[] = [];
    const sources = new Set<string>();

    if (vitals?.systolic_mm_hg != null && vitals?.diastolic_mm_hg != null) {
      sources.add("vitals");
      const sys = vitals.systolic_mm_hg;
      const dia = vitals.diastolic_mm_hg;

      if (sys >= 120 || dia >= 80) {
        score += 0.2;
        reasons.push("Blood pressure is at least in the elevated range.");
      }
      if (sys >= 130 || dia >= 85) {
        score += 0.3;
        reasons.push("Blood pressure is in a hypertensive range.");
      }
    }

    if (labs?.chol_total_mg_dl != null && labs.chol_total_mg_dl >= 200) {
      sources.add("labs");
      score += 0.2;
      reasons.push("Total cholesterol is above typical target values.");
    }
    if (labs?.ldl_mg_dl != null && labs.ldl_mg_dl >= 130) {
      sources.add("labs");
      score += 0.2;
      reasons.push("LDL cholesterol is elevated.");
    }
    if (labs?.hdl_mg_dl != null && labs.hdl_mg_dl < 40) {
      sources.add("labs");
      score += 0.1;
      reasons.push("HDL cholesterol is below typical protective range.");
    }

    if (vitals?.bmi != null && vitals.bmi >= 30) {
      sources.add("vitals");
      score += 0.1;
      reasons.push("Higher BMI may increase cardiovascular strain.");
    }

    const idx = clamp01(score);
    if (idx > 0) {
      out.push({
        condition: "cardio_pattern",
        index: idx,
        tier: tierFromIndex(idx),
        reasons,
        dataSources: Array.from(sources)
      });
    }
  }

  // 6) Inflammatory load (very rough: eosinophils/IgE + lifestyle/sleep)
  if (allergies || wearable || lifestyle) {
    let score = 0;
    const reasons: string[] = [];
    const sources = new Set<string>();

    if (allergies?.igE_total_kU_L != null) {
      sources.add("allergy_labs");
      const igE = allergies.igE_total_kU_L;
      if (igE > 100 && igE <= 400) {
        score += 0.3;
        reasons.push("Total IgE is above typical lab reference ranges.");
      } else if (igE > 400) {
        score += 0.5;
        reasons.push("Total IgE is markedly elevated.");
      }
    }

    if (allergies?.symptom_score != null && allergies.symptom_score > 0.4) {
      sources.add("allergy_symptoms");
      score += 0.2;
      reasons.push("User reports frequent or strong allergy/skin/respiratory symptoms.");
    }

    if (wearable?.sleep_debt_hours != null && wearable.sleep_debt_hours > 7) {
      sources.add("wearable");
      score += 0.1;
      reasons.push("Chronic sleep debt may increase inflammatory burden.");
    }

    if (lifestyle?.stress_level === "high") {
      sources.add("lifestyle");
      score += 0.1;
      reasons.push("Self-reported stress level is high.");
    }

    const idx = clamp01(score);
    if (idx > 0) {
      out.push({
        condition: "inflammatory_load",
        index: idx,
        tier: tierFromIndex(idx),
        reasons,
        dataSources: Array.from(sources)
      });
    }
  }

  // 7) Allergy burden (separate from general inflammation)
  if (allergies) {
    let score = 0;
    const reasons: string[] = [];
    const sources = new Set<string>();

    if (allergies.igE_total_kU_L != null) {
      sources.add("allergy_labs");
      const igE = allergies.igE_total_kU_L;
      if (igE > 100 && igE <= 400) score += 0.3;
      else if (igE > 400) score += 0.6;
    }

    if (allergies.strong_sensitizers && allergies.strong_sensitizers.length > 0) {
      sources.add("allergy_labs");
      score += 0.2;
      reasons.push(
        `Lab results show strong sensitization to: ${allergies.strong_sensitizers.slice(0,4).join(", ")}${allergies.strong_sensitizers.length>4 ? "…" : ""}.`
      );
    }

    if (allergies.symptom_score != null && allergies.symptom_score > 0.3) {
      sources.add("allergy_symptoms");
      score += 0.2;
      reasons.push("User reports recurring allergy-like symptoms.");
    }

    const idx = clamp01(score);
    if (idx > 0) {
      if (reasons.length === 0 && idx > 0) {
        reasons.push("Allergy-related lab values or symptoms suggest an increased allergic pattern.");
      }
      out.push({
        condition: "allergy_burden",
        index: idx,
        tier: tierFromIndex(idx),
        reasons,
        dataSources: Array.from(sources)
      });
    }
  }

  // 8) Autonomic recovery (HRV/RHR/sleep)
  if (wearable) {
    let score = 0;
    const reasons: string[] = [];
    const sources = new Set<string>(["wearable"]);

    if (wearable.avg_hrv != null && wearable.avg_hrv < 30) {
      score += 0.3;
      reasons.push("Average HRV is on the lower side for many adults.");
    }
    if (wearable.avg_rhr != null && wearable.avg_rhr > 75) {
      score += 0.2;
      reasons.push("Resting heart rate is relatively elevated.");
    }
    if (wearable.sleep_debt_hours != null && wearable.sleep_debt_hours > 7) {
      score += 0.2;
      reasons.push("Recent sleep debt suggests incomplete recovery.");
    }
    if (wearable.activity_minutes != null && wearable.activity_minutes < 150) {
      score += 0.1;
      reasons.push("Weekly moderate-to-vigorous activity is below typical guidelines.");
    }

    const idx = clamp01(score);
    if (idx > 0) {
      out.push({
        condition: "autonomic_recovery",
        index: idx,
        tier: tierFromIndex(idx),
        reasons,
        dataSources: Array.from(sources)
      });
    }
  }

  return out;
}

export function computeMultimodalRiskIndex(conditions: ConditionRisk[]): {
  overall_index: number;
  overall_tier: ConditionRisk["tier"];
} {
  if (!conditions.length) {
    return { overall_index: 0, overall_tier: "low" };
  }

  // Simple weighted average: you can tune weights per condition later.
  const weights: Record<ConditionRisk["condition"], number> = {
    prediabetes: 1.2,
    kidney_function: 1.0,
    metabolic_strain: 1.0,
    thyroid: 0.6,
    cardio_pattern: 1.2,
    inflammatory_load: 0.8,
    allergy_burden: 0.6,
    autonomic_recovery: 0.8
  };

  let wSum = 0;
  let s = 0;
  for (const c of conditions) {
    const w = weights[c.condition] ?? 1;
    wSum += w;
    s += c.index * w;
  }

  const idx = clamp01(wSum > 0 ? s / wSum : 0);
  return { overall_index: idx, overall_tier: tierFromIndex(idx) };
}

import { supabaseAdmin } from "../supabaseAdmin";

export type ConditionRisk = {
  condition: "prediabetes" | "metabolic_strain" | "inflammatory_load" | "cardio_autonomic";
  index: number;              // 0..1
  tier: "low" | "moderate" | "high";
  reasons: string[];
};

/**
 * Compute condition-level risks from labs, lifestyle, and family history.
 * Heuristic scoring function - non-diagnostic, for internal logic only.
 */
export function computeConditionRisks(input: {
  labs: { hba1c?: number | null; fasting_glucose?: number | null; crp?: number | null; ldl?: number | null; hdl?: number | null; };
  lifestyle: { bmi?: number | null; activity_level?: "low"|"medium"|"high"; sleep_debt_hours?: number | null; };
  family: { diabetes?: boolean; cvd?: boolean };
}): ConditionRisk[] {
  const results: ConditionRisk[] = [];

  // 1. Prediabetes index
  let prediabetesIndex = 0;
  const prediabetesReasons: string[] = [];
  const { hba1c, fasting_glucose } = input.labs;
  const { bmi, activity_level } = input.lifestyle;
  const { diabetes } = input.family;

  if (hba1c != null) {
    if (hba1c >= 5.7 && hba1c < 6.5) { prediabetesIndex += 0.5; prediabetesReasons.push("HbA1c in prediabetes range."); }
    if (hba1c >= 6.5) { prediabetesIndex += 0.7; prediabetesReasons.push("HbA1c in diabetes range."); }
  }
  if (fasting_glucose != null) {
    if (fasting_glucose >= 100 && fasting_glucose < 126) { prediabetesIndex += 0.3; prediabetesReasons.push("Fasting glucose elevated."); }
    if (fasting_glucose >= 126) { prediabetesIndex += 0.5; prediabetesReasons.push("Fasting glucose in diabetes range."); }
  }
  if (bmi != null && bmi >= 27) { prediabetesIndex += 0.2; prediabetesReasons.push("BMI in overweight/obese range."); }
  if (activity_level === "low") { prediabetesIndex += 0.1; prediabetesReasons.push("Low physical activity."); }
  if (diabetes) { prediabetesIndex += 0.15; prediabetesReasons.push("Family history of diabetes."); }

  const prediabetesClamped = Math.min(1, prediabetesIndex);
  let prediabetesTier: ConditionRisk["tier"] = "low";
  if (prediabetesClamped >= 0.33 && prediabetesClamped < 0.66) prediabetesTier = "moderate";
  if (prediabetesClamped >= 0.66) prediabetesTier = "high";
  if (prediabetesClamped > 0) {
    results.push({
      condition: "prediabetes",
      index: prediabetesClamped,
      tier: prediabetesTier,
      reasons: prediabetesReasons
    });
  }

  // 2. Metabolic strain index
  let metabolicIndex = 0;
  const metabolicReasons: string[] = [];
  const { ldl, hdl } = input.labs;
  const { cvd } = input.family;

  if (ldl != null && hdl != null) {
    const ratio = ldl / hdl;
    if (ratio > 3.5) { metabolicIndex += 0.5; metabolicReasons.push("LDL/HDL ratio > 3.5."); }
    else if (ratio > 2.5) { metabolicIndex += 0.3; metabolicReasons.push("LDL/HDL ratio elevated."); }
  }
  if (ldl != null && ldl > 160) { metabolicIndex += 0.3; metabolicReasons.push("LDL cholesterol > 160 mg/dL."); }
  if (hdl != null && hdl < 40) { metabolicIndex += 0.2; metabolicReasons.push("HDL cholesterol < 40 mg/dL."); }
  if (bmi != null && bmi >= 30) { metabolicIndex += 0.25; metabolicReasons.push("BMI in obese range."); }
  if (activity_level === "low") { metabolicIndex += 0.15; metabolicReasons.push("Low physical activity."); }
  if (cvd) { metabolicIndex += 0.2; metabolicReasons.push("Family history of cardiovascular disease."); }

  const metabolicClamped = Math.min(1, metabolicIndex);
  let metabolicTier: ConditionRisk["tier"] = "low";
  if (metabolicClamped >= 0.33 && metabolicClamped < 0.66) metabolicTier = "moderate";
  if (metabolicClamped >= 0.66) metabolicTier = "high";
  if (metabolicClamped > 0) {
    results.push({
      condition: "metabolic_strain",
      index: metabolicClamped,
      tier: metabolicTier,
      reasons: metabolicReasons
    });
  }

  // 3. Inflammatory load index
  let inflammatoryIndex = 0;
  const inflammatoryReasons: string[] = [];
  const { crp } = input.labs;
  const { sleep_debt_hours } = input.lifestyle;

  if (crp != null) {
    if (crp > 10) { inflammatoryIndex += 0.6; inflammatoryReasons.push("CRP > 10 mg/L (high inflammation)."); }
    else if (crp > 3) { inflammatoryIndex += 0.4; inflammatoryReasons.push("CRP elevated (3-10 mg/L)."); }
    else if (crp > 1) { inflammatoryIndex += 0.2; inflammatoryReasons.push("CRP slightly elevated."); }
  }
  if (bmi != null && bmi >= 30) { inflammatoryIndex += 0.2; inflammatoryReasons.push("Obesity associated with chronic inflammation."); }
  if (sleep_debt_hours != null && sleep_debt_hours > 2) { inflammatoryIndex += 0.15; inflammatoryReasons.push("Chronic sleep debt > 2 hours."); }
  if (activity_level === "low") { inflammatoryIndex += 0.1; inflammatoryReasons.push("Sedentary lifestyle."); }

  const inflammatoryClamped = Math.min(1, inflammatoryIndex);
  let inflammatoryTier: ConditionRisk["tier"] = "low";
  if (inflammatoryClamped >= 0.33 && inflammatoryClamped < 0.66) inflammatoryTier = "moderate";
  if (inflammatoryClamped >= 0.66) inflammatoryTier = "high";
  if (inflammatoryClamped > 0) {
    results.push({
      condition: "inflammatory_load",
      index: inflammatoryClamped,
      tier: inflammatoryTier,
      reasons: inflammatoryReasons
    });
  }

  // 4. Cardio-autonomic index (HRV, RHR, sleep patterns)
  let cardioIndex = 0;
  const cardioReasons: string[] = [];

  // Note: This would typically use HRV/RHR from metrics, but for now we'll use lifestyle proxies
  if (sleep_debt_hours != null && sleep_debt_hours > 3) { cardioIndex += 0.3; cardioReasons.push("Severe sleep debt > 3 hours."); }
  else if (sleep_debt_hours != null && sleep_debt_hours > 1) { cardioIndex += 0.15; cardioReasons.push("Moderate sleep debt."); }
  if (activity_level === "low") { cardioIndex += 0.2; cardioReasons.push("Low cardiovascular fitness."); }
  if (bmi != null && bmi >= 30) { cardioIndex += 0.15; cardioReasons.push("Obesity impacts autonomic function."); }
  if (cvd) { cardioIndex += 0.2; cardioReasons.push("Family history of cardiovascular disease."); }

  const cardioClamped = Math.min(1, cardioIndex);
  let cardioTier: ConditionRisk["tier"] = "low";
  if (cardioClamped >= 0.33 && cardioClamped < 0.66) cardioTier = "moderate";
  if (cardioClamped >= 0.66) cardioTier = "high";
  if (cardioClamped > 0) {
    results.push({
      condition: "cardio_autonomic",
      index: cardioClamped,
      tier: cardioTier,
      reasons: cardioReasons
    });
  }

  return results;
}

/**
 * Compute lab-based risk score (0..1) from recent lab results.
 * Maps CRP, HbA1c, LDL/HDL, Vit-D to risk using reference ranges + piecewise scoring.
 */
export async function labRisk(userId: string): Promise<number | null> {
  const sb = supabaseAdmin;
  
  // Get most recent lab results
  const { data: labs } = await sb
    .from("labs_basic")
    .select("date, crp, hba1c, ldl, hdl, vit_d")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!labs) return null;
  
  const scores: number[] = [];
  
  // CRP: <1 low, 1-3 normal, 3-10 elevated, >10 high risk
  if (labs.crp !== null) {
    const crp = Number(labs.crp);
    if (crp > 10) scores.push(0.8);
    else if (crp > 3) scores.push(0.5);
    else if (crp > 1) scores.push(0.2);
    else scores.push(0.1);
  }
  
  // HbA1c: <5.7 normal, 5.7-6.4 prediabetic, >6.4 diabetic
  if (labs.hba1c !== null) {
    const hba1c = Number(labs.hba1c);
    if (hba1c > 6.4) scores.push(0.7);
    else if (hba1c > 5.7) scores.push(0.4);
    else scores.push(0.1);
  }
  
  // LDL/HDL ratio: <2 optimal, 2-3.5 moderate, >3.5 high risk
  if (labs.ldl !== null && labs.hdl !== null) {
    const ratio = Number(labs.ldl) / Number(labs.hdl);
    if (ratio > 3.5) scores.push(0.6);
    else if (ratio > 2) scores.push(0.3);
    else scores.push(0.1);
  }
  
  // Vit-D: <20 deficient (risk), 20-30 insufficient, >30 optimal
  if (labs.vit_d !== null) {
    const vitd = Number(labs.vit_d);
    if (vitd < 20) scores.push(0.4);
    else if (vitd < 30) scores.push(0.2);
    else scores.push(0.05);
  }
  
  // Average of available scores, or null if none
  if (scores.length === 0) return null;
  return Math.min(1, scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Compute lifestyle risk score (0..1) from sleep debt and workout consistency.
 * Higher score = worse (more risk).
 */
export async function lifestyleScore(userId: string): Promise<number | null> {
  const sb = supabaseAdmin;
  
  // Get sleep data for last 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const since = fourteenDaysAgo.toISOString().slice(0, 10);
  
  const { data: sleepData } = await sb
    .from("lifestyle_sleep")
    .select("date, duration_min")
    .eq("user_id", userId)
    .gte("date", since)
    .order("date", { ascending: true });
  
  // Get workout data for last 14 days
  const { data: workoutData } = await sb
    .from("lifestyle_workouts")
    .select("start, type, minutes")
    .eq("user_id", userId)
    .gte("start", since)
    .order("start", { ascending: true });
  
  if (!sleepData?.length && !workoutData?.length) return null;
  
  const scores: number[] = [];
  
  // Sleep debt: target 7-9 hours (420-540 min)
  // Penalty for <7h or >9h, worse if consistently low
  if (sleepData && sleepData.length > 0) {
    const avgSleep = sleepData.reduce((sum, s) => sum + (s.duration_min || 0), 0) / sleepData.length;
    const targetMin = 420; // 7 hours
    const targetMax = 540; // 9 hours
    
    if (avgSleep < targetMin) {
      const deficit = targetMin - avgSleep;
      scores.push(Math.min(0.6, deficit / 120)); // max 0.6 for 2h deficit
    } else if (avgSleep > targetMax) {
      scores.push(0.2); // slight penalty for oversleeping
    } else {
      scores.push(0.05); // minimal risk for optimal sleep
    }
  }
  
  // Workout consistency: penalty for low frequency or irregularity
  if (workoutData && workoutData.length > 0) {
    const workoutsPerWeek = workoutData.length / 2; // 14 days = 2 weeks
    if (workoutsPerWeek < 2) {
      scores.push(0.3); // low frequency penalty
    } else if (workoutsPerWeek < 4) {
      scores.push(0.1);
    } else {
      scores.push(0.05); // good frequency
    }
  } else {
    scores.push(0.4); // no workouts = higher risk
  }
  
  // Average of available scores
  if (scores.length === 0) return null;
  return Math.min(1, scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Compute genetic prior risk (0..1) from genetic markers.
 * Small prior for high-risk variants (e.g., APOE4 → 0.15), else 0.
 */
export async function geneticPrior(userId: string): Promise<number | null> {
  const sb = supabaseAdmin;
  
  const { data: genetic } = await sb
    .from("context_genetic")
    .select("marker, variant, evidence_level")
    .eq("user_id", userId);
  
  if (!genetic || genetic.length === 0) return null;
  
  // Map known high-risk markers to priors
  const highRiskMarkers: Record<string, number> = {
    "APOE4": 0.15,
    "BRCA1": 0.25,
    "BRCA2": 0.25,
    "LDLR": 0.20,
  };
  
  let maxPrior = 0;
  
  for (const g of genetic) {
    const marker = g.marker?.toUpperCase();
    if (marker && highRiskMarkers[marker]) {
      maxPrior = Math.max(maxPrior, highRiskMarkers[marker]);
    } else if (g.evidence_level === "high") {
      maxPrior = Math.max(maxPrior, 0.15); // default high evidence
    } else if (g.evidence_level === "moderate") {
      maxPrior = Math.max(maxPrior, 0.08);
    }
  }
  
  return maxPrior > 0 ? maxPrior : null;
}

/**
 * Compute family history prior risk (0..1) from family history conditions.
 * Weights based on condition type (CVD/DM/Autoimmune).
 */
export async function familyPrior(userId: string): Promise<number | null> {
  const sb = supabaseAdmin;
  
  const { data: familyHx } = await sb
    .from("context_family_history")
    .select("condition, relation, age_of_onset")
    .eq("user_id", userId);
  
  if (!familyHx || familyHx.length === 0) return null;
  
  // Condition weights
  const conditionWeights: Record<string, number> = {
    "cardiovascular": 0.25,
    "heart disease": 0.25,
    "cvd": 0.25,
    "diabetes": 0.20,
    "type 2 diabetes": 0.20,
    "autoimmune": 0.15,
    "cancer": 0.20,
    "hypertension": 0.15,
  };
  
  // Relation weights (closer = higher risk)
  const relationWeights: Record<string, number> = {
    "parent": 1.0,
    "sibling": 0.8,
    "grandparent": 0.5,
    "aunt": 0.4,
    "uncle": 0.4,
    "cousin": 0.2,
  };
  
  let maxPrior = 0;
  
  for (const fh of familyHx) {
    const condition = fh.condition?.toLowerCase() || "";
    const relation = fh.relation?.toLowerCase() || "other";
    
    // Find matching condition weight
    let condWeight = 0.15; // default
    for (const [key, weight] of Object.entries(conditionWeights)) {
      if (condition.includes(key)) {
        condWeight = weight;
        break;
      }
    }
    
    // Apply relation multiplier
    const relMult = relationWeights[relation] || 0.3;
    const prior = condWeight * relMult;
    
    maxPrior = Math.max(maxPrior, prior);
  }
  
  return maxPrior > 0 ? maxPrior : null;
}

