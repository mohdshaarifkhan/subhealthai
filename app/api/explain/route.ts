import { NextResponse } from "next/server";

import { resolveUserId } from "@/lib/resolveUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ContribRow = { 
  feature: string; 
  value: number | null; 
  day: string;
  delta_raw: number;
  sign: '+' | '-';
  risk: number | null;
};

const PRETTY: Record<string, string> = {
  rhr: "Resting HR",
  hrv_avg: "HRV",
  sleep_minutes: "Sleep minutes",
  steps: "Steps",
  stress_proxy: "Stress proxy",
  "HRV vs Baseline": "HRV vs Baseline",
  "Rest Days (7d)": "Rest Days (7d)",
  "Deep Sleep (hrs)": "Deep Sleep (hrs)",
  "Training Load": "Training Load",
  "Caffeine Timing": "Caffeine Timing",
};

const nice = (f: string) => PRETTY[f] || f;

function makeRationale(items: Array<{ feature: string; delta_raw: number }>) {
  if (!items.length) return "No clear contributing factors today.";
  const up = items.filter((x) => x.delta_raw >= 0).map((x) => nice(x.feature));
  const dn = items.filter((x) => x.delta_raw < 0).map((x) => nice(x.feature));
  const upStr = up.length ? `${up.join(" & ")} increased your risk` : "";
  const dnStr = dn.length ? `${dn.join(" & ")} reduced it` : "";
  return [upStr, dnStr].filter(Boolean).join("; ") + ".";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const version = searchParams.get("version") || null;
  const userParam = searchParams.get("user");

  // Handle demo users
  if (userParam === "demo-healthy" || userParam === "demo-risk") {
    const isRisk = userParam === "demo-risk";
    const demoDrivers = isRisk
      ? [
          { feature: "Deep Sleep (hrs)", delta_raw: 8.0, sign: '+' as const, value: 1.8, risk: 17.0 },
          { feature: "Training Load", delta_raw: 5.0, sign: '+' as const, value: 0.7, risk: 17.0 },
          { feature: "Sleep Timing", delta_raw: 4.0, sign: '+' as const, value: 1.0, risk: 17.0 },
          { feature: "HRV vs Baseline", delta_raw: 4.0, sign: '+' as const, value: 3.0, risk: 17.0 },
          { feature: "Rest Days (7d)", delta_raw: 3.0, sign: '+' as const, value: 1.0, risk: 17.0 },
          { feature: "Caffeine Timing", delta_raw: 3.0, sign: '+' as const, value: 1.0, risk: 17.0 },
        ]
      : [
          { feature: "HRV vs Baseline", delta_raw: -8.0, sign: '-' as const, value: 5.0, risk: 12.0 },
          { feature: "Deep Sleep (hrs)", delta_raw: -5.0, sign: '-' as const, value: 2.2, risk: 12.0 },
          { feature: "Rest Days (7d)", delta_raw: 2.0, sign: '+' as const, value: 2.0, risk: 12.0 },
          { feature: "Training Load", delta_raw: 1.0, sign: '+' as const, value: 0.5, risk: 12.0 },
        ];

    const today = new Date().toISOString().slice(0, 10);
    return NextResponse.json({
      date: today,
      model_version: version || 'phase3-v1-wes',
      drivers: demoDrivers,
    });
  }

  let user: string;
  try {
    user = await resolveUserId(userParam);
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
    return NextResponse.json({ 
      error: "No risk scores available for this user",
      message: "Risk scores have not been computed yet. Please ensure metrics data exists and risk computation has run.",
      user 
    }, { status: 404 });
  }

  async function fetchContribs(
    dayFilter: { op: "=" | "<="; day: string },
    withVersion: boolean
  ): Promise<ContribRow[]> {
    let q = supabaseAdmin
      .from("explain_contribs")
      .select("feature, value, day, delta_raw, sign, risk")
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
      date: anchorDay,
      model_version: version || 'phase3-v1-wes',
      drivers: [],
    });
  }

  const finalDay = contribs[0].day;
  const sameDay = contribs.filter((x) => x.day === finalDay);

  // Sort by absolute delta_raw and take top 5-6 drivers
  const top = sameDay
    .sort((a, b) => Math.abs(Number(b.delta_raw) || 0) - Math.abs(Number(a.delta_raw) || 0))
    .slice(0, 6);

  // Fire and forget audit log for explainability access
  const auditPromise = supabaseAdmin
    .from("audit_log")
    .insert({
      user_id: user,
      action: "VIEW_EXPLAINABILITY",
      details: {
        day: finalDay,
        version: version || 'phase3-v1-wes',
        driver_count: top.length,
        message: "Accessed SHAP detail panel",
      },
    });
  
  // Fire and forget - handle promise properly
  Promise.resolve(auditPromise).catch(() => {});

  const payload = {
    date: finalDay,
    model_version: version || 'phase3-v1-wes',
    drivers: top.map((x) => {
      const deltaRaw = Number(x.delta_raw) || 0;
      const sign = (x.sign === '+' || x.sign === '-') ? x.sign : (deltaRaw >= 0 ? '+' : '-') as '+' | '-';
      
      console.log('[Explain API] Feature:', x.feature, 'delta_raw:', deltaRaw, 'sign:', sign);
      
      return {
        feature: x.feature,
        delta_raw: deltaRaw, // This can be negative!
        sign: sign,
        value: x.value != null ? Number(x.value) : null,
        risk: x.risk != null ? Number(x.risk) : null,
      };
    }),
  };

  return new NextResponse(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
    },
  });
}




