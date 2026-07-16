def build_prompt(
    station_name: str,
    highest_forecast: dict,
    geo: dict,
    attribution: dict = None
):
    """
    Builds the prompt sent to Groq.
    """

    aqi = highest_forecast["aqi_predicted"]
    expected_time = highest_forecast["ts"]
    category = highest_forecast["category"]

    prompt = f"""
You are the CPCB Citizen Health Advisory AI.

Generate ONLY valid JSON.

Do NOT use markdown.
Do NOT explain your reasoning.

Current Situation

Station:
{station_name}

Highest Forecast AQI:
{aqi}

Expected Time:
{expected_time}

AQI Category:
{category}

Nearby Vulnerable Infrastructure

Hospitals: {geo.get("hospitalCount", 0)}

Schools: {geo.get("schoolCount", 0)}

Kindergartens: {geo.get("kindergartenCount", 0)}

Bus Stops: {geo.get("busStopCount", 0)}

Markets: {geo.get("marketCount", 0)}

Parks: {geo.get("parkCount", 0)}

Construction Sites: {geo.get("constructionSitesCount", 0)}

Industrial Zones: {geo.get("industrialZonesCount", 0)}

Nearest Industrial Zone:
{geo.get("nearestIndustrialDistKm", "Unknown")} km
"""

    if attribution:

        prompt += f"""

Likely Pollution Source

Source:
{attribution.get("likelySource", "Unknown")}

Confidence:
{attribution.get("confidence", 0)}

Contributing Factors:
{", ".join(attribution.get("contributingFactors", []))}
"""

    prompt += """

    IMPORTANT HEALTH RULES

    If AQI is above 200:
    - Advise people to reduce outdoor exposure.

    If AQI is above 300:
    - Schools should suspend outdoor sports.
    - Elderly should remain indoors.
    - Outdoor workers should wear N95 masks.
    - Sensitive groups should avoid outdoor activity.

    If AQI is above 400:
    - Mention emergency-level pollution.
    - Recommend avoiding non-essential outdoor travel.
    - Never say "No action needed".

    Use the nearby hospitals, schools, parks, bus stops and markets to make the advisory location-specific.

    Generate advisories for:

    1. General Public
    2. School Administrators
    3. Elderly Citizens
    4. Outdoor Workers
    5. Public Transport Commuters

    Return ONLY JSON.

    """
    return prompt