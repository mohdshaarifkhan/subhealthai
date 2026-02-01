-- ============================================================================
-- 20260128225623_fix_critical_bugs_and_security.sql
-- Critical Bug Fixes and Security Hardening (Supabase Postgres)
-- ============================================================================

-- ============================================================================
-- 1) BUG FIX: v_metrics_daily should group by event_time, not ingested_at
-- ============================================================================
CREATE OR REPLACE VIEW "public"."v_metrics_daily" AS
SELECT
  "user_id",
  ("date_trunc"('day'::text, "event_time"))::date AS "day",
  "metric",
  avg("value") AS "value",
  "source"
FROM "public"."events_raw"
GROUP BY
  "user_id",
  (("date_trunc"('day'::text, "event_time"))::date),
  "metric",
  "source";

-- ============================================================================
-- 2) BUG FIX: baseline_versions cannot store multiple versions per signal
-- ============================================================================
DROP INDEX IF EXISTS "public"."uq_baseline_versions_user_signal";

-- ============================================================================
-- 3) SECURITY: Enable RLS on metrics + user-owned policy
-- ============================================================================
ALTER TABLE "public"."metrics" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metrics_own" ON "public"."metrics";
CREATE POLICY "metrics_own"
ON "public"."metrics"
FOR ALL
TO "authenticated"
USING ("auth"."uid"() = "user_id")
WITH CHECK ("auth"."uid"() = "user_id");

-- ============================================================================
-- 4) SECURITY: Remove overly permissive policy on explainability_images
-- ============================================================================
DROP POLICY IF EXISTS "expimg_read_admin" ON "public"."explainability_images";

