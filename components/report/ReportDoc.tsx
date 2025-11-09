import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { DashboardData } from "@/lib/getDashboard";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1f2933",
    lineHeight: 1.35,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    borderBottomStyle: "solid",
    paddingBottom: 12,
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 10,
    color: "#6b7280",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 6,
    padding: 12,
    minWidth: 200,
    flexGrow: 1,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    color: "#374151",
  },
  label: {
    fontSize: 10,
    color: "#6b7280",
  },
  value: {
    fontSize: 12,
    fontWeight: 700,
    color: "#111827",
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    borderBottomStyle: "solid",
  },
  tableCell: {
    fontSize: 9,
    flexGrow: 1,
  },
  bulletList: {
    marginTop: 6,
    gap: 4,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  bulletSymbol: {
    fontSize: 10,
    lineHeight: 1.6,
    color: "#2563eb",
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  disclaimer: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
    paddingTop: 10,
  },
});

const SIGNAL_LABEL: Record<DashboardData["anomaly"]["items"][number]["signal"], string> = {
  rhr: "Resting Heart Rate",
  hrv: "Heart Rate Variability",
  sleep: "Sleep Duration",
  steps: "Daily Steps",
};

const SIGNAL_GOAL: Record<DashboardData["anomaly"]["items"][number]["signal"], "higher" | "lower"> =
  {
    rhr: "lower",
    hrv: "higher",
    sleep: "higher",
    steps: "higher",
  };

function formatPercent(value?: number) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function formatZ(z: number | null) {
  if (z == null || Number.isNaN(z)) return "—";
  return `${z >= 0 ? "+" : ""}${z.toFixed(1)}`;
}

function describeAnomaly(signal: DashboardData["anomaly"]["items"][number], day?: string) {
  const label = SIGNAL_LABEL[signal.signal];
  if (signal.z == null) {
    return `${label} is near the individual's baseline.`;
  }
  const direction = signal.z > 0 ? "higher" : "lower";
  const magnitude =
    Math.abs(signal.z) >= 2
      ? "significantly"
      : Math.abs(signal.z) >= 1
      ? "moderately"
      : "slightly";
  const beneficial = SIGNAL_GOAL[signal.signal] === "higher";
  const trendPositive = (signal.z > 0 && beneficial) || (signal.z < 0 && !beneficial);
  const impact = trendPositive ? "supports lower risk." : "may contribute to elevated risk.";
  return `${label} is ${magnitude} ${direction} than baseline (${formatZ(signal.z)} z) on ${
    day ?? "the latest day"
  } and ${impact}`;
}

function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function chunkSeries<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export default function ReportDoc({
  data,
  userLabel,
}: {
  data: DashboardData;
  userLabel?: string;
}) {
  const riskPercent = data.forecast.latest?.risk ?? null;
  const anomalyDay = data.anomaly.day;
  const reliabilityPoints = data.eval.reliability.points ?? [];
  const volatilityPoints = data.eval.volatility.points ?? [];

  const displayUser =
    userLabel?.trim() ||
    data.user ||
    (data.forecast.latest?.day ? `User (${data.forecast.latest.day})` : "Unknown user");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>SubHealthAI — Weekly Preventive Insight</Text>
          <Text style={styles.subtitle}>
            {displayUser} · Model version: {data.version}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Risk (non-diagnostic)</Text>
          <View style={styles.row}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Latest Risk</Text>
              <Text style={styles.value}>{formatPercent(riskPercent)}</Text>
              <Text style={styles.label}>
                Forecast date: {formatDate(data.forecast.latest?.day)}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Risk Stability</Text>
              <Text style={styles.value}>
                {formatPercent(
                  data.forecast.series.length
                    ? data.forecast.series[data.forecast.series.length - 1].risk
                    : null
                )}
              </Text>
              <Text style={styles.label}>{data.forecast.series.length} day trend</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Reliability (ECE)</Text>
              <Text style={styles.value}>
                {data.eval.reliability.ece != null
                  ? `${(data.eval.reliability.ece * 100).toFixed(1)}%`
                  : "—"}
              </Text>
              <Text style={styles.label}>Lower is better</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why this risk?</Text>
          <View style={styles.bulletList}>
            {data.anomaly.items.length ? (
              data.anomaly.items.map((item) => (
                <View key={item.signal} style={styles.bulletItem}>
                  <Text style={styles.bulletSymbol}>•</Text>
                  <Text style={styles.bulletText}>{describeAnomaly(item, anomalyDay)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.bulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>No anomaly signals available for this period.</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Forecast trail</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flexBasis: "50%" }]}>Day</Text>
              <Text style={[styles.tableCell, { flexBasis: "50%" }]}>Risk</Text>
            </View>
            {chunkSeries(data.forecast.series, 1).map(([point], idx) => (
              <View key={`${point.day}-${idx}`} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flexBasis: "50%" }]}>{formatDate(point.day)}</Text>
                <Text style={[styles.tableCell, { flexBasis: "50%" }]}>
                  {formatPercent(point.risk)}
                </Text>
              </View>
            ))}
            {data.forecast.series.length === 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>No forecast history.</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model evaluation</Text>

          <View style={styles.row}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Reliability bins</Text>
              <View style={[styles.table, { marginTop: 6 }]}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, { flexBasis: "25%" }]}>Bin</Text>
                  <Text style={[styles.tableCell, { flexBasis: "25%" }]}>Pred</Text>
                  <Text style={[styles.tableCell, { flexBasis: "25%" }]}>Obs</Text>
                  <Text style={[styles.tableCell, { flexBasis: "25%" }]}>N</Text>
                </View>
                {reliabilityPoints.length ? (
                  reliabilityPoints.map((pt) => (
                    <View key={pt.bin} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flexBasis: "25%" }]}>{pt.bin}</Text>
                      <Text style={[styles.tableCell, { flexBasis: "25%" }]}>
                        {(pt.pred * 100).toFixed(0)}%
                      </Text>
                      <Text style={[styles.tableCell, { flexBasis: "25%" }]}>
                        {(pt.obs * 100).toFixed(0)}%
                      </Text>
                      <Text style={[styles.tableCell, { flexBasis: "25%" }]}>{pt.n}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>No reliability data available.</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Volatility trail</Text>
              <Text style={styles.label}>
                Stability index:{" "}
                {data.eval.volatility.stability != null
                  ? data.eval.volatility.stability.toFixed(3)
                  : "—"}
              </Text>
              <View style={[styles.table, { marginTop: 6 }]}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, { flexBasis: "60%" }]}>Day</Text>
                  <Text style={[styles.tableCell, { flexBasis: "40%" }]}>Mean Δ</Text>
                </View>
                {volatilityPoints.length ? (
                  volatilityPoints.map((pt) => (
                    <View key={pt.day} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flexBasis: "60%" }]}>
                        {formatDate(pt.day)}
                      </Text>
                      <Text style={[styles.tableCell, { flexBasis: "40%" }]}>
                        {pt.mean_delta.toFixed(3)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>No volatility measurements recorded.</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          Non-diagnostic signal intended for clinician-guided preventive care discussions. Do not use
          for medical decision-making without expert oversight.
        </Text>
      </Page>
    </Document>
  );
}

