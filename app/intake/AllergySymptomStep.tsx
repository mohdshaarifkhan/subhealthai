import * as React from "react";
import { useState } from "react";

type Props = { submitting: boolean; onSubmit: (submitFn: () => Promise<void>) => void };

const TRIGGERS = [
  "cat_dander",
  "dog_dander",
  "dust",
  "pollen",
  "grass",
  "mold",
  "cold_air",
  "food",
  "fragrance",
  "unknown"
];

const SEASONS = ["spring", "summer", "fall", "winter", "year_round"];

export function AllergySymptomStep({ submitting, onSubmit }: Props) {
  const [symptoms, setSymptoms] = useState<Record<string, boolean>>({});
  const [triggers, setTriggers] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<string>("");
  const [seasonality, setSeasonality] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const toggle = (key: string) => setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleArray = (value: string, arr: string[], setArr: (v: string[]) => void) => {
    if (arr.includes(value)) setArr(arr.filter((v) => v !== value));
    else setArr([...arr, value]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(async () => {
      const body: any = {
        has_sneezing: !!symptoms.sneezing,
        has_itchy_eyes: !!symptoms.itchy_eyes,
        has_nasal_congestion: !!symptoms.congestion,
        has_rash: !!symptoms.rash,
        has_hives: !!symptoms.hives,
        has_eczema: !!symptoms.eczema,
        has_wheezing: !!symptoms.wheezing,
        triggers: triggers.length ? triggers : undefined,
        frequency: frequency || undefined,
        seasonality: seasonality.length ? seasonality : undefined,
        severity: severity || undefined,
        notes: notes || undefined
      };

      const anyFilled =
        Object.values(symptoms).some(Boolean) || triggers.length > 0 || frequency || seasonality.length > 0 || severity || notes;
      if (!anyFilled) return;

      await fetch("/api/intake/allergies_symptom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    });
  };

  return (
    <form id="step-form-allergy" onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs">Common symptoms</label>
          <div className="space-y-1 text-xs">
            {[
              ["sneezing", "Sneezing"],
              ["itchy_eyes", "Itchy / watery eyes"],
              ["congestion", "Nasal congestion"],
              ["rash", "Rash"],
              ["hives", "Hives"],
              ["eczema", "Eczema / dry itchy skin"],
              ["wheezing", "Wheezing / chest tightness"]
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={!!symptoms[key]}
                  onChange={() => toggle(key)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs">Typical triggers you&apos;ve noticed</label>
          <div className="space-y-1 text-xs">
            {TRIGGERS.map((t) => (
              <label key={t} className="flex items-center gap-2 capitalize">
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={triggers.includes(t)}
                  onChange={() => toggleArray(t, triggers, setTriggers)}
                />
                <span>{t.replace("_", " ")}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1">How often do symptoms occur?</label>
          <select
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            <option value="">Optional</option>
            <option value="rarely">Rarely</option>
            <option value="sometimes">Sometimes</option>
            <option value="often">Often</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1">When do they tend to be worse?</label>
          <div className="space-y-1 text-xs">
            {SEASONS.map((s) => (
              <label key={s} className="flex items-center gap-2 capitalize">
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={seasonality.includes(s)}
                  onChange={() => toggleArray(s, seasonality, setSeasonality)}
                />
                <span>{s.replace("_", " ")}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1">Overall severity</label>
          <select
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="">Optional</option>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="strong">Strong</option>
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1">Anything else your doctor should know?</label>
          <textarea
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about skin issues, asthma, or symptom patterns."
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        If you&apos;ve never done an allergy test, you can still describe your symptoms and triggers. SubHealthAI will treat this as a
        lower-weighted, self-reported &quot;Allergy Sensitivity&quot; signal.
      </p>

      <button type="submit" className="hidden" disabled={submitting} />
    </form>
  );
}


