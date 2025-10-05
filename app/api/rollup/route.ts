import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

// simple mapping and aggregates for MVP
const METRIC_MAP = {
  steps: 'sum',
  sleep_minutes: 'sum',
  hr: 'avg',
  hrv: 'avg',
  rhr: 'avg',
} as const

function ymd(d: Date) { return d.toISOString().slice(0,10) }

export async function POST(req: Request) {
  // optional query: ?day=YYYY-MM-DD&user_id=...
  const url = new URL(req.url)
  const day = url.searchParams.get('day') || ymd(new Date())
  const userFilter = url.searchParams.get('user_id')

  try {
    // fetch events for that day (optionally for one user)
    let q = supabaseAdmin.from('events_raw')
      .select('user_id, metric, value, event_time')
      .gte('event_time', `${day}T00:00:00Z`)
      .lt('event_time', `${day}T23:59:59Z`)
    if (userFilter) q = q.eq('user_id', userFilter)
    const { data: events, error: evErr } = await q
    if (evErr) throw evErr

    // group by user_id and metric
    const byUser: Record<string, Record<string, number[]>> = {}
    for (const e of events || []) {
      const u = e.user_id
      byUser[u] ||= {}
      byUser[u][e.metric] ||= []
      byUser[u][e.metric].push(Number(e.value))
    }

    const upserts: any[] = []
    for (const [uid, metrics] of Object.entries(byUser)) {
      const rec: any = { user_id: uid, day }
      // compute aggregates
      for (const [m, arr] of Object.entries(metrics)) {
        const kind = (METRIC_MAP as any)[m]
        if (!kind || !arr.length) continue
        if (kind === 'sum') rec[m] = arr.reduce((a, b) => a + b, 0)
        if (kind === 'avg') rec[m + (m === 'hr' ? '_avg' : m === 'hrv' ? '_avg' : m === 'rhr' ? '' : '')] =
          Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100
      }
      // normalize keys to your metrics schema
      // hr -> hr_avg, hrv -> hrv_avg; rhr already matches schema
      if (rec['hr']) { rec['hr_avg'] = rec['hr']; delete rec['hr'] }
      if (rec['hrv']) { rec['hrv_avg'] = rec['hrv']; delete rec['hrv'] }

      upserts.push(rec)
    }

    // upsert into metrics (unique user_id, day)
    for (const row of upserts) {
      const { error } = await supabaseAdmin
        .from('metrics')
        .upsert(row, { onConflict: 'user_id,day' })
      if (error) throw error
    }

    await supabaseAdmin.from('audit_log').insert({
      user_id: null, action: 'rollup_events_to_metrics',
      details: { day, users: Object.keys(byUser).length, rows: upserts.length }
    })

    return NextResponse.json({ ok: true, day, users: Object.keys(byUser).length, metrics_rows: upserts.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'rollup failed' }, { status: 500 })
  }
}
