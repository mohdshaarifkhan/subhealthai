import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SHAP_TO_DB } from "@/lib/shapMap";

const BASELINE_WINDOW = 28;

const DB_COLS = ["steps", "sleep_minutes", "hr_avg", "hrv_avg", "rhr"] as const;

type MetricRow = {
  steps?: number | null;
  sleep_minutes?: number | null;
  hr_avg?: number | null;
  hrv_avg?: number | null;
  rhr?: number | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const user = await resolveUserId(searchParams.get("user"));
  let day = searchParams.get("day");

  if (!day) {
    const { data, error } = await supabaseAdmin
      .from("metrics")
      .select("day")
      .eq("user_id", user)
      .order("day", { ascending: false })
      .limit(1);
    if (error || !data?.[0]) return NextResponse.json({ error: "no metrics" }, { status: 404 });
    day = data[0].day as string;
  }

  const { data: todayRow, error: todayError } = await supabaseAdmin
    .from("metrics")
    .select("day, steps, sleep_minutes, hr_avg, hrv_avg, rhr")
    .eq("user_id", user)
    .eq("day", day)
    .maybeSingle();

  if (todayError || !todayRow)
    return NextResponse.json({ error: "no row for day" }, { status: 404 });

  const end = new Date(day);
  end.setDate(end.getDate() - 2);

  const start = new Date(end);
  start.setDate(start.getDate() - (BASELINE_WINDOW - 1));

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data: baseRows, error: baselineError } = await supabaseAdmin
    .from("metrics")
    .select("steps, sleep_minutes, hr_avg, hrv_avg, rhr")
    .eq("user_id", user)
    .gte("day", startStr)
    .lte("day", endStr);

  if (baselineError)
    return NextResponse.json({ error: baselineError.message }, { status: 500 });

  const baselines: Record<string, number | null> = {};
  const stds: Record<string, number | null> = {};

  for (const col of DB_COLS) {
    const values =
      baseRows?.map((row) => Number(row[col as keyof MetricRow])).filter((x) => Number.isFinite(x)) ?? [];
    baselines[col] = mean(values);
    stds[col] = std(values);
  }

  const items: Record<
    string,
    { unit: string; today: number | null; baseline: number | null; delta: number | null; z: number | null }
  > = {};

  for (const [shapKey, { col, unit }] of Object.entries(SHAP_TO_DB)) {
    const todayVal = todayRow[col as keyof MetricRow] ?? null;
    const baseVal = baselines[col] ?? null;
    const todayNum = todayVal != null ? Number(todayVal) : null;
    const deltaNum = todayNum != null && baseVal != null ? todayNum - baseVal : null;

    items[shapKey] = {
      unit,
      today: todayNum,
      baseline: baseVal,
      delta: deltaNum,
      z: computeZ(todayNum, baseVal, stds[col] ?? null),
    };
  }

  return new NextResponse(
    JSON.stringify({ user, day, items }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      },
    }
  );
}

function mean(arr: number[]) {
  return arr.length ? arr.reduce((sum, val) => sum + val, 0) / arr.length : null;
}

function std(arr: number[]) {
  if (arr.length < 2) return null;
  const m = mean(arr);
  if (m == null) return null;
  const variance = arr.reduce((sum, val) => sum + (val - m) * (val - m), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function computeZ(val: number | null | undefined, mu: number | null, s: number | null) {
  if (val == null || mu == null || s == null || s === 0) return null;
  return (val - mu) / s;
}


