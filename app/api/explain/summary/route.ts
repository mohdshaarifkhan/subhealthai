import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { SHAP_DISPLAY } from "@/lib/shapMap";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Row = { feature: string; shap_value: number; direction: "pos" | "neg" };

function arrowFor(value: number) {
  return value >= 0 ? "↑" : "↓";
}

function pretty(feature: string) {
  return SHAP_DISPLAY[feature]?.label ?? feature;
}

function sentence(rows: Row[]) {
  if (!rows.length) return "No clear contributing factors today.";

  const inc = rows
    .filter((row) => row.shap_value > 0)
    .map((row) => `${pretty(row.feature)} ${arrowFor(row.shap_value)}`);
  const dec = rows
    .filter((row) => row.shap_value < 0)
    .map((row) => `${pretty(row.feature)} ${arrowFor(row.shap_value)}`);

  if (inc.length && dec.length) {
    return `${inc.join(" and ")} increased risk; ${dec.join(" and ")} reduced it.`;
  }

  if (inc.length) return `${inc.join(" and ")} increased risk.`;
  if (dec.length) return `${dec.join(" and ")} reduced risk.`;
  return "No clear contributing factors today.";
}

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;

  let user: string;
  try {
    user = await resolveUserId(searchParams.get("user"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const version = searchParams.get("version") ?? "phase3-v1-wes";

  const { data: latestDay, error: dayError } = await supabaseAdmin
    .from("risk_scores")
    .select("day")
    .eq("user_id", user)
    .eq("model_version", version)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dayError) {
    return NextResponse.json({ error: dayError.message }, { status: 500 });
  }

  const day = latestDay?.day;
  if (!day) {
    return NextResponse.json({ user, version, day: null, summary: "No risk day found for this version.", top_contributors: [] });
  }

  let rows: Row[] = [];

  try {
    const { data: mvRows, error: mvError } = await supabaseAdmin
      .from("mv_explain_top4")
      .select("feature, shap_value, direction, rnk, day")
      .eq("user_id", user)
      .eq("model_version", version)
      .lte("day", day)
      .order("day", { ascending: false })
      .order("rnk", { ascending: true })
      .limit(4);

    if (mvError && mvError.code !== "42P01") {
      throw mvError;
    }

    if (mvRows?.length) {
      rows = mvRows.map((row: any) => ({
        feature: row.feature,
        shap_value: Number(row.shap_value ?? row.value ?? 0),
        direction: (row.direction as "pos" | "neg") ?? (Number(row.shap_value ?? row.value ?? 0) >= 0 ? "pos" : "neg"),
      }));
    }
  } catch {
    rows = [];
  }

  if (!rows.length) {
    const { data: rawRows, error: rawError } = await supabaseAdmin
      .from("explain_contribs")
      .select("feature, value, day")
      .eq("user_id", user)
      .eq("model_version", version)
      .lte("day", day)
      .order("day", { ascending: false })
      .limit(50);

    if (rawError) {
      return NextResponse.json({ error: rawError.message }, { status: 500 });
    }

    const latestExplainDay = rawRows?.[0]?.day;
    const sameDay = (rawRows ?? [])
      .filter((entry) => entry.day === latestExplainDay)
      .sort((a, b) => Math.abs(Number(b.value)) - Math.abs(Number(a.value)))
      .slice(0, 4);

    rows = sameDay.map((entry) => ({
      feature: entry.feature,
      shap_value: Number(entry.value),
      direction: Number(entry.value) >= 0 ? "pos" : "neg",
    }));
  }

  const summary = sentence(rows);

  void supabaseAdmin
    .from("audit_log")
    .insert({
      user_id: user,
      action: "explain_summary",
      details: { version, day, n: rows.length, top: rows },
    })
    .then()
    .catch(() => undefined);

  return NextResponse.json(
    {
      user,
      version,
      day,
      top_contributors: rows.map((row) => ({
        feature: row.feature,
        label: pretty(row.feature),
        shap_value: row.shap_value,
        arrow: arrowFor(row.shap_value),
        effect: row.shap_value >= 0 ? "increases" : "reduces",
      })),
      summary,
      tips: [
        "Positive SHAP increases risk; negative SHAP reduces it.",
        "Risk is compared to your own baseline, not other people.",
      ],
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      },
    }
  );
}
