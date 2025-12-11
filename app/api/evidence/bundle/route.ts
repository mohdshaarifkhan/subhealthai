import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const archiverModule = await import("archiver");
    const archiver = (archiverModule.default ?? archiverModule) as typeof import("archiver");

    const searchParams = new URL(req.url).searchParams;
    const version = searchParams.get("version") || "phase3-v1-wes";

    const exportDir = path.join(process.cwd(), "exports");
    const figsDir = path.join(exportDir, "figures");
    const csvFiles = [
      "metrics.csv",
      "risk_scores.csv",
      "eval_shap_global.csv",
      "eval_reliability.csv",
      "eval_volatility_series.csv",
      "evaluation_cache.csv",
      "eval_lead_hist.csv",
    ].map((file) => path.join(exportDir, file));

    const readme = `# For Reviewers
Dataset/Version: ${version}
Contents: CSVs (cohort, risk, SHAP, reliability, volatility, lead-time) + figures.
Non-diagnostic. Reproducible via scripts/export.py & scripts/plots.py
`;

    const { PassThrough } = await import("stream");
    const stream = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err: Error) => stream.emit("error", err));
    archive.pipe(stream);

    for (const file of csvFiles) {
      try {
        archive.file(file, { name: `csv/${path.basename(file)}` });
      } catch {
        // ignore missing or unreadable files
      }
    }

    try {
      const figureFiles = await fs.readdir(figsDir);
      for (const file of figureFiles) {
        archive.file(path.join(figsDir, file), { name: `figures/${file}` });
      }
    } catch {
      // ignore missing figures directory
    }

    archive.append(readme, { name: "README_For_Reviewers.md" });
    archive.finalize();

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="subhealth_evidence_${version}.zip"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "failed to bundle evidence" }, { status: 500 });
  }
}


