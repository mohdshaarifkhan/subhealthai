import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runPipeline } from "@/lib/pipeline";

/** POST /api/pipeline/run — recompute daily features + drift for the caller. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = (await requireUser(req)).id;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, pipeline: await runPipeline(supabaseAdmin, userId) });
  } catch (e: any) {
    console.error("pipeline run failed:", e);
    return NextResponse.json({ error: "pipeline run failed" }, { status: 500 });
  }
}
