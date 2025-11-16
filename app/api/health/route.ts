import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const ENGINE_VERSION_FALLBACK = "phase3-core-v2";

export async function GET() {
  try {
    // Engine metadata (optional table)
    let meta: any = null;
    try {
      const { data } = await supabaseAdmin.from("engine_metadata").select("*").eq("id", 1).maybeSingle();
      meta = data ?? null;
    } catch {
      meta = null;
    }

    // DB accessibility check
    let okDb = false;
    try {
      const { error } = await supabaseAdmin.from("risk_scores").select("1", { count: "exact", head: true }).limit(1);
      okDb = !error;
    } catch {
      okDb = false;
    }

    // Exports presence (optional)
    let okExports = false;
    try {
      const fs = await import("fs");
      okExports = fs.existsSync("exports/metrics.csv");
    } catch {
      okExports = false;
    }

    // Optional materialized view presence
    let okMv = false;
    try {
      const { data, error } = await supabaseAdmin.rpc("pg_catalog.to_regclass", {
        regclass: "public.mv_explain_top4",
      } as any);
      if (!error) {
        okMv = Boolean(data);
      }
    } catch {
      okMv = false;
    }

    const dbOk = okDb;

    // Back-compat fields + SaMD-style health summary
    return NextResponse.json({
      ok: okDb && okExports,
      db: okDb,
      exports: okExports,
      mv_explain_top4: okMv,

      status: dbOk ? "ok" : "degraded",
      engine_version: meta?.engine_version ?? ENGINE_VERSION_FALLBACK,
      db_details: {
        ok: dbOk,
        risk_scores_accessible: okDb,
      },
      jobs: {
        last_risk_job_at: meta?.last_risk_job_at ?? null,
        last_export_at: meta?.last_export_at ?? null,
      },
      time_utc: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "health check failed" }, { status: 500 });
  }
}
