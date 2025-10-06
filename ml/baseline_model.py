"""
Baseline anomaly/risk model:
- Pulls daily features (HRV_mean, RHR_mean, sleep_hours, steps) from metrics
- Builds a per-user rolling baseline (median + MAD robust z-scores)
- Combines features into a single anomaly score (IsolationForest)
- Calibrates to 0..1 risk via logistic squashing
- Upserts to risk_scores (model_version = baseline_v0.1)

Run:
  python -m ml.baseline_model --since 2025-01-01 --until 2025-12-31
"""

import argparse, math, json, datetime as dt
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from ml.config import supabase, MODEL_VERSION_BASELINE

FEATURES = ["hrv_mean", "rhr_mean", "sleep_hours", "steps"]

def fetch_users():
    res = supabase.table("users").select("id").execute()
    return [r["id"] for r in res.data]

def fetch_metrics(user_id: str, since: str | None, until: str | None) -> pd.DataFrame:
    q = supabase.table("metrics").select("user_id, day, hrv_mean, rhr_mean, sleep_hours, steps").eq("user_id", user_id)
    if since: q = q.gte("day", since)
    if until: q = q.lte("day", until)
    res = q.execute()
    df = pd.DataFrame(res.data or [])
    if not df.empty:
        df["day"] = pd.to_datetime(df["day"]).dt.date
        df = df.sort_values("day").reset_index(drop=True)
    return df

def robust_standardize(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    out = df.copy()
    for c in cols:
        x = out[c].astype(float)
        med = np.nanmedian(x)
        mad = np.nanmedian(np.abs(x - med)) or 1.0
        out[c + "_z"] = (x - med) / (1.4826 * mad)
    return out

def iso_forest_score(X: np.ndarray, random_state=42) -> np.ndarray:
    # IsolationForest returns negative scores for anomalies (lower is more anomalous).
    if len(X) < 16:  # not enough samples; fallback: z-score magnitude heuristic
        zmag = np.linalg.norm((X - np.nanmean(X, axis=0)) / (np.nanstd(X, axis=0) + 1e-6), axis=1)
        return zmag
    clf = IsolationForest(n_estimators=200, contamination="auto", random_state=random_state)
    clf.fit(X)
    raw = -clf.score_samples(X)  # higher = more anomalous
    return raw

def squash(x: np.ndarray) -> np.ndarray:
    # Map to 0..1 using logistic with mild slope
    x = (x - np.nanmedian(x)) / (np.nanstd(x) + 1e-6)
    return 1 / (1 + np.exp(-1.2 * x))

def upsert_risk_scores(user_id: str, df_scores: pd.DataFrame):
    rows = []
    for _, r in df_scores.iterrows():
        feat = {k: r.get(k, None) for k in FEATURES}
        zfeat = {k+"_z": r.get(k+"_z", None) for k in FEATURES}
        payload = {
            "user_id": user_id,
            "day": r["day"].isoformat(),
            "risk_score": float(r["risk"]),
            "model_version": MODEL_VERSION_BASELINE,
            "features": json.dumps({"raw": feat, "z": zfeat})
        }
        rows.append(payload)
    # Batch upsert
    supabase.table("risk_scores").upsert(rows, on_conflict="user_id,day,model_version").execute()

def run_for_user(user_id: str, since: str | None, until: str | None):
    df = fetch_metrics(user_id, since, until)
    if df.empty:
        return 0
    # Robust z-scores per feature
    df = robust_standardize(df, FEATURES)
    # Build feature matrix with z-scores (directionality: higher HRV is good vs RHR is bad)
    # Invert z for features where higher = better so anomalies in the "worse" direction are positive.
    z = np.column_stack([
        -df["hrv_mean_z"].to_numpy(),  # lower HRV = riskier -> invert
         df["rhr_mean_z"].to_numpy(),  # higher RHR = riskier
        -df["sleep_hours_z"].to_numpy(),  # less sleep = riskier -> invert
        -df["steps_z"].to_numpy()   # fewer steps = riskier -> invert
    ])
    raw = iso_forest_score(z)
    risk = squash(raw)
    df_scores = df[["day"]].copy()
    df_scores["risk"] = risk
    upsert_risk_scores(user_id, df_scores)
    return len(df_scores)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", type=str, default=None)
    ap.add_argument("--until", type=str, default=None)
    args = ap.parse_args()

    total = 0
    for uid in fetch_users():
        total += run_for_user(uid, args.since, args.until)
    print(f"Upserted {total} risk rows.")

if __name__ == "__main__":
    main()
