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
        hrv: isRisk ? [45, 42, 38, 35, 30, 25, 22][i] : [110, 112, 115, 118, 114, 115, 116][i],
        rhr: isRisk ? [72, 74, 76, 78, 80, 82, 84][i] : [58, 59, 58, 57, 58, 59, 58][i],
      })),
      current: {
        rhr: isRisk ? 84 : 58,
        hrv: isRisk ? 22 : 116,
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

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("metrics")
    .select("day, rhr, hrv_avg")
    .eq("user_id", userId)
    .gte("day", sevenDaysAgo)
    .order("day", { ascending: true });

  if (error) {
    console.error("vitals error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ trend: [], current: null });
  }

  const last = data[data.length - 1];

  return NextResponse.json({
    trend: data.map((d) => ({
      day: d.day,
      hrv: d.hrv_avg,
      rhr: d.rhr,
    })),
    current: {
      rhr: last.rhr,
      hrv: last.hrv_avg,
    },
  });
}

