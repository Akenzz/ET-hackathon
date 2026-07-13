from fastapi import APIRouter, HTTPException
import requests

from app.services.attribution.engine import attribute_sources

router = APIRouter(
    prefix="/attribution",
    tags=["Attribution"]
)

JAVA_URL = "http://localhost:8000/forecast"


@router.get("/{station_id}")
def get_attribution(station_id: str):

    try:

        response = requests.get(
            f"{JAVA_URL}/{station_id}",
            params={
                "history": 3,
                "horizon": 1
            }
        )

        response.raise_for_status()

        data = response.json()

        # --------------------------
        # Latest Pollutant Snapshot
        # --------------------------

        latest = data["aqiHistory"][-1]

        # --------------------------
        # Current Weather
        # --------------------------

        weather = data["weatherForecast"][0]

        # --------------------------
        # Geo Features
        # --------------------------

        geo = data["geoFeatures"]

        result = attribute_sources(
            weather=weather,
            geo=geo,
            pollutants=latest
        )

        return {

            "stationId": data["stationId"],

            "stationName": data["stationName"],

            "timestamp": latest["timestamp"],

            "currentAQI": latest["aqi"],

            **result

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
