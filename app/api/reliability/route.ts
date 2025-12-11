import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version") || "phase3-v1-wes";
  const segment = searchParams.get("segment") || "all";

  let { data: bins, error } = await supabaseAdmin
    .from("eval_reliability")
    .select("bin, pred, obs, n, version")
    .eq("version", version)
    .eq("segment", segment)
    .order("bin", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!bins || bins.length === 0) {
    const prefix = version.split("-").slice(0, 2).join("-");
    const resp = await supabaseAdmin
      .from("eval_reliability")
      .select("bin, pred, obs, n, version")
      .eq("segment", segment)
      .ilike("version", `${prefix}%`)
      .order("bin", { ascending: true });

    bins = resp.data || [];
    error = resp.error;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const cacheVersion =
    bins?.[0]?.version ?? version.split("-").slice(0, 2).join("-");

  const { data: cache } = await supabaseAdmin
    .from("evaluation_cache")
    .select("ece, brier")
    .ilike("version", `${cacheVersion.split("-").slice(0, 2).join("-")}%`)
    .limit(1);

  const normalizedBins =
    bins?.map((r) => ({
      bin: Number(r.bin),
      predicted_prob: Number(r.pred),
      observed_rate: Number(r.obs),
      n: Number(r.n),
    })) ?? [];

  return NextResponse.json({
    version,
    ece: cache?.[0]?.ece ?? null,
    brier: cache?.[0]?.brier ?? null,
    bins: normalizedBins,
  });
}


