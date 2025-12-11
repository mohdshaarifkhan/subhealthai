/**
 * Canonical Dashboard View Data Structure
 * Used by both UI and PDF to ensure consistency
 */

export type ForecastPoint = {
  date: string;   // e.g., "Nov 22, 2025"
  value: number;  // percentage
};

export type VolatilityPoint = {
  date: string;   // e.g., "Nov 22, 2025"
  value: number | string; // mean σ
};

export type ReliabilityBin = {
  bin: number | string;   // e.g., 0, 0.1, ...
  pred: number;           // predicted %
  obs: number;            // observed %
  n: number;              // count
};

export type DriverDomain =
  | "Metabolic"
  | "Cardiovascular"
  | "Renal"
  | "Respiratory"
  | "Autonomic"
  | "Inflammation"
  | "Sleep"
  | "Lifestyle";

export type ClinicalSpecialty =
  | "PrimaryCare"
  | "Cardiology"
  | "Endocrinology"
  | "Nephrology"
  | "Pulmonology"
  | "SleepMedicine";

export type ClinicalCondition = {
  name: string;                 // "Type 2 Diabetes Risk"
  shortName: string;            // "Diabetes"
  riskPercent: number;          // e.g., 18.4
  riskTier: "Low" | "Moderate" | "High";
  modelId: string;              // "pima_diabetes_gb_v1"
  dataSource: string;           // "Pima Indians, UCI Cleveland"
  notes?: string;               // short clinician-facing note
};

export type DataSourceStatus = {
  samsungHealth: "connected" | "not_connected" | "error";
  bloodwork: "uploaded" | "missing" | "stale";
  allergyPanel: "uploaded" | "missing" | "stale";
  vitals: "derived" | "missing";
  chronicModels: "active" | "inactive";
};

/**
 * Per-day view model used by both UI and PDF
 */
export type DashboardViewData = {
  instabilityScore: number;
  status: "STABLE" | "ELEVATED" | "VOLATILE";
  narrative: string;
  vitals: { hrv: number; rhr: number; resp: number; temp: number };
  trends: { hrv: "up" | "down" | "stable"; rhr: "up" | "down" | "stable" };
  drivers: {
    name: string;
    impact: number;       // + increases Instability, – decreases it
    value: string;
    domain?: DriverDomain;
    specialties?: ClinicalSpecialty[];
  }[];
  drift: { metabolic: string; cardio: string; inflammation: string };
  sleep: { deep: number; rem: number; light: number; awake: number };
  labs: { name: string; value: string; unit: string; status: string }[];
  // PDF report fields
  forecast?: ForecastPoint[];
  volatilityIndex?: number | string;
  volatilityTrail?: VolatilityPoint[];
  reliabilityBins?: ReliabilityBin[];
  reliability?: number | string;
  // 🔹 NEW: clinical + source awareness
  clinicalConditions?: ClinicalCondition[];
  dataSources?: DataSourceStatus;
  hasForecast?: boolean;
};

// Helper to generate date strings for the last N days
const generateDateRange = (days: number): string[] => {
  const dates: string[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(`${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`);
  }
  return dates;
};

/**
 * Demo profiles matching MOCK_DATA semantics
 */
