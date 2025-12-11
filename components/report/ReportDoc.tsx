import React from "react";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import {
  DashboardViewData,
  ClinicalSpecialty,
} from "@/lib/dashboardViewData";

// ----------------- Styles -----------------

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 10,
    color: "#555",
    marginTop: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: "#555",
    marginBottom: 6,
  },
  summarySection: {
    marginTop: 12,
    padding: 10,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#ccc",
  },
  scoreRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  scoreBlock: {
    flex: 0.8,
    marginRight: 8,
    padding: 10,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#ddd",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6,
  },
  scoreStatus: {
    fontSize: 10,
    marginTop: 0,
  },
  scoreContextBlock: {
    flex: 1.2,
    padding: 8,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#eee",
    justifyContent: "center",
  },
  scoreContextLabel: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 2,
  },
  scoreContextValue: {
    fontSize: 9,
  },
  narrativeText: {
    fontSize: 9,
    marginTop: 4,
  },
  bulletList: {
    marginTop: 4,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bulletSymbol: {
    width: 10,
    fontSize: 9,
  },
  bulletText: {
    fontSize: 9,
    flex: 1,
  },
  vitalsRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  vitalBlock: {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#ddd",
    marginRight: 4,
  },
  vitalLabel: {
    fontSize: 9,
    color: "#555",
  },
  vitalValue: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
  },
  sleepRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  sleepBlock: {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#ddd",
    marginRight: 4,
  },
  sleepLabel: {
    fontSize: 9,
    color: "#555",
  },
  sleepValue: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
  },
  driftRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  driftBlock: {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#ddd",
    marginRight: 4,
  },
  driftLabel: {
    fontSize: 9,
    color: "#555",
  },
  driftValue: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
  },
  table: {
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: "#ccc",
    borderRadius: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 9,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  tableCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 9,
  },
  modelStatsRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  modelStatBlock: {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#ddd",
    marginRight: 4,
  },
  modelStatLabel: {
    fontSize: 9,
    color: "#555",
  },
  modelStatValue: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 8,
    color: "#777",
    marginTop: 18,
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 6,
  },
  row: {
    flexDirection: "row",
    marginTop: 8,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
  },
  value: {
    fontSize: 12,
    fontWeight: "bold",
  },
  muted: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  bullet: {
    fontSize: 9,
    marginTop: 3,
    marginLeft: 0,
  },
});

// ----------------- Helpers -----------------

const isDashboardViewData = (data: any): data is DashboardViewData => {
  return (
    data &&
    typeof data.instabilityScore === "number" &&
    Array.isArray(data.drivers)
  );
};

const specialtyLabel = (s: ClinicalSpecialty): string => {
  switch (s) {
    case "PrimaryCare":
      return "Primary care / internal medicine";
    case "Cardiology":
      return "Cardiology";
    case "Endocrinology":
      return "Endocrinology";
    case "Nephrology":
      return "Nephrology";
    case "Pulmonology":
      return "Pulmonology / respiratory medicine";
    case "SleepMedicine":
      return "Sleep medicine";
    default:
      return s;
  }
};

const extractSpecialties = (data: DashboardViewData): string[] => {
  const set = new Set<string>();
  for (const d of data.drivers || []) {
    if (d.specialties) {
      for (const sp of d.specialties) {
        set.add(specialtyLabel(sp));
      }
    }
  }
  return Array.from(set);
};

// ----------------- Component -----------------

type ReportDocProps = {
  data: any;
  userLabel?: string;
  version?: string;
  multimodal?: any;
  clinicalConditions?: Array<{
    name: string;
    shortName: string;
    riskPercent: number;
    riskTier: "Low" | "Moderate" | "High";
    modelId: string;
    dataSource: string;
    notes?: string;
  }>;
};

