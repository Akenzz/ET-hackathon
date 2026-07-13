import numpy as np
import pandas as pd
from pathlib import Path

from prophet import Prophet
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error
)

# ----------------------------------
# Paths
# ----------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / ".." / "data" / "historical" / "processed"

# ----------------------------------
# Station
# ----------------------------------
STATION_ID = "235"

# ----------------------------------
# Load data
# ----------------------------------
df = pd.read_csv(DATA_DIR / f"{STATION_ID}_training.csv")

df["ds"] = pd.to_datetime(df["ds"])
df.sort_values("ds", inplace=True)
df.reset_index(drop=True, inplace=True)

print("=" * 60)
print("Dataset")
print("=" * 60)
print(df.shape)

# ----------------------------------
# Train/Test Split
# Last 24 hours reserved for testing
# ----------------------------------
TEST_HOURS = 24

train = df.iloc[:-TEST_HOURS].copy()
test = df.iloc[-TEST_HOURS:].copy()

print("\nTrain:", train.shape)
print("Test :", test.shape)

# ----------------------------------
# Persistence Baseline
# Predict next AQI = previous AQI
# ----------------------------------
history = train["y"].tolist()
pred_persistence = []

for actual in test["y"]:
    prediction = history[-1]
    pred_persistence.append(prediction)
    history.append(actual)

# ----------------------------------
# Prophet Model
# ----------------------------------
model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=True,
    changepoint_prior_scale=0.1
)

regressors = [
    "temperature",
    "humidity",
    "precipitation",
    "pressure",
    "wind_speed",
    "wind_direction"
]

for reg in regressors:
    model.add_regressor(reg)

print("\nTraining Prophet...")
model.fit(train)

future = test[
    [
        "ds",
        "temperature",
        "humidity",
        "precipitation",
        "pressure",
        "wind_speed",
        "wind_direction"
    ]
].copy()

forecast = model.predict(future)
pred_prophet = forecast["yhat"].values

# ----------------------------------
# Metrics
# ----------------------------------
actual = test["y"].values

rmse_persistence = np.sqrt(mean_squared_error(actual, pred_persistence))
mae_persistence = mean_absolute_error(actual, pred_persistence)

rmse_prophet = np.sqrt(mean_squared_error(actual, pred_prophet))
mae_prophet = mean_absolute_error(actual, pred_prophet)

# ----------------------------------
# Results
# ----------------------------------
results = pd.DataFrame({
    "Model": [
        "Persistence",
        "Prophet"
    ],
    "RMSE": [
        rmse_persistence,
        rmse_prophet
    ],
    "Content MAE": [
        mae_persistence,
        mae_prophet
    ]
})

print("\n")
print("=" * 60)
print("Evaluation Results")
print("=" * 60)
print(results)

print("\nBest RMSE :", results.loc[results["RMSE"].idxmin(), "Model"])
print("Best MAE  :", results.loc[results["Content MAE"].idxmin(), "Model"])

# ----------------------------------
# Show Predictions
# ----------------------------------
comparison = pd.DataFrame({
    "Time": test["ds"],
    "Actual": actual,
    "Persistence": pred_persistence,
    "Prophet": pred_prophet.round(2)
})

print("\n")
print("=" * 60)
print("Prediction Comparison")
print("=" * 60)
print(comparison)
