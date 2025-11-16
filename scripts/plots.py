#!/usr/bin/env python3
"""
Generate paper-ready figures from ./exports CSVs using matplotlib only.
Outputs in ./exports/figures
"""

import os
import csv
from collections import defaultdict
import matplotlib.pyplot as plt

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports"))
FIGDIR = os.path.join(BASE, "figures")
os.makedirs(FIGDIR, exist_ok=True)


def read_csv(path):
    rows = []
    if not os.path.exists(path):
        return rows
    with open(path, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            rows.append(row)
    return rows


def risk_timeline():
    path = os.path.join(BASE, "risk_scores.csv")
    rows = read_csv(path)
    if not rows:
        return
    keycounts = defaultdict(int)
    for r in rows:
        keycounts[(r["user_id"], r["model_version"])] += 1
    if not keycounts:
        return
    (user, ver) = max(keycounts, key=keycounts.get)
    series = [
        (r["day"], float(r["risk"]))
        for r in rows
        if r["user_id"] == user and r["model_version"] == ver
    ]
    series.sort(key=lambda x: x[0])

    xs = [d for d, _ in series]
    ys = [v for _, v in series]

    plt.figure(figsize=(7, 3))
    plt.plot(xs, ys)
    plt.title(f"Risk timeline — {ver} (user {user[:8]}…)")
    plt.xlabel("Day")
    plt.ylabel("Risk (0–1)")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    out = os.path.join(FIGDIR, "risk_timeline.png")
    plt.savefig(out, dpi=200)
    plt.close()


def global_shap_top5():
    rows = read_csv(os.path.join(BASE, "eval_shap_global.csv"))
    if not rows:
        return
    counts = defaultdict(int)
    for r in rows:
        counts[r["model_version"]] += 1
    version = max(counts, key=counts.get)
    feats = [
        (r["feature"], float(r["mean_abs_shap"]))
        for r in rows
        if r["model_version"] == version
    ]
    feats.sort(key=lambda x: x[1], reverse=True)
    top = feats[:5][::-1]

    labels = [f for f, _ in top]
    vals = [v for _, v in top]

    plt.figure(figsize=(5, 3))
    plt.barh(labels, vals)
    plt.title(f"Global importance (Top-5) — {version}")
    plt.xlabel("Mean |SHAP|")
    plt.tight_layout()
    out = os.path.join(FIGDIR, "global_shap_top5.png")
    plt.savefig(out, dpi=200)
    plt.close()


def reliability_calibration():
    rows = read_csv(os.path.join(BASE, "eval_reliability.csv"))
    if not rows:
        return
    versions = sorted(set(r["version"] for r in rows))
    version = versions[0]
    pts = [
        (float(r["bin"]), float(r["pred"]), float(r["obs"]))
        for r in rows
        if r["version"] == version
    ]
    pts.sort(key=lambda x: x[0])

    pred = [p[1] for p in pts]
    obs = [p[2] for p in pts]

    plt.figure(figsize=(4, 4))
    plt.plot([0, 1], [0, 1])
    plt.plot(pred, obs)
    plt.title(f"Calibration — {version}")
    plt.xlabel("Predicted probability")
    plt.ylabel("Observed rate")
    plt.tight_layout()
    out = os.path.join(FIGDIR, "reliability_calibration.png")
    plt.savefig(out, dpi=200)
    plt.close()


def volatility_series():
    rows = read_csv(os.path.join(BASE, "eval_volatility_series.csv"))
    if not rows:
        return
    version = sorted(set(r["version"] for r in rows))[0]
    series = [
        (r["day"], float(r["volatility_score"]))
        for r in rows
        if r["version"] == version
    ]
    series.sort(key=lambda x: x[0])

    xs = [d for d, _ in series]
    ys = [v for _, v in series]

    plt.figure(figsize=(7, 3))
    plt.plot(xs, ys)
    plt.title(f"Volatility series — {version}")
    plt.xlabel("Day")
    plt.ylabel("Volatility score (|Δ|)")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    out = os.path.join(FIGDIR, "volatility_series.png")
    plt.savefig(out, dpi=200)
    plt.close()


def lead_time_hist():
    rows = read_csv(os.path.join(BASE, "eval_lead_hist.csv"))
    if not rows:
        return
    version = sorted(set(r["version"] for r in rows))[0]
    pts = [
        (int(r["lead_day"]), int(r["freq"]))
        for r in rows
        if r["version"] == version
    ]
    pts.sort(key=lambda x: x[0])
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]

    plt.figure(figsize=(5, 3))
    plt.bar(xs, ys)
    plt.title(f"Lead-time distribution — {version}")
    plt.xlabel("Lead days")
    plt.ylabel("Frequency")
    plt.tight_layout()
    out = os.path.join(FIGDIR, "lead_time_hist.png")
    plt.savefig(out, dpi=200)
    plt.close()


def main():
    risk_timeline()
    global_shap_top5()
    reliability_calibration()
    volatility_series()
    lead_time_hist()
    print(f"✓ Figures written to: {FIGDIR}")


if __name__ == "__main__":
    main()
