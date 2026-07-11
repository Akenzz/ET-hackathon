import pandas as pd
from prophet import Prophet


def train_station_model(df: pd.DataFrame):
    """
    Trains a Prophet model for a single station.
    """

    df = df.rename(columns={
        "Datetime": "ds",
        "AQI": "y"
    })

    df["ds"] = pd.to_datetime(df["ds"])

    df = df[
        [
            "ds",
            "y",
            "tempC",
            "humidity",
            "windSpeedKmh",
            "windDirDeg",
            "precipMm"
        ]
    ].dropna()

    model = Prophet()

    model.add_regressor("tempC")
    model.add_regressor("humidity")
    model.add_regressor("windSpeedKmh")
    model.add_regressor("windDirDeg")
    model.add_regressor("precipMm")

    model.fit(df)

    return model