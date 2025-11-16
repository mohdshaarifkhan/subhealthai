import { requireUser } from "@/lib/auth";
import { getLatestLabsCore, getLatestVitals, getLifestyleProfile, getAllergySummary, getFamilySummary, getWearableSummary, getUserProfile } from "@/lib/server/context";
import { computeConditionRisks, computeMultimodalRiskIndex } from "@/lib/risk/derive";

export async function GET(req: Request) {
  const user = await requireUser(req);

  const [labs, vitals, lifestyle, allergies, family, wearable, profile] =
    await Promise.all([
      getLatestLabsCore(user.id),
      getLatestVitals(user.id),
      getLifestyleProfile(user.id),
      getAllergySummary(user.id),
      getFamilySummary(user.id),
      getWearableSummary(user.id),
      getUserProfile(user.id)
    ]);

  const ctx = {
    labs,
    vitals,
    lifestyle,
    allergies,
    family,
    wearable,
    age_years: profile?.age_years ?? null,
    sex_at_birth: profile?.sex_at_birth ?? null
  };

  const conditions = computeConditionRisks(ctx);
  const overall = computeMultimodalRiskIndex(conditions);

  return Response.json({
    overall,
    conditions,
    disclaimer:
      "SubHealthAI scores are non-diagnostic research metrics (0–1 scale) describing patterns relative to typical reference ranges and your context. They do not confirm or rule out any disease. Please consult a physician for medical interpretation."
  });
}


