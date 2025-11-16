import { requireUser } from "@/lib/auth";
import { computeContextualRisk } from "@/lib/risk";

// GET /api/contextual_risk
export async function GET(req: Request) {
  const user = await requireUser(req);

  const data = await computeContextualRisk(user.id); // defined below

  return Response.json(data);
}

