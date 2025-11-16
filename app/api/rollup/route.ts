import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

// Mapping of raw event metric -> target metrics column and aggregate
const METRIC_AGG: Record<string, { target: string; agg: 'sum'|'avg' }> = {
  steps: { target: 'steps', agg: 'sum' },
  sleep_minutes: { target: 'sleep_minutes', agg: 'sum' },
  hr: { target: 'hr_avg', agg: 'avg' },
  hrv: { target: 'hrv_avg', agg: 'avg' },
  rhr: { target: 'rhr', agg: 'avg' },
}

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
      for (const [m, arr] of Object.entries(metrics)) {
        const cfg = METRIC_AGG[m]
        if (!cfg || !arr.length) continue
        if (cfg.agg === 'sum') rec[cfg.target] = arr.reduce((a, b) => a + b, 0)
        if (cfg.agg === 'avg') {
          const avg = arr.reduce((a, b) => a + b, 0) / arr.length
          rec[cfg.target] = Math.round(avg * 100) / 100
        }
      }
      upserts.push(rec)
    }

    // bulk upsert into metrics (unique user_id, day)
    if (upserts.length) {
      const { error } = await supabaseAdmin
        .from('metrics')
        .upsert(upserts, { onConflict: 'user_id,day' })
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
