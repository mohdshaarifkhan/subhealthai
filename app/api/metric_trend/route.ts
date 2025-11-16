import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { shapToColumn } from "@/lib/shapMap";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const user = await resolveUserId(searchParams.get("user"));
  const metricKey = searchParams.get("metric");

  if (!metricKey) {
    return NextResponse.json({ error: "missing metric" }, { status: 400 });
  }

  const dbColumn = shapToColumn(metricKey);
  const days = Number(searchParams.get("days") ?? 7);

  const since = new Date();
  since.setDate(since.getDate() - (isFinite(days) ? days - 1 : 6));
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("metrics")
    .select(`day, ${dbColumn}`)
    .eq("user_id", user)
    .gte("day", sinceStr)
    .order("day", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const series =
    data?.map((row) => ({
      day: row.day,
      value: row[dbColumn as keyof typeof row] != null ? Number(row[dbColumn as keyof typeof row]) : null,
    })) ?? [];

  return NextResponse.json({
    user,
    metric: metricKey,
    days,
    series,
  });
}


