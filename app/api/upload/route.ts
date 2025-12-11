import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { queue } from "@/lib/queue";

// POST /api/upload
export async function POST(req: Request) {
  const user = await requireUser(req);

  const body = await req.json();

  await queue('ingest_user_upload', { userId: user.id, payload: body });

  return NextResponse.json({ ok: true });
}

