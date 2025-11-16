import { z } from "zod";
import { supabaseAdmin } from "./supabaseAdmin";
import { ProfileSchema } from "./intakeSchemas";

type Profile = z.infer<typeof ProfileSchema>;

export async function upsertProfile(userId: string, profile: Profile): Promise<void> {
  const row = {
    user_id: userId,
    ...profile
  };

  const { error } = await supabaseAdmin
    .from("user_profile")
    .upsert([row], { onConflict: "user_id" });

  if (error) {
    throw new Error(`Failed to upsert user profile: ${error.message}`);
  }
}


