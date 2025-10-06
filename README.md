# SubHealthAI: Early Detection Before Diagnosis

SubHealthAI is an **AI-powered preventive health project currently in development**.  
Its purpose is to analyze wearable and lifestyle data to identify **early warning signals** and **subclinical patterns** that often go unnoticed in traditional healthcare.  
The goal is not to provide a medical diagnosis, but to **support physicians today** with a long-term vision of **empowering individuals under physician oversight** by surfacing trends that may warrant preventive attention.

---

### Why this matters
- Chronic diseases account for almost **90% of U.S. healthcare spending** ($4.1 trillion annually).  
- Many conditions begin with **silent inflammation or early dysfunctions** that existing diagnostic tools miss.  
- By offering physicians and eventually individuals a clearer view of these early risk patterns,  
SubHealthAI has the potential to lower long-term costs and improve health outcomes.  
- All development follows a **privacy-first design** and will align with **HIPAA and FDA digital health guidelines** during clinical testing.

---

## 🔍 What SubHealthAI Actually Does
Most wearable apps today provide raw metrics (HR, HRV, steps, sleep) in isolation.
They rarely integrate these into meaningful health patterns or long-term risk insights.

SubHealthAI is different. It provides a **structured "early warning" layer** on top of wearable and lifestyle data:

1. **Cross-signal integration**  
   - Combines multiple inputs (HRV decline, rising resting HR, accumulated sleep debt, activity instability).  
   - Surfaces dysfunction patterns that single-device apps cannot reveal.

2. **Subclinical risk flags (not diagnosis)**  
   - Generates explainable “early warning flags” such as possible inflammation risk or metabolic strain.  
   - Each flag includes supporting rationale and confidence scoring.

3. **Longitudinal tracking**  
   - Analyzes rolling 7/30/90-day trends instead of one-night snapshots.  
   - Captures slow-moving dysfunctions and reduces false positives.

4. **Multimodal roadmap**  
   - Now (MVP): wearable + lifestyle inputs.  
   - Future: optional patient-provided lab results (e.g., CRP, HbA1c, vitamin D) to increase precision.

5. **Clinician-ready outputs**  
   - Weekly plain-language notes for users.  
   - One-tap PDF/Email reports with tables, charts, and citations designed for physicians.

By sitting between raw wearable data and clinical diagnosis, **SubHealthAI fills a critical gap**:  
Turning fragmented signals into structured, explainable insights that support earlier interventions.

---

## 🧩 AI & Explainability Layer (New)

SubHealthAI now includes a **machine learning and explainable AI pipeline** that enhances the preventive insights:

1. **Baseline Model (scikit-learn)**  
   - Detects daily deviations from a user’s personal baseline (HRV, Resting HR, Sleep, Steps).  
   - Uses robust z-score normalization and Isolation Forests to compute a non-diagnostic risk score.  

2. **Forecast Model (PyTorch)**  
   - Learns time-series trends to forecast next-day risk changes.  
   - Helps visualize improvement or deterioration before symptoms appear.  

3. **Explainability (SHAP + Linear Surrogates)**  
   - Generates feature importance visuals showing *why* the AI highlighted a risk.  
   - Each explanation translates into plain English on the dashboard via the **“Why this score?”** modal.  
   - Lawyers, clinicians, or reviewers can easily interpret risk factors without technical background.

4. **Risk Scores Table (Supabase)**  
   - Stores daily risk outputs with version tracking and full audit logs.  
   - Includes rationale, z-scores, and disclaimers to ensure transparency and compliance.  

---

## 🚀 What We’re Building (MVP)
- **Data ingestion** from wearables, lifestyle tracking, and behavioral inputs  
- **Signal flags**: rule-based indicators (e.g., sleep debt, HRV decline, elevated resting HR)  
- **AI-generated weekly note**: plain-language report summarizing risks and trends  
- **Clinician export**: one-tap PDF/email report with tables, charts, and references  
- **Audit logging**: system-wide transparency for trust and reliability  

This repository contains the **starter codebase**, database schema, and demo UI for the MVP.

---

## 🩺 User-Friendly Dashboard (Explainable UI)

