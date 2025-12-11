import type { Attachment } from './types_mailer.js'

export async function sendMail({
  to, subject, text, html, attachments = []
}: {
  to: string; subject: string; text?: string; html?: string; attachments?: Attachment[];
}) {
  const postmarkKey = process.env.POSTMARK_SERVER_TOKEN
  const sendgridKey = process.env.SENDGRID_API_KEY

  if (postmarkKey) {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': postmarkKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        From: process.env.REPORT_FROM_EMAIL || 'no-reply@subhealth.ai',
        To: to,
        Subject: subject,
        TextBody: text,
        HtmlBody: html,
        Attachments: attachments.map(a => ({
          Name: a.filename,
          Content: a.content.toString('base64'),
          ContentType: a.contentType
        }))
      })
    })
    if (!res.ok) throw new Error(`Postmark error: ${await res.text()}`)
    return true
  }

  if (sendgridKey) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: { email: process.env.REPORT_FROM_EMAIL || 'no-reply@subhealth.ai' },
        personalizations: [{ to: [{ email: to }], subject }],
        content: [
          html ? { type: 'text/html', value: html } : { type: 'text/plain', value: text || '' }
        ],
        attachments: attachments.map(a => ({
          content: a.content.toString('base64'),
          filename: a.filename,
          type: a.contentType,
          disposition: 'attachment'
        }))
      })
    })
    if (!res.ok) throw new Error(`SendGrid error: ${await res.text()}`)
    return true
  }

  throw new Error('No mail provider configured. Set POSTMARK_SERVER_TOKEN or SENDGRID_API_KEY.')
}