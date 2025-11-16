import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user");
  const version = searchParams.get("version");

  if (!user || !version)
    return NextResponse.json({ error: "missing ?user or ?version" }, { status: 400 });

  try {
    // --- Forecast
    const { data: forecastRows, error: fErr } = await supabaseAdmin
      .from("risk_scores")
      .select("day, risk_score")
      .eq("user_id", user)
      .eq("model_version", version)
      .order("day", { ascending: false })
      .limit(14);

    if (fErr) throw fErr;
    const forecast_series = (forecastRows ?? [])
      .map((r) => ({ day: r.day, risk: Number(r.risk_score) }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const latest_forecast = forecast_series.at(-1);

    // --- Anomaly z-scores
    const { data: metricsRows } = await supabaseAdmin
      .from("metrics")
      .select("day, rhr, hrv_avg, sleep_minutes, steps")
      .eq("user_id", user)
      .order("day", { ascending: false })
      .limit(1);

    const latestDay = metricsRows?.[0]?.day;
    const { data: baselines } = await supabaseAdmin
      .from("baseline_versions")
      .select("signal, params_json")
      .eq("user_id", user);

    const baseBySig = new Map((baselines ?? []).map((b) => [b.signal, b.params_json]));
    const z = (val: number, sig: string) => {
      const p = baseBySig.get(sig);
      if (!p) return null;
      const std = Number(p.std ?? 0);
      return std ? (val - Number(p.mean)) / std : null;
    };

    const anomalies = metricsRows?.length
      ? [
          { signal: "rhr", z: z(metricsRows[0].rhr, "rhr") },
          { signal: "hrv", z: z(metricsRows[0].hrv_avg, "hrv_avg") },
          { signal: "sleep", z: z(metricsRows[0].sleep_minutes, "sleep_minutes") },
          { signal: "steps", z: z(metricsRows[0].steps, "steps") },
        ]
      : [];

    // --- Eval (Reliability + Volatility)
    const { data: rel } = await supabaseAdmin
      .from("eval_reliability")
      .select("bin, pred, obs, n")
      .eq("version", version)
      .eq("segment", "all")
      .order("bin", { ascending: true });

    const { data: vol } = await supabaseAdmin
      .from("eval_volatility_series")
      .select("day, mean_delta")
      .eq("version", version)
      .eq("segment", "all")
      .order("day", { ascending: true });

    const ece =
      rel && rel.length
        ? rel.reduce((s, r) => s + Math.abs(r.pred - r.obs) * r.n, 0) /
          rel.reduce((s, r) => s + r.n, 0)
        : null;

    const stability =
      vol && vol.length
        ? vol.reduce((s, v) => s + Math.abs(v.mean_delta ?? 0), 0) / vol.length
        : null;

    return NextResponse.json({
      user,
      version,
      forecast: {
        latest: latest_forecast,
        series: forecast_series,
      },
      anomaly: {
        day: latestDay,
        items: anomalies,
      },
      eval: {
        reliability: { ece, points: rel },
        volatility: { stability, points: vol },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "internal error" }, { status: 500 });
  }
}

