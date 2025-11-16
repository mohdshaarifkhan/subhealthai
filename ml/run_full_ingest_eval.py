#!/usr/bin/env python3
"""
Run Full Ingest & Evaluation Pipeline

Detects CSVs in data/samsung_backup + data/wes_backup/out,
posts them to /api/ingest, runs risk computation, and evaluates all versions.
"""

import subprocess
import glob
import os

VERSIONS = ["phase3-v1-self", "phase3-v1-wes", "phase3-v1-naive-cal"]

def run(cmd, env=None):
    print(">>", cmd)
    env_dict = os.environ.copy()
    if env:
        env_dict.update(env)
    subprocess.run(cmd, shell=True, check=True, env=env_dict)

# Ingest Samsung
for f in glob.glob("data/samsung_backup/OUT_samsung*.csv"):
    run(f'curl -X POST http://localhost:3000/api/ingest -F "email=you+samsung@subhealth.ai" -F "file=@{f}"')

# Ingest WESAD
for f in glob.glob("data/wes_backup/out/*.csv"):
    run(f'curl -X POST http://localhost:3000/api/ingest -F "email=wes@subhealth.ai" -F "file=@{f}"')

# Run risk + eval
for v in VERSIONS:
    run(f'python ml/run_phase3_slice.py --since 2024-01-01 --version {v}', env={"PYTHONPATH": "."})
    run(f'python ml/evaluation/run.py --version {v} --make-figures', env={"PYTHONPATH": "."})
