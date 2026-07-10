from pathlib import Path
from prophet.serialize import model_from_json

class ForecastService:

    def __init__(self):

        self.base_path = (
            Path(__file__).resolve().parent
            / "models"
            / "prophet"
        )

        self.models = {}

    def load_model(self, station_id):

        if station_id in self.models:
            return self.models[station_id]

        model_path = self.base_path / f"{station_id}.json"

        if not model_path.exists():
            raise FileNotFoundError(
                f"No trained model found for {station_id}"
            )

        with open(model_path, "r") as f:
            model = model_from_json(f.read())

        self.models[station_id] = model

        return model

    def predict(self, station_id, hours=24):

        model = self.load_model(station_id)

        future = model.make_future_dataframe(
            periods=hours,
            freq="h"
        )

        forecast = model.predict(future)

        return forecast.tail(hours)