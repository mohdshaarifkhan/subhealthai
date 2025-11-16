#!/usr/bin/env python3
"""
Export SubHealthAI evaluation artifacts to CSVs for IEEE/paper figures.

Outputs (in ./exports):
- metrics.csv                day, user_id, metric, value, dataset
- risk_scores.csv            user_id, day, model_version, risk
- eval_shap_global.csv       model_version, feature, mean_abs_shap
- eval_reliability.csv       version, bin, pred, obs, n
- eval_volatility_series.csv version, day, volatility_score
- evaluation_cache.csv       version, brier, ece, volatility, lead_time_p10,p50,p90 (plus passthrough cols)
- eval_lead_hist.csv         version, lead_day, freq
"""

import csv
import os
import datetime

import psycopg2
from psycopg2.extras import DictCursor, Json

DATABASE_URL = os.getenv("DATABASE_URL")
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports"))
os.makedirs(OUT_DIR, exist_ok=True)


def fetch_all(cur, sql, args=None):
  cur.execute(sql, args or [])
  return cur.fetchall()


def table_columns(cur, table: str):
  cur.execute(f"select * from {table} limit 0;")
  return [desc.name for desc in cur.description]


def first_present(columns, candidates):
  for candidate in candidates:
    if candidate in columns:
      return candidate
  return None


