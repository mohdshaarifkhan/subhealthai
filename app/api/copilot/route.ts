import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { CopilotContext, getDashboard, getExplain, getAnomaly, getMetricTrend, reportLink } from "@/lib/copilot/tools";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "ollama",
  baseURL: process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1",
});
const MODEL = process.env.COPILOT_MODEL || process.env.LLM_MODEL || "qwen2.5:7b";

function inferIntent(q: string) {
  const s = q.toLowerCase();
  if (/(why|explain|contributors|shap)/.test(s)) return "explain";
  if (/(trend|last 7|past week|spark|trajectory)/.test(s)) return "trend";
  if (/(anomaly|baseline|z[- ]?score|recalib)/.test(s)) return "anomaly";
  if (/(pdf|report|export)/.test(s)) return "report";
  return "summary";
}

function detectMetric(q: string): "rhr" | "hrv" | "sleep_minutes" | "steps" | null {
  const s = q.toLowerCase();
  if (/(rhr|resting hr|resting heart)/.test(s)) return "rhr";
  if (/(hrv|variability)/.test(s)) return "hrv";
  if (/(sleep|min|hours)/.test(s)) return "sleep_minutes";
  if (/(step|activity|walk)/.test(s)) return "steps";
  return null;
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
    const intent = inferIntent(lastUser);
    const metric = detectMetric(lastUser);

    const packs: Array<{ title: string; data: any }> = [];

    if (intent === "explain" || intent === "summary") {
      const [dash, expl] = await Promise.all([getDashboard(ctx), getExplain(ctx)]);
      packs.push({ title: "dashboard", data: dash });
      packs.push({ title: "explain", data: expl });
    }

    if (intent === "trend") {
      const m = metric ?? "rhr";
      const [trend, expl] = await Promise.all([getMetricTrend(ctx, m), getExplain(ctx)]);
      packs.push({ title: `trend_${m}`, data: trend });
      packs.push({ title: "explain", data: expl });
    }

    if (intent === "anomaly") {
      const [anom, dash] = await Promise.all([getAnomaly(ctx), getDashboard(ctx)]);
      packs.push({ title: "anomaly", data: anom });
      packs.push({ title: "dashboard", data: dash });
    }

    if (intent === "report") {
      packs.push({ title: "report_url", data: { url: reportLink(ctx) } });
    }

    const sys = [
      "You are SubHealthAI Copilot.",
      "Always remind that outputs are non-diagnostic and compared to the user's baseline.",
      "Be concise, structured, and actionable.",
      "If numbers look like z-scores or deltas, label them clearly.",
      "If asked for a trend, describe short-term trajectory and what likely influenced it.",
    ].join(" ");

    const content = [
      { type: "text", text: `User question: ${lastUser}` },
      { type: "text", text: `Context packs (JSON):\n${JSON.stringify(packs, null, 2)}` },
    ];

    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: [
              { type: "text", text: `User question: ${lastUser}` },
              { type: "text", text: `Context packs (JSON):\n${JSON.stringify(packs, null, 2)}` },
            ] as any,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "";

      return NextResponse.json({
        intent,
        metric,
        answer: text,
        report_url: intent === "report" ? reportLink(ctx) : undefined,
      });
    } catch (err: any) {
      console.error("[copilot LLM error]", err?.message || err);

      const dash = packs.find(p => p.title === "dashboard")?.data;
      const exp = packs.find(p => p.title === "explain")?.data;
      const riskPct = dash?.forecast_risk != null ? Math.round(dash.forecast_risk * 100) : "—";
      const basePct = dash?.baseline_risk != null ? Math.round(dash.baseline_risk * 100) : "—";
      const top = Array.isArray(exp?.top_contributors) ? exp.top_contributors.slice(0, 2) : [];
      const bullets = top
        .map((t: any) => {
          const updown = t.shap_value > 0 ? "raised" : "reduced";
          return `• ${t.feature}: today ${t.today} vs baseline ${t.baseline} (z ${t.z}); ${updown} risk`;
        })
        .join("\n");

      const fallback = `Today's forecast risk: ${riskPct}% (baseline ${basePct}%).
${bullets || "No strong contributors today."}
Non-diagnostic; compared to your own baseline.`;

      return NextResponse.json(
        {
          intent,
          metric,
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


