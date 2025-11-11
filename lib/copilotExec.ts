import { audit } from "@/lib/audit";
import { dbFetchDashboard, dbFetchExplain, dbFetchAnomaly, dbFetchTrend, getPdfLink } from "@/lib/data";

export const toolExec = {
  async fetch_dashboard(args: any) {
    return dbFetchDashboard(args.user, args.version);
  },

  async fetch_explain(args: any) {
    return dbFetchExplain(args.user, args.version);
  },

  async fetch_anomaly(args: any) {
    return dbFetchAnomaly(args.user);
  },

  async fetch_trend(args: any) {
    return dbFetchTrend(args.user, args.metric, args.days ?? 7);
  },

  async fetch_pdf_link(args: any) {
    return getPdfLink(args.user, args.version, args.range ?? "7d");
  },
};

export async function runTool(name: string, args: any) {
  if (!(name in toolExec)) throw new Error(`Unknown tool: ${name}`);
  const res = await (toolExec as any)[name](args);
  await audit({ action: "copilot_tool", details: { tool: name, args } });
  return res;
}


