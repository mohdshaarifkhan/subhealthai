import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ContribRow = { feature: string; value: number; day: string };

const PRETTY: Record<string, string> = {
  rhr: "Resting HR",
  hrv_avg: "HRV",
  sleep_minutes: "Sleep minutes",
  steps: "Steps",
  stress_proxy: "Stress proxy",
};

const nice = (f: string) => PRETTY[f] || f;

function makeRationale(items: Array<{ feature: string; value: number }>) {
  if (!items.length) return "No clear contributing factors today.";
  const up = items.filter((x) => x.value >= 0).map((x) => nice(x.feature));
  const dn = items.filter((x) => x.value < 0).map((x) => nice(x.feature));
  const upStr = up.length ? `${up.join(" & ")} increased your risk` : "";
  const dnStr = dn.length ? `${dn.join(" & ")} reduced it` : "";
  return [upStr, dnStr].filter(Boolean).join("; ") + ".";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version") || null;

  let user: string;
  try {
    user = await resolveUserId(searchParams.get("user"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let qDay = supabaseAdmin
    .from("risk_scores")
    .select("day")
    .eq("user_id", user)
    .order("day", { ascending: false })
    .limit(1);

  if (version) {
    qDay = qDay.eq("model_version", version);
  }

  const { data: d1, error: e1 } = await qDay;
  if (e1) {
    return NextResponse.json({ error: e1.message }, { status: 500 });
  }

  const anchorDay = d1?.[0]?.day;
  if (!anchorDay) {
    return NextResponse.json({ error: "no day available" }, { status: 404 });
  }

  async function fetchContribs(
    dayFilter: { op: "=" | "<="; day: string },
    withVersion: boolean
  ): Promise<ContribRow[]> {
    let q = supabaseAdmin
      .from("explain_contribs")
      .select("feature, value, day")
      .eq("user_id", user);

    if (dayFilter.op === "=") {
      q = q.eq("day", dayFilter.day);
    } else {
      q = q.lte("day", dayFilter.day).order("day", { ascending: false });
    }

    if (withVersion && version) {
      q = q.eq("model_version", version);
    }

    const { data, error } = await q.limit(200);
    if (error) {
      throw error;
    }

    return (data as ContribRow[]) ?? [];
  }

  let contribs: ContribRow[] = [];

  try {
    contribs = await fetchContribs({ op: "=", day: anchorDay }, true);

    if (!contribs.length) {
      contribs = await fetchContribs({ op: "<=", day: anchorDay }, true);
    }
    if (!contribs.length) {
      contribs = await fetchContribs({ op: "=", day: anchorDay }, false);
    }
    if (!contribs.length) {
      contribs = await fetchContribs({ op: "<=", day: anchorDay }, false);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load explainability data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!contribs.length) {
    return NextResponse.json({
      user,
      version,
      day: anchorDay,
      top_contributors: [],
      rationale: "No explainability available for this date/version yet.",
      tips: [
        "Positive value increases risk; negative value reduces risk.",
        "Risk is compared to your own baseline, not other people.",
      ],
    });
  }

  const finalDay = contribs[0].day;
  const sameDay = contribs.filter((x) => x.day === finalDay);

  const top = sameDay.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 4);
  const rational = makeRationale(top);

  void supabaseAdmin
    .from("audit_log")
    .insert({
      actor: "api/explain",
      action: "read",
      entity: "explain_contribs",
      meta: { user, model_version: version, day: finalDay },
    })
    .then()
    .catch(() => {});

  const payload = {
    user,
    version,
    day: finalDay,
    top_contributors: top.map((x) => ({ feature: x.feature, shap_value: x.value })),
    rationale: rational,
    tips: [
      "Positive value increases risk; negative value reduces risk.",
      "Risk is compared to your own baseline, not other people.",
    ],
  };

  return new NextResponse(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
    },
  });
}




