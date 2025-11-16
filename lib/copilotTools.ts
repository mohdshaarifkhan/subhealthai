export const toolSchemas = [
  {
    type: "function",
    function: {
      name: "fetch_dashboard",
      description: "Get dashboard snapshot (risk, baselines, deltas, tags).",
      parameters: {
        type: "object",
        properties: { user: { type: "string" }, version: { type: "string" } },
        required: ["user"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_explain",
      description: "Get top contributors & rationale for the latest day.",
      parameters: {
        type: "object",
        properties: { user: { type: "string" }, version: { type: "string" } },
        required: ["user"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_anomaly",
      description: "Compute z-scores vs baseline and anomaly flags for today.",
      parameters: { type: "object", properties: { user: { type: "string" } }, required: ["user"] },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_trend",
      description: "Return a mini time series for a metric over N days.",
      parameters: {
        type: "object",
        properties: {
          user: { type: "string" },
          metric: { type: "string", enum: ["rhr", "hrv_avg", "sleep_minutes", "steps"] },
          days: { type: "number", default: 7 },
        },
        required: ["user", "metric"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_pdf_link",
      description: "Get a shareable link for the latest weekly PDF.",
      parameters: {
        type: "object",
        properties: { user: { type: "string" }, version: { type: "string" }, range: { type: "string", enum: ["7d", "30d"], default: "7d" } },
        required: ["user"],
      },
    },
  },
] as const;


