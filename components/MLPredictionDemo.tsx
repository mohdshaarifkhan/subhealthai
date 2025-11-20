/**
 * Example component demonstrating how to use the ML prediction API
 * 
 * This component shows how to call the /api/ml/predict endpoint
 * from the Next.js frontend to get real-time risk predictions.
 */

"use client";

import { useState } from "react";
import { Activity, Heart, Loader2 } from "lucide-react";

interface PredictionResult {
  risk_score: number;
  risk_level: string;
  probability: number;
  model_version: string;
  disclaimer?: string;
}

export default function MLPredictionDemo() {
  const [diabetesData, setDiabetesData] = useState({
    glucose: 140,
    bmi: 32,
    age: 45,
    bp: 130,
  });

  const [cardiacData, setCardiacData] = useState({
    age: 55,
    systolic_bp: 145,
    cholesterol: 250,
    resting_hr: 78,
  });

  const [diabetesResult, setDiabetesResult] = useState<PredictionResult | null>(null);
  const [cardiacResult, setCardiacResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState({ diabetes: false, cardiac: false });
  const [error, setError] = useState<string | null>(null);

  const predictDiabetes = async () => {
    setLoading({ ...loading, diabetes: true });
    setError(null);

    try {
      const response = await fetch("/api/ml/predict?type=diabetes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diabetesData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Prediction failed");
      }

      const result = await response.json();
      setDiabetesResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading({ ...loading, diabetes: false });
    }
  };

  const predictCardiac = async () => {
    setLoading({ ...loading, cardiac: true });
    setError(null);

    try {
      const response = await fetch("/api/ml/predict?type=cardio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardiacData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Prediction failed");
      }

      const result = await response.json();
      setCardiacResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading({ ...loading, cardiac: false });
    }
  };

  return (
    <div className="space-y-6 p-6 bg-slate-950 text-slate-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">ML Prediction API Demo</h2>
        <p className="text-sm text-slate-400">
          This component demonstrates how to call the ML inference service from the Next.js frontend.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
          ⚠️ Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diabetes Prediction */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-teal-400" size={20} />
            <h3 className="text-lg font-semibold">Diabetes/Metabolic Risk</h3>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Glucose (mg/dL)</label>
              <input
                type="number"
                value={diabetesData.glucose}
                onChange={(e) =>
                  setDiabetesData({ ...diabetesData, glucose: parseFloat(e.target.value) })
                }
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">BMI</label>
              <input
                type="number"
                value={diabetesData.bmi}
                onChange={(e) =>
                  setDiabetesData({ ...diabetesData, bmi: parseFloat(e.target.value) })
                }
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Age</label>
              <input
                type="number"
                value={diabetesData.age}
                onChange={(e) =>
                  setDiabetesData({ ...diabetesData, age: parseInt(e.target.value) })
                }
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Blood Pressure (mmHg)</label>
              <input
                type="number"
                value={diabetesData.bp}
                onChange={(e) =>
                  setDiabetesData({ ...diabetesData, bp: parseFloat(e.target.value) })
                }
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              />
            </div>
          </div>

          <button
            onClick={predictDiabetes}
            disabled={loading.diabetes}
            className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading.diabetes ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Predicting...
              </>
            ) : (
              "Predict Risk"
            )}
          </button>

          {diabetesResult && (
            <div className="mt-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Risk Score</span>
                <span className="text-2xl font-bold text-teal-400">
                  {diabetesResult.risk_score}%
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Risk Level</span>
                <span
                  className={`text-sm font-bold px-2 py-1 rounded ${
                    diabetesResult.risk_level === "High"
                      ? "bg-rose-500/10 text-rose-400"
                      : diabetesResult.risk_level === "Moderate"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {diabetesResult.risk_level}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{diabetesResult.disclaimer}</p>
            </div>
          )}
        </div>

        {/* Cardiac Prediction */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="text-rose-400" size={20} />
            <h3 className="text-lg font-semibold">Cardiovascular Risk</h3>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Age</label>
              <input
                type="number"
                value={cardiacData.age}
                onChange={(e) =>
                  setCardiacData({ ...cardiacData, age: parseInt(e.target.value) })
                }
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Systolic BP (mmHg)</label>
              <input
                type="number"
                value={cardiacData.systolic_bp}
                onChange={(e) =>
                  setCardiacData({ ...cardiacData, systolic_bp: parseFloat(e.target.value) })
                }
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Cholesterol (mg/dL)</label>
              <input
                type="number"
                value={cardiacData.cholesterol}
                onChange={(e) =>
                  setCardiacData({ ...cardiacData, cholesterol: parseFloat(e.target.value) })
                }
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Resting HR (bpm)</label>
              <input
                type="number"
                value={cardiacData.resting_hr}
                onChange={(e) =>
                  setCardiacData({ ...cardiacData, resting_hr: parseFloat(e.target.value) })
                }
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              />
            </div>
          </div>

          <button
            onClick={predictCardiac}
            disabled={loading.cardiac}
            className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading.cardiac ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Predicting...
              </>
            ) : (
              "Predict Risk"
            )}
          </button>

          {cardiacResult && (
            <div className="mt-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Risk Score</span>
                <span className="text-2xl font-bold text-rose-400">
                  {cardiacResult.risk_score}%
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Risk Level</span>
                <span
                  className={`text-sm font-bold px-2 py-1 rounded ${
                    cardiacResult.risk_level === "High"
                      ? "bg-rose-500/10 text-rose-400"
                      : cardiacResult.risk_level === "Moderate"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {cardiacResult.risk_level}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{cardiacResult.disclaimer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

