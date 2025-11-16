import { LabsPayload } from "@/lib/schemas";
import { requireUser } from "@/lib/auth";
import { queue } from "@/lib/queue";
import { upsertLabs } from "@/lib/labs";

// /app/api/labs_ingest/route.ts
export async function POST(req: Request) {
  const user = await requireUser(req);

  const body = LabsPayload.parse(await req.json());

  // upsert into labs_basic (use parameterized queries)
  await upsertLabs(user.id, body.labs);

  await queue("recompute_user_context", { userId: user.id });

  return Response.json({ ok: true });
}

