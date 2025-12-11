"use client";

import { supabase } from "@/lib/supabase";

/**
 * Client-side helper to get the current authenticated app user.
 * Maps Supabase Auth user (d1c7...) to app user (bb13...) from users table.
 * 
 * Returns the full app user object with id, email, display_name.
 */
export async function getCurrentAppUser() {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("Not authenticated");
  }

  if (!authUser.email) {
    throw new Error("Authenticated user has no email");
  }

  const { data: appUser, error: appError } = await supabase
    .from("users")
    .select("id, email, display_name")
    .eq("email", authUser.email)
    .single();

  if (appError || !appUser) {
    throw appError ?? new Error(`No app user row found for email ${authUser.email}`);
  }

  return appUser; // has .id = bb132981-... (not d1c7...)
}

