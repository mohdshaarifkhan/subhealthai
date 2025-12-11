import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

/**
 * Returns your canonical app user_id (from `users` table),
 * not the Supabase Auth user id.
 *
 * For you:
 *   auth user (supabase auth)    = d1c7…
 *   app user (users.id)          = bb13…
 */
export async function getCurrentAppUserId() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // No-op in route handlers (cookies are read-only)
        },
        remove(name: string, options: any) {
          // No-op in route handlers (cookies are read-only)
        },
      },
    }
  );

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("Not authenticated");
  }

  if (!authUser.email) {
    throw new Error("Authenticated user has no email");
  }

  // Map email -> app user_id (your medical record row)
  // ✅ This will be bb132981-... (not d1c7...)
  const { data: appUser, error: appError } = await supabase
    .from("users")
    .select("id, email, display_name")
    .eq("email", authUser.email)
    .single();

  if (appError || !appUser) {
    throw appError ?? new Error(`No app user row found for email ${authUser.email}`);
  }

  return appUser.id as string;
}

