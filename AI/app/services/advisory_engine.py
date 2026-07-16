import json

from app.services.cache import get_cache, set_cache
from app.services.prompt_builder import build_prompt
from app.services.groq_client import ask_groq


def generate_health_advisory(
    station_id: str,
    station_name: str,
    hospitals: int,
    schools: int,
    kindergartens: int
):
    """
    Generates a multilingual citizen health advisory.

    Workflow

    Cache
        ↓
    Forecast exists?
        ↓
    Build Prompt
        ↓
    Groq
        ↓
    Cache
        ↓
    Return
    """
    cache = get_cache(station_id)

    if cache is None:

        raise Exception("Forecast not found.")

    if cache.get("advisory") is not None:

        print("Returning cached advisory...")

        return cache["advisory"]

    highest = cache["highestForecast"]

    geo = cache["geo"]

    attribution = cache.get("attribution")

    prompt = build_prompt(

        station_name=cache["stationName"],

        highest_forecast=highest,

        geo=geo,

        attribution=attribution

    )
    print("=" * 80)
    print("PROMPT")
    print(prompt)
    print("=" * 80)
    print("Calling Groq...")

    advisory = ask_groq(prompt)

    set_cache(

        station_id,

        advisory=advisory

    )

    return advisory