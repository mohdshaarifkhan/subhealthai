import Summary from "@/components/Summary";
import RiskCard from "@/components/RiskCard";
import WhyThis from "@/components/WhyThis";
import ExplainPanel from "@/components/Dashboard/ExplainPanel";
import { Last7Table } from "@/components/Last7Table";
import { ReliabilityCard } from "@/components/ReliabilityCard";
import { VolatilityCard } from "@/components/VolatilityCard";

export default function Dashboard() {
  const user = "demo"; // replace/wire from session
  const version = "phase3-v1-wes";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SubHealthAI</h1>
        <span className="text-xs text-gray-500">Non-diagnostic demo</span>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <RiskCard user={user} version={version} />
          <ExplainPanel user={user} version={version} />
        </div>
        <div className="space-y-6">
          <Summary user="demo" version="phase3-v1-wes" />
          <WhyThis user={user} version={version} />
          <div className="grid grid-cols-2 gap-4">
            <ReliabilityCard version="phase3-v1-wes" />
            <VolatilityCard version="phase3-v1-wes" />
          </div>
        </div>
      </div>

      <Last7Table user="demo" />

      {/* Optional: add Trends block next iteration */}
    </div>
  );
}

