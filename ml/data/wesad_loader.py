import pandas as pd
import numpy as np
import os

def load_wesad(base_path: str):
    # Each subject folder: S2, S3, ...
    users = []
    for subj in os.listdir(base_path):
        if not subj.startswith("S"): continue
        file_path = os.path.join(base_path, subj, "S{}_processed.csv".format(subj[1:]))
        if not os.path.exists(file_path): continue
        df = pd.read_csv(file_path)
        df["user_id"] = subj
        df["day"] = pd.to_datetime(df["timestamp"]).dt.date
        users.append(df)
    all_data = pd.concat(users)
    # Normalize columns for your schema
    return all_data.rename(columns={
        "heartrate": "hr_avg",
        "hrv": "hrv_avg",
        "steps": "steps",
        "sleep_time": "sleep"
    })[["user_id", "day", "hr_avg", "hrv_avg", "steps", "sleep"]]

