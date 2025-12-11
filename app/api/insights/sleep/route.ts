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
      trend: Array.from({ length: 7 }, (_, i) => ({
        day: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        sleep_hours: isRisk ? [6.5, 6.2, 5.8, 5.5, 5.2, 4.9, 4.5][i] : [7.5, 7.8, 8.0, 7.6, 7.9, 8.1, 7.7][i],
      })),
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

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("metrics")
    .select("day, sleep_minutes")
    .eq("user_id", userId)
    .gte("day", sevenDaysAgo)
    .order("day", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    trend: data?.map((d) => ({
      day: d.day,
      sleep_hours: d.sleep_minutes / 60.0,
    })) ?? [],
  });
}

