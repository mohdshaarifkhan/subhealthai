/**
 * Samsung Health "Download personal data" export → canonical Observations.
 *
 * Samsung Health has no server-side web API, so the export zip is the only
 * zero-approval path to real data. The export is a folder of CSVs named
 * `com.samsung.<namespace>.<type>.<YYYYMMDDHHMMSS>.csv`, where the trailing
 * timestamp is the EXPORT time, not the measurement day. (The previous Python
 * loader used that timestamp as the day, collapsing all history into one day;
 * this parser reads per-row timestamps instead.)
 *
 * CSV layout: line 1 is a metadata line, line 2 the header, then data. Column
 * names are namespaced (e.g. `com.samsung.health.heart_rate.start_time`); we
 * match on the last segment. Row times are treated as UTC with a separate
 * `time_offset` column such as "UTC-0500".
 * [Assumption to verify against a real export: UTC + time_offset semantics.]
 */
import { unzipSync, strFromU8 } from "fflate";
import { parse } from "csv-parse/sync";
import {
  CanonicalMetric,
  CANONICAL_METRICS,
  Observation,
  ParseReport,
  summarize,
  validateValue,
} from "./types";

export const SAMSUNG_PARSER_VERSION = "samsung-export-v1";
const SOURCE = "samsung_health";

type Row = Record<string, string>;

interface Mapping {
  /** Stable key used to pick one file family per metric (avoids double counting). */
  family: string;
  metric: CanonicalMetric;
  matches: (type: string) => boolean;
  valueCols: string[];
  /** Interpret the row as a session and use (end - start) in minutes as value. */
  durationFromSpan?: boolean;
  /** Daily totals keyed by an epoch-ms `day_time` column instead of start_time. */
  dailyTotal?: boolean;
  /** Optional row filter (e.g. keep only merged step source). */
  filter?: (rows: Row[]) => Row[];
}

// Ordered: for each metric the first family with usable rows wins.
const MAPPINGS: Mapping[] = [
  { family: "tracker.heart_rate", metric: "heart_rate", matches: (t) => t.endsWith("tracker.heart_rate"), valueCols: ["heart_rate"] },
  { family: "shealth.sleep", metric: "sleep_session", matches: (t) => t === "com.samsung.shealth.sleep", valueCols: [], durationFromSpan: true },
  { family: "health.sleep", metric: "sleep_session", matches: (t) => t === "com.samsung.health.sleep", valueCols: [], durationFromSpan: true },
  {
    family: "step_daily_trend",
    metric: "steps",
    matches: (t) => t.endsWith("step_daily_trend"),
    valueCols: ["count", "step_count"],
    dailyTotal: true,
    // source_type -2 is Samsung's merged (all-device) total; keep only it when present.
    filter: (rows) => (rows.some((r) => r.source_type === "-2") ? rows.filter((r) => r.source_type === "-2") : rows),
  },
  { family: "pedometer_day_summary", metric: "steps", matches: (t) => t.endsWith("pedometer_day_summary"), valueCols: ["step_count", "count"], dailyTotal: true },
  { family: "oxygen_saturation", metric: "spo2", matches: (t) => t.endsWith("oxygen_saturation"), valueCols: ["spo2"] },
  { family: "stress", metric: "stress_score", matches: (t) => t.endsWith("shealth.stress"), valueCols: ["score"] },
  { family: "respiratory_rate", metric: "respiratory_rate", matches: (t) => t.includes("respiratory_rate"), valueCols: ["respiratory_rate", "average", "value"] },
  { family: "hrv", metric: "hrv_rmssd", matches: (t) => t.endsWith(".hrv"), valueCols: ["rmssd"] },
];

/** `com.samsung.shealth.tracker.heart_rate.20251103151617.csv` → `com.samsung.shealth.tracker.heart_rate` */
export function fileType(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.csv$/i, "").replace(/\.\d{14}$/, "").toLowerCase();
}

function shortCol(c: string): string {
  const i = c.lastIndexOf(".");
  return (i >= 0 ? c.slice(i + 1) : c).trim().toLowerCase();
}

