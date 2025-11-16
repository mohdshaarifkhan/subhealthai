import { LabsCoreSchema } from "@/lib/intakeSchemas";
import { requireUser } from "@/lib/auth";
import { insertLabsCore } from "@/lib/labs_core";
// import { queue } from "@/lib/queue";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const body = LabsCoreSchema.parse(await req.json());
  await insertLabsCore(user.id, body);
  // Optionally enqueue recompute job
  // await queue("recompute_user_context", { userId: user.id });
  return Response.json({ ok: true });
}


