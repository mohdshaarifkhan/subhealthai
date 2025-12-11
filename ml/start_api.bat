@echo off
REM Start script for FastAPI ML inference service (Windows)

echo 🚀 Starting SubHealthAI ML Inference API...
echo.

REM Check if models exist
if not exist "models\diabetes_model.pkl" (
    echo ⚠️  Warning: Models not found. Training models first...
    python -m ml.train_model
    echo.
)

REM Start FastAPI service
echo ✅ Starting FastAPI service on http://localhost:8000
echo 📚 API docs available at http://localhost:8000/docs
echo.

uvicorn api:app --host 0.0.0.0 --port 8000 --reload

