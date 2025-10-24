import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function toPct(x: number) { return Math.round(Math.min(1, Math.max(0, x)) * 100); }

function explainFromZ(z: Record<string, number>) {
  const items: string[] = [];
  const zval = (k: string) => Number.isFinite(z[k]) ? (z[k] as number) : 0;

  // HRV lower than baseline → higher risk (z- better)
  const hrv = zval("hrv_mean_z");
  items.push(hrv > 0.5 ? "HRV higher than baseline (↑) — contributes to lower risk."
    : hrv < -0.5 ? "HRV lower than baseline (↓) — contributes to higher risk."
    : "HRV near baseline — minimal effect.");

  // RHR higher than baseline → higher risk (z+ worse)
  const rhr = zval("rhr_mean_z");
  items.push(rhr > 0.5 ? "Resting Heart Rate higher than baseline (↑) — contributes to higher risk."
    : rhr < -0.5 ? "Resting Heart Rate lower than baseline (↓) — contributes to lower risk."
    : "Resting Heart Rate near baseline — minimal effect.");

  // Sleep z- (lower → higher risk)
  const slp = zval("sleep_hours_z");
  items.push(slp > 0.5 ? "Sleep Duration higher than baseline (↑) — contributes to lower risk."
    : slp < -0.5 ? "Sleep Duration lower than baseline (↓) — contributes to higher risk."
    : "Sleep Duration near baseline — minimal effect.");

  // Steps z- (lower → higher risk)
  const stp = zval("steps_z");
  items.push(stp > 0.5 ? "Daily Steps higher than baseline (↑) — contributes to lower risk."
    : stp < -0.5 ? "Daily Steps lower than baseline (↓) — contributes to higher risk."
    : "Daily Steps near baseline — minimal effect.");

  return items;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user");
  if (!user) return NextResponse.json({ error: "missing user" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // latest risk
  const { data: row, error } = await supabase
    .from("risk_scores")
    .select("day,risk_score,model_version,features")
    .eq("user_id", user)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ message: "no risk rows" });

  let reasons: string[] = [];
  try {
    const feats = typeof row.features === "string" ? JSON.parse(row.features) : row.features;
    reasons = explainFromZ(feats?.z ?? {});
  } catch {}

  // latest image (<= same day)
  const { data: img } = await supabase
    .from("explainability_images")
    .select("img_url, day")
    .eq("user_id", user)
    .lte("day", row.day)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    day: row.day,
    riskPercent: toPct(row.risk_score),
    modelVersion: row.model_version,
    reasons,
    imageUrl: img?.img_url ?? undefined,
    disclaimer:
      "This is a non-diagnostic AI indicator intended for preventive context and clinician discussion only."
  });
}