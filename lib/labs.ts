import { supabaseAdmin } from "./supabaseAdmin";
import { z } from "zod";
import { LabItem } from "./schemas";

type LabItemType = z.infer<typeof LabItem>;

/**
 * Upsert lab results into labs_basic table.
 * Uses parameterized queries via Supabase.
 */
export async function upsertLabs(userId: string, labs: LabItemType[]): Promise<void> {
  const sb = supabaseAdmin;

  // Map LabItem to database schema
  const rows = labs.map((lab) => ({
    user_id: userId,
    date: lab.date,
    crp: lab.crp ?? null,
    hba1c: lab.hba1c ?? null,
    vit_d: lab.vit_d ?? null,
    ldl: lab.ldl ?? null,
    hdl: lab.hdl ?? null,
    source: lab.source ?? "manual",
  }));

  // Upsert with conflict resolution on (user_id, date)
  const { error } = await sb
    .from("labs_basic")
    .upsert(rows, { onConflict: "user_id,date" });

  if (error) {
    throw new Error(`Failed to upsert labs: ${error.message}`);
  }
}

