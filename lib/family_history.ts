import { z } from "zod";
import { supabaseAdmin } from "./supabaseAdmin";
import { FamilyHistoryItemSchema } from "./intakeSchemas";

type FamilyHistoryItem = z.infer<typeof FamilyHistoryItemSchema>;

export async function replaceFamilyHistory(userId: string, items: FamilyHistoryItem[]): Promise<void> {
  // Delete existing
  const { error: delError } = await supabaseAdmin
    .from("family_history")
    .delete()
    .eq("user_id", userId);
  if (delError) {
    throw new Error(`Failed to clear family history: ${delError.message}`);
  }

  if (!items || items.length === 0) return;

  const rows = items.map((i) => ({
    user_id: userId,
    relation: i.relation,
    condition: i.condition,
    age_of_onset: i.age_of_onset ?? null,
    notes: i.notes ?? null
  }));

  const { error: insError } = await supabaseAdmin
    .from("family_history")
    .insert(rows);

  if (insError) {
    throw new Error(`Failed to insert family history: ${insError.message}`);
  }
}


