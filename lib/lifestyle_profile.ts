import { z } from "zod";
import { supabaseAdmin } from "./supabaseAdmin";
import { LifestyleProfileSchema } from "./intakeSchemas";

type LifestyleProfile = z.infer<typeof LifestyleProfileSchema>;

export async function upsertLifestyleProfile(userId: string, payload: LifestyleProfile): Promise<void> {
  const row = {
    user_id: userId,
    ...payload
  };

  const { error } = await supabaseAdmin
    .from("lifestyle_profile")
    .upsert([row], { onConflict: "user_id" });

  if (error) {
    throw new Error(`Failed to upsert lifestyle profile: ${error.message}`);
  }
}


