import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the current default version from model_registry
  const { data: reg } = await sb
    .from("model_registry")
    .select("version")
    .eq("is_default", true)
    .maybeSingle();

  const version = reg?.version ?? "phase3-v1-wes";

  // Fetch overall metrics from evaluation_cache
  const { data, error } = await sb
    .from("evaluation_cache")
    .select("brier,ece,volatility,lead_time_days_mean,lead_time_days_p90,n_users,n_days")
    .eq("version", version)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "No metrics for current version" },
      { status: 404 }
    );
  }

  // Fetch the arrays too
  const [rel, vol, lead, shap] = await Promise.all([
    sb
      .from("eval_reliability")
      .select("bin,pred,obs,n")
      .eq("version", version)
      .order("bin"),
    sb
      .from("eval_volatility_series")
      .select("day,mean_delta")
      .eq("version", version)
      .order("day"),
    sb
      .from("eval_lead_hist")
      .select("days,count")
      .eq("version", version)
      .order("days"),
    sb
      .from("eval_shap_global")
      .select("feature,mean_abs_shap")
      .eq("version", version)
      .order("mean_abs_shap", { ascending: false }),
  ]);

  return NextResponse.json(
    {
      version,
      overall: data,
      reliability: rel.data ?? [],
      volatility_series: vol.data ?? [],
      lead_time_hist: lead.data ?? [],
      shap_global: shap.data ?? [],
    },
    {
      headers: {
        "Cache-Control": "s-maxage=15, stale-while-revalidate=60",
      },
    }
  );
}

