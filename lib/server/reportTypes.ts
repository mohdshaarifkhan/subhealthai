import type { ConditionRisk } from "@/lib/risk/types";

export type ReportPdfProps = {
  userId: string;
  riskSummary: any; // existing type in your codebase
  shapSummary: any; // existing type in your codebase
  metricsTable: any; // 7-day metrics type in your codebase
  multimodal: {
    overall: { overall_index: number; overall_tier: "low" | "moderate" | "high" };
    conditions: ConditionRisk[];
    disclaimer: string;
  };
  auditInfo: {
    report_id: string;
    generated_at_iso: string;
    engine_version: string;
  };
};


