import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveUserId } from "@/lib/resolveUser";

type MetricKey = "rhr" | "hrv" | "sleep" | "steps";

const SIGNAL_TO_COL: Record<MetricKey, string> = {
  rhr: "rhr",
  hrv: "hrv_avg",
  sleep: "sleep_minutes",
  steps: "steps",
};

const zScore = (val?: number | null, mean?: number | null, std?: number | null) =>
  val == null || mean == null || !std || std === 0 ? null : (val - mean) / std;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const userParam = searchParams.get("user");
    if (!userParam) {
      return NextResponse.json({ error: "missing ?user" }, { status: 400 });
    }
    const user = await resolveUserId(userParam);

    const dayParam = searchParams.get("day") ?? undefined;

    const { data: last, error: lastErr } = await supabaseAdmin
      .from("metrics")
      .select("day")
      .eq("user_id", user)
      .order("day", { ascending: false })
      .limit(1);

    if (lastErr) {
      throw lastErr;
    }

    const anchor = dayParam ?? last?.[0]?.day;
    if (!anchor) {
      return NextResponse.json({ error: "no metrics found" }, { status: 404 });
    }

    const { data: todayRow, error: todayErr } = await supabaseAdmin
      .from("metrics")
      .select("day, rhr, hrv_avg, sleep_minutes, steps")
      .eq("user_id", user)
      .lte("day", anchor)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (todayErr) {
      throw todayErr;
    }

    if (!todayRow) {
      return NextResponse.json({ error: "no metrics on or before day" }, { status: 404 });
    }

    const { data: baselines, error: baseErr } = await supabaseAdmin
      .from("baseline_versions")
      .select("signal, params_json")
      .eq("user_id", user);

    if (baseErr) {
      throw baseErr;
    }

    const baseBySignal = new Map(
      (baselines ?? []).map((b: any) => [b.signal as MetricKey, b.params_json as any])
    );

    const ORDER: MetricKey[] = ["rhr", "hrv", "sleep", "steps"];
    const items = ORDER.map((sig) => {
      const col = SIGNAL_TO_COL[sig];
      const val = (todayRow as any)[col] as number | null | undefined;

      const pj = baseBySignal.get(sig);
      const mean = pj ? Number(pj.mean ?? pj["mean"]) : null;
      const std = pj ? Number(pj.std ?? pj["std"]) : null;

      const z = zScore(val, mean, std);
      const flag = z != null && Math.abs(z) >= 2.0;

      return {
        signal: sig,
        day: todayRow.day,
        today: val ?? null,
        baseline_mean: mean,
        baseline_std: std,
        z,
        flag,
      };
    });

    const suggest_recalibration = items.every((i) => i.z != null && Math.abs(i.z) < 0.5);

    return NextResponse.json({
      user,
      day: todayRow.day,
      items,
      thresholds: { anomaly_z: 2.0, stable_z: 0.5 },
      suggest_recalibration,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "internal error" }, { status: 500 });
  }
}

