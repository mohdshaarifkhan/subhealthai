// app/api/weekly_note/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import OpenAI from 'openai';

function ymd(d: Date) { return d.toISOString().slice(0,10) }

// Initialize client lazily to avoid build-time errors
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
}

export async function POST() {
  try {
    // --- pick a user (same as your logic) ---
    const today = new Date();
    const start = new Date(today); start.setDate(start.getDate() - 6);
    let week_start = ymd(start), week_end = ymd(today);

    let user_id: string | undefined;
    const { data: m } = await supabaseAdmin
      .from('metrics').select('user_id').gte('day', week_start).lte('day', week_end).limit(1);
    user_id = m?.[0]?.user_id;

    if (!user_id) {
      const { data: mr } = await supabaseAdmin
        .from('metrics').select('user_id,day').order('day', { ascending: false }).limit(1);
      user_id = mr?.[0]?.user_id;
    }
    if (!user_id) {
      const { data: fr } = await supabaseAdmin
        .from('flags').select('user_id,day').order('day', { ascending: false }).limit(1);
      user_id = fr?.[0]?.user_id;
    }

    if (!user_id) {
      const summary = 'No data available this week. This placeholder summary shows structure only.';
      const note_json = {
        week: { start: week_start, end: week_end },
        signals: { counts: { total: 0, low_hrv: 0, sleep_debt: 0, elevated_rhr: 0 } },
        flags: [],
        interpretation: { text: summary, confidence: 'low' },
        disclaimer: 'This is not a medical diagnosis. Insights are preventive and educational only.'
      };
      await supabaseAdmin.from('weekly_notes').upsert(
        { user_id: null, week_start, week_end, summary, recommendations: null, sources: [], note_json },
        { onConflict: 'user_id,week_start,week_end' }
      );
      await supabaseAdmin.from('audit_log').insert({
        user_id: null, action: 'generate_weekly_note',
        details: { week_start, week_end, counts: note_json.signals.counts, used_llm: false, placeholder: true }
      });
      return NextResponse.json({ ok: true, user_id: null, week_start, week_end, placeholder: true, usedLLM: false });
    }

    // --- build 7d window; fallback to latest metrics window ---
    const todayISO = ymd(new Date());
    const startISO = ymd(new Date(Date.now() - 6*24*3600*1000));

    let { data: metrics, error: mErr } = await supabaseAdmin
      .from('metrics')
      .select('day, steps, sleep_minutes, hrv_avg, rhr')
      .eq('user_id', user_id)
      .gte('day', startISO).lte('day', todayISO)
      .order('day', { ascending: true });
    if (mErr) throw mErr;

    if (!metrics || metrics.length === 0) {
      const { data: latest } = await supabaseAdmin
        .from('metrics').select('day').eq('user_id', user_id)
        .order('day', { ascending: false }).limit(1);
      if (latest?.[0]?.day) {
        const end = latest[0].day as string;
        const start = ymd(new Date(Date.parse(end) - 6*24*3600*1000));
        const m2 = await supabaseAdmin
          .from('metrics').select('day, steps, sleep_minutes, hrv_avg, rhr')
          .eq('user_id', user_id).gte('day', start).lte('day', end)
          .order('day', { ascending: true });
        metrics = m2.data ?? [];
      }
    }

    if (!metrics || metrics.length === 0) {
      const text = 'No data available this week. Please upload data or sync a device.';
      await supabaseAdmin.from('weekly_notes').insert({
        user_id, week_start: todayISO, week_end: todayISO,
        summary: 'No data', recommendations: null, sources: [],
        note_json: { interpretation: { text }, counts: { total: 0, low_hrv: 0, sleep_debt: 0, elevated_rhr: 0 } }
      });
      return NextResponse.json({ ok: true, saved: 'empty-note', usedLLM: false });
    }

    // Align the week to the actual metrics window
    week_start = metrics[0].day;
    week_end   = metrics[metrics.length - 1].day;

    // flags in the same window
    const { data: flags } = await supabaseAdmin
      .from('flags')
      .select('day, flag_type, severity, rationale')
      .eq('user_id', user_id)
      .gte('day', week_start).lte('day', week_end)
      .order('day', { ascending: true });

    const counts = {
      total: flags?.length ?? 0,
      low_hrv: flags?.filter(f => f.flag_type === 'low_hrv').length ?? 0,
      sleep_debt: flags?.filter(f => f.flag_type === 'sleep_debt').length ?? 0,
      elevated_rhr: flags?.filter(f => f.flag_type === 'elevated_rhr').length ?? 0,
    };

    // --- LLM (or fallback) ---
    let usedLLM = false;
    let interpretationText = `This week shows ${counts.total} signal(s). Focus on sleep regularity, recovery, and stress balance.`;
    const openai = getOpenAIClient();
    if (openai) {
      try {
        const flagsBullets = (flags ?? [])
          .map(f => `• ${f.day}: ${f.flag_type} (sev ${f.severity}) — ${f.rationale}`)
          .join('\n') || '• No flags recorded.';

        const sys =
          `You are generating a brief weekly preventive health note.
- Audience: general users and clinicians.
- NEVER diagnose or name diseases.
- Keep it under 120 words.
- Output 3 short sections: Signals, Interpretation, Suggestions.
- Include a final disclaimer sentence: "This is not a medical diagnosis."`;

        const user =
          `Week ${week_start} → ${week_end}
Counts: ${JSON.stringify(counts)}
Flags:
${flagsBullets}`;

        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: user }
          ]
        });
        const text = resp.choices?.[0]?.message?.content?.trim();
        if (text) { interpretationText = text; usedLLM = true; }
      } catch (e:any) {
        // keep fallback; record error in audit
        await supabaseAdmin.from('audit_log').insert({
          user_id, action: 'weekly_note_llm_error',
          details: { week_start, week_end, error: String(e?.message || e) }
        });
      }
    }

    const note_json = {
      week: { start: week_start, end: week_end },
      signals: { counts },
      flags: flags ?? [],
      interpretation: { text: interpretationText, confidence: usedLLM ? 'medium' : 'low' },
      disclaimer: 'This is not a medical diagnosis. Insights are preventive and educational only.'
    };

    const { error: upErr } = await supabaseAdmin.from('weekly_notes').upsert(
      { user_id, week_start, week_end, summary: interpretationText.slice(0,300), recommendations: null, sources: ['metrics','flags'], note_json },
      { onConflict: 'user_id,week_start,week_end' }
    );
    if (upErr) throw upErr;

    await supabaseAdmin.from('audit_log').insert({
      user_id, action: 'generate_weekly_note',
      details: { week_start, week_end, counts, used_llm: usedLLM }
    });

    return NextResponse.json({ ok: true, user_id, week_start, week_end, usedLLM });
  } catch (e:any) {
    console.error('WEEKLY_NOTE_ERROR', e);
    return NextResponse.json({ ok:false, error: e?.message || 'failed' }, { status: 500 });
  }
}
