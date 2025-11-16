"""
Wearable Exam Stress (WES) dataset loader (offline, local files).

Purpose
- Traverse a local copy of the PhysioNet "Wearable Exam Stress" dataset
  (https://physionet.org/content/wearable-exam-stress/1.0.0/),
  detect time series columns (HR, HRV, EDA, Temp),
  and export day-level aggregates suitable for the CSV ingest API.

Output
- One CSV per subject under --out, with columns:
    day,metric,value,source
  Use the existing /api/ingest endpoint with form-data fields:
    file=<subject.csv>, email=<target_user_email>

Example
  mkdir -p data/wes_backup
  # Download outside this script (network-free here). For example:
  # wget -r -N -c -np https://physionet.org/files/wearable-exam-stress/1.0.0/
  python -m ml.data.wes_backup_loader --root path/to/wearable-exam-stress/1.0.0 --out data/wes_backup/out

Notes
- This script does NOT write to your DB. It only prepares CSVs for /api/ingest.
- It aggregates the following metrics if present in source files:
  hr       -> aggregated as mean per day (metric key: "hr")
  hrv      -> aggregated as mean per day (metric key: "hrv")
  eda,temp -> aggregated and included for completeness (ignored by rollup)
"""

from __future__ import annotations

import argparse
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
import numpy as np


HR_CANDS = ["hr", "heart_rate", "heartrate", "hr_bpm", "bpm"]
HRV_CANDS = ["hrv", "rmssd", "sdnn", "pnn50", "rr", "rr_interval"]
EDA_CANDS = ["eda", "gsr", "electrodermal", "skin_conductance"]
TEMP_CANDS = ["temp", "temperature", "skin_temp", "wrist_temp"]
TIME_CANDS = ["time", "timestamp", "datetime", "date_time", "datetime_utc"]


def find_first(cols: List[str], candidates: List[str]) -> str | None:
    s = {c.lower() for c in cols}
    for cand in candidates:
        if cand.lower() in s:
            return cand
    return None


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Normalize column names first
    new_cols = [re.sub(r"\s+", "_", c.strip()).lower() for c in df.columns]
    df.columns = new_cols
    # coerce numerics when possible (skip time columns)
    for c in df.columns:
        if c not in TIME_CANDS:
            try:
                df[c] = pd.to_numeric(df[c], errors="coerce")
            except (TypeError, ValueError):
                # Skip if conversion fails
                pass
    return df


def parse_time(df: pd.DataFrame) -> pd.DataFrame:
    time_col = find_first(df.columns.tolist(), TIME_CANDS)
    if not time_col:
        raise ValueError("No time-like column found. Looked for: " + ", ".join(TIME_CANDS))
    out = df.copy()
    # Check if values look like Unix timestamps (large numbers > 1e9)
    sample = out[time_col].dropna().iloc[0] if not out[time_col].dropna().empty else None
    if sample is not None and isinstance(sample, (int, float)) and sample > 1e9:
        # Unix timestamp in seconds
        out[time_col] = pd.to_datetime(out[time_col], unit='s', errors="coerce")
    else:
        # Try parsing as regular datetime
        out[time_col] = pd.to_datetime(out[time_col], errors="coerce")
    out = out.dropna(subset=[time_col])
    out["day"] = out[time_col].dt.date.astype(str)
    return out


def pick_metric_columns(df: pd.DataFrame) -> Dict[str, str]:
    cols = df.columns.tolist()
    mapping: Dict[str, str] = {}
    hr = find_first(cols, HR_CANDS)
    if hr: mapping["hr"] = hr
    hrv = find_first(cols, HRV_CANDS)
    if hrv: mapping["hrv"] = hrv
    eda = find_first(cols, EDA_CANDS)
    if eda: mapping["eda"] = eda
    tmp = find_first(cols, TEMP_CANDS)
    if tmp: mapping["temp"] = tmp
    return mapping


def aggregate_daily(df: pd.DataFrame, mapping: Dict[str, str], min_samples: int = 60) -> List[Tuple[str, str, float]]:
    """Return list of (day, metric, value). min_samples filters sparse days."""
    out: List[Tuple[str, str, float]] = []
    # ensure numeric
    for m, col in mapping.items():
        df[col] = pd.to_numeric(df[col], errors="coerce")
    # day counts for filtering
    counts = df.groupby("day").size()
    valid_days = set(counts[counts >= min_samples].index.astype(str))
    if not valid_days:
        return out
    gb = df.groupby("day")
    for day, g in gb:
        if str(day) not in valid_days:
            continue
        for m, col in mapping.items():
            vals = pd.to_numeric(g[col], errors="coerce").dropna()
            if not len(vals):
                continue
            val = float(np.nanmean(vals))
            out.append((str(day), m, round(val, 4)))
    return out


