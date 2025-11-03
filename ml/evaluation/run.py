import os, json, datetime, numpy as np, pathlib, collections, argparse, sys
from sklearn.isotonic import IsotonicRegression
# Handle both direct execution and module import
try:
    from ml.db import sb_client
    try:
        from .metrics import brier_score, ece, volatility, lead_time, rationale_fidelity
    except ImportError:
        from metrics import brier_score, ece, volatility, lead_time, rationale_fidelity
except ImportError:
    # If running directly, add parent directory to path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from ml.db import sb_client
    from ml.evaluation.metrics import brier_score, ece, volatility, lead_time, rationale_fidelity

OUT=pathlib.Path(__file__).parent / "logs"; OUT.mkdir(parents=True, exist_ok=True)
TODAY=datetime.date.today().isoformat()

def calibrate_isotonic(p, y):
    ir = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip")
    p_array = np.array([float(x) for x in p])
    y_array = np.array([int(t) for t in y])
    ir.fit(p_array.reshape(-1, 1), y_array)
    return ir.predict(p_array.reshape(-1, 1))

def ema(xs, alpha=0.3):
    """Exponential Moving Average for smoothing time series."""
    out = []
    m = None
    for x in xs:
        m = x if m is None else alpha*x + (1-alpha)*m
        out.append(m)
    return out

def fetch_user_data(sb, user, start, end, model_version=None):
    """Fetch risk scores and labels for a user."""
    q = sb.table("risk_scores").select("day,risk_score,user_id").eq("user_id",user).gte("day",start).lte("day",end).order("day")
    if model_version:
        q = q.eq("model_version", model_version)
    r = q.execute().data or []
    
    # Fetch labels from labels_daily table
    labels = (
        sb.table("labels_daily")
        .select("user_id, day, label")
        .eq("user_id", user)
        .gte("day", start)
        .lte("day", end)
        .execute()
        .data or []
    )
    label_map = {(row["user_id"], row["day"]): int(row["label"]) for row in labels}
    
    days = [row["day"] for row in r]
    p = np.array([row["risk_score"] for row in r])
    # Labels aligned to risk_scores, default to 0 if no label exists
    y = np.array([label_map.get((user, d), 0) for d in days])
    return days, p, y

def fetch_all_data(sb, start, end, model_version=None):
    """Fetch risk scores and labels for all users."""
    q = sb.table("risk_scores").select("day,risk_score,user_id").gte("day",start).lte("day",end).order("day,user_id")
    if model_version:
        q = q.eq("model_version", model_version)
    rs = q.execute().data or []
    
    labels = (
        sb.table("labels_daily")
          .select("user_id, day, label")
          .execute()
          .data or []
    )
    label_map = {(r["user_id"], r["day"]): int(r["label"]) for r in labels}
    y_true = [label_map.get((r["user_id"], r["day"]), 0) for r in rs]  # rs from risk_scores
    y_pred = [r["risk_score"] for r in rs]
    
    # Group by user
    user_data = collections.defaultdict(lambda: {"days": [], "p": [], "y": []})
    for i, row in enumerate(rs):
        uid = row["user_id"]
        day = row["day"]
        user_data[uid]["days"].append(day)
        user_data[uid]["p"].append(row["risk_score"])
        user_data[uid]["y"].append(y_true[i])
    
    # Convert to arrays
    all_days = [r["day"] for r in rs]
    all_p = np.array(y_pred)
    all_y = np.array(y_true)
    
    return np.array(all_days), all_p, all_y, user_data

def reliability_equalfreq(preds, labels, n_bins=10):
    """Compute reliability curve with equal-frequency binning (stable ECE)."""
    preds = np.asarray(preds)
    labels = np.asarray(labels)
    edges = np.quantile(preds, np.linspace(0, 1, n_bins+1))
    edges[0], edges[-1] = 0, 1
    bins, n = [], len(preds)
    for i in range(n_bins):
        lo, hi = edges[i], edges[i+1] + 1e-12
        idx = (preds >= lo) & (preds < hi)
        if idx.sum() == 0:
            bins.append({"bin": (lo+hi)/2, "pred": 0.0, "obs": 0.0, "n": 0})
            continue
        p = float(preds[idx].mean())
        o = float(labels[idx].mean())
        m = int(idx.sum())
        bins.append({"bin": (lo+hi)/2, "pred": p, "obs": o, "n": m})
    ece = sum((b["n"]/n)*abs(b["pred"]-b["obs"]) for b in bins if b["n"]>0)
    return bins, ece

