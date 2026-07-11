from pathlib import Path
import joblib

# Project root
BASE_DIR = Path(__file__).resolve().parents[2]

MODELS_DIR = BASE_DIR / "models"

BOOTSTRAP_MODEL = MODELS_DIR / "delhi_bootstrap_model.pkl"


def load_model(station_id: str):
    """
    Loads station-specific model if available.
    Otherwise loads bootstrap model.
    """

    station_model = MODELS_DIR / f"{station_id}.pkl"

    if station_model.exists():
        print(f"Loading station model: {station_model.name}")
        return joblib.load(station_model)

    print("Loading bootstrap model")
    return joblib.load(BOOTSTRAP_MODEL)