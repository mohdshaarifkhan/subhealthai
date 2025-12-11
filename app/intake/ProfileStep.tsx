"use client";

import * as React from "react";
import { useState } from "react";

export function ProfileStep({ submitting, onSubmit }: { submitting: boolean; onSubmit: (submitFn: () => Promise<void>) => void }) {
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [goal, setGoal] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(async () => {
      await fetch("/api/intake/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age_years: age ? Number(age) : undefined,
          sex_at_birth: sex || undefined,
          height_cm: height ? Number(height) : undefined,
          weight_kg: weight ? Number(weight) : undefined,
          primary_goal: goal || undefined
        })
      });
    });
  };
  return (
    <form id="step-form-profile" onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs mb-1">Age (years)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            min={10}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Sex at birth</label>
          <select
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            value={sex}
            onChange={(e) => setSex(e.target.value)}
          >
            <option value="">Optional</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="intersex">Intersex</option>
            <option value="other">Other / prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1">Height (cm)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            min={80}
            max={230}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Weight (kg)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            min={30}
            max={250}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs mb-1">Primary focus</label>
          <select
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          >
            <option value="">Optional (metabolic, cardio, etc.)</option>
            <option value="metabolic">Metabolic (weight, glucose, liver)</option>
            <option value="cardio">Cardio (BP, heart, recovery)</option>
            <option value="inflammation">Inflammation / autoimmunity</option>
            <option value="recovery">Recovery / sleep / stress</option>
            <option value="general">General long-term prevention</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        This information is used to personalize baselines and risk patterns. All fields are optional, but providing them helps SubHealthAI
        calibrate your risk indices more accurately.
      </p>
      <button type="submit" className="hidden" disabled={submitting} />
    </form>
  );
}


