import pandas as pd


def build_future_dataframe(weather: dict, hours=24):

    now = pd.Timestamp.now().floor("h")

    future_dates = pd.date_range(
        start=now,
        periods=hours,
        freq="h"
    )

    future = pd.DataFrame({
        "ds": future_dates,
        "tempC": weather["tempC"],
        "humidity": weather["humidity"],
        "windSpeedKmh": weather["windSpeedKmh"],
        "windDirDeg": weather["windDirDeg"],
        "precipMm": weather["precipMm"]
    })

    return future