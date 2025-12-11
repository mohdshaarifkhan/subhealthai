import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    OPENAI_API_KEY_present: !!process.env.OPENAI_API_KEY
  })
}