The new dashboard focuses on **clarity for clinicians, reviewers, and regulators**:

- **Interactive Risk Card:** Displays current risk % with color-coded badge (green, yellow, red).  
- **Sparkline Chart:** Visualizes the risk trend over time.  
- **Explainability Modal (“Why this score?”):**  
  - Lists plain-language reasons (e.g., “Resting Heart Rate higher than baseline — contributes to higher risk”).  
  - Includes AI-generated visual (SHAP plot or fallback bar chart).  
  - Adds a clear, non-diagnostic disclaimer.  

All text is structured for **regulatory readability**, ensuring transparency and comprehension for  
attorneys, clinicians, and adjudicators reviewing preventive AI systems.

---

## 🖼 Architecture

![SubHealthAI Architecture](./docs/subhealthai_architecture.png)

```text
[Wearables APIs]   [Lifestyle Inputs]
        │                   │
        ▼                   ▼
     Data Ingestion (Cron jobs, ETL)
                │
                ▼
        Supabase Database
   (users, events, metrics, flags)
                │
                ▼
   Flag Computation Engine (rule-based)
                │
                ▼
   AI Layer (LLM wrappers for weekly note)
                │
                ▼
    Reports → Dashboard / PDF / Email
```
---

You can test SubHealthAI locally in 60 seconds:

1. Start the dev server:
   ```bash
   npm run dev
   ```
2. Open http://localhost:3000/ingest
3. Upload the sample file docs/sample.csv
4. Visit http://localhost:3000/dashboard → metrics & charts update.
5. Click Run Daily Cron (Demo) → flags + weekly note generated.
6. Open http://localhost:3000/weekly → weekly summary.
7. Download PDF from http://localhost:3000/api/report 

⚠️ Demo only - no PHI, not a medical device.

---

## 🛠 Tech Stack
**Frontend (App Layer)**  
- Next.js (App Router), React, TypeScript  
- TailwindCSS + shadcn/ui for responsive, clinician-friendly UI
- Risk dashboard with sparkline + “Why this score?” modal (`risk-panel.tsx`, `ExplainModal.tsx`, `RiskSpark.tsx`)  
- API endpoints:  
  - `/api/risk/explain` → human-readable reasoning + disclaimer  
  - `/api/report` → clinician PDF including AI risk summary

**Backend & Database**  
- Supabase (Postgres with Row-Level Security, Auth, Storage)  
- Supabase Edge Functions (Deno/TypeScript) for ingestion and daily rollups  
- Python Worker for analytics and ML pipelines (decoupled from web app)  

**Data Processing & Analytics**  
- Ingestion: wearable APIs, lifestyle logs, CSV imports  
- Baseline deviation analysis (sleep, HR, HRV, steps)  
- Hybrid rules + ML scoring engine (Python):  
  - scikit-learn → anomaly detection, clustering, baseline modeling  
  - PyTorch → time-series forecasting and risk scoring

  - **Explainable ML models (Python / Supabase Integration):**
  - `/ml/baseline_model.py` → anomaly detection and personalized baseline risk  
  - `/ml/forecast_model.py` → time-series forecasting of risk changes  
  - `/ml/explainability.py` → SHAP visualizations and linear surrogate fallback  
  - Outputs written to `risk_scores` table (auditable, versioned)
  

**AI & NLP Integration**  
- LLMs (OpenAI GPT, Hugging Face transformers) for plain-language weekly notes  
- Schema-enforced outputs with disclaimers and rationales stored in audit logs  
- Compliance guardrails: prevent diagnostic claims, enforce structured reporting  

**Reporting & Export**  
- react-pdf / pdf-lib for clinician-ready exports  
- Transactional email delivery (Postmark, SendGrid, Supabase Functions)  

**Security & Compliance**  
- Row-Level Security on all user data  
- Audit logging of all automated actions (`audit_log` table)  
- HIPAA/FDA alignment by design (encryption, disclaimers, transparency)  

---