export const DEMO_PROFILES: Record<"demo-healthy" | "demo-risk", DashboardViewData> = {
  "demo-healthy": {
    instabilityScore: 12,
    status: "STABLE",
    narrative:
      "Autonomic load is low. Sleep and recovery are aligned with your 28-day baseline. Parasympathetic tone is dominant.",
    vitals: { hrv: 115, rhr: 48, resp: 14, temp: 98.2 },
    trends: { hrv: "up", rhr: "stable" },
    drivers: [
      {
        name: "Deep Sleep",
        impact: -15,
        value: "1.5 h",
        domain: "Sleep",
        specialties: ["PrimaryCare", "SleepMedicine"],
      },
      {
        name: "Training Load",
        impact: 5,
        value: "High",
        domain: "Lifestyle",
        specialties: ["PrimaryCare"],
      },
      {
        name: "Caffeine Timing",
        impact: 2,
        value: "Early in day",
        domain: "Lifestyle",
        specialties: ["PrimaryCare", "SleepMedicine"],
      },
    ],
    drift: { metabolic: "Low", cardio: "Low", inflammation: "Normal" },
    sleep: { deep: 1.8, rem: 2.1, light: 3.5, awake: 0.4 },
    labs: [
      { name: "hs-CRP", value: "0.5", unit: "mg/L", status: "Optimal" },
      { name: "Fasting Glucose", value: "85", unit: "mg/dL", status: "Optimal" },
      { name: "HbA1c", value: "5.1", unit: "%", status: "Optimal" },
    ],
    // PDF report fields
    forecast: generateDateRange(14).map((date, i) => ({
      date,
      value: 10 + Math.round(Math.sin(i / 2) * 3), // Stable around 10–13%
    })),
    volatilityIndex: "0.080",
    volatilityTrail: generateDateRange(14).map((date) => ({
      date,
      value: (0.075 + (Math.random() - 0.5) * 0.01).toFixed(3), // Low volatility around 0.08
    })),
    reliabilityBins: [
      { bin: "0.0", pred: 0, obs: 0, n: 120 },
      { bin: "0.1", pred: 10, obs: 9, n: 95 },
      { bin: "0.2", pred: 20, obs: 18, n: 88 },
      { bin: "0.3", pred: 30, obs: 28, n: 76 },
      { bin: "0.4", pred: 40, obs: 38, n: 65 },
      { bin: "0.5", pred: 50, obs: 48, n: 54 },
      { bin: "0.6", pred: 60, obs: 58, n: 42 },
      { bin: "0.7", pred: 70, obs: 68, n: 31 },
      { bin: "0.8", pred: 80, obs: 78, n: 22 },
      { bin: "0.9", pred: 90, obs: 88, n: 15 },
    ],
    reliability: "12.0",
  },

  "demo-risk": {
    instabilityScore: 84,
    status: "VOLATILE",
    narrative:
      "Suppressed HRV and elevated resting HR vs your 28-day baseline suggest ongoing subclinical stress. Sympathetic overdrive detected.",
    vitals: { hrv: 22, rhr: 68, resp: 18, temp: 99.1 },
    trends: { hrv: "down", rhr: "up" },
    drivers: [
      {
        name: "Deep Sleep Deficit",
        impact: 45,
        value: "0.4 h",
        domain: "Sleep",
        specialties: ["PrimaryCare", "SleepMedicine"],
      },
      {
        name: "hs-CRP",
        impact: 32,
        value: "3.2 mg/L",
        domain: "Inflammation",
        specialties: ["PrimaryCare", "Cardiology"],
      },
      {
        name: "Fasting Glucose",
        impact: 24,
        value: "104 mg/dL",
        domain: "Metabolic",
        specialties: ["PrimaryCare", "Endocrinology"],
      },
      {
        name: "Nocturnal Respiratory Burden",
        impact: 18,
        value: "Cough / wheeze cluster",
        domain: "Respiratory",
        specialties: ["PrimaryCare", "Pulmonology"],
      },
    ],
    drift: { metabolic: "Moderate", cardio: "Elevated", inflammation: "Elevated" },
    sleep: { deep: 0.4, rem: 1.1, light: 4.2, awake: 1.5 },
    labs: [
      { name: "hs-CRP", value: "3.2", unit: "mg/L", status: "High" },
      { name: "Fasting Glucose", value: "104", unit: "mg/dL", status: "Elevated" },
      { name: "HbA1c", value: "5.8", unit: "%", status: "Borderline" },
    ],
    // PDF report fields
    forecast: generateDateRange(14).map((date, i) => ({
      date,
      value: 78 + Math.round(Math.sin(i / 1.5) * 8), // Volatile around 70–86%
    })),
    volatilityIndex: "0.250",
    volatilityTrail: generateDateRange(14).map((date) => ({
      date,
      value: (0.245 + (Math.random() - 0.5) * 0.02).toFixed(3), // High volatility around 0.25
    })),
    reliabilityBins: [
      { bin: "0.0", pred: 0, obs: 2, n: 45 },
      { bin: "0.1", pred: 10, obs: 12, n: 38 },
      { bin: "0.2", pred: 20, obs: 25, n: 32 },
      { bin: "0.3", pred: 30, obs: 35, n: 28 },
      { bin: "0.4", pred: 40, obs: 48, n: 24 },
      { bin: "0.5", pred: 50, obs: 58, n: 20 },
      { bin: "0.6", pred: 60, obs: 68, n: 18 },
      { bin: "0.7", pred: 70, obs: 78, n: 15 },
      { bin: "0.8", pred: 80, obs: 88, n: 12 },
      { bin: "0.9", pred: 90, obs: 95, n: 8 },
    ],
    reliability: "18.5",
  },
};
