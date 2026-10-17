/**
 * Local ingest CLI for wearable exports (no upload size limit).
 *
 *   # Inspect only — parse and summarise, touch nothing:
 *   npm run ingest:export -- --file data_private/samsung.zip --dry-run
 *
 *   # Ingest into an EXISTING account (looked up by email, never created) and run the pipeline:
 *   npm run ingest:export -- --file data_private/samsung.zip --email you@example.com
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local, so it is an operator tool:
 * run it only on your own machine for accounts you own or have consent for.
 */
import { config } from "dotenv";
import { readFileSync } from "fs";
import { basename } from "path";
import { createClient } from "@supabase/supabase-js";
import { parseSamsungZip } from "../lib/ingest/samsung";
import { parseCsvLong } from "../lib/ingest/csvLong";
import { ingestReport, runPipeline, sha256 } from "../lib/pipeline";
import { deriveDailyFeatures } from "../lib/analytics/daily";
import { runDrift } from "../lib/analytics/drift";

config({ path: ".env.local" });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const file = arg("file");
  const email = arg("email")?.trim().toLowerCase();
  const dryRun = flag("dry-run");
  if (!file || (!dryRun && !email)) {
    console.error("usage: ingest:export -- --file <export.zip|data.csv> (--dry-run | --email <existing account email>)");
    process.exit(2);
  }

  const bytes = new Uint8Array(readFileSync(file));
  const report = file.toLowerCase().endsWith(".zip")
    ? parseSamsungZip(bytes)
    : parseCsvLong(new TextDecoder().decode(bytes));

  console.log(`\n== Parsed ${basename(file)} (${report.parserVersion}) ==`);
  console.log("range:", report.range);
  console.log("accepted:", report.counts);
  console.log("rejected:", report.rejected);
  console.log(`unrecognized files: ${report.unrecognized.length}`);
  for (const u of report.unrecognized) console.log(`  - ${u.file}: ${u.columns.slice(0, 12).join(", ")}${u.columns.length > 12 ? ", …" : ""}`);

  if (dryRun) {
    const features = deriveDailyFeatures(report.observations);
    const drift = runDrift(features);
    const coverage: Record<string, number> = {};
    for (const f of features) coverage[f.metric] = (coverage[f.metric] ?? 0) + 1;
    const statusCounts: Record<string, number> = {};
    for (const d of drift.days) statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;
    console.log("\n== Dry run (nothing written) ==");
    console.log("days with each daily feature:", coverage);
    console.log("drift day status counts:", statusCounts);
    console.log("last 7 days:");
    for (const d of drift.days.slice(-7)) {
      const top = d.contributions.filter((c) => c.contribution > 0).slice(0, 3).map((c) => `${c.metric}=${c.contribution}`).join(" ");
      console.log(`  ${d.day}  ${d.status.padEnd(17)} composite=${d.composite ?? "—"}  ${top}`);
    }
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local");
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: user, error } = await sb.from("users").select("id").eq("email", email!).maybeSingle();
  if (error) throw new Error(`user lookup failed: ${error.message}`);
  if (!user) throw new Error(`no account for ${email}. Sign up in the app first; this tool never creates users.`);

  const ingest = await ingestReport(sb, user.id, report, { fileName: basename(file), fileSha256: sha256(bytes) });
  console.log(`\n== Ingested == batch ${ingest.batchId}: ${ingest.inserted} new of ${ingest.received} observations`);

  const p = await runPipeline(sb, user.id);
  console.log(`\n== Pipeline == run ${p.runId}${p.reused ? " (reused: inputs unchanged)" : ""}`);
  console.log(`observations=${p.observations} features=${p.features} days=${p.dayFrom} → ${p.dayTo}`);
  console.log("feature coverage:", p.featureCoverage);
  console.log("status counts:", p.statusCounts);
  console.log("latest day:", JSON.stringify(p.latest, null, 2));
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message ?? e);
  process.exit(1);
});