## 🗂 Database Schema
Key tables in `/supabase/schema.sql`:
- `users` → profiles and auth linkage  
- `events_raw` → ingested wearable + lifestyle data  
- `metrics` → computed metrics (sleep, HR, HRV, steps, etc.)  
- `flags` → rule-based signals indicating early risk  
- `weekly_notes` → AI-generated summaries for end users  
- `audit_log` → system-wide transparency and accountability  

---

## 📈 Roadmap
**✅ MVP (Completed)**  
- [x] Project scaffold: Next.js + Supabase + TailwindCSS  
- [x] Core database schema (`users`, `events_raw`, `metrics`, `flags`, `weekly_notes`, `audit_log`)  
- [x] Rule-based flagging engine (Python + TypeScript) with rationale strings  
- [x] CSV ingest + rollup pipeline for reproducible demo data  
- [x] Charts and metrics dashboard (sleep, HRV, steps trends)  
- [x] Cron API route for daily flagging + weekly note generation  
- [x] Clinician-ready PDF export with AI-generated summaries  
- [x] **Baseline & Forecast ML models (scikit-learn + PyTorch)**  
- [x] **Explainability layer (SHAP + fallback linear model)**  
- [x] **Risk scoring table + Supabase integration**  
- [x] **Interactive Risk Dashboard (sparkline + “Why this score?” modal)**  
- [x] Nightly GitHub Actions for automated ML cron jobs  

**🚧 Phase 2 (In Progress)**  
- [ ] Integrate risk summaries into weekly PDF with disclaimer block  
- [ ] Add Admin “Recompute” endpoint (manual ML re-run via API)  
- [ ] Supabase Storage upload for SHAP/fallback visuals + display in dashboard modal  
- [ ] Transactional email delivery (send report to clinician)  
- [ ] Expanded audit logs for ML model transparency & compliance  

**🔬 Research & Clinical Roadmap (2026+)**  
- [ ] Wearable API integrations (Fitbit, Oura, Garmin, Apple Health)  
- [ ] Personalized baseline deviation engine (adaptive thresholds per user)  
- [ ] Multimodal risk scoring with lab + lifestyle data (CRP, HbA1c, Vitamin D)  
- [ ] Embedding models for cross-signal correlation (HRV ↔ sleep debt ↔ recovery lag)  
- [ ] HL7 FHIR integration for clinician/EHR interoperability  
- [ ] Pilot testing with clinical advisors under HIPAA/FDA digital health alignment  
- [ ] Patent filing: **“System and Method for Subclinical Risk Flagging and Explainable AI Summaries”** 

---

## 🔮 Future Integrations

SubHealthAI is designed to **extend, not compete with, wearable platforms**.  
Our value is in **cross-signal integration, explainable early-warning flags, and compliance guardrails**.

Planned integrations include:
- **Wearables**: Fitbit, Oura, Apple Health, WHOOP  
- **Lab inputs**: CRP, HbA1c, Vitamin D (optional patient-provided)  
- **EHR interoperability**: HL7 FHIR APIs for clinical pilots  
- **ML models**: anomaly detection, embeddings, multimodal risk scoring

---

## 📄 Whitepaper  
See `/docs/whitepaper.md` for the full research framing:  
- U.S. healthcare burden of chronic illness  
- Gaps in early detection and subclinical dysfunction  
- SubHealthAI’s proposed solution architecture  
- Methods, safeguards, and compliance framing  
- Roadmap for clinical validation and future deployment
  
---

## 🤝 How to Contribute
We welcome collaborators in:  
- Preventive medicine, public health, and clinical research  
- AI/ML modeling (time-series, embeddings, anomaly detection)  
- Full-stack engineering (Next.js, Supabase, data pipelines)  

---

## 📬 Contact
- Founder: **Mohd Shaarif Khan**  
- Email: **shaarifkhan12@gmail.com**
- GitHub: **https://github.com/Shaarax**  
- LinkedIn: **www.linkedin.com/in/mohdshaarif-khan**  

---

> ⚠️ **Disclaimer**: SubHealthAI is a research and development project.  
> It is **not a medical device** and does not provide medical advice.  
> All future development will follow **HIPAA-compliant, privacy-first design**  
> and align with FDA digital health guidelines.  
> Always consult qualified healthcare professionals for medical decisions.
