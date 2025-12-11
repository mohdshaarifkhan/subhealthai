import os, json, hashlib, argparse, sys, math
import numpy as np
from datetime import date, timedelta
from typing import Dict, List, Tuple, Optional

ROUND = 4  # keep your determinism

def safe_num(x, lo=-1.0, hi=1.0, default=None):
    if default is None:
        default = 0.0 if lo <= 0 <= hi else (lo + hi) / 2.0
    if x is None or isinstance(x, bool):
        return float(default)
    if isinstance(x, (list, dict)):
        return float(default)
    try:
        x = float(x)
    except Exception:
        return float(default)
    if not math.isfinite(x):
        return float(default)
    return float(np.clip(x, lo, hi))

def rescale_to_risk_space(contribs, risk):
    """make contributions sum to ~risk, stay bounded"""
    # contribs: list[float] signed deltas
    # risk: final risk in [0,1]
    risk = safe_num(risk, 0.0, 1.0, 0.0)
    s = sum(abs(c) for c in contribs) or 1e-6
    target = max(risk, 1e-6)  # or abs(risk - baseline) if you use a baseline
    k = target / s
    return [safe_num(c * k, lo=-1.0, hi=1.0, default=0.0) for c in contribs], risk

# Handle both direct execution and module import
try:
    from .db import sb_client
    from .config import DEMO_USER_ID, WEIGHTS_V1, ENGINE_VERSION
    from .baseline_model import score_features
    from .forecast_model import ForecastAdapter
    from .explainability import linear_contributions
except ImportError:
    # If running directly, add parent directory to path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from ml.db import sb_client
    from ml.config import DEMO_USER_ID, WEIGHTS_V1, ENGINE_VERSION
    from ml.baseline_model import score_features
    from ml.forecast_model import ForecastAdapter
    from ml.explainability import linear_contributions

def _hash(d: Dict) -> str:
    return hashlib.sha256(json.dumps(d, sort_keys=True).encode()).hexdigest()

