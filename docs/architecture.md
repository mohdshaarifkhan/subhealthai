# SubHealthAI – Architecture (MVP)

## Data Flow
1. **Ingest → `events_raw`** (wearables, lifestyle logs, CSV)
2. **Daily Rollup → `metrics`** (HRV, RHR, sleep minutes, steps)
3. **Flagging Engine → `flags`** (rules now; ML next)
4. **Weekly Notes (LLM) → `weekly_notes`** (explainable summaries with guardrails)
5. **Audit Trail → `audit_log`** (transparency for every automated action)

**System Flow (at a glance)** 
events_raw → metrics → flags → weekly_notes → exports (PDF/email) → audit_log

## Jobs / Scripts
- `scripts/load_mock_metrics.py` – seed/demo data
- `scripts/flagging_engine.py` – Python rule-based flags
- `scripts/compute_flag.ts` – TypeScript parity of rule-based flags
- (Planned) Supabase Edge Function (cron) – nightly rollup `events_raw → metrics`

## Core Tables
- `users`
- `events_raw`
- `metrics`
- `flags`
- `weekly_notes`
- `audit_log`

## Roadmap Extensions
- Wearable API integrations (Fitbit, Oura, Apple Health, WHOOP)  
  → SubHealthAI ingests device metrics but focuses on **cross-signal integration and explainable early warning flags**, not duplicating device dashboards.  
- ML models for anomaly detection & embeddings  
- Optional lab inputs (CRP, HbA1c, Vitamin D)  
- FHIR/EHR integration for clinical pilots