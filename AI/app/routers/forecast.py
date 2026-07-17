from fastapi import APIRouter, HTTPException
import requests

from app.services.recursive_predictor import recursive_predict

router = APIRouter(
    prefix="/forecast",
    tags=["Forecast"]
)

JAVA_URL = "http://localhost:8000/forecast"


@router.get("/{station_id}")
def forecast(
    station_id: str,
    horizon: int = 24,
    history: int = 3
):

    try:

        response = requests.get(

            f"{JAVA_URL}/{station_id}",

            params={
                "horizon": horizon,
                "history": history
            }

        )

        response.raise_for_status()

        data = response.json()
        print(data)
        aqi_history = [

            item["aqi"]

            for item in data["aqiHistory"]

        ]
        latest_pollutants = data["aqiHistory"][-1]

        geo_features = data["geoFeatures"]
        weather_forecast = []

        for item in data["weatherForecast"]:

            weather_forecast.append({

                "timestamp": item["timestamp"],

                "tempC": item["temperature"],

                "humidity": item["humidity"],

                "precipMm": item["precipitation"],

                "pressure": item["pressure"],

                "windSpeedKmh": item["windSpeed"],

                "windDirDeg": item["windDirection"]

            })

        predictions = recursive_predict(

            station_id,

            aqi_history,

            weather_forecast,

        )
        highest = max(
            predictions,
            key=lambda x: x["aqi_predicted"]
        )
        current_weather = data["weatherForecast"][0] if data["weatherForecast"] else {}

        from app.services.cache import set_cache
        set_cache(

            station_id=data["stationId"],

            station_name=data["stationName"],

            forecast=predictions,

            highest_forecast=highest,

            geo=data["geoFeatures"],

            latest_pollutants=latest_pollutants,

            current_weather=current_weather

        )
        return {

            "stationId": data["stationId"],

            "stationName": data["stationName"],

            "forecast": predictions

        }
        from pprint import pprint
        from app.services.cache import CACHE

        print("\n========== CACHE ==========")
        pprint(CACHE)
        print("===========================\n")
    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)

        )
