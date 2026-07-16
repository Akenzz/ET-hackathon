from datetime import datetime, timedelta

CACHE = {}

CACHE_TTL = timedelta(minutes=30)


def get_cache(station_id: str):

    if station_id not in CACHE:
        return None

    data = CACHE[station_id]

    if datetime.now() - data["generated_at"] > CACHE_TTL:
        del CACHE[station_id]
        return None

    return data


def set_cache(
    station_id: str,
    station_name=None,
    forecast=None,
    highest_forecast=None,
    geo=None,
    attribution=None,
    advisory=None,
    latest_pollutants=None,
    current_weather=None
):

    existing = CACHE.get(station_id, {})

    CACHE[station_id] = {

        "stationName": station_name if station_name is not None else existing.get("stationName"),

        "forecast": forecast if forecast is not None else existing.get("forecast"),

        "highestForecast": highest_forecast if highest_forecast is not None else existing.get("highestForecast"),

        "geo": geo if geo is not None else existing.get("geo"),

        "attribution": attribution if attribution is not None else existing.get("attribution"),

        "advisory": advisory if advisory is not None else existing.get("advisory"),

        "latest_pollutants": latest_pollutants if latest_pollutants is not None else existing.get("latest_pollutants"),

        "current_weather": current_weather if current_weather is not None else existing.get("current_weather"),

        "generated_at": datetime.now()

    }