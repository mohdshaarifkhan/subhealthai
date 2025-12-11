import * as React from "react";
import { useState } from "react";

export function LifestyleFamilyStep({ submitting, onSubmit }: { submitting: boolean; onSubmit: (submitFn: () => Promise<void>) => void }) {
  const [sleepWork, setSleepWork] = useState<string>("");
  const [sleepWeekend, setSleepWeekend] = useState<string>("");
  const [activity, setActivity] = useState<string>("");
  const [workPattern, setWorkPattern] = useState<string>("");
  const [smoker, setSmoker] = useState<string>("");
  const [alcohol, setAlcohol] = useState<string>("");
  const [stress, setStress] = useState<string>("");
  const [fhText, setFhText] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(async () => {
      const lifestyleBody: any = {
        sleep_hours_workdays: sleepWork ? Number(sleepWork) : undefined,
        sleep_hours_weekends: sleepWeekend ? Number(sleepWeekend) : undefined,
        activity_level: activity || undefined,
        work_pattern: workPattern || undefined,
        smoker_status: smoker || undefined,
        alcohol_per_week: alcohol ? Number(alcohol) : undefined,
        stress_level: stress || undefined
      };

      const hasLifestyle =
        !!sleepWork || !!sleepWeekend || !!activity || !!workPattern || !!smoker || !!alcohol || !!stress;

      if (hasLifestyle) {
        await fetch("/api/intake/lifestyle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lifestyleBody)
        });
      }

      if (fhText.trim()) {
        await fetch("/api/intake/family_history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              relation: "summary",
              condition: fhText.trim(),
              notes: "free_text_summary"
            }
          ])
        });
      }
    });
  };

  return (
    <form id="step-form-lifestyleFamily" onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs mb-1">Average sleep (workdays, hours)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            step="0.25"
            value={sleepWork}
            onChange={(e) => setSleepWork(e.target.value)}
            placeholder="e.g., 6.5"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Average sleep (weekends, hours)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            step="0.25"
            value={sleepWeekend}
            onChange={(e) => setSleepWeekend(e.target.value)}
            placeholder="e.g., 7.5"
          />
        </div>

        <div>
          <label className="block text-xs mb-1">Activity level</label>
          <select
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          >
            <option value="">Optional</option>
            <option value="low">Low (mostly sitting)</option>
            <option value="medium">Medium (3–4x/week activity)</option>
            <option value="high">High (5+ active days/week)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1">Work pattern</label>
          <select
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            value={workPattern}
            onChange={(e) => setWorkPattern(e.target.value)}
          >
            <option value="">Optional</option>
            <option value="day">Daytime schedule</option>
            <option value="night_shift">Night shift</option>
            <option value="rotating">Rotating shifts</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1">Smoking status</label>
          <select
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            value={smoker}
            onChange={(e) => setSmoker(e.target.value)}
          >
            <option value="">Optional</option>
            <option value="never">Never</option>
            <option value="former">Former</option>
            <option value="current">Current</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1">Alcohol consumption (drinks/week)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            value={alcohol}
            onChange={(e) => setAlcohol(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-xs mb-1">Stress level</label>
          <select
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            value={stress}
            onChange={(e) => setStress(e.target.value)}
          >
            <option value="">Optional</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs mb-1">Family history (free text for now)</label>
          <textarea
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            rows={4}
            value={fhText}
            onChange={(e) => setFhText(e.target.value)}
            placeholder="e.g., Father: Type 2 diabetes at 48; Mother: hypertension; Sibling: asthma."
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        These answers help SubHealthAI adjust how it interprets your metrics over time. You can change this information later as your habits or history change.
      </p>

      <button type="submit" className="hidden" disabled={submitting} />
    </form>
  );
}


