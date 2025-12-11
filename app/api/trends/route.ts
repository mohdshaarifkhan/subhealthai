import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userParam = searchParams.get("user");

  // Handle demo users
  if (userParam === "demo-healthy" || userParam === "demo-risk") {
    const isRisk = userParam === "demo-risk";
    const days = Number(searchParams.get("days") || 7);
    const rows = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().slice(0, 10);
      
      if (isRisk) {
        rows.push({
          day,
          steps: 4000 + Math.random() * 1000,
          sleep_min: 330 + Math.random() * 60,
          hr_avg: 75 + Math.random() * 10,
          hrv_avg: 40 + Math.random() * 10,
          rhr: 65 + Math.random() * 8,
        });
      } else {
        rows.push({
          day,
          steps: 12000 + Math.random() * 2000,
          sleep_min: 450 + Math.random() * 60,
          hr_avg: 55 + Math.random() * 8,
          hrv_avg: 110 + Math.random() * 15,
          rhr: 45 + Math.random() * 6,
        });
      }
    }

    return NextResponse.json({
      user: userParam,
      days,
      series: {
        steps: rows.map((r) => ({ x: r.day, y: r.steps })),
        sleep_minutes: rows.map((r) => ({ x: r.day, y: r.sleep_min })),
        hrv_avg: rows.map((r) => ({ x: r.day, y: r.hrv_avg })),
        rhr: rows.map((r) => ({ x: r.day, y: r.rhr })),
      },
      table: rows,
    });
  }

  let user: string;
  try {
    user = await resolveUserId(userParam);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const days = Number(searchParams.get("days") || 7);
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("metrics")
    .select("day, steps, sleep_minutes, hr_avg, hrv_avg, rhr")
    .eq("user_id", user)
    .gte("day", since)
    .order("day", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows =
    data?.map((r) => ({
      day: r.day,
      steps: r.steps ?? null,
      sleep_min: r.sleep_minutes ?? null,
      hr_avg: r.hr_avg ?? null,
      hrv_avg: r.hrv_avg ?? null,
      rhr: r.rhr ?? null,
    })) ?? [];

  return NextResponse.json({
    user,
    days,
    series: {
      steps: rows.map((r) => ({ x: r.day, y: r.steps })),
      sleep_minutes: rows.map((r) => ({ x: r.day, y: r.sleep_min })),
      hrv_avg: rows.map((r) => ({ x: r.day, y: r.hrv_avg })),
      rhr: rows.map((r) => ({ x: r.day, y: r.rhr })),
    },
    table: rows,
  });
}


