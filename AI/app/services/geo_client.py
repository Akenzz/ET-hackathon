import requests

GEO_URL = "http://localhost:8000/geo/features"

STATION_COORDS = {
    "2553": {
        "lat": 28.6508,
        "lon": 77.3152
    },
    "2554": {
        "lat": 28.6328,
        "lon": 77.2011
    },
    "2556": {
        "lat": 28.5632,
        "lon": 77.1865
    },
    "3715": {
        "lat": 28.6289,
        "lon": 77.2410
    }
}


def get_geo_features(station_id: str):

    if station_id not in STATION_COORDS:
        raise Exception(f"No coordinates configured for station {station_id}")

    coords = STATION_COORDS[station_id]

    response = requests.get(
        GEO_URL,
        params={
            "lat": coords["lat"],
            "lon": coords["lon"]
        }
    )

    response.raise_for_status()

    return response.json()