def _robust_stats(vals: List[float]) -> Tuple[float, float]:
    vals = [v for v in vals if v is not None]
    if not vals: return (None, None)
    s = sorted(vals); med = s[len(s)//2]
    mad = sorted([abs(v - med) for v in vals])[len(vals)//2] or 1e-9
    return (med, mad)

def _z(v: float, m: float, mad: float) -> float:
    if v is None or mad is None or mad == 0:
        return 0.0
    return (v - m) / mad

def fetch_metrics(sb, user_id: str, start: str, end: str):
    r = sb.table("metrics").select("day,hrv_avg,hr_avg,sleep_minutes").eq("user_id", user_id).gte("day", start).lte("day", end).order("day").execute()
    return r.data or []

def compute_features(series: List[Dict], idx: int, forecaster: ForecastAdapter):
    win7  = series[max(0, idx-6):idx+1]
    win30 = series[max(0, idx-29):idx+1]
    m_hrv, mad_hrv = _robust_stats([v.get("hrv_avg") for v in win30])
    m_rhr, mad_rhr = _robust_stats([v.get("hr_avg")  for v in win30])
    z_hrv = _z(series[idx].get("hrv_avg"), m_hrv, mad_hrv)
    z_rhr = _z(series[idx].get("hr_avg"),  m_rhr, mad_rhr)
    sleep_now = series[idx].get("sleep_minutes") or 0
    z_sleep_debt = max(0.0, (480 - float(sleep_now)) / 60.0)
    anomaly = 0.0  # placeholder
    fcast = forecaster.forecast_delta([v.get("hrv_avg") or 0.0 for v in win7])
    return {
        "z_hrv": float(z_hrv),
        "z_rhr": float(z_rhr),
        "z_sleep_debt": float(z_sleep_debt),
        "anomaly": float(anomaly),
        "forecast_delta": float(fcast),
    }

def write_day(sb, user_id: str, day: str, feats: Dict, model_version: str = None):
    # Use ENGINE_VERSION as default, allow override via env var or parameter
    if model_version is None:
        model_version = os.getenv("MODEL_VERSION", ENGINE_VERSION)
    raw, risk = score_features(feats, WEIGHTS_V1)
    # ensure risk is 0..1
    risk = safe_num(risk, 0.0, 1.0)
    
    # Get raw contributions
    contribs_raw = linear_contributions(feats, WEIGHTS_V1)
    raw_deltas = [it.get("delta_raw", 0.0) for it in contribs_raw]
    feature_names = [it.get("feature", "") for it in contribs_raw]
    
    # scale SHAP/contribs into risk space
    scaled_deltas, risk = rescale_to_risk_space(raw_deltas, risk)
    
    # write risk_scores
    sb.table("risk_scores").upsert([{
        "user_id": user_id,
        "day": day,
        "risk_score": round(risk, ROUND),
        "features": feats,              # ok as jsonb
        "model_version": model_version,
    }], on_conflict="user_id,day,model_version").execute()

    # write explain_contribs
    # Delete existing contributions for this user/day first (primary key is user_id, day, feature)
    sb.table("explain_contribs").delete().eq("user_id", user_id).eq("day", day).execute()
    
    rows = []
    for feat, d in zip(feature_names, scaled_deltas):
        rows.append({
            "user_id": user_id,
            "day": day,
            "feature": feat,
            "value": round(safe_num(d, -1.0, 1.0), ROUND),         # <= 1 in magnitude
            "delta_raw": round(safe_num(d), ROUND),                 # same safe bound
            "sign": "+" if d >= 0 else "-",
            "risk": round(risk, ROUND),
            "model_version": model_version,
        })
    if rows:
        sb.table("explain_contribs").insert(rows).execute()

def run(since: Optional[str] = None, until: Optional[str] = None, days_back: Optional[int] = None, 
        forecaster_mode: str = "naive", model_version: str = None, user_id: Optional[str] = None):
    """Run phase3 computation for specified date range.
    
    Args:
        since: Start date (YYYY-MM-DD). If not provided and days_back is None, defaults to 30 days ago.
        until: End date (YYYY-MM-DD). Defaults to today if not provided.
        days_back: Number of days back from today (used if since is not provided).
        forecaster_mode: Forecasting mode ("naive", "gru", etc.)
        model_version: Model version tag for risk_scores table.
        user_id: Specific user ID. If None, uses DEMO_USER_ID or processes all users.
    """
    sb = sb_client()
    
    # Determine date range
    if until:
        end = date.fromisoformat(until)
    else:
        end = date.today()
    
    if since:
        start = date.fromisoformat(since)
    elif days_back:
        start = end - timedelta(days=days_back)
    else:
        start = end - timedelta(days=30)
    
    # Determine which users to process
    if user_id:
        user_ids = [user_id]
    else:
        # Default to DEMO_USER_ID, or fetch all users if you want to process all
        default_user = os.getenv("DEMO_USER_ID", DEMO_USER_ID)
        user_ids = [default_user]
        # Optional: uncomment to process all users
        # all_users = sb.table("users").select("id").execute().data or []
        # user_ids = [u["id"] for u in all_users]
    
    # Use ENGINE_VERSION as default, allow override via env var or parameter
    if model_version is None:
        model_version = os.getenv("MODEL_VERSION", ENGINE_VERSION)
    
    print(f"Processing {len(user_ids)} user(s) from {start.isoformat()} to {end.isoformat()}")
    print(f"Model version: {model_version}")
    
    f = ForecastAdapter(mode=forecaster_mode)
    total_days = 0
    
    for user in user_ids:
        rows = fetch_metrics(sb, user, start.isoformat(), end.isoformat())
        if not rows:
            print(f"  User {user}: No metrics rows found; skipping.")
            continue
        
        print(f"  User {user}: Processing {len(rows)} days...")
        for i, d in enumerate([r["day"] for r in rows]):
            feats = compute_features(rows, i, f)
            write_day(sb, user, d, feats, model_version)
            total_days += 1
    
    print(f"Phase3 daily slice computed: {total_days} total days processed.")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Compute phase3 risk scores and explainability contributions")
    ap.add_argument("--since", type=str, help="Start date (YYYY-MM-DD)")
    ap.add_argument("--until", type=str, help="End date (YYYY-MM-DD), defaults to today")
    ap.add_argument("--days-back", type=int, help="Number of days back from today (used if --since not provided)")
    ap.add_argument("--version", type=str, default=None, help=f"Model version tag (default: {ENGINE_VERSION} from config)")
    ap.add_argument("--user", type=str, help="Specific user ID (defaults to DEMO_USER_ID)")
    ap.add_argument("--forecast", type=str, default="naive", choices=["naive", "gru", "chronos"], help="Forecast adapter: naive|gru|chronos (default: naive)")
    
    args = ap.parse_args()
    
    forecast_kind = args.forecast
    # Use ENGINE_VERSION if --version not provided
    model_version = args.version if args.version is not None else os.getenv("MODEL_VERSION", ENGINE_VERSION)

    run(
        since=args.since,
        until=args.until,
        days_back=args.days_back,
        forecaster_mode=forecast_kind,
        model_version=model_version,
        user_id=args.user
    )
