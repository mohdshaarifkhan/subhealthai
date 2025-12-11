import { createClient } from "@supabase/supabase-js";
import type { DashboardViewData, ForecastPoint, VolatilityPoint } from "@/lib/dashboardViewData";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Use service role key to bypass RLS for server-side queries
const sb = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function buildRealUserDashboard(userId: string): Promise<DashboardViewData | null> {
  // 1) Risk timeline for last 30 days
  // Try v_risk_timeline view first, fallback to risk_scores table
  let risks: Array<{ day: string; risk: number | string }> | null = null;
  
  const { data: timelineView, error: viewErr } = await sb
    .from("v_risk_timeline")
    .select("day,risk,model_version,flag_type,severity,features")
    .eq("user_id", userId)
    .order("day", { ascending: true })
    .limit(60);

  if (!viewErr && timelineView) {
    risks = timelineView.map((r: any) => ({
      day: r.day,
      risk: r.risk ?? r.risk_score,
    }));
  } else {
    // Fallback to risk_scores table
    const { data: riskRows, error: riskErr } = await sb
      .from("risk_scores")
      .select("day,risk_score")
      .eq("user_id", userId)
      .order("day", { ascending: true })
      .limit(60);

    if (riskErr || !riskRows || riskRows.length === 0) {
      return null;
    }

    risks = riskRows.map((r: any) => ({
      day: r.day,
      risk: r.risk_score,
    }));
  }

  if (!risks || risks.length === 0) return null;

  const latest = risks[risks.length - 1];

  const instabilityScore = Math.round(Number(latest.risk) * 100);
  const status: DashboardViewData["status"] =
    instabilityScore < 33 ? "STABLE" : instabilityScore < 66 ? "ELEVATED" : "VOLATILE";

  // Forecast: last 14 days of risk
  const recent = risks.slice(-14);
  const forecast: ForecastPoint[] = recent.map(r => ({
    date: new Date(r.day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    value: Math.round(Number(r.risk) * 100),
  }));

  // Volatility: mean absolute day-to-day delta over last 14 days
  const diffs: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const prev = Number(recent[i - 1].risk);
    const curr = Number(recent[i].risk);
    diffs.push(Math.abs(curr - prev));
  }
  const volatilityIndex = diffs.length
    ? (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(3)
    : "0.000";

  const volatilityTrail: VolatilityPoint[] = recent.map((r, i) => ({
    date: new Date(r.day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    value: i === 0
      ? "0.000"
      : Math.abs(Number(recent[i].risk) - Number(recent[i - 1].risk)).toFixed(3),
  }));

  // TODO: vitals, sleep, labs, drivers, drift => you already have helper queries for these.

  const base: DashboardViewData = {
    instabilityScore,
    status,
    narrative: "Autonomic instability vs your 28-day baseline (prototype text TODO).",
    vitals: { hrv: 0, rhr: 0, resp: 0, temp: 98.6 }, // fill from metrics + vitals
    trends: { hrv: "stable", rhr: "stable" },
    drivers: [], // top explain_contribs rows
    drift: { metabolic: "Unknown", cardio: "Unknown", inflammation: "Unknown" },
    sleep: { deep: 0, rem: 0, light: 0, awake: 0 },
    labs: [],
    forecast,
    volatilityIndex,
    volatilityTrail,
    reliabilityBins: undefined,
    reliability: undefined,
  };

  return base;
}

