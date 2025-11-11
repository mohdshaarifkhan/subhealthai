import { NextResponse } from "next/server";

import { getAnomaly } from "@/lib/copilot/toolsRunner";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { user, version = "phase3-v1-wes" } = await req.json();

    if (!user) {
      return NextResponse.json({ error: "missing user" }, { status: 400 });
    }

    const anomaly = await getAnomaly({ user });

    const summary = anomaly?.summary ?? "No anomaly summary available.";
    const entries = anomaly?.entries ?? [];

    const text = [
      `User: ${user}`,
      `Version: ${version}`,
      "",
      summary,
      "",
      ...entries.map(
        (entry: any) =>
          `${entry.signal ?? entry.feature ?? "metric"} — z=${entry.z_score?.toFixed?.(2) ?? "n/a"}`
      ),
      "",
      "— Non-diagnostic, for preventive context.",
    ].join("\n");

    return NextResponse.json({ answer: text, refs: anomaly });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "copilot error" }, { status: 500 });
  }
}


