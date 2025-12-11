// app/api/clinical-summary/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getCurrentAppUserId } from "@/lib/getCurrentAppUserId";
import { getClinicalSummary } from "@/lib/clinicalSummary";

export async function GET() {
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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get app user_id (from users table, not auth user id)
  let userId: string;
  try {
    userId = await getCurrentAppUserId();
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to resolve app user" },
      { status: 401 }
    );
  }

  try {
    const summary = await getClinicalSummary(userId);
    if (!summary) {
      // Return empty/default summary instead of error to prevent breaking the UI
      return NextResponse.json({
        clinicalConditions: [],
        dataSources: {
          samsungHealth: "not_connected",
          bloodwork: "missing",
          allergyPanel: "missing",
          vitals: "missing",
          chronicModels: "inactive",
        },
        overallInstability: 0,
        drivers: [],
      });
    }

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Error in clinical-summary route:", error);
    // Return empty summary instead of error to prevent breaking the UI
    return NextResponse.json({
      clinicalConditions: [],
      dataSources: {
        samsungHealth: "not_connected",
        bloodwork: "missing",
        allergyPanel: "missing",
        vitals: "missing",
        chronicModels: "inactive",
      },
      overallInstability: 0,
      drivers: [],
    });
  }
}

