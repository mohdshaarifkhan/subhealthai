import { ProfileSchema } from "@/lib/intakeSchemas";
import { requireUser } from "@/lib/auth";
import { upsertProfile } from "@/lib/profile";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const body = ProfileSchema.parse(await req.json());
  await upsertProfile(user.id, body); // simple upsert into user_profile
  return Response.json({ ok: true });
}