def compute_volatility_series(sb, start, end, model_version=None):
    """Compute daily mean volatility (mean absolute delta per day) using calibrated predictions."""
    q = sb.table("risk_scores").select("day,risk_score,user_id").gte("day",start).lte("day",end).order("day,user_id")
    if model_version:
        q = q.eq("model_version", model_version)
    rows = q.execute().data or []
    
    # Fetch labels for calibration
    labels = (
        sb.table("labels_daily")
          .select("user_id, day, label")
          .execute()
          .data or []
    )
    label_map = {(r["user_id"], r["day"]): int(r["label"]) for r in labels}
    
    # Prepare data for calibration
    y_all = [label_map.get((r["user_id"], r["day"]), 0) for r in rows]
    p_all_raw = np.array([r["risk_score"] for r in rows])
    
    # Calibrate with hold-out to avoid overfit
    if len(y_all) > 0:
        idx = int(0.7 * len(y_all))
        train = slice(0, idx)
        ir = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip")
        ir.fit(p_all_raw[train].reshape(-1, 1), np.array(y_all)[train])
        p_all_cal = ir.predict(p_all_raw.reshape(-1, 1))
    else:
        p_all_cal = []
    
    # Group by day and user to compute per-user deltas, then aggregate by day
    user_days = collections.defaultdict(lambda: {"p": [], "days": []})
    cal_idx = 0
    for row in rows:
        uid = row["user_id"]
        user_days[uid]["days"].append(row["day"])
        user_days[uid]["p"].append(p_all_cal[cal_idx])
        cal_idx += 1
    
    # Compute deltas per user, then group by day
    # Apply EMA smoothing to each user's calibrated prediction series before computing deltas
    day_deltas = collections.defaultdict(list)
    for uid in user_days:
        days = np.array(user_days[uid]["days"])
        p = np.array(user_days[uid]["p"])
        if len(p) < 2:
            continue
        # Apply EMA smoothing to reduce noise while preserving trend
        p_smooth = np.array(ema(p, alpha=0.3))
        # Compute absolute deltas on smoothed series
        deltas = np.abs(np.diff(p_smooth))
        for i in range(len(deltas)):
            day_deltas[days[i+1]].append(float(deltas[i]))
    
    # Convert to series format
    volatility_series = []
    for day in sorted(day_deltas.keys()):
        mean_delta = float(np.mean(day_deltas[day]))
        volatility_series.append({"day": day, "mean_delta": mean_delta})
    
    return volatility_series

def compute_lead_times_individual(pred, y):
    """Compute all individual lead times (returns list, not mean)."""
    pred = np.asarray(pred)
    y = np.asarray(y)
    lt = []
    i = 0
    while i < len(y):
        if y[i] == 1:
            start = i
            while i < len(y) and y[i] == 1:
                i += 1
            end = i - 1
            for t in range(max(0, start - 7), end + 1):
                if pred[t] == 1:
                    lt.append(start - t)
                    break
        i += 1
    return lt

def compute_lead_time_hist(sb, start, end, model_version=None):
    """Compute lead time distribution histogram using calibrated predictions."""
    q = sb.table("risk_scores").select("day,risk_score,user_id").gte("day",start).lte("day",end).order("day,user_id")
    if model_version:
        q = q.eq("model_version", model_version)
    rows = q.execute().data or []
    
    # Fetch labels from labels_daily table
    labels = (
        sb.table("labels_daily")
        .select("user_id, day, label")
        .execute()
        .data or []
    )
    # Build user-day -> label map
    label_map = {(row["user_id"], row["day"]): int(row["label"]) for row in labels}
    
    # Prepare data for calibration
    y_all = [label_map.get((r["user_id"], r["day"]), 0) for r in rows]
    p_all_raw = np.array([r["risk_score"] for r in rows])
    
    # Calibrate with hold-out to avoid overfit
    if len(y_all) > 0:
        idx = int(0.7 * len(y_all))
        train = slice(0, idx)
        ir = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip")
        ir.fit(p_all_raw[train].reshape(-1, 1), np.array(y_all)[train])
        p_all_cal = ir.predict(p_all_raw.reshape(-1, 1))
    else:
        p_all_cal = []
    
    user_data = collections.defaultdict(lambda: {"days": [], "p": []})
    cal_idx = 0
    for row in rows:
        uid = row["user_id"]
        user_data[uid]["days"].append(row["day"])
        user_data[uid]["p"].append(p_all_cal[cal_idx])
        cal_idx += 1
    
    lead_times = []
    for uid in user_data:
        days = np.array(user_data[uid]["days"])
        p = np.array(user_data[uid]["p"])
        if len(p) == 0:
            continue
        tau = float(np.quantile(p, 0.8)) if len(p) > 0 else 1.0
        pred = (p >= tau).astype(int)
        # Labels aligned to risk_scores, default to 0 if no label exists
        y = np.array([label_map.get((uid, d), 0) for d in days])
        individual_lts = compute_lead_times_individual(pred, y)
        lead_times.extend([int(round(lt)) for lt in individual_lts if lt > 0])
    
    # Create histogram
    hist = collections.Counter(lead_times)
    lead_time_hist = [{"days": days, "count": count} for days, count in sorted(hist.items())]
    return lead_time_hist

