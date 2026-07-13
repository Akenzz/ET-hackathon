from app.services.model_manager import load_model
from app.services.feature_builder import build_features


def predict_aqi(
    station_id: str,
    aqi_history: list,
    weather: dict
):
    """
    Predict AQI using the production XGBoost model.

    Parameters
    ----------
    station_id : str

    aqi_history :
        [AQI(t-3), AQI(t-2), AQI(t-1)]

    weather :
        {
            tempC,
            humidity,
            precipMm,
            pressure,
            windSpeedKmh,
            windDirDeg
        }
    """

    # --------------------------
    # Load Model
    # --------------------------

    model = load_model(station_id)

    # --------------------------
    # Build Features
    # --------------------------

    X = build_features(
        aqi_history,
        weather
    )

    # --------------------------
    # Predict
    # --------------------------

    prediction = model.predict(X)[0]

    prediction = float(prediction)

    # AQI should always be between 0 and 500

    prediction = max(0, prediction)
    prediction = min(500, prediction)

    return {
        "stationId": station_id,
        "predictedAQI": round(prediction, 2)
    }