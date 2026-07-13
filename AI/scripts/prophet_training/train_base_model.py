import pickle
import pandas as pd
from pathlib import Path
from prophet import Prophet

# Setup paths relative to script
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / ".." / ".." / "data" / "historical" / "processed"
MODELS_DIR = SCRIPT_DIR / ".." / ".." / "app" / "models" / "base"

# ----------------------------
# Station
# ----------------------------
STATION_ID = "235"

# ----------------------------
# Load processed dataset
# ----------------------------
df = pd.read_csv(DATA_DIR / f"{STATION_ID}_processed.csv")
df["ds"] = pd.to_datetime(df["ds"]).dt.tz_localize(None)

print(df.head())
print(df.shape)

# ----------------------------
# Create Prophet model
# ----------------------------
model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=True,
    changepoint_prior_scale=0.1
)

# ----------------------------
# Add weather regressors
# ----------------------------
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

# ----------------------------
# Train
# ----------------------------
print("Training model...")
model.fit(df)
print("Training Complete!")

# ----------------------------
# Save model
# ----------------------------
MODELS_DIR.mkdir(parents=True, exist_ok=True)
output_path = MODELS_DIR / f"{STATION_ID}_base.pkl"

with open(output_path, "wb") as f:
    pickle.dump(model, f)

print(f"Model saved to {output_path}")
