import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("evidence_bundles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Evidence API] Database error:', error);
      return NextResponse.json(
        {
          ok: false,
          message: "Error fetching evidence bundles.",
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      // Return 200 with ok: false instead of 404, so the frontend can handle it gracefully
      return NextResponse.json(
        {
          ok: false,
          message: "No evidence bundles registered yet.",
        },
        { status: 200 }
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
  } catch (err: any) {
    console.error('[Evidence API] Unexpected error:', err);
    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error.",
        error: err?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


