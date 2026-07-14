from fastapi import APIRouter, HTTPException

from app.services.cache import get_cache, set_cache
from app.services.attribution.engine import attribute_sources

router = APIRouter(
    prefix="/attribution",
    tags=["Attribution"]
)


@router.get("/{station_id}")
def get_attribution(station_id: str):

    try:

        cache = get_cache(station_id)

        if cache is None:
            raise HTTPException(
                status_code=400,
                detail="Forecast not found. Please generate forecast first."
            )

        # --------------------------
        # Read from Forecast Cache
        # --------------------------

        latest = cache["latest_pollutants"]
        weather = cache["current_weather"]
        geo = cache["geo"]

        result = attribute_sources(
            weather=weather,
            geo=geo,
            pollutants=latest
        )

        # --------------------------
        # Cache Attribution Result
        # --------------------------

        set_cache(
            station_id=station_id,
            attribution=result
        )

        return {

            "stationId": station_id,

            "stationName": cache["stationName"],

            "timestamp": latest["timestamp"],

            "currentAQI": latest["aqi"],

            **result

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
