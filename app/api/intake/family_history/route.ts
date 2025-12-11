import { FamilyHistoryItemSchema } from "@/lib/intakeSchemas";
import { requireUser } from "@/lib/auth";
import { replaceFamilyHistory } from "@/lib/family_history";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const body = await req.json();
  const arr = Array.isArray(body) ? body : [body];
  const parsed = arr.map((r: unknown) => FamilyHistoryItemSchema.parse(r));
  await replaceFamilyHistory(user.id, parsed); // simplest: delete+insert
  return Response.json({ ok: true });
}


