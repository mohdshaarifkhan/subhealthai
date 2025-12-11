import { z } from "zod";
import { supabaseAdmin } from "./supabaseAdmin";
import { AllergyLabSchema, AllergySymptomSchema } from "./intakeSchemas";

type AllergyLab = z.infer<typeof AllergyLabSchema>;
type AllergySymptom = z.infer<typeof AllergySymptomSchema>;

export async function insertAllergyLabs(userId: string, items: AllergyLab[]): Promise<void> {
  if (!items || items.length === 0) return;

  const rows = items.map((i) => ({
    user_id: userId,
    date: i.date,
    test_name: i.test_name,
    system_code: i.system_code ?? null,
    igE_kU_L: i.igE_kU_L ?? null,
    class: i.class ?? null,
    lab_name: i.lab_name ?? null
  }));

  const { error } = await supabaseAdmin
    .from("allergies_lab")
    .upsert(rows, { onConflict: "user_id,date,test_name" });

  if (error) {
    throw new Error(`Failed to upsert allergy lab records: ${error.message}`);
  }
}

export async function upsertAllergySymptoms(userId: string, payload: AllergySymptom): Promise<void> {
  const row = {
    user_id: userId,
    ...payload
  };

  const { error } = await supabaseAdmin
    .from("allergies_symptom")
    .upsert([row], { onConflict: "user_id" });

  if (error) {
    throw new Error(`Failed to upsert allergy symptom record: ${error.message}`);
  }
}


