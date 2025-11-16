import { AllergyLabSchema } from "@/lib/intakeSchemas";
import { requireUser } from "@/lib/auth";
import { insertAllergyLabs } from "@/lib/allergies";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const records = await req.json(); // allow array
  const arr = Array.isArray(records) ? records : [records];
  const parsed = arr.map((r) => AllergyLabSchema.parse(r));
  await insertAllergyLabs(user.id, parsed);
  return Response.json({ ok: true });
}


