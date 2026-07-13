from fastapi import APIRouter
import joblib
from pathlib import Path
import pandas as pd

from app.services.trainer import train_station_model

router = APIRouter()

# Resolve path relative to this router file: AI/app/routers/retrain.py
# parents[2] is the AI root directory: AI/
BASE_DIR = Path(__file__).resolve().parents[2]

MODELS_DIR = BASE_DIR / "app" / "models" / "finetuned"
DATA_DIR = BASE_DIR / "data" / "processed"

print("Retrain router loaded")


@router.post("/retrain/{station_id}")
def retrain(station_id: str):

    print(f"Retraining station {station_id}")

    # Load default data. Fallback to 235_training.csv if delhi_bootstrap_weather.csv doesn't exist.
    data_path = DATA_DIR / "delhi_bootstrap_weather.csv"
    if not data_path.exists():
        data_path = DATA_DIR / "235_training.csv"

    df = pd.read_csv(data_path)

    model = train_station_model(df)

    # Ensure models/finetuned directory exists
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / f"{station_id}.pkl"

    joblib.dump(model, model_path)

    return {
        "status": "success",
        "station": station_id,
        "saved_as": str(model_path)
    }
