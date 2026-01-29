--
-- PostgreSQL database dump
--

\restrict ZORibyTRIZosCzVUisIivxSO2h79dafAFOKPat3VkIzcXeZq1xw7RgaKtTYLTd7

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: feature_baseline_stats("uuid", "date", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."feature_baseline_stats"("p_user" "uuid", "p_before_day" "date", "p_window" integer) RETURNS TABLE("mean_rhr" double precision, "sd_rhr" double precision, "mean_hrv" double precision, "sd_hrv" double precision, "mean_sleep" double precision, "sd_sleep" double precision, "mean_steps" double precision, "sd_steps" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  with w as (
    select rhr, hrv_avg, sleep_minutes, steps
    from metrics
    where user_id = p_user and day < p_before_day
    order by day desc
    limit p_window
  )
  select
    avg(rhr), stddev_samp(rhr),
    avg(hrv_avg), stddev_samp(hrv_avg),
    avg(sleep_minutes), stddev_samp(sleep_minutes),
    avg(steps), stddev_samp(steps)
  from w;
$$;


--
-- Name: get_dataset_summary("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_dataset_summary"("version" "text") RETURNS TABLE("dataset" "text", "n_users" integer, "avg_steps" numeric, "avg_hr" numeric, "avg_hrv" numeric, "avg_rhr" numeric, "avg_sleep" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.dataset,
    COUNT(DISTINCT m.user_id),
    ROUND(AVG(m.steps)::numeric,1),
    ROUND(AVG(m.hr_avg)::numeric,1),
    ROUND(AVG(m.hrv_avg)::numeric,1),
    ROUND(AVG(m.rhr)::numeric,1),
    ROUND(AVG(m.sleep_minutes)/60.0::numeric,1)
  FROM metrics m
  JOIN dataset_map d USING (user_id)
  WHERE m.version = version OR version IS NULL
  GROUP BY d.dataset;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: allergies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."allergies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "substance" "text",
    "reaction" "text",
    "severity" "text"
);


--
-- Name: allergies_lab; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."allergies_lab" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "test_name" "text",
    "system_code" "text",
    "ige_ku_l" numeric,
    "class" integer,
    "lab_name" "text",
    "source" "text" DEFAULT 'manual_upload'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: allergies_symptom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."allergies_symptom" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "has_sneezing" boolean,
    "has_itchy_eyes" boolean,
    "has_nasal_congestion" boolean,
    "has_rash" boolean,
    "has_hives" boolean,
    "has_eczema" boolean,
    "has_wheezing" boolean,
    "triggers" "jsonb",
    "frequency" "text",
    "seasonality" "jsonb",
    "severity" "text",
    "notes" "text"
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: baseline_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."baseline_versions" (
    "user_id" "uuid" NOT NULL,
    "signal" "text" NOT NULL,
    "version" integer NOT NULL,
    "window_label" "text" NOT NULL,
    "params_json" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "baseline_versions_signal_check" CHECK (("signal" = ANY (ARRAY['hrv'::"text", 'rhr'::"text", 'sleep'::"text", 'steps'::"text", 'stress'::"text"])))
);


--
-- Name: condition_risk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."condition_risk" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "date" "date" NOT NULL,
    "condition" "text" NOT NULL,
    "risk_index" numeric NOT NULL,
    "risk_tier" "text" NOT NULL,
    "reasons" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: dataset_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."dataset_map" (
    "user_id" "uuid" NOT NULL,
    "dataset" "text",
    CONSTRAINT "dataset_map_dataset_check" CHECK (("dataset" = ANY (ARRAY['WESAD'::"text", 'Samsung'::"text"])))
);


--
-- Name: device_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."device_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "access_token_enc" "text",
    "refresh_token_enc" "text",
    "scope" "text",
    "expires_at" timestamp with time zone,
    "status" "text" DEFAULT 'inactive'::"text" NOT NULL,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: engine_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."engine_metadata" (
    "id" integer DEFAULT 1 NOT NULL,
    "engine_version" "text" NOT NULL,
    "last_risk_job_at" timestamp with time zone,
    "last_export_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: eval_lead_hist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."eval_lead_hist" (
    "version" "text" NOT NULL,
    "segment" "text" DEFAULT 'all'::"text" NOT NULL,
    "days" integer NOT NULL,
    "count" integer
);


--
-- Name: eval_reliability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."eval_reliability" (
    "version" "text" NOT NULL,
    "segment" "text" DEFAULT 'all'::"text" NOT NULL,
    "bin" double precision NOT NULL,
    "pred" double precision,
    "obs" double precision,
    "n" integer
);


--
-- Name: eval_shap_global; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."eval_shap_global" (
    "version" "text" NOT NULL,
    "segment" "text" DEFAULT 'all'::"text" NOT NULL,
    "feature" "text" NOT NULL,
    "mean_abs_shap" double precision
);


--
-- Name: eval_volatility_series; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."eval_volatility_series" (
    "version" "text" NOT NULL,
    "segment" "text" DEFAULT 'all'::"text" NOT NULL,
    "day" "date" NOT NULL,
    "mean_delta" double precision
);


--
-- Name: evaluation_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."evaluation_cache" (
    "version" "text" NOT NULL,
    "segment" "text" DEFAULT 'all'::"text" NOT NULL,
    "brier" double precision,
    "ece" double precision,
    "volatility" double precision,
    "lead_time_days_mean" double precision,
    "lead_time_days_p90" double precision,
    "n_users" integer,
    "n_days" integer,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: events_raw; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."events_raw" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "metric" "text" NOT NULL,
    "value" numeric NOT NULL,
    "event_time" timestamp with time zone NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ingested_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: evidence_bundles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."evidence_bundles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "label" "text",
    "engine_version" "text",
    "export_zip_url" "text",
    "metrics_csv_url" "text",
    "risk_scores_csv_url" "text",
    "shap_csv_url" "text",
    "reliability_csv_url" "text",
    "volatility_csv_url" "text",
    "plots_base_url" "text",
    "notes" "text"
);


--
-- Name: explain_contribs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."explain_contribs" (
    "user_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "feature" "text" NOT NULL,
    "value" double precision,
    "delta_raw" double precision NOT NULL,
    "sign" "text" NOT NULL,
    "risk" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "model_version" "text" NOT NULL,
    CONSTRAINT "explain_contribs_sign_check" CHECK (("sign" = ANY (ARRAY['+'::"text", '-'::"text"])))
);


--
-- Name: explainability_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."explainability_images" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "img_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: explainability_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."explainability_images_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: explainability_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."explainability_images_id_seq" OWNED BY "public"."explainability_images"."id";


--
-- Name: export_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."export_audit" (
    "id" bigint NOT NULL,
    "ran_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actor" "text" DEFAULT 'script/export.py'::"text",
    "notes" "text",
    "row_counts" "jsonb"
);


--
-- Name: export_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."export_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: export_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."export_audit_id_seq" OWNED BY "public"."export_audit"."id";


--
-- Name: family_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."family_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "condition" "text",
    "relation" "text",
    "age_of_onset" integer
);


--
-- Name: flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "flag_type" "text" NOT NULL,
    "severity" integer NOT NULL,
    "rationale" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "flags_severity_check" CHECK ((("severity" >= 1) AND ("severity" <= 5)))
);


--
-- Name: labels_daily; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."labels_daily" AS
 SELECT "user_id",
    "day",
    1 AS "label"
   FROM "public"."flags"
  GROUP BY "user_id", "day";


--
-- Name: labs_basic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."labs_basic" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "date" "date" NOT NULL,
    "crp" numeric,
    "hba1c" numeric,
    "vit_d" numeric,
    "ldl" numeric,
    "hdl" numeric,
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: labs_core; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."labs_core" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "fasting_glucose_mg_dl" numeric,
    "hba1c_percent" numeric,
    "bun_mg_dl" numeric,
    "creatinine_mg_dl" numeric,
    "egfr_ml_min_1_73" numeric,
    "chol_total_mg_dl" numeric,
    "hdl_mg_dl" numeric,
    "ldl_mg_dl" numeric,
    "trig_mg_dl" numeric,
    "alt_u_l" numeric,
    "ast_u_l" numeric,
    "alk_phos_u_l" numeric,
    "tsh_ulu_ml" numeric,
    "vitd_25oh_ng_ml" numeric,
    "is_fasting" boolean,
    "source" "text" DEFAULT 'manual'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: lifestyle_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."lifestyle_profile" (
    "user_id" "uuid" NOT NULL,
    "sleep_hours_workdays" numeric,
    "sleep_hours_weekends" numeric,
    "activity_level" "text",
    "work_pattern" "text",
    "smoker_status" "text",
    "alcohol_per_week" integer,
    "stress_level" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "meds_json" "jsonb",
    "supplements_json" "jsonb"
);


--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."medications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text",
    "dose" "text",
    "frequency" "text",
    "start_date" "date",
    "end_date" "date"
);