export default function ReportDoc({ data, userLabel, version, multimodal, clinicalConditions }: ReportDocProps) {
  const isViewData = isDashboardViewData(data);

  // ========== DEMO / DASHBOARDVIEWDATA PATH ==========

  if (isViewData) {
    const displayUser = userLabel?.trim() || "Demo Profile";
    const modelVersion = version || "phase3-v1-wes";
    const riskPercent = data.instabilityScore;
    const specialties = extractSpecialties(data);

    return (
      <Document>
        {/* PAGE 1 — SUMMARY */}
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>SubHealthAI — Preventive Insight Report</Text>
            <Text style={styles.subtitle}>
              {displayUser} · Engine: {modelVersion} · Environment: DEMO
            </Text>
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>
              INSTABILITY SUMMARY (NON-DIAGNOSTIC)
            </Text>
            <Text style={styles.sectionSubtitle}>
              Latest Instability risk vs personal baseline
            </Text>

            <View style={styles.scoreRow}>
              <View style={styles.scoreBlock}>
                <Text style={styles.scoreValue}>{riskPercent}%</Text>
                <Text style={styles.scoreStatus}>Status: {data.status}</Text>
              </View>
              <View style={styles.scoreContextBlock}>
                <Text style={styles.scoreContextLabel}>Relative to baseline</Text>
                <Text style={styles.scoreContextValue}>
                  {riskPercent < 20
                    ? "Within expected stable band."
                    : riskPercent < 60
                    ? "Moderately elevated vs 28-day baseline."
                    : "Markedly elevated vs 28-day baseline."}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Narrative</Text>
            <Text style={styles.narrativeText}>{data.narrative}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Contributors (SHAP)</Text>
            <Text style={styles.sectionSubtitle}>
              Features that pushed today&apos;s Instability Score up or down
            </Text>

            <View style={styles.bulletList}>
              {data.drivers.map((driver, idx) => {
                const direction =
                  driver.impact > 0 ? "↑ Instability" : "↓ Instability";
                const domain = driver.domain ? ` · Domain: ${driver.domain}` : "";
                const specLabels = driver.specialties
                  ? driver.specialties.map(specialtyLabel).join(", ")
                  : "";

                return (
                  <View key={idx} style={styles.bulletItem}>
                    <Text style={styles.bulletSymbol}>
                      {driver.impact > 0 ? "↑" : "↓"}
                    </Text>
                    <Text style={styles.bulletText}>
                      {driver.name} – {driver.value} ({direction}
                      {domain}
                      {specLabels ? ` · Relevant: ${specLabels}` : ""})
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={styles.disclaimer}>
            Research prototype. Non-diagnostic. Not FDA-cleared. Do not use as
            sole basis for clinical decision-making.
          </Text>
        </Page>

        {/* PAGE 2 — VITALS & SLEEP */}
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Autonomic & Sleep Profile</Text>
            <Text style={styles.subtitle}>
              Wearable-derived vitals and sleep architecture (demo)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Core Vitals (Today)</Text>
            <View style={styles.vitalsRow}>
              <View style={styles.vitalBlock}>
                <Text style={styles.vitalLabel}>HRV (rmssd)</Text>
                <Text style={styles.vitalValue}>{data.vitals.hrv} ms</Text>
              </View>
              <View style={styles.vitalBlock}>
                <Text style={styles.vitalLabel}>Resting Heart Rate</Text>
                <Text style={styles.vitalValue}>{data.vitals.rhr} bpm</Text>
              </View>
              <View style={styles.vitalBlock}>
                <Text style={styles.vitalLabel}>Respiratory Rate</Text>
                <Text style={styles.vitalValue}>{data.vitals.resp} rpm</Text>
              </View>
              <View style={styles.vitalBlock}>
                <Text style={styles.vitalLabel}>Skin Temperature</Text>
                <Text style={styles.vitalValue}>{data.vitals.temp} °F</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sleep Architecture (Last Night)</Text>
            <Text style={styles.sectionSubtitle}>
              Distribution of time across sleep stages (demo values)
            </Text>

            <View style={styles.sleepRow}>
              <View style={styles.sleepBlock}>
                <Text style={styles.sleepLabel}>Deep</Text>
                <Text style={styles.sleepValue}>{data.sleep.deep.toFixed(1)} h</Text>
              </View>
              <View style={styles.sleepBlock}>
                <Text style={styles.sleepLabel}>REM</Text>
                <Text style={styles.sleepValue}>{data.sleep.rem.toFixed(1)} h</Text>
              </View>
              <View style={styles.sleepBlock}>
                <Text style={styles.sleepLabel}>Light</Text>
                <Text style={styles.sleepValue}>{data.sleep.light.toFixed(1)} h</Text>
              </View>
              <View style={styles.sleepBlock}>
                <Text style={styles.sleepLabel}>Awake</Text>
                <Text style={styles.sleepValue}>{data.sleep.awake.toFixed(1)} h</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subclinical Drift (Categories)</Text>
            <View style={styles.driftRow}>
              <View style={styles.driftBlock}>
                <Text style={styles.driftLabel}>Metabolic</Text>
                <Text style={styles.driftValue}>{data.drift.metabolic}</Text>
              </View>
              <View style={styles.driftBlock}>
                <Text style={styles.driftLabel}>Cardiovascular</Text>
                <Text style={styles.driftValue}>{data.drift.cardio}</Text>
              </View>
              <View style={styles.driftBlock}>
                <Text style={styles.driftLabel}>Inflammatory</Text>
                <Text style={styles.driftValue}>{data.drift.inflammation}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            Non-diagnostic signal intended for clinician-guided preventive care
            discussions. Do not use for medical decision-making without expert
            oversight.
          </Text>
        </Page>

        {/* PAGE 3 — LABS, FORECAST, MODEL BEHAVIOR, ROUTING HINTS */}
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Biomarkers & Model Behavior</Text>
            <Text style={styles.subtitle}>
              Labs (demo), forecast, volatility and reliability (internal)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most Recent Lab Markers (Demo)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Marker</Text>
                <Text style={styles.tableHeaderCell}>Value</Text>
                <Text style={styles.tableHeaderCell}>Status</Text>
              </View>
              {data.labs.map((lab: any, idx: number) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{lab.name}</Text>
                  <Text style={styles.tableCell}>
                    {lab.value} {lab.unit}
                  </Text>
                  <Text style={styles.tableCell}>{lab.status}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Forecast & Model Stability (Demo)</Text>
            <Text style={styles.sectionSubtitle}>
              Summary statistics derived from internal validation (not clinical performance)
            </Text>

            <View style={styles.modelStatsRow}>
              <View style={styles.modelStatBlock}>
                <Text style={styles.modelStatLabel}>Instability Forecast (14 days)</Text>
                <Text style={styles.modelStatValue}>
                  {data.forecast && data.forecast.length > 0
                    ? `${Math.round(
                        data.forecast[data.forecast.length - 1].value
                      )}% at end of window`
                    : "Demo only"}
                </Text>
              </View>
              <View style={styles.modelStatBlock}>
                <Text style={styles.modelStatLabel}>Volatility Index (σ)</Text>
                <Text style={styles.modelStatValue}>
                  {data.volatilityIndex ?? "—"}
                </Text>
              </View>
              <View style={styles.modelStatBlock}>
                <Text style={styles.modelStatLabel}>Reliability Error (%)</Text>
                <Text style={styles.modelStatValue}>
                  {data.reliability != null ? `${data.reliability}%` : "—"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Clinical routing hints (non-diagnostic)
            </Text>
            <Text style={styles.sectionSubtitle}>
              Intended to help direct further evaluation; not a diagnosis
            </Text>

            {specialties.length === 0 ? (
              <Text style={styles.narrativeText}>
                No specific specialties highlighted in this demo profile. In
                real deployments, routing hints would be derived from the
                dominant domains and drivers contributing to Instability.
              </Text>
            ) : (
              <>
                <Text style={styles.narrativeText}>
                  Based on the current pattern of wearable signals and demo lab
                  markers, the following specialties may be most relevant for
                  clinician-guided review:
                </Text>
                <View style={styles.bulletList}>
                  {specialties.map((label, idx) => (
                    <View key={idx} style={styles.bulletItem}>
                      <Text style={styles.bulletSymbol}>•</Text>
                      <Text style={styles.bulletText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <Text style={styles.disclaimer}>
            Non-diagnostic signal intended for clinician-guided preventive care
            discussions. Do not use for medical decision-making without expert
            oversight. All demo values are synthetic and for illustration only.
          </Text>
        </Page>
      </Document>
    );
  }

  // ========== REAL USER / DB PATH ==========
  // Keep your existing implementation here that uses Supabase / multimodal payload.
  // For now, we return a simple placeholder to avoid crashes if called with unknown data.

  // Extract labs date if available
  const labsLatestDateString = data?.labs?.[0]?.date 
    ? new Date(data.labs[0].date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : "N/A";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>SubHealthAI — Preventive Insight Report</Text>
          <Text style={styles.subtitle}>
            Engine: {version || "phase3-v1-wes"} · Environment: LIVE
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical Chronic Risk Snapshot</Text>
          <Text style={styles.sectionSubtitle}>
            Non-diagnostic fusion of chronic disease models with your labs & vitals.
          </Text>

          {Array.isArray(clinicalConditions) && clinicalConditions.length > 0 ? (
            clinicalConditions.map((c, idx) => (
              <View key={idx} style={styles.row}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>{c.name}</Text>
                  <Text style={styles.muted}>
                    Model: {c.modelId} · Data: {c.dataSource}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.value}>{c.riskPercent.toFixed(1)}%</Text>
                  <Text style={styles.muted}>Tier: {c.riskTier}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>
              Chronic disease model outputs not available for this export.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verified Data Inputs</Text>
          <Text style={styles.sectionSubtitle}>
            Summary of the signals used to generate this report.
          </Text>

          <Text style={styles.bullet}>
            • Wearables: Samsung Health (HRV, resting HR, steps, sleep over last 28
            days)
          </Text>
          <Text style={styles.bullet}>
            • Bloodwork: Comprehensive panel dated {labsLatestDateString}
          </Text>
          <Text style={styles.bullet}>
            • Allergy Panel: Aeroallergen IgE profile (Quest Diagnostics)
          </Text>
          <Text style={styles.bullet}>
            • Demographics: Age, sex at birth, height, weight from user profile
          </Text>
          <Text style={styles.bullet}>
            • Engine: phase3-v1 — calibrated instability score and chronic risk models
            (Pima & Cleveland)
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          Research prototype. Non-diagnostic signal intended for clinician-guided
          preventive care discussions. Do not use as sole basis for medical
          decision-making without expert oversight.
        </Text>
      </Page>
    </Document>
  );
}