/** Parse a Samsung CSV, skipping the leading metadata line when present. */
export function parseSamsungCsv(text: string): { columns: string[]; rows: Row[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  // Header is whichever of the first two lines carries a recognizable time column.
  const looksLikeHeader = (l: string | undefined) =>
    !!l && /(start_time|day_time|create_time|update_time)/i.test(l);
  const skip = looksLikeHeader(lines[0]) ? 0 : looksLikeHeader(lines[1]) ? 1 : 1;
  const body = lines.slice(skip).join("\n");
  const records = parse(body, {
    columns: (header: string[]) => header.map(shortCol),
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as Row[];
  const columns = records.length ? Object.keys(records[0]) : [];
  return { columns, rows: records };
}

/** "UTC-0500" / "UTC+0530" → minutes. */
export function parseOffset(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = /UTC([+-])(\d{2}):?(\d{2})/i.exec(s.trim());
  if (!m) return undefined;
  const mins = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === "-" ? -mins : mins;
}

/** "2025-03-01 07:12:00.000" (UTC) or epoch ms → ISO UTC. */
export function parseSamsungTime(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  if (/^\d{12,14}$/.test(t)) {
    const d = new Date(Number(t));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const iso = t.includes("T") ? t : t.replace(" ", "T");
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z");
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function pickValue(row: Row, cols: string[]): number {
  for (const c of cols) {
    const v = row[c];
    if (v !== undefined && v !== "") return Number(v);
  }
  return NaN;
}

/** Convert one Samsung file's rows to observations for a given mapping. */
export function mapRows(
  mapping: Mapping,
  rows: Row[],
  origin: string,
  rejected: Record<string, number>,
): Observation[] {
  const out: Observation[] = [];
  const reject = (why: string) => (rejected[`${mapping.metric}:${why}`] = (rejected[`${mapping.metric}:${why}`] ?? 0) + 1);
  const unit = CANONICAL_METRICS[mapping.metric].unit;
  const use = mapping.filter ? mapping.filter(rows) : rows;

  for (const r of use) {
    const device = r.deviceuuid || r.device_uuid || undefined;
    if (mapping.dailyTotal) {
      const start = parseSamsungTime(r.day_time);
      if (!start) { reject("bad_time"); continue; }
      const value = pickValue(r, mapping.valueCols);
      const bad = validateValue(mapping.metric, value);
      if (bad) { reject(bad); continue; }
      const end = new Date(new Date(start).getTime() + 86_400_000).toISOString();
      // day_time marks the calendar day (UTC midnight), so the day is explicit.
      out.push({ metric: mapping.metric, value, unit, start, end, day: start.slice(0, 10), tzOffsetMinutes: 0, source: SOURCE, device, origin });
      continue;
    }

    const start = parseSamsungTime(r.start_time);
    if (!start) { reject("bad_time"); continue; }
    const tzOffsetMinutes = parseOffset(r.time_offset);
    let value: number;
    let end: string | undefined;
    if (mapping.durationFromSpan) {
      const e = parseSamsungTime(r.end_time);
      if (!e) { reject("bad_end_time"); continue; }
      end = e;
      value = (new Date(e).getTime() - new Date(start).getTime()) / 60_000;
    } else {
      value = pickValue(r, mapping.valueCols);
      end = parseSamsungTime(r.end_time) ?? undefined;
    }
    const bad = validateValue(mapping.metric, value);
    if (bad) { reject(bad); continue; }
    out.push({ metric: mapping.metric, value: Math.round(value * 100) / 100, unit, start, end, tzOffsetMinutes, source: SOURCE, device, origin });
  }
  return out;
}

/** Parse a set of export files (path → text). Exposed separately from unzip for tests. */
export function parseSamsungFiles(files: Record<string, string>): ParseReport {
  const rejected: Record<string, number> = {};
  const unrecognized: { file: string; columns: string[] }[] = [];
  const byFamily = new Map<string, Observation[]>();

  for (const [path, text] of Object.entries(files)) {
    if (!/\.csv$/i.test(path)) continue;
    const type = fileType(path);
    const mapping = MAPPINGS.find((m) => m.matches(type));
    let parsed: { columns: string[]; rows: Row[] };
    try {
      parsed = parseSamsungCsv(text);
    } catch {
      rejected[`file:unparseable`] = (rejected[`file:unparseable`] ?? 0) + 1;
      continue;
    }
    if (!mapping) {
      unrecognized.push({ file: type, columns: parsed.columns });
      continue;
    }
    const obs = mapRows(mapping, parsed.rows, type, rejected);
    byFamily.set(mapping.family, [...(byFamily.get(mapping.family) ?? []), ...obs]);
  }

  // One family per metric, in MAPPINGS order, to avoid double counting.
  const chosen = new Map<CanonicalMetric, string>();
  for (const m of MAPPINGS) {
    if (chosen.has(m.metric)) continue;
    if ((byFamily.get(m.family)?.length ?? 0) > 0) chosen.set(m.metric, m.family);
  }
  const observations: Observation[] = [];
  for (const family of Array.from(chosen.values())) observations.push(...(byFamily.get(family) ?? []));

  return summarize(SOURCE, SAMSUNG_PARSER_VERSION, dedupe(observations), rejected, unrecognized);
}

/** Parse a Samsung Health export zip. */
export function parseSamsungZip(zip: Uint8Array): ParseReport {
  const entries = unzipSync(zip, { filter: (f) => /\.csv$/i.test(f.name) });
  const files: Record<string, string> = {};
  for (const [name, data] of Object.entries(entries)) files[name] = strFromU8(data);
  return parseSamsungFiles(files);
}

/** Drop exact duplicates on the natural key used by events_raw's unique index. */
export function dedupe(obs: Observation[]): Observation[] {
  const seen = new Set<string>();
  const out: Observation[] = [];
  for (const o of obs) {
    const k = `${o.source}|${o.metric}|${o.start}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(o);
  }
  return out;
}