def subject_id_from_path(path: Path) -> str:
    # Extract subject and session from path
    # e.g., .../Data/S1/Final/HR.csv -> S1_Final
    # e.g., .../Data/S1/Midterm 1/HR.csv -> S1_Midterm_1
    parts = path.parts
    subj = None
    session = None
    
    # Find subject (S1, S2, etc.)
    for p in parts:
        if re.match(r'^S\d+$', p, re.I):
            subj = p
            break
    
    # Find session (Final, Midterm 1, Midterm 2, etc.)
    for p in parts:
        if p.lower() in ['final', 'midterm 1', 'midterm 2', 'midterm1', 'midterm2']:
            session = p.replace(' ', '_')
            break
    
    if subj and session:
        return f"{subj}_{session}"
    elif subj:
        return subj
    else:
        # Fallback: try to extract from any part
        candidates = [p for p in parts if re.search(r"(subj|subject|sess|session|s\d+|id\d+)", p, re.I)]
        if candidates:
            return "_".join(candidates[-2:])
    return path.stem


def process_csv(csv_path: Path, min_samples: int = 60) -> List[Tuple[str, str, float]]:
    try:
        # Try reading with header first
        df = pd.read_csv(csv_path)
        # If first column looks like a timestamp (numeric, large), treat as headerless
        if len(df.columns) == 1 or (len(df.columns) > 0 and pd.api.types.is_numeric_dtype(df.iloc[:, 0]) and df.iloc[0, 0] > 1e9):
            # Headerless format - first row is timestamp, rest are values
            df = pd.read_csv(csv_path, header=None)
            if df.empty or len(df) < 2:
                return []
            # First row is timestamp, rest are values
            start_time = float(df.iloc[0, 0])
            # Assume 1Hz sampling or infer from filename
            sampling_rate = 1.0  # default
            if "HR" in csv_path.name.upper() or "IBI" in csv_path.name.upper():
                sampling_rate = 1.0
            elif "BVP" in csv_path.name.upper():
                sampling_rate = 64.0
            elif "EDA" in csv_path.name.upper():
                sampling_rate = 4.0
            elif "TEMP" in csv_path.name.upper():
                sampling_rate = 4.0
            # Create time series
            n_samples = len(df) - 1  # exclude header row
            timestamps = [start_time + i / sampling_rate for i in range(n_samples)]
            values = df.iloc[1:, 0].values
            df = pd.DataFrame({"time": timestamps, "value": values})
        else:
            df = normalize_columns(df)
    except Exception as e:
        return []
    
    if df.empty:
        return []
    
    # Normalize if not already done
    if "time" not in df.columns and not any("timestamp" in str(c).lower() for c in df.columns):
        df = normalize_columns(df)
    
    try:
        df = parse_time(df)
    except Exception:
        return []
    
    # Map based on filename if columns don't match
    mapping = pick_metric_columns(df)
    if not mapping:
        # Try to infer from filename
        fname_lower = csv_path.name.lower()
        if "hr" in fname_lower and "ibi" not in fname_lower:
            if "value" in df.columns:
                mapping = {"hr": "value"}
        elif "ibi" in fname_lower:
            if "value" in df.columns or len(df.columns) >= 2:
                val_col = df.columns[1] if len(df.columns) >= 2 else "value"
                mapping = {"hrv": val_col}  # IBI -> HRV
        elif "eda" in fname_lower:
            if "value" in df.columns or len(df.columns) >= 2:
                val_col = df.columns[1] if len(df.columns) >= 2 else "value"
                mapping = {"eda": val_col}
        elif "temp" in fname_lower:
            if "value" in df.columns or len(df.columns) >= 2:
                val_col = df.columns[1] if len(df.columns) >= 2 else "value"
                mapping = {"temp": val_col}
    
    if not mapping:
        return []
    
    return aggregate_daily(df, mapping, min_samples=min_samples)


def main():
    ap = argparse.ArgumentParser(description="Prepare WES daily aggregates for CSV ingest")
    ap.add_argument("--root", required=True, help="Path to wearable-exam-stress/1.0.0 root")
    ap.add_argument("--out", required=True, help="Output directory for subject CSVs")
    ap.add_argument("--min-samples", type=int, default=60, help="Min samples per day to keep (default 60)")
    ap.add_argument("--source", type=str, default="wes", help="Source tag written to CSV (default 'wes')")
    args = ap.parse_args()

    root = Path(args.root)
    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)

    csv_files = list(root.rglob("*.csv"))
    if not csv_files:
        print("No CSV files found under", root)
        return

    total_rows = 0
    subjects_written = 0
    for f in csv_files:
        rows = process_csv(f, min_samples=args.min_samples)
        if not rows:
            continue
        subj = subject_id_from_path(f)
        outf = outdir / f"{subj}.csv"
        # write header once per subject (append if exists)
        header_needed = not outf.exists()
        with outf.open("a", encoding="utf-8") as w:
            if header_needed:
                w.write("day,metric,value,source\n")
            for day, metric, value in rows:
                w.write(f"{day},{metric},{value},{args.source}\n")
        total_rows += len(rows)
        subjects_written += 1 if header_needed else 0

    print(f"Subjects written: {subjects_written}")
    print(f"Total daily rows: {total_rows}")
    print("Done. Use /api/ingest per subject file and pass the desired user email in the form.")


if __name__ == "__main__":
    main()

