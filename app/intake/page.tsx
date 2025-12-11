import { Suspense } from "react";
import { IntakeWizard } from "./IntakeWizard";

function IntakeContent() {
  return (
    <div className="px-4 py-6">
      <IntakeWizard />
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <IntakeContent />
    </Suspense>
  );
}


