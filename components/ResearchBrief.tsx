"use client";

import React from 'react';
import { X } from 'lucide-react';

type ResearchBriefProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ResearchBrief = ({ isOpen, onClose }: ResearchBriefProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-slate-900/95 border border-slate-800 rounded-2xl p-8 lg:p-12 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-3xl font-['Unbounded'] font-bold text-white mb-2">RESEARCH — Early Detection of Physiological Drift</h1>
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
                SubHealthAI investigates how human physiology changes over time by analyzing subtle deviations in sleep quality, autonomic balance, metabolic strain, recovery patterns, and behavioral regularity.
              </p>
              <p className="text-sm leading-relaxed mt-4">
                The focus is <span className="text-slate-200 font-medium">subclinical drift</span>—physiological instability that emerges before noticeable symptoms or performance decline.
              </p>
            </section>

            {/* Scientific Foundations */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">1. Scientific Foundations</h2>
              <p className="text-sm leading-relaxed mb-4">
                SubHealthAI is grounded in established research across:
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Autonomic Physiology</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>HRV suppression and elevated RHR reflect stress load and reduced recovery capacity.</li>
                    <li>Short-term changes often precede measurable fatigue or metabolic imbalance.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Sleep Architecture</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Deep sleep variance and REM fragmentation are early predictors of instability.</li>
                    <li>Irregular sleep timing disrupts circadian alignment and recovery pathways.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Load & Behavioral Variability</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Weekly volatility in activity and recovery creates measurable drift.</li>
                    <li>Lifestyle irregularity amplifies autonomic instability.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Circadian Stability</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Delayed bedtimes and inconsistent wake times contribute to baseline deviation.</li>
                  </ul>
                </div>
              </div>

              <p className="text-sm leading-relaxed mt-4">
                These principles informed the design of SubHealthAI's drift-based Instability Engine.
              </p>
            </section>

            {/* Internal Experiments */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">2. Internal Experiments</h2>
              <p className="text-sm leading-relaxed mb-4">
                The engine underwent multiple rounds of internal testing using:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4 mb-6">
                <li>Personal wearable + biomarker data</li>
                <li>Synthetic demo users</li>
                <li>Public physiological datasets (e.g., WESAD and similar sources)</li>
              </ul>

              <p className="text-sm leading-relaxed mb-4">
                These experiments validated key behaviors of the system:
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Isolation Forest Drift Behavior</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Detected multivariate anomalies across HRV, RHR, sleep depth, timing shifts.</li>
                    <li>Differentiated normal day-to-day fluctuations from genuine physiological drift.</li>
                    <li>Demonstrated robustness under noisy wearable signals.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">GRU Sequence Forecasting</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>Learned the direction of drift (increasing, stable, or volatile).</li>
                    <li>Captured patterns across autonomic metrics, sleep stages, and circadian timing.</li>
                    <li>Performed reliably even with incomplete sequences, thanks to baseline smoothing.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Rolling Baseline Stability</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>28-day personal baselines adapted correctly to lifestyle changes.</li>
                    <li>Weekly volatility strongly correlated with predicted instability shifts.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-rajdhani font-semibold text-cyan-400 mb-2">Explainability Consistency</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                    <li>SHAP driver outputs consistently highlighted patterns in sleep debt, circadian irregularity, HRV suppression, and load imbalance.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Dataset Stress-Testing */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">3. Dataset Stress-Testing (Safe, Non-Diagnostic)</h2>
              <p className="text-sm leading-relaxed mb-4">
                A combination of real, synthetic, and publicly available datasets—including structured physiological datasets and emotional/behavioral signal datasets such as WESAD—were used exclusively for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4 mb-4">
                <li>stress-testing anomaly sensitivity</li>
                <li>validating baseline drift behavior</li>
                <li>evaluating SHAP driver consistency</li>
                <li>testing GRU sequence robustness under varied conditions</li>
              </ul>
              <p className="text-sm leading-relaxed mb-2">
                No diagnostic modeling, disease classification, or clinical inference was performed.
              </p>
              <p className="text-sm leading-relaxed">
                All tests were exploratory and focused solely on wellness-oriented early-signal detection.
              </p>
            </section>

            {/* Research Objective */}
            <section>
              <h2 className="text-xl font-['Unbounded'] font-bold text-white mb-4">4. Research Objective</h2>
              <p className="text-sm leading-relaxed mb-4">
                The goal of SubHealthAI's research program is to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 ml-4">
                <li>Understand early warning signals in human physiology</li>
                <li>Quantify subtle deviations in recovery, sleep, stress load, and metabolic patterns</li>
                <li>Build transparent, personalized drift metrics</li>
                <li>Enable proactive lifestyle awareness before symptoms emerge</li>
              </ul>
              <p className="text-sm leading-relaxed mt-4">
                This research provides the scientific foundation for SubHealthAI's non-diagnostic Instability Engine.
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

