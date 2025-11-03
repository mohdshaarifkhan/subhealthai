import { z } from "zod";
import { supabaseAdmin } from "../supabaseAdmin";
import { Tools, ToolName } from "../../contracts/tools";

// Simple Zod validators aligned with JSON Schemas
const GetMetrics = z.object({ user_id: z.string(), day: z.string() });
const GetShap = z.object({ user_id: z.string(), day: z.string(), topk: z.number().optional() });
const GetTrend = z.object({ user_id: z.string(), days: z.number().int().positive() });

export type GetMetricsArgs = z.infer<typeof GetMetrics>;
export type GetShapArgs = z.infer<typeof GetShap>;
export type GetTrendArgs = z.infer<typeof GetTrend>;

// Execute implementations
async function execGetMetrics(args: GetMetricsArgs) {
  const { data, error } = await supabaseAdmin
    .from("metrics")
    .select("day,steps,sleep_minutes,hr_avg,hrv_avg,rhr")
    .eq("user_id", args.user_id)
    .eq("day", args.day)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

function humanFeature(key: string) {
  if (key.includes("hrv")) return "HRV";
  if (key.includes("rhr")) return "RHR";
  if (key.includes("sleep")) return "Sleep";
  if (key.includes("steps")) return "Steps";
  return key;
}

function shapMessage(name: string, z: number) {
  const abs = Math.abs(z);
  // Directionality: HRV: higher z lowers risk; RHR: higher z raises risk; Sleep/Steps: higher z lowers risk
  if (name === "HRV") return z > 0.5 ? "HRV higher than baseline contributes to lower risk." : z < -0.5 ? "HRV lower than baseline contributes to higher risk." : "HRV near baseline; minimal effect.";
  if (name === "RHR") return z > 0.5 ? "RHR higher than baseline contributes to higher risk." : z < -0.5 ? "RHR lower than baseline contributes to lower risk." : "RHR near baseline; minimal effect.";
  if (name === "Sleep") return z > 0.5 ? "Sleep duration higher than baseline contributes to lower risk." : z < -0.5 ? "Sleep duration lower than baseline contributes to higher risk." : "Sleep duration near baseline; minimal effect.";
  if (name === "Steps") return z > 0.5 ? "Daily steps higher than baseline contribute to lower risk." : z < -0.5 ? "Daily steps lower than baseline contribute to higher risk." : "Daily steps near baseline; minimal effect.";
  return abs > 0.5 ? `${name} deviates from baseline.` : `${name} near baseline.`;
}

async function execGetShap(args: GetShapArgs) {
  // Use risk_scores.features.z for the specified day
  const { data: row, error } = await supabaseAdmin
    .from("risk_scores")
    .select("day,features,model_version")
    .eq("user_id", args.user_id)
    .eq("day", args.day)
    .order("model_version")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return { items: [] };

  let z: Record<string, number> = {};
  try {
    const feats = typeof row.features === "string" ? JSON.parse(row.features) : row.features;
    z = (feats?.z as Record<string, number>) || {};
  } catch {
    z = {};
  }

  const entries = Object.entries(z)
    .filter(([, v]) => Number.isFinite(v))
    .map(([k, v]) => ({ key: k, name: humanFeature(k), z: Number(v), abs: Math.abs(Number(v)) }))
    .sort((a, b) => b.abs - a.abs);

  const top = (args.topk && args.topk > 0 ? entries.slice(0, args.topk) : entries).map(e => ({
    feature: e.name,
    z: e.z,
    message: shapMessage(e.name, e.z),
  }));
  return { items: top };
}

async function execGetTrend(args: GetTrendArgs) {
  const { data, error } = await supabaseAdmin
    .from("risk_scores")
    .select("day,risk_score,model_version")
    .eq("user_id", args.user_id)
    .order("day", { ascending: false })
    .limit(args.days);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).slice().reverse();
  return rows;
}

export async function executeTool(name: ToolName, args: unknown) {
  switch (name) {
    case "get_metrics": {
      const a = GetMetrics.parse(args);
      return await execGetMetrics(a);
    }
    case "get_shap_explanations": {
      const a = GetShap.parse(args);
      return await execGetShap(a);
    }
    case "get_trend": {
      const a = GetTrend.parse(args);
      return await execGetTrend(a);
    }
    default:
      throw new Error("Unknown tool");
  }
}

