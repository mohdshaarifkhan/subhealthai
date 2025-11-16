export type LabsCore = {
  fasting_glucose_mg_dl?: number | null;
  hba1c_percent?: number | null;
  bun_mg_dl?: number | null;
  creatinine_mg_dl?: number | null;
  egfr_ml_min_1_73?: number | null;
  chol_total_mg_dl?: number | null;
  hdl_mg_dl?: number | null;
  ldl_mg_dl?: number | null;
  trig_mg_dl?: number | null;
  alt_u_l?: number | null;
  ast_u_l?: number | null;
  alk_phos_u_l?: number | null;
  tsh_ulU_ml?: number | null;
  vitd_25oh_ng_ml?: number | null;
};

export type VitalsSnapshot = {
  systolic_mm_hg?: number | null;
  diastolic_mm_hg?: number | null;
  heart_rate_bpm?: number | null;
  spo2_percent?: number | null;
  bmi?: number | null;
};

export type LifestyleProfile = {
  sleep_hours_workdays?: number | null;
  activity_level?: "low" | "medium" | "high" | null;
  smoker_status?: "never" | "former" | "current" | null;
  stress_level?: "low" | "moderate" | "high" | null;
};

export type AllergySummary = {
  igE_total_kU_L?: number | null;      // from allergies_lab, if available
  strong_sensitizers?: string[];       // names of allergens with class>=3
  symptom_score?: number | null;       // 0..1 from allergies_symptom
};

export type FamilyHistorySummary = {
  has_diabetes?: boolean;
  has_cvd?: boolean;
  has_ckd?: boolean;
  has_autoimmune?: boolean;
};

export type WearableSummary = {
  avg_rhr?: number | null;             // resting HR (last 30d)
  avg_hrv?: number | null;             // ms (last 30d)
  sleep_debt_hours?: number | null;    // last 7d vs target
  activity_minutes?: number | null;    // last 7d moderate+vigorous
};

export type ConditionRisk = {
  condition:
    | "prediabetes"
    | "kidney_function"
    | "metabolic_strain"
    | "thyroid"
    | "cardio_pattern"
    | "inflammatory_load"
    | "allergy_burden"
    | "autonomic_recovery";
  index: number;                       // 0..1
  tier: "low" | "moderate" | "high";
  reasons: string[];
  dataSources: string[];               // ['labs','wearable','lifestyle',...]
};

export type MultimodalContext = {
  labs?: LabsCore | null;
  vitals?: VitalsSnapshot | null;
  lifestyle?: (LifestyleProfile & {
    meds_json?: any;
    supplements_json?: any;
  }) | null;
  allergies?: AllergySummary | null;
  family?: FamilyHistorySummary | null;
  wearable?: WearableSummary | null;
  age_years?: number | null;
  sex_at_birth?: string | null;
};


