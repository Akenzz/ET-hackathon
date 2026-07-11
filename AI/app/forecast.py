from fastapi import APIRouter
import pandas as pd
from app.services.model_manager import load_model
from app.services.predictor import build_future_dataframe
router = APIRouter()


@router.get("/forecast/{station_id}")
def forecast(station_id: str):

    model = load_model(station_id)

    # Temporary weather
    weather = {
        "tempC": 34,
        "humidity": 60,
        "windSpeedKmh": 8,
        "windDirDeg": 180,
        "precipMm": 0
    }

    future = build_future_dataframe(weather)

    prediction = model.predict(future)

    return prediction[
        [
            "ds",
            "yhat",
            "yhat_lower",
            "yhat_upper"
        ]
    ].to_dict(
        orient="records"
    )