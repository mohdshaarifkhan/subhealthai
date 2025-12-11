# scripts/flagging_engine.py
import os
from datetime import date
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not URL or not KEY:
    raise SystemExit("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

sb: Client = create_client(URL, KEY)

Metric = Dict[str, Any]
Flag = Dict[str, Any]

def rules(m: Metric) -> List[Flag]:
    out: List[Flag] = []
    if m.get("sleep_minutes") is not None and m["sleep_minutes"] < 300:
        out.append({"user_id": m["user_id"], "day": m["day"], "flag_type": "sleep_debt",
                    "severity": 2, "rationale": "Sleep under 5 hours"})
    if m.get("hrv_avg") is not None and m["hrv_avg"] < 40:
        out.append({"user_id": m["user_id"], "day": m["day"], "flag_type": "low_hrv",
                    "severity": 3, "rationale": "HRV below baseline proxy"})
    if m.get("rhr") is not None and m["rhr"] > 80:
        out.append({"user_id": m["user_id"], "day": m["day"], "flag_type": "elevated_rhr",
                    "severity": 2, "rationale": "Resting HR > 80 bpm"})
    return out

def run(target_day: Optional[str] = None) -> None:
    day = target_day or date.today().isoformat()

    # 1) fetch metrics for day
    m_resp = sb.table("metrics").select(
        "id,user_id,day,steps,sleep_minutes,hr_avg,hrv_avg,rhr"
    ).eq("day", day).execute()
    metrics: List[Metric] = m_resp.data or []

    planned: List[Flag] = []
    for m in metrics:
        planned.extend(rules(m))

    if not planned:
        print(f"[flags] none for {day}")
        sb.table("audit_log").insert({
            "user_id": None,
            "action": "compute_flags_py",
            "details": {"day": day, "inserted": 0, "reason": "no-planned-flags"}
        }).execute()
        return

    # 2) idempotency: skip flags that already exist for (user_id, day, flag_type)
    e_resp = sb.table("flags").select("user_id,day,flag_type").eq("day", day).execute()
    existing = e_resp.data or []
    existing_keys = {f'{r["user_id"]}|{r["day"]}|{r["flag_type"]}' for r in existing}

    to_insert = [f for f in planned
                 if f'{f["user_id"]}|{f["day"]}|{f["flag_type"]}' not in existing_keys]

    inserted = 0
    skipped = len(planned) - len(to_insert)

    if to_insert:
        # EITHER: simple insert (works because you added the unique constraint)
        ins = sb.table("flags").insert(to_insert).execute()
        # If you prefer a single call that tolerates dupes, try this instead:
        # ins = sb.table("flags").upsert(to_insert, on_conflict="user_id,day,flag_type").execute()
        if ins.data is not None:
            inserted = len(ins.data)
        else:
            # some versions don't return rows; assume all rows attempted were inserted
            inserted = len(to_insert)

    # 3) audit log
    sb.table("audit_log").insert({
        "user_id": None,
        "action": "compute_flags_py",
        "details": {
            "day": day,
            "planned": len(planned),
            "inserted": inserted,
            "skipped_as_duplicates": skipped,
            "rule_thresholds": {"sleep_minutes_lt": 300, "hrv_avg_lt": 40, "rhr_gt": 80}
        }
    }).execute()

    print(f"[flags] planned={len(planned)}, inserted={inserted}, skipped={skipped} for {day}")

if __name__ == "__main__":
    # optional arg: python scripts/flagging_engine.py 2025-09-28
    import sys
    run(sys.argv[1] if len(sys.argv) > 1 else None)
