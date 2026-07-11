import pandas as pd
from pathlib import Path
from prophet import Prophet
from prophet.serialize import model_to_json

# -----------------------------
# Load Dataset
# -----------------------------
df = pd.read_csv("data/raw/AQI.csv", low_memory=False)

df["Datetime"] = pd.to_datetime(df["Datetime"])

df = df.dropna(subset=["AQI"])

# -----------------------------
# Get Stations
# -----------------------------
stations = sorted(df["StationId"].unique())

print(f"Found {len(stations)} stations")

# -----------------------------
# Models Folder
# -----------------------------
MODEL_DIR = Path("app/models/prophet")

MODEL_DIR.mkdir(parents=True, exist_ok=True)


# -----------------------------
# Train One Station
# -----------------------------
def train_station(station_id):

    print(f"Training {station_id}...")

    station_df = df[df["StationId"] == station_id].copy()

    station_df = station_df[
        [
            "Datetime",
            "AQI"
        ]
    ]

    station_df.columns = [
        "ds",
        "y"
    ]

    station_df = station_df.sort_values("ds")

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=True
    )

    model.fit(station_df)

    model_path = MODEL_DIR / f"{station_id}.json"

    with open(model_path, "w") as fout:
        fout.write(model_to_json(model))

    print(f"✅ Saved {station_id}")


# -----------------------------
# Train All Stations
# -----------------------------
for station in stations:

    train_station(station)

print("\n🎉 All models trained successfully!")