import { describe, it, expect } from "vitest";
import { deriveDailyFeatures, localDay, percentile } from "@/lib/analytics/daily";
import { analyseSignal, runDrift, median, mad, DEFAULT_PARAMS } from "@/lib/analytics/drift";
import type { DailyFeature } from "@/lib/analytics/daily";
import type { Observation } from "@/lib/ingest/types";

const day = (i: number) => new Date(Date.UTC(2026, 7, 1) + i * 86_400_000).toISOString().slice(0, 10);

/** Deterministic pseudo-noise so tests don't depend on Math.random. */
const noise = (i: number, amp: number) => (((i * 7919) % 13) / 13 - 0.5) * 2 * amp;

describe("daily features", () => {
  it("buckets by local day using the UTC offset", () => {
    // 03:00Z is still the previous evening in UTC-5.
    expect(localDay("2026-09-02T03:00:00.000Z", -300)).toBe("2026-09-01");
  });

  it("derives hr_mean and a percentile resting HR only with enough samples", () => {
    const obs: Observation[] = Array.from({ length: 30 }, (_, i) => ({
      metric: "heart_rate" as const, value: 50 + i, unit: "bpm",
      start: `2026-09-01T${String(10 + Math.floor(i / 6)).padStart(2, "0")}:${String((i % 6) * 10).padStart(2, "0")}:00.000Z`,
      tzOffsetMinutes: 0, source: "samsung_health",
    }));
    const f = deriveDailyFeatures(obs);
    expect(f.find((x) => x.metric === "hr_mean")!.value).toBe(64.5);
    expect(f.find((x) => x.metric === "resting_hr")!.value).toBe(percentile(obs.map((o) => o.value), 0.1));
    expect(deriveDailyFeatures(obs.slice(0, 5)).some((x) => x.metric === "resting_hr")).toBe(false);
  });

  it("attributes sleep to the wake day and takes max daily steps across sources", () => {
    const f = deriveDailyFeatures([
      { metric: "sleep_session", value: 420, unit: "min", start: "2026-09-02T04:30:00.000Z", end: "2026-09-02T11:30:00.000Z", tzOffsetMinutes: -300, source: "s" },
      { metric: "steps", value: 8000, unit: "count", start: "2026-09-01T00:00:00.000Z", day: "2026-09-01", source: "a" },
      { metric: "steps", value: 7000, unit: "count", start: "2026-09-01T00:00:00.000Z", day: "2026-09-01", source: "b" },
    ]);
    expect(f.find((x) => x.metric === "sleep_minutes")).toMatchObject({ day: "2026-09-02", value: 420 });
    expect(f.find((x) => x.metric === "steps")).toMatchObject({ day: "2026-09-01", value: 8000, sources: ["a", "b"] });
  });
});

describe("robust statistics", () => {
  it("median and MAD", () => {
    expect(median([1, 2, 3, 4, 100])).toBe(3);
    expect(mad([1, 2, 3, 4, 100])).toBe(1);
  });
});

describe("analyseSignal", () => {
  it("gates on baseline sufficiency", () => {
    const s = analyseSignal("hrv_rmssd", Array.from({ length: 10 }, (_, i) => ({ day: day(i), value: 55 })));
    expect(s.every((x) => x.status === "insufficient_baseline")).toBe(true);
  });

  it("excludes the current day from its own baseline", () => {
    const series = Array.from({ length: 20 }, (_, i) => ({ day: day(i), value: 55 + noise(i, 3) }));
    series.push({ day: day(20), value: 20 });
    const last = analyseSignal("hrv_rmssd", series).at(-1)!;
    expect(last.baselineN).toBe(20);
    expect(last.baselineMedian).toBeGreaterThan(50);
  });

  it("signs deviations so that lower HRV and higher resting HR are adverse", () => {
    const base = Array.from({ length: 20 }, (_, i) => ({ day: day(i), value: 55 + noise(i, 3) }));
    const lowHrv = analyseSignal("hrv_rmssd", [...base, { day: day(20), value: 35 }]).at(-1)!;
    const highHrv = analyseSignal("hrv_rmssd", [...base, { day: day(20), value: 75 }]).at(-1)!;
    expect(lowHrv.adverseZ!).toBeGreaterThan(2);
    expect(lowHrv.status).toBe("deviation");
    expect(highHrv.adverseZ!).toBeLessThan(0);
    expect(highHrv.status).toBe("within_range");
  });

  it("flags sustained drift only after several consecutive adverse days", () => {
    const base = Array.from({ length: 20 }, (_, i) => ({ day: day(i), value: 58 + noise(i, 1.5) }));
    const drift = Array.from({ length: 6 }, (_, k) => ({ day: day(20 + k), value: 66 }));
    const out = analyseSignal("resting_hr", [...base, ...drift]).slice(20);
    expect(out[0].status).not.toBe("sustained");
    expect(out.some((x) => x.status === "sustained")).toBe(true);
  });

  it("applies a scale floor so a flat baseline doesn't explode z", () => {
    const flat = Array.from({ length: 20 }, (_, i) => ({ day: day(i), value: 60 }));
    const r = analyseSignal("resting_hr", [...flat, { day: day(20), value: 61 }]).at(-1)!;
    expect(r.baselineScale).toBeGreaterThanOrEqual(1.8); // 3% of 60
    expect(Math.abs(r.z!)).toBeLessThan(1);
  });
});

describe("runDrift", () => {
  const build = (shock: boolean): DailyFeature[] => {
    const f: DailyFeature[] = [];
    for (let i = 0; i < 30; i++) {
      const hit = shock && i >= 25;
      f.push({ day: day(i), metric: "hrv_rmssd", value: hit ? 38 : 55 + noise(i, 3), unit: "ms", nObs: 1, sources: ["t"] });
      f.push({ day: day(i), metric: "resting_hr", value: hit ? 66 : 58 + noise(i + 3, 1.5), unit: "bpm", nObs: 1, sources: ["t"] });
      f.push({ day: day(i), metric: "sleep_minutes", value: 430 + noise(i + 5, 20), unit: "min", nObs: 1, sources: ["t"] });
    }
    return f;
  };

  it("contributions sum exactly to the composite", () => {
    const r = runDrift(build(true));
    for (const d of r.days.filter((x) => x.composite !== null)) {
      const sum = d.contributions.reduce((a, c) => a + c.contribution, 0);
      expect(Math.abs(sum - d.composite!)).toBeLessThan(1e-9);
    }
  });

  it("is stable without a shock and escalates with one, attributing it to autonomic signals", () => {
    const calm = runDrift(build(false)).days.filter((d) => d.status !== "insufficient_data");
    expect(calm.length).toBeGreaterThan(0);
    expect(calm.every((d) => d.status === "stable")).toBe(true);

    const shocked = runDrift(build(true)).days.at(-1)!;
    expect(["elevated", "sustained"]).toContain(shocked.status);
    expect(shocked.contributions[0].system).toBe("autonomic_recovery");
    expect(shocked.systems.sleep).toBe("within_range");
  });

  it("is deterministic and reports its version and params", () => {
    const a = runDrift(build(true));
    const b = runDrift(build(true));
    expect(a).toEqual(b);
    expect(a.engineVersion).toBe("drift-v1");
    expect(a.params).toEqual(DEFAULT_PARAMS);
  });

  it("marks days with too few assessable signals as insufficient", () => {
    const only = build(false).filter((f) => f.metric === "hrv_rmssd");
    expect(runDrift(only).days.every((d) => d.status === "insufficient_data")).toBe(true);
  });
});
