import type { DashboardData } from "./getDashboard";

/**
 * Demo dashboard snapshots - single source of truth for demo data
 * Used by both the dashboard UI and PDF report generation
 */
export async function getDemoDashboardSnapshot(
  mode: "demo-healthy" | "demo-risk",
  origin: string
): Promise<DashboardData> {
  const baseDate = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - (13 - i));
    return date.toISOString().split("T")[0];
  });

  if (mode === "demo-healthy") {
    // Healthy/Nominal demo data - matches MOCK_DATA.healthy.instabilityScore: 12
    const riskSeries = days.map((day, i) => ({
      day,
      risk: 0.12 + Math.sin(i / 2) * 0.02, // Low risk, stable around 0.12 (12%)
    }));

    return {
      user: "demo-healthy",
      version: "phase3-v1-wes",
      forecast: {
        latest: riskSeries[riskSeries.length - 1],
        series: riskSeries,
      },
      anomaly: {
        day: days[days.length - 1],
        items: [
          { signal: "rhr" as const, z: -0.5 }, // Below baseline (good)
          { signal: "hrv" as const, z: 0.8 }, // Above baseline (good)
          { signal: "sleep" as const, z: -0.2 }, // Slightly below (normal)
          { signal: "steps" as const, z: 0.3 }, // Above baseline (good)
        ],
      },
      eval: {
        reliability: {
          ece: 0.12,
          points: Array.from({ length: 10 }, (_, i) => ({
            bin: i / 10,
            pred: i / 10,
            obs: i / 10 + (Math.random() - 0.5) * 0.1,
            n: 100,
          })),
        },
        volatility: {
          stability: 0.08, // Low volatility (stable)
          points: days.map((day) => ({
            day,
            mean_delta: 0.05 + Math.random() * 0.1,
          })),
        },
      },
    };
  }

  // High Drift demo data - matches MOCK_DATA.risk.instabilityScore: 84
  const riskSeries = days.map((day, i) => ({
    day,
    risk: 0.84 + Math.sin(i / 3) * 0.05, // High risk, volatile around 0.84 (84%)
  }));

  return {
    user: "demo-risk",
    version: "phase3-v1-wes",
    forecast: {
      latest: riskSeries[riskSeries.length - 1],
      series: riskSeries,
    },
    anomaly: {
      day: days[days.length - 1],
      items: [
        { signal: "rhr" as const, z: 2.1 }, // Well above baseline (bad)
        { signal: "hrv" as const, z: -2.3 }, // Well below baseline (bad)
        { signal: "sleep" as const, z: 1.8 }, // Above baseline (bad - too much sleep or poor quality)
        { signal: "steps" as const, z: -1.2 }, // Below baseline (bad - low activity)
      ],
    },
    eval: {
      reliability: {
        ece: 0.12,
        points: Array.from({ length: 10 }, (_, i) => ({
          bin: i / 10,
          pred: i / 10,
          obs: i / 10 + (Math.random() - 0.5) * 0.1,
          n: 100,
        })),
      },
      volatility: {
        stability: 0.25, // High volatility (unstable)
        points: days.map((day) => ({
          day,
          mean_delta: 0.2 + Math.random() * 0.2,
        })),
      },
    },
  };
}

