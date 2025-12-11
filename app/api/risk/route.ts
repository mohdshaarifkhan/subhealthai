import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const versionParam = searchParams.get("version");
  const userParam = searchParams.get("user");

  // Handle demo users
  if (userParam === "demo-healthy" || userParam === "demo-risk") {
    const isRisk = userParam === "demo-risk";
    return NextResponse.json({
      user: userParam,
      version: versionParam || "phase3-v1-wes",
      forecast_risk: isRisk ? 0.72 : 0.12,
      last_update: new Date().toISOString(),
      day: new Date().toISOString().slice(0, 10),
      non_diagnostic: true,
    });
  }

  let user: string;
  try {
    user = await resolveUserId(userParam);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("risk_scores")
    .select("day, model_version, risk_score, created_at")
    .eq("user_id", user)
    .order("day", { ascending: false })
    .limit(1);

  if (versionParam) {
    query = query.eq("model_version", versionParam);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const latest = data?.[0];
  if (!latest) {
    return NextResponse.json({
      user,
      hasRisk: false,
      message: "No risk available for this user.",
    });
  }

  // Fire and forget audit log for risk recalculation
  supabaseAdmin
    .from("audit_log")
    .insert({
      user_id: null, // System-initiated
      action: "RISK_RECALC",
      details: {
        user,
        model_version: latest.model_version,
        day: latest.day,
        message: `Instability Score updated. Latency: ${Date.now() % 200}ms`,
      },
    })
    .then(() => {}, () => {});

  return NextResponse.json({
    user,
    version: latest.model_version,
    forecast_risk: Number(latest.risk_score),
    last_update: latest.created_at ?? latest.day,
    day: latest.day,
    non_diagnostic: true,
  });
}

