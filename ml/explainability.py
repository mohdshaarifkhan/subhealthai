"""
Generates SHAP summary plots for baseline IsolationForest features (z-space).
Saves PNGs to /ml/outputs/shap_<user>_<date>.png
"""

import os, numpy as np, pandas as pd, datetime as dt
import shap, matplotlib.pyplot as plt
from ml.config import supabase

OUT_DIR = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(OUT_DIR, exist_ok=True)

FEATS = ["hrv_mean","rhr_mean","sleep_hours","steps"]
NAMES = ["HRV(z-)","RHR(z+)","Sleep(z-)","Steps(z-)"]

def upload_and_record_plot(uid: str, df: pd.DataFrame, outfile: str):
    """Upload outfile to Storage and upsert its public URL in explainability_images."""
    bucket = "explainability"
    # Use latest metric day if available; else today
    try:
        day_val = pd.to_datetime(df["day"]).max().date() if "day" in df.columns and len(df) else dt.date.today()
    except Exception:
        day_val = dt.date.today()

    # Upload
    bucket = "explainability"
    path = f"plots/{uid}/{os.path.basename(outfile)}"

    try:
        with open(outfile, "rb") as f:
            # IMPORTANT: values must be strings, and key names match the Python client
            file_options = {
                "contentType": "image/png",
                "cacheControl": "3600",
                "upsert": "true",            # <- string, not bool
            }
            supabase.storage.from_(bucket).upload(path, f, file_options)
        public_url = supabase.storage.from_(bucket).get_public_url(path)
    except Exception as e:
        print(f"[upload_and_record_plot] storage upload failed: {e}")
        return

    # Upsert row
    try:
        payload = {"user_id": uid, "day": day_val.isoformat(), "img_url": public_url}
        res = supabase.table("explainability_images").upsert(payload, on_conflict="user_id,day").execute()
        print(f"[upload_and_record_plot] upserted row for {uid} {day_val}: {public_url}")
    except Exception as e:
        print(f"[upload_and_record_plot] table upsert failed: {e}")

def prepare_X(df: pd.DataFrame):
    """Return NaN-imputed, z-normalized X (n x 4). Always finite."""
    X = df[FEATS].astype(float).to_numpy(copy=True)

    # If no rows or all NaN, return a tiny dummy matrix so downstream never crashes
    if X.size == 0:
        return np.zeros((1,4), dtype=float)

    # Impute NaNs with column means; if a column is all NaN, use 0.0
    col_means = np.nanmean(X, axis=0)
    col_means = np.where(np.isfinite(col_means), col_means, 0.0)
    inds = np.where(~np.isfinite(X))
    if inds[0].size:
        X[inds] = np.take(col_means, inds[1])

    # z-normalize with safe std
    mu = X.mean(axis=0)
    sd = X.std(axis=0)
    sd = np.where(sd == 0, 1e-6, sd)
    Xz = (X - mu) / sd
    return Xz

def proxy_y(Xz: np.ndarray):
    """Directionality-consistent proxy target (higher = worse)."""
    # HRV(z-) (invert), RHR(z+) (as-is), Sleep(z-) (invert), Steps(z-) (invert)
    return (-Xz[:,0] + Xz[:,1] - Xz[:,2] -Xz[:,3])

def fetch_user_df(user_id: str) -> pd.DataFrame:
    # Use the canonical view shaped for ML
    res = supabase.table("metrics_for_ml").select("*").eq("user_id", user_id).order("day").execute()
    df = pd.DataFrame(res.data or [])
    if df.empty:
        return df
    df["day"] = pd.to_datetime(df["day"]).dt.date

    # Ensure expected columns exist & numeric
    for c in FEATS:
        df[c] = pd.to_numeric(df.get(c), errors="coerce")

    # Drop if all features are NaN
    if df[["hrv_mean","rhr_mean","sleep_hours","steps"]].isna().all(axis=1).all():
        return pd.DataFrame()
    return df

MIN_ROWS = 10  # was 20; lower so small histories still get SHAP when possible

def fallback_linear_bar(df: pd.DataFrame, uid: str):
    import sklearn.linear_model as lm
    import numpy as np
    import matplotlib.pyplot as plt

    Xz = prepare_X(df)
    # If only one row, still compute a stable importance
    if Xz.ndim == 1:
        Xz = Xz.reshape(1, -1)
    y = proxy_y(Xz)

    try:
        model = lm.Ridge(alpha=1.0).fit(Xz, y)
        imp = np.abs(model.coef_.ravel())
    except Exception:
        imp = np.array([0.25, 0.25, 0.25, 0.25])

    order = np.argsort(imp)[::-1]
    plt.figure(figsize=(5,3))
    plt.bar([NAMES[i] for i in order], imp[order])
    plt.title("Feature importance (fallback)")
    plt.tight_layout()
    outfile = os.path.join(OUT_DIR, f"fallback_imp_{uid}_{dt.date.today().isoformat()}.png")
    plt.savefig(outfile, dpi=160)
    plt.close()
    print("Saved", outfile)
    upload_and_record_plot(uid, df, outfile)

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
        Xz = prepare_X(df)
        y = proxy_y(Xz)

        import sklearn.linear_model as lm
        model = lm.Ridge(alpha=1.0).fit(Xz, y)

        explainer = shap.Explainer(model, Xz, feature_names=NAMES)
        values = explainer(Xz)

        plt.figure()
        shap.plots.beeswarm(values, show=False, max_display=10)
        outfile = os.path.join(OUT_DIR, f"shap_{uid}_{dt.date.today().isoformat()}.png")
        plt.tight_layout()
        plt.savefig(outfile, dpi=160)
        plt.close()
        print("Saved", outfile)
        upload_and_record_plot(uid, df, outfile)

if __name__ == "__main__":
    main()
