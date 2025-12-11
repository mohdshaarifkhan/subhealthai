import { NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";

import ReportDoc from "@/components/report/ReportDoc";
import { DEMO_PROFILES } from "@/lib/dashboardViewData";
import { getCurrentAppUserId } from "@/lib/getCurrentAppUserId";
import { loadDashboardViewData } from "@/lib/dashboardLoader";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // "demo-healthy" | "demo-risk" | null
  const user = searchParams.get("user"); // Support user parameter as well
  const label = searchParams.get("label") ?? undefined;
  const version = searchParams.get("version") || "phase3-v1-wes";

  // Determine if this is a demo user
  const isDemoHealthy = mode === "demo-healthy" || user === "demo-healthy";
  const isDemoRisk = mode === "demo-risk" || user === "demo-risk";
  const demoMode = isDemoHealthy ? "demo-healthy" : (isDemoRisk ? "demo-risk" : null);

  // 1) DEMO PATH
  if (demoMode) {
    const demoData = DEMO_PROFILES[demoMode];

    const stream = await renderToStream(
      ReportDoc({
        data: demoData,
        userLabel:
          label ??
          (demoMode === "demo-healthy" ? "Demo: Nominal" : "Demo: High Drift"),
        version: version,
        multimodal: null,
      }) as unknown as React.ReactElement,
    );

    return new NextResponse(
      stream as unknown as ReadableStream<Uint8Array>,
      {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="subhealthai_${demoMode}_${version}.pdf"`,
        },
      },
    );
  }

  // 2) REAL USER PATH – use user parameter if provided, otherwise get from session
  try {
    let appUserId: string;
    if (user && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user)) {
      // Valid UUID provided as user parameter
      appUserId = user;
    } else {
      // Try to get from session
      appUserId = await getCurrentAppUserId();
    }
    const data = await loadDashboardViewData(appUserId);

    const stream = await renderToStream(
      ReportDoc({
        data,
        userLabel: label ?? "SubHealthAI Profile",
        version: version,
        multimodal: null,
      }) as unknown as React.ReactElement,
    );

    return new NextResponse(
      stream as unknown as ReadableStream<Uint8Array>,
      {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="subhealthai_me_${version}.pdf"`,
        },
      },
    );
  } catch (err) {
    console.error("PDF export error", err);
    return new NextResponse("Unauthorized or user record missing", {
      status: 401,
    });
  }
}
