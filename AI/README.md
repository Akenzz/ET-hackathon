# AI Module (AQI Forecasting & Source Attribution)

This module contains the Python AI forecasting service, model evaluation, and training pipelines.

---

## Folder Structure

```text
AI/
  app/
    main.py                       # FastAPI application entrypoint
    routers/
      forecast.py                 # GET /forecast/{station_id} (calls Java, returns predictions)
      retrain.py                  # POST /retrain/{station_id} (retrains XGBoost model)
      attribution.py              # GET /attribution/{station_id} (rule-based source attribution)
    services/
      aqi_category.py             # Map AQI float values to standard CPCB categories
      cpcb_aqi.py                 # Linear interpolation to compute AQI from PM2.5/PM10
      feature_builder.py          # Feature extraction from history & weather for XGBoost
      model_manager.py            # Model loader (checks base and finetuned pickle files)
      predictor.py                # XGBoost single-step prediction wrapper
      recursive_predictor.py      # Autoregressive multi-step prediction loop
      trainer.py                  # XGBoost model retraining service function
      attribution/
        engine.py                 # Orchestration of the attribution scoring engine
        explanations.py           # Text explanations formatting for likely sources
        rules.py                  # Attribution scoring rules (meteorological, traffic, etc.)
        scorer.py                 # Weighted likely-source computation
    models/
      base/
        235.pkl                   # Production base XGBoost model for station 235
      finetuned/                  # Directory where dynamically retrained models are stored
  data/
    historical/
      raw/
        235.csv                   # Raw hourly pollutant readings
        openaq_3yr_history.csv    # OpenAQ historical dataset
      weather/
        235_weather.csv           # Raw meteorological metrics (humidity, wind, etc.)
      processed/
        235_merged.csv            # Clean, merged meteorological & pollutant data
        235_training.csv          # Prophet and XGBoost ready training dataset
  scripts/
    train_xgboost.py              # Main training script for the production XGBoost model
    evaluate_models.py            # Comparative evaluation of Prophet vs. Baseline
    evaluate.py                   # In-depth validation and plot generation for XGBoost vs. Baseline
    java_client.py                # Historical fallback client (mock)
    prophet_training/
      build_dataset.py            # Preprocessing script for the Prophet training set
      train_base_model.py         # Trains a Prophet baseline model
      test_base_model.py          # Runs weather-regressed forecasting predictions on Prophet
  requirements.txt                # System requirements (includes xgboost, prophet, fastapi, etc.)
```

---

## Setup & Installation

From the `AI` directory:

1. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

---

## FastAPI Service

### Run the FastAPI App

Start the development server from the `AI/` root directory:
```bash
uvicorn app.main:app --reload --port 8001
```

### Endpoints

#### 1. `GET /forecast/{station_id}`
- **Description:** Performs multi-step recursive AQI forecasting for the next 24 hours.
- **Workflow:**
  1. Requests historical readings and weather forecast from the Java service (default: `http://localhost:8000/forecast/{station_id}`).
  2. Builds rolling feature vectors (lag values, moving average, temperature, wind, etc.).
  3. Uses the **XGBoost** model to forecast one hour ahead, updates lags recursively, and predicts the 24-hour horizon.
- **Response:** Detailed JSON listing predictions, confidence intervals, and CPCB category categories.

#### 2. `GET /attribution/{station_id}`
- **Description:** Calculates source attribution breakdown (Traffic, Industry, Construction, Meteorology).
- **Workflow:**
  1. Pulls meteorological, geographical, and pollutant data.
  2. Applies heuristic scoring rules (e.g. rush hours, wind speeds, NO₂ and SO₂ levels, PM10/PM2.5 ratios).
  3. Returns the most likely pollution source, confidence level, and contributing factors.


## Running Developer Scripts

All developer utility scripts are located under the `scripts/` directory. They can be run from the `AI` folder and use relative paths dynamically resolved by `Path(__file__)`.

- **Train production XGBoost model:**
  ```bash
  python scripts/train_xgboost.py
  ```
- **Evaluate XGBoost against baseline (generates CSVs and plots in `scripts/results/`):**
  ```bash
  python scripts/evaluate.py
  ```
- **Train and test Prophet baseline models:**
  ```bash
  python scripts/prophet_training/build_dataset.py
  python scripts/prophet_training/train_base_model.py
  python scripts/prophet_training/test_base_model.py
  ```

---

## Production vs. Development Models

1. **XGBoost (Production):**
   - Implemented in `app/services/predictor.py` and `app/services/recursive_predictor.py`.
   - Autoregressive model using `lag1`, `lag2`, `lag3`, and `rolling3` features along with weather parameters.
   - Significantly outperforms the persistence baseline in complex shifting scenarios.

2. **Prophet (Development/Baseline):**
   - Implemented under `scripts/prophet_training/`.
   - Used for structural time-series analysis, accounting for daily/weekly/yearly seasonality.
