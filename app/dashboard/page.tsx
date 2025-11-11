"use client";

import Summary from "@/components/Summary";
import RiskCard from "@/components/RiskCard";
import ExplainPanel from "@/components/Dashboard/ExplainPanel";
import { Last7Table } from "@/components/Last7Table";
import { ReliabilityCard } from "@/components/ReliabilityCard";
import { VolatilityCard } from "@/components/VolatilityCard";
import HeaderContextChips from "@/components/HeaderContextChips";
import ExportPdfButton from "@/components/ExportPdfButton";
import { useActiveUser } from "@/utils/useActiveUser";
import CopilotPanel from "@/components/CopilotPanel";
import WhyThis from "@/components/WhyThis";

export default function Dashboard() {
  const user = useActiveUser() || "demo";
  const version = "phase3-v1-wes";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">SubHealthAI</h1>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Non-diagnostic demo</span>
            <ExportPdfButton />
          </div>
        </div>
        <HeaderContextChips />
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <RiskCard user={user} version={version} />
          <ExplainPanel user={user} version={version} />
          <CopilotPanel />
        </div>
        <div className="space-y-6">
          <Summary user={user} version={version} />
          <WhyThis user={user} version={version} />
          <div className="grid grid-cols-2 gap-4">
            <ReliabilityCard version={version} />
            <VolatilityCard version={version} />
          </div>
        </div>
      </div>

      <Last7Table user={user} />
    </div>
  );
}

