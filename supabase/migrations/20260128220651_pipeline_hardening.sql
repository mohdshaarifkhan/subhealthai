-- Gap 1: events_raw dedupe (natural key)
CREATE UNIQUE INDEX IF NOT EXISTS ux_events_raw_dedupe
ON public.events_raw (user_id, source, metric, event_time);

-- Gap 2: risk_scores status + confidence
ALTER TABLE public.risk_scores
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'computed',
ADD COLUMN IF NOT EXISTS data_confidence numeric;

ALTER TABLE public.risk_scores
ADD CONSTRAINT IF NOT EXISTS risk_scores_status_check
CHECK (status IN ('computed','insufficient_data','stale','error'));

ALTER TABLE public.risk_scores
ADD CONSTRAINT IF NOT EXISTS risk_scores_confidence_check
CHECK (data_confidence IS NULL OR (data_confidence >= 0 AND data_confidence <= 1));

-- Gap 3: job_runs table
CREATE TABLE IF NOT EXISTS public.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  rows_processed integer,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.job_runs
ADD CONSTRAINT IF NOT EXISTS job_runs_status_check
CHECK (status IN ('running','completed','failed'));

CREATE INDEX IF NOT EXISTS idx_job_runs_type_started
ON public.job_runs (job_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_runs_status
ON public.job_runs (status);
