"""
Model Training Script for Metabolic and Cardiovascular Risk Models

This script trains two separate models using real clinical datasets:
1. Diabetes/Metabolic Risk Model (Pima Indians Diabetes Database)
2. Cardiovascular Risk Model (UCI Cleveland Heart Disease Dataset)

Usage:
    python -m ml.train_model
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from sklearn.impute import SimpleImputer
import joblib
import json
import os
import requests
import io

# Create models directory
model_dir = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(model_dir, exist_ok=True)

print("🏥 SubHealthAI: Initializing Clinical Model Training Pipeline...")

# ==========================================
# 1. DIABETES MODEL (Pima Indians Dataset)
# ==========================================
print("\n[1/2] Training Diabetes Risk Model (Source: Pima Indians Diabetes Database)...")

# URL for the raw Pima dataset
url_pima = "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv"
columns_pima = ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age', 'Outcome']

acc_diabetes = None
auc_diabetes = None
diabetes_features = None
diabetes_model = None

try:
    # Fetch real data
    s = requests.get(url_pima, timeout=30).content
    df_diabetes = pd.read_csv(io.StringIO(s.decode('utf-8')), names=columns_pima)
    
    # Data Cleaning: Replace 0s with NaN in physiological columns (0 glucose is impossible)
    cols_to_fix = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
    df_diabetes[cols_to_fix] = df_diabetes[cols_to_fix].replace(0, np.nan)
    
    # Impute missing values
    imputer = SimpleImputer(strategy='median')
    df_diabetes[cols_to_fix] = imputer.fit_transform(df_diabetes[cols_to_fix])
    
    X = df_diabetes.drop('Outcome', axis=1)
    y = df_diabetes['Outcome']
    
    diabetes_features = list(X.columns)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train Gradient Boosting (Better for tabular medical data)
    diabetes_model = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42)
    diabetes_model.fit(X_train, y_train)
    
    preds = diabetes_model.predict(X_test)
    acc_diabetes = accuracy_score(y_test, preds)
    auc_diabetes = roc_auc_score(y_test, diabetes_model.predict_proba(X_test)[:, 1])
    
    print(f"   ✅ Training Complete. Accuracy: {acc_diabetes:.2%}, AUC: {auc_diabetes:.2f}")
    
    # Save model (both v1 and default name for backward compatibility)
    diabetes_model_path_v1 = os.path.join(model_dir, 'diabetes_model_v1.pkl')
    diabetes_model_path = os.path.join(model_dir, 'diabetes_model.pkl')
    joblib.dump(diabetes_model, diabetes_model_path_v1)
    joblib.dump(diabetes_model, diabetes_model_path)  # For backward compatibility
    print(f"   💾 Model saved to: {diabetes_model_path_v1}")

except Exception as e:
    print(f"   ❌ Error fetching Pima data: {e}")
    print("   ⚠️  Continuing with cardiac model training...")

# ==========================================
# 2. CARDIOVASCULAR MODEL (Cleveland Heart Disease)
# ==========================================
print("\n[2/2] Training Cardiac Risk Model (Source: UCI Cleveland Heart Disease)...")

url_heart = "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data"
columns_heart = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal', 'target']

heart_acc = None
heart_features = None
heart_model = None

try:
    s = requests.get(url_heart, timeout=30).content
    df_heart = pd.read_csv(io.StringIO(s.decode('utf-8')), names=columns_heart, na_values="?")
    
    # Drop missing rows (small dataset strategy)
    df_heart.dropna(inplace=True)
    
    # Convert target: 0 = Healthy, 1-4 = Heart Disease Presence
    df_heart['target'] = df_heart['target'].apply(lambda x: 1 if x > 0 else 0)
    
    X_h = df_heart.drop('target', axis=1)
    y_h = df_heart['target']
    
    heart_features = list(X_h.columns)
    
    X_train_h, X_test_h, y_train_h, y_test_h = train_test_split(X_h, y_h, test_size=0.2, random_state=42)
    
    # Train Random Forest
    heart_model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    heart_model.fit(X_train_h, y_train_h)
    
    preds_h = heart_model.predict(X_test_h)
    heart_acc = accuracy_score(y_test_h, preds_h)
    
    print(f"   ✅ Training Complete. Accuracy: {heart_acc:.2%}")
    
    # Save model (both v1 and default name for backward compatibility)
    cardio_model_path_v1 = os.path.join(model_dir, 'cardio_model_v1.pkl')
    cardio_model_path = os.path.join(model_dir, 'cardio_model.pkl')
    joblib.dump(heart_model, cardio_model_path_v1)
    joblib.dump(heart_model, cardio_model_path)  # For backward compatibility
    print(f"   💾 Model saved to: {cardio_model_path_v1}")

except Exception as e:
    print(f"   ❌ Error fetching Heart data: {e}")

# ==========================================
# 3. Save metadata for Evidence
# ==========================================
meta = {}

if diabetes_model is not None and acc_diabetes is not None:
    meta["diabetes_model"] = {
        "features": diabetes_features,
        "type": "GradientBoostingClassifier",
        "data": "pima_indians_diabetes_database",
        "data_source": url_pima,
        "accuracy": float(acc_diabetes),
        "auc": float(auc_diabetes) if auc_diabetes is not None else None,
        "n_estimators": 100,
        "learning_rate": 0.1,
        "max_depth": 3
    }

if heart_model is not None and heart_acc is not None:
    meta["cardio_model"] = {
        "features": heart_features,
        "type": "RandomForestClassifier",
        "data": "uci_cleveland_heart_disease",
        "data_source": url_heart,
        "accuracy": float(heart_acc),
        "n_estimators": 100,
        "max_depth": 5
    }

if meta:
    metadata_path = os.path.join(model_dir, 'model_metadata.json')
    with open(metadata_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"\n📄 Metadata written to: {metadata_path}")

print("\n🚀 All Systems Operational. Models ready for inference.")

