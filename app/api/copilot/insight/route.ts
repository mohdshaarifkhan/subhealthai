export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { user_id?: string; day?: string };
    if (!body?.user_id || !body?.day) {
      return NextResponse.json({ error: "user_id and day required" }, { status: 400 });
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [m, s] = await Promise.all([
      sb
        .from("risk_scores")
        .select("risk_score")
        .eq("user_id", body.user_id)
        .eq("day", body.day)
        .maybeSingle(),
      sb
        .from("v_shap_topk")
        .select("feature,value")
        .eq("user_id", body.user_id)
        .eq("day", body.day),
    ]);

    if (m.error) return NextResponse.json({ error: m.error.message }, { status: 500 });
    if (s.error) return NextResponse.json({ error: s.error.message }, { status: 500 });

    const risk = m.data?.risk_score ?? null;
    const top = (s.data ?? []).sort(
      (a: any, b: any) => Math.abs(b.value) - Math.abs(a.value)
    );

    return NextResponse.json({
      risk,
      top_features: top.slice(0, 5),
      message:
        risk == null
          ? "No data."
          : `Risk=${risk.toFixed(2)}. Top drivers: ${top
              .slice(0, 3)
              .map((x: any) => `${x.feature}(${Number(x.value).toFixed(2)})`)
              .join(", " )}.`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "internal error" },
      { status: 500 }
    );
  }
}

