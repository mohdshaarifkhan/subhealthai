# Tables

## allergies

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | YES |
| substance | text | YES |
| reaction | text | YES |
| severity | text | YES |

## allergies_lab

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| date | date | NO |
| test_name | text | YES |
| system_code | text | YES |
| ige_ku_l | numeric | YES |
| class | integer | YES |
| lab_name | text | YES |
| source | text | YES |
| created_at | timestamp with time zone | YES |

## allergies_symptom

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| updated_at | timestamp with time zone | YES |
| has_sneezing | boolean | YES |
| has_itchy_eyes | boolean | YES |
| has_nasal_congestion | boolean | YES |
| has_rash | boolean | YES |
| has_hives | boolean | YES |
| has_eczema | boolean | YES |
| has_wheezing | boolean | YES |
| triggers | jsonb | YES |
| frequency | text | YES |
| seasonality | jsonb | YES |
| severity | text | YES |
| notes | text | YES |

## audit_log

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | YES |
| action | text | NO |
| details | jsonb | NO |
| created_at | timestamp with time zone | NO |

## baseline_versions

| Column | Type | Nullable |
|---|---|---|
| user_id | uuid | NO |
| signal | text | NO |
| version | integer | NO |
| window_label | text | NO |
| params_json | jsonb | NO |
| updated_at | timestamp with time zone | YES |

## condition_risk

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | YES |
| date | date | NO |
| condition | text | NO |
| risk_index | numeric | NO |
| risk_tier | text | NO |
| reasons | jsonb | YES |
| created_at | timestamp with time zone | YES |

## dataset_map

| Column | Type | Nullable |
|---|---|---|
| user_id | uuid | NO |
| dataset | text | YES |

## device_accounts

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| provider | text | NO |
| access_token_enc | text | YES |
| refresh_token_enc | text | YES |
| scope | text | YES |
| expires_at | timestamp with time zone | YES |
| status | text | NO |
| last_sync_at | timestamp with time zone | YES |
| created_at | timestamp with time zone | YES |

## engine_metadata

| Column | Type | Nullable |
|---|---|---|
| id | integer | NO |
| engine_version | text | NO |
| last_risk_job_at | timestamp with time zone | YES |
| last_export_at | timestamp with time zone | YES |
| updated_at | timestamp with time zone | YES |

## eval_lead_hist

| Column | Type | Nullable |
|---|---|---|
| version | text | NO |
| segment | text | NO |
| days | integer | NO |
| count | integer | YES |

## eval_reliability

| Column | Type | Nullable |
|---|---|---|
| version | text | NO |
| segment | text | NO |
| bin | double precision | NO |
| pred | double precision | YES |
| obs | double precision | YES |
| n | integer | YES |

## eval_shap_global

| Column | Type | Nullable |
|---|---|---|
| version | text | NO |
| segment | text | NO |
| feature | text | NO |
| mean_abs_shap | double precision | YES |

## eval_volatility_series

| Column | Type | Nullable |
|---|---|---|
| version | text | NO |
| segment | text | NO |
| day | date | NO |
| mean_delta | double precision | YES |

## evaluation_cache

| Column | Type | Nullable |
|---|---|---|
| version | text | NO |
| segment | text | NO |
| brier | double precision | YES |
| ece | double precision | YES |
| volatility | double precision | YES |
| lead_time_days_mean | double precision | YES |
| lead_time_days_p90 | double precision | YES |
| n_users | integer | YES |
| n_days | integer | YES |
| updated_at | timestamp with time zone | NO |

## events_raw

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| source | text | NO |
| metric | text | NO |
| value | numeric | NO |
| event_time | timestamp with time zone | NO |
| meta | jsonb | NO |
| ingested_at | timestamp with time zone | NO |

## evidence_bundles

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| created_at | timestamp with time zone | YES |
| label | text | YES |
| engine_version | text | YES |
| export_zip_url | text | YES |
| metrics_csv_url | text | YES |
| risk_scores_csv_url | text | YES |
| shap_csv_url | text | YES |
| reliability_csv_url | text | YES |
| volatility_csv_url | text | YES |
| plots_base_url | text | YES |
| notes | text | YES |

## explain_contribs

| Column | Type | Nullable |
|---|---|---|
| user_id | uuid | NO |
| day | date | NO |
| feature | text | NO |
| value | double precision | YES |
| delta_raw | double precision | NO |
| sign | text | NO |
| risk | double precision | YES |
| created_at | timestamp with time zone | YES |
| model_version | text | NO |

## explainability_images

| Column | Type | Nullable |
|---|---|---|
| id | bigint | NO |
| user_id | uuid | NO |
| day | date | NO |
| img_url | text | NO |
| created_at | timestamp with time zone | NO |

