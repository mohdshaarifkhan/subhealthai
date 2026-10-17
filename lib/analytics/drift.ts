/**
 * Drift engine v1 — deterministic personal-baseline deviation analysis.
 *
 * Non-diagnostic by construction: it reports how far each signal sits from the
 * user's OWN recent baseline, grouped by body system. It never names a disease
 * and never estimates disease probability.
 *
 * Method (per signal, per day):
 *   1. Baseline = values from the trailing window BEFORE the day (the day itself
 *      is excluded), requiring a minimum number of valid days.
 *   2. Robust z = (x − median) / scale, scale = max(1.4826·MAD, absolute floor,
 *      relative floor·|median|). Floors stop tiny-variance baselines from
 *      producing huge z-scores.
 *   3. Adverse z = z signed so that positive = the unfavourable direction for
 *      that signal (e.g. lower HRV, higher resting HR).
 *   4. EWMA of adverse z over consecutive valid days (reset after long gaps)
 *      captures persistence rather than one-off noise.
 *
 * Composite (per day) = mean over available signals of clip(adverse z, 0, cap).
 * Each signal's contribution = its clipped adverse z / n. Contributions therefore
 * sum EXACTLY to the composite (additive attribution, no approximation).
 *
 * Any change to logic or defaults must bump ENGINE_VERSION.
 */
import type { DailyFeature, DailyMetric } from "./daily";

export const ENGINE_VERSION = "drift-v1";

export type BodySystem = "autonomic_recovery" | "sleep" | "activity" | "stress";

export interface SignalSpec {
  system: BodySystem;
  /** +1: higher is unfavourable; −1: lower is unfavourable. */
  adverseDirection: 1 | -1;
  /** Absolute floor for the baseline scale, in the signal's unit. */
  scaleFloor: number;
}

export const SIGNALS: Partial<Record<DailyMetric, SignalSpec>> = {
  hrv_rmssd: { system: "autonomic_recovery", adverseDirection: -1, scaleFloor: 2 },
  resting_hr: { system: "autonomic_recovery", adverseDirection: 1, scaleFloor: 1 },
  respiratory_rate: { system: "autonomic_recovery", adverseDirection: 1, scaleFloor: 0.3 },
  sleep_minutes: { system: "sleep", adverseDirection: -1, scaleFloor: 15 },
  steps: { system: "activity", adverseDirection: -1, scaleFloor: 500 },
  stress_mean: { system: "stress", adverseDirection: 1, scaleFloor: 3 },
};

export interface DriftParams {
  baselineWindowDays: number;
  minBaselineDays: number;
  relativeScaleFloor: number;
  ewmaAlpha: number;
  /** EWMA resets if consecutive valid days are further apart than this. */
  maxGapDays: number;
  deviationZ: number;
  sustainedEwma: number;
  sustainedMinDays: number;
  zCap: number;
  /** Minimum signals with a usable baseline for a day to be assessed. */
  minSignalsForDay: number;
}

export const DEFAULT_PARAMS: DriftParams = {
  baselineWindowDays: 28,
  minBaselineDays: 14,
  relativeScaleFloor: 0.03,
  ewmaAlpha: 0.3,
  maxGapDays: 3,
  deviationZ: 2,
  sustainedEwma: 1.5,
  sustainedMinDays: 3,
  zCap: 4,
  minSignalsForDay: 2,
};

export type SignalStatus = "insufficient_baseline" | "within_range" | "deviation" | "sustained";
export type DayStatus = "insufficient_data" | "stable" | "elevated" | "sustained";

export interface SignalDay {
  day: string;
  metric: DailyMetric;
  system: BodySystem;
  value: number;
  baselineMedian: number | null;
  baselineScale: number | null;
  baselineN: number;
  z: number | null;
  adverseZ: number | null;
  ewmaAdverseZ: number | null;
  status: SignalStatus;
}

export interface Contribution {
  metric: DailyMetric;
  system: BodySystem;
  contribution: number;
}

export interface DayResult {
  day: string;
  status: DayStatus;
  composite: number | null;
  signalsAssessed: number;
  contributions: Contribution[];
  systems: Partial<Record<BodySystem, SignalStatus>>;
}

