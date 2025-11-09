import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const LABEL: Record<string, string> = {
  rhr: "RHR",
  hrv: "HRV",
  hrv_avg: "HRV",
  sleep: "Sleep",
  sleep_minutes: "Sleep",
  steps: "Steps",
  forecast_delta: "Forecast Δ",
};

const arrow = (x: number) => (x >= 0 ? "↑" : "↓");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  let user: string;
  try {
    user = await resolveUserId(searchParams.get("user"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const version = searchParams.get("version") ?? "phase3-v1-wes";

  const latest = await supabaseAdmin
    .from("explain_contribs")
    .select("day")
    .eq("user_id", user)
    .eq("model_version", version)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  const anchor = latest.data?.day;
  if (!anchor) {
    return NextResponse.json({ user, version, text: null, items: [] });
  }

  let items: Array<{ feature: string; value: number }> = [];

  const mv = await supabaseAdmin
    .from("mv_explain_top4")
    .select("contribs, day")
    .eq("user_id", user)
    .eq("model_version", version)
    .lte("day", anchor)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mv.data?.contribs?.length) {
    items = (mv.data.contribs as Array<{ feature: string; value: number }>).
      slice(0, 4)
      .map((c) => ({ feature: c.feature, value: Number(c.value) }));
  } else {
    const raw = await supabaseAdmin
      .from("explain_contribs")
      .select("feature, value, day")
      .eq("user_id", user)
      .eq("model_version", version)
      .lte("day", anchor)
      .order("day", { ascending: false })
      .limit(50);

    if (raw.error) {
      return NextResponse.json({ error: raw.error.message }, { status: 500 });
    }

    const day0 = raw.data?.[0]?.day;
    const sameDay = (raw.data ?? [])
      .filter((entry) => entry.day === day0)
      .sort((a, b) => Math.abs(Number(b.value)) - Math.abs(Number(a.value)));

    items = sameDay.slice(0, 4).map((entry) => ({ feature: entry.feature as string, value: Number(entry.value) }));
  }

  if (!items.length) {
    return NextResponse.json({ user, version, text: null, items: [] });
  }

  const pos = items.filter((i) => Number(i.value) > 0).map((i) => LABEL[i.feature] ?? i.feature);
  const neg = items.filter((i) => Number(i.value) < 0).map((i) => LABEL[i.feature] ?? i.feature);

  let text: string;
  if (pos.length && neg.length) {
    text = `Today, ${pos.join(" and ")} increased risk; ${neg.join(" and ")} reduced it.`;
  } else if (pos.length) {
    text = `Today, ${pos.join(" and ")} increased risk.`;
  } else {
    text = `Today, ${neg.join(" and ")} reduced risk.`;
  }

  const payload = {
    user,
    version,
    items: items.map((item) => ({
      feature: LABEL[item.feature] ?? item.feature,
      value: Number(item.value),
      dir: arrow(Number(item.value)),
    })),
    text,
  };

  return new NextResponse(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
    },
  });
}