def compute_shap_global(sb, start, end, model_version=None):
    """Compute global mean absolute SHAP values per feature."""
    q = sb.table("explain_contribs").select("feature,delta_raw").gte("day",start).lte("day",end)
    rows = q.execute().data or []
    
    feature_shaps = collections.defaultdict(list)
    for row in rows:
        feat = row["feature"]
        shap_val = abs(float(row.get("delta_raw", 0.0)))
        feature_shaps[feat].append(shap_val)
    
    shap_global = []
    for feat in feature_shaps:
        mean_abs_shap = float(np.mean(feature_shaps[feat]))
        shap_global.append({"feature": feat, "mean_abs_shap": mean_abs_shap})
    
    # Sort by mean_abs_shap descending
    shap_global.sort(key=lambda x: x["mean_abs_shap"], reverse=True)
    return shap_global

def compute_lead_time_stats(lead_time_hist):
    """Compute mean and p90 from lead time histogram."""
    if not lead_time_hist:
        return 0.0, 0.0
    all_lt = []
    for item in lead_time_hist:
        all_lt.extend([item["days"]] * item["count"])
    if not all_lt:
        return 0.0, 0.0
    mean_lt = float(np.mean(all_lt))
    p90_lt = float(np.quantile(all_lt, 0.9))
    return mean_lt, p90_lt

def generate_figures(out: dict, output_dir: pathlib.Path, version: str):
    """Generate visualization figures from metrics data."""
    try:
        import matplotlib.pyplot as plt
        import matplotlib.dates as mdates
    except ImportError:
        print("matplotlib not available, skipping figure generation")
        return
    
    version_safe = version.replace("/", "_")
    
    # Reliability curve
    if out.get("reliability"):
        fig, ax = plt.subplots(figsize=(8, 6))
        rel = out["reliability"]
        bins = [r["bin"] for r in rel]
        pred = [r["pred"] for r in rel]
        obs = [r["obs"] for r in rel]
        ax.plot(bins, pred, "o-", label="Predicted", linewidth=2)
        ax.plot(bins, obs, "s-", label="Observed", linewidth=2)
        ax.plot([0, 1], [0, 1], "k--", alpha=0.3, label="Perfect calibration")
        ax.set_xlabel("Predicted Risk")
        ax.set_ylabel("Observed Risk")
        ax.set_title("Reliability Curve (Calibration)")
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(output_dir / f"{TODAY}_{version_safe}_reliability.png", dpi=150)
        plt.close()
        print(f"Saved: {output_dir / f'{TODAY}_{version_safe}_reliability.png'}")
    
    # Volatility series
    if out.get("volatility_series"):
        fig, ax = plt.subplots(figsize=(10, 4))
        vol = out["volatility_series"]
        days = [datetime.date.fromisoformat(v["day"]) for v in vol]
        deltas = [v["mean_delta"] for v in vol]
        ax.plot(days, deltas, linewidth=1.5)
        ax.set_xlabel("Date")
        ax.set_ylabel("Mean Δ Risk Score")
        ax.set_title("Risk Volatility Over Time")
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m-%d"))
        ax.xaxis.set_major_locator(mdates.WeekdayLocator(interval=2))
        plt.xticks(rotation=45)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(output_dir / f"{TODAY}_{version_safe}_volatility.png", dpi=150)
        plt.close()
        print(f"Saved: {output_dir / f'{TODAY}_{version_safe}_volatility.png'}")
    
    # Lead time histogram
    if out.get("lead_time_hist"):
        fig, ax = plt.subplots(figsize=(8, 5))
        hist = out["lead_time_hist"]
        days = [h["days"] for h in hist]
        counts = [h["count"] for h in hist]
        ax.bar(days, counts, alpha=0.7)
        ax.set_xlabel("Lead Time (days)")
        ax.set_ylabel("# of Users")
        ax.set_title("Lead-Time Distribution")
        plt.grid(True, alpha=0.3, axis="y")
        plt.tight_layout()
        plt.savefig(output_dir / f"{TODAY}_{version_safe}_leadtime.png", dpi=150)
        plt.close()
        print(f"Saved: {output_dir / f'{TODAY}_{version_safe}_leadtime.png'}")
    
    # SHAP global importance
    if out.get("shap_global"):
        fig, ax = plt.subplots(figsize=(8, max(6, len(out["shap_global"]) * 0.4)))
        shap = out["shap_global"]
        features = [s["feature"] for s in shap]
        values = [s["mean_abs_shap"] for s in shap]
        ax.barh(features, values, alpha=0.7)
        ax.set_xlabel("Mean |SHAP|")
        ax.set_title("Global Feature Importance")
        plt.grid(True, alpha=0.3, axis="x")
        plt.tight_layout()
        plt.savefig(output_dir / f"{TODAY}_{version_safe}_shap.png", dpi=150)
        plt.close()
        print(f"Saved: {output_dir / f'{TODAY}_{version_safe}_shap.png'}")

