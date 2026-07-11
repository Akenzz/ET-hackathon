from fastapi import APIRouter
import joblib
from pathlib import Path
import pandas as pd

from app.services.trainer import train_station_model

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[1]

MODELS = BASE_DIR / "models"

DATA = BASE_DIR / "data" / "processed"

print("Retrain router loaded")
@router.post("/retrain/{station_id}")
def retrain(station_id: str):

    print(f"Retraining station {station_id}")

    # Temporary
    # Later this becomes GET /readings/history
    df = pd.read_csv(
        DATA / "delhi_bootstrap_weather.csv"
    )

    model = train_station_model(df)

    model_path = MODELS / f"{station_id}.pkl"

    joblib.dump(model, model_path)

    return {
        "status": "success",
        "station": station_id,
        "saved_as": str(model_path)
    }