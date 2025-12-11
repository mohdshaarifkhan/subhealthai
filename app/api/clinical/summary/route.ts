// app/api/clinical/summary/route.ts

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { buildClinicalInputs } from "@/lib/clinicalInputs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sb = createClient(supabaseUrl, supabaseAnonKey);

// Point this to your running FastAPI
const CLINICAL_API_BASE =
  process.env.CLINICAL_API_BASE ?? "http://127.0.0.1:8000";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const inputs = await buildClinicalInputs(userId);
    if (!inputs) {
      return NextResponse.json(
        { error: "Missing labs/profile for clinical risk" },
        { status: 409 }
      );
    }

    // Call FastAPI clinical engine
    const resp = await fetch(`${CLINICAL_API_BASE}/predict/clinical_risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: "Clinical backend error", detail: text },
        { status: 502 }
      );
    }

    const payload = await resp.json() as {
      analysis: {
        diabetes_risk_percent: number;
        cardio_risk_percent: number;
        overall_instability_score: number;
      };
      drivers: { factor: string; impact: string }[];
      status: string;
    };

    const today = new Date().toISOString().slice(0, 10);

    // Upsert condition_risk rows for diabetes and cardio
    await sb.from("condition_risk").upsert([
      {
        user_id: userId,
        date: today,
        condition: "metabolic_diabetes",
        risk_index: payload.analysis.diabetes_risk_percent,
        risk_tier: tierFromPercent(payload.analysis.diabetes_risk_percent),
        reasons: payload.drivers,
      },
      {
        user_id: userId,
        date: today,
        condition: "cardio_atherosclerotic",
        risk_index: payload.analysis.cardio_risk_percent,
        risk_tier: tierFromPercent(payload.analysis.cardio_risk_percent),
        reasons: payload.drivers,
      },
    ]);

    return NextResponse.json(
      {
        ...payload.analysis,
        drivers: payload.drivers,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[clinical/summary]", err);
    return NextResponse.json(
      { error: "Unexpected error", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

function tierFromPercent(p: number): string {
  if (p >= 70) return "HIGH";
  if (p >= 40) return "MODERATE";
  return "LOW";
}

