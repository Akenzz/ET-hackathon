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

        raise Exception(
            "Forecast not found. Generate forecast first."
        )

    # ------------------------------------
    # Already generated?
    # ------------------------------------

    if cache.get("advisory") is not None:

        print("Returning cached advisory...")

        return cache["advisory"]

    # ------------------------------------
    # Forecast
    # ------------------------------------

    forecast = cache["forecast"]

    # ------------------------------------
    # Prompt
    # ------------------------------------

    prompt = build_prompt(

        station_name=station_name,

        forecast=forecast,

        hospitals=hospitals,

        schools=schools,

        kindergartens=kindergartens

    )

    # ------------------------------------
    # Ask Groq
    # ------------------------------------

    print("Calling Groq...")

    response = ask_groq(prompt)

    advisory = json.loads(response)

    # ------------------------------------
    # Save in cache
    # ------------------------------------

    set_cache(

        station_id,

        advisory=advisory

    )

    return advisory