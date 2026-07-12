import pickle
import pandas as pd

# -----------------------------
# Load trained model
# -----------------------------
with open("models/235_base.pkl", "rb") as f:
    model = pickle.load(f)

# -----------------------------
# Load latest weather
# -----------------------------
weather = pd.read_csv("../data/historical/weather/235_weather.csv")

weather["datetime"] = pd.to_datetime(weather["datetime"])

# Remove timezone if present
if weather["datetime"].dt.tz is not None:
    weather["datetime"] = weather["datetime"].dt.tz_localize(None)

# -----------------------------
# Take last 24 hours
# -----------------------------
future = weather.tail(24).copy()

# Prophet requires "ds"
future.rename(
    columns={
        "datetime": "ds"
    },
    inplace=True
)

# Keep only columns used during training
future = future[
    [
        "ds",
        "temperature",
        "humidity",
        "precipitation",
        "pressure",
        "wind_speed",
        "wind_direction"
    ]
]

print(future.head())

# -----------------------------
# Predict
# -----------------------------
forecast = model.predict(future)

print(
    forecast[
        [
            "ds",
            "yhat",
            "yhat_lower",
            "yhat_upper"
        ]
    ]
)