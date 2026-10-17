import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import {
  fileType,
  parseOffset,
  parseSamsungTime,
  parseSamsungCsv,
  parseSamsungFiles,
  parseSamsungZip,
} from "@/lib/ingest/samsung";
import { parseCsvLong } from "@/lib/ingest/csvLong";

// Synthetic files shaped like a Samsung Health export (metadata line, namespaced header).
const HR = [
  "com.samsung.shealth.tracker.heart_rate,6313005,13",
  "com.samsung.health.heart_rate.start_time,com.samsung.health.heart_rate.time_offset,com.samsung.health.heart_rate.heart_rate,com.samsung.health.heart_rate.deviceuuid,",
  "2026-09-01 12:00:00.000,UTC-0500,62,watch-1,",
  "2026-09-01 12:05:00.000,UTC-0500,64,watch-1,",
  "2026-09-01 12:05:00.000,UTC-0500,64,watch-1,", // duplicate → deduped
  "2026-09-01 12:10:00.000,UTC-0500,300,watch-1,", // implausible → rejected
].join("\n");

const SLEEP = [
  "com.samsung.shealth.sleep,6313005,13",
  "com.samsung.health.sleep.start_time,com.samsung.health.sleep.end_time,com.samsung.health.sleep.time_offset,",
  // 23:30 local (04:30Z) → 06:30 local (11:30Z) on Sep 2: 7h, attributed to Sep 2.
  "2026-09-02 04:30:00.000,2026-09-02 11:30:00.000,UTC-0500,",
].join("\n");

const STEPS = [
  "com.samsung.shealth.step_daily_trend,6313005,13",
  "count,day_time,source_type,",
  `8000,${Date.parse("2026-09-01T00:00:00Z")},-2,`,
  `5000,${Date.parse("2026-09-01T00:00:00Z")},0,`, // per-device row, ignored when merged (-2) exists
].join("\n");

const UNKNOWN = ["com.samsung.shealth.food_intake,1,1", "start_time,calorie", "2026-09-01 10:00:00.000,500"].join("\n");

const FILES = {
  "export/com.samsung.shealth.tracker.heart_rate.20261017120000.csv": HR,
  "export/com.samsung.shealth.sleep.20261017120000.csv": SLEEP,
  "export/com.samsung.shealth.step_daily_trend.20261017120000.csv": STEPS,
  "export/com.samsung.shealth.food_intake.20261017120000.csv": UNKNOWN,
};

describe("samsung export helpers", () => {
  it("strips the export timestamp from the file type", () => {
    expect(fileType("a/com.samsung.shealth.tracker.heart_rate.20251103151617.csv")).toBe(
      "com.samsung.shealth.tracker.heart_rate",
    );
  });

  it("parses UTC offsets", () => {
    expect(parseOffset("UTC-0500")).toBe(-300);
    expect(parseOffset("UTC+0530")).toBe(330);
    expect(parseOffset("garbage")).toBeUndefined();
  });

  it("parses Samsung timestamps as UTC and epoch ms", () => {
    expect(parseSamsungTime("2026-09-01 12:00:00.000")).toBe("2026-09-01T12:00:00.000Z");
    expect(parseSamsungTime(String(Date.parse("2026-09-01T00:00:00Z")))).toBe("2026-09-01T00:00:00.000Z");
    expect(parseSamsungTime("")).toBeNull();
  });

  it("skips the metadata line and shortens namespaced columns", () => {
    const { columns, rows } = parseSamsungCsv(HR);
    expect(columns).toContain("heart_rate");
    expect(columns).toContain("start_time");
    expect(rows[0].heart_rate).toBe("62");
  });
});

describe("parseSamsungFiles", () => {
  const report = parseSamsungFiles(FILES);

  it("maps heart rate samples with timezone and device, deduping and rejecting implausible values", () => {
    const hr = report.observations.filter((o) => o.metric === "heart_rate");
    expect(hr.map((o) => o.value)).toEqual([62, 64]);
    expect(hr[0].tzOffsetMinutes).toBe(-300);
    expect(hr[0].device).toBe("watch-1");
    expect(report.rejected["heart_rate:out_of_range"]).toBe(1);
  });

  it("derives sleep duration from the session span", () => {
    const s = report.observations.find((o) => o.metric === "sleep_session")!;
    expect(s.value).toBe(420);
    expect(s.end).toBe("2026-09-02T11:30:00.000Z");
  });

  it("uses the merged step total (source_type -2) with an explicit day", () => {
    const steps = report.observations.filter((o) => o.metric === "steps");
    expect(steps).toHaveLength(1);
    expect(steps[0].value).toBe(8000);
    expect(steps[0].day).toBe("2026-09-01");
  });

  it("reports unrecognized files with their columns instead of silently dropping them", () => {
    expect(report.unrecognized).toEqual([{ file: "com.samsung.shealth.food_intake", columns: ["start_time", "calorie"] }]);
  });

  it("parses the same content from a zip", () => {
    const zip = zipSync(Object.fromEntries(Object.entries(FILES).map(([k, v]) => [k, strToU8(v)])));
    const fromZip = parseSamsungZip(zip);
    expect(fromZip.counts).toEqual(report.counts);
  });
});

describe("parseCsvLong", () => {
  it("maps aliases, sets an explicit day, and rejects bad rows", () => {
    const r = parseCsvLong("day,metric,value,source\n2026-09-01,hrv,55,manual\n2026-09-01,rhr,58,manual\n2026-09-01,bogus,1,manual\nnotaday,steps,10,manual\n");
    expect(r.counts).toEqual({ hrv_rmssd: 1, resting_heart_rate: 1 });
    expect(r.observations[0].day).toBe("2026-09-01");
    expect(r.rejected).toEqual({ unknown_metric: 1, "steps:bad_day": 1 });
  });
});
