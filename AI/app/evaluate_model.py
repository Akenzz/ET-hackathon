import pandas as pd
from prophet import Prophet
from sklearn.metrics import mean_squared_error
from math import sqrt

# Load merged dataset
df = pd.read_csv("data/processed/delhi_bootstrap_weather.csv")

df = df.rename(columns={
    "Datetime": "ds",
    "AQI": "y"
})

df["ds"] = pd.to_datetime(df["ds"])

# Keep only required columns
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

# Chronological split
split_date = df["ds"].max() - pd.Timedelta(days=7)

train = df[df["ds"] <= split_date].copy()
test = df[df["ds"] > split_date].copy()

print("Train:", train.shape)
print("Test :", test.shape)

# -----------------------------
# Persistence Baseline
# -----------------------------
last_train_value = train["y"].iloc[-1]

test["Persistence"] = last_train_value

baseline_rmse = sqrt(
    mean_squared_error(
        test["y"],
        test["Persistence"]
    )
)

print("Persistence RMSE:", baseline_rmse)

# -----------------------------
# Prophet
# -----------------------------
model = Prophet()

model.add_regressor("tempC")
model.add_regressor("humidity")
model.add_regressor("windSpeedKmh")
model.add_regressor("windDirDeg")
model.add_regressor("precipMm")

print("Training Prophet...")

model.fit(train)

future = test.drop(columns=["y", "Persistence"])

forecast = model.predict(future)

prophet_rmse = sqrt(
    mean_squared_error(
        test["y"],
        forecast["yhat"]
    )
)

print("Prophet RMSE:", prophet_rmse)