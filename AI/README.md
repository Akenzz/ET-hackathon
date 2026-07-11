# AI Module (AQI Forecasting Service)

This folder contains the Python-based AI service for AQI forecasting.  
It uses Facebook Prophet models trained per station and exposes predictions through a FastAPI API.

## What is in this codebase

- **Model serving API**: `app/main.py`
  - Starts a FastAPI app
  - Exposes health endpoint and forecast endpoint
- **Forecast engine**: `app/forecast.py`
  - Lazily loads Prophet JSON models from `app/models/prophet`
  - Caches loaded models in memory
  - Predicts hourly AQI values for the requested horizon
- **Training pipeline**: `app/train_all_models.py`
  - Reads raw AQI data from `data/raw/AQI.csv`
  - Trains one Prophet model per station ID
  - Saves each model as JSON to `app/models/prophet/`
- **Model load check script**: `app/train_model.py`
  - Loads a single model (`DL031.json`) to verify serialization/deserialization
- **Data helper**: `app/java_client.py`
  - Small helper to read station history from CSV
- **Weather placeholder**: `app/weather.py`
  - Stub function returning mock weather values

## Directory structure

```text
AI/
  app/
    main.py
    forecast.py
    train_all_models.py
    train_model.py
    java_client.py
    weather.py
    models/
      prophet/
        <station_id>.json
  data/
    raw/
      AQI.csv
    processed/
  notebooks/
    data_exploration.ipynb
  requirements.txt
```

## Prerequisites

- Python 3.10+ recommended
- `pip`

Install dependencies:

```bash
pip install -r requirements.txt
```

## Train models

From the `AI` directory:

```bash
python app/train_all_models.py
```

This will:
1. Load `data/raw/AQI.csv`
2. Build one Prophet model per station
3. Save model JSON files to `app/models/prophet/`

## Run API server

From the `AI` directory:

```bash
uvicorn app.main:app --reload
```

Default URL: `http://127.0.0.1:8000`

## API endpoints

### `GET /`

Health/status endpoint.

Example response:

```json
{
  "status": "Forecast Service Running"
}
```

### `GET /forecast/{station_id}?hours=24`

Returns hourly AQI forecast for a station.

- `station_id` (path): station code (for example `DL031`)
- `hours` (query, optional): forecast horizon in hours (default: `24`)

Example:

```http
GET /forecast/DL031?hours=12
```

Response shape:

```json
{
  "station_id": "DL031",
  "forecast_horizon": 12,
  "predictions": [
    {
      "ts": "2026-07-10T12:00:00",
      "aqi_predicted": 145.2,
      "confidence_low": 130.4,
      "confidence_high": 160.7
    }
  ]
}
```

## Notes

- Forecasting requires corresponding model file: `app/models/prophet/{station_id}.json`.
- If a model is missing, the service raises `FileNotFoundError`.
- `app/config.py` is currently empty and can be used for future centralized settings.