import { z } from "zod";

export const LabItem = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  crp: z.number().nullable().optional(),
  hba1c: z.number().nullable().optional(),
  vit_d: z.number().nullable().optional(),
  ldl: z.number().nullable().optional(),
  hdl: z.number().nullable().optional(),
  source: z.enum(["manual","user_upload","fhir"]).default("manual")
});

export const LabsPayload = z.object({ labs: z.array(LabItem).min(1) });

export const SleepItem = z.object({
  date: z.string(),
  duration_min: z.number().int().nonnegative(),
  bedtime: z.string().optional(),
  waketime: z.string().optional()
});

export const WorkoutItem = z.object({
  start: z.string(),
  type: z.enum(["strength","cardio","mixed","other"]),
  minutes: z.number().int().positive(),
  rpe: z.number().min(1).max(10).optional()
});

export const LifestylePayload = z.object({
  sleep: z.array(SleepItem).optional(),
  workouts: z.array(WorkoutItem).optional(),
});

export const AllergyItem = z.object({ substance: z.string(), reaction: z.string().optional(), severity: z.string().optional() });

export const MedItem = z.object({ name: z.string(), dose: z.string().optional(), frequency: z.string().optional(), start_date: z.string().optional(), end_date: z.string().optional() });

export const FamHxItem = z.object({ condition: z.string(), relation: z.string(), age_of_onset: z.number().int().optional() });

export const GeneticItem = z.object({ marker: z.string(), variant: z.string(), evidence_level: z.enum(["low","moderate","high"]).optional() });

export const ContextPayload = z.object({
  allergies: z.array(AllergyItem).optional(),
  medications: z.array(MedItem).optional(),
  family_history: z.array(FamHxItem).optional(),
  genetic: z.array(GeneticItem).optional()
});