--
-- Name: metric_meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."metric_meta" (
    "metric" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "pop_low" double precision,
    "pop_high" double precision,
    "direction" "text" DEFAULT 'neutral'::"text",
    CONSTRAINT "metric_meta_direction_check" CHECK (("direction" = ANY (ARRAY['higher_better'::"text", 'lower_better'::"text", 'neutral'::"text"])))
);


--
-- Name: metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "steps" integer,
    "sleep_minutes" integer,
    "hr_avg" numeric,
    "hrv_avg" numeric,
    "rhr" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stress_proxy" double precision,
    "tz_offset_minutes" integer,
    "melatonin_taken" boolean,
    "bedtime_local" time without time zone
);


--
-- Name: metrics_extended; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."metrics_extended" (
    "user_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "stress_score" numeric(6,3),
    "jetlag_idx" numeric(6,3),
    "circadian_phase" numeric(6,3),
    "recovery_idx" numeric(6,3),
    "med_events_json" "jsonb",
    "coverage_pct" numeric(5,2) DEFAULT 100,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: metrics_for_ml; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."metrics_for_ml" AS
 SELECT "user_id",
    "day",
    "avg"("hrv_avg") AS "hrv_mean",
    "avg"("rhr") AS "rhr_mean",
    (("avg"("sleep_minutes"))::double precision / (60.0)::double precision) AS "sleep_hours",
    "avg"("steps") AS "steps"
   FROM "public"."metrics"
  GROUP BY "user_id", "day";


--
-- Name: v_metrics_labeled; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."v_metrics_labeled" AS
 SELECT "m"."id",
    "m"."user_id",
    "m"."day",
    "m"."steps",
    "m"."sleep_minutes",
    "m"."hr_avg",
    "m"."hrv_avg",
    "m"."rhr",
    "m"."updated_at",
    "m"."stress_proxy",
    "m"."tz_offset_minutes",
    "m"."melatonin_taken",
    "m"."bedtime_local",
    "d"."dataset"
   FROM ("public"."metrics" "m"
     LEFT JOIN "public"."dataset_map" "d" USING ("user_id"));


--
-- Name: metrics_samsung_v1; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW "public"."metrics_samsung_v1" AS
 SELECT "id",
    "user_id",
    "day",
    "steps",
    "sleep_minutes",
    "hr_avg",
    "hrv_avg",
    "rhr",
    "updated_at",
    "stress_proxy",
    "tz_offset_minutes",
    "melatonin_taken",
    "bedtime_local",
    "dataset"
   FROM "public"."v_metrics_labeled"
  WHERE ("dataset" = 'Samsung'::"text")
  WITH NO DATA;


--
-- Name: metrics_wesad_v1; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW "public"."metrics_wesad_v1" AS
 SELECT "metrics"."user_id",
    "metrics"."id",
    "metrics"."day",
    "metrics"."steps",
    "metrics"."sleep_minutes",
    "metrics"."hr_avg",
    "metrics"."hrv_avg",
    "metrics"."rhr",
    "metrics"."updated_at",
    "metrics"."stress_proxy",
    "metrics"."tz_offset_minutes",
    "metrics"."melatonin_taken",
    "metrics"."bedtime_local",
    "dataset_map"."dataset"
   FROM ("public"."metrics"
     JOIN "public"."dataset_map" USING ("user_id"))
  WHERE ("dataset_map"."dataset" = 'WESAD'::"text")
  WITH NO DATA;


--
-- Name: model_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."model_config" (
    "user_id" "uuid" NOT NULL,
    "q_threshold" double precision DEFAULT 0.7,
    "window_days" integer DEFAULT 28,
    "ema_alpha" double precision DEFAULT 0.3,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: model_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."model_registry" (
    "version" "text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: mv_explain_top4; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW "public"."mv_explain_top4" AS
 SELECT "user_id",
    "day",
    "model_version",
    "jsonb_agg"("jsonb_build_object"('feature', "feature", 'value', "value") ORDER BY ("abs"("value")) DESC) AS "contribs"
   FROM "public"."explain_contribs"
  GROUP BY "user_id", "day", "model_version"
  WITH NO DATA;


--
-- Name: risk_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."risk_scores" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "risk_score" numeric NOT NULL,
    "model_version" "text" NOT NULL,
    "features" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "risk_scores_risk_score_check" CHECK ((("risk_score" >= (0)::numeric) AND ("risk_score" <= (1)::numeric)))
);


--
-- Name: risk_scores_cal; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."risk_scores_cal" AS
 SELECT "user_id",
    "day",
    "model_version",
    "risk_score" AS "risk_score_cal"
   FROM "public"."risk_scores";


--
-- Name: risk_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."risk_scores_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risk_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."risk_scores_id_seq" OWNED BY "public"."risk_scores"."id";


--
-- Name: user_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_profile" (
    "user_id" "uuid" NOT NULL,
    "age_years" integer,
    "sex_at_birth" "text",
    "height_cm" numeric,
    "weight_kg" numeric,
    "country" "text",
    "timezone" "text",
    "primary_goal" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: v_eval_reliability; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."v_eval_reliability" AS
 SELECT "version",
    "segment",
    "bin",
    "pred" AS "predicted_prob",
    "obs" AS "observed_rate",
    "n"
   FROM "public"."eval_reliability";


--
-- Name: v_eval_volatility_series; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."v_eval_volatility_series" AS
 SELECT "version",
    "segment",
    "day",
    "mean_delta" AS "volatility_score"
   FROM "public"."eval_volatility_series";


--
-- Name: v_metrics_daily; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."v_metrics_daily" AS
 SELECT "user_id",
    ("date_trunc"('day'::"text", "ingested_at"))::"date" AS "day",
    "metric",
    "avg"("value") AS "value",
    "source"
   FROM "public"."events_raw"
  GROUP BY "user_id", (("date_trunc"('day'::"text", "ingested_at"))::"date"), "metric", "source";


--
-- Name: v_metrics_features; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."v_metrics_features" AS
 SELECT "id",
    "user_id",
    "day",
    "steps",
    "sleep_minutes",
    "hr_avg",
    "hrv_avg",
    "rhr",
    "updated_at",
    "stress_proxy",
    "tz_offset_minutes",
    "melatonin_taken",
    "bedtime_local",
    GREATEST((0)::numeric, (((420 - COALESCE("sleep_minutes", 420)))::numeric / 180.0)) AS "sleep_debt",
        CASE
            WHEN ("steps" IS NULL) THEN NULL::numeric
            ELSE GREATEST((0)::numeric, (((8000 - "steps"))::numeric / 8000.0))
        END AS "activity_deficit"
   FROM "public"."metrics" "m";


--
-- Name: v_risk_scores_compat; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."v_risk_scores_compat" AS
 SELECT "user_id",
    "day",
    "model_version" AS "version",
    "risk_score" AS "risk",
    "created_at" AS "updated_at"
   FROM "public"."risk_scores";


--
-- Name: v_risk_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."v_risk_timeline" AS
 SELECT "r"."user_id",
    "r"."day",
    "r"."risk_score" AS "risk",
    COALESCE("me"."coverage_pct", (100)::numeric) AS "coverage_pct",
    "r"."model_version",
    "r"."features",
    "f"."flag_type",
    "f"."severity"
   FROM (("public"."risk_scores" "r"
     LEFT JOIN "public"."metrics_extended" "me" USING ("user_id", "day"))
     LEFT JOIN "public"."flags" "f" USING ("user_id", "day"));


--
-- Name: v_shap_series; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."v_shap_series" AS
 SELECT "user_id",
    "day",
    "feature",
    "value"
   FROM "public"."explain_contribs"
  ORDER BY "user_id", "day", "feature";


--
-- Name: v_shap_topk; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."v_shap_topk" AS
 WITH "ranked" AS (
         SELECT "explain_contribs"."user_id",
            "explain_contribs"."day",
            "explain_contribs"."feature",
            "explain_contribs"."value",
            "dense_rank"() OVER (PARTITION BY "explain_contribs"."user_id", "explain_contribs"."day" ORDER BY ("abs"("explain_contribs"."value")) DESC) AS "rnk"
           FROM "public"."explain_contribs"
        )
 SELECT "user_id",
    "day",
    "feature",
    "value",
    "rnk"
   FROM "ranked"
  WHERE ("rnk" <= 5);


--
-- Name: vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."vitals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "taken_at" timestamp with time zone NOT NULL,
    "systolic_mm_hg" integer,
    "diastolic_mm_hg" integer,
    "heart_rate_bpm" integer,
    "temperature_c" numeric,
    "spo2_percent" numeric,
    "height_cm" numeric,
    "weight_kg" numeric,
    "bmi" numeric,
    "source" "text" DEFAULT 'manual'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: weekly_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."weekly_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "week_start" "date" NOT NULL,
    "week_end" "date" NOT NULL,
    "summary" "text" NOT NULL,
    "recommendations" "text",
    "sources" "text"[],
    "note_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: workouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "start_tz" timestamp with time zone NOT NULL,
    "minutes" integer NOT NULL,
    "type" "text" NOT NULL,
    "intensity_rpe" integer,
    "kcal" numeric,
    "source" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: explainability_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."explainability_images" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."explainability_images_id_seq"'::"regclass");


--
-- Name: export_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."export_audit" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."export_audit_id_seq"'::"regclass");


--
-- Name: risk_scores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."risk_scores" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."risk_scores_id_seq"'::"regclass");


--
-- Name: allergies_lab allergies_lab_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."allergies_lab"
    ADD CONSTRAINT "allergies_lab_pkey" PRIMARY KEY ("id");


--
-- Name: allergies allergies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."allergies"
    ADD CONSTRAINT "allergies_pkey" PRIMARY KEY ("id");


--
-- Name: allergies_symptom allergies_symptom_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."allergies_symptom"
    ADD CONSTRAINT "allergies_symptom_pkey" PRIMARY KEY ("id");


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");


--
-- Name: baseline_versions baseline_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."baseline_versions"
    ADD CONSTRAINT "baseline_versions_pkey" PRIMARY KEY ("user_id", "signal", "version");


--
-- Name: condition_risk condition_risk_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."condition_risk"
    ADD CONSTRAINT "condition_risk_pkey" PRIMARY KEY ("id");


--
-- Name: dataset_map dataset_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dataset_map"
    ADD CONSTRAINT "dataset_map_pkey" PRIMARY KEY ("user_id");


--
-- Name: device_accounts device_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."device_accounts"
    ADD CONSTRAINT "device_accounts_pkey" PRIMARY KEY ("id");


--
-- Name: engine_metadata engine_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."engine_metadata"
    ADD CONSTRAINT "engine_metadata_pkey" PRIMARY KEY ("id");


--
-- Name: eval_lead_hist eval_lead_hist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."eval_lead_hist"
    ADD CONSTRAINT "eval_lead_hist_pkey" PRIMARY KEY ("version", "segment", "days");


--
-- Name: eval_reliability eval_reliability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."eval_reliability"
    ADD CONSTRAINT "eval_reliability_pkey" PRIMARY KEY ("version", "segment", "bin");


--
-- Name: eval_shap_global eval_shap_global_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."eval_shap_global"
    ADD CONSTRAINT "eval_shap_global_pkey" PRIMARY KEY ("version", "segment", "feature");


--
-- Name: eval_volatility_series eval_volatility_series_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."eval_volatility_series"
    ADD CONSTRAINT "eval_volatility_series_pkey" PRIMARY KEY ("version", "segment", "day");


--
-- Name: evaluation_cache evaluation_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."evaluation_cache"
    ADD CONSTRAINT "evaluation_cache_pkey" PRIMARY KEY ("version", "segment");


--
-- Name: events_raw events_raw_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."events_raw"
    ADD CONSTRAINT "events_raw_pkey" PRIMARY KEY ("id");


--
-- Name: evidence_bundles evidence_bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."evidence_bundles"
    ADD CONSTRAINT "evidence_bundles_pkey" PRIMARY KEY ("id");


--
-- Name: explain_contribs explain_contribs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."explain_contribs"
    ADD CONSTRAINT "explain_contribs_pkey" PRIMARY KEY ("user_id", "day", "feature", "model_version");


--
-- Name: explainability_images explainability_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."explainability_images"
    ADD CONSTRAINT "explainability_images_pkey" PRIMARY KEY ("id");


--
-- Name: explainability_images explainability_images_user_id_day_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."explainability_images"
    ADD CONSTRAINT "explainability_images_user_id_day_key" UNIQUE ("user_id", "day");


--
-- Name: export_audit export_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."export_audit"
    ADD CONSTRAINT "export_audit_pkey" PRIMARY KEY ("id");


--
-- Name: family_history family_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."family_history"
    ADD CONSTRAINT "family_history_pkey" PRIMARY KEY ("id");


--
-- Name: flags flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."flags"
    ADD CONSTRAINT "flags_pkey" PRIMARY KEY ("id");


--
-- Name: flags flags_user_day_type_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."flags"
    ADD CONSTRAINT "flags_user_day_type_uniq" UNIQUE ("user_id", "day", "flag_type");


--
-- Name: labs_basic labs_basic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."labs_basic"
    ADD CONSTRAINT "labs_basic_pkey" PRIMARY KEY ("id");


--
-- Name: labs_core labs_core_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."labs_core"
    ADD CONSTRAINT "labs_core_pkey" PRIMARY KEY ("id");


--
-- Name: lifestyle_profile lifestyle_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lifestyle_profile"
    ADD CONSTRAINT "lifestyle_profile_pkey" PRIMARY KEY ("user_id");


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."medications"
    ADD CONSTRAINT "medications_pkey" PRIMARY KEY ("id");


--
-- Name: metric_meta metric_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."metric_meta"
    ADD CONSTRAINT "metric_meta_pkey" PRIMARY KEY ("metric");


--
-- Name: metrics_extended metrics_extended_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."metrics_extended"
    ADD CONSTRAINT "metrics_extended_pkey" PRIMARY KEY ("user_id", "day");


--
-- Name: metrics metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_pkey" PRIMARY KEY ("id");


--
-- Name: metrics metrics_user_id_day_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_user_id_day_key" UNIQUE ("user_id", "day");


--
-- Name: model_config model_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."model_config"
    ADD CONSTRAINT "model_config_pkey" PRIMARY KEY ("user_id");


--
-- Name: model_registry model_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."model_registry"
    ADD CONSTRAINT "model_registry_pkey" PRIMARY KEY ("version");


--
-- Name: risk_scores risk_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."risk_scores"
    ADD CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id");


--
-- Name: risk_scores risk_scores_user_id_day_model_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."risk_scores"
    ADD CONSTRAINT "risk_scores_user_id_day_model_version_key" UNIQUE ("user_id", "day", "model_version");


--
-- Name: user_profile user_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("user_id");


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: vitals vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "vitals_pkey" PRIMARY KEY ("id");


--
-- Name: weekly_notes weekly_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."weekly_notes"
    ADD CONSTRAINT "weekly_notes_pkey" PRIMARY KEY ("id");


--
-- Name: weekly_notes weekly_notes_user_id_week_start_week_end_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."weekly_notes"
    ADD CONSTRAINT "weekly_notes_user_id_week_start_week_end_key" UNIQUE ("user_id", "week_start", "week_end");


--
-- Name: workouts workouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");


--
-- Name: idx_allergies_lab_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_allergies_lab_user_date" ON "public"."allergies_lab" USING "btree" ("user_id", "date");


--
-- Name: idx_allergies_symptom_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_allergies_symptom_user" ON "public"."allergies_symptom" USING "btree" ("user_id");


--
-- Name: idx_condition_risk_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_condition_risk_user_date" ON "public"."condition_risk" USING "btree" ("user_id", "date");


--
-- Name: idx_device_accounts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_device_accounts_user" ON "public"."device_accounts" USING "btree" ("user_id");


--
-- Name: idx_eval_rel_ver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_eval_rel_ver" ON "public"."eval_reliability" USING "btree" ("version", "bin");


--
-- Name: idx_eval_rel_ver_seg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_eval_rel_ver_seg" ON "public"."eval_reliability" USING "btree" ("version", "segment");


--
-- Name: idx_eval_vol_ver_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_eval_vol_ver_day" ON "public"."eval_volatility_series" USING "btree" ("version", "day");


--
-- Name: idx_eval_vol_ver_seg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_eval_vol_ver_seg" ON "public"."eval_volatility_series" USING "btree" ("version", "segment", "day");


--
-- Name: idx_events_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_events_user_time" ON "public"."events_raw" USING "btree" ("user_id", "event_time");


--
-- Name: idx_evidence_bundles_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_evidence_bundles_created" ON "public"."evidence_bundles" USING "btree" ("created_at" DESC);


--
-- Name: idx_explain_contribs_model_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_explain_contribs_model_version" ON "public"."explain_contribs" USING "btree" ("model_version");


--
-- Name: idx_explain_user_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_explain_user_day" ON "public"."explain_contribs" USING "btree" ("user_id", "day");


--
-- Name: idx_explain_user_day_ver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_explain_user_day_ver" ON "public"."explain_contribs" USING "btree" ("user_id", "day", "model_version");


--
-- Name: idx_family_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_family_history_user" ON "public"."family_history" USING "btree" ("user_id");


--
-- Name: idx_flags_user_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_flags_user_day" ON "public"."flags" USING "btree" ("user_id", "day");


--
-- Name: idx_labs_basic_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_labs_basic_user_date" ON "public"."labs_basic" USING "btree" ("user_id", "date");


--
-- Name: idx_labs_core_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_labs_core_user_date" ON "public"."labs_core" USING "btree" ("user_id", "date");


--
-- Name: idx_metrics_user_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_metrics_user_day" ON "public"."metrics" USING "btree" ("user_id", "day");


--
-- Name: idx_mv_explain_top4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_mv_explain_top4" ON "public"."mv_explain_top4" USING "btree" ("user_id", "day", "model_version");


--
-- Name: idx_risk_scores_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_risk_scores_day" ON "public"."risk_scores" USING "btree" ("day");


--
-- Name: idx_risk_scores_user_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_risk_scores_user_day" ON "public"."risk_scores" USING "btree" ("user_id", "day");


--
-- Name: idx_risk_scores_user_day_ver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_risk_scores_user_day_ver" ON "public"."risk_scores" USING "btree" ("user_id", "day", "model_version");


--
-- Name: idx_vitals_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_vitals_user_time" ON "public"."vitals" USING "btree" ("user_id", "taken_at");


--
-- Name: idx_workouts_user_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_workouts_user_start" ON "public"."workouts" USING "btree" ("user_id", "start_tz");


--
-- Name: mv_explain_top4_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "mv_explain_top4_unique" ON "public"."mv_explain_top4" USING "btree" ("user_id", "day", "model_version");


--
-- Name: uq_baseline_versions_user_signal; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "uq_baseline_versions_user_signal" ON "public"."baseline_versions" USING "btree" ("user_id", "signal");


--
-- Name: ux_eval_cache_ver_seg; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ux_eval_cache_ver_seg" ON "public"."evaluation_cache" USING "btree" ("version", "segment");


--
-- Name: ux_eval_lead_ver_seg_days; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ux_eval_lead_ver_seg_days" ON "public"."eval_lead_hist" USING "btree" ("version", "segment", "days");


--
-- Name: ux_eval_rel_ver_seg_bin; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ux_eval_rel_ver_seg_bin" ON "public"."eval_reliability" USING "btree" ("version", "segment", "bin");


--
-- Name: ux_eval_shap_ver_seg_feat; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ux_eval_shap_ver_seg_feat" ON "public"."eval_shap_global" USING "btree" ("version", "segment", "feature");


--
-- Name: ux_eval_vol_ver_seg_day; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ux_eval_vol_ver_seg_day" ON "public"."eval_volatility_series" USING "btree" ("version", "segment", "day");


--
-- Name: allergies_lab allergies_lab_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."allergies_lab"
    ADD CONSTRAINT "allergies_lab_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: allergies_symptom allergies_symptom_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."allergies_symptom"
    ADD CONSTRAINT "allergies_symptom_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: allergies allergies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."allergies"
    ADD CONSTRAINT "allergies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;


--
-- Name: baseline_versions baseline_versions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."baseline_versions"
    ADD CONSTRAINT "baseline_versions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: condition_risk condition_risk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."condition_risk"
    ADD CONSTRAINT "condition_risk_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: device_accounts device_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."device_accounts"
    ADD CONSTRAINT "device_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: events_raw events_raw_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."events_raw"
    ADD CONSTRAINT "events_raw_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: explain_contribs explain_contribs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."explain_contribs"
    ADD CONSTRAINT "explain_contribs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: explainability_images explainability_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."explainability_images"
    ADD CONSTRAINT "explainability_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: family_history family_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."family_history"
    ADD CONSTRAINT "family_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: flags flags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."flags"
    ADD CONSTRAINT "flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: labs_basic labs_basic_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."labs_basic"
    ADD CONSTRAINT "labs_basic_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: labs_core labs_core_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."labs_core"
    ADD CONSTRAINT "labs_core_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: lifestyle_profile lifestyle_profile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lifestyle_profile"
    ADD CONSTRAINT "lifestyle_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: medications medications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."medications"
    ADD CONSTRAINT "medications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: metrics_extended metrics_extended_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."metrics_extended"
    ADD CONSTRAINT "metrics_extended_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: metrics metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: risk_scores risk_scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."risk_scores"
    ADD CONSTRAINT "risk_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: user_profile user_profile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: vitals vitals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "vitals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: weekly_notes weekly_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."weekly_notes"
    ADD CONSTRAINT "weekly_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: workouts workouts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");


--
-- Name: allergies_lab; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."allergies_lab" ENABLE ROW LEVEL SECURITY;

--
-- Name: allergies_lab allergies_lab_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allergies_lab_own" ON "public"."allergies_lab" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: allergies_symptom; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."allergies_symptom" ENABLE ROW LEVEL SECURITY;

--
-- Name: allergies_symptom allergies_symptom_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allergies_symptom_own" ON "public"."allergies_symptom" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: baseline_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."baseline_versions" ENABLE ROW LEVEL SECURITY;

--
-- Name: condition_risk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."condition_risk" ENABLE ROW LEVEL SECURITY;

--
-- Name: condition_risk condition_risk_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "condition_risk_own" ON "public"."condition_risk" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: device_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."device_accounts" ENABLE ROW LEVEL SECURITY;

--
-- Name: device_accounts device_accounts_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "device_accounts_own" ON "public"."device_accounts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: evaluation_cache eval_cache_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "eval_cache_read" ON "public"."evaluation_cache" FOR SELECT USING (true);


--
-- Name: eval_lead_hist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."eval_lead_hist" ENABLE ROW LEVEL SECURITY;

--
-- Name: eval_lead_hist eval_lead_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "eval_lead_read" ON "public"."eval_lead_hist" FOR SELECT USING (true);


--
-- Name: eval_reliability eval_rel_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "eval_rel_read" ON "public"."eval_reliability" FOR SELECT USING (true);


--
-- Name: eval_reliability; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."eval_reliability" ENABLE ROW LEVEL SECURITY;

--
-- Name: eval_shap_global; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."eval_shap_global" ENABLE ROW LEVEL SECURITY;

--
-- Name: eval_shap_global eval_shap_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "eval_shap_read" ON "public"."eval_shap_global" FOR SELECT USING (true);


--
-- Name: eval_volatility_series eval_vol_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "eval_vol_read" ON "public"."eval_volatility_series" FOR SELECT USING (true);


--
-- Name: eval_volatility_series; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."eval_volatility_series" ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluation_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."evaluation_cache" ENABLE ROW LEVEL SECURITY;

--
-- Name: explainability_images expimg_read_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "expimg_read_admin" ON "public"."explainability_images" FOR SELECT TO "authenticated" USING (true);


--
-- Name: explainability_images expimg_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "expimg_read_own" ON "public"."explainability_images" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: explain_contribs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."explain_contribs" ENABLE ROW LEVEL SECURITY;

--
-- Name: explainability_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."explainability_images" ENABLE ROW LEVEL SECURITY;

--
-- Name: family_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."family_history" ENABLE ROW LEVEL SECURITY;

--
-- Name: family_history family_history_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "family_history_own" ON "public"."family_history" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: labs_basic; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."labs_basic" ENABLE ROW LEVEL SECURITY;

--
-- Name: labs_core; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."labs_core" ENABLE ROW LEVEL SECURITY;

--
-- Name: labs_core labs_core_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "labs_core_own" ON "public"."labs_core" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: labs_basic labs_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "labs_own" ON "public"."labs_basic" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: lifestyle_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."lifestyle_profile" ENABLE ROW LEVEL SECURITY;

--
-- Name: lifestyle_profile lifestyle_profile_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lifestyle_profile_own" ON "public"."lifestyle_profile" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: baseline_versions me_ins_baselines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "me_ins_baselines" ON "public"."baseline_versions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: explain_contribs me_ins_explain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "me_ins_explain" ON "public"."explain_contribs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: metrics_extended me_ins_metrics_ext; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "me_ins_metrics_ext" ON "public"."metrics_extended" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: baseline_versions me_read_baselines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "me_read_baselines" ON "public"."baseline_versions" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: explain_contribs me_read_explain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "me_read_explain" ON "public"."explain_contribs" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: metrics_extended me_read_metrics_ext; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "me_read_metrics_ext" ON "public"."metrics_extended" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: baseline_versions me_upd_baselines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "me_upd_baselines" ON "public"."baseline_versions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: explain_contribs me_upd_explain; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "me_upd_explain" ON "public"."explain_contribs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: metrics_extended me_upd_metrics_ext; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "me_upd_metrics_ext" ON "public"."metrics_extended" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: metrics_extended; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."metrics_extended" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profile user_profile_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "user_profile_own" ON "public"."user_profile" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: vitals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."vitals" ENABLE ROW LEVEL SECURITY;

--
-- Name: vitals vitals_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "vitals_own" ON "public"."vitals" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: workouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;

--
-- Name: workouts workouts_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workouts_own" ON "public"."workouts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- PostgreSQL database dump complete
--

\unrestrict ZORibyTRIZosCzVUisIivxSO2h79dafAFOKPat3VkIzcXeZq1xw7RgaKtTYLTd7

