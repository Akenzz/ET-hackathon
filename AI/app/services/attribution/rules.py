from datetime import datetime


def is_rush_hour(timestamp: str):

    hour = datetime.fromisoformat(
        timestamp.replace("Z", "")
    ).hour

    return (7 <= hour <= 10) or (18 <= hour <= 21)


def meteorology_score(weather):

    score = 0
    reasons = []

    if weather["windSpeed"] < 5:
        score += 25
        reasons.append("Low wind speed")

    if weather["humidity"] >= 70:
        score += 15
        reasons.append("High humidity")

    if weather["precipitation"] == 0:
        score += 10
        reasons.append("No rainfall")

    return score, reasons


def traffic_score(weather, geo, pollutants):

    score = 0
    reasons = []

    if geo["majorRoadsCount"] >= 150:
        score += 30
        reasons.append("High road density")

    if is_rush_hour(pollutants["timestamp"]):
        score += 20
        reasons.append("Rush hour")

    if pollutants["no2"] >= 6:
        score += 15
        reasons.append("Elevated NO₂")

    if pollutants["co"] >= 8:
        score += 10
        reasons.append("Elevated CO")

    return score, reasons


def construction_score(weather, geo, pollutants):

    score = 0
    reasons = []

    if geo["constructionSitesCount"] > 0:

        ratio = pollutants["pm10"] / max(
            pollutants["pm25"],
            1
        )

        if ratio >= 1.5:

            score += 40

            reasons.append("High PM10 / PM2.5 ratio")

    return score, reasons


def industry_score(weather, geo, pollutants):

    score = 0
    reasons = []

    if geo["industrialZonesCount"] > 0:

        score += 20

        reasons.append("Nearby industrial zones")

    if geo["nearestIndustrialDistanceKm"] <= 3:

        score += 20

        reasons.append("Industry within 3 km")

    if pollutants["so2"] >= 5:

        score += 20

        reasons.append("Elevated SO₂")

    return score, reasons