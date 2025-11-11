export type DashboardData = {
  user: string;
  version: string;
  forecast: {
    latest?: { day: string; risk: number };
    series: { day: string; risk: number }[];
  };
  anomaly: {
    day?: string;
    items: { signal: "rhr" | "hrv" | "sleep" | "steps"; z: number | null }[];
  };
  eval: {
    reliability: {
      ece: number | null;
      points: { bin: number; pred: number; obs: number; n: number }[];
    };
    volatility: {
      stability: number | null;
      points: { day: string; mean_delta: number }[];
    };
  };
};

export async function getDashboard({
  user,
  version,
  origin,
}: {
  user: string;
  version: string;
  origin: string;
}) {
  const url = `${origin}/api/dashboard?user=${encodeURIComponent(user)}&version=${encodeURIComponent(version)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as DashboardData;
}

