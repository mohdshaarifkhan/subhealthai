import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Optional: require admin auth here (session/role check). Skipped for demo.
  const { since } = await req.json().catch(() => ({ since: undefined }));

  const owner = "Shaarax";                     // <-- your GitHub user/org
  const repo  = "subhealthai";                 // <-- your repo
  const workflowFile = "risk-jobs.yml";        // .github/workflows/risk-jobs.yml

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GH_WORKFLOW_TOKEN!}`, // add this repo secret
        "Accept": "application/vnd.github+json",
      },
      body: JSON.stringify({
        ref: "main",
        // If you later add workflow inputs, put them here. For now we just dispatch.
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ ok: false, error: text }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: "Risk job dispatched." });
}
