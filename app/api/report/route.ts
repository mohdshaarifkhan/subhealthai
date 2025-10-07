import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DEMO_USER_ID = "b2ea6462-6916-43d1-9c36-50d040ad8dc0"; // <- replace if needed

function toPct01(x: number) {
  return Math.round(Math.max(0, Math.min(1, x)) * 100);
}

function explainFromZ(z: Record<string, number> = {}) {
  const v = (k: string) => (Number.isFinite(z[k]) ? Number(z[k]) : 0);
  const out: string[] = [];

  const hrv = v("hrv_mean_z");
  out.push(
    hrv > 0.5
      ? "HRV higher than baseline (↑) — contributes to lower risk."
      : hrv < -0.5
      ? "HRV lower than baseline (↓) — contributes to higher risk."
      : "HRV near baseline — minimal effect."
  );

  const rhr = v("rhr_mean_z");
  out.push(
    rhr > 0.5
      ? "Resting Heart Rate higher than baseline (↑) — contributes to higher risk."
      : rhr < -0.5
      ? "Resting Heart Rate lower than baseline (↓) — contributes to lower risk."
      : "Resting Heart Rate near baseline — minimal effect."
  );

  const slp = v("sleep_hours_z");
  out.push(
    slp > 0.5
      ? "Sleep Duration higher than baseline (↑) — contributes to lower risk."
      : slp < -0.5
      ? "Sleep Duration lower than baseline (↓) — contributes to higher risk."
      : "Sleep Duration near baseline — minimal effect."
  );

  const stp = v("steps_z");
  out.push(
    stp > 0.5
      ? "Daily Steps higher than baseline (↑) — contributes to lower risk."
      : stp < -0.5
      ? "Daily Steps lower than baseline (↓) — contributes to higher risk."
      : "Daily Steps near baseline — minimal effect."
  );

  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user") || DEMO_USER_ID;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1) Latest baseline risk row
  const { data: latest, error: riskErr } = await supabase
    .from("risk_scores")
    .select("day,risk_score,model_version,features")
    .eq("user_id", userId)
    .like("model_version", "baseline%")
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (riskErr) {
    return NextResponse.json({ error: riskErr.message }, { status: 500 });
  }

  // 2) Latest explainability image up to that day
  let imageUrl: string | undefined;
  if (latest?.day) {
    const { data: imgRow } = await supabase
      .from("explainability_images")
      .select("img_url,day")
      .eq("user_id", userId)
      .lte("day", latest.day)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle();
    imageUrl = imgRow?.img_url;
  }

  // Build PDF
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 50;

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = height - margin;

  // Header
  page.drawText("SubHealthAI — Weekly Report (Demo)", {
    x: margin,
    y,
    size: 18,
    font: bold,
    color: rgb(0, 0, 0),
  });
  y -= 28;

  // AI Risk Section
  page.drawText("AI Risk (non-diagnostic)", {
    x: margin,
    y,
    size: 14,
    font: bold,
  });
  y -= 16;

  const riskPct = latest ? toPct01(latest.risk_score) : undefined;
  const model = latest?.model_version ?? "—";
  const day = latest?.day ?? "—";

  const line = (label: string, value: string) => {
    page.drawText(`${label}:`, { x: margin, y, size: 11, font: bold });
    page.drawText(` ${value}`, { x: margin + 60, y, size: 11, font });
    y -= 14;
  };

  line("Date", day);
  line("Model", model);
  line("Risk", riskPct !== undefined ? `${riskPct}%` : "—");

  // Reasons
  y -= 6;
  page.drawText("Why this score?", { x: margin, y, size: 12, font: bold });
  y -= 16;

  let reasons: string[] = [];
  try {
    const feats =
      typeof latest?.features === "string"
        ? JSON.parse(latest!.features)
        : latest?.features;
    reasons = explainFromZ(feats?.z ?? {});
  } catch {
    reasons = ["No feature deviations available."];
  }

  const bullet = "• ";
  const wrap = (text: string, maxWidth: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      const width = font.widthOfTextAtSize(test, 11);
      if (width > maxWidth) {
        if (cur) lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const maxTextWidth = width - margin * 2 - 10;
  for (const r of reasons) {
    const lines = wrap(r, maxTextWidth);
    page.drawText(bullet + lines[0], { x: margin, y, size: 11, font });
    y -= 14;
    for (let i = 1; i < lines.length; i++) {
      page.drawText("  " + lines[i], { x: margin, y, size: 11, font });
      y -= 14;
    }
  }

  // Explainability image (if any)
  if (imageUrl) {
    y -= 10;
    page.drawText("Explainability plot:", {
      x: margin,
      y,
      size: 11,
      font: bold,
    });
    y -= 8;

    try {
      const imgResp = await fetch(imageUrl);
      const bytes = new Uint8Array(await imgResp.arrayBuffer());
      // Try PNG first, fall back to JPEG
      let embedded;
      try {
        embedded = await pdf.embedPng(bytes);
      } catch {
        embedded = await pdf.embedJpg(bytes);
      }
      const imgW = Math.min(500, embedded.width);
      const scale = imgW / embedded.width;
      const imgH = embedded.height * scale;
      const drawY = Math.max(margin + 40, y - imgH);
      page.drawImage(embedded, {
        x: margin,
        y: drawY,
        width: imgW,
        height: imgH,
      });
      y = drawY - 12;
    } catch {
      page.drawText("(image unavailable)", { x: margin, y, size: 11, font });
      y -= 14;
    }
  }

  // Disclaimer
  y = Math.max(y, 80);
  page.drawLine({
    start: { x: margin, y: 70 },
    end: { x: width - margin, y: 70 },
    color: rgb(0.8, 0.8, 0.8),
    thickness: 0.5,
  });
  page.drawText(
    "Non-diagnostic AI indicator intended for preventive context and clinician discussion only.",
    { x: margin, y: 55, size: 9, font, color: rgb(0.2, 0.2, 0.2) }
  );

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="subhealthai_report.pdf"`,
    },
  });
}