-- ============================================================================
-- 5) DATA INTEGRITY: Preflight for NOT NULL user_id (fail fast)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.allergies       WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Migration blocked: public.allergies has NULL user_id rows';
  END IF;

  IF EXISTS (SELECT 1 FROM public.family_history  WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Migration blocked: public.family_history has NULL user_id rows';
  END IF;

  IF EXISTS (SELECT 1 FROM public.medications     WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Migration blocked: public.medications has NULL user_id rows';
  END IF;

  IF EXISTS (SELECT 1 FROM public.labs_basic      WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Migration blocked: public.labs_basic has NULL user_id rows';
  END IF;

  IF EXISTS (SELECT 1 FROM public.condition_risk  WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Migration blocked: public.condition_risk has NULL user_id rows';
  END IF;
END $$;

-- ============================================================================
-- 6) DATA INTEGRITY: Make user_id NOT NULL + CASCADE foreign keys
-- ============================================================================
-- allergies
ALTER TABLE "public"."allergies"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "public"."allergies"
  DROP CONSTRAINT IF EXISTS "allergies_user_id_fkey",
  ADD CONSTRAINT "allergies_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- family_history
ALTER TABLE "public"."family_history"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "public"."family_history"
  DROP CONSTRAINT IF EXISTS "family_history_user_id_fkey",
  ADD CONSTRAINT "family_history_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- medications
ALTER TABLE "public"."medications"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "public"."medications"
  DROP CONSTRAINT IF EXISTS "medications_user_id_fkey",
  ADD CONSTRAINT "medications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- labs_basic
ALTER TABLE "public"."labs_basic"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "public"."labs_basic"
  DROP CONSTRAINT IF EXISTS "labs_basic_user_id_fkey",
  ADD CONSTRAINT "labs_basic_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- condition_risk
ALTER TABLE "public"."condition_risk"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "public"."condition_risk"
  DROP CONSTRAINT IF EXISTS "condition_risk_user_id_fkey",
  ADD CONSTRAINT "condition_risk_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- ============================================================================
-- 7) DATA NORMALIZATION: Clean legacy enum-ish values BEFORE constraints
-- ============================================================================

-- 7.1 device_accounts.provider/status normalization
UPDATE public.device_accounts
SET provider = lower(btrim(provider))
WHERE provider IS NOT NULL;

UPDATE public.device_accounts
SET status = lower(btrim(status))
WHERE status IS NOT NULL;

-- Known legacy/demo statuses -> canonical
UPDATE public.device_accounts
SET status = 'active'
WHERE status = 'connected_demo';

-- Optional: map anything unknown to inactive (keeps migration unblocked)
UPDATE public.device_accounts
SET status = 'inactive'
WHERE status IS NOT NULL
  AND status NOT IN ('active','inactive','error','expired');

-- 7.2 flags.flag_type normalization + mapping (based on your actual data)
UPDATE public.flags
SET flag_type = lower(btrim(flag_type))
WHERE flag_type IS NOT NULL;

UPDATE public.flags
SET flag_type = 'stress_marker'
WHERE flag_type = 'illness_event';

UPDATE public.flags
SET flag_type = 'hrv_decline'
WHERE flag_type = 'low_hrv';

UPDATE public.flags
SET flag_type = 'rhr_elevated'
WHERE flag_type = 'elevated_rhr';

-- Extra optional mappings (safe)
UPDATE public.flags
SET flag_type = 'rhr_elevated'
WHERE flag_type IN ('rhr_high','high_rhr');

UPDATE public.flags
SET flag_type = 'hrv_decline'
WHERE flag_type IN ('hrv_drop');

UPDATE public.flags
SET flag_type = 'activity_instability'
WHERE flag_type IN ('low_steps','activity_deficit');

UPDATE public.flags
SET flag_type = 'stress_marker'
WHERE flag_type IN ('stress');

UPDATE public.flags
SET flag_type = 'recovery_lag'
WHERE flag_type IN ('recovery');

-- 7.3 condition_risk.risk_tier normalization + mapping
UPDATE public.condition_risk
SET risk_tier = lower(btrim(risk_tier))
WHERE risk_tier IS NOT NULL;

-- IMPORTANT: map legacy value that is currently blocking you
UPDATE public.condition_risk
SET risk_tier = 'moderate'
WHERE risk_tier = 'borderline';

-- 7.3 condition_risk.risk_tier normalization + mapping
UPDATE public.condition_risk
SET risk_tier = lower(btrim(risk_tier))
WHERE risk_tier IS NOT NULL;

-- IMPORTANT: map legacy values that are currently blocking you
UPDATE public.condition_risk
SET risk_tier = 'moderate'
WHERE risk_tier = 'borderline';

UPDATE public.condition_risk
SET risk_tier = 'high'
WHERE risk_tier = 'elevated';

-- ============================================================================
-- 8) PREFLIGHT VALIDATION (fail fast + show exact bad values)
-- ============================================================================
DO $$
DECLARE
  bad_provider text;
  bad_status text;
  bad_flag_type text;
  bad_risk_tier text;
BEGIN
  SELECT provider INTO bad_provider
  FROM public.device_accounts
  WHERE provider IS NOT NULL
    AND lower(provider) <> ALL (ARRAY[
      'fitbit'::text,'oura'::text,'garmin'::text,'apple_health'::text,
      'whoop'::text,'samsung'::text,'google_fit'::text
    ])
  LIMIT 1;

  IF bad_provider IS NOT NULL THEN
    RAISE EXCEPTION 'Migration blocked: public.device_accounts has unexpected provider value: %', bad_provider;
  END IF;

  SELECT status INTO bad_status
  FROM public.device_accounts
  WHERE status IS NOT NULL
    AND lower(status) <> ALL (ARRAY[
      'active'::text,'inactive'::text,'error'::text,'expired'::text
    ])
  LIMIT 1;

  IF bad_status IS NOT NULL THEN
    RAISE EXCEPTION 'Migration blocked: public.device_accounts has unexpected status value: %', bad_status;
  END IF;

  SELECT flag_type INTO bad_flag_type
  FROM public.flags
  WHERE flag_type IS NOT NULL
    AND lower(flag_type) <> ALL (ARRAY[
      'sleep_debt'::text,'hrv_decline'::text,'rhr_elevated'::text,
      'activity_instability'::text,'stress_marker'::text,'recovery_lag'::text
    ])
  LIMIT 1;

  IF bad_flag_type IS NOT NULL THEN
    RAISE EXCEPTION 'Migration blocked: public.flags has unexpected flag_type value: %', bad_flag_type;
  END IF;

  SELECT risk_tier INTO bad_risk_tier
  FROM public.condition_risk
  WHERE risk_tier IS NOT NULL
    AND lower(risk_tier) <> ALL (ARRAY[
      'low'::text,'moderate'::text,'high'::text,'critical'::text
    ])
  LIMIT 1;

  IF bad_risk_tier IS NOT NULL THEN
    RAISE EXCEPTION 'Migration blocked: public.condition_risk has unexpected risk_tier value: %', bad_risk_tier;
  END IF;
END $$;

-- ============================================================================
-- 9) CHECK CONSTRAINTS (case-insensitive via lower())
-- ============================================================================
ALTER TABLE "public"."device_accounts"
  DROP CONSTRAINT IF EXISTS "device_accounts_provider_check",
  ADD CONSTRAINT "device_accounts_provider_check"
  CHECK (lower("provider") = ANY (ARRAY[
    'fitbit'::text,'oura'::text,'garmin'::text,'apple_health'::text,
    'whoop'::text,'samsung'::text,'google_fit'::text
  ]));

