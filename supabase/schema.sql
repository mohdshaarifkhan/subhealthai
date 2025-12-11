-- SubHealthAI schema (MVP)

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- 2) events_raw: raw wearable/lifestyle events
create table if not exists public.events_raw (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source text not null, -- e.g., 'fitbit', 'apple', 'manual'
  metric text not null, -- e.g., 'steps', 'hr', 'hrv', 'sleep_minutes'
  value numeric not null,
  event_time timestamptz not null,
  meta jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now()
);
create index if not exists idx_events_user_time on public.events_raw(user_id, event_time);

-- 3) metrics: daily aggregates
create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  day date not null,
  steps int,
  sleep_minutes int,
  hr_avg numeric,
  hrv_avg numeric,
  rhr numeric,
  updated_at timestamptz not null default now(),
  unique(user_id, day)
);

-- 4) flags: rule-based signals
create table if not exists public.flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  day date not null,
  flag_type text not null, -- 'sleep_debt' | 'low_hrv' | 'elevated_rhr' | 'sedentary' | 'unstable_schedule' | 'stress_signal'
  severity int not null check (severity between 1 and 5),
  rationale text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_flags_user_day on public.flags(user_id, day);

-- 5) weekly_notes: LLM output and structured summary
create table if not exists public.weekly_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary text not null,
  recommendations text,
  sources text[],
  note_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, week_start, week_end)
);

-- 6) audit_log
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- (Optional) RLS setup guidance (enable and add policies in production)
-- alter table public.users enable row level security;
-- alter table public.events_raw enable row level security;
-- alter table public.metrics enable row level security;
-- alter table public.flags enable row level security;
-- alter table public.weekly_notes enable row level security;
-- alter table public.audit_log enable row level security;

-- ==============================
-- Table: risk_scores
-- ==============================

create table if not exists public.risk_scores (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  day date not null,
  risk_score numeric not null check (risk_score >= 0 and risk_score <= 1),
  model_version text not null,
  features jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, day, model_version)
);

create index if not exists idx_risk_scores_user_day on public.risk_scores (user_id, day);
create index if not exists idx_risk_scores_day on public.risk_scores (day);

-- ==============================
-- Table: explainability_images
-- ==============================

create table if not exists public.explainability_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  day date not null,
  img_url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists idx_explainability_images_user_day on public.explainability_images (user_id, day);

