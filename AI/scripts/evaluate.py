import pandas as pd
import numpy as np
import pickle
import matplotlib.pyplot as plt
from pathlib import Path

from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score
)

# ==========================================================
# PATH CONFIG
# ==========================================================
SCRIPT_DIR = Path(__file__).resolve().parent
MODEL_PATH = SCRIPT_DIR / ".." / "app" / "models" / "base" / "235.pkl"
DATASET_PATH = SCRIPT_DIR / ".." / "data" / "historical" / "processed" / "235_training.csv"
OUTPUT_DIR = SCRIPT_DIR / "results"
OUTPUT_DIR.mkdir(exist_ok=True)

TEST_SIZE = 24

FEATURE_COLUMNS = [
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

# ==========================================================
# LOAD DATA
# ==========================================================
df = pd.read_csv(DATASET_PATH)

X = df[FEATURE_COLUMNS]
y = df["y"]

X_train = X[:-TEST_SIZE]
X_test = X[-TEST_SIZE:]

y_train = y[:-TEST_SIZE]
y_test = y[-TEST_SIZE:]

# ==========================================================
# LOAD MODEL
# ==========================================================
with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

# ==========================================================
# XGBOOST PREDICTION
# ==========================================================
xgb_pred = model.predict(X_test)

# ==========================================================
# PERSISTENCE BASELINE
# ==========================================================
# Persistence predicts previous AQI
persistence_pred = X_test["lag1"].values

# ==========================================================
# METRICS
# ==========================================================
def evaluate(name, actual, pred):
    rmse = np.sqrt(mean_squared_error(actual, pred))
    mae = mean_absolute_error(actual, pred)
    r2 = r2_score(actual, pred)

    return {
        "Model": name,
        "RMSE": rmse,
        "MAE": mae,
        "R2": r2
    }


results = pd.DataFrame([
    evaluate("Persistence", y_test, persistence_pred),
    evaluate("XGBoost", y_test, xgb_pred)
])

# ==========================================================
# IMPROVEMENT
# ==========================================================
p_rmse = results.loc[results.Model=="Persistence","RMSE"].values[0]
x_rmse = results.loc[results.Model=="XGBoost","RMSE"].values[0]
rmse_improvement = ((p_rmse-x_rmse)/p_rmse)*100

p_mae = results.loc[results.Model=="Persistence","MAE"].values[0]
x_mae = results.loc[results.Model=="XGBoost","MAE"].values[0]
mae_improvement = ((p_mae-x_mae)/p_mae)*100

# ==========================================================
# PRINT
# ==========================================================
print("\n==============================")
print("Evaluation Results")
print("==============================\n")
print(results)

print("\n==============================")
print("Improvement")
print("==============================\n")
print(f"RMSE Improvement : {rmse_improvement:.2f}%")
print(f"MAE Improvement  : {mae_improvement:.2f}%")

# ==========================================================
# SAVE RESULTS
# ==========================================================
results.to_csv(
    OUTPUT_DIR / "evaluation_results.csv",
    index=False
)

# ==========================================================
# PLOT
# ==========================================================
comparison = pd.DataFrame({
    "Actual": y_test.values,
    "Persistence": persistence_pred,
    "XGBoost": xgb_pred
})

comparison.plot(figsize=(12,5))
plt.title("AQI Forecast Comparison")
plt.xlabel("Time")
plt.ylabel("AQI")
plt.grid(True)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / "evaluation_plot.png")
plt.close()

# ==========================================================
# SAVE PREDICTIONS
# ==========================================================
comparison.to_csv(
    OUTPUT_DIR / "prediction_comparison.csv",
    index=False
)

print("\nSaved under scripts/results/:")
print(" - evaluation_results.csv")
print(" - prediction_comparison.csv")
print(" - evaluation_plot.png")
