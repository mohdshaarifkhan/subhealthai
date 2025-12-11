import type { ClinicalSpecialty } from '@/lib/dashboardViewData';

// Helper: format numbers with specified decimal places, handle null/undefined/NaN
export function formatNumber(n: number | null | undefined, digits = 0) {
  if (n === null || n === undefined || isNaN(n as number)) return '—';
  return (n as number).toFixed(digits);
}

// Helper: map specialty codes → human labels
export function specialtyLabel(s: ClinicalSpecialty): string {
  switch (s) {
    case "PrimaryCare":
      return "Primary care";
    case "Cardiology":
      return "Cardiology";
    case "Endocrinology":
      return "Endocrinology";
    case "Nephrology":
      return "Nephrology";
    case "Pulmonology":
      return "Pulmonology";
    case "SleepMedicine":
      return "Sleep medicine";
    default:
      return s;
  }
}

