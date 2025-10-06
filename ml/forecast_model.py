"""
Simple GRU forecaster that predicts next-day 'risk proxy' from sequences of
[hrv_mean, rhr_mean, sleep_hours, steps]. We then rescale prediction to 0..1 as a risk_score
and store in risk_scores with model_version = forecast_v0.1.

This is intentionally lightweight for MVP.
"""

import argparse, json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from datetime import date, timedelta
from ml.config import supabase, MODEL_VERSION_FORECAST

FEATURES = ["hrv_mean", "rhr_mean", "sleep_hours", "steps"]
DEVICE = "cpu"

class GRURegressor(nn.Module):
    def __init__(self, input_dim=4, hidden=32, layers=1):
        super().__init__()
        self.gru = nn.GRU(input_dim, hidden, num_layers=layers, batch_first=True)
        self.head = nn.Linear(hidden, 1)
    def forward(self, x):
        out, _ = self.gru(x)
        return self.head(out[:, -1, :])

def fetch_user_days(user_id: str) -> pd.DataFrame:
    res = supabase.table("metrics").select(
        "user_id, day, hrv_mean, rhr_mean, sleep_hours, steps"
    ).eq("user_id", user_id).order("day").execute()
    df = pd.DataFrame(res.data or [])
    if df.empty: return df
    df["day"] = pd.to_datetime(df["day"]).dt.date
    return df

def train_and_predict(df: pd.DataFrame, seq_len=14):
    # Normalize per-user
    X = df[FEATURES].astype(float).values
    mu, sd = np.nanmean(X, axis=0), np.nanstd(X, axis=0) + 1e-6
    Xn = (X - mu) / sd

    # Build sequences and next-day target (proxy: weighted combo where worse direction is positive)
    # proxy = -hrv + rhr - sleep - steps (z-space)
    z = Xn
    proxy = (-z[:,0] + z[:,1] - z[:,2] - z[:,3]).reshape(-1,1)

    xs, ys = [], []
    for i in range(len(Xn) - seq_len - 1):
        xs.append(Xn[i:i+seq_len])
        ys.append(proxy[i+seq_len])  # predict next day proxy
    if len(xs) < 32:  # too little data
        return None

    xs = torch.tensor(np.stack(xs), dtype=torch.float32, device=DEVICE)
    ys = torch.tensor(np.stack(ys), dtype=torch.float32, device=DEVICE)

    model = GRURegressor(input_dim=Xn.shape[1]).to(DEVICE)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.SmoothL1Loss()

    model.train()
    for _ in range(200):
        opt.zero_grad()
        pred = model(xs)
        loss = loss_fn(pred, ys)
        loss.backward()
        opt.step()

    # Predict last sequence → next day proxy
    with torch.no_grad():
        last_seq = torch.tensor(Xn[-seq_len:], dtype=torch.float32, device=DEVICE).unsqueeze(0)
        next_proxy = model(last_seq).cpu().numpy().ravel()[0]

    # Map proxy to 0..1 risk with sigmoid
    risk = 1 / (1 + np.exp(-1.0 * next_proxy))
    return float(risk)

def upsert(user_id: str, next_day: date, risk: float, df: pd.DataFrame):
    feat = df[df["day"] == df["day"].max()][FEATURES].iloc[0].to_dict()
    supabase.table("risk_scores").upsert({
        "user_id": user_id,
        "day": next_day.isoformat(),
        "risk_score": risk,
        "model_version": MODEL_VERSION_FORECAST,
        "features": json.dumps({"last_observed": feat})
    }, on_conflict="user_id,day,model_version").execute()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seq_len", type=int, default=14)
    args = ap.parse_args()

    users = supabase.table("users").select("id").execute().data or []
    for u in users:
        uid = u["id"]
        df = fetch_user_days(uid)
        if df.empty: continue
        r = train_and_predict(df, seq_len=args.seq_len)
        if r is None: continue
        next_day = df["day"].max() + timedelta(days=1)
        upsert(uid, next_day, r, df)
    print("Forecast risks upserted.")

if __name__ == "__main__":
    main()
