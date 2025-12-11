import { z } from "zod";
import { supabaseAdmin } from "./supabaseAdmin";
import { VitalsSchema } from "./intakeSchemas";

type Vitals = z.infer<typeof VitalsSchema>;

export async function insertVitals(userId: string, payload: Vitals): Promise<void> {
  const row = {
    user_id: userId,
    ...payload
  };

  const { error } = await supabaseAdmin
    .from("vitals")
    .upsert([row], { onConflict: "user_id,taken_at" });

  if (error) {
    throw new Error(`Failed to upsert vitals: ${error.message}`);
  }
}


