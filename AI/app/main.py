from fastapi import FastAPI
from app.forecast import ForecastService

app = FastAPI()

forecast_service = ForecastService()


@app.get("/")
def home():
    return {"status": "Forecast Service Running"}


@app.get("/forecast/{station_id}")
def forecast(station_id: str, hours: int = 24):

    forecast_df = forecast_service.predict(
        station_id,
        hours
    )

    predictions = []

    for _, row in forecast_df.iterrows():

        predictions.append({
            "ts": row["ds"].isoformat(),
            "aqi_predicted": round(row["yhat"], 2),
            "confidence_low": round(row["yhat_lower"], 2),
            "confidence_high": round(row["yhat_upper"], 2)
        })

    return {
        "station_id": station_id,
        "forecast_horizon": hours,
        "predictions": predictions
    }