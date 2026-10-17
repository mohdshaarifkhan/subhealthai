/**
 * Canonical ingestion types.
 *
 * Every provider adapter (file export, cloud API, mobile SDK) converts its
 * native records into `Observation`s. Everything downstream (daily features,
 * baselines, drift) only ever sees this shape, so adding a provider never
 * touches analytics code.
 */

export const CANONICAL_METRICS = {
  heart_rate: { unit: "bpm", min: 25, max: 230 },
  resting_heart_rate: { unit: "bpm", min: 25, max: 150 },
  hrv_rmssd: { unit: "ms", min: 1, max: 400 },
  steps: { unit: "count", min: 0, max: 150_000 },
  sleep_session: { unit: "min", min: 1, max: 24 * 60 },
  spo2: { unit: "%", min: 50, max: 100 },
  respiratory_rate: { unit: "brpm", min: 3, max: 60 },
  stress_score: { unit: "score", min: 0, max: 100 },
} as const;

export type CanonicalMetric = keyof typeof CANONICAL_METRICS;

export interface Observation {
  metric: CanonicalMetric;
  value: number;
  unit: string;
  /** Start of the measurement, ISO-8601 UTC. Point samples have start only. */
  start: string;
  /** End of the measurement interval, ISO-8601 UTC (sessions, daily totals). */
  end?: string;
  /** Local UTC offset at measurement time, in minutes (e.g. -300 for CDT). */
  tzOffsetMinutes?: number;
  /**
   * Explicit local calendar day (YYYY-MM-DD) for provider-reported daily
   * totals. When set it overrides time-based day bucketing.
   */
  day?: string;
  /** Provider id, e.g. "samsung_health", "csv_upload". */
  source: string;
  /** Device identifier as reported by the provider, if any. */
  device?: string;
  /** Provider-native record/file this came from (for lineage). */
  origin?: string;
}

export interface ParseReport {
  source: string;
  parserVersion: string;
  observations: Observation[];
  /** Per-metric counts of accepted observations. */
  counts: Partial<Record<CanonicalMetric, number>>;
  /** Rows dropped by validation, with reasons. */
  rejected: Record<string, number>;
  /** Files seen but not mapped to any canonical metric (with their headers). */
  unrecognized: { file: string; columns: string[] }[];
  /** Earliest / latest measurement start covered. */
  range: { from: string | null; to: string | null };
}

/** Validate a raw value against the canonical physiological range. */
export function validateValue(metric: CanonicalMetric, value: number): string | null {
  if (!Number.isFinite(value)) return "non_numeric";
  const spec = CANONICAL_METRICS[metric];
  if (value < spec.min || value > spec.max) return "out_of_range";
  return null;
}

export function summarize(
  source: string,
  parserVersion: string,
  observations: Observation[],
  rejected: Record<string, number>,
  unrecognized: { file: string; columns: string[] }[],
): ParseReport {
  const counts: Partial<Record<CanonicalMetric, number>> = {};
  let from: string | null = null;
  let to: string | null = null;
  for (const o of observations) {
    counts[o.metric] = (counts[o.metric] ?? 0) + 1;
    if (from === null || o.start < from) from = o.start;
    if (to === null || o.start > to) to = o.start;
  }
  return { source, parserVersion, observations, counts, rejected, unrecognized, range: { from, to } };
}
