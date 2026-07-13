from fastapi import APIRouter
from app.services.attribution import calculate_sources

router = APIRouter()


@router.get("/attribution/{station_id}")
def attribution(station_id: str):

    # -----------------------
    # Temporary Mock Data
    # Later these come from Java
    # -----------------------

    pollutants = {
        "co": 9.3,
        "no2": 45,
        "o3": 18,
        "pm10": 250,
        "pm25": 170,
        "so2": 8
    }

    weather = {
        "tempC": 34,
        "humidity": 72,
        "windSpeedKmh": 4,
        "windDirDeg": 180,
        "precipMm": 0
    }

    geo = {
        "majorRoadsCount": 6,
        "constructionSitesCount": 2,
        "industrialZonesCount": 1,
        "nearestIndustrialDistKm": 0.8
    }

    result = calculate_sources(
        pollutants,
        weather,
        geo
    )

    return {
        "stationId": station_id,
        "sources": result
    }