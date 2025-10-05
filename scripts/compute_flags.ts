// scripts/compute_flag.ts
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}
const sb = createClient(url, key)

type Metric = {
  id: string
  user_id: string
  day: string
  steps: number | null
  sleep_minutes: number | null
  hr_avg: number | null
  hrv_avg: number | null
  rhr: number | null
}

type FlagInsert = {
  user_id: string
  day: string
  flag_type: string
  severity: number
  rationale: string
}

function rules(m: Metric): FlagInsert[] {
  const out: FlagInsert[] = []
  if (m.sleep_minutes != null && m.sleep_minutes < 300)
    out.push({ user_id: m.user_id, day: m.day, flag_type: 'sleep_debt', severity: 2, rationale: 'Sleep under 5 hours' })
  if (m.hrv_avg != null && m.hrv_avg < 40)
    out.push({ user_id: m.user_id, day: m.day, flag_type: 'low_hrv', severity: 3, rationale: 'HRV below baseline proxy' })
  if (m.rhr != null && m.rhr > 80)
    out.push({ user_id: m.user_id, day: m.day, flag_type: 'elevated_rhr', severity: 2, rationale: 'Resting HR > 80 bpm' })
  return out
}

async function run(dayISO?: string) {
  const day = (dayISO ?? new Date().toISOString().slice(0, 10))

  // 1) pull metrics for the target day
  const { data: metrics, error: mErr } = await sb
    .from('metrics')
    .select('id,user_id,day,steps,sleep_minutes,hr_avg,hrv_avg,rhr')
    .eq('day', day)
  if (mErr) throw mErr

  // nothing to do
  const planned = (metrics as Metric[] | null)?.flatMap(rules) ?? []
  if (!planned.length) {
    console.log(`[flags] none for ${day}`)
    await sb.from('audit_log').insert({
      user_id: null,
      action: 'compute_flags_ts',
      details: { day, inserted: 0, reason: 'no-planned-flags' }
    })
    return
  }

  // 2) idempotency: fetch existing flags for (user_id, day) and skip duplicates by flag_type
  const uniqueKeys = new Set(planned.map(f => `${f.user_id}|${f.day}|${f.flag_type}`))
  const { data: existing, error: eErr } = await sb
    .from('flags')
    .select('user_id,day,flag_type')
    .eq('day', day)
  if (eErr) throw eErr

  const existingKeys = new Set((existing ?? []).map(f => `${f.user_id}|${f.day}|${f.flag_type}`))
  const toInsert = planned.filter(f => !existingKeys.has(`${f.user_id}|${f.day}|${f.flag_type}`))

  if (toInsert.length) {
    const { error: insErr } = await sb.from('flags').insert(toInsert)
    if (insErr) throw insErr
  }

  // 3) audit log
  await sb.from('audit_log').insert({
    user_id: null, // system action
    action: 'compute_flags_ts',
    details: {
      day,
      planned: planned.length,
      skipped_as_duplicates: planned.length - toInsert.length,
      inserted: toInsert.length,
      rule_thresholds: { sleep_minutes_lt: 300, hrv_avg_lt: 40, rhr_gt: 80 }
    }
  })

  console.log(`[flags] planned=${planned.length}, inserted=${toInsert.length}, skipped=${planned.length - toInsert.length} for ${day}`)
}

// optional CLI arg: `npx tsx scripts/compute_flag.ts 2025-09-25`
run(process.argv[2]).catch((e) => { console.error(e); process.exit(1) })
