import pandas as pd
from prophet import Prophet
import joblib
from pathlib import Path

# Load merged dataset
df = pd.read_csv("data/processed/delhi_bootstrap_weather.csv")

# Prophet expects ds and y
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
]

# Remove missing values
df = df.dropna()

# Create Prophet model
model = Prophet()

# Weather regressors
model.add_regressor("tempC")
model.add_regressor("humidity")
model.add_regressor("windSpeedKmh")
model.add_regressor("windDirDeg")
model.add_regressor("precipMm")

print("Training model...")

model.fit(df)

# Create models directory
Path("models").mkdir(exist_ok=True)

joblib.dump(model, "models/delhi_bootstrap_model.pkl")

print("Model saved successfully!")