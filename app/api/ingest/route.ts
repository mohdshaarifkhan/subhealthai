import { NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

type Row = { day: string; metric: string; value: string; source?: string }

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const email = (form.get('email') as string | null) || 'demo@subhealth.ai'
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

    // find or create user
    let { data: u } = await supabaseAdmin.from('users').select('id').eq('email', email).limit(1)
    let user_id = u?.[0]?.id as string | undefined
    if (!user_id) {
      const { data: ins } = await supabaseAdmin.from('users')
        .insert({ email, display_name: 'CSV User' }).select('id').single()
      user_id = ins?.id
    }
    if (!user_id) return NextResponse.json({ error: 'cannot resolve user' }, { status: 500 })

    // parse CSV
    const buf = Buffer.from(await file.arrayBuffer())
    const rows = parse(buf.toString('utf8'), {
      columns: true, skip_empty_lines: true, trim: true
    }) as Row[]

    // build inserts to events_raw
    const events = rows.map((r) => ({
      user_id,
      source: r.source || 'csv',
      metric: r.metric,
      value: Number(r.value),
      event_time: new Date(`${r.day}T12:00:00Z`).toISOString(),
      meta: {}
    }))

    if (events.length) {
      const { error } = await supabaseAdmin.from('events_raw').insert(events)
      if (error) throw error
    }

    await supabaseAdmin.from('audit_log').insert({
      user_id, action: 'csv_ingest', details: { rows: rows.length, file_name: (file as any).name || 'upload' }
    })

    return NextResponse.json({ ok: true, user_id, ingested: events.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'ingest failed' }, { status: 500 })
  }
}
