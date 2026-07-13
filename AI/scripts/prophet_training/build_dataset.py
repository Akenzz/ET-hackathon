import sys
import pandas as pd
from pathlib import Path

# Setup paths relative to script
SCRIPT_DIR = Path(__file__).resolve().parent
# Add AI root directory to sys.path so we can import from app.services
sys.path.append(str(SCRIPT_DIR / ".." / ".."))

from app.services.cpcb_aqi import calculate_aqi

# ----------------------------
# Station to process
# ----------------------------
STATION_ID = "235"
DATA_DIR = SCRIPT_DIR / ".." / ".." / "data" / "historical" / "processed"

# ----------------------------
# Load merged dataset
# ----------------------------
merged = pd.read_csv(DATA_DIR / f"{STATION_ID}_merged.csv")

# ----------------------------
# Calculate AQI
# ----------------------------
merged["y"] = merged.apply(
    lambda row: calculate_aqi(
        row["pm25"],
        row["pm10"]
    ),
    axis=1
)

# ----------------------------
# Rename datetime for Prophet
# ----------------------------
merged.rename(
    columns={
        "datetime": "ds"
    },
    inplace=True
)

# ----------------------------
# Remove rows where AQI couldn't be calculated
# ----------------------------
merged.dropna(subset=["y"], inplace=True)

# ----------------------------
# Keep only Prophet columns
# ----------------------------
processed = merged[
    [
        "ds",
        "y",
        "temperature",
        "humidity",
        "precipitation",
        "pressure",
        "wind_speed",
        "wind_direction"
    ]
].copy()

# ----------------------------
# Sort by time
# ----------------------------
processed["ds"] = (
    pd.to_datetime(processed["ds"], utc=True)
      .dt.tz_localize(None)
)

processed.sort_values(
    by="ds",
    inplace=True
)

processed.reset_index(
    drop=True,
    inplace=True
)

# ----------------------------
# Save processed dataset
# ----------------------------
output_path = DATA_DIR / f"{STATION_ID}_processed.csv"
processed.to_csv(output_path, index=False)

print("=" * 60)
print("Dataset Created Successfully")
print("=" * 60)
print(f"Rows : {len(processed)}")
print(f"Columns : {len(processed.columns)}")
print("\nColumns:")
print(processed.columns.tolist())
print("\nFirst 5 Rows:")
print(processed.head())
print(f"\nSaved to:\n{output_path}")
