import React from "react";
import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";

import ReportDoc from "@/components/report/ReportDoc";
import { getDashboard } from "@/lib/getDashboard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { searchParams, origin } = url;

    const user = searchParams.get("user");
    const version = searchParams.get("version") ?? "phase3-v1-wes";
    const label = searchParams.get("label") ?? undefined;

    if (!user) {
      return NextResponse.json({ error: "missing ?user" }, { status: 400 });
    }

    const data = await getDashboard({ user, version, origin });
    const stream = await renderToStream(
      ReportDoc({ data, userLabel: label }) as unknown as React.ReactElement
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
