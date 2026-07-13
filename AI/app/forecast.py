from fastapi import APIRouter, HTTPException

from app.services.predictor import predict_aqi

router = APIRouter(
    prefix="/forecast",
    tags=["Forecast"]
)


@router.get("/{station_id}")
def forecast(station_id: str):
    """
    Production Forecast Endpoint.

    For now this uses dummy data.

    Later:
    Java Backend
        ↓
    AQI History
    Weather
        ↓
    predict_aqi()
    """

    try:

        # -------------------------------------------------
        # TEMPORARY MOCK DATA
        # Replace this with Java API calls later
        # -------------------------------------------------

        aqi_history = [
            302,
            315,
            318
        ]

        weather = {

            "tempC": 35.5,

            "humidity": 54,

            "precipMm": 0,

            "pressure": 974.6,

            "windSpeedKmh": 8.8,

            "windDirDeg": 251

        }

        result = predict_aqi(
            station_id,
            aqi_history,
            weather
        )

        return result

    except FileNotFoundError:

        raise HTTPException(
            status_code=404,
            detail=f"Model not found for station {station_id}"
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )