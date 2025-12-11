// lib/resolveUser.ts

import { supabaseAdmin } from "@/lib/supabaseAdmin";

// UUID v4 regex pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveUserId(userParam: string | null | undefined) {
  if (!userParam) {
    throw new Error("User ID or email required. Provide a user identifier.");
  }

  // If it contains @, treat as email and resolve to UUID
  if (userParam.includes("@")) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", userParam.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("Error resolving user email:", error);
      throw new Error("Error resolving user email");
    }

    if (!data) {
      throw new Error(`User not found for email: ${userParam}`);
    }

    return data.id as string;
  }

  // Otherwise, validate it's a proper UUID format
  if (!UUID_RE.test(userParam)) {
    throw new Error(`Invalid user identifier: "${userParam}". Must be a valid UUID or email address.`);
  }

  // It's a valid UUID format, return it
  return userParam;
}


