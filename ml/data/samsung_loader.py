# ml/data/samsung_loader.py

import argparse, re, json
from pathlib import Path
import pandas as pd
import numpy as np

# ---------- helpers ----------

TS_RE = re.compile(r".*(\d{14})$")  # ...20251103151617

def day_from_filename(p: Path) -> str:
    m = TS_RE.match(p.stem)
    if not m:
        # fallback: file mtime
        return pd.to_datetime(p.stat().st_mtime, unit="s").date().isoformat()
    ts = m.group(1)  # YYYYMMDDHHMMSS
    return pd.to_datetime(ts, format="%Y%m%d%H%M%S").date().isoformat()

def read_csv_any(p: Path):
    # Samsung CSVs typically have: row 1 = metadata, row 2 = headers, row 3+ = data
    # Try skiprows=1 first (most common case)
    for skip in (1, 0, 2):
        for enc in ("utf-8-sig", "utf-8"):
            try:
                df = pd.read_csv(p, skiprows=skip, encoding=enc, on_bad_lines="skip")
                # Validate: should have reasonable column names (not metadata values)
                if len(df.columns) > 0 and not any(col.startswith("com.samsung.") and "," not in str(col) and len(col) < 30 for col in df.columns[:3]):
                    return df
            except Exception:
                continue
    return None

def to_minutes_hhmmss(x):
    # Accepts "HH:MM:SS", "HH:MM.S" etc; returns minutes float
    if pd.isna(x): return np.nan
    s = str(x).strip().replace(".", ":")
    parts = [t for t in s.split(":") if t != ""]
    if len(parts) < 2: return np.nan
    try:
        h = int(parts[0]); m = int(parts[1]); sec = int(parts[2]) if len(parts) > 2 else 0
        return h * 60 + m + sec / 60.0
    except Exception:
        return np.nan

def first_numeric_col(df: pd.DataFrame):
    for c in df.columns:
        if pd.api.types.is_numeric_dtype(df[c]):
            return c
    # allow string numbers
    for c in df.columns:
        try:
            s = pd.to_numeric(df[c], errors="coerce")
            if s.notna().any(): 
                df[c] = s
                return c
        except Exception:
            continue
    return None

# ---------- loaders (per tracker) ----------

def load_sleep_minutes(root: Path) -> pd.DataFrame:
    # Prefer shealth trackers (richer); fallback to health.sleep_stage
    pats = [
        "com.samsung.shealth.sleep*.csv",
        "com.samsung.shealth.sleep_raw_data*.csv",
        "com.samsung.health.sleep_stage*.csv",
    ]
    files = []
    for pat in pats:
        files.extend(root.glob(pat))
    rows = []
    for f in files:
        df = read_csv_any(f)
        if df is None: continue

        # Expect start_time / end_time time-of-day strings
        st_col = next((c for c in df.columns if c.lower().endswith("start_time")), None)
        et_col = next((c for c in df.columns if c.lower().endswith("end_time")), None)

        total_mins = 0.0
        # Check if start_time/end_time have valid data
        if st_col and et_col and df[st_col].notna().any() and df[et_col].notna().any():
            st = df[st_col].apply(to_minutes_hhmmss)
            et = df[et_col].apply(to_minutes_hhmmss)
            dur = (et - st).clip(lower=0, upper=24*60)
            total_mins = float(dur.dropna().sum())
        
        # If that didn't work, try duration column (prioritize sleep_duration)
        if total_mins == 0:
            # Prefer sleep_duration, then any duration column with data
            dur_col = None
            if "sleep_duration" in df.columns:
                dur_col = "sleep_duration"
            else:
                # Find any duration column that has data
                for c in df.columns:
                    if ("dur" in c.lower() or "min" in c.lower()) and df[c].notna().any():
                        dur_col = c
                        break
            
            if dur_col:
                # Try to convert to numeric if needed
                if not pd.api.types.is_numeric_dtype(df[dur_col]):
                    df[dur_col] = pd.to_numeric(df[dur_col], errors="coerce")
                if pd.api.types.is_numeric_dtype(df[dur_col]):
                    # If it's in hours, convert to minutes; otherwise assume minutes
                    vals = df[dur_col].dropna()
                    if len(vals) > 0:
                        # If values are < 24, likely hours; if > 60, likely minutes already
                        sample = vals.iloc[0]
                        if sample < 24:
                            total_mins = float(vals.sum() * 60)  # hours to minutes
                        else:
                            total_mins = float(vals.clip(lower=0, upper=24*60).sum())

        if total_mins > 0:
            rows.append({"day": day_from_filename(f), "sleep_minutes": round(total_mins, 2)})

    return pd.DataFrame(rows)

