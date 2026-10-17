/**
 * Canonical Observations → per-day features.
 *
 * Deterministic and versioned: any change to these rules must bump
 * DERIVATION_VERSION so stored features and the analytics runs built on them
 * stay reproducible.
 */
import type { Observation } from "@/lib/ingest/types";

export const DERIVATION_VERSION = "daily-v1";

export type DailyMetric =
  | "resting_hr"
  | "hr_mean"
  | "hrv_rmssd"
  | "sleep_minutes"
  | "steps"
  | "spo2"
  | "respiratory_rate"
  | "stress_mean";

export const DAILY_UNITS: Record<DailyMetric, string> = {
  resting_hr: "bpm",
  hr_mean: "bpm",
  hrv_rmssd: "ms",
  sleep_minutes: "min",
  steps: "count",
  spo2: "%",
  respiratory_rate: "brpm",
  stress_mean: "score",
};

export interface DailyFeature {
  day: string; // YYYY-MM-DD, user-local
  metric: DailyMetric;
  value: number;
  unit: string;
  nObs: number;
  sources: string[];
}

/** Minimum heart-rate samples in a day before deriving a resting HR from them. */
export const MIN_HR_SAMPLES_FOR_RESTING = 20;
/** Resting HR derived as this percentile of the day's samples (when not provided). */
export const RESTING_HR_PERCENTILE = 0.1;

/** Local calendar day for an instant, given its UTC offset in minutes. */
export function localDay(iso: string, offsetMinutes = 0): string {
  return new Date(Date.parse(iso) + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** The local day an observation is attributed to (sleep → wake day). */
export function observationDay(o: Observation): string {
  return dayOf(o, o.metric === "sleep_session" ? "end" : "start");
}

function dayOf(o: Observation, anchor: "start" | "end" = "start"): string {
  if (o.day) return o.day;
  const t = anchor === "end" && o.end ? o.end : o.start;
  return localDay(t, o.tzOffsetMinutes ?? 0);
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 1) return s[0];
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

type Bucket = { values: number[]; sources: Set<string> };

function bucket(map: Map<string, Bucket>, key: string, value: number, source: string) {
  let b = map.get(key);
  if (!b) {
    b = { values: [], sources: new Set() };
    map.set(key, b);
  }
  b.values.push(value);
  b.sources.add(source);
}

export function deriveDailyFeatures(observations: Observation[]): DailyFeature[] {
  const hr = new Map<string, Bucket>();
  const rhr = new Map<string, Bucket>();
  const means: Partial<Record<DailyMetric, Map<string, Bucket>>> = {
    hrv_rmssd: new Map(),
    spo2: new Map(),
    respiratory_rate: new Map(),
    stress_mean: new Map(),
  };
  const sleep = new Map<string, Bucket>();
  // steps: day -> source -> values (daily totals are max'ed per source, then max across sources)
  const stepsDaily = new Map<string, Map<string, number>>();
  const stepsIntervals = new Map<string, Bucket>();

  for (const o of observations) {
    switch (o.metric) {
      case "heart_rate":
        bucket(hr, dayOf(o), o.value, o.source);
        break;
      case "resting_heart_rate":
        bucket(rhr, dayOf(o), o.value, o.source);
        break;
      case "hrv_rmssd":
        bucket(means.hrv_rmssd!, dayOf(o), o.value, o.source);
        break;
      case "spo2":
        bucket(means.spo2!, dayOf(o), o.value, o.source);
        break;
      case "respiratory_rate":
        bucket(means.respiratory_rate!, dayOf(o), o.value, o.source);
        break;
      case "stress_score":
        bucket(means.stress_mean!, dayOf(o), o.value, o.source);
        break;
      case "sleep_session":
        // Attribute sleep to the day the user woke up.
        bucket(sleep, dayOf(o, "end"), o.value, o.source);
        break;
      case "steps":
        if (o.day) {
          const d = stepsDaily.get(o.day) ?? new Map<string, number>();
          d.set(o.source, Math.max(d.get(o.source) ?? 0, o.value));
          stepsDaily.set(o.day, d);
        } else {
          bucket(stepsIntervals, dayOf(o), o.value, o.source);
        }
        break;
    }
  }

  const out: DailyFeature[] = [];
  const push = (day: string, metric: DailyMetric, value: number, nObs: number, sources: Iterable<string>) =>
    out.push({ day, metric, value: round(value), unit: DAILY_UNITS[metric], nObs, sources: Array.from(sources).sort() });

  for (const [day, b] of Array.from(hr)) {
    push(day, "hr_mean", mean(b.values), b.values.length, b.sources);
    if (!rhr.has(day) && b.values.length >= MIN_HR_SAMPLES_FOR_RESTING) {
      push(day, "resting_hr", percentile(b.values, RESTING_HR_PERCENTILE), b.values.length, b.sources);
    }
  }
  for (const [day, b] of Array.from(rhr)) push(day, "resting_hr", mean(b.values), b.values.length, b.sources);
  for (const metric of Object.keys(means) as DailyMetric[]) {
    for (const [day, b] of Array.from(means[metric]!)) push(day, metric, mean(b.values), b.values.length, b.sources);
  }
  for (const [day, b] of Array.from(sleep)) {
    push(day, "sleep_minutes", Math.min(24 * 60, b.values.reduce((a, c) => a + c, 0)), b.values.length, b.sources);
  }
  const stepDays = new Set([...Array.from(stepsDaily.keys()), ...Array.from(stepsIntervals.keys())]);
  for (const day of Array.from(stepDays)) {
    const daily = stepsDaily.get(day);
    if (daily && daily.size) {
      // Provider daily totals win; take the max across sources to avoid double counting.
      push(day, "steps", Math.max(...Array.from(daily.values())), daily.size, daily.keys());
    } else {
      const b = stepsIntervals.get(day)!;
      push(day, "steps", b.values.reduce((a, c) => a + c, 0), b.values.length, b.sources);
    }
  }

  return out.sort((a, b) => (a.day === b.day ? a.metric.localeCompare(b.metric) : a.day.localeCompare(b.day)));
}
