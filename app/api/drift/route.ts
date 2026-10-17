import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getLatestDrift } from "@/lib/pipeline";

/**
 * GET /api/drift?days=90&signals=1 — the caller's latest drift run.
 * Non-diagnostic: per-system deviation from the user's own baseline.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = (await requireUser(req)).id;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 90) || 90));
  const withSignals = url.searchParams.get("signals") === "1";
  try {
    const result = await getLatestDrift(supabaseAdmin, userId, { days, withSignals });
    if (!result) return NextResponse.json({ ok: true, run: null, days: [], signals: null });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("drift read failed:", e);
    return NextResponse.json({ error: "drift read failed" }, { status: 500 });
  }
}
