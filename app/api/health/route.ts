import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    let okDb = false;
    try {
      const { error } = await supabaseAdmin.from("risk_scores").select("1", { count: "exact", head: true }).limit(1);
      okDb = !error;
    } catch {
      okDb = false;
    }

    let okExports = false;
    try {
      const fs = await import("fs");
      okExports = fs.existsSync("exports/metrics.csv");
    } catch {
      okExports = false;
    }

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

    return NextResponse.json({
      ok: okDb && okExports,
      db: okDb,
      exports: okExports,
      mv_explain_top4: okMv,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "health check failed" }, { status: 500 });
  }
}
