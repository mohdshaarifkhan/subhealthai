"""
Baseline anomaly/risk model (schema-agnostic):
- Pulls daily features (HRV, RHR, sleep, steps) from metrics with flexible aliases
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
from typing import Dict
from ml.config import supabase, MODEL_VERSION_BASELINE, WEIGHTS_V1

# Canonical features used internally
CANONICAL = ["hrv_mean", "rhr_mean", "sleep_hours", "steps"]
FEATURES = CANONICAL

# --- Adaptive threshold utilities (drop-in) ---
def rolling_quantile(xs, q: float = 0.7, w: int = 28):
    """Compute rolling quantile with window size w.
    For each position i, uses the last up to w values including i.
    """
    out = []
    buf = []
    for x in xs:
        buf.append(x)
        if len(buf) > w:
            buf.pop(0)
        # numpy quantile on current buffer
        out.append(float(np.quantile(buf, q)))
    return out

def adaptive_threshold(yhat_cal, q: float = 0.7, w: int = 28):
    """Return binary decisions comparing predictions to a rolling quantile threshold.
    - yhat_cal: calibrated probabilities or risk scores (list/array)
    - q: quantile level (e.g., 0.7)
    - w: rolling window length (e.g., 28 days)
    """
    thresholds = rolling_quantile(yhat_cal, q=q, w=w)
    return [int(p >= t) for p, t in zip(yhat_cal, thresholds)]

def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))

def score_features(features: Dict[str, float], weights: Dict[str, float] = WEIGHTS_V1):
    raw = (
        weights["b0"]
        + weights["w_hrv"] * (-features.get("z_hrv", 0.0))
        + weights["w_rhr"] * ( features.get("z_rhr", 0.0))
        + weights["w_sleep"]* ( features.get("z_sleep_debt", 0.0))
        + weights["w_anom"] * ( features.get("anomaly", 0.0))
        + weights["w_fcast"]* ( features.get("forecast_delta", 0.0))
    )
    risk = _sigmoid(raw)
    # clamp + 4dp
    return round(raw, 4), round(max(0.0, min(1.0, risk)), 4)

# Flexible alias map to match your existing schema
ALIASES = {
    "day": ["day", "date", "dt", "record_date"],
    "hrv_mean": ["hrv_mean", "hrv_avg", "hrv", "rmssd", "hrv_score"],
    "rhr_mean": ["rhr_mean", "resting_hr", "resting_heart_rate", "rhr", "heart_rate_rest"],
    "sleep_hours": ["sleep_hours", "sleep", "sleep_duration_hours", "total_sleep_hours", "sleep_time_h"],
    "steps": ["steps", "step_count", "daily_steps", "steps_total"]
}

def _first_existing(df_cols: set[str], candidates: list[str]) -> str | None:
    for c in candidates:
        if c in df_cols:
            return c
    return None

def _coerce_day_column(df: pd.DataFrame) -> pd.DataFrame:
    # Find day/date column and normalize to date
    day_col = _first_existing(set(df.columns), ALIASES["day"])
    if not day_col:
        raise RuntimeError("No day/date column found in metrics (looked for: %s)" % ALIASES["day"])
    df["day"] = pd.to_datetime(df[day_col]).dt.date
    return df

def _map_feature_columns(df: pd.DataFrame) -> dict:
    cols = set(df.columns)
    mapping: dict[str, str] = {}
    for k in ["hrv_mean", "rhr_mean", "sleep_hours", "steps"]:
        found = _first_existing(cols, ALIASES[k])
        if found: mapping[k] = found
    return mapping

def fetch_users():
    res = supabase.table("users").select("id").execute()
    return [r["id"] for r in (res.data or [])]

def fetch_metrics(user_id: str, since: str | None, until: str | None) -> pd.DataFrame:
    # Pull *all* columns so we can alias flexibly
    q = supabase.table("metrics_for_ml").select("*").eq("user_id", user_id)
    if since: q = q.gte("day", since)
    if until: q = q.lte("day", until)
    res = q.execute()
    df = pd.DataFrame(res.data or [])
    if df.empty:
        return df

    # Normalize day/date
    df = _coerce_day_column(df)
    df = df.sort_values("day").reset_index(drop=True)

    # Build a canonical view with whatever columns exist
    mapping = _map_feature_columns(df)
    # Transparently print mapping once per user for debugging
    print(f"[metrics column map] user={user_id} -> {mapping}")

    # Create canonical columns; if a feature is missing, fill with NaN
    out = pd.DataFrame({"user_id": df["user_id"], "day": df["day"]})
    for canon in ["hrv_mean", "rhr_mean", "sleep_hours", "steps"]:
        src = mapping.get(canon)
        out[canon] = pd.to_numeric(df[src], errors="coerce") if src else np.nan

    # If all features are NaN, return empty so we skip this user
    if out[["hrv_mean","rhr_mean","sleep_hours","steps"]].isna().all(axis=None):
        return pd.DataFrame()

    return out

def robust_standardize(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    out = df.copy()
    for c in cols:
        x = out[c].astype(float)
        if x.notna().sum() < 3:
            # Not enough non-NaNs; make z zero to avoid exploding
            out[c + "_z"] = 0.0
            continue
        med = np.nanmedian(x)
        mad = np.nanmedian(np.abs(x - med)) or 1.0
        out[c + "_z"] = (x - med) / (1.4826 * mad)
    return out

def iso_forest_score(X: np.ndarray, random_state=42) -> np.ndarray:
    # IsolationForest returns negative scores for anomalies (lower is more anomalous).
    valid_rows = ~np.isnan(X).any(axis=1)
    Xv = X[valid_rows]
    scores = np.full(len(X), np.nan)

    if len(Xv) < 16:  # not enough samples; fallback: z-score magnitude heuristic
        zmag = np.linalg.norm((X - np.nanmean(X, axis=0)) / (np.nanstd(X, axis=0) + 1e-6), axis=1)
        return zmag

    clf = IsolationForest(n_estimators=200, contamination="auto", random_state=random_state)
    clf.fit(Xv)
    raw = -clf.score_samples(Xv)  # higher = more anomalous
    scores[valid_rows] = raw
    # for rows with NaNs, fall back to zero anomaly
    scores[np.isnan(scores)] = np.nanmedian(raw) if len(Xv) else 0.0
    return scores

def squash(x: np.ndarray) -> np.ndarray:
    # Map to 0..1 using logistic with mild slope, robust to NaNs
    xm = (x - np.nanmedian(x)) / (np.nanstd(x) + 1e-6)
    return 1 / (1 + np.exp(-1.2 * xm))

def _json_sanitize(d: dict) -> dict:
    out = {}
    for k, v in (d or {}).items():
        if v is None:
            out[k] = None
            continue
        try:
            # numpy scalars/arrays -> float
            fv = float(v)
            if not np.isfinite(fv):
                out[k] = None
            else:
                out[k] = fv
        except Exception:
            out[k] = None
    return out

def upsert_risk_scores(user_id: str, df_scores: pd.DataFrame):
    rows = []
    for _, r in df_scores.iterrows():
        if not np.isfinite(r["risk"]):
            continue
        feat = {k: r.get(k, None) for k in FEATURES}
        zfeat = {k+"_z": r.get(k+"_z", None) for k in FEATURES}
        payload = {
            "user_id": user_id,
            "day": r["day"].isoformat(),
            "risk_score": float(r["risk"]),
            "model_version": MODEL_VERSION_BASELINE,
            "features": json.dumps({
                "raw": _json_sanitize(feat),
                "z": _json_sanitize(zfeat)
            })
        }
        rows.append(payload)
    # Batch upsert
    supabase.table("risk_scores").upsert(rows, on_conflict="user_id,day,model_version").execute()

def run_for_user(user_id: str, since: str | None, until: str | None):
    df = fetch_metrics(user_id, since, until)
    if df.empty:
        return 0
    if len(df) < 5:
        return 0  # not enough history to compute meaningful risk
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
    # --- make risk JSON-safe (no NaNs/Inf) ---
    risk = np.asarray(risk, dtype=float)
    valid = np.isfinite(risk)
    if not valid.any():
        # if everything is NaN/Inf, fall back to 0.5 neutral risk
        risk = np.zeros_like(risk) + 0.5
    else:
        # fill NaNs/Inf with the median of valid entries
        med = float(np.nanmedian(risk[valid]))
        risk = np.nan_to_num(risk, nan=med, posinf=1.0, neginf=0.0)
    # -----------------------------------------
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
