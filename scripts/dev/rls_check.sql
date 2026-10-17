-- RLS behaviour check for the security-hardening migration. Run against a LOCAL
-- Postgres loaded with supabase/schema.sql + all migrations (never production):
--   psql -d <localdb> -f scripts/dev/rls_check.sql
-- Expect: anon sees 0 rows and cannot insert; each authenticated user sees only
-- their own rows; service_role sees everything; signup trigger creates the app row.
\set ON_ERROR_STOP 0
-- seed (as superuser)
INSERT INTO public.users (id, email) VALUES ('aaaaaaaa-0000-4000-8000-000000000001','legacy@demo.test');           -- legacy: app id != auth id
INSERT INTO auth.users (id, email) VALUES ('bbbbbbbb-0000-4000-8000-000000000002','new@user.test');                -- trigger should create public.users with same id
INSERT INTO public.events_raw (user_id, source, metric, value, event_time) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001','t','heart_rate',60,now()),
 ('bbbbbbbb-0000-4000-8000-000000000002','t','heart_rate',70,now());
INSERT INTO public.metrics (user_id, day, hrv_avg) VALUES ('aaaaaaaa-0000-4000-8000-000000000001', current_date, 50),('bbbbbbbb-0000-4000-8000-000000000002', current_date, 40);
SELECT 'trigger_created_user_with_auth_id' AS check, count(*) FROM public.users WHERE id='bbbbbbbb-0000-4000-8000-000000000002';

-- ANON
SET ROLE anon; SELECT set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claims','{}',false);
SELECT 'anon users' AS who, count(*) FROM public.users;
SELECT 'anon events_raw', count(*) FROM public.events_raw;
SELECT 'anon audit_log', count(*) FROM public.audit_log;
SELECT 'anon v_metrics_daily', count(*) FROM public.v_metrics_daily;
SELECT 'anon metrics_for_ml', count(*) FROM public.metrics_for_ml;
SELECT 'anon mv metrics_samsung_v1', count(*) FROM public.metrics_samsung_v1;
INSERT INTO public.events_raw (user_id, source, metric, value, event_time) VALUES ('aaaaaaaa-0000-4000-8000-000000000001','evil','heart_rate',1,now());
RESET ROLE;

-- AUTH: legacy user (auth id differs, matched by email)
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','cccccccc-0000-4000-8000-000000000003',false), set_config('request.jwt.claims','{"email":"LEGACY@demo.test"}',false);
SELECT 'legacy users visible' AS who, string_agg(email, ',') FROM public.users;
SELECT 'legacy events_raw visible', count(*), min(value) FROM public.events_raw;
SELECT 'legacy audit_log', count(*) FROM public.audit_log;
INSERT INTO public.events_raw (user_id, source, metric, value, event_time) VALUES ('aaaaaaaa-0000-4000-8000-000000000001','self','heart_rate',1,now());
RESET ROLE;

-- AUTH: new user (id = auth.uid())
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','bbbbbbbb-0000-4000-8000-000000000002',false), set_config('request.jwt.claims','{"email":"new@user.test"}',false);
SELECT 'new users visible' AS who, string_agg(email, ',') FROM public.users;
SELECT 'new events_raw visible', count(*), min(value) FROM public.events_raw;
SELECT 'new metrics visible', count(*), min(hrv_avg) FROM public.metrics;
SELECT 'new v_metrics_daily (invoker)', count(*) FROM public.v_metrics_daily;
SELECT 'new metric_meta readable', count(*) >= 0 FROM public.metric_meta;
RESET ROLE;

-- SERVICE ROLE (BYPASSRLS)
SET ROLE service_role;
SELECT 'service users', count(*) FROM public.users;
SELECT 'service events_raw', count(*) FROM public.events_raw;
RESET ROLE;
