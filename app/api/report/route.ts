// app/api/report/route.ts
import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  const day = new Date().toISOString().slice(0,10)

  const { data: flags, error } = await supabase
    .from('flags')
    .select('flag_type,severity,rationale')
    .eq('day', day)
    .order('severity', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Title
  page.drawText('SubHealthAI Report (Demo)', { x: 72, y: 740, size: 20, font: fontBold })
  page.drawText(`Date: ${day}`, { x: 72, y: 715, size: 12, font })

  // Section: Flags
  let y = 690
  page.drawText('Today’s Flags:', { x: 72, y, size: 14, font: fontBold }); y -= 20

  if (!flags || flags.length === 0) {
    page.drawText('No flags for today.', { x: 72, y, size: 12, font }); y -= 16
  } else {
    for (const f of flags) {
      page.drawText(`• ${f.flag_type} (sev ${f.severity})`, { x: 72, y, size: 12, font }); y -= 14
      page.drawText(`  – ${f.rationale}`, { x: 84, y, size: 11, font, color: rgb(0.2,0.2,0.2) }); y -= 16
      if (y < 80) { // simple pagination guard
        page.drawText('...continued...', { x: 72, y, size: 10, font }); 
        y = 740
      }
    }
  }

  // Disclaimer
  y -= 14
  page.drawText('Disclaimer:', { x: 72, y, size: 12, font: fontBold }); y -= 14
  page.drawText(
    'This report provides preventive insights and is not a medical diagnosis.',
    { x: 72, y, size: 10, font, color: rgb(0.2,0.2,0.2) }
  ); y -= 12
  page.drawText(
    'This risk score is an AI-generated, non-diagnostic indicator intended for preventive context and clinician discussion. Not for emergencies.',
    { x: 72, y, size: 10, font, color: rgb(0.2,0.2,0.2) }
  )

  // ... after Disclaimer block:
  y -= 20;
  page.drawText('SubHealthAI • Preventive insights (not diagnostic)', { x: 72, y, size: 9, font, color: rgb(0.35,0.35,0.35) });


  const bytes = await pdf.save()
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="subhealthai-demo.pdf"',
    },
  })
}
