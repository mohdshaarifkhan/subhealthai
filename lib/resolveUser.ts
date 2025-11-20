import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveUserId(raw?: string | null) {
  if (!raw) {
    throw new Error("User ID or email required. Provide a user identifier.");
  }

  // If it's already a valid UUID, return it
  if (UUID_RE.test(raw)) return raw;

  // Otherwise, try to resolve from email
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


