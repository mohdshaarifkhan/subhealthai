import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function audit({
  action,
  details,
  user_id,
}: {
  action: string;
  details?: any;
  user_id?: string | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from("audit_log").insert({
      user_id: user_id || null,
      action: action,
      details: details || {},
    });
  } catch (error) {
    // Silently fail audit logging to prevent breaking the main flow
    console.error("[Audit] Failed to log:", error);
  }
}

