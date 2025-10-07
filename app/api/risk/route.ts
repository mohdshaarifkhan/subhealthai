import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user");
  if (!user) return NextResponse.json({ error: "missing user" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("risk_scores")
    .select("day,risk_score,model_version")
    .eq("user_id", user)
    .order("day", { ascending: true })
    .limit(90);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
