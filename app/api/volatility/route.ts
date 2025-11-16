import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version") || "phase3-v1-wes";
  const segment = searchParams.get("segment") || "all";

  let { data: series, error } = await supabaseAdmin
    .from("eval_volatility_series")
    .select("day, mean_delta, version")
    .eq("version", version)
    .eq("segment", segment)
    .order("day", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!series || series.length === 0) {
    const prefix = version.split("-").slice(0, 2).join("-");
    const resp = await supabaseAdmin
      .from("eval_volatility_series")
      .select("day, mean_delta, version")
      .eq("segment", segment)
      .ilike("version", `${prefix}%`)
      .order("day", { ascending: true });

    series = resp.data || [];
    error = resp.error;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const cacheVersion =
    series?.[0]?.version ?? version.split("-").slice(0, 2).join("-");

  const { data: cache } = await supabaseAdmin
    .from("evaluation_cache")
    .select("volatility")
    .ilike("version", `${cacheVersion.split("-").slice(0, 2).join("-")}%`)
    .limit(1);

  return NextResponse.json({
    version,
    stability_index: cache?.[0]?.volatility ?? null,
    series: (series ?? []).map((r) => ({ day: r.day, vol: Number(r.mean_delta) })),
  });
}