def upsert_eval_cache(sb, version, metrics, segment="all"):
    """Upsert evaluation results into cache tables for React UI."""
    sb.table("evaluation_cache").upsert([{
        "version": version,
        "segment": segment,
        "brier": metrics["overall"]["brier"],
        "ece": metrics["overall"]["ece"],
        "volatility": metrics["overall"]["volatility"],
        "lead_time_days_mean": metrics["overall"]["lead_time_days_mean"],
        "lead_time_days_p90": metrics["overall"]["lead_time_days_p90"],
        "n_users": metrics["overall"]["n_users"],
        "n_days": metrics["overall"]["n_days"],
    }], on_conflict="version,segment").execute()

    # Deduplicate reliability bins by bin value (keep first occurrence)
    reliability_dedup = {}
    for row in metrics["reliability"]:
        bin_key = float(row["bin"])
        if bin_key not in reliability_dedup:
            reliability_dedup[bin_key] = row
    sb.table("eval_reliability").upsert([
        {**row, "version": version, "segment": segment}
        for row in reliability_dedup.values()
    ], on_conflict="version,segment,bin").execute()

    sb.table("eval_volatility_series").upsert([
        {**row, "version": version, "segment": segment}
        for row in metrics["volatility_series"]
    ], on_conflict="version,segment,day").execute()

    sb.table("eval_lead_hist").upsert([
        {**row, "version": version, "segment": segment}
        for row in metrics["lead_time_hist"]
    ], on_conflict="version,segment,days").execute()

    sb.table("eval_shap_global").upsert([
        {**row, "version": version, "segment": segment}
        for row in metrics["shap_global"]
    ], on_conflict="version,segment,feature").execute()

