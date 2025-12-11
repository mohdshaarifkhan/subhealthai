import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { resolveUserId } from "@/lib/resolveUser";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  let userId: string;
  try {
    userId = await resolveUserId(searchParams.get("user"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    return NextResponse.json({ url: null, error: message }, { status: 400 });
  }

  // Use service role to bypass RLS
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from("explainability_images")
    .select("img_url, day, created_at")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Explainability fetch error:", error);
    return NextResponse.json({ url: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    url: data?.img_url ?? null,
    day: data?.day ?? null,
    created_at: data?.created_at ?? null
  });
}
