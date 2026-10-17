/**
 * Persistence + orchestration for the real-data pipeline:
 *
 *   ParseReport → ingest_batches + events_raw   (ingestReport)
 *   events_raw  → daily_features → drift run     (runPipeline)
 *
 * The Supabase client is injected so the same code serves API routes (service
 * role, after session auth) and the local CLI. `userId` must always come from
 * an authenticated session or an explicit operator choice — never from request
 * input.
 */
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CANONICAL_METRICS, type CanonicalMetric, type Observation, type ParseReport } from "@/lib/ingest/types";
import { deriveDailyFeatures, observationDay, DERIVATION_VERSION, type DailyFeature, type DailyMetric } from "@/lib/analytics/daily";
import { runDrift, ENGINE_VERSION, DEFAULT_PARAMS, type DriftParams, type DriftResult } from "@/lib/analytics/drift";

const CHUNK = 1000;

async function inChunks<T>(rows: T[], fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += CHUNK) await fn(rows.slice(i, i + CHUNK));
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "unknown error"}`);
}

export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export interface IngestResult {
  batchId: string;
  received: number;
  inserted: number;
}

/** Record an ingest batch and upsert its observations into events_raw (idempotent). */
export async function ingestReport(
  sb: SupabaseClient,
  userId: string,
  report: ParseReport,
  meta: { fileName?: string; fileSha256?: string } = {},
): Promise<IngestResult> {
  const { data: batch, error: bErr } = await sb
    .from("ingest_batches")
    .insert({
      user_id: userId,
      source: report.source,
      parser_version: report.parserVersion,
      file_name: meta.fileName ?? null,
      file_sha256: meta.fileSha256 ?? null,
      counts: report.counts,
      rejected: report.rejected,
      unrecognized: report.unrecognized,
      range_from: report.range.from,
      range_to: report.range.to,
    })
    .select("id")
    .single();
  if (bErr || !batch) fail("create ingest batch", bErr);

  const rows = report.observations.map((o) => ({
    user_id: userId,
    source: o.source,
    metric: o.metric,
    value: o.value,
    unit: o.unit,
    event_time: o.start,
    end_time: o.end ?? null,
    tz_offset_minutes: o.tzOffsetMinutes ?? null,
    local_day: observationDay(o),
    device: o.device ?? null,
    batch_id: batch.id,
    meta: { origin: o.origin ?? null, explicit_day: o.day !== undefined },
  }));

  let inserted = 0;
  try {
    await inChunks(rows, async (chunk) => {
      const { data, error } = await sb
        .from("events_raw")
        .upsert(chunk, { onConflict: "user_id,source,metric,event_time", ignoreDuplicates: true })
        .select("id");
      if (error) fail("upsert events_raw", error);
      inserted += data?.length ?? 0;
    });
  } catch (e: any) {
    await sb.from("ingest_batches").update({ status: "failed", error: String(e?.message ?? e) }).eq("id", batch.id);
    throw e;
  }

  await sb.from("ingest_batches").update({ inserted_count: inserted }).eq("id", batch.id);
  return { batchId: batch.id, received: rows.length, inserted };
}

/** Load a user's canonical observations from events_raw (paged). */
export async function loadObservations(sb: SupabaseClient, userId: string): Promise<Observation[]> {
  const metrics = Object.keys(CANONICAL_METRICS);
  const out: Observation[] = [];
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await sb
      .from("events_raw")
      .select("source, metric, value, unit, event_time, end_time, tz_offset_minutes, local_day, device, meta")
      .eq("user_id", userId)
      .in("metric", metrics)
      .order("event_time", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + CHUNK - 1);
    if (error) fail("load events_raw", error);
    for (const r of data ?? []) {
      const metric = r.metric as CanonicalMetric;
      out.push({
        metric,
        value: Number(r.value),
        unit: r.unit ?? CANONICAL_METRICS[metric].unit,
        start: new Date(r.event_time).toISOString(),
        end: r.end_time ? new Date(r.end_time).toISOString() : undefined,
        tzOffsetMinutes: r.tz_offset_minutes ?? undefined,
        day: (r.meta as any)?.explicit_day && r.local_day ? String(r.local_day) : undefined,
        source: r.source,
        device: r.device ?? undefined,
      });
    }
    if (!data || data.length < CHUNK) break;
  }
  return out;
}

/** Stable hash of the analytic inputs so identical inputs map to the same run. */
export function inputHash(features: DailyFeature[], params: DriftParams): string {
  const canonical = [...features]
    .sort((a, b) => (a.day === b.day ? a.metric.localeCompare(b.metric) : a.day.localeCompare(b.day)))
    .map((f) => [f.day, f.metric, f.value]);
  return sha256(JSON.stringify({ engine: ENGINE_VERSION, derivation: DERIVATION_VERSION, params, canonical }));
}

export interface PipelineResult {
  runId: string;
  reused: boolean;
  observations: number;
  features: number;
  dayFrom: string | null;
  dayTo: string | null;
  latest: DriftResult["days"][number] | null;
  statusCounts: Record<string, number>;
  featureCoverage: Partial<Record<DailyMetric, number>>;
}

/** Recompute daily features and a drift run for one user from events_raw. */
export async function runPipeline(
  sb: SupabaseClient,
  userId: string,
  params: DriftParams = DEFAULT_PARAMS,
): Promise<PipelineResult> {
  const observations = await loadObservations(sb, userId);
  const features = deriveDailyFeatures(observations);

  await inChunks(
    features.map((f) => ({
      user_id: userId,
      day: f.day,
      metric: f.metric,
      value: f.value,
      unit: f.unit,
      n_obs: f.nObs,
      sources: f.sources,
      derivation_version: DERIVATION_VERSION,
      computed_at: new Date().toISOString(),
    })),
    async (chunk) => {
      const { error } = await sb.from("daily_features").upsert(chunk, { onConflict: "user_id,day,metric,derivation_version" });
      if (error) fail("upsert daily_features", error);
    },
  );

  const drift = runDrift(features, params);
  const hash = inputHash(features, params);
  const days = drift.days.map((d) => d.day);
  const dayFrom = days[0] ?? null;
  const dayTo = days.at(-1) ?? null;

  const statusCounts: Record<string, number> = {};
  for (const d of drift.days) statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;
  const featureCoverage: Partial<Record<DailyMetric, number>> = {};
  for (const f of features) featureCoverage[f.metric] = (featureCoverage[f.metric] ?? 0) + 1;
  const base = {
    observations: observations.length,
    features: features.length,
    dayFrom,
    dayTo,
    latest: drift.days.at(-1) ?? null,
    statusCounts,
    featureCoverage,
  };

  const { data: existing } = await sb
    .from("drift_runs")
    .select("id")
    .eq("user_id", userId)
    .eq("engine_version", ENGINE_VERSION)
    .eq("derivation_version", DERIVATION_VERSION)
    .eq("input_hash", hash)
    .maybeSingle();
  if (existing) {
    await sb.from("drift_runs").update({ last_used_at: new Date().toISOString() }).eq("id", existing.id);
    return { runId: existing.id, reused: true, ...base };
  }

  const { data: run, error: rErr } = await sb
    .from("drift_runs")
    .insert({
      user_id: userId,
      engine_version: ENGINE_VERSION,
      derivation_version: DERIVATION_VERSION,
      params,
      input_hash: hash,
      day_from: dayFrom,
      day_to: dayTo,
    })
    .select("id")
    .single();
  if (rErr || !run) fail("create drift run", rErr);

  await inChunks(
    drift.signals.map((s) => ({
      run_id: run.id,
      user_id: userId,
      day: s.day,
      metric: s.metric,
      system: s.system,
      value: s.value,
      baseline_median: s.baselineMedian,
      baseline_scale: s.baselineScale,
      baseline_n: s.baselineN,
      z: s.z,
      adverse_z: s.adverseZ,
      ewma_adverse_z: s.ewmaAdverseZ,
      status: s.status,
    })),
    async (chunk) => {
      const { error } = await sb.from("drift_signal_days").insert(chunk);
      if (error) fail("insert drift_signal_days", error);
    },
  );
  await inChunks(
    drift.days.map((d) => ({
      run_id: run.id,
      user_id: userId,
      day: d.day,
      status: d.status,
      composite: d.composite,
      signals_assessed: d.signalsAssessed,
      contributions: d.contributions,
      systems: d.systems,
    })),
    async (chunk) => {
      const { error } = await sb.from("drift_days").insert(chunk);
      if (error) fail("insert drift_days", error);
    },
  );

  return { runId: run.id, reused: false, ...base };
}

/** Latest drift run for a user, with its day-level results (and optionally signal detail). */
export async function getLatestDrift(sb: SupabaseClient, userId: string, opts: { withSignals?: boolean; days?: number } = {}) {
  const { data: run, error } = await sb
    .from("drift_runs")
    .select("id, engine_version, derivation_version, params, input_hash, day_from, day_to, created_at, last_used_at")
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("load drift run", error);
  if (!run) return null;

  const limit = opts.days ?? 90;
  const { data: days, error: dErr } = await sb
    .from("drift_days")
    .select("day, status, composite, signals_assessed, contributions, systems")
    .eq("run_id", run.id)
    .order("day", { ascending: false })
    .limit(limit);
  if (dErr) fail("load drift days", dErr);

  let signals = null;
  if (opts.withSignals) {
    const { data, error: sErr } = await sb
      .from("drift_signal_days")
      .select("day, metric, system, value, baseline_median, baseline_scale, baseline_n, z, adverse_z, ewma_adverse_z, status")
      .eq("run_id", run.id)
      .order("day", { ascending: false })
      .limit(limit * 8);
    if (sErr) fail("load drift signals", sErr);
    signals = data;
  }
  return { run, days: (days ?? []).reverse(), signals: signals ? [...signals].reverse() : null };
}
