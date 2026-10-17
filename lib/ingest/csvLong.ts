/**
 * Simple long-format CSV (`day,metric,value[,source]`) → canonical Observations.
 * Kept for small manual uploads and fixtures; one value per metric per day.
 */
import { parse } from "csv-parse/sync";
import { CanonicalMetric, CANONICAL_METRICS, Observation, ParseReport, summarize, validateValue } from "./types";
import { dedupe } from "./samsung";

export const CSV_LONG_PARSER_VERSION = "csv-long-v1";

const ALIASES: Record<string, CanonicalMetric> = {
  hr: "heart_rate", hr_avg: "heart_rate", heart_rate: "heart_rate",
  rhr: "resting_heart_rate", resting_hr: "resting_heart_rate", resting_heart_rate: "resting_heart_rate",
  hrv: "hrv_rmssd", rmssd: "hrv_rmssd", hrv_avg: "hrv_rmssd", hrv_rmssd: "hrv_rmssd",
  steps: "steps",
  sleep: "sleep_session", sleep_minutes: "sleep_session",
  spo2: "spo2",
  respiratory_rate: "respiratory_rate",
  stress: "stress_score", stress_score: "stress_score",
};

export function parseCsvLong(text: string, source = "csv_upload"): ParseReport {
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  const rejected: Record<string, number> = {};
  const obs: Observation[] = [];
  const reject = (k: string) => (rejected[k] = (rejected[k] ?? 0) + 1);

  for (const r of rows) {
    const metric = ALIASES[(r.metric ?? "").trim().toLowerCase()];
    if (!metric) { reject("unknown_metric"); continue; }
    const day = (r.day ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) { reject(`${metric}:bad_day`); continue; }
    const value = Number(r.value);
    const bad = validateValue(metric, value);
    if (bad) { reject(`${metric}:${bad}`); continue; }
    const start = `${day}T00:00:00.000Z`;
    const end = new Date(Date.parse(start) + 86_400_000).toISOString();
    obs.push({
      metric,
      value,
      unit: CANONICAL_METRICS[metric].unit,
      start,
      end,
      day,
      tzOffsetMinutes: 0,
      source: (r.source || source).trim().toLowerCase(),
      origin: "csv_long",
    });
  }
  return summarize(source, CSV_LONG_PARSER_VERSION, dedupe(obs), rejected, []);
}
