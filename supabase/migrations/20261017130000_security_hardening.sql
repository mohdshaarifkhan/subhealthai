-- Security hardening: close public (anon-key) access to health data.
--
-- Found 2026-10-17 via the Supabase security advisor:
--   * 16 public tables had RLS disabled. Because the anon key ships in every
--     browser, anyone could read users (emails), events_raw, audit_log,
--     medications, risk_scores, weekly_notes, ... and INSERT into events_raw.
--   * 12 views were SECURITY DEFINER, bypassing RLS on the tables beneath them
--     (e.g. metrics via v_metrics_daily / metrics_for_ml).
--   * 3 materialized views were readable by anon/authenticated.
--
-- Model after this migration:
--   * Server routes use the service role (bypasses RLS) and always resolve the
--     acting user from the session first. That path is unchanged.
--   * anon: no access to user data.
--   * authenticated: read-only access to the caller's own rows.
--
-- Identity bridge: the app historically resolves its user row by EMAIL
-- (lib/getCurrentAppUserId.ts), and legacy rows can have
-- public.users.id <> auth.uid(). New sign-ups get id = auth.uid() (registration
-- trigger). public.app_user_ids() covers both so policies match either way.
--
-- Idempotent: safe to re-run.

-- 1) Helper: app user ids belonging to the current auth session -------------
CREATE OR REPLACE FUNCTION public.app_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id
  FROM public.users u
  WHERE auth.uid() IS NOT NULL
    AND (u.id = auth.uid() OR lower(u.email) = lower(auth.jwt() ->> 'email'))
$$;
REVOKE ALL ON FUNCTION public.app_user_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_user_ids() TO authenticated, service_role;

-- 2) Enable RLS on every previously-open table -----------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'events_raw', 'flags', 'risk_scores', 'weekly_notes', 'medications', 'allergies',
    'dataset_map', 'model_config',
    'metric_meta', 'model_registry', 'engine_metadata',
    'audit_log', 'job_runs', 'export_audit', 'evidence_bundles'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- 3) Policies ----------------------------------------------------------------
-- 3a) users: read your own row (matched by id or by verified session email).
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.app_user_ids()));

-- 3b) User-owned data: read your own rows only. Writes stay server-side.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'events_raw', 'flags', 'risk_scores', 'weekly_notes', 'medications', 'allergies',
    -- tables created by 20261017120000_ingestion_and_drift_v1 (re-pointed to the helper)
    'ingest_batches', 'daily_features', 'drift_runs', 'drift_signal_days', 'drift_days'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id IN (SELECT public.app_user_ids()))',
        t || '_select_own', t
      );
    END IF;
  END LOOP;
END $$;

-- 3c) Config tables keyed by optional user_id: global rows (NULL) + your own.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dataset_map', 'model_config']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own_or_global', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id IS NULL OR user_id IN (SELECT public.app_user_ids()))',
        t || '_select_own_or_global', t
      );
    END IF;
  END LOOP;
END $$;

-- 3d) Non-personal reference tables: readable by signed-in users.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['metric_meta', 'model_registry', 'engine_metadata']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_authenticated', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t || '_select_authenticated', t);
    END IF;
  END LOOP;
END $$;

-- 3e) Internal tables (audit_log, job_runs, export_audit, evidence_bundles):
--     RLS on with NO policies, so service role only. Intentionally nothing here.

-- 4) Views: enforce the querying user's RLS, not the view owner's ----------
DO $$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'v_risk_scores_compat', 'v_metrics_daily', 'v_eval_reliability', 'v_eval_volatility_series',
    'labels_daily', 'v_shap_series', 'v_shap_topk', 'v_metrics_features', 'risk_scores_cal',
    'metrics_for_ml', 'v_risk_timeline', 'v_metrics_labeled'
  ]
  LOOP
    IF to_regclass('public.' || v) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v);
    END IF;
  END LOOP;
END $$;

-- 5) Materialized views cannot carry RLS: remove API access entirely --------
DO $$
DECLARE m text;
BEGIN
  FOREACH m IN ARRAY ARRAY['metrics_samsung_v1', 'metrics_wesad_v1', 'mv_explain_top4']
  LOOP
    IF to_regclass('public.' || m) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', m);
    END IF;
  END LOOP;
END $$;

-- 6) Pin search_path on existing functions (advisor: function_search_path_mutable)
DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
  END IF;
  IF to_regprocedure('public.feature_baseline_stats(uuid,date,integer)') IS NOT NULL THEN
    ALTER FUNCTION public.feature_baseline_stats(uuid, date, integer) SET search_path = public, pg_temp;
  END IF;
  IF to_regprocedure('public.get_dataset_summary(text)') IS NOT NULL THEN
    ALTER FUNCTION public.get_dataset_summary(text) SET search_path = public, pg_temp;
  END IF;
END $$;
