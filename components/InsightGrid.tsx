"use client";

import InsightCard from "@/components/InsightCard";

export default function InsightGrid({ user }: { user: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <InsightCard user={user} metric="rhr" />
      <InsightCard user={user} metric="hrv_avg" />
      <InsightCard user={user} metric="sleep_minutes" />
      <InsightCard user={user} metric="steps" />
    </div>
  );
}
