import { z } from "zod";

export const CopilotContext = z.object({
  user: z.string(),
  version: z.string().default("phase3-v1-wes"),
  range: z.string().default("7d"),
});

export type CopilotContext = z.infer<typeof CopilotContext>;

async function fetchJSON<T>(path: string, params: Record<string, string>) {
  const url = new URL(path, process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} failed ${res.status}`);
  return (await res.json()) as T;
}

export async function getDashboard(ctx: CopilotContext) {
  return fetchJSON<any>("/api/dashboard", { user: ctx.user, version: ctx.version });
}

export async function getExplain(ctx: CopilotContext) {
  return fetchJSON<any>("/api/explain", { user: ctx.user, version: ctx.version });
}

export async function getAnomaly(ctx: CopilotContext) {
  return fetchJSON<any>("/api/anomaly", { user: ctx.user });
}

export async function getMetricTrend(ctx: CopilotContext, metric: "rhr" | "hrv" | "sleep_minutes" | "steps") {
  return fetchJSON<any>("/api/metric_trend", { user: ctx.user, metric, days: ctx.range.replace("d", "") });
}

export function reportLink(ctx: CopilotContext) {
  const u = new URL("/api/report", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");
  u.searchParams.set("user", ctx.user);
  u.searchParams.set("version", ctx.version);
  u.searchParams.set("range", "7d");
  return u.toString();
}

