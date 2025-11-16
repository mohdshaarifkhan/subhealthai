"use client";

import * as React from "react";
import { useState } from "react";

export function LabsStep({ submitting, onSubmit }: { submitting: boolean; onSubmit: (submitFn: () => Promise<void>) => void }) {
  const [date, setDate] = useState<string>("");
  const [glucose, setGlucose] = useState<string>("");
  const [a1c, setA1c] = useState<string>("");
  const [egfr, setEgfr] = useState<string>("");
  const [creatinine, setCreatinine] = useState<string>("");
  const [chol, setChol] = useState<string>("");
  const [hdl, setHdl] = useState<string>("");
  const [ldl, setLdl] = useState<string>("");
  const [trig, setTrig] = useState<string>("");
  const [alt, setAlt] = useState<string>("");
  const [ast, setAst] = useState<string>("");
  const [tsh, setTsh] = useState<string>("");
  const [vitd, setVitd] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(async () => {
      if (!date) {
        return;
      }
      await fetch("/api/intake/labs_core", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          fasting_glucose_mg_dl: glucose ? Number(glucose) : undefined,
          hba1c_percent: a1c ? Number(a1c) : undefined,
          egfr_ml_min_1_73: egfr ? Number(egfr) : undefined,
          creatinine_mg_dl: creatinine ? Number(creatinine) : undefined,
          chol_total_mg_dl: chol ? Number(chol) : undefined,
          hdl_mg_dl: hdl ? Number(hdl) : undefined,
          ldl_mg_dl: ldl ? Number(ldl) : undefined,
          trig_mg_dl: trig ? Number(trig) : undefined,
          alt_u_l: alt ? Number(alt) : undefined,
          ast_u_l: ast ? Number(ast) : undefined,
          tsh_ulU_ml: tsh ? Number(tsh) : undefined,
          vitd_25oh_ng_ml: vitd ? Number(vitd) : undefined,
          is_fasting: true
        })
      });
    });
  };

  return (
    <form id="step-form-labs" onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <label className="block text-xs mb-1">Date of labs</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs mb-1">Fasting glucose (mg/dL)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            value={glucose}
            onChange={(e) => setGlucose(e.target.value)}
            placeholder="e.g., 94"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">HbA1c (%)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            step="0.1"
            value={a1c}
            onChange={(e) => setA1c(e.target.value)}
            placeholder="e.g., 5.3"
          />
        </div>

        <div>
          <label className="block text-xs mb-1">eGFR (mL/min/1.73m²)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            value={egfr}
            onChange={(e) => setEgfr(e.target.value)}
            placeholder="e.g., 75"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Creatinine (mg/dL)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            step="0.01"
            value={creatinine}
            onChange={(e) => setCreatinine(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs mb-1">Total Cholesterol</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            value={chol}
            onChange={(e) => setChol(e.target.value)}
            placeholder="e.g., 180"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">HDL</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            value={hdl}
            onChange={(e) => setHdl(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">LDL</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            value={ldl}
            onChange={(e) => setLdl(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Triglycerides</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            value={trig}
            onChange={(e) => setTrig(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs mb-1">ALT (U/L)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">AST (U/L)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            value={ast}
            onChange={(e) => setAst(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs mb-1">TSH (µIU/mL)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            step="0.01"
            value={tsh}
            onChange={(e) => setTsh(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Vitamin D (25-OH, ng/mL)</label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm bg-background"
            type="number"
            step="0.1"
            value={vitd}
            onChange={(e) => setVitd(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        You can copy these values directly from your patient portal. Leave any field blank if you don&apos;t have it. You can also skip this
        step entirely — SubHealthAI will still work using wearable and lifestyle data alone.
      </p>
      <button type="submit" className="hidden" disabled={submitting} />
    </form>
  );
}


