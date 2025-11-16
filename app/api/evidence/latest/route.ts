import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("evidence_bundles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      {
        ok: false,
        message: "No evidence bundles registered yet.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    bundle: {
      id: data.id,
      created_at: data.created_at,
      label: data.label,
      engine_version: data.engine_version,
      export_zip_url: data.export_zip_url,
      metrics_csv_url: data.metrics_csv_url,
      risk_scores_csv_url: data.risk_scores_csv_url,
      shap_csv_url: data.shap_csv_url,
      reliability_csv_url: data.reliability_csv_url,
      volatility_csv_url: data.volatility_csv_url,
      plots_base_url: data.plots_base_url,
      notes: data.notes,
    },
  });
}