def load_hr_avg(root: Path) -> pd.DataFrame:
    files = list(root.glob("com.samsung.shealth.tracker.heart_rate*.csv"))
    if not files:
        files = list(root.glob("com.samsung.health.hrv*.csv"))  # rare fallback
    rows = []
    for f in files:
        df = read_csv_any(f)
        if df is None or df.empty: continue

        # Try to find a numeric HR column (bpm). In many exports it's the last numeric column.
        num_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        if not num_cols:
            # try to coerce any column ending with value
            val_col = next((c for c in df.columns if c.lower().endswith("value")), None)
            if val_col is not None:
                df[val_col] = pd.to_numeric(df[val_col], errors="coerce")
                num_cols = [val_col]

        if not num_cols: 
            # as a last resort, pick the last column and try coercion
            last = df.columns[-1]
            df[last] = pd.to_numeric(df[last], errors="coerce")
            if df[last].notna().any():
                num_cols = [last]

        if not num_cols: 
            continue

        # Filter plausible HR range (30..220 bpm)
        vals = pd.concat([pd.to_numeric(df[c], errors="coerce") for c in num_cols], axis=1)
        vals = vals.apply(pd.to_numeric, errors="coerce")
        v = vals.where((vals >= 30) & (vals <= 220))
        hr_mean = float(v.stack().mean()) if v.notna().any().any() else np.nan
        if not np.isnan(hr_mean):
            rows.append({"day": day_from_filename(f), "hr_avg": round(hr_mean, 2)})

    return pd.DataFrame(rows)

def load_steps(root: Path) -> pd.DataFrame:
    # Priority: pedometer_day_summary -> step_daily_trend -> activity.day_summary
    files = list(root.glob("com.samsung.shealth.tracker.pedometer_day_summary*.csv"))
    tag = "pedometer_day_summary"
    if not files:
        files = list(root.glob("com.samsung.shealth.step_daily_trend*.csv"))
        tag = "step_daily_trend"
    if not files:
        files = list(root.glob("com.samsung.shealth.activity.day_summary*.csv"))
        tag = "activity_day_summary"

    rows = []
    for f in files:
        df = read_csv_any(f)
        if df is None or df.empty: continue

        # Find a 'steps' like column
        step_col = None
        for name in df.columns:
            ln = name.lower()
            if "step" in ln and ("count" in ln or ln.endswith("steps")):
                step_col = name; break
            if ln in ("count", "total_count", "step_count"):
                step_col = name; break
        if step_col is None:
            step_col = first_numeric_col(df)
        if step_col is None: 
            continue

        steps_val = pd.to_numeric(df[step_col], errors="coerce").sum()
        if steps_val > 0:
            rows.append({"day": day_from_filename(f), "steps": int(steps_val)})

    return pd.DataFrame(rows)

# ---------- main ----------

def main(root: str, out_wide: str, out_long: str):
    rootp = Path(root)

    sleep = load_sleep_minutes(rootp)
    hr    = load_hr_avg(rootp)
    steps = load_steps(rootp)

    dfs = [d for d in (sleep, hr, steps) if d is not None and not d.empty]
    if not dfs:
        raise SystemExit("No parsable Samsung files found. (sleep/hr/steps)")

    wide = dfs[0]
    for d in dfs[1:]:
        wide = wide.merge(d, on="day", how="outer")
    wide = wide.sort_values("day")

    # Long format for /api/ingest
    long = []
    for _, r in wide.iterrows():
        if not pd.isna(r.get("sleep_minutes")):
            long.append({"day": r["day"], "metric": "sleep_minutes", "value": float(r["sleep_minutes"]), "source": "samsung"})
        if not pd.isna(r.get("hr_avg")):
            long.append({"day": r["day"], "metric": "hr_avg", "value": float(r["hr_avg"]), "source": "samsung"})
        if not pd.isna(r.get("steps")):
            long.append({"day": r["day"], "metric": "steps", "value": float(r["steps"]), "source": "samsung"})
    long = pd.DataFrame(long).sort_values(["day","metric"])

    Path(out_wide).parent.mkdir(parents=True, exist_ok=True)
    Path(out_long).parent.mkdir(parents=True, exist_ok=True)
    wide.to_csv(out_wide, index=False)
    long.to_csv(out_long, index=False)

    print(f"[OK] Wrote wide CSV: {out_wide} (rows={len(wide)})")
    print(f"[OK] Wrote long CSV: {out_long} (rows={len(long)})")
    if len(wide):
        print(wide.head())
        print(long.head())

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Folder with Samsung export CSVs")
    ap.add_argument("--out_wide", required=True, help="Output path for wide CSV")
    ap.add_argument("--out_long", required=True, help="Output path for long (ingest) CSV")
    args = ap.parse_args()
    main(args.root, args.out_wide, args.out_long)
