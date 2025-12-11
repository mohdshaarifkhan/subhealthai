"use client";

import React from 'react';
import { X } from 'lucide-react';

type TechnologyBriefProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const TechnologyBrief = ({ isOpen, onClose }: TechnologyBriefProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-slate-900/95 border border-slate-800 rounded-2xl p-8 lg:p-12 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-3xl font-['Unbounded'] font-bold text-white mb-2">TECHNOLOGY — SubHealthAI Platform Architecture</h1>
              <p className="text-sm text-slate-400 leading-relaxed mt-2">
                Unified multimodal engine for early-signal analysis and physiological drift detection.
              </p>
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
                SubHealthAI integrates wearable signals, biomarkers, lifestyle markers, and personalized baselines into a secure, explainable, and extensible early-signal intelligence platform.
              </p>
              <p className="text-sm leading-relaxed mt-4">
                The system is built with modular components that work together to quantify physiological drift while ensuring transparency, robustness, and user-controlled data flows.
              </p>
            </section>

            {/* Data Infrastructure Layer */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">1. Data Infrastructure Layer</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Multimodal Ingestion</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Wearables: HRV, RHR, sleep stages, respiratory rate, movement load</li>
                    <li>Biomarkers: glucose, hs-CRP, HbA1c, lipid values (user-uploaded)</li>
                    <li>Lifestyle markers: allergies, symptoms, history, behavioral patterns</li>
                    <li>Daily aggregation + domain normalization</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Storage & Processing</h3>
                  <p className="text-sm leading-relaxed mb-2">PostgreSQL (Supabase) optimized for:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>time-series metrics</li>
                    <li>rolling baselines</li>
                    <li>lab events</li>
                    <li>SHAP contributions</li>
                    <li>device accounts</li>
                  </ul>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4 mt-2">
                    <li>Row-level security + user-scoped isolation</li>
                    <li>Event-driven normalization pipelines</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Baseline & Signal Modeling */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">2. Baseline & Signal Modeling</h2>
              
              <div>
                <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Rolling 28-Day Baselines</h3>
                <p className="text-sm leading-relaxed mb-2">The system continuously learns:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                  <li>personal physiological norms</li>
                  <li>circadian timing patterns</li>
                  <li>weekly stability patterns</li>
                  <li>volatility indices</li>
                  <li>drift-velocity</li>
                </ul>
                <p className="text-sm leading-relaxed mt-2">
                  This enables personalized deviation scoring rather than population thresholds.
                </p>
              </div>
            </section>

            {/* Instability Engine */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">3. Instability Engine (Core Algorithms)</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Anomaly Detection (Isolation Forest)</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Flags nonlinear deviations across HRV, sleep, load, and timing</li>
                    <li>Distinguishes natural oscillations from meaningful drift</li>
                    <li>Handles missing or noisy wearable data gracefully</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Temporal Forecasting (GRU Sequence Model)</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Learns short-term drift direction (stable → rising → volatile)</li>
                    <li>Captures dependencies across days and multivariate signals</li>
                    <li>Helps contextualize instability momentum</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Explainability (SHAP Attribution)</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Daily driver contributions</li>
                    <li>Positive vs negative influence</li>
                    <li>Domain grouping (sleep, recovery, load, circadian)</li>
                    <li>Supports transparent reasoning for all outputs</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Model Hygiene</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Calibration checks (Brier score)</li>
                    <li>Completeness index</li>
                    <li>Drift sensitivity diagnostics</li>
                    <li>Volatility smoothing</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Application Layer */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">4. Application Layer</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-1">Instability Score Output</h3>
                  <p className="text-sm text-slate-400">0–100 index reflecting short-term physiological instability</p>
                  <p className="text-sm text-slate-400">Non-diagnostic, wellness-oriented, and fully explainable</p>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-1">Causal Driver Panel</h3>
                  <p className="text-sm text-slate-400">Shows why the score moved</p>
                  <p className="text-sm text-slate-400">Highlights sleep debt, HRV suppression, irregular timing, load imbalance</p>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-1">Trends & Forecasts</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Daily instability trajectory</li>
                    <li>7-day HRV and sleep trends</li>
                    <li>Baseline comparison</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-1">Biomarker Integration</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Lab reports ingested manually</li>
                    <li>Displays drift-relevant biomarker deviations</li>
                    <li>No diagnostic classification</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Platform Engineering */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">5. Platform Engineering</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Frontend</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Next.js 14 + React Server Components</li>
                    <li>Industrial-grade "Burnt Obsidian" design system</li>
                    <li>Bento grids for data visualization</li>
                    <li>High-performance charts (trend lines, SHAP bars, drift graphs)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Backend</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Supabase Postgres with row-level security</li>
                    <li>Edge functions (optional)</li>
                    <li>Python inference micro-services for model execution</li>
                    <li>Server-side caching for daily metrics</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Security</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Encrypted storage</li>
                    <li>User-scoped UUID access</li>
                    <li>No third-party data sharing</li>
                    <li>Explicitly non-diagnostic boundaries</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Vision & Roadmap */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">6. Vision & Roadmap</h2>
              <p className="text-sm leading-relaxed mb-4">
                SubHealthAI is currently a research and wellness system.
              </p>
              <p className="text-sm leading-relaxed mb-2">Future phases include:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                <li>stronger multimodal fusion</li>
                <li>biomarker drift modeling</li>
                <li>clinical collaborations</li>
                <li>FDA-aligned validation studies</li>
                <li>eventual transition toward SaMD pathways after proper approvals</li>
              </ul>
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

