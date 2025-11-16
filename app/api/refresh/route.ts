import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

async function refreshMaterializedView() {
  const { error } = await supabaseAdmin.rpc("refresh_mv_explain_top4_concurrently");
  if (error) {
    await supabaseAdmin.rpc("refresh_mv_explain_top4");
  }
}

export async function POST() {
  try {
    await refreshMaterializedView();
    const { count } = await supabaseAdmin
      .from("mv_explain_top4")
      .select("day", { count: "exact", head: true });

    return NextResponse.json({ mv_explain_top4_rows: count ?? 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "refresh failed" }, { status: 500 });
  }
}
