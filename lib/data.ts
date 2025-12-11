const ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

async function fetchJSON<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, ORIGIN);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} failed ${res.status}`);
  return (await res.json()) as T;
}

export async function dbFetchDashboard(user: string, version: string) {
  return fetchJSON<any>("/api/dashboard", { user, version });
}

export async function dbFetchExplain(user: string, version: string) {
  return fetchJSON<any>("/api/explain", { user, version });
}

export async function dbFetchAnomaly(user: string) {
  return fetchJSON<any>("/api/anomaly", { user });
}

export async function dbFetchTrend(user: string, metric: string, days: number) {
  return fetchJSON<any>("/api/metric_trend", { user, metric, days: String(days) });
}

export function getPdfLink(user: string, version: string, range: string): string {
  const url = new URL("/api/report", ORIGIN);
  url.searchParams.set("user", user);
  url.searchParams.set("version", version);
  url.searchParams.set("range", range);
  return url.toString();
}