ALTER TABLE "public"."device_accounts"
  DROP CONSTRAINT IF EXISTS "device_accounts_status_check",
  ADD CONSTRAINT "device_accounts_status_check"
  CHECK (lower("status") = ANY (ARRAY[
    'active'::text,'inactive'::text,'error'::text,'expired'::text
  ]));

ALTER TABLE "public"."flags"
  DROP CONSTRAINT IF EXISTS "flags_flag_type_check",
  ADD CONSTRAINT "flags_flag_type_check"
  CHECK (lower("flag_type") = ANY (ARRAY[
    'sleep_debt'::text,'hrv_decline'::text,'rhr_elevated'::text,
    'activity_instability'::text,'stress_marker'::text,'recovery_lag'::text
  ]));

ALTER TABLE "public"."condition_risk"
  DROP CONSTRAINT IF EXISTS "condition_risk_risk_tier_check",
  ADD CONSTRAINT "condition_risk_risk_tier_check"
  CHECK (lower("risk_tier") = ANY (ARRAY[
    'low'::text,'moderate'::text,'high'::text,'critical'::text
  ]));

-- ============================================================================
-- 10) OPERATIONAL: updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."set_updated_at"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$;

-- metrics
DROP TRIGGER IF EXISTS "trg_metrics_updated_at" ON "public"."metrics";
CREATE TRIGGER "trg_metrics_updated_at"
BEFORE UPDATE ON "public"."metrics"
FOR EACH ROW
EXECUTE FUNCTION "public"."set_updated_at"();

-- metrics_extended
DROP TRIGGER IF EXISTS "trg_metrics_extended_updated_at" ON "public"."metrics_extended";
CREATE TRIGGER "trg_metrics_extended_updated_at"
BEFORE UPDATE ON "public"."metrics_extended"
FOR EACH ROW
EXECUTE FUNCTION "public"."set_updated_at"();

-- model_config (only if updated_at exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'model_config'
      AND column_name  = 'updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS "trg_model_config_updated_at" ON "public"."model_config";
    CREATE TRIGGER "trg_model_config_updated_at"
    BEFORE UPDATE ON "public"."model_config"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."set_updated_at"();
  END IF;
END $$;

-- ============================================================================
-- NOTE: refresh materialized views after push (if they exist)
-- ============================================================================
-- REFRESH MATERIALIZED VIEW "public"."metrics_samsung_v1";
-- REFRESH MATERIALIZED VIEW "public"."metrics_wesad_v1";
-- REFRESH MATERIALIZED VIEW "public"."mv_explain_top4";
