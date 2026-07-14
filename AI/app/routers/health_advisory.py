from fastapi import APIRouter, HTTPException

from app.services.cache import get_cache
from app.services.advisory_engine import generate_health_advisory

router = APIRouter(
    prefix="/health-advisory",
    tags=["Health Advisory"]
)


@router.get("/{station_id}")
def health_advisory(station_id: str):

    try:

        cache = get_cache(station_id)

        if cache is None:

            raise Exception(
                "Forecast not available. Please generate forecast first."
            )

        geo = cache["geo"]

        advisory = generate_health_advisory(

            station_id=station_id,

            station_name=cache["stationName"],

            hospitals=geo.get("hospitalCount", 0),

            schools=geo.get("schoolCount", 0),

            kindergartens=geo.get("kindergartenCount", 0)

        )

        return {

            "stationId": station_id,

            "stationName": cache["stationName"],

            "highestForecastAQI": max(
                cache["forecast"],
                key=lambda x: x["aqi_predicted"]
            ),

            "vulnerability": {

                "hospitals": geo.get("hospitalCount", 0),

                "schools": geo.get("schoolCount", 0),

                "kindergartens": geo.get("kindergartenCount", 0)

            },

            "advisory": advisory

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
