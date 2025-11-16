export const GUIDELINES: Record<string, string> = {
  rhr: "Typical adult 60–100 bpm (athletes can be lower).",
  hrv: "Use your personal baseline; absolute HRV varies widely.",
  sleep_debt: "Adults generally benefit from 7–9 hours of sleep.",
  forecast_delta: "≥7–8k steps/day is associated with better outcomes.",
};

export const GUIDELINE_TOOLTIPS: Record<string, string> = {
  rhr: "Resting heart rate — lower can indicate better recovery, but check personal norms.",
  hrv: "Heart rate variability — higher often signals better resilience and recovery.",
  sleep_debt: "Sleep duration vs. your baseline — sustained deficits can impact stability.",
  forecast_delta: "Daily steps compared with baseline — higher activity often supports stability.",
};

export function guidelineFor(key: string) {
  return GUIDELINES[key] ?? "";
}


