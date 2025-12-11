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

// Export toolSpecs for LLM route (OpenAI format)
export const toolSpecs = [
  {
    type: "function",
    function: {
      name: "get_risk",
      description: "Get current instability risk score for a user",
      parameters: {
        type: "object",
        properties: {
          user: { type: "string" },
          version: { type: "string" }
        },
        required: ["user"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_explain_summary",
      description: "Get SHAP-based explanation of top contributors to instability",
      parameters: {
        type: "object",
        properties: {
          user: { type: "string" },
          version: { type: "string" }
        },
        required: ["user"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_anomaly",
      description: "Get anomaly detection results (z-scores vs baseline)",
      parameters: {
        type: "object",
        properties: {
          user: { type: "string" }
        },
        required: ["user"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_reliability",
      description: "Get model reliability metrics",
      parameters: {
        type: "object",
        properties: {
          version: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_volatility",
      description: "Get model volatility index",
      parameters: {
        type: "object",
        properties: {
          version: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "make_pdf",
      description: "Generate a PDF report link",
      parameters: {
        type: "object",
        properties: {
          user: { type: "string" },
          version: { type: "string" },
          range: { type: "string", enum: ["7d", "30d"] }
        },
        required: ["user"]
      }
    }
  }
];

// Export executeTool for tool route
export async function executeTool(name: string, args: any): Promise<any> {
  const ctx: CopilotContext = {
    user: args.user || "",
    version: args.version || "phase3-v1-wes",
    range: args.range || "7d"
  };

  switch (name) {
    case "get_risk":
      return getDashboard(ctx);
    case "get_explain_summary":
      return getExplain(ctx);
    case "get_anomaly":
      return getAnomaly(ctx);
    case "get_reliability":
    case "get_volatility":
      // These would need their own API routes
      return { error: "Not implemented" };
    case "make_pdf":
      return { url: reportLink(ctx) };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

