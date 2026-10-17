# SubHealthAI — Session Log & Handoff

Purpose: resume work smoothly across sessions. **Read "Current status & next up"
first.** Each session appends a dated entry under "Session history" (newest
first) and updates the status section. Keep entries factual — commits, decisions,
and open items — not narrative.

---

## Current status & next up

- **Active branch:** `feature/productEnhancement`. `main` untouched.
- **Workflow rule (do not violate):** all work stays on this branch. **No PR, no
  merge to `main`** until the entire build is finished and manually tested.
- **Product direction (2026-10-17):** non-diagnostic drift monitoring. Signals →
  per-system drift vs the user's own baseline → drivers → n-of-1 experiments →
  "bring this to your doctor" escalation. **Never name a disease or output a
  disease probability.** Population disease models were removed.
- **Real-data pipeline (new):** export upload → `ingest_batches` + `events_raw`
  (canonical observations, deduped) → `daily_features` (`daily-v1`) →
  `drift_runs` / `drift_signal_days` / `drift_days` (`drift-v1`).
  Code: `lib/ingest/*`, `lib/analytics/{daily,drift}.ts`, `lib/pipeline/index.ts`.
  Routes: `POST /api/ingest` (session-only), `POST /api/pipeline/run`,
  `GET /api/drift`. CLI: `npm run ingest:export`.
- **Tests:** `npm test` → 43 passed, 6 skipped (live-RLS suite). `tsc` clean,
  `npm run build` passes (needs Supabase env vars present).
  Persistence was verified against real Postgres + PostgREST via
  `scripts/dev/e2e_pipeline.ts` (not part of `npm test`).

### Next up
1. **Apply migration** `20261017120000_ingestion_and_drift_v1.sql` (plus the
   still-pending `20260615120000_user_registration_flow.sql`) to Supabase.
2. **Run Shaarif's real Samsung Health export:** first `--dry-run` to see
   unrecognized files/columns, then adjust `lib/ingest/samsung.ts` mappings
   (HRV and the UTC+time_offset assumption are unverified against a real export).
3. **Disease-language sweep** of what's left: `lib/risk/derive.ts` ("HbA1c is in the
   diabetes range"), copilot "Prediabetes Pattern", `/api/dashboard`
   "Prediabetes-range HbA1c", `condition_risk` writes.
4. Point the dashboard at `/api/drift` (UI work, after the backend).
5. Aggregator integration (Open Wearables recommended) behind an adapter interface;
   Chronos-2 / TimesFM 2.5 expected-range layer; habit logging; n-of-1 experiments.

### Blocking decisions
- **Wearable device / aggregator:** Open Wearables (self-hosted, MIT) vs Terra.
  Fitbit legacy Web API shuts down Oct 30, 2026 → Google Health API. Strava:
  do not integrate (API terms ban AI/ML use).
- **PR/merge:** deferred by policy.

### Action items for the user (when relevant)
- `supabase db push` for both pending migrations.
- Set **`CRON_SECRET`** in env/Vercel (`/api/cron` fails closed without it).
- Large exports: use the CLI (web upload capped at 4 MB, serverless body limit).

### Known open findings (not yet addressed)
- **C2:** OAuth callback uses unsigned `state`.
- **H2:** wearable OAuth/token layer (`lib/oauth.ts`, `lib/deviceAccounts.ts`,
  `lib/queue.ts`) is stubbed. Replace via aggregator.
- **`/api/weekly-note`:** unauthenticated.
- Medium: demo-mode leakage, audit_log PII hygiene, `public.users` RLS disabled.
- `lib/risk/fuse.ts`: hand-set weights; missing inputs default to 0 (treated as healthy).
  Superseded by drift engine; remove when the dashboard moves to `/api/drift`.

---

## Session history

### 2026-10-17: Real-data pipeline v1 + disease-model removal
- Removed population disease models (diabetes/cardio classifiers, `/api/ml/predict*`,
  `/api/clinical/summary`, "Pima & Cleveland" UI/report text). `getClinicalSummary`
  returns no disease cards.
- **Security:** `/api/ingest` was unauthenticated and wrote into any account by
  `email` using the service role. It is now session-only. Tests in
  `tests/security/ingest-auth.test.ts`.
- New canonical ingestion (`Observation` type, Samsung export zip parser, long-CSV
  parser) + migration (lineage columns, `ingest_batches`, `daily_features`, drift tables, read-own RLS).
- Fixed: the old Python Samsung loader used the export-file timestamp as the
  measurement day (all history collapsed into one day). The new parser uses per-row times.
- Drift engine v1: trailing-window robust baseline (median/MAD with floors),
  adverse-signed z, EWMA persistence, sufficiency gating, exact additive attribution.
- Decision: deterministic engine is authoritative; GRU/IsolationForest/SHAP-on-proxy
  are not used by the new pipeline (circular proxy target).

### 2026-07-11 — Security remediation + wearable/analytics spec
Branch `feature/productEnhancement` (created off `main`). Nothing on `main`.

**Delivered (commits, oldest→newest):**
- `3560330` Registration flow fix + Phase-0 audit baseline. Root cause: no
  `auth.users → public.users` provisioning + signup was a disabled stub. Added
  trigger migration (`id = auth.uid()`, user_profile stub, audit row) + real
  signup form (email-confirmation-aware).
- `4d6b37b` Vitest harness + `tests/security/*` (proves C1 IDOR; skippable live
  RLS isolation suite).
- `748688e` **C1** — `requireUser` (13 write/ingest routes) now session-based.
- `d669ecc` **C1** — `resolveOwnUserId` for 19 read routes; report route switched
  from cookieless self-fetch to direct `buildRealUserDashboard`.
- `640bd34` **H3** — copilot routes resolve acting user from session
  (`resolveActingUser`, demo passthrough).
- `a414550` Copilot data layer restored — forward session cookies on
  server-to-server fetches (`lib/server/forwardCookies.ts`).
- `9f3cb5b` **C3** — `/api/cron` gated behind `CRON_SECRET` (fails closed).
- `6c905e6` `docs/wearable-derived-metrics.md` spec + README terminology/roadmap
  (provider-native attribution; candidate-digital-biomarker terminology).
- `edd7bb9` Ratified deterministic-analytics-first decision (README Phase 3).

**Key decisions:**
- Authorization fixed by session (never `?user=`); demo profiles pass through
  each route's pre-resolution branch to preserve the public NIW demo.
- Deterministic, versioned baseline/change-point/attribution core is
  authoritative; GRU + Isolation Forest stay complementary. (Memory:
  `analytics-deterministic-first`.)
- Samsung is native-only (no web API) — flagged; not built as a fake web OAuth.

**Left off:** awaiting device decision and choice of first build target
(foundation vs. analytics core). Branch pushed; no PR.
