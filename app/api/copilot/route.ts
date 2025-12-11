import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { CopilotContext, getDashboard, getExplain, getAnomaly, getMetricTrend, reportLink } from "@/lib/copilot/tools";
import { getMultimodalRiskForReport } from "@/lib/server/multimodalRisk";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "ollama",
  baseURL: process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1",
});
const MODEL = process.env.COPILOT_MODEL || process.env.LLM_MODEL || "qwen2.5:7b";

function detectExistingIntents(s: string) {
  if (/(why|explain|contributors|shap)/.test(s)) return "explain";
  if (/(trend|last 7|past week|spark|trajectory)/.test(s)) return "trend";
  if (/(anomaly|baseline|z[- ]?score|recalib)/.test(s)) return "anomaly";
  if (/(pdf|report|export)/.test(s)) return "report";
  return "summary";
}

function detectIntent(userMessage: string) {
  const msg = userMessage.toLowerCase();

  if (msg.includes("condition") || msg.includes("multimodal"))
    return "multimodal_overview";

  if (msg.includes("pre-diabetes") || msg.includes("prediabetes"))
    return "multimodal_condition_prediabetes";

  if (msg.includes("kidney"))
    return "multimodal_condition_kidney";

  if (msg.includes("thyroid"))
    return "multimodal_condition_thyroid";

  if (msg.includes("inflammation") || msg.includes("inflammatory"))
    return "multimodal_condition_inflammatory";

  if (msg.includes("allergy"))
    return "multimodal_condition_allergy";

  // fallback
  return detectExistingIntents(msg);
}

function detectMetric(q: string): "rhr" | "hrv" | "sleep_minutes" | "steps" | null {
  const s = q.toLowerCase();
  if (/(rhr|resting hr|resting heart)/.test(s)) return "rhr";
  if (/(hrv|variability)/.test(s)) return "hrv";
  if (/(sleep|min|hours)/.test(s)) return "sleep_minutes";
  if (/(step|activity|walk)/.test(s)) return "steps";
  return null;
}

type ConditionId =
  | "prediabetes"
  | "kidney_function"
  | "metabolic_strain"
  | "thyroid"
  | "cardio_pattern"
  | "inflammatory_load"
  | "allergy_burden"
  | "autonomic_recovery";

function detectCondition(q: string): ConditionId | null {
  const s = q.toLowerCase();
  if (/prediabet|a1c|fasting glucose/.test(s)) return "prediabetes";
  if (/kidney|renal|egfr|creatinine/.test(s)) return "kidney_function";
  if (/metabolic strain|liver|alt|ast|triglyceride|trig/.test(s)) return "metabolic_strain";
  if (/thyroid|tsh/.test(s)) return "thyroid";
  if (/cardio|blood pressure|bp|cholesterol|hdl|ldl/.test(s)) return "cardio_pattern";
  if (/inflamm|crp|eosinophil/.test(s)) return "inflammatory_load";
  if (/allerg|sensitiz|ige/.test(s)) return "allergy_burden";
  if (/autonomic|hrv|recovery|resting heart/.test(s)) return "autonomic_recovery";
  return null;
}

function labelForCondition(c: ConditionId): string {
  return ({
    prediabetes: "Prediabetes Pattern",
    kidney_function: "Kidney Function Pattern",
    metabolic_strain: "Metabolic Strain Pattern",
    thyroid: "Thyroid Pattern",
    cardio_pattern: "Cardio-Metabolic Pattern",
    inflammatory_load: "Inflammatory Load Pattern",
    allergy_burden: "Allergy Burden Pattern",
    autonomic_recovery: "Autonomic Recovery Pattern",
  } as const)[c];
}

