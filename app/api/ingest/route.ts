import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

type Row = { day: string; metric: string; value: string; source?: string };

const sb = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function mapToMetrics(rows: Row[]) {
  // Pivot rows -> per-day object matching metrics schema
  const byDay = new Map<string, any>();
  const norm = (s: string) => s.trim().toLowerCase();

  for (const r of rows) {
    const day = r.day.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { day, hrv_avg: null, hr_avg: null, steps: null, sleep_minutes: null });
    const obj = byDay.get(day);

    const m = norm(r.metric);
    const val = Number(r.value);
    if (!Number.isFinite(val)) continue;

    if (["hrv", "rmssd", "sdnn"].some(k => m.includes(k))) obj.hrv_avg = val;
    else if (["hr", "rhr", "heartrate", "hr_avg"].some(k => m.includes(k))) obj.hr_avg = val;
    else if (["steps"].some(k => m === k)) obj.steps = Math.round(val);
    else if (["sleep", "sleep_minutes"].some(k => m.includes(k))) obj.sleep_minutes = Math.round(val);
    // eda/temp/etc are ignored for metrics; keep in raw_payload if you want later
  }
  return Array.from(byDay.values());
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const email = (form.get("email") as string | null)?.trim().toLowerCase();

  if (!file || !email) return NextResponse.json({ error: "file and email are required" }, { status: 400 });

  const text = await file.text();
  const rows = parse(text, { columns: true, skip_empty_lines: true }) as Row[];
  const payload = mapToMetrics(rows);

  const supa = sb();
  // get or create user
  const { data: u } = await supa.from("users").select("id").eq("email", email).maybeSingle();
  let user_id = u?.id;
  if (!user_id) {
    const { data: created, error } = await supa.from("users").insert({ email }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    user_id = created!.id;
  }

  // upsert metrics per day
  const rowsUpsert = payload.map((p) => ({ user_id, day: p.day, ...p }));
  // Remove null fields to avoid schema issues
  const cleanRows = rowsUpsert.map(row => {
    const clean: any = { user_id: row.user_id, day: row.day };
    if (row.hrv_avg !== null && row.hrv_avg !== undefined) clean.hrv_avg = row.hrv_avg;
    if (row.hr_avg !== null && row.hr_avg !== undefined) clean.hr_avg = row.hr_avg;
    if (row.steps !== null && row.steps !== undefined) clean.steps = row.steps;
    if (row.sleep_minutes !== null && row.sleep_minutes !== undefined) clean.sleep_minutes = row.sleep_minutes;
    return clean;
  });
  const { error: upErr } = await supa
    .from("metrics")
    .upsert(cleanRows, { onConflict: "user_id,day" });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, inserted_days: rowsUpsert.length });
}
