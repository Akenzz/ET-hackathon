from typing import Dict


def clamp(value):
    return max(0.0, value)


def calculate_scores(geo: Dict, weather: Dict):
    """
    Rule-based source attribution engine.

    Inputs
    ------
    geo:
        majorRoadsCount
        constructionSitesCount
        industrialZonesCount
        nearestIndustrialDistKm

    weather:
        windSpeedKmh
        precipMm
    """

    wind = weather["windSpeedKmh"]
    rain = weather["precipMm"]

    # -------------------------
    # Traffic
    # -------------------------

    traffic = (
        geo["majorRoadsCount"] * 15
        - wind * 0.5
        - rain * 8
    )

    traffic = clamp(traffic)

    # -------------------------
    # Construction
    # -------------------------

    construction = (
        geo["constructionSitesCount"] * 18
        - rain * 12
        - wind * 0.4
    )

    construction = clamp(construction)

    # -------------------------
    # Industry
    # -------------------------

    distance_bonus = max(
        0,
        10 - geo["nearestIndustrialDistKm"]
    )

    industry = (
        geo["industrialZonesCount"] * 20
        + distance_bonus
        - wind * 0.3
    )

    industry = clamp(industry)

    return {
        "Traffic": traffic,
        "Construction": construction,
        "Industry": industry
    }


def build_reason(source, geo, weather):

    if source == "Traffic":

        return (
            f"{geo['majorRoadsCount']} major roads nearby, "
            f"wind speed {weather['windSpeedKmh']} km/h."
        )

    if source == "Construction":

        return (
            f"{geo['constructionSitesCount']} construction sites detected."
        )

    return (
        f"{geo['industrialZonesCount']} industrial zones, "
        f"{geo['nearestIndustrialDistKm']} km away."
    )


def attribute_sources(geo: Dict, weather: Dict):

    scores = calculate_scores(
        geo,
        weather
    )

    total = sum(scores.values())

    if total == 0:

        return {
            "dominantSource": "Unknown",
            "confidence": 0,
            "contributors": []
        }

    contributors = []

    for source, score in scores.items():

        contributors.append({

            "source": source,

            "weight": round(
                score * 100 / total,
                1
            ),

            "reason": build_reason(
                source,
                geo,
                weather
            )
        })

    contributors.sort(
        key=lambda x: x["weight"],
        reverse=True
    )

    return {

        "dominantSource": contributors[0]["source"],

        "confidence": round(
            contributors[0]["weight"] / 100,
            2
        ),

        "contributors": contributors
    }