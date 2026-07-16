from fastapi import APIRouter, HTTPException

from app.services.cache import get_cache, set_cache
from app.services.geo_client import get_geo_features
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

        # -----------------------------------
        # Fetch Geo only once
        # -----------------------------------

        geo = cache.get("geo")

        if geo is None or geo.get("hospitalCount") is None:

            print("Fetching Geo Features from Java...")

            geo = get_geo_features(station_id)

            set_cache(

                station_id=station_id,

                geo=geo

            )

        # -----------------------------------
        # Generate Advisory
        # -----------------------------------

        advisory = generate_health_advisory(

            station_id=station_id,

            station_name=cache["stationName"],

            hospitals=geo.get("hospitalCount", 0),

            schools=geo.get("schoolCount", 0),

            kindergartens=geo.get("kindergartenCount", 0)

        )

        cache = get_cache(station_id)

        return {

            "stationId": station_id,

            "stationName": cache["stationName"],

            "highestForecastAQI": cache["highestForecast"],

            "vulnerability": geo,

            "advisory": advisory

        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )