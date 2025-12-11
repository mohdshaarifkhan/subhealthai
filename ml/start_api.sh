#!/bin/bash
# Start script for FastAPI ML inference service

echo "🚀 Starting SubHealthAI ML Inference API..."
echo ""

# Check if models exist
if [ ! -f "models/diabetes_model.pkl" ] || [ ! -f "models/cardio_model.pkl" ]; then
    echo "⚠️  Warning: Models not found. Training models first..."
    python -m ml.train_model
    echo ""
fi

# Start FastAPI service
echo "✅ Starting FastAPI service on http://localhost:8000"
echo "📚 API docs available at http://localhost:8000/docs"
echo ""

uvicorn api:app --host 0.0.0.0 --port 8000 --reload

