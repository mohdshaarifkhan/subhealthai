"use client";

import React from 'react';
import { X } from 'lucide-react';

type TechnicalBriefProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const TechnicalBrief = ({ isOpen, onClose }: TechnicalBriefProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-slate-900/95 border border-slate-800 rounded-2xl p-8 lg:p-12 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-3xl font-['Unbounded'] font-bold text-white mb-2">SubHealthAI Instability Engine v1.0</h1>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-8 text-slate-300 max-h-[70vh] overflow-y-auto pr-2">
            {/* Overview */}
            <section>
              <p className="text-sm leading-relaxed">
                SubHealthAI's Instability Engine estimates short-term physiological instability by analyzing autonomic nervous system patterns captured from consumer wearables. Instead of predicting diseases, the system focuses on detecting <span className="text-slate-200 font-medium">sub-clinical drift</span> — small deviations in sleep, recovery, metabolic load, and cardiovascular balance that often precede symptoms.
              </p>
            </section>

            {/* Core Signal Inputs */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">Core Signal Inputs</h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-slate-400 ml-4">
                <li>HRV, resting heart rate, sleep stages, respiratory rate, temperature</li>
                <li>Training load, activity cycles, circadian timing</li>
                <li>Optional manual biomarkers (future: hs-CRP, glucose, HbA1c, lipids)</li>
              </ul>
            </section>

            {/* Methodology */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">Methodology</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-1">Rolling Baselines</h3>
                  <p className="text-sm text-slate-400">28-day personalized stability baselines for every metric</p>
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-1">Drift Detection</h3>
                  <p className="text-sm text-slate-400">Isolation Forest + time-series deltas to quantify physiological deviation</p>
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-1">Forecasting</h3>
                  <p className="text-sm text-slate-400">GRU-based sequence model projects next-day instability band</p>
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-1">Explainability</h3>
                  <p className="text-sm text-slate-400">SHAP-based attribution shows which lifestyle/physiology factors drove the score</p>
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-1">Model Hygiene</h3>
                  <p className="text-sm text-slate-400">Calibration via Brier score; volatility + completeness monitoring</p>
                </div>
              </div>
            </section>

            {/* Output */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">Output</h2>
              <p className="text-sm leading-relaxed mb-4">
                The engine produces:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-slate-400 ml-4">
                <li>A 0–100 Instability Score</li>
                <li>Trend direction (stable, drifting, volatile)</li>
                <li>Daily driver attribution (e.g., sleep depth, load, recovery, timing)</li>
                <li>Non-diagnostic insights on physiological imbalance</li>
              </ul>
            </section>

            {/* Important Notice */}
            <section className="mt-8 p-6 bg-amber-950/20 border border-amber-900/50 rounded-xl">
              <h3 className="text-lg font-['Unbounded'] font-bold text-amber-400 mb-3">Important</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                SubHealthAI is a research prototype, not a medical device.
              </p>
              <p className="text-sm leading-relaxed text-slate-300 mt-2">
                It does not diagnose, treat, or predict disease.
              </p>
              <p className="text-sm leading-relaxed text-slate-300 mt-2">
                All outputs are for informational and exploratory use only.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-700 rounded-lg transition-all text-sm font-mono uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

