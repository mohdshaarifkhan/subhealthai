import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { SHAP_TO_DB } from "@/lib/shapMap";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const user = await resolveUserId(searchParams.get("user"));
  const days = Math.max(3, Math.min(90, Number(searchParams.get("days") || 7)));
  const features =
    searchParams
      .get("features")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? ["rhr", "hrv", "sleep_debt", "forecast_delta"];

  const columns = Array.from(
    new Set(
      features
        .map((f) => SHAP_TO_DB[f]?.col)
        .filter((col): col is string => Boolean(col))
    )
  );

  if (!columns.length) {
    return NextResponse.json({ series: {}, days, user });
  }

  const { data: latest } = await supabaseAdmin
    .from("metrics")
    .select("day")
    .eq("user_id", user)
    .order("day", { ascending: false })
    .limit(1);

  if (!latest?.[0]) {
    return NextResponse.json({ series: {}, days, user }, { status: 404 });
  }

  const end = new Date(latest[0].day);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("metrics")
    .select(["day", ...columns].join(","))
    .eq("user_id", user)
    .gte("day", startStr)
    .lte("day", endStr)
    .order("day", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const series: Record<string, Array<{ day: string; value: number | null }>> = {};
  for (const feature of features) {
    const col = SHAP_TO_DB[feature]?.col;
    if (!col) {
      series[feature] = [];
      continue;
    }
    series[feature] =
      data?.map((row: any) => ({
        day: row.day,
        value: row[col] != null ? Number(row[col]) : null,
      })) ?? [];
  }

  return new NextResponse(
    JSON.stringify({ user, days, series }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      },
    }
  );
}


