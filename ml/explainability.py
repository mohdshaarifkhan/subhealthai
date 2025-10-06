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
    res = supabase.table("metrics").select(
        "user_id, day, hrv_mean, rhr_mean, sleep_hours, steps"
    ).eq("user_id", user_id).order("day").execute()
    df = pd.DataFrame(res.data or [])
    if df.empty: return df
    df["day"] = pd.to_datetime(df["day"]).dt.date
    return df

def main():
    users = supabase.table("users").select("id").execute().data or []
    for u in users:
        uid = u["id"]
        df = fetch_user_df(uid)
        if df.empty or len(df) < 40:  # need some history
            continue

        X = df[["hrv_mean","rhr_mean","sleep_hours","steps"]].astype(float).values
        X = (X - X.mean(0)) / (X.std(0) + 1e-6)

        # Use a simple linear surrogate for explanation
        import sklearn.linear_model as lm
        y = (-X[:,0] + X[:,1] - X[:,2] - X[:,3])  # same directionality as baseline proxy
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
