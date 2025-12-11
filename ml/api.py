from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import uvicorn
import os

# DEFINING THE APP
app = FastAPI(title="SubHealthAI Clinical Backend")

# ---------------------------------------------------------
# 0. CORS CONFIGURATION (CRITICAL FOR REACT)
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow your React App
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# ---------------------------------------------------------
# 1. LOAD MODELS
# ---------------------------------------------------------
MODELS = {}

def load_models():
    try:
        # Get the directory where this file is located
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        MODELS_DIR = os.path.join(BASE_DIR, "models")
        
        # Ensure these path names match exactly where you saved them
        diabetes_path = os.path.join(MODELS_DIR, 'diabetes_model_v1.pkl')
        cardio_path = os.path.join(MODELS_DIR, 'cardio_model_v1.pkl')
        
        # Try versioned names first, fall back to default names
        if os.path.exists(diabetes_path):
            MODELS['diabetes'] = joblib.load(diabetes_path)
        else:
            default_diabetes = os.path.join(MODELS_DIR, 'diabetes_model.pkl')
            if os.path.exists(default_diabetes):
                MODELS['diabetes'] = joblib.load(default_diabetes)
            else:
                raise FileNotFoundError(f"Diabetes model not found at {diabetes_path} or {default_diabetes}")
        
        if os.path.exists(cardio_path):
            MODELS['cardio'] = joblib.load(cardio_path)
        else:
            default_cardio = os.path.join(MODELS_DIR, 'cardio_model.pkl')
            if os.path.exists(default_cardio):
                MODELS['cardio'] = joblib.load(default_cardio)
            else:
                raise FileNotFoundError(f"Cardio model not found at {cardio_path} or {default_cardio}")
        
        print("✅ Clinical Models Loaded Successfully")
    except Exception as e:
        print(f"⚠️ Warning: Models not found. Error: {e}")
        print("   (Ensure .pkl files are in 'ml/models/' folder)")

load_models()

# ---------------------------------------------------------
# 2. DATA STRUCTURES
# ---------------------------------------------------------
class ClinicalInput(BaseModel):
    # Clinical Data (Brain 1)
    glucose: float       # mg/dL
    bmi: float          
    age: int
    systolic_bp: float   # mmHg
    cholesterol: float   # mg/dL
    pregnancies: int = 0
    insulin: float = 79.0
    skin_thickness: float = 20.0
    
    # Wearable Data (Brain 2)
    avg_hrv: float = 45.0
    daily_steps: int = 5000
    sleep_hours: float = 7.0

# Legacy models for backward compatibility
class HealthData(BaseModel):
    glucose: float
    bmi: float
    age: int
    bp: float  # systolic BP

class CardioData(BaseModel):
    age: int
    systolic_bp: float
    cholesterol: float
    resting_hr: float

def map_risk_level(prob: float) -> str:
    """Map probability to risk level"""
    if prob > 0.7:
        return "High"
    elif prob > 0.4:
        return "Moderate"
    else:
        return "Low"

# ---------------------------------------------------------
# 3. API ENDPOINTS
# ---------------------------------------------------------
@app.get("/")
def health_check():
    return {"status": "active", "system": "SubHealthAI Inference Engine"}

@app.get("/health")
def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "diabetes_model_loaded": 'diabetes' in MODELS,
        "cardiac_model_loaded": 'cardio' in MODELS
    }

