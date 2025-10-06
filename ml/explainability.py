"""
Generates SHAP summary plots for baseline IsolationForest features (z-space).
Saves PNGs to /ml/outputs/shap_<user>_<date>.png
"""

import os, numpy as np, pandas as pd, datetime as dt
import shap, matplotlib.pyplot as plt
from ml.config import supabase

OUT_DIR = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(OUT_DIR, exist_ok=True)

def fetch_user_df(user_id: str) -> pd.DataFrame:
    # Use the canonical view shaped for ML
    res = supabase.table("metrics_for_ml").select("*").eq("user_id", user_id).order("day").execute()
    df = pd.DataFrame(res.data or [])
    if df.empty:
        return df
    df["day"] = pd.to_datetime(df["day"]).dt.date

    # Ensure expected columns exist & numeric
    for c in ["hrv_mean", "rhr_mean", "sleep_hours", "steps"]:
        if c not in df.columns:
            df[c] = np.nan
        df[c] = pd.to_numeric(df[c], errors="coerce")

    # Drop if all features are NaN
    if df[["hrv_mean","rhr_mean","sleep_hours","steps"]].isna().all(axis=1).all():
        return pd.DataFrame()
    return df

MIN_ROWS = 20  # lower this from 40 so small histories still work

def fallback_linear_bar(df: pd.DataFrame, uid: str):
    """If not enough rows for SHAP, fit a simple linear surrogate on the proxy
    and save a bar chart of |coefficients| as importance."""
    import sklearn.linear_model as lm
    import numpy as np
    import matplotlib.pyplot as plt
    X = df[["hrv_mean","rhr_mean","sleep_hours","steps"]].astype(float).values
    # z-normalize
    X = (X - X.mean(0)) / (X.std(0) + 1e-6)
    # proxy: same directionality we use elsewhere
    y = -X[:,0] + X[:,1] - X[:,2] - X[:,3]
    model = lm.Ridge(alpha=1.0).fit(X, y)
    names = ["HRV(z-)", "RHR(z+)", "Sleep(z-)", "Steps(z-)"]
    imp = np.abs(model.coef_.ravel())
    order = np.argsort(imp)[::-1]

    plt.figure(figsize=(5,3))
    plt.bar([names[i] for i in order], imp[order])
    plt.title("Feature importance (fallback)")
    plt.tight_layout()
    outfile = os.path.join(OUT_DIR, f"fallback_imp_{uid}_{dt.date.today().isoformat()}.png")
    plt.savefig(outfile, dpi=160)
    plt.close()
    print("Saved", outfile)

def main():
    users = supabase.table("users").select("id").execute().data or []
    for u in users:
        uid = u["id"]
        df = fetch_user_df(uid)
        if df.empty:
            print(f"Skipping {uid}: no data.")
            continue

        if len(df) < MIN_ROWS:
            print(f"Not enough rows for SHAP ({len(df)}<{MIN_ROWS}); saving fallback bar for {uid}.")
            fallback_linear_bar(df, uid)
            continue

        # --- SHAP path ---
        X = df[["hrv_mean","rhr_mean","sleep_hours","steps"]].astype(float).values
        X = (X - X.mean(0)) / (X.std(0) + 1e-6)

        import sklearn.linear_model as lm
        y = -X[:,0] + X[:,1] - X[:,2] - X[:,3]
        model = lm.Ridge(alpha=1.0).fit(X, y)

        explainer = shap.Explainer(model, X, feature_names=["HRV(z-)","RHR(z+)","Sleep(z-)","Steps(z-)"])
        values = explainer(X)

        plt.figure()
        shap.plots.beeswarm(values, show=False, max_display=10)
        outfile = os.path.join(OUT_DIR, f"shap_{uid}_{dt.date.today().isoformat()}.png")
        plt.tight_layout()
        plt.savefig(outfile, dpi=160)
        plt.close()
        print("Saved", outfile)

if __name__ == "__main__":
    main()
