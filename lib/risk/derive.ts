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

// Export functions for risk computation
export async function labRisk(userId: string): Promise<number> {
  // Stub implementation - compute risk from lab values
  // This would query labs and compute a risk score
  return 0;
}

export async function lifestyleScore(userId: string): Promise<number> {
  // Stub implementation - compute lifestyle risk score
  // This would query lifestyle data and compute a score
  return 0;
}

export async function geneticPrior(userId: string): Promise<number> {
  // Stub implementation - genetic prior risk
  // This would query genetic data if available
  return 0;
}

export async function familyPrior(userId: string): Promise<number> {
  // Stub implementation - family history prior risk
  // This would query family history data
  return 0;
}