# This was the missing endpoint causing the 404
@app.post("/predict/clinical_risk")
def predict_clinical_risk(data: ClinicalInput):
    """
    Fuses Chronic Disease Models (RF/GBM) with Acute Signals.
    """
    if 'diabetes' not in MODELS or 'cardio' not in MODELS:
        raise HTTPException(status_code=503, detail="Models not loaded on server")
    
    risk_drivers = []
    
    # --- A. DIABETES PREDICTION ---
    diab_input = pd.DataFrame([[
        data.pregnancies, data.glucose, data.systolic_bp, 
        data.skin_thickness, data.insulin, data.bmi, 
        0.5, data.age 
    ]], columns=['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'])
    
    diab_prob = MODELS['diabetes'].predict_proba(diab_input)[0][1]
    
    # --- B. CARDIO PREDICTION ---
    cardio_input = pd.DataFrame([[
        data.age, 1, 4, data.systolic_bp, 
        data.cholesterol, 0, 1, 150, 0, 1.0, 2, 0, 3
    ]], columns=['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal'])
    
    cardio_prob = MODELS['cardio'].predict_proba(cardio_input)[0][1]
    
    # --- C. ACUTE MODIFIER (The "Watch" Data) ---
    acute_stress_multiplier = 1.0
    if data.avg_hrv < 30:
        acute_stress_multiplier += 0.15
        risk_drivers.append({"factor": "Low HRV", "impact": "+12%"})
    elif data.avg_hrv < 50:
        risk_drivers.append({"factor": "Reduced HRV", "impact": "+5%"})
    
    if data.glucose > 140:
        risk_drivers.append({"factor": "Elevated glucose", "impact": "+12%"})
    elif data.glucose > 100:
        risk_drivers.append({"factor": "Elevated glucose", "impact": "+8%"})
    
    # Add cholesterol-based driver
    if data.cholesterol > 200:
        risk_drivers.append({"factor": "High cholesterol", "impact": "+8%"})
    elif data.cholesterol > 180:
        risk_drivers.append({"factor": "Elevated cholesterol", "impact": "+5%"})
    
    # Add BMI-based driver
    if data.bmi >= 30:
        risk_drivers.append({"factor": "High BMI", "impact": "+10%"})
    elif data.bmi >= 25:
        risk_drivers.append({"factor": "Elevated BMI", "impact": "+6%"})
    
    # If no drivers yet, add general risk indicators based on probabilities
    if len(risk_drivers) == 0:
        if diab_prob > 0.15:
            risk_drivers.append({"factor": "Metabolic risk factors", "impact": f"+{int(diab_prob * 100)}%"})
        if cardio_prob > 0.20:
            risk_drivers.append({"factor": "Cardiovascular risk factors", "impact": f"+{int(cardio_prob * 100)}%"})
        if data.avg_hrv < 60:
            risk_drivers.append({"factor": "Reduced HRV", "impact": "+5%"})
    
    # Calculate Final Score
    overall_risk = ((diab_prob + cardio_prob) / 2) * acute_stress_multiplier
    
    return {
        "analysis": {
            "diabetes_risk_percent": round(diab_prob * 100, 1),
            "cardio_risk_percent": round(cardio_prob * 100, 1),
            "overall_instability_score": min(round(overall_risk * 100, 1), 99)
        },
        "drivers": risk_drivers,
        "status": "processed"
    }

# Legacy endpoints for backward compatibility
@app.post("/predict/diabetes")
def predict_diabetes(data: HealthData):
    """
    Predict diabetes/metabolic risk based on health metrics
    
    **NON-DIAGNOSTIC**: This is a research prototype. Results are for demonstration only.
    """
    if 'diabetes' not in MODELS:
        raise HTTPException(
            status_code=503,
            detail="Diabetes model not loaded. Please train the model first using train_model.py"
        )
    
    try:
        # Model expects: ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 
        #                'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age']
        # We provide: Glucose, BMI, Age, BloodPressure (bp)
        # Fill missing with typical median values from Pima dataset
        input_df = pd.DataFrame([{
            'Pregnancies': 3.0,  # Median from Pima dataset
            'Glucose': data.glucose,
            'BloodPressure': data.bp,
            'SkinThickness': 29.0,  # Median from Pima dataset
            'Insulin': 125.0,  # Median from Pima dataset
            'BMI': data.bmi,
            'DiabetesPedigreeFunction': 0.3725,  # Median from Pima dataset
            'Age': data.age
        }])
        
        probability = MODELS['diabetes'].predict_proba(input_df)[0][1]
        
        return {
            "risk_score": round(probability * 100, 1),
            "risk_level": map_risk_level(probability),
            "model": "pima_diabetes_gb_v1"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/predict/cardio")
def predict_cardio(data: CardioData):
    """
    Predict cardiovascular risk based on health metrics
    
    **NON-DIAGNOSTIC**: This is a research prototype. Results are for demonstration only.
    """
    if 'cardio' not in MODELS:
        raise HTTPException(
            status_code=503,
            detail="Cardiac model not loaded. Please train the model first using train_model.py"
        )
    
    try:
        # Model expects: ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 
        #                'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
        # We provide: age, systolic_bp (trestbps), cholesterol (chol), resting_hr (thalach)
        # Fill missing with typical median values from Cleveland dataset
        input_df = pd.DataFrame([{
            'age': data.age,
            'sex': 1.0,  # 1 = male (typical default)
            'cp': 1.0,  # Typical chest pain type (1 = typical angina)
            'trestbps': data.systolic_bp,
            'chol': data.cholesterol,
            'fbs': 0.0,  # Fasting blood sugar < 120 mg/dl (0 = false)
            'restecg': 0.0,  # Resting ECG normal (0 = normal)
            'thalach': data.resting_hr,  # Maximum heart rate achieved
            'exang': 0.0,  # Exercise induced angina (0 = no)
            'oldpeak': 1.0,  # ST depression induced by exercise (median)
            'slope': 1.0,  # Slope of peak exercise ST segment (1 = upsloping)
            'ca': 0.0,  # Number of major vessels colored by flourosopy (0 = none)
            'thal': 2.0  # Thalassemia (2 = normal)
        }])
        
        probability = MODELS['cardio'].predict_proba(input_df)[0][1]
        
        return {
            "risk_score": round(probability * 100, 1),
            "risk_level": map_risk_level(probability),
            "model": "cleveland_cardio_rf_v1"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
