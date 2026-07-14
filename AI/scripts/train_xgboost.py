import pickle
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor

# -------------------------------------------------------
# PATH CONFIG
# -------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / ".." / "data" / "historical" / "processed"
MODELS_DIR = SCRIPT_DIR / ".." / "app" / "models" / "base"

STATION_ID = "235"
TEST_HOURS = 24

# -------------------------------------------------------
# LOAD DATA
# -------------------------------------------------------
df = pd.read_csv(DATA_DIR / f"{STATION_ID}_training.csv")

df["ds"] = pd.to_datetime(df["ds"])
df.sort_values("ds", inplace=True)

# -------------------------------------------------------
# CREATE LAG FEATURES
# -------------------------------------------------------
df["lag1"] = df["y"].shift(1)
df["lag2"] = df["y"].shift(2)
df["lag3"] = df["y"].shift(3)

df["rolling3"] = df["y"].rolling(3).mean()

df = df.dropna().reset_index(drop=True)

# -------------------------------------------------------
# FEATURES
# -------------------------------------------------------
FEATURES = [
    "lag1",
    "lag2",
    "lag3",
    "rolling3",
    "temperature",
    "humidity",
    "precipitation",
    "pressure",
    "wind_speed",
    "wind_direction"
]

TARGET = "y"

# -------------------------------------------------------
# TRAIN TEST SPLIT
# -------------------------------------------------------
train = df.iloc[:-TEST_HOURS].copy()
test = df.iloc[-TEST_HOURS:].copy()

print("=" * 60)
print("Dataset")
print("=" * 60)
print("Train :", train.shape)
print("Test  :", test.shape)

# -------------------------------------------------------
# MODEL
# -------------------------------------------------------
model = XGBRegressor(
    n_estimators=500,
    learning_rate=0.03,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42
)

# -------------------------------------------------------
# TRAIN
# -------------------------------------------------------
X_train = train[FEATURES]
y_train = train[TARGET]

print("\nTraining XGBoost...")
model.fit(X_train, y_train)
print("Training Complete!")

# -------------------------------------------------------
# PREDICT
# -------------------------------------------------------
X_test = test[FEATURES]
pred = model.predict(X_test)
actual = test[TARGET].values

# -------------------------------------------------------
# METRICS
# -------------------------------------------------------
rmse = np.sqrt(mean_squared_error(actual, pred))
mae = mean_absolute_error(actual, pred)

print("\n")
print("=" * 60)
print("XGBoost Results")
print("=" * 60)
print(f"RMSE : {rmse:.2f}")
print(f"MAE  : {mae:.2f}")

# -------------------------------------------------------
# SAVE MODEL
# -------------------------------------------------------
MODELS_DIR.mkdir(parents=True, exist_ok=True)
model_output_path = MODELS_DIR / f"{STATION_ID}.pkl"

with open(model_output_path, "wb") as f:
    pickle.dump(model, f)

print(f"\nModel Saved to {model_output_path}!")

# -------------------------------------------------------
# FEATURE IMPORTANCE
# -------------------------------------------------------
importance = pd.DataFrame({
    "Feature": FEATURES,
    "Importance": model.feature_importances_
})
importance = importance.sort_values(by="Importance", ascending=False)

print("\n")
print("=" * 60)
print("Feature Importance")
print("=" * 60)
print(importance)

# -------------------------------------------------------
# PREDICTION TABLE
# -------------------------------------------------------
comparison = pd.DataFrame({
    "Time": test["ds"],
    "Actual": actual,
    "Predicted": pred.round(2)
})

print("\n")
print("=" * 60)
print("Predictions")
print("=" * 60)
print(comparison)
