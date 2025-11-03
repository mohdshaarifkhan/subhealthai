# scripts/generate_synthetic_data.py

import os, random, datetime as dt, uuid

import numpy as np

from supabase import create_client

# Try to load from .env.local if available
try:
    from dotenv import load_dotenv
    load_dotenv('.env.local')
except ImportError:
    pass  # dotenv not installed, rely on environment variables

URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not URL or not KEY:
    raise SystemExit("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

sb = create_client(URL, KEY)


rng = np.random.default_rng(42)


def daterange(start, days):

    for i in range(days):

        yield (start + dt.timedelta(days=i)).date()


def gen_user_series(days=90):

    # baseline "healthy" ranges

    hrv_base = rng.normal(55, 6)           # ms

    rhr_base = rng.normal(62, 3)           # bpm

    sleep_base = rng.normal(420, 40)       # minutes

    steps_base = rng.normal(8000, 2000)    # steps



    # slow drift + occasional shocks

    drift = rng.normal(0, 0.02, size=days).cumsum()

    shock_days = set(rng.choice(range(10, days-5), size=2, replace=False))



    hrv, rhr, sleep, steps = [], [], [], []

    for d in range(days):

        s = 1 + drift[d]

        hrv.append(max(20, rng.normal(hrv_base*s, 4)))

        rhr.append(max(45, rng.normal(rhr_base*(2-s), 2.2)))

        sleep.append(max(240, rng.normal(sleep_base*s, 35)))

        steps.append(max(500, rng.normal(steps_base*(0.9 + 0.2*rng.random()), 1500)))

        if d in shock_days:

            hrv[-1] -= rng.uniform(8, 15)

            rhr[-1] += rng.uniform(4, 8)

            sleep[-1] -= rng.uniform(40, 90)

    return hrv, rhr, sleep, steps, shock_days


def main(users=10, days=90, start="2025-07-01"):

    start = dt.datetime.fromisoformat(start)

    rows = []

    flag_rows = []

    for i in range(users):

        # Create user first
        user_email = f"synthetic_user_{i+1}@example.com"
        user_resp = sb.table("users").select("id").eq("email", user_email).execute()
        if user_resp.data:
            uid = user_resp.data[0]["id"]
        else:
            user_insert = sb.table("users").insert({
                "email": user_email,
                "display_name": f"Synthetic User {i+1}"
            }).execute()
            uid = user_insert.data[0]["id"]

        hrv, rhr, sleep, steps, shocks = gen_user_series(days)

        for day_idx, day in enumerate(daterange(start, days)):

            rows.append({

                "user_id": uid,

                "day": str(day),

                "hrv_avg": round(hrv[day_idx], 3),

                "rhr": round(rhr[day_idx], 3),

                "sleep_minutes": int(round(sleep[day_idx])),

                "steps": int(round(steps[day_idx])),

            })

            # mark "events" a few days after a shock → label for lead-time

            if day_idx in (d+4 for d in shocks):

                flag_rows.append({

                    "id": str(uuid.uuid4()),

                    "user_id": uid,

                    "day": str(day),

                    "flag_type": "illness_event",

                    "severity": 2,

                    "rationale": "synthetic event after drift/shock",

                })

    # write (use upsert to handle duplicates)

    sb.table("metrics").upsert(rows, on_conflict="user_id,day").execute()

    if flag_rows:

        sb.table("flags").upsert(flag_rows, on_conflict="user_id,day,flag_type").execute()

    print(f"Upserted metrics: {len(rows)}, flags: {len(flag_rows)}")


if __name__ == "__main__":

    main()

