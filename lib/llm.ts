import OpenAI from 'openai'

export async function summarizeWeeklyLLM({
  week_start,
  week_end,
  metrics,
  flags
}: {
  week_start: string
  week_end: string
  metrics: any[]
  flags: any[]
}) {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    // Fallback when no API key
    const flagCount = flags.length
    const text = `This week shows ${flagCount} signal(s). Focus on sleep regularity, recovery, and stress balance.`
    return { text, usedLLM: false }
  }

  try {
    const client = new OpenAI({ apiKey })
    
    const flagsBullets = flags
      .map(f => `• ${f.day}: ${f.flag_type} (sev ${f.severity}) — ${f.rationale}`)
      .join('\n') || '• No flags recorded.'

    const sys = `You are generating a brief weekly preventive health note.
- Audience: general users and clinicians.
- NEVER diagnose or name diseases.
- Keep it under 120 words.
- Output 3 short sections: Signals, Interpretation, Suggestions.
- Include a final disclaimer sentence: "This is not a medical diagnosis."`

    const user = `Week: ${week_start} to ${week_end}
Metrics: ${JSON.stringify(metrics, null, 0)}
Flags:
${flagsBullets}`

    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ]
    })

    const text = resp.choices?.[0]?.message?.content?.trim() || ''
    return { text, usedLLM: true }
  } catch (e) {
    // Fallback on LLM error
    const flagCount = flags.length
    const text = `This week shows ${flagCount} signal(s). Focus on sleep regularity, recovery, and stress balance.`
    return { text, usedLLM: false }
  }
}