function multimodalOverview(multimodal: any): string {
  if (!multimodal) return "No multimodal context available.";
  const lines: string[] = [];
  lines.push(
    `Overall multimodal index: ${Math.round(multimodal.overall.overall_index * 100)}% (${multimodal.overall.overall_tier})`
  );
  if (Array.isArray(multimodal.conditions) && multimodal.conditions.length > 0) {
    lines.push("Condition patterns:");
    multimodal.conditions.forEach((c: any) => {
      lines.push(`- ${labelForCondition(c.condition)}: ${Math.round(c.index * 100)}% (${c.tier})`);
    });
  } else {
    lines.push("No condition-level patterns available yet.");
  }
  lines.push("Non-diagnostic; compared to your own baseline.");
  return lines.join("\n");
}

function multimodalConditionDetail(multimodal: any, cond: ConditionId | null): string {
  if (!multimodal) return "No multimodal context available.";
  const list: any[] = Array.isArray(multimodal.conditions) ? multimodal.conditions : [];
  const picked: any | undefined = cond ? list.find((c) => c.condition === cond) : undefined;
  if (!picked) {
    return multimodalOverview(multimodal);
  }
  const lines: string[] = [];
  lines.push(`${labelForCondition(picked.condition as ConditionId)}: ${Math.round(picked.index * 100)}% (${picked.tier})`);
  if (Array.isArray(picked.reasons) && picked.reasons.length) {
    lines.push("Why this pattern:");
    picked.reasons.slice(0, 5).forEach((r: string) => lines.push(`- ${r}`));
  } else {
    lines.push("Not enough detail to explain contributors yet.");
  }
  if (Array.isArray(picked.dataSources) && picked.dataSources.length) {
    lines.push(`Sources: ${picked.dataSources.join(" · ")}`);
  }
  lines.push("Non-diagnostic; compared to your own baseline.");
  return lines.join("\n");
}

