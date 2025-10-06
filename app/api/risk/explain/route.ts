import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = {
  day: string;
  risk_score: number;
  model_version: string;
  features: any; // JSON with { raw, z }
};

function toPct(x: number) {
  return Math.round(Math.min(1, Math.max(0, x)) * 100);
}

function explainFromZ(z: Record<string, number>) {
  // z-scores directionality used in models: HRV(z-) better=↑, RHR(z+) worse=↑, Sleep(z-) better=↑, Steps(z-) better=↑
  const items: { feature: string; z: number; impact: string }[] = [];
  const push = (feature: string, zval: number, worseWhenPositive: boolean, label: string) => {
    const dir = zval;
    const mag = Math.abs(dir);
    if (!isFinite(dir)) return;
    let impact: string;
    if (worseWhenPositive) {
      if (dir > 0.5) impact = `${label} higher than baseline (↑) — contributes to higher risk.`;
      else if (dir < -0.5) impact = `${label} lower than baseline (↓) — contributes to lower risk.`;
      else impact = `${label} near baseline — minimal effect.`;
    } else {
      if (dir > 0.5) impact = `${label} higher than baseline (↑) — contributes to lower risk.`;
      else if (dir < -0.5) impact = `${label} lower than baseline (↓) — contributes to higher risk.`;
      else impact = `${label} near baseline — minimal effect.`;
    }
    items.push({ feature: label, z: mag, impact });
  };

  // Map our canonical z keys to readable labels
  push("hrv_mean", z["hrv_mean_z"] ?? 0, false, "HRV");
  push("rhr_mean", z["rhr_mean_z"] ?? 0, true, "Resting Heart Rate");
  push("sleep_hours", z["sleep_hours_z"] ?? 0, false, "Sleep Duration");
  push("steps", z["steps_z"] ?? 0, false, "Daily Steps");

  items.sort((a, b) => b.z - a.z);
  return items.slice(0, 4).map(i => i.impact);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user");
  if (!user) return NextResponse.json({ error: "missing user" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // latest risk row
  const { data, error } = await supabase
    .from("risk_scores")
    .select("day,risk_score,model_version,features")
    .eq("user_id", user)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: "no risk rows" });

  const row = data as Row;
  let reasons: string[] = [];
  try {
    const feats = typeof row.features === "string" ? JSON.parse(row.features) : row.features;
    reasons = explainFromZ(feats?.z ?? {});
  } catch {}

  // Optional: If you later upload SHAP/fallback images to Supabase Storage, include a URL here.
  // For now, we leave imageUrl undefined.
  const payload = {
    day: row.day,
    riskPercent: toPct(row.risk_score),
    modelVersion: row.model_version,
    reasons,
    imageUrl: undefined as string | undefined,
    disclaimer:
      "This is a non-diagnostic AI indicator for preventive context and clinician discussion only."
  };

  return NextResponse.json(payload);
}
