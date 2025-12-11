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
    return NextResponse.json({
      devices: [
        {
          provider: 'oura',
          device_name: 'Oura Ring',
          status: 'connected',
          last_sync_at: new Date().toISOString(),
        },
      ],
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

  try {
    const { data, error } = await supabase
      .from("device_accounts")
      .select("provider, device_name, status, last_sync_at")
      .eq("user_id", userId);

    if (error) {
      console.error("Devices API error:", error);
      // Return empty array instead of error if table doesn't exist or query fails
      return NextResponse.json({ devices: [] });
    }

    return NextResponse.json({ devices: data ?? [] });
  } catch (err) {
    console.error("Devices API exception:", err);
    // Return empty array on any exception
    return NextResponse.json({ devices: [] });
  }
}

