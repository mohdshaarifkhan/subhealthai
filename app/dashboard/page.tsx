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
import MultimodalRiskPanel from "@/components/Dashboard/MultimodalRiskPanel";
import EvidencePanel from "@/components/Dashboard/EvidencePanel";
import { useReviewerMode } from "@/lib/useReviewerMode";
import InfoIcon from "@/components/icons/InfoIcon";

export default function Dashboard() {
  const user = useActiveUser() || "demo";
  const version = "phase3-v1-wes";
  const reviewer = useReviewerMode();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {reviewer && (
        <div className="p-3 rounded-xl border border-dashed border-amber-500 bg-amber-50/40 text-amber-900 flex items-start gap-2">
          <InfoIcon className="h-4 w-4 mt-0.5" />
          <div>
            <div className="text-xs font-semibold">Reviewer mode (read-only, non-diagnostic)</div>
            <div className="text-xs">
              You are viewing <strong>SubHealthAI</strong> in reviewer mode. All values are fixed, write-actions are disabled, and outputs are
              presented for research, validation, and immigration/peer-review purposes only. This is <strong>not</strong> a clinical device.
            </div>
          </div>
        </div>
      )}
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
          <section>
            <h2 className="mb-2 text-sm font-semibold tracking-tight text-muted-foreground">
              Multimodal Condition Patterns
            </h2>
            <MultimodalRiskPanel />
          </section>
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

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div>
          <h2 className="mb-2 text-sm font-semibold tracking-tight text-muted-foreground">
            Multimodal Condition Patterns
          </h2>
          <MultimodalRiskPanel />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold tracking-tight text-muted-foreground">
            Evidence & Engine Status
          </h2>
          <EvidencePanel />
        </div>
      </section>
    </div>
  );
}