## export_audit

| Column | Type | Nullable |
|---|---|---|
| id | bigint | NO |
| ran_at | timestamp with time zone | NO |
| actor | text | YES |
| notes | text | YES |
| row_counts | jsonb | YES |

## family_history

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | YES |
| condition | text | YES |
| relation | text | YES |
| age_of_onset | integer | YES |

## flags

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| day | date | NO |
| flag_type | text | NO |
| severity | integer | NO |
| rationale | text | NO |
| created_at | timestamp with time zone | NO |

## labs_basic

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | YES |
| date | date | NO |
| crp | numeric | YES |
| hba1c | numeric | YES |
| vit_d | numeric | YES |
| ldl | numeric | YES |
| hdl | numeric | YES |
| source | text | YES |
| created_at | timestamp with time zone | YES |

## labs_core

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| date | date | NO |
| fasting_glucose_mg_dl | numeric | YES |
| hba1c_percent | numeric | YES |
| bun_mg_dl | numeric | YES |
| creatinine_mg_dl | numeric | YES |
| egfr_ml_min_1_73 | numeric | YES |
| chol_total_mg_dl | numeric | YES |
| hdl_mg_dl | numeric | YES |
| ldl_mg_dl | numeric | YES |
| trig_mg_dl | numeric | YES |
| alt_u_l | numeric | YES |
| ast_u_l | numeric | YES |
| alk_phos_u_l | numeric | YES |
| tsh_ulu_ml | numeric | YES |
| vitd_25oh_ng_ml | numeric | YES |
| is_fasting | boolean | YES |
| source | text | YES |
| created_at | timestamp with time zone | YES |

## lifestyle_profile

| Column | Type | Nullable |
|---|---|---|
| user_id | uuid | NO |
| sleep_hours_workdays | numeric | YES |
| sleep_hours_weekends | numeric | YES |
| activity_level | text | YES |
| work_pattern | text | YES |
| smoker_status | text | YES |
| alcohol_per_week | integer | YES |
| stress_level | text | YES |
| created_at | timestamp with time zone | YES |
| updated_at | timestamp with time zone | YES |
| meds_json | jsonb | YES |
| supplements_json | jsonb | YES |

## medications

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | YES |
| name | text | YES |
| dose | text | YES |
| frequency | text | YES |
| start_date | date | YES |
| end_date | date | YES |

## metric_meta

| Column | Type | Nullable |
|---|---|---|
| metric | text | NO |
| display_name | text | NO |
| unit | text | NO |
| pop_low | double precision | YES |
| pop_high | double precision | YES |
| direction | text | YES |

## metrics

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| day | date | NO |
| steps | integer | YES |
| sleep_minutes | integer | YES |
| hr_avg | numeric | YES |
| hrv_avg | numeric | YES |
| rhr | numeric | YES |
| updated_at | timestamp with time zone | NO |
| stress_proxy | double precision | YES |
| tz_offset_minutes | integer | YES |
| melatonin_taken | boolean | YES |
| bedtime_local | time without time zone | YES |

## metrics_extended

| Column | Type | Nullable |
|---|---|---|
| user_id | uuid | NO |
| day | date | NO |
| stress_score | numeric | YES |
| jetlag_idx | numeric | YES |
| circadian_phase | numeric | YES |
| recovery_idx | numeric | YES |
| med_events_json | jsonb | YES |
| coverage_pct | numeric | YES |
| updated_at | timestamp with time zone | YES |

## model_config

| Column | Type | Nullable |
|---|---|---|
| user_id | uuid | NO |
| q_threshold | double precision | YES |
| window_days | integer | YES |
| ema_alpha | double precision | YES |
| updated_at | timestamp with time zone | YES |

## model_registry

| Column | Type | Nullable |
|---|---|---|
| version | text | NO |
| is_default | boolean | NO |
| notes | text | YES |
| updated_at | timestamp with time zone | YES |

## risk_scores

| Column | Type | Nullable |
|---|---|---|
| id | bigint | NO |
| user_id | uuid | NO |
| day | date | NO |
| risk_score | numeric | NO |
| model_version | text | NO |
| features | jsonb | NO |
| created_at | timestamp with time zone | NO |

## user_profile

| Column | Type | Nullable |
|---|---|---|
| user_id | uuid | NO |
| age_years | integer | YES |
| sex_at_birth | text | YES |
| height_cm | numeric | YES |
| weight_kg | numeric | YES |
| country | text | YES |
| timezone | text | YES |
| primary_goal | text | YES |
| created_at | timestamp with time zone | YES |
| updated_at | timestamp with time zone | YES |

## users

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| email | text | NO |
| display_name | text | YES |
| created_at | timestamp with time zone | NO |

