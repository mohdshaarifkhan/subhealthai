"use client";

import CopilotChat from "@/components/CopilotChat";
import HeaderContextChips from "@/components/HeaderContextChips";
import UserSwitcher from "@/components/UserSwitcher";

export default function CopilotPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">SubHealthAI Copilot</h1>
            <p className="text-xs text-gray-500">
              Ask preventive questions about today’s metrics. Outputs are non-diagnostic.
            </p>
          </div>
          <UserSwitcher />
        </div>
        <HeaderContextChips />
      </header>

      <CopilotChat />
    </div>
  );
}
