import { AllergySymptomSchema } from "@/lib/intakeSchemas";
import { requireUser } from "@/lib/auth";
import { upsertAllergySymptoms } from "@/lib/allergies";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const body = AllergySymptomSchema.parse(await req.json());
  await upsertAllergySymptoms(user.id, body);
  return Response.json({ ok: true });
}