// Optional convenience wrapper matching requested signature
function multimodalCondition(condName: ConditionId, multimodal: any): string {
  if (!multimodal || !Array.isArray(multimodal.conditions)) {
    return "Not enough information to evaluate this pattern yet.";
  }
  const c = multimodal.conditions.find((x: any) => x.condition === condName);
  if (!c) return "Not enough information to evaluate this pattern yet.";
  let txt = `${labelForCondition(condName)}: ${Math.round(c.index * 100)}% (${c.tier})\n\n`;
  txt += "Key factors influencing this pattern:\n";
  (c.reasons ?? []).slice(0, 5).forEach((r: string) => {
    txt += `• ${r}\n`;
  });
  return txt;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, version, range, messages } = body as {
      user?: string;
      version?: string;
      range?: string;
      messages: { role: "user" | "assistant"; content: string }[];
    };

    const ctx = CopilotContext.parse({ user, version, range });
    const lastUser = messages?.slice().reverse().find(m => m.role === "user")?.content ?? "";
    const intent = detectIntent(lastUser);
    const metric = detectMetric(lastUser);
    const condition = detectCondition(lastUser);

    const packs: Array<{ title: string; data: any }> = [];

    if (intent === "explain" || intent === "summary") {
      const [dash, expl, multi] = await Promise.all([getDashboard(ctx), getExplain(ctx), getMultimodalRiskForReport(ctx.user)]);
      packs.push({ title: "dashboard", data: dash });
      packs.push({ title: "explain", data: expl });
      packs.push({ title: "multimodal", data: multi });
    }

    if (intent === "trend") {
      const m = metric ?? "rhr";
      const [trend, expl, multi] = await Promise.all([getMetricTrend(ctx, m), getExplain(ctx), getMultimodalRiskForReport(ctx.user)]);
      packs.push({ title: `trend_${m}`, data: trend });
      packs.push({ title: "explain", data: expl });
      packs.push({ title: "multimodal", data: multi });
    }

    if (intent === "anomaly") {
      const [anom, dash, multi] = await Promise.all([getAnomaly(ctx), getDashboard(ctx), getMultimodalRiskForReport(ctx.user)]);
      packs.push({ title: "anomaly", data: anom });
      packs.push({ title: "dashboard", data: dash });
      packs.push({ title: "multimodal", data: multi });
    }

    if (intent === "report") {
      packs.push({ title: "report_url", data: { url: reportLink(ctx) } });
    }

    if (intent === "multimodal_overview") {
      const multi = await getMultimodalRiskForReport(ctx.user);
      packs.push({ title: "multimodal", data: multi });
    }

    if (intent.startsWith("multimodal_condition_")) {
      const multi = await getMultimodalRiskForReport(ctx.user);
      let picked = condition;
      if (!picked) {
        if (intent === "multimodal_condition_prediabetes") picked = "prediabetes";
        else if (intent === "multimodal_condition_kidney") picked = "kidney_function";
        else if (intent === "multimodal_condition_thyroid") picked = "thyroid";
        else if (intent === "multimodal_condition_inflammatory") picked = "inflammatory_load";
        else if (intent === "multimodal_condition_allergy") picked = "allergy_burden";
      }
      const selected =
        picked && multi?.conditions
          ? multi.conditions.find((c: any) => c.condition === picked) ?? null
          : null;
      packs.push({ title: "multimodal", data: multi });
      packs.push({ title: "multimodal_selected_condition", data: { condition: condition ?? null, selected } });
    }

    const sys = [
      "You are SubHealthAI's Preventive Copilot.",
      "You provide NON-DIAGNOSTIC explanations only.",
      "",
      "You can use these JSON context packs:",
      "- dashboard (HRV, HR, sleep, steps)",
      "- explain (SHAP contributors)",
      "- anomalies (z-score alerts)",
      "- trends (7-day metric deltas)",
      "- multimodal (labs, vitals, lifestyle, allergies, condition patterns)",
      "",
      "Rules:",
      "1. NEVER diagnose.",
      '2. ALWAYS say "pattern", "trend", "overlap", "signal", "non-diagnostic".',
      "3. Use the JSON patterns directly, never guess medical values.",
      '4. If data is missing, explicitly say "insufficient information".',
      "5. For conditions: summarize 'pattern index', 'tier', and top 2–4 reasons.",
      "6. Keep text short, scientific, and readable by clinicians & USCIS reviewers.",
    ].join("\n");

    const context: Record<string, any> = {};
    for (const p of packs) context[p.title] = p.data;

    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify({ user_question: lastUser, context }) },
        ] as any,
      });

      const text = completion.choices[0]?.message?.content ?? "";

      return NextResponse.json({
        intent,
        metric,
        condition,
        answer: text,
        context,
        report_url: intent === "report" ? reportLink(ctx) : undefined,
      });
    } catch (err: any) {
      console.error("[copilot LLM error]", err?.message || err);

      const dash = packs.find(p => p.title === "dashboard")?.data;
      const exp = packs.find(p => p.title === "explain")?.data;
      const multi = packs.find(p => p.title === "multimodal")?.data;
      const riskPct = dash?.forecast_risk != null ? Math.round(dash.forecast_risk * 100) : "—";
      const basePct = dash?.baseline_risk != null ? Math.round(dash.baseline_risk * 100) : "—";
      const top = Array.isArray(exp?.top_contributors) ? exp.top_contributors.slice(0, 2) : [];
      const bullets = top
        .map((t: any) => {
          const updown = t.shap_value > 0 ? "raised" : "reduced";
          return `• ${t.feature}: today ${t.today} vs baseline ${t.baseline} (z ${t.z}); ${updown} risk`;
        })
        .join("\n");

      let fallback = `Today's forecast risk: ${riskPct}% (baseline ${basePct}%).
${bullets || "No strong contributors today."}
Non-diagnostic; compared to your own baseline.`;

      if (intent === "multimodal_overview" && multi) {
        fallback = multimodalOverview(multi);
      }
      if (intent.startsWith("multimodal_condition_") && multi) {
        fallback = multimodalConditionDetail(multi, condition);
      }

      return NextResponse.json(
        {
          intent,
          metric,
          condition,
          answer: fallback,
          fallback: true,
          report_url: intent === "report" ? reportLink(ctx) : undefined,
        },
        { status: 200 },
      );
    }
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message ?? "copilot-failed" }, { status: 500 });
  }
}


