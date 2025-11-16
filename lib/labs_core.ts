import { z } from "zod";
import { supabaseAdmin } from "./supabaseAdmin";
import { LabsCoreSchema } from "./intakeSchemas";

type LabsCore = z.infer<typeof LabsCoreSchema>;

export async function insertLabsCore(userId: string, payload: LabsCore): Promise<void> {
  const row = {
    user_id: userId,
    ...payload
  };

  const { error } = await supabaseAdmin
    .from("labs_core")
    .upsert([row], { onConflict: "user_id,date" });

  if (error) {
    throw new Error(`Failed to upsert labs_core: ${error.message}`);
  }
}


