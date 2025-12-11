import { NextResponse } from "next/server";

const CLINICAL_API_BASE = process.env.CLINICAL_API_BASE || "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(`${CLINICAL_API_BASE}/predict/clinical_risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Upstream clinical API failed", detail: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Clinical proxy error:", err);
    return NextResponse.json(
      { error: "Proxy error", detail: err?.message || "unknown" },
      { status: 500 }
    );
  }
}

