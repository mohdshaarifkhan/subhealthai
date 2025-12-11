import { fuseRisk } from "./risk/fuse";
import { labRisk, lifestyleScore, geneticPrior, familyPrior } from "./risk/derive";
import { supabaseAdmin } from "./supabaseAdmin";

export async function getRiskSeries(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("risk_scores")
    .select("day,risk_score,model_version")
    .eq("user_id", userId)
    .order("day", { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Compute contextual risk by fusing wearable data, labs, lifestyle, and priors.
 * Writes to risk_scores (risk_total) and explain_contribs.
 */
export async function computeContextualRisk(userId: string): Promise<any> {
  const sb = supabaseAdmin;
  const today = new Date().toISOString().slice(0, 10);
  
  // 1. Get latest wearable risk score
  const { data: wearableRiskRow } = await sb
    .from("risk_scores")
    .select("risk_score, day")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const wearableRisk = wearableRiskRow?.risk_score ? Number(wearableRiskRow.risk_score) : null;
  const riskDay = wearableRiskRow?.day || today;
  
  // 2-5. Compute derived risks
  const [labRiskVal, lifestyleScoreVal, geneticPriorVal, familyPriorVal] = await Promise.all([
    labRisk(userId),
    lifestyleScore(userId),
    geneticPrior(userId),
    familyPrior(userId),
  ]);
  
  // 6. Fuse all inputs
  const riskTotal = fuseRisk({
    wearableRisk,
    labRisk: labRiskVal,
    lifestyleScore: lifestyleScoreVal,
    geneticPrior: geneticPriorVal,
    familyPrior: familyPriorVal,
  });
  
  // 7. Write to risk_scores (upsert with risk_total)
  const { error: riskError } = await sb
    .from("risk_scores")
    .upsert({
      user_id: userId,
      day: riskDay,
      risk_score: wearableRisk ?? 0,
      risk_total: riskTotal,
      model_version: "contextual-v1",
    }, {
      onConflict: "user_id,day,model_version",
    });
  
  if (riskError) {
    throw new Error(`Failed to write risk_scores: ${riskError.message}`);
  }
  
  // 8. Write explain_contribs entries per domain
  // Delete existing contributions for this user/day/model_version first
  await sb
    .from("explain_contribs")
    .delete()
    .eq("user_id", userId)
    .eq("day", riskDay)
    .eq("model_version", "contextual-v1");
  
  const w = { wearable: 0.42, lab: 0.28, lifestyle: 0.12, genetic: 0.10, family: 0.08 };
  const contributors: Array<{ feature: string; value: number }> = [];
  const contribRows: Array<{
    user_id: string;
    day: string;
    feature: string;
    value: number;
    model_version: string;
  }> = [];
  
  if (wearableRisk !== null) {
    const contrib = w.wearable * wearableRisk;
    contributors.push({ feature: "wearable", value: contrib });
    contribRows.push({
      user_id: userId,
      day: riskDay,
      feature: "wearable",
      value: contrib,
      model_version: "contextual-v1",
    });
  }
  
  if (labRiskVal !== null) {
    const contrib = w.lab * labRiskVal;
    contributors.push({ feature: "lab", value: contrib });
    contribRows.push({
      user_id: userId,
      day: riskDay,
      feature: "lab",
      value: contrib,
      model_version: "contextual-v1",
    });
  }
  
  if (lifestyleScoreVal !== null) {
    const contrib = w.lifestyle * lifestyleScoreVal;
    contributors.push({ feature: "lifestyle", value: contrib });
    contribRows.push({
      user_id: userId,
      day: riskDay,
      feature: "lifestyle",
      value: contrib,
      model_version: "contextual-v1",
    });
  }
  
  if (geneticPriorVal !== null) {
    const contrib = w.genetic * geneticPriorVal;
    contributors.push({ feature: "genetic", value: contrib });
    contribRows.push({
      user_id: userId,
      day: riskDay,
      feature: "genetic",
      value: contrib,
      model_version: "contextual-v1",
    });
  }
  
  if (familyPriorVal !== null) {
    const contrib = w.family * familyPriorVal;
    contributors.push({ feature: "family", value: contrib });
    contribRows.push({
      user_id: userId,
      day: riskDay,
      feature: "family",
      value: contrib,
      model_version: "contextual-v1",
    });
  }
  
  if (contribRows.length > 0) {
    const { error: contribError } = await sb
      .from("explain_contribs")
      .insert(contribRows);
    
    if (contribError) {
      throw new Error(`Failed to write explain_contribs: ${contribError.message}`);
    }
  }
  
  // 9. Get flags for recent period
  const { data: flags } = await sb
    .from("flags")
    .select("day, flag_type, severity, rationale")
    .eq("user_id", userId)
    .gte("day", new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10))
    .order("day", { ascending: false })
    .limit(20);
  
  // 10. Get baselines (from baseline_versions)
  const { data: baselines } = await sb
    .from("baseline_versions")
    .select("signal, params_json")
    .eq("user_id", userId);
  
  const baselineMap = new Map((baselines ?? []).map((b) => [b.signal, b.params_json]));
  
  return {
    risk_total: riskTotal,
    contributors: contributors.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    baselines: Object.fromEntries(baselineMap),
    flags: flags ?? [],
    inputs: {
      wearableRisk,
      labRisk: labRiskVal,
      lifestyleScore: lifestyleScoreVal,
      geneticPrior: geneticPriorVal,
      familyPrior: familyPriorVal,
    },
    day: riskDay,
    timestamp: new Date().toISOString(),
  };
}