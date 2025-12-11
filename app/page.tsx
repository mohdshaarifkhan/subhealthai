// Default export for the root page - SubHealthAIDashboard handles routing internally
"use client";

import { Suspense } from "react";
import SubHealthAIDashboard from "@/components/SubHealthAIDashboard";

function DashboardWrapper() {
  return <SubHealthAIDashboard />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardWrapper />
    </Suspense>
  );
}
