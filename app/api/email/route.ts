export const runtime = 'nodejs';

import { NextResponse } from 'next/server'
import { sendMail } from '../../../lib/mailer'

export async function POST(req: Request) {
  try {
    const { to } = await req.json().catch(() => ({}))
    const recipient = to || process.env.REPORT_TEST_EMAIL || 'clinician@example.com'

    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const pdfRes = await fetch(`${base}/api/report`, { method: 'GET' })
    if (!pdfRes.ok) throw new Error('Could not generate PDF')
    const bytes = Buffer.from(await pdfRes.arrayBuffer())

    await sendMail({
      to: recipient,
      subject: 'SubHealthAI Weekly Report (PDF)',
      text: 'Attached is the SubHealthAI weekly preventive insights report.',
      html: '<p>Attached is the <strong>SubHealthAI</strong> weekly preventive insights report.</p>',
      attachments: [{
        filename: 'subhealthai-report.pdf',
        contentType: 'application/pdf',
        content: bytes
      }]
    })

    return NextResponse.json({ ok: true, to: recipient })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'email failed' }, { status: 500 })
  }
}
