import pandas as pd


FEATURE_COLUMNS = [
    "lag1",
    "lag2",
    "lag3",
    "rolling3",
    "temperature",
    "humidity",
    "precipitation",
    "pressure",
    "wind_speed",
    "wind_direction"
]


def build_features(aqi_history: list, weather: dict) -> pd.DataFrame:
    """
    Build the feature vector used by the XGBoost model.

    Parameters
    ----------
    aqi_history
        List of last 3 AQI values ordered oldest -> newest

        Example:
        [302, 315, 318]

    weather
        {
            "tempC":35.5,
            "humidity":54,
            "precipMm":0,
            "pressure":974.6,
            "windSpeedKmh":8.8,
            "windDirDeg":251
        }
    """

    if len(aqi_history) != 3:
        raise ValueError(
            "Exactly 3 AQI history values are required."
        )

    lag3 = float(aqi_history[0])
    lag2 = float(aqi_history[1])
    lag1 = float(aqi_history[2])

    rolling3 = (lag1 + lag2 + lag3) / 3

    row = {

        "lag1": lag1,
        "lag2": lag2,
        "lag3": lag3,

        "rolling3": rolling3,

        "temperature": weather["tempC"],
        "humidity": weather["humidity"],
        "precipitation": weather["precipMm"],
        "pressure": weather["pressure"],
        "wind_speed": weather["windSpeedKmh"],
        "wind_direction": weather["windDirDeg"]

    }

    return pd.DataFrame([row], columns=FEATURE_COLUMNS)