## vitals

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| taken_at | timestamp with time zone | NO |
| systolic_mm_hg | integer | YES |
| diastolic_mm_hg | integer | YES |
| heart_rate_bpm | integer | YES |
| temperature_c | numeric | YES |
| spo2_percent | numeric | YES |
| height_cm | numeric | YES |
| weight_kg | numeric | YES |
| bmi | numeric | YES |
| source | text | YES |
| created_at | timestamp with time zone | YES |

## weekly_notes

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| week_start | date | NO |
| week_end | date | NO |
| summary | text | NO |
| recommendations | text | YES |
| sources | ARRAY | YES |
| note_json | jsonb | NO |
| created_at | timestamp with time zone | NO |

## workouts

| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| start_tz | timestamp with time zone | NO |
| minutes | integer | NO |
| type | text | NO |
| intensity_rpe | integer | YES |
| kcal | numeric | YES |
| source | text | NO |
| created_at | timestamp with time zone | YES |


# Views

## view: labels_daily

```sql
 SELECT user_id,
    day,
    1 AS label
   FROM flags
  GROUP BY user_id, day;
```

## view: metrics_for_ml

```sql
 SELECT user_id,
    day,
    avg(hrv_avg) AS hrv_mean,
    avg(rhr) AS rhr_mean,
    ((avg(sleep_minutes))::double precision / (60.0)::double precision) AS sleep_hours,
    avg(steps) AS steps
   FROM metrics
  GROUP BY user_id, day;
```

## view: risk_scores_cal

```sql
 SELECT user_id,
    day,
    model_version,
    risk_score AS risk_score_cal
   FROM risk_scores;
```

## view: v_eval_reliability

```sql
 SELECT version,
    segment,
    bin,
    pred AS predicted_prob,
    obs AS observed_rate,
    n
   FROM eval_reliability;
```

## view: v_eval_volatility_series

```sql
 SELECT version,
    segment,
    day,
    mean_delta AS volatility_score
   FROM eval_volatility_series;
```

## view: v_metrics_daily

```sql
 SELECT user_id,
    (date_trunc('day'::text, ingested_at))::date AS day,
    metric,
    avg(value) AS value,
    source
   FROM events_raw
  GROUP BY user_id, ((date_trunc('day'::text, ingested_at))::date), metric, source;
```

## view: v_metrics_features

```sql
 SELECT id,
    user_id,
    day,
    steps,
    sleep_minutes,
    hr_avg,
    hrv_avg,
    rhr,
    updated_at,
    stress_proxy,
    tz_offset_minutes,
    melatonin_taken,
    bedtime_local,
    GREATEST((0)::numeric, (((420 - COALESCE(sleep_minutes, 420)))::numeric / 180.0)) AS sleep_debt,
        CASE
            WHEN (steps IS NULL) THEN NULL::numeric
            ELSE GREATEST((0)::numeric, (((8000 - steps))::numeric / 8000.0))
        END AS activity_deficit
   FROM metrics m;
```

## view: v_metrics_labeled

```sql
 SELECT m.id,
    m.user_id,
    m.day,
    m.steps,
    m.sleep_minutes,
    m.hr_avg,
    m.hrv_avg,
    m.rhr,
    m.updated_at,
    m.stress_proxy,
    m.tz_offset_minutes,
    m.melatonin_taken,
    m.bedtime_local,
    d.dataset
   FROM (metrics m
     LEFT JOIN dataset_map d USING (user_id));
```

## view: v_risk_scores_compat

```sql
 SELECT user_id,
    day,
    model_version AS version,
    risk_score AS risk,
    created_at AS updated_at
   FROM risk_scores;
```

## view: v_risk_timeline

```sql
 SELECT r.user_id,
    r.day,
    r.risk_score AS risk,
    COALESCE(me.coverage_pct, (100)::numeric) AS coverage_pct,
    r.model_version,
    r.features,
    f.flag_type,
    f.severity
   FROM ((risk_scores r
     LEFT JOIN metrics_extended me USING (user_id, day))
     LEFT JOIN flags f USING (user_id, day));
```

## view: v_shap_series

```sql
 SELECT user_id,
    day,
    feature,
    value
   FROM explain_contribs
  ORDER BY user_id, day, feature;
```

## view: v_shap_topk

```sql
 WITH ranked AS (
         SELECT explain_contribs.user_id,
            explain_contribs.day,
            explain_contribs.feature,
            explain_contribs.value,
            dense_rank() OVER (PARTITION BY explain_contribs.user_id, explain_contribs.day ORDER BY (abs(explain_contribs.value)) DESC) AS rnk
           FROM explain_contribs
        )
 SELECT user_id,
    day,
    feature,
    value,
    rnk
   FROM ranked
  WHERE (rnk <= 5);
```

