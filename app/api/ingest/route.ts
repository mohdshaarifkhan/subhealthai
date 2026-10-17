import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseSamsungZip } from "@/lib/ingest/samsung";
import { parseCsvLong } from "@/lib/ingest/csvLong";
import { ingestReport, runPipeline, sha256 } from "@/lib/pipeline";

/**
 * POST /api/ingest — authenticated wearable data upload.
 *
 * multipart/form-data with `file`:
 *   - .zip → Samsung Health "Download personal data" export
 *   - .csv → long format `day,metric,value[,source]`
 *
 * The owning user is ALWAYS the caller's session. (The previous version took
 * an `email` form field and created/wrote to that account with the service
 * role, letting anyone write data into any account.)
 *
 * Serverless request bodies are size-limited (≈4.5 MB on Vercel), so large
 * exports should go through `npm run ingest:export` until direct-to-storage
 * upload exists.
 */
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = (await requireUser(req)).id;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let file: File | null = null;
  try {
    file = (await req.formData()).get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "expected multipart/form-data with a `file` field" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large for web upload (${file.size} bytes > ${MAX_BYTES}); use the ingest CLI` },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let report;
  try {
    if (name.endsWith(".zip")) report = parseSamsungZip(bytes);
    else if (name.endsWith(".csv")) report = parseCsvLong(new TextDecoder().decode(bytes));
    else return NextResponse.json({ error: "unsupported file type (expected .zip or .csv)" }, { status: 415 });
  } catch (e: any) {
    return NextResponse.json({ error: `could not parse file: ${e?.message ?? e}` }, { status: 422 });
  }

  try {
    const ingest = await ingestReport(supabaseAdmin, userId, report, { fileName: file.name, fileSha256: sha256(bytes) });
    const pipeline = await runPipeline(supabaseAdmin, userId);
    return NextResponse.json({
      ok: true,
      ingest,
      parsed: { counts: report.counts, rejected: report.rejected, unrecognized: report.unrecognized.length, range: report.range },
      pipeline,
    });
  } catch (e: any) {
    console.error("ingest failed:", e);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
