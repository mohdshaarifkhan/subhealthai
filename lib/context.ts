import { supabaseAdmin } from "./supabaseAdmin";
import { z } from "zod";
import { ContextPayload, AllergyItem, MedItem, FamHxItem, GeneticItem } from "./schemas";

type ContextPayloadType = z.infer<typeof ContextPayload>;

/**
 * Upsert contextual health data (allergies, medications, family history, genetic markers).
 */
export async function upsertContext(userId: string, payload: ContextPayloadType): Promise<void> {
  const sb = supabaseAdmin;

  // Upsert allergies
  if (payload.allergies && payload.allergies.length > 0) {
    const allergyRows = payload.allergies.map((allergy) => ({
      user_id: userId,
      substance: allergy.substance,
      reaction: allergy.reaction ?? null,
      severity: allergy.severity ?? null,
    }));

    // Delete existing allergies for this user and insert new ones
    await sb.from("context_allergies").delete().eq("user_id", userId);
    
    if (allergyRows.length > 0) {
      const { error } = await sb.from("context_allergies").insert(allergyRows);
      if (error) {
        throw new Error(`Failed to upsert allergies: ${error.message}`);
      }
    }
  }

  // Upsert medications
  if (payload.medications && payload.medications.length > 0) {
    const medRows = payload.medications.map((med) => ({
      user_id: userId,
      name: med.name,
      dose: med.dose ?? null,
      frequency: med.frequency ?? null,
      start_date: med.start_date ?? null,
      end_date: med.end_date ?? null,
    }));

    await sb.from("context_medications").delete().eq("user_id", userId);
    
    if (medRows.length > 0) {
      const { error } = await sb.from("context_medications").insert(medRows);
      if (error) {
        throw new Error(`Failed to upsert medications: ${error.message}`);
      }
    }
  }

  // Upsert family history
  if (payload.family_history && payload.family_history.length > 0) {
    const famHxRows = payload.family_history.map((fh) => ({
      user_id: userId,
      condition: fh.condition,
      relation: fh.relation,
      age_of_onset: fh.age_of_onset ?? null,
    }));

    await sb.from("context_family_history").delete().eq("user_id", userId);
    
    if (famHxRows.length > 0) {
      const { error } = await sb.from("context_family_history").insert(famHxRows);
      if (error) {
        throw new Error(`Failed to upsert family history: ${error.message}`);
      }
    }
  }

  // Upsert genetic markers
  if (payload.genetic && payload.genetic.length > 0) {
    const geneticRows = payload.genetic.map((gen) => ({
      user_id: userId,
      marker: gen.marker,
      variant: gen.variant,
      evidence_level: gen.evidence_level ?? null,
    }));

    await sb.from("context_genetic").delete().eq("user_id", userId);
    
    if (geneticRows.length > 0) {
      const { error } = await sb.from("context_genetic").insert(geneticRows);
      if (error) {
        throw new Error(`Failed to upsert genetic data: ${error.message}`);
      }
    }
  }
}

