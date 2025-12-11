import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Returns calibration + volatility for a model version */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version");
  const segment = searchParams.get("segment") ?? "all";

  if (!version) {
    return NextResponse.json({ error: "missing ?version" }, { status: 400 });
  }

  const { data: rel, error: relErr } = await supabaseAdmin
    .from("eval_reliability")
    .select("bin, pred, obs, n")
    .eq("version", version)
    .eq("segment", segment)
    .order("bin", { ascending: true });

  if (relErr) {
    return NextResponse.json({ error: relErr.message }, { status: 500 });
  }

  let nTot = 0;
  let ece = 0;
  let brier = 0;

  (rel ?? []).forEach((r) => {
    const n = Number(r.n ?? 0);
    const p = Number(r.pred ?? 0);
    const o = Number(r.obs ?? 0);
    nTot += n;
    ece += n * Math.abs(p - o);
    brier += n * Math.pow(p - o, 2);
  });

  const ECE = nTot ? ece / nTot : null;
  const BRIER = nTot ? brier / nTot : null;

  const { data: vol, error: volErr } = await supabaseAdmin
    .from("eval_volatility_series")
    .select("day, mean_delta")
    .eq("version", version)
    .eq("segment", segment)
    .order("day", { ascending: true });

  if (volErr) {
    return NextResponse.json({ error: volErr.message }, { status: 500 });
  }

  const stability_index =
    (vol ?? []).length
      ? (vol as any[]).reduce((s, v) => s + Math.abs(Number(v.mean_delta ?? 0)), 0) /
        (vol as any[]).length
      : null;

  return NextResponse.json({
    version,
    segment,
    reliability: {
      points: (rel ?? []).map((r) => ({
        bin: Number(r.bin),
        pred: Number(r.pred),
        obs: Number(r.obs),
        n: Number(r.n),
      })),
      ece: ECE,
      brier: BRIER,
    },
    volatility: {
      series: (vol ?? []).map((v) => ({
        day: v.day as string,
        mean_delta: Number(v.mean_delta),
      })),
      stability_index,
    },
  });
}