def write_csv(path, rows, headers):
  with open(path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    for row in rows:
      if isinstance(row, dict):
        writer.writerow([row.get(h) for h in headers])
      else:
        writer.writerow([row[i] for i, _ in enumerate(headers)])


def main():
  if not DATABASE_URL:
    raise SystemExit("Missing DATABASE_URL in environment (.env)")

  conn = psycopg2.connect(DATABASE_URL)
  conn.autocommit = True

  with conn, conn.cursor(cursor_factory=DictCursor) as cur:
    cur.execute(
      """
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'users'
            and column_name = 'dataset'
        ) as has_dataset;
      """
    )
    dataset_exists = bool(cur.fetchone()[0])
    dataset_expr = "u.dataset::text" if dataset_exists else "NULL::text"

    rows = fetch_all(
      cur,
      f"""
            select m.day,
                   m.user_id,
                   'rhr'          as metric, m.rhr           as value,
                   {dataset_expr} as dataset
            from metrics m
            left join users u on u.id = m.user_id
            union all
            select m.day, m.user_id, 'hrv_avg', m.hrv_avg, {dataset_expr}
            from metrics m left join users u on u.id = m.user_id
            union all
            select m.day, m.user_id, 'sleep_minutes', m.sleep_minutes, {dataset_expr}
            from metrics m left join users u on u.id = m.user_id
            union all
            select m.day, m.user_id, 'steps', m.steps, {dataset_expr}
            from metrics m left join users u on u.id = m.user_id
            order by 1,2,3;
        """,
    )
    write_csv(
      os.path.join(OUT_DIR, "metrics.csv"),
      [dict(r) for r in rows],
      ["day", "user_id", "metric", "value", "dataset"],
    )

    rows = fetch_all(
      cur,
      """
            select user_id, day, model_version, risk_score as risk
            from risk_scores
            order by user_id, day, model_version;
        """,
    )
    write_csv(
      os.path.join(OUT_DIR, "risk_scores.csv"),
      [dict(r) for r in rows],
      ["user_id", "day", "model_version", "risk"],
    )

    shap_columns = table_columns(cur, "eval_shap_global")
    shap_model_col = first_present(shap_columns, ["model_version", "version", "model"])
    shap_mean_col = first_present(shap_columns, ["mean_abs_shap", "mean_abs", "mean_abs_value"])
    shap_feature_col = first_present(shap_columns, ["feature", "feature_name"])

    if not shap_model_col or not shap_mean_col or not shap_feature_col:
      raise SystemExit(
        "eval_shap_global table missing expected columns (need model/version, feature, mean_abs_shap)."
      )

    rows = fetch_all(
      cur,
      f"""
            select
              {shap_model_col} as model_version,
              {shap_feature_col} as feature,
              {shap_mean_col} as mean_abs_shap
            from eval_shap_global
            order by {shap_model_col}, {shap_mean_col} desc, {shap_feature_col};
        """,
    )
    write_csv(
      os.path.join(OUT_DIR, "eval_shap_global.csv"),
      [dict(r) for r in rows],
      ["model_version", "feature", "mean_abs_shap"],
    )

    rows = fetch_all(
      cur,
      """
            select version, bin, pred, obs, n
            from eval_reliability
            order by version, bin;
        """,
    )
    write_csv(
      os.path.join(OUT_DIR, "eval_reliability.csv"),
      [dict(r) for r in rows],
      ["version", "bin", "pred", "obs", "n"],
    )

    rows = fetch_all(
      cur,
      """
            select version, day, mean_delta as volatility_score
            from eval_volatility_series
            order by version, day;
        """,
    )
    write_csv(
      os.path.join(OUT_DIR, "eval_volatility_series.csv"),
      [dict(r) for r in rows],
      ["version", "day", "volatility_score"],
    )

    eval_cache_columns = table_columns(cur, "evaluation_cache")
    eval_cache_order_col = first_present(eval_cache_columns, ["created_at", "updated_at", "computed_at"])
    if not eval_cache_order_col:
      eval_cache_order_col = "version"

    rows = fetch_all(
      cur,
      f"""
            select *
            from evaluation_cache
            order by version, {eval_cache_order_col} desc;
        """,
    )
    if rows:
      cols = [desc.name for desc in cur.description]
      core = [
        col
        for col in [
          "version",
          "brier",
          "ece",
          "volatility",
          "lead_time_p10",
          "lead_time_p50",
          "lead_time_p90",
        ]
        if col in cols
      ]
      rest = [col for col in cols if col not in core]
      headers = core + rest
      write_csv(os.path.join(OUT_DIR, "evaluation_cache.csv"), [dict(r) for r in rows], headers)
    else:
      write_csv(os.path.join(OUT_DIR, "evaluation_cache.csv"), [], ["version"])

    lead_hist_columns = table_columns(cur, "eval_lead_hist")
    lead_day_col = first_present(lead_hist_columns, ["lead_day", "lead_days", "lead"])
    lead_freq_col = first_present(lead_hist_columns, ["freq", "frequency", "count"])
    if not lead_day_col or not lead_freq_col:
      raise SystemExit("eval_lead_hist table missing expected columns (lead_day/freq).")

    rows = fetch_all(
      cur,
      f"""
            select
              version,
              {lead_day_col} as lead_day,
              {lead_freq_col} as freq
            from eval_lead_hist
            order by version, {lead_day_col};
        """,
    )
    write_csv(
      os.path.join(OUT_DIR, "eval_lead_hist.csv"),
      [dict(r) for r in rows],
      ["version", "lead_day", "freq"],
    )

    counts: dict[str, int] = {}
    for fn in [
      "metrics.csv",
      "risk_scores.csv",
      "eval_shap_global.csv",
      "eval_reliability.csv",
      "eval_volatility_series.csv",
      "evaluation_cache.csv",
      "eval_lead_hist.csv",
    ]:
      path = os.path.join(OUT_DIR, fn)
      if os.path.exists(path):
        with open(path, newline="", encoding="utf-8") as f:
          total = sum(1 for _ in f)
        counts[fn] = max(0, total - 1)

    with conn.cursor() as audit_cur:
      audit_cur.execute(
        "insert into export_audit(notes, row_counts) values (%s, %s)",
        (
          "CSV export completed",
          Json(counts),
        ),
      )

  bundle = {
    "metrics.csv":               count_rows(os.path.join("exports", "metrics.csv")),
    "risk_scores.csv":           count_rows(os.path.join("exports", "risk_scores.csv")),
    "eval_shap_global.csv":      count_rows(os.path.join("exports", "eval_shap_global.csv")),
    "eval_reliability.csv":      count_rows(os.path.join("exports", "eval_reliability.csv")),
    "eval_volatility_series.csv":count_rows(os.path.join("exports", "eval_volatility_series.csv")),
    "evaluation_cache.csv":      count_rows(os.path.join("exports", "evaluation_cache.csv")),
    "eval_lead_hist.csv":        count_rows(os.path.join("exports", "eval_lead_hist.csv")),
    "ran_from":                  "scripts/export.py",
    "ran_at_local":              datetime.datetime.now().isoformat(timespec="seconds")
  }

  with psycopg2.connect(DATABASE_URL) as audit_conn, audit_conn.cursor() as audit_cur:
    audit_cur.execute(
      """
        insert into audit_log (user_id, action, details)
        values (%s, %s, %s)
      """,
      (
        None,
        "export_csv",
        Json(bundle),
      ),
    )

  print(f"✓ Exports written to: {OUT_DIR}")
  print("✓ Audit row written to export_audit")
  print("✓ audit_log row written (action=export_csv)")


def count_rows(path: str) -> int:
  if not os.path.exists(path):
    return 0
  with open(path, encoding="utf-8") as f:
    return max(0, sum(1 for _ in f) - 1)


if __name__ == "__main__":
  main()

