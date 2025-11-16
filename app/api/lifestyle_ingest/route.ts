import { LifestylePayload } from "@/lib/schemas";
import { requireUser } from "@/lib/auth";
import { queue } from "@/lib/queue";
import { upsertLifestyle } from "@/lib/lifestyle";

// /app/api/lifestyle_ingest/route.ts
export async function POST(req: Request) {
  const user = await requireUser(req);

  const body = LifestylePayload.parse(await req.json());

  await upsertLifestyle(user.id, body);

  await queue("recompute_user_context", { userId: user.id });

  return Response.json({ ok: true });
}

