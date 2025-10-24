import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function getRiskSeries(userId: string) {
  const { data, error } = await supabaseAdmin()
    .from("risk_scores")
    .select("day,risk_score,model_version")
    .eq("user_id", userId)
    .order("day", { ascending: true });
  if (error) throw error;
  return data;
}
