import { z } from "zod";

export const ProfileSchema = z.object({
  age_years: z.number().int().min(10).max(120).optional(),
  sex_at_birth: z.enum(["male","female","intersex","other"]).optional(),
  height_cm: z.number().min(80).max(230).optional(),
  weight_kg: z.number().min(30).max(250).optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  primary_goal: z.enum(["metabolic","cardio","inflammation","recovery","general"]).optional()
});

export const LabsCoreSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  fasting_glucose_mg_dl: z.number().nullable().optional(),
  hba1c_percent: z.number().nullable().optional(),
  bun_mg_dl: z.number().nullable().optional(),
  creatinine_mg_dl: z.number().nullable().optional(),
  egfr_ml_min_1_73: z.number().nullable().optional(),

  chol_total_mg_dl: z.number().nullable().optional(),
  hdl_mg_dl: z.number().nullable().optional(),
  ldl_mg_dl: z.number().nullable().optional(),
  trig_mg_dl: z.number().nullable().optional(),

  alt_u_l: z.number().nullable().optional(),
  ast_u_l: z.number().nullable().optional(),
  alk_phos_u_l: z.number().nullable().optional(),

  tsh_ulU_ml: z.number().nullable().optional(),
  vitd_25oh_ng_ml: z.number().nullable().optional(),

  is_fasting: z.boolean().optional()
});

export const VitalsSchema = z.object({
  taken_at: z.string(), // ISO
  systolic_mm_hg: z.number().int().nullable().optional(),
  diastolic_mm_hg: z.number().int().nullable().optional(),
  heart_rate_bpm: z.number().int().nullable().optional(),
  temperature_c: z.number().nullable().optional(),
  spo2_percent: z.number().nullable().optional(),
  height_cm: z.number().nullable().optional(),
  weight_kg: z.number().nullable().optional(),
  bmi: z.number().nullable().optional()
});

export const AllergyLabSchema = z.object({
  date: z.string(),
  test_name: z.string(),
  system_code: z.string().optional(),
  igE_kU_L: z.number().nullable().optional(),
  class: z.number().int().min(0).max(6).nullable().optional(),
  lab_name: z.string().optional()
});

export const AllergySymptomSchema = z.object({
  has_sneezing: z.boolean().optional(),
  has_itchy_eyes: z.boolean().optional(),
  has_nasal_congestion: z.boolean().optional(),
  has_rash: z.boolean().optional(),
  has_hives: z.boolean().optional(),
  has_eczema: z.boolean().optional(),
  has_wheezing: z.boolean().optional(),
  triggers: z.array(z.string()).optional(),
  frequency: z.enum(["rarely","sometimes","often","daily"]).optional(),
  seasonality: z.array(z.string()).optional(),
  severity: z.enum(["mild","moderate","strong"]).optional(),
  notes: z.string().optional()
});

export const LifestyleProfileSchema = z.object({
  sleep_hours_workdays: z.number().nullable().optional(),
  sleep_hours_weekends: z.number().nullable().optional(),
  activity_level: z.enum(["low","medium","high"]).optional(),
  work_pattern: z.enum(["day","night_shift","rotating"]).optional(),
  smoker_status: z.enum(["never","former","current"]).optional(),
  alcohol_per_week: z.number().int().nullable().optional(),
  stress_level: z.enum(["low","moderate","high"]).optional()
});

export const FamilyHistoryItemSchema = z.object({
  relation: z.string(),
  condition: z.string(),
  age_of_onset: z.number().int().nullable().optional(),
  notes: z.string().optional()
});


