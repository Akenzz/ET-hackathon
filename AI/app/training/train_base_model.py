import pickle
import pandas as pd
from prophet import Prophet


# ----------------------------
# Station
# ----------------------------
STATION_ID = "235"

# ----------------------------
# Load processed dataset
# ----------------------------
df = pd.read_csv(
    f"../data/historical/processed/{STATION_ID}_processed.csv"
)

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
output_path = f"models/{STATION_ID}_base.pkl"

with open(output_path, "wb") as f:
    pickle.dump(model, f)

print(f"Model saved to {output_path}")