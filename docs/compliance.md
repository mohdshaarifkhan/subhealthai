# SubHealthAI – Compliance & Safety (MVP)

⚠️ **Disclaimer:** SubHealthAI is not a medical device and does not provide diagnoses.  
It provides preventive, educational insights and early-warning flags. It does **not** diagnose, treat, or cure conditions.

## Data Protection
- Supabase Postgres with Row-Level Security (per-user isolation)
- TLS in transit; provider encryption at rest
- Service role keys limited to server/worker jobs

## Privacy & Transparency
- Minimal data required (HRV, RHR, sleep, steps)
- All automated actions logged in `audit_log` (who/what/when/why)
- Export/delete on request (data portability)

## LLM Safety Guardrails
- Weekly notes use schema-constrained prompts: **Signals → Flags → Interpretation → References → Disclaimer**
- Medical disclaimer injected on every report; no diagnostic claims
- Confidence tags + references to source signals

## Regulatory Alignment (Planned)
- Designed to follow HIPAA privacy and security principles
- Export formats and workflows modeled on FDA digital health guidelines
- Clinical deployment contingent on IRB approval and regulatory validation

## Intended Use
- Early detection *support* via pattern discovery; complements clinician judgment
- Suitable for wellness/research contexts; not a substitute for professional care
