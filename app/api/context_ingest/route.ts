import { ContextPayload } from "@/lib/schemas";
import { requireUser } from "@/lib/auth";
import { queue } from "@/lib/queue";
import { upsertContext } from "@/lib/context";

// /app/api/context_ingest/route.ts
export async function POST(req: Request) {
  const user = await requireUser(req);

  const body = ContextPayload.parse(await req.json());

  await upsertContext(user.id, body);

  await queue("recompute_user_context", { userId: user.id });

  return Response.json({ ok: true });
}

