import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/resolveUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userParam = searchParams.get("user_id");

  if (!userParam) {
    return NextResponse.json({ error: "missing user_id" }, { status: 400 });
  }

  // Handle demo users
  if (userParam === 'demo-healthy' || userParam === 'demo-risk') {
    const isRisk = userParam === 'demo-risk';
    return NextResponse.json({
      labs: isRisk ? [
        { date: new Date().toISOString().slice(0, 10), test_name: 'HbA1c', value: 5.9, unit: '%', flag: 'HIGH', system: 'Metabolic' },
        { date: new Date().toISOString().slice(0, 10), test_name: 'HDL-C', value: 38, unit: 'mg/dL', flag: 'LOW', system: 'Lipid' },
        { date: new Date().toISOString().slice(0, 10), test_name: 'Triglycerides', value: 185, unit: 'mg/dL', flag: 'HIGH', system: 'Lipid' },
      ] : [
        { date: new Date().toISOString().slice(0, 10), test_name: 'HbA1c', value: 5.2, unit: '%', flag: 'NORMAL', system: 'Metabolic' },
        { date: new Date().toISOString().slice(0, 10), test_name: 'HDL-C', value: 62, unit: 'mg/dL', flag: 'NORMAL', system: 'Lipid' },
        { date: new Date().toISOString().slice(0, 10), test_name: 'Triglycerides', value: 95, unit: 'mg/dL', flag: 'NORMAL', system: 'Lipid' },
      ],
    });
  }

  // Resolve user_id (supports both email and UUID)
  let userId: string;
  try {
    userId = await resolveUserId(userParam);
    console.log("[Labs API] Resolved userId:", userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve user.";
    console.error("[Labs API] Error resolving user:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    // Use supabaseAdmin to bypass RLS policies
    // Select all lab columns from labs_core table
    const { data: labsRows, error } = await supabaseAdmin
      .from("labs_core")
      .select("date, fasting_glucose_mg_dl, hba1c_percent, bun_mg_dl, creatinine_mg_dl, egfr_ml_min_1_73, chol_total_mg_dl, hdl_mg_dl, ldl_mg_dl, trig_mg_dl, alt_u_l, ast_u_l, alk_phos_u_l, tsh_ulu_ml, vitd_25oh_ng_ml")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Labs API] Query error:", error);
      console.error("[Labs API] Query details - userId:", userId, "error code:", error.code, "error message:", error.message);
      return NextResponse.json({ error: error.message, labs: [] }, { status: 500 });
    }

    // Transform labs_core rows into the format expected by frontend
    // Each row can contain multiple lab tests, so we expand them into individual entries
    const transformedLabs: Array<{
      date: string;
      test_name: string;
      value: number;
      unit: string;
      flag: string;
      system: string;
    }> = [];

    if (labsRows && labsRows.length > 0) {
      labsRows.forEach((row: any) => {
        const date = row.date || new Date().toISOString().slice(0, 10);
        
        // Define lab test mappings: [column_name, test_name, unit, system, normal_range]
        const labTests = [
          ['fasting_glucose_mg_dl', 'Fasting Glucose', 'mg/dL', 'Metabolic', { low: 70, high: 100 }],
          ['hba1c_percent', 'HbA1c', '%', 'Metabolic', { low: 4.0, high: 5.6 }],
          ['bun_mg_dl', 'BUN', 'mg/dL', 'Renal', { low: 7, high: 20 }],
          ['creatinine_mg_dl', 'Creatinine', 'mg/dL', 'Renal', { low: 0.6, high: 1.2 }],
          ['egfr_ml_min_1_73', 'eGFR', 'mL/min/1.73m²', 'Renal', { low: 60, high: 120 }],
          ['chol_total_mg_dl', 'Total Cholesterol', 'mg/dL', 'Lipid', { low: 0, high: 200 }],
          ['hdl_mg_dl', 'HDL-C', 'mg/dL', 'Lipid', { low: 40, high: 100 }],
          ['ldl_mg_dl', 'LDL-C', 'mg/dL', 'Lipid', { low: 0, high: 100 }],
          ['trig_mg_dl', 'Triglycerides', 'mg/dL', 'Lipid', { low: 0, high: 150 }],
          ['alt_u_l', 'ALT', 'U/L', 'Hepatic', { low: 7, high: 56 }],
          ['ast_u_l', 'AST', 'U/L', 'Hepatic', { low: 10, high: 40 }],
          ['alk_phos_u_l', 'Alkaline Phosphatase', 'U/L', 'Hepatic', { low: 44, high: 147 }],
          ['tsh_ulu_ml', 'TSH', 'μIU/mL', 'Thyroid', { low: 0.4, high: 4.0 }],
          ['vitd_25oh_ng_ml', 'Vitamin D (25-OH)', 'ng/mL', 'Metabolic', { low: 30, high: 100 }],
        ];

        labTests.forEach(([colName, testName, unit, system, range]: any) => {
          const value = row[colName];
          if (value != null && typeof value === 'number' && !isNaN(value)) {
            // Determine flag based on reference range
            let flag = 'NORMAL';
            if (value < range.low) {
              flag = 'LOW';
            } else if (value > range.high) {
              flag = 'HIGH';
            }

            transformedLabs.push({
              date,
              test_name: testName,
              value: Number(value),
              unit,
              flag,
              system,
            });
          }
        });
      });
    }

    console.log("[Labs API] Query successful - found", labsRows?.length || 0, "lab panels, transformed to", transformedLabs.length, "individual tests for userId:", userId);
    return NextResponse.json({ labs: transformedLabs });
  } catch (err) {
    console.error("[Labs API] Exception:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage, labs: [] }, { status: 500 });
  }
}

