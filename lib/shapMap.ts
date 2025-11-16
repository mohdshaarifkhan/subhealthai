export const SHAP_TO_DB: Record<
  string,
  {
    col: string;
    unit: string;
  }
> = {
  rhr: { col: "rhr", unit: "bpm" },
  hrv: { col: "hrv_avg", unit: "ms" },
  hrv_avg: { col: "hrv_avg", unit: "ms" },
  sleep_debt: { col: "sleep_minutes", unit: "min" },
  sleep_minutes: { col: "sleep_minutes", unit: "min" },
  forecast_delta: { col: "steps", unit: "steps" },
  steps: { col: "steps", unit: "steps" },
};

export type ShapKey = keyof typeof SHAP_TO_DB;

export function shapToColumn(key: string): string {
  return SHAP_TO_DB[key]?.col ?? key;
}

export function shapUnit(key: string): string {
  return SHAP_TO_DB[key]?.unit ?? "";
}


