/**
 * Local end-to-end check of the ingestion + drift pipeline against a real
 * Postgres behind PostgREST (the same stack Supabase uses), with synthetic
 * Samsung-shaped data. Not part of `npm test` (needs Postgres + PostgREST):
 *   1. Postgres with the migrations applied, roles anon/authenticated/service_role
 *   2. PostgREST on :3000 with jwt-secret "test-secret-test-secret-test-secret-1234"
 *   3. npx tsx scripts/dev/e2e_pipeline.ts
 */
import http from "http";
import { createHmac } from "crypto";
import { zipSync, strToU8 } from "fflate";
import { createClient } from "@supabase/supabase-js";
import { parseSamsungZip } from "@/lib/ingest/samsung";
import { ingestReport, runPipeline, getLatestDrift } from "@/lib/pipeline";

const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString("base64url");
const h = b64({ alg: "HS256", typ: "JWT" }), p = b64({ role: "service_role" });
const jwt = `${h}.${p}.${createHmac("sha256", "test-secret-test-secret-test-secret-1234").update(`${h}.${p}`).digest("base64url")}`;

// Proxy /rest/v1/* → PostgREST root (what Supabase's gateway does).
const proxy = http.createServer((req, res) => {
  const up = http.request({ host: "127.0.0.1", port: 3000, path: req.url!.replace(/^\/rest\/v1/, ""), method: req.method, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode!, r.headers); r.pipe(res);
  });
  req.pipe(up);
});

function assert(c: any, m: string) { if (!c) { console.error("ASSERT FAILED:", m); process.exit(1); } console.log("  ✓", m); }

async function main() {
  await new Promise<void>((r) => proxy.listen(54329, r));
  const sb = createClient("http://127.0.0.1:54329", jwt, { auth: { persistSession: false } });

  const { data: u, error } = await sb.from("users").insert({ email: `e2e+${Date.now()}@test.local` }).select("id").single();
  if (error) throw error;

  // 70 days of synthetic Samsung-shaped data, last 6 days with an autonomic shift.
  const hr = ["com.samsung.shealth.tracker.heart_rate,1,1", "com.samsung.health.heart_rate.start_time,com.samsung.health.heart_rate.time_offset,com.samsung.health.heart_rate.heart_rate,com.samsung.health.heart_rate.deviceuuid,"];
  const sl = ["com.samsung.shealth.sleep,1,1", "com.samsung.health.sleep.start_time,com.samsung.health.sleep.end_time,com.samsung.health.sleep.time_offset,"];
  const st = ["com.samsung.shealth.step_daily_trend,1,1", "count,day_time,source_type,"];
  const t0 = Date.UTC(2026, 6, 1);
  const fmt = (ms: number) => new Date(ms).toISOString().replace("T", " ").replace("Z", "");
  for (let d = 0; d < 70; d++) {
    const shock = d >= 64;
    for (let k = 0; k < 48; k++) {
      const v = (shock ? 66 : 57) + ((d * 31 + k * 7) % 11) + (k > 20 && k < 40 ? 15 : 0);
      hr.push(`${fmt(t0 + d * 864e5 + k * 18e5)},UTC-0500,${v},watch-1,`);
    }
    const sStart = t0 + d * 864e5 + 4.5 * 36e5; // 23:30 local previous evening
    const mins = shock ? 330 : 420 + ((d * 13) % 30);
    sl.push(`${fmt(sStart)},${fmt(sStart + mins * 6e4)},UTC-0500,`);
    st.push(`${8000 + ((d * 977) % 2500)},${t0 + d * 864e5},-2,`);
  }
  const zip = zipSync({
    "x/com.samsung.shealth.tracker.heart_rate.20261017000000.csv": strToU8(hr.join("\n")),
    "x/com.samsung.shealth.sleep.20261017000000.csv": strToU8(sl.join("\n")),
    "x/com.samsung.shealth.step_daily_trend.20261017000000.csv": strToU8(st.join("\n")),
  });
  const report = parseSamsungZip(zip);
  console.log("parsed:", report.counts);

  const ing1 = await ingestReport(sb, u.id, report, { fileName: "synthetic.zip" });
  assert(ing1.inserted === ing1.received && ing1.received > 3000, `first ingest inserted all ${ing1.received} rows (multi-chunk)`);
  const ing2 = await ingestReport(sb, u.id, report, { fileName: "synthetic.zip" });
  assert(ing2.inserted === 0, "re-ingesting the same export inserts nothing (dedupe)");

  const r1 = await runPipeline(sb, u.id);
  assert(!r1.reused && r1.features > 200, `pipeline created run with ${r1.features} daily features`);
  assert(r1.featureCoverage.resting_hr! >= 69 && r1.featureCoverage.sleep_minutes === 70 && r1.featureCoverage.steps === 70, "coverage: resting_hr, sleep, steps on every day");
  console.log("  status counts:", r1.statusCounts, "latest:", r1.latest?.status, r1.latest?.contributions.slice(0, 2));
  assert(r1.latest && ["elevated", "sustained"].includes(r1.latest.status), "injected shift detected on the latest day");

  const r2 = await runPipeline(sb, u.id);
  assert(r2.reused && r2.runId === r1.runId, "re-running with unchanged inputs reuses the same run (reproducible)");

  const latest = await getLatestDrift(sb, u.id, { withSignals: true, days: 30 });
  assert(latest?.run.id === r1.runId && latest.days.length === 30, "getLatestDrift returns the run with 30 days");
  assert((latest!.signals ?? []).length > 0, "signal-level detail is returned");

  const { data: b } = await sb.from("ingest_batches").select("inserted_count, counts").eq("user_id", u.id);
  assert(b?.length === 2 && b[0].inserted_count !== null, "ingest batches recorded with counts (lineage)");
  proxy.close();
  console.log("E2E OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
