import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ version: string }> }
) {
  try {
    const { version } = await params;
    const { searchParams } = new URL(req.url);
    let segment = searchParams.get("segment") || "all";
    const day = searchParams.get("day");
    
    // Support ?day=YYYY-MM-DD as an alias for segment=day:YYYY-MM-DD
    if (day && segment === "all") {
      segment = `day:${day}`;
    }

    // Use service role to bypass RLS if needed
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch overall metrics from evaluation_cache
    const { data: overall, error: overallError } = await supabase
      .from("evaluation_cache")
      .select("*")
      .eq("version", version)
      .eq("segment", segment)
      .maybeSingle();

    if (overallError) {
      console.error("Error fetching overall metrics:", overallError);
      return NextResponse.json(
        { error: `Failed to fetch overall metrics: ${overallError.message}` },
        { status: 500 }
      );
    }

    if (!overall) {
      return NextResponse.json(
        { error: `No metrics found for version ${version} and segment ${segment}` },
        { status: 404 }
      );
    }

    // Fetch reliability bins
    const { data: reliability, error: reliabilityError } = await supabase
      .from("eval_reliability")
      .select("bin, pred, obs, n")
      .eq("version", version)
      .eq("segment", segment)
      .order("bin", { ascending: true });

    if (reliabilityError) {
      console.error("Error fetching reliability:", reliabilityError);
      // Continue without reliability data
    }

    // Fetch volatility series
    const { data: volatility_series, error: volatilityError } = await supabase
      .from("eval_volatility_series")
      .select("day, mean_delta")
      .eq("version", version)
      .eq("segment", segment)
      .order("day", { ascending: true });

    if (volatilityError) {
      console.error("Error fetching volatility series:", volatilityError);
      // Continue without volatility data
    }

    // Fetch lead time histogram
    const { data: lead_time_hist, error: leadTimeError } = await supabase
      .from("eval_lead_hist")
      .select("days, count")
      .eq("version", version)
      .eq("segment", segment)
      .order("days", { ascending: true });

    if (leadTimeError) {
      console.error("Error fetching lead time histogram:", leadTimeError);
      // Continue without lead time data
    }

    // Fetch SHAP global
    const { data: shap_global, error: shapError } = await supabase
      .from("eval_shap_global")
      .select("feature, mean_abs_shap")
      .eq("version", version)
      .eq("segment", segment)
      .order("mean_abs_shap", { ascending: false });

    if (shapError) {
      console.error("Error fetching SHAP global:", shapError);
      // Continue without SHAP data
    }

    // Build response matching UI data contract
    const response = {
      overall: {
        brier: overall.brier,
        ece: overall.ece,
        volatility: overall.volatility,
        lead_time_days_mean: overall.lead_time_days_mean,
        lead_time_days_p90: overall.lead_time_days_p90,
        n_users: overall.n_users,
        n_days: overall.n_days,
      },
      reliability: reliability ?? [],
      volatility_series: volatility_series ?? [],
      lead_time_hist: lead_time_hist ?? [],
      shap_global: shap_global ?? [],
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=60" },
    });
  } catch (error: any) {
    console.error("Error in eval metrics endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

