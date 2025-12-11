import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveUserId } from "@/lib/resolveUser";

type SeriesPoint = { day: string; risk: number };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const userParam = searchParams.get("user");
  const version = searchParams.get("version");
  const days = Number(searchParams.get("days") ?? 14);

  if (!userParam || !version) {
    return NextResponse.json({ error: "missing ?user or ?version" }, { status: 400 });
  }

  // 🔑 Resolve email → UUID if needed
  let user: string;
  try {
    user = await resolveUserId(userParam);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data: latest, error: latestErr } = await supabaseAdmin
    .from("risk_scores")
    .select("day, risk_score")
    .eq("user_id", user)
    .eq("model_version", version)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    return NextResponse.json({ error: latestErr.message }, { status: 500 });
  }

  if (!latest) {
    return NextResponse.json({ error: "no risk scores for version" }, { status: 404 });
  }

  const { data: timeline, error: tlErr } = await supabaseAdmin
    .from("risk_scores")
    .select("day, risk_score")
    .eq("user_id", user)
    .eq("model_version", version)
    .order("day", { ascending: false })
    .limit(days);

  if (tlErr) {
    return NextResponse.json({ error: tlErr.message }, { status: 500 });
  }

  const series: SeriesPoint[] = (timeline ?? [])
    .map((r) => ({ day: r.day as string, risk: Number(r.risk_score) }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return NextResponse.json({
    user,
    version,
    latest: { day: latest.day, risk: Number(latest.risk_score) },
    series,
  });
}

