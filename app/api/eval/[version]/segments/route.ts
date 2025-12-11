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

    // Use service role to bypass RLS if needed
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch distinct segments for this version from evaluation_cache
    const { data, error } = await supabase
      .from("evaluation_cache")
      .select("segment")
      .eq("version", version);

    if (error) {
      console.error("Error fetching segments:", error);
      return NextResponse.json(
        { error: `Failed to fetch segments: ${error.message}` },
        { status: 500 }
      );
    }

    // Extract unique segments
    const segments = data
      ? [...new Set(data.map((row) => row.segment))].sort()
      : ["all"];

    return NextResponse.json(segments, {
      headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=60" },
    });
  } catch (error: any) {
    console.error("Error in eval segments endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

