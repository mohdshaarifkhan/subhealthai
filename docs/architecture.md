# SubHealthAI – Architecture (MVP + ML Extension)

This document describes the **data flow, schema, and system jobs** of the SubHealthAI MVP, 
illustrating how wearable and lifestyle data moves through ingestion, analysis, AI summarization, 
risk modeling, and explainability pipelines.

---

## Data Flow
1. **Ingest → `events_raw`** (wearables, lifestyle logs, CSV)
2. **Daily Rollup → `metrics`** (HRV, RHR, sleep minutes, steps)
3. **Flagging Engine → `flags`** (rule-based risk signals)
4. **Weekly Notes (LLM) → `weekly_notes`** (plain-language summaries)
5. **Risk Modeling (Python ML) → `risk_scores`** (scikit-learn + PyTorch)
6. **Explainability Outputs → `explainability_images`** (SHAP & fallback plots)
7. **Audit Trail → `audit_log`** (transparency for all automated actions)

**System Flow (at a glance)**  
- events_raw → metrics → flags → weekly_notes → risk_scores → explainability_images → audit_log

---

## Jobs / Scripts
- `scripts/load_mock_metrics.py` – seed/demo data
- `scripts/flagging_engine.py` – Python rule-based flag computation
- `scripts/compute_flag.ts` – TypeScript parity version
- `ml/baseline_model.py` – anomaly detection using scikit-learn
- `ml/forecast_model.py` – time-series GRU forecaster (PyTorch)
- `ml/explainability.py` – SHAP + Ridge fallback explainability
- **Supabase Cron / GitHub Action** – nightly rollup & risk model execution

---

## Core Tables
- `users` — user profiles  
- `events_raw` — ingested raw wearable + lifestyle data  
- `metrics` — rolled-up daily metrics (sleep, HRV, HR, steps)  
- `flags` — rule-based early warning signals  
- `weekly_notes` — AI-generated summaries (LLM outputs)  
- `risk_scores` — ML risk predictions per user per day  
- `explainability_images` — stored SHAP plots and fallback feature bars  
- `audit_log` — complete trace of AI and ML actions  

---

## Roadmap Extensions
- **Wearable APIs:** Fitbit, Oura, Garmin, Apple Health, WHOOP  
- **Optional lab inputs:** CRP, HbA1c, Vitamin D  
- **ML roadmap:** anomaly detection, GRU forecasting, multimodal fusion  
- **EHR integration:** HL7 FHIR APIs for clinical interoperability  
- **Federated learning:** privacy-preserving personalization  
- **Compliance:** HIPAA alignment, explainability tracking, versioned models  