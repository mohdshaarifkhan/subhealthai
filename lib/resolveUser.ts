import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveUserId(raw?: string | null) {
  if (!raw || raw === "demo") {
    const { data, error } = await supabaseAdmin
      .from("risk_scores")
      .select("user_id")
      .order("day", { ascending: false })
      .limit(1);

    if (error || !data?.[0]) {
      throw new Error("No demo user available.");
    }

    return data[0].user_id as string;
  }

  if (UUID_RE.test(raw)) return raw;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", raw)
    .single();

  if (error || !data?.id) {
    throw new Error("Cannot resolve user from email.");
  }

  return data.id as string;
}


