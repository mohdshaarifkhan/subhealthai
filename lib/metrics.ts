export type MetricKey = "rhr" | "hrv_avg" | "sleep_minutes" | "steps";

export const METRIC_META: Record<
  MetricKey,
  {
    label: string;
    unit: string;
    guideline: string;
    direction: (z: number) => "risk" | "protective" | "neutral";
  }
> = {
  rhr: {
    label: "Resting HR",
    unit: "bpm",
    guideline: "Typical adult RHR ~60–100 bpm (lower often indicates better fitness).",
    direction: (z) => (z > 0.5 ? "risk" : z < -0.5 ? "protective" : "neutral"),
  },
  hrv_avg: {
    label: "HRV",
    unit: "ms",
    guideline: "Higher HRV generally reflects better recovery capacity.",
    direction: (z) => (z < -0.5 ? "risk" : z > 0.5 ? "protective" : "neutral"),
  },
  sleep_minutes: {
    label: "Sleep (min)",
    unit: "min",
    guideline: "Adults commonly target ~7–9 hours (420–540 min).",
    direction: (z) => (z < -0.5 ? "risk" : z > 0.5 ? "protective" : "neutral"),
  },
  steps: {
    label: "Steps",
    unit: "",
    guideline: "Higher activity is generally beneficial; context matters.",
    direction: (z) => (z < -0.5 ? "risk" : z > 0.5 ? "protective" : "neutral"),
  },
};

export function colorForDirection(dir: "risk" | "protective" | "neutral") {
  if (dir === "risk") return "border-red-300 bg-red-50";
  if (dir === "protective") return "border-emerald-300 bg-emerald-50";
  return "border-gray-200 bg-white";
}

export function chipForDirection(dir: "risk" | "protective" | "neutral") {
  if (dir === "risk") return "text-red-700 bg-red-100";
  if (dir === "protective") return "text-emerald-700 bg-emerald-100";
  return "text-gray-700 bg-gray-100";
}

export function fmtNum(x: number | null | undefined, digits = 1) {
  if (x == null || Number.isNaN(Number(x))) return "—";
  return Number(x).toFixed(digits);
}


