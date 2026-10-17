import { createClient } from "@supabase/supabase-js";
import type { ClinicalCondition, DataSourceStatus } from "@/lib/dashboardViewData";

/**
 * Data-source status summary for the dashboard and Settings UI.
 *
 * Scope note (non-diagnostic positioning): this module previously called a
 * FastAPI service that scored population disease models (diabetes and
 * cardiovascular classifiers trained on public benchmark datasets) and returned
 * them as named "clinical conditions" with risk percentages. That is outside
 * SubHealthAI's non-diagnostic, research-only scope and has been removed.
 * `clinicalConditions` is kept in the return shape (always empty) so existing
 * UI and report consumers keep working without change.
 */
export async function getClinicalSummary(userId: string): Promise<{
  clinicalConditions: ClinicalCondition[];
  dataSources: DataSourceStatus;
  overallInstability: number;
  drivers: { factor: string; impact: string }[];
} | null> {
  // Service role client; userId is always resolved from the caller's session
  // by the route before this is invoked.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const [{ data: labsCore }, { data: latestVitals }, { data: metrics }, { data: allergiesLab }] =
    await Promise.all([
      supabase.from("labs_core").select("date").eq("user_id", userId).limit(1).maybeSingle(),
      supabase.from("vitals").select("taken_at").eq("user_id", userId).limit(1).maybeSingle(),
      supabase.from("metrics").select("day").eq("user_id", userId).limit(1),
      supabase.from("allergies_lab").select("id").eq("user_id", userId).limit(1).maybeSingle(),
    ]);

  const dataSources: DataSourceStatus = {
    samsungHealth: metrics && metrics.length ? "connected" : "not_connected",
    bloodwork: labsCore ? "uploaded" : "missing",
    allergyPanel: allergiesLab ? "uploaded" : "missing",
    vitals: latestVitals ? "derived" : "missing",
    chronicModels: "inactive",
  };

  return {
    clinicalConditions: [],
    dataSources,
    overallInstability: 0,
    drivers: [],
  };
}
