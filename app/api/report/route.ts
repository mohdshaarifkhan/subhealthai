import React from "react";
import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";

import ReportDoc from "@/components/report/ReportDoc";
import { getDashboard } from "@/lib/getDashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getMultimodalRiskForReport } from "@/lib/server/multimodalRisk";

export const runtime = "nodejs";

async function getDefaultUserId() {
  const { data, error } = await supabaseAdmin
    .from("risk_scores")
    .select("user_id, day")
    .order("day", { ascending: false })
    .limit(1);
  if (error) return undefined;
  return data?.[0]?.user_id as string | undefined;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { searchParams, origin } = url;

    let user = searchParams.get("user");
    if (!user) {
      user = await getDefaultUserId();
    }

    const version = searchParams.get("version") ?? "phase3-v1-wes";
    const label = searchParams.get("label") ?? undefined;

    if (!user) {
      return NextResponse.json({ error: "missing ?user" }, { status: 400 });
    }

    const data = await getDashboard({ user, version, origin });
    // Fetch multimodal patterns (non-diagnostic) to include in PDF
    let multimodal: any = null;
    try {
      if (user) {
        multimodal = await getMultimodalRiskForReport(user);
      }
    } catch {
      multimodal = null;
    }
    const stream = await renderToStream(
      ReportDoc({ data, userLabel: label, multimodal }) as unknown as React.ReactElement
    );

    return new NextResponse(stream as unknown as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="subhealthai_${user}_${version}.pdf"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "report failed" }, { status: 500 });
  }
}
