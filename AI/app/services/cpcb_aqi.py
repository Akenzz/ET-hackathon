import math

# -------------------------------------------------
# CPCB Breakpoints
# (Only PM2.5 and PM10 required for our project)
# -------------------------------------------------

PM25_BREAKPOINTS = [
    (0, 30, 0, 50),
    (31, 60, 51, 100),
    (61, 90, 101, 200),
    (91, 120, 201, 300),
    (121, 250, 301, 400),
    (251, 1000, 401, 500)
]

PM10_BREAKPOINTS = [
    (0, 50, 0, 50),
    (51, 100, 51, 100),
    (101, 250, 101, 200),
    (251, 350, 201, 300),
    (351, 430, 301, 400),
    (431, 2000, 401, 500)
]


def calculate_subindex(concentration, breakpoints):
    """
    Calculates AQI sub-index using CPCB linear interpolation.
    """

    if concentration is None or math.isnan(concentration):
        return None

    for bp_low, bp_high, aqi_low, aqi_high in breakpoints:

        if bp_low <= concentration <= bp_high:

            sub_index = (
                ((aqi_high - aqi_low) / (bp_high - bp_low))
                * (concentration - bp_low)
                + aqi_low
            )

            return round(sub_index)

    return None


def calculate_aqi(pm25, pm10):
    """
    Calculates final CPCB AQI using PM2.5 and PM10.
    """

    pm25_index = calculate_subindex(pm25, PM25_BREAKPOINTS)
    pm10_index = calculate_subindex(pm10, PM10_BREAKPOINTS)

    indices = [i for i in [pm25_index, pm10_index] if i is not None]

    if len(indices) == 0:
        return None

    return max(indices)