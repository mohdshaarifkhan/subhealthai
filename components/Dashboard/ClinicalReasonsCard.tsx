"use client";

import React from "react";

export function ClinicalReasonsCard({ reasons }: { reasons: string[] }) {
  if (!reasons || reasons.length === 0) {
    return null;
  }

  return (
    <div className="h-full">
      <ul className="space-y-3">
        {reasons.map((r, idx) => (
          <li
            key={idx}
            className="text-slate-400 text-xs font-mono flex gap-2 items-start"
          >
            <span className="text-cyan-400 mt-1">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <p className="text-slate-500 text-xs mt-4 leading-snug">
        Generated from biometric patterns, lab signals, lifestyle inputs, and
        longitudinal model behavior.
      </p>
    </div>
  );
}

