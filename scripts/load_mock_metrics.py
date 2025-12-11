# scripts/load_mock_metrics.py
import os, json
from datetime import date, timedelta
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SERVICE_ROLE:
    raise SystemExit("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

sb: Client = create_client(SUPABASE_URL, SERVICE_ROLE)

def get_or_create_user(email="demo@subhealth.ai", display_name="Demo User"):
    resp = sb.table("users").select("id").eq("email", email).execute()
    if resp.data:
        return resp.data[0]["id"]
    ins = sb.table("users").insert({"email": email, "display_name": display_name}).execute()
    return ins.data[0]["id"]

def main():
    user_id = get_or_create_user()
    with open("scripts/mock_metrics.json", "r", encoding="utf-8") as f:
        items = json.load(f)

    inserts = []
    for item in items:
        d = str(date.today() + timedelta(days=int(item["day"])))
        inserts.append({
            "user_id": user_id,
            "day": d,
            "steps": item["steps"],
            "sleep_minutes": item["sleep_minutes"],
            "hr_avg": item["hr_avg"],
            "hrv_avg": item["hrv_avg"],
            "rhr": item["rhr"]
        })

    # upsert per (user_id, day)
    for row in inserts:
        sb.table("metrics").upsert(row, on_conflict="user_id,day").execute()

    print(f"[metrics] upserted {len(inserts)} rows for user {user_id}")

if __name__ == "__main__":
    main()
