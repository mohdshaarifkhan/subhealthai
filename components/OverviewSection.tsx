"use client";

import { useAppContext } from "@/utils/useAppContext";
import InsightGrid from "@/components/InsightGrid";
import RiskHero from "@/components/RiskHero";

export default function OverviewSection() {
  const { user, version } = useAppContext();

  return (
    <section className="space-y-6">
      <RiskHero user={user || ''} version={version} />
      <InsightGrid user={user || ''} />
    </section>
  );
}
