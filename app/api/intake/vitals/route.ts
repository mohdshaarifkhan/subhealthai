import { VitalsSchema } from "@/lib/intakeSchemas";
import { requireUser } from "@/lib/auth";
import { insertVitals } from "@/lib/vitals";

export async function POST(req: Request) {
  const user = await requireUser(req);
  const body = VitalsSchema.parse(await req.json());
  await insertVitals(user.id, body);
  return Response.json({ ok: true });
}


