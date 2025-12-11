import { LifestyleProfileSchema } from "@/lib/intakeSchemas";
import { requireUser } from "@/lib/auth";
import { upsertLifestyleProfile } from "@/lib/lifestyle_profile";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const body = LifestyleProfileSchema.parse(await req.json());
  await upsertLifestyleProfile(user.id, body);
  return Response.json({ ok: true });
}


