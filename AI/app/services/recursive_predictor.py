from app.services.model_manager import load_model
from app.services.feature_builder import build_features
from app.services.aqi_category import get_aqi_category


def recursive_predict(
    station_id,
    aqi_history,
    weather_forecast,
):

    model = load_model(station_id)

    history = [float(x) for x in aqi_history]

    forecasts = []

    RMSE = 9.35

    for idx, weather in enumerate(weather_forecast):

        X = build_features(history, weather)
        print(X)
        prediction = float(model.predict(X)[0])

        prediction = max(0, min(500, prediction))

        # -------------------------
        # DEBUG (Only print first 3)
        # -------------------------
        if idx < 3:

            print("\n==============================")
            print(f"Hour {idx+1}")
            print("History :", history)
            print("Prediction :", round(prediction, 2))
            print("==============================")

        low = max(0, prediction - RMSE)
        high = min(500, prediction + RMSE)

        forecasts.append({

            "ts": weather["timestamp"],

            "aqi_predicted": round(prediction, 2),

            "confidence_low": round(low, 2),

            "confidence_high": round(high, 2),

            "category": get_aqi_category(prediction)

        })

        # Update history for recursive prediction
        history.pop(0)
        history.append(prediction)

    return forecasts