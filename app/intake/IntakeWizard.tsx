"use client";

import * as React from "react";
import InfoIcon from "@/components/icons/InfoIcon";
import { ProfileStep } from "./ProfileStep";
import { LabsStep } from "./LabsStep";
import { AllergySymptomStep } from "./AllergySymptomStep";
import { LifestyleFamilyStep } from "./LifestyleFamilyStep";
import { useReviewerMode } from "@/lib/useReviewerMode";

type StepId = "profile" | "labs" | "allergy" | "lifestyleFamily";

const STEPS: { id: StepId; label: string; optional: boolean }[] = [
  { id: "profile", label: "Profile", optional: false },
  { id: "labs", label: "Labs (Optional)", optional: true },
  { id: "allergy", label: "Allergies & Symptoms (Optional)", optional: true },
  { id: "lifestyleFamily", label: "Lifestyle & Family (Optional)", optional: true }
];

export function IntakeWizard() {
  const [idx, setIdx] = React.useState(0);
  const [submittingStep, setSubmittingStep] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const current = STEPS[idx];
  const progress = (idx / (STEPS.length - 1)) * 100;
  const reviewer = useReviewerMode();

  const goNext = () => {
    if (idx < STEPS.length - 1) {
      setIdx(idx + 1);
    } else {
      setFinished(true);
    }
  };

  const goBack = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  const handleStepSubmit = async (submitFn: () => Promise<void>) => {
    try {
      setSubmittingStep(true);
      await submitFn();
      goNext();
    } finally {
      setSubmittingStep(false);
    }
  };

  const handleSkip = () => {
    goNext();
  };

  if (finished) {
    return (
      <section className="max-w-3xl mx-auto p-4 rounded-2xl border bg-card">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Intake complete</h2>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Thanks for providing your information. You can update labs, allergies, lifestyle, or family history anytime from the dashboard.
          </p>
          <div className="p-3 rounded-xl border border-dashed bg-card/50 flex items-start gap-2">
            <InfoIcon className="h-4 w-4 mt-0.5" />
            <div>
              <div className="text-xs font-semibold">What happens next</div>
              <div className="text-xs text-muted-foreground">
                SubHealthAI will use your inputs, along with wearable data (if available), to compute non-diagnostic pattern scores. These
                will appear under <strong>“Multimodal Condition Patterns”</strong> on your dashboard.
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <a href="/dashboard" className="inline-flex items-center rounded-lg px-3 py-2 border hover:bg-accent text-sm">
            Go to dashboard
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto p-4 rounded-2xl border bg-card">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Health Intake ({current.label})</h2>
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-1.5 bg-emerald-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            You can skip any optional step. More information helps SubHealthAI detect patterns earlier, but nothing here is required to use
            the app.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {current.id === "profile" && <ProfileStep submitting={submittingStep} onSubmit={(fn) => handleStepSubmit(fn)} />}
        {current.id === "labs" && <LabsStep submitting={submittingStep} onSubmit={(fn) => handleStepSubmit(fn)} />}
        {current.id === "allergy" && <AllergySymptomStep submitting={submittingStep} onSubmit={(fn) => handleStepSubmit(fn)} />}
        {current.id === "lifestyleFamily" && (
          <LifestyleFamilyStep submitting={submittingStep} onSubmit={(fn) => handleStepSubmit(fn)} />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {idx > 0 && (
            <button className="text-sm rounded-lg px-3 py-2 border hover:bg-accent disabled:opacity-50" onClick={goBack} disabled={reviewer}>
              Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {current.optional && (
            <button className="text-sm rounded-lg px-3 py-2 hover:bg-accent disabled:opacity-50" onClick={handleSkip} disabled={submittingStep || reviewer}>
              Skip
            </button>
          )}
          <button
            className="text-sm rounded-lg px-3 py-2 border hover:bg-accent disabled:opacity-50"
            form={`step-form-${current.id}`}
            type="submit"
            disabled={submittingStep || reviewer}
          >
            {submittingStep && <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent inline-block" />}
            {idx === STEPS.length - 1 ? "Finish" : "Save & continue"}
          </button>
        </div>
      </div>
    </section>
  );
}


