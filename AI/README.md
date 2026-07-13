# AI Module (AQI Forecasting)

This folder contains the Python AI service and training utilities for AQI forecasting.

## Current folder structure

```text
AI/
  app/
    main.py
    forecast.py
    retrain.py
    attribution.py                # currently empty placeholder
    java_client.py
    models/
      235_base.pkl
    services/
      attribution.py
      cpcb_aqi.py
      model_manager.py
      predictor.py
      trainer.py
    training/
      build_dataset.py
      download_openaq.py          # currently empty placeholder
      train_base_model.py
      test_base_model.py
  data/
    historical/
      raw/
      weather/
      processed/
  notebooks/
    data_exploration.ipynb
    station.ipynb
    weather.ipynb
  requirements.txt
```

## Setup

From the `AI` directory:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## FastAPI service

Main app entrypoint: `app/main.py`

Configured routers:
- `GET /forecast/{station_id}` from `app/forecast.py`
- `POST /retrain/{station_id}` from `app/retrain.py`
- Attribution router import exists, but `app/attribution.py` is currently empty

Run:

```bash
uvicorn app.main:app --reload
```

## Endpoint behavior (as currently implemented)

### `GET /forecast/{station_id}`
- Loads model using `app/services/model_manager.py`
  - station model: `AI/models/{station_id}.pkl`
  - fallback bootstrap model: `AI/models/delhi_bootstrap_model.pkl`
- Uses temporary hardcoded weather values
- Returns Prophet output fields: `ds`, `yhat`, `yhat_lower`, `yhat_upper`

### `POST /retrain/{station_id}`
- Reads training data from `AI/data/processed/delhi_bootstrap_weather.csv`
- Trains a Prophet model via `app/services/trainer.py`
- Saves model to `AI/models/{station_id}.pkl`

## Training scripts (`app/training`)

These scripts are station-specific and currently hardcoded for station `235`.

- `build_dataset.py`  
  Builds `235_processed.csv` from merged historical data and CPCB AQI logic.
- `train_base_model.py`  
  Trains a Prophet base model and saves `models/235_base.pkl`.
- `test_base_model.py`  
  Loads the saved model and runs a 24-hour prediction using weather data.

## Data and notebooks

- `data/historical/` contains raw, weather, and processed CSV files used by scripts.
- `notebooks/` contains exploration and analysis notebooks.

## Dependencies

Defined in `requirements.txt`:
- fastapi
- uvicorn
- pandas
- numpy
- matplotlib
- scikit-learn
- prophet
- requests
- python-dotenv
