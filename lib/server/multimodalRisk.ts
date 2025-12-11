import { computeConditionRisks, computeMultimodalRiskIndex } from "@/lib/risk/derive";
import { MultimodalContext } from "@/lib/risk/types";
import {
  getLatestLabsCore,
  getLatestVitals,
  getLifestyleProfile,
  getAllergySummary,
  getFamilySummary,
  getWearableSummary,
  getUserProfile
} from "@/lib/server/context";

export async function getMultimodalRiskForReport(userId: string) {
  const [labs, vitals, lifestyle, allergies, family, wearable, profile] =
    await Promise.all([
      getLatestLabsCore(userId),
      getLatestVitals(userId),
      getLifestyleProfile(userId),
      getAllergySummary(userId),
      getFamilySummary(userId),
      getWearableSummary(userId),
      getUserProfile(userId)
    ]);

  const ctx: MultimodalContext = {
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

  return {
    overall,
    conditions,
    disclaimer:
      "SubHealthAI multimodal scores are non-diagnostic research indices (0–1 scale) describing pattern overlap with known subclinical risk profiles. They do not confirm or rule out any disease. All interpretation must be done by a qualified clinician."
  };
}


