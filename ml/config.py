import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

MODEL_VERSION_BASELINE = "baseline_v0.1"
MODEL_VERSION_FORECAST = "forecast_v0.1"

# Additional configuration
DEMO_USER_ID = os.getenv("DEMO_USER_ID")  # No default - must be provided via env var if needed

# Model configuration
SEED = 42
ROUND = 4  # decimals
DETERMINISTIC = True

# Single source of truth for instability engine version
ENGINE_VERSION = "phase3-v1-wes"
VERSION_TAG = ENGINE_VERSION  # keep backwards compatibility

# Risk policy
WEIGHTS_V1 = {"b0": 0.0, "w_hrv": 0.8, "w_rhr": 0.7, "w_sleep": 0.5, "w_anom": 0.6, "w_fcast": 0.4}
DISPLAY_DECIMALS = 1  # UI shows one decimal; DB stores 4dp