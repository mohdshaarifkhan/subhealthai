-- Pipeline hardening migration
-- Gap 1: events_raw dedupe (natural key)
CREATE UNIQUE INDEX IF NOT EXISTS ux_events_raw_dedupe
ON public.events_raw (user_id, source, metric, event_time);

-- Gap 2: risk_scores status + confidence
ALTER TABLE public.risk_scores
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'computed',
  ADD COLUMN IF NOT EXISTS data_confidence numeric;

-- Add constraints (Postgres does NOT support "ADD CONSTRAINT IF NOT EXISTS")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'risk_scores_status_check'
      AND conrelid = 'public.risk_scores'::regclass
  ) THEN
    ALTER TABLE public.risk_scores
      ADD CONSTRAINT risk_scores_status_check
      CHECK (status IN ('computed','insufficient_data','stale','error'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'risk_scores_confidence_check'
      AND conrelid = 'public.risk_scores'::regclass
  ) THEN
    ALTER TABLE public.risk_scores
      ADD CONSTRAINT risk_scores_confidence_check
      CHECK (data_confidence IS NULL OR (data_confidence >= 0 AND data_confidence <= 1));
  END IF;
END $$;

-- Gap 3: job_runs table
CREATE TABLE IF NOT EXISTS public.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL, -- 'daily_metrics', 'risk_scoring', 'shap_compute', 'weekly_notes'
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  rows_processed integer,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'job_runs_status_check'
      AND conrelid = 'public.job_runs'::regclass
  ) THEN
    ALTER TABLE public.job_runs
      ADD CONSTRAINT job_runs_status_check
      CHECK (status IN ('running','completed','failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_runs_type_started
ON public.job_runs (job_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_runs_status
ON public.job_runs (status);
