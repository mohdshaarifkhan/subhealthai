import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type MetricMetaRow = {
  metric: string;
  display_name?: string | null;
  unit?: string | null;
  pop_low?: number | null;
  pop_high?: number | null;
  direction?: string | null;
};

type BaselineStatsRow = {
  mean_rhr?: number | null;
  sd_rhr?: number | null;
  mean_hrv?: number | null;
  sd_hrv?: number | null;
  mean_sleep?: number | null;
  sd_sleep?: number | null;
  mean_steps?: number | null;
  sd_steps?: number | null;
};

type MetricRow = {
  day: string;
  rhr?: number | null;
  hrv_avg?: number | null;
  sleep_minutes?: number | null;
  steps?: number | null;
};

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

  const { data: riskRows, error: riskError } = await supabaseAdmin
    .from("risk_scores")
    .select("day")
    .eq("user_id", user)
    .eq("model_version", version)
    .order("day", { ascending: false })
    .limit(1);

  if (riskError || !riskRows?.[0]) {
    return NextResponse.json({ error: "no risk day" }, { status: 404 });
  }

  const anchor = riskRows[0].day;

  const { data: todayRow, error: todayError } = await supabaseAdmin
    .from("metrics")
    .select("day, rhr, hrv_avg, sleep_minutes, steps")
    .eq("user_id", user)
    .eq("day", anchor)
    .maybeSingle();

  if (todayError) {
    return NextResponse.json({ error: todayError.message }, { status: 500 });
  }

  const { data: baselineData, error: baselineError } = await supabaseAdmin.rpc(
    "feature_baseline_stats",
    {
      p_user: user,
      p_before_day: anchor,
      p_window: 30,
    }
  );

  if (baselineError) {
    return NextResponse.json({ error: baselineError.message }, { status: 500 });
  }

  const baseline: BaselineStatsRow | undefined = baselineData?.[0];

  const { data: shapRows, error: shapError } = await supabaseAdmin
    .from("explain_contribs")
    .select("feature, value")
    .eq("user_id", user)
    .eq("model_version", version)
    .eq("day", anchor)
    .order("abs(value)", { ascending: false })
    .limit(4);

  if (shapError) {
    return NextResponse.json({ error: shapError.message }, { status: 500 });
  }

  const { data: metaRows, error: metaError } = await supabaseAdmin.from("metric_meta").select("*");

  if (metaError) {
    return NextResponse.json({ error: metaError.message }, { status: 500 });
  }

  const metaMap: Record<string, MetricMetaRow> = {};
  (metaRows as MetricMetaRow[] | null)?.forEach((m) => {
    metaMap[m.metric] = m;
  });

  const today = todayRow as MetricRow | null;

  function pack(
    name: keyof MetricRow,
    todayVal: number | null | undefined,
    mean: number | null | undefined,
    sd: number | null | undefined
  ) {
    const z =
      todayVal != null && mean != null && sd != null && sd > 0 ? (todayVal - mean) / sd : null;
    const meta = metaMap[name as string] ?? {};
    return {
      metric: name,
      today_value: todayVal ?? null,
      baseline_mean: mean ?? null,
      baseline_sd: sd ?? null,
      z_score: z,
      display: meta.display_name ?? name,
      unit: meta.unit ?? "",
      pop_low: meta.pop_low ?? null,
      pop_high: meta.pop_high ?? null,
      direction: meta.direction ?? "neutral",
    };
  }

  const context = [
    pack("rhr", today?.rhr ?? null, baseline?.mean_rhr ?? null, baseline?.sd_rhr ?? null),
    pack("hrv_avg", today?.hrv_avg ?? null, baseline?.mean_hrv ?? null, baseline?.sd_hrv ?? null),
    pack(
      "sleep_minutes",
      today?.sleep_minutes ?? null,
      baseline?.mean_sleep ?? null,
      baseline?.sd_sleep ?? null
    ),
    pack("steps", today?.steps ?? null, baseline?.mean_steps ?? null, baseline?.sd_steps ?? null),
  ];

  return NextResponse.json({
    user,
    version,
    day: anchor,
    context,
    shap: (shapRows ?? []).map((s) => ({
      feature: s.feature,
      shap_value: s.value,
    })),
  });
}


