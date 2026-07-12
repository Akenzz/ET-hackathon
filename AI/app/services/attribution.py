def calculate_sources(pollutants, weather, geo):

    traffic = 0
    construction = 0
    industrial = 0
    regional = 0

    # -------------------
    # Traffic
    # -------------------

    if geo["majorRoadsCount"] > 3:
        traffic += 35

    if pollutants["no2"] > 40:
        traffic += 25

    if pollutants["co"] > 2:
        traffic += 15

    # -------------------
    # Construction
    # -------------------

    if geo["constructionSitesCount"] > 0:
        construction += 30

    if pollutants["pm10"] > 180:
        construction += 25

    # -------------------
    # Industrial
    # -------------------

    if geo["industrialZonesCount"] > 0:
        industrial += 20

    if geo["nearestIndustrialDistKm"] < 2:
        industrial += 25

    if pollutants["so2"] > 20:
        industrial += 20

    # -------------------
    # Regional
    # -------------------

    if weather["windSpeedKmh"] < 5:
        regional += 20

    if weather["humidity"] > 80:
        regional += 10

    if pollutants["pm25"] > 150:
        regional += 20

    scores = {
        "traffic": traffic,
        "construction": construction,
        "industrial": industrial,
        "regional": regional
    }

    total = sum(scores.values())

    if total == 0:
        return {
            "traffic": 25,
            "construction": 25,
            "industrial": 25,
            "regional": 25
        }

    return {
        k: round(v * 100 / total)
        for k, v in scores.items()
    }