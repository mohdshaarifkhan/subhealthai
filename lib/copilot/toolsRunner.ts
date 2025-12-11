import { getAnomaly as getAnomalyFromTools } from "./tools";

// Re-export getAnomaly for compatibility with existing imports
export async function getAnomaly(ctx: { user: string }) {
  return getAnomalyFromTools({ user: ctx.user, version: "phase3-v1-wes", range: "7d" });
}

