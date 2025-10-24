import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET() {
  const userId = "c1454b12-cd49-4ae7-8f4d-f261dcda3136";
  
  // Check if table exists and what data is there
  const { data, error } = await supabaseAdmin
    .from("explainability_images")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    success: !error,
    error: error?.message,
    rowCount: data?.length || 0,
    data: data,
  });
}

