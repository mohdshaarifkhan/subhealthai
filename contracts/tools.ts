export const Tools = {
  get_metrics: {
    name: "get_metrics",
    schema: {
      type: "object",
      properties: { user_id: { type: "string" }, day: { type: "string" } },
      required: ["user_id", "day"],
      additionalProperties: false,
    },
  },
  get_shap_explanations: {
    name: "get_shap_explanations",
    schema: {
      type: "object",
      properties: {
        user_id: { type: "string" },
        day: { type: "string" },
        topk: { type: "number" },
      },
      required: ["user_id", "day"],
      additionalProperties: false,
    },
  },
  get_trend: {
    name: "get_trend",
    schema: {
      type: "object",
      properties: { user_id: { type: "string" }, days: { type: "number" } },
      required: ["user_id", "days"],
      additionalProperties: false,
    },
  },
} as const;

export type ToolName = keyof typeof Tools;

