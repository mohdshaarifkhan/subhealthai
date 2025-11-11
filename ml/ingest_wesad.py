#!/usr/bin/env python3
"""
Ingest WESAD dataset into Supabase metrics table.
Usage: python ml/ingest_wesad.py --path data/wesad/
"""

import os
import argparse
import sys
import uuid
import pandas as pd
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.data.wesad_loader import load_wesad
from ml.db import sb_client

def get_or_create_user(sb, wesad_id: str):
    """Get or create a user for a WESAD subject ID (e.g., S2, S3)."""
    email = f"wesad_{wesad_id.lower()}@example.com"
    display_name = f"WESAD {wesad_id}"
    
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
    parser = argparse.ArgumentParser(description="Ingest WESAD dataset into Supabase")
    parser.add_argument("--path", type=str, required=True, help="Path to WESAD dataset directory")
    args = parser.parse_args()
    
    if not os.path.exists(args.path):
        print(f"Error: Path does not exist: {args.path}")
        sys.exit(1)
    
    print(f"Loading WESAD data from {args.path}...")
    df = load_wesad(args.path)
    
    if df.empty:
        print("No data loaded. Check that the path contains subject folders (S2, S3, etc.)")
        sys.exit(1)
    
    print(f"Loaded {len(df)} rows from {df['user_id'].nunique()} subjects")
    
    sb = sb_client()
    
    # Map WESAD user IDs to database user IDs
    user_map = {}
    for wesad_id in df["user_id"].unique():
        user_map[wesad_id] = get_or_create_user(sb, wesad_id)
        print(f"  {wesad_id} -> {user_map[wesad_id]}")
    
    # Prepare rows for metrics table
    rows = []
    for _, row in df.iterrows():
        # Map WESAD user_id to database user_id
        db_user_id = user_map[row["user_id"]]
        
        # Convert day to string
        day_str = str(row["day"])
        
        # Map columns: wesad loader returns "sleep", table expects "sleep_minutes"
        metric_row = {
            "user_id": db_user_id,
            "day": day_str,
            "hrv_avg": float(row["hrv_avg"]) if pd.notna(row["hrv_avg"]) else None,
            "hr_avg": float(row["hr_avg"]) if pd.notna(row["hr_avg"]) else None,
            "rhr": float(row["hr_avg"]) if pd.notna(row["hr_avg"]) else None,  # Use hr_avg as rhr if available
            "steps": int(row["steps"]) if pd.notna(row["steps"]) else None,
            "sleep_minutes": int(row["sleep"]) if pd.notna(row["sleep"]) else None,
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

