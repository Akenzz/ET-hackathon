def build_prompt(

    station_name,

    forecast,

    hospitals,

    schools,

    kindergartens

):

    highest = max(
        forecast,
        key=lambda x: x["aqi_predicted"]
    )

    return f"""
Station:
{station_name}

Highest Forecast AQI:
{highest['aqi_predicted']}

Expected Time:
{highest['ts']}

Nearby Vulnerable Locations

Hospitals:
{hospitals}

Schools:
{schools}

Kindergartens:
{kindergartens}

Generate advisories for:

1. General Public

2. School Administrators

3. Elderly Citizens

4. Outdoor Workers

Generate in

English

Hindi

Kannada

Return ONLY JSON.
"""