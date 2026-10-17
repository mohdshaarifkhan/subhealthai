-- Ingestion lineage + versioned daily features + drift engine v1 outputs.
--
-- Additive and idempotent: only adds columns/tables (IF NOT EXISTS). Existing
-- tables and the legacy `metrics` table are untouched.
--
-- Data flow:
--   ingest_batches (one per uploaded export / sync)
--     → events_raw (immutable canonical observations; deduped on
--                   user_id, source, metric, event_time)
--     → daily_features (versioned derivation)
--     → drift_runs → drift_signal_days + drift_days (versioned engine outputs)
--
-- Writes happen server-side with the service role after the caller's session
-- has been resolved; authenticated users can only SELECT their own rows.

-- 1) Ingest batches: provenance for every upload ---------------------------
CREATE TABLE IF NOT EXISTS public.ingest_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  parser_version text NOT NULL,
  file_name text,
  file_sha256 text,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  rejected jsonb NOT NULL DEFAULT '{}'::jsonb,
  unrecognized jsonb NOT NULL DEFAULT '[]'::jsonb,
  range_from timestamptz,
  range_to timestamptz,
  inserted_count integer,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ingest_batches_user_created
  ON public.ingest_batches (user_id, created_at DESC);

-- 2) events_raw: canonical observation columns -----------------------------
ALTER TABLE public.events_raw
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS tz_offset_minutes integer,
  ADD COLUMN IF NOT EXISTS local_day date,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.ingest_batches(id) ON DELETE SET NULL;

-- 3) Versioned daily features ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_features (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  metric text NOT NULL,
  value double precision NOT NULL,
  unit text NOT NULL,
  n_obs integer NOT NULL,
  sources text[] NOT NULL DEFAULT '{}',
  derivation_version text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day, metric, derivation_version)
);

-- 4) Drift engine runs -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drift_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  engine_version text NOT NULL,
  derivation_version text NOT NULL,
  params jsonb NOT NULL,
  input_hash text NOT NULL,
  day_from date,
  day_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Bumped when an identical run is reused, so "latest" = most recently computed inputs.
  last_used_at timestamptz NOT NULL DEFAULT now(),
  -- Same inputs + same engine = same run (reproducibility / idempotency).
  UNIQUE (user_id, engine_version, derivation_version, input_hash)
);
CREATE INDEX IF NOT EXISTS idx_drift_runs_user_last_used
  ON public.drift_runs (user_id, last_used_at DESC);

CREATE TABLE IF NOT EXISTS public.drift_signal_days (
  run_id uuid NOT NULL REFERENCES public.drift_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  metric text NOT NULL,
  system text NOT NULL,
  value double precision NOT NULL,
  baseline_median double precision,
  baseline_scale double precision,
  baseline_n integer NOT NULL,
  z double precision,
  adverse_z double precision,
  ewma_adverse_z double precision,
  status text NOT NULL
    CHECK (status IN ('insufficient_baseline', 'within_range', 'deviation', 'sustained')),
  PRIMARY KEY (run_id, day, metric)
);

CREATE TABLE IF NOT EXISTS public.drift_days (
  run_id uuid NOT NULL REFERENCES public.drift_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  status text NOT NULL
    CHECK (status IN ('insufficient_data', 'stable', 'elevated', 'sustained')),
  composite double precision,
  signals_assessed integer NOT NULL,
  contributions jsonb NOT NULL DEFAULT '[]'::jsonb,
  systems jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_id, day)
);
CREATE INDEX IF NOT EXISTS idx_drift_days_user_day ON public.drift_days (user_id, day);

-- 5) RLS: users read only their own rows; no client writes -----------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ingest_batches', 'daily_features', 'drift_runs', 'drift_signal_days', 'drift_days']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)',
      t || '_select_own', t
    );
  END LOOP;
END $$;
