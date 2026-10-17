import { describe, it, expect } from "vitest";
import { POST as ingest } from "@/app/api/ingest/route";
import { POST as pipelineRun } from "@/app/api/pipeline/run/route";
import { GET as drift } from "@/app/api/drift/route";

/**
 * The previous /api/ingest accepted an arbitrary `email` form field and wrote
 * (or created) that account's data with the service role — anyone could write
 * into anyone's account. Ingest, pipeline and drift routes must now require a
 * session. These run with no request scope (no session), so all must be 401
 * before any parsing or database work happens.
 */
describe("ingestion routes require an authenticated session", () => {
  it("POST /api/ingest with an email field and no session → 401", async () => {
    const fd = new FormData();
    fd.append("email", "victim@example.com");
    fd.append("file", new File(["day,metric,value\n2026-09-01,hrv,55\n"], "x.csv", { type: "text/csv" }));
    const res = await ingest(new Request("https://app.local/api/ingest", { method: "POST", body: fd }));
    expect(res.status).toBe(401);
  });

  it("POST /api/pipeline/run with no session → 401", async () => {
    const res = await pipelineRun(new Request("https://app.local/api/pipeline/run", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("GET /api/drift?user=<victim> with no session → 401", async () => {
    const res = await drift(new Request("https://app.local/api/drift?user=11111111-1111-4111-8111-111111111111"));
    expect(res.status).toBe(401);
  });
});
