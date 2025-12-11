import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { resolveUserId } from "@/lib/resolveUser";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userParam = searchParams.get("user_id");

  if (!userParam) {
    return NextResponse.json({ error: "missing user_id" }, { status: 400 });
  }

  // Handle demo users
  if (userParam === 'demo-healthy' || userParam === 'demo-risk') {
    const isRisk = userParam === 'demo-risk';
    return NextResponse.json({
      snapshot: isRisk ? {
        symptoms: ['Daytime Fatigue', 'Brain Fog', 'Mild Joint Pain'],
        updated_at: new Date().toISOString(),
      } : {
        symptoms: [],
        updated_at: new Date().toISOString(),
      },
    });
  }

  // Resolve user_id (supports both email and UUID)
  let userId: string;
  try {
    userId = await resolveUserId(userParam);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

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
          // no-op in route handlers
        },
        remove(name: string, options: any) {
          // no-op in route handlers
        },
      },
    }
  );

  const { data, error } = await supabase
    .from("allergies_symptom")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ snapshot: data?.[0] ?? null });
}