export interface DriftResult {
  engineVersion: string;
  params: DriftParams;
  signals: SignalDay[];
  days: DayResult[];
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function mad(xs: number[], med = median(xs)): number {
  return median(xs.map((x) => Math.abs(x - med)));
}

const dayNum = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

const SEVERITY: Record<SignalStatus, number> = {
  insufficient_baseline: 0,
  within_range: 1,
  deviation: 2,
  sustained: 3,
};

/** Analyse one signal's daily series (any order; duplicates by day not allowed). */
export function analyseSignal(
  metric: DailyMetric,
  series: { day: string; value: number }[],
  params: DriftParams = DEFAULT_PARAMS,
): SignalDay[] {
  const spec = SIGNALS[metric];
  if (!spec) return [];
  const pts = [...series].sort((a, b) => a.day.localeCompare(b.day));
  const out: SignalDay[] = [];
  let ewma: number | null = null;
  let lastValidDay: number | null = null;
  let sustainedRun = 0;

  for (let i = 0; i < pts.length; i++) {
    const { day, value } = pts[i];
    const dn = dayNum(day);
    const window = pts
      .slice(0, i)
      .filter((p) => dn - dayNum(p.day) <= params.baselineWindowDays)
      .map((p) => p.value);

    if (window.length < params.minBaselineDays) {
      out.push({
        day, metric, system: spec.system, value,
        baselineMedian: null, baselineScale: null, baselineN: window.length,
        z: null, adverseZ: null, ewmaAdverseZ: null, status: "insufficient_baseline",
      });
      continue;
    }

    const med = median(window);
    const scale = Math.max(1.4826 * mad(window, med), spec.scaleFloor, params.relativeScaleFloor * Math.abs(med));
    const z = (value - med) / scale;
    const adverseZ = spec.adverseDirection * z;

    if (ewma === null || lastValidDay === null || dn - lastValidDay > params.maxGapDays) {
      ewma = adverseZ;
      sustainedRun = 0;
    } else {
      ewma = params.ewmaAlpha * adverseZ + (1 - params.ewmaAlpha) * ewma;
    }
    lastValidDay = dn;
    sustainedRun = ewma >= params.sustainedEwma ? sustainedRun + 1 : 0;

    const status: SignalStatus =
      sustainedRun >= params.sustainedMinDays ? "sustained" : adverseZ >= params.deviationZ ? "deviation" : "within_range";

    out.push({
      day, metric, system: spec.system, value,
      baselineMedian: r3(med), baselineScale: r3(scale), baselineN: window.length,
      z: r3(z), adverseZ: r3(adverseZ), ewmaAdverseZ: r3(ewma), status,
    });
  }
  return out;
}

export function runDrift(features: DailyFeature[], params: DriftParams = DEFAULT_PARAMS): DriftResult {
  const byMetric = new Map<DailyMetric, { day: string; value: number }[]>();
  for (const f of features) {
    if (!SIGNALS[f.metric]) continue;
    const arr = byMetric.get(f.metric) ?? [];
    arr.push({ day: f.day, value: f.value });
    byMetric.set(f.metric, arr);
  }

  const signals: SignalDay[] = [];
  for (const [metric, series] of Array.from(byMetric)) signals.push(...analyseSignal(metric, series, params));

  const byDay = new Map<string, SignalDay[]>();
  for (const s of signals) byDay.set(s.day, [...(byDay.get(s.day) ?? []), s]);

  const days: DayResult[] = [];
  for (const day of Array.from(byDay.keys()).sort()) {
    const sds = byDay.get(day)!;
    const assessed = sds.filter((s) => s.adverseZ !== null);
    const systems: Partial<Record<BodySystem, SignalStatus>> = {};
    for (const s of sds) {
      const prev = systems[s.system];
      if (!prev || SEVERITY[s.status] > SEVERITY[prev]) systems[s.system] = s.status;
    }

    if (assessed.length < params.minSignalsForDay) {
      days.push({ day, status: "insufficient_data", composite: null, signalsAssessed: assessed.length, contributions: [], systems });
      continue;
    }

    const n = assessed.length;
    const contributions: Contribution[] = assessed
      .map((s) => ({
        metric: s.metric,
        system: s.system,
        contribution: r3(Math.min(params.zCap, Math.max(0, s.adverseZ!)) / n),
      }))
      .sort((a, b) => b.contribution - a.contribution);
    const composite = r3(contributions.reduce((a, c) => a + c.contribution, 0));

    const status: DayStatus = assessed.some((s) => s.status === "sustained")
      ? "sustained"
      : assessed.some((s) => s.status === "deviation") || composite >= params.sustainedEwma
        ? "elevated"
        : "stable";

    days.push({ day, status, composite, signalsAssessed: n, contributions, systems });
  }

  return { engineVersion: ENGINE_VERSION, params, signals, days };
}
