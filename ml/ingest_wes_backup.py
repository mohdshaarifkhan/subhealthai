#!/usr/bin/env python3
"""
Ingest WES backup dataset into Supabase metrics table.
Usage: python ml/ingest_wes_backup.py --path data/wes_backup/
"""

import os
import argparse
import sys
import pandas as pd

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.data.wes_backup_loader import load_wes_backup
from ml.db import sb_client

def get_or_create_user(sb, user_id: str):
    """Get or create a user for a subject ID."""
    email = f"wes_backup_{user_id.lower().replace(' ', '_')}@example.com"
    display_name = f"WES Backup {user_id}"
    
    # Check if user exists
    resp = sb.table("users").select("id").eq("email", email).execute()
    if resp.data:
        return resp.data[0]["id"]
    
    # Create new user
    ins = sb.table("users").insert({
        "email": email,
        "display_name": display_name
    }).execute()
    return ins.data[0]["id"]

def main():
    parser = argparse.ArgumentParser(description="Ingest WES backup dataset into Supabase")
    parser.add_argument("--path", type=str, required=True, help="Path to WES backup dataset directory")
    args = parser.parse_args()
    
    if not os.path.exists(args.path):
        print(f"Error: Path does not exist: {args.path}")
        sys.exit(1)
    
    print(f"Loading WES backup data from {args.path}...")
    try:
        df = load_wes_backup(args.path)
    except Exception as e:
        print(f"Error loading data: {e}")
        sys.exit(1)
    
    if df.empty:
        print("No data loaded. Check that the path contains CSV files.")
        sys.exit(1)
    
    print(f"Loaded {len(df)} rows from {df['user_id'].nunique()} subjects")
    
    sb = sb_client()
    
    # Map backup user IDs to database user IDs
    user_map = {}
    for user_id in df["user_id"].unique():
        user_map[user_id] = get_or_create_user(sb, str(user_id))
        print(f"  {user_id} -> {user_map[user_id]}")
    
    # Prepare rows for metrics table
    rows = []
    for _, row in df.iterrows():
        # Map backup user_id to database user_id
        db_user_id = user_map[row["user_id"]]
        
        # Convert day to string
        day_str = str(row["day"])
        
        # Prepare metric row
        metric_row = {
            "user_id": db_user_id,
            "day": day_str,
            "hrv_avg": float(row["hrv_avg"]) if pd.notna(row["hrv_avg"]) else None,
            "hr_avg": float(row["hr_avg"]) if pd.notna(row["hr_avg"]) else None,
            "rhr": float(row["rhr"]) if pd.notna(row["rhr"]) else float(row["hr_avg"]) if pd.notna(row["hr_avg"]) else None,
            "steps": int(row["steps"]) if pd.notna(row["steps"]) else None,
            "sleep_minutes": int(row["sleep_minutes"]) if pd.notna(row["sleep_minutes"]) else None,
        }
        rows.append(metric_row)
    
    # Upsert in batches to avoid overwhelming the database
    batch_size = 100
    total_upserted = 0
    
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        sb.table("metrics").upsert(batch, on_conflict="user_id,day").execute()
        total_upserted += len(batch)
        if (i // batch_size + 1) % 10 == 0:
            print(f"  Processed {total_upserted}/{len(rows)} rows...")
    
    print(f"✅ Upserted {total_upserted} metric rows")
    print(f"   Users: {len(user_map)}")
    print(f"   Days: {df['day'].nunique()}")

if __name__ == "__main__":
    main()

