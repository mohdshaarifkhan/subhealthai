export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { Tools, ToolName } from '../../../../contracts/tools';
import { executeTool } from '../../../../lib/copilot/tools';

type Body = { name: ToolName; args: unknown };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.name || !(body.name in Tools)) {
      return NextResponse.json({ ok: false, error: 'unknown_tool' }, { status: 400 });
    }
    const result = await executeTool(body.name, body.args);
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'internal_error' }, { status: 500 });
  }
}

// Optional: simple discovery
export async function GET() {
  const names = Object.keys(Tools);
  return NextResponse.json({ tools: names });
}