def run_once(version, model_version=None, days_back=60, calibrate=True, make_figures=False):
    """Run evaluation once with given configuration. Returns metrics dict."""
    sb = sb_client()
    
    # Date range
    start = (datetime.date.today() - datetime.timedelta(days=days_back)).isoformat()
    end = TODAY
    
    # Fetch all data
    all_days, all_p, all_y, user_data = fetch_all_data(sb, start, end, model_version)
    
    if len(all_p) == 0:
        print(f"No data found for {version}")
        return None
    
    # Hold-out split to avoid calibration overfit
    # Train on 70%, evaluate on 30%
    idx = int(0.7 * len(all_p))
    train = slice(0, idx)
    test = slice(idx, None)
    
    # Apply calibration if requested
    if calibrate:
        # Train isotonic regression on training set only
        ir = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip")
        p_train_array = np.array([float(x) for x in all_p[train]]).reshape(-1, 1)
        y_train_array = np.array([int(t) for t in all_y[train]])
        ir.fit(p_train_array, y_train_array)
        
        # Apply calibration to all predictions
        all_p_array = np.array([float(x) for x in all_p]).reshape(-1, 1)
        all_p_final = ir.predict(all_p_array)
        all_p_final = np.array(all_p_final)
    else:
        # Use raw predictions without calibration
        all_p_final = all_p
    
    # Compute reliability curve with equal-frequency binning on test set only (paper metrics)
    p_test = all_p_final[test]
    y_test = all_y[test]
    # Use fewer bins when samples are small
    reliability_bins = 5 if len(y_test) <= 250 else 10
    reliability, ece_value = reliability_equalfreq(p_test, y_test, n_bins=reliability_bins)
    
    # Compute overall metrics using predictions on test set only (paper metrics)
    tau = float(np.quantile(all_p_final, 0.8)) if len(all_p_final) > 0 else 1.0
    overall = {
        "brier": brier_score(p_test, y_test),  # Paper metric: test set only
        "ece": float(ece_value),  # Paper metric: test set only
        "volatility": volatility(all_p_final),  # Use all data for volatility
        "lead_time_days_mean": 0.0,  # Will compute from hist
        "lead_time_days_p90": 0.0,
        "n_users": len(user_data),
        "n_days": len(set(all_days))
    }
    
    # Note: volatility_series and lead_time_hist currently use calibration internally
    # For ablation, we should update them to also accept calibrate flag
    # For now, we'll use them as-is (they do their own calibration with hold-out)
    volatility_series = compute_volatility_series(sb, start, end, model_version)
    lead_time_hist = compute_lead_time_hist(sb, start, end, model_version)
    
    # Update overall with lead time stats
    overall["lead_time_days_mean"], overall["lead_time_days_p90"] = compute_lead_time_stats(lead_time_hist)
    
    # Compute global SHAP values
    shap_global = compute_shap_global(sb, start, end, model_version)
    
    # Build output matching UI data contract
    out = {
        "overall": overall,
        "reliability": reliability,
        "volatility_series": volatility_series,
        "lead_time_hist": lead_time_hist,
        "shap_global": shap_global
    }
    
    # Save output
    version_safe = version.replace("/", "_")
    (OUT/f"{TODAY}_{version_safe}_metrics.json").write_text(json.dumps(out, indent=2))
    
    # Generate figures if requested
    if make_figures:
        generate_figures(out, OUT, version)
    
    return out

def main():
    ap = argparse.ArgumentParser(description="Generate evaluation metrics matching UI data contract")
    ap.add_argument("--version", type=str, default="phase3-v1", help="Evaluation version tag (default: phase3-v1)")
    ap.add_argument("--model-version", type=str, help="Filter by model_version in risk_scores (optional)")
    ap.add_argument("--days-back", type=int, default=60, help="Number of days back from today (default: 60)")
    ap.add_argument("--make-figures", action="store_true", help="Generate visualization figures")
    ap.add_argument("--ablation", action="store_true", help="Run ablation study (all forecast/calibration combinations)")
    
    args = ap.parse_args()
    
    sb = sb_client()
    
    if args.ablation:
        # Run ablation study
        EXPERIMENTS = [
            ("phase3-v1-naive-raw", {"forecast": "naive", "calibrate": False}),
            ("phase3-v1-naive-cal", {"forecast": "naive", "calibrate": True}),
            ("phase3-v1-gru-raw", {"forecast": "gru", "calibrate": False}),
            ("phase3-v1-gru-cal", {"forecast": "gru", "calibrate": True}),
        ]
        
        print("Running ablation study...\n")
        for ver, cfg in EXPERIMENTS:
            # Map forecast type to model_version filter
            # Assuming risk_scores have model_version matching forecast type
            model_ver = f"phase3-v1-{cfg['forecast']}" if cfg["forecast"] != "naive" else "phase3-v1"
            metrics = run_once(
                version=ver,
                model_version=model_ver,
                days_back=args.days_back,
                calibrate=cfg["calibrate"],
                make_figures=args.make_figures
            )
            if metrics:
                upsert_eval_cache(sb, ver, metrics, segment="all")
                print(f"[OK] ablation cached: {ver}")
            else:
                print(f"[SKIP] skipped: {ver} (no data)")
        print("\nAblation study complete!")
    else:
        # Run single evaluation
        version = args.version
        model_version = args.model_version or os.getenv("MODEL_VERSION")
        
        metrics = run_once(
            version=version,
            model_version=model_version,
            days_back=args.days_back,
            calibrate=True,  # Default to calibrated
            make_figures=args.make_figures
        )
        
        if metrics:
            # Upsert metrics to cache tables for React UI
            upsert_eval_cache(sb, version, metrics, segment="all")
            print(f"[OK] Cache updated for version={version}, segment=all")
            
            # Also print JSON to stdout
            print("\n" + "="*60)
            print("METRICS JSON:")
            print("="*60)
            print(json.dumps(metrics, indent=2))

if __name__=="__main__": 
    main()
