import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  let user: string;
  try {
    user = await resolveUserId(searchParams.get("user"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const version = searchParams.get("version") || "phase3-v1-wes";

  const { data: f, error: ef } = await supabaseAdmin
    .from("risk_scores")
    .select("day, model_version, risk_score, created_at")
    .eq("user_id", user)
    .eq("model_version", version)
    .order("day", { ascending: false })
    .limit(1);

  if (ef) {
    return NextResponse.json({ error: ef.message }, { status: 500 });
  }

  const forecast = f?.[0] ?? null;

  const { data: b, error: eb } = await supabaseAdmin
    .from("risk_scores")
    .select("day, model_version, risk_score")
    .eq("user_id", user)
    .like("model_version", "baseline%")
    .order("day", { ascending: false })
    .limit(1);

  if (eb) {
    return NextResponse.json({ error: eb.message }, { status: 500 });
  }

  const baseline = b?.[0] ?? null;

  const { data: t, error: et } = await supabaseAdmin
    .from("risk_scores")
    .select("day, risk_score")
    .eq("user_id", user)
    .eq("model_version", version)
    .order("day", { ascending: false })
    .gte("day", new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10));

  if (et) {
    return NextResponse.json({ error: et.message }, { status: 500 });
  }

  return NextResponse.json({
    user,
    version,
    baseline: baseline
      ? {
          day: baseline.day,
          model: baseline.model_version,
          risk: Number(baseline.risk_score),
        }
      : null,
    forecast: forecast
      ? {
          day: forecast.day,
          model: forecast.model_version,
          risk: Number(forecast.risk_score),
          updated_at: forecast.created_at,
        }
      : null,
    last14: (t ?? []).map((r) => ({ day: r.day, risk: Number(r.risk_score) })),
  });
}


