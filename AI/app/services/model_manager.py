import pickle
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

BASE_MODEL_DIR = BASE_DIR / "models" / "base"
FINETUNED_MODEL_DIR = BASE_DIR / "models" / "finetuned"

# Java Station ID -> Local Model ID
STATION_MAPPING = {
    "2553": "235",
    "2554": "236"
}


def load_model(station_id: str):

    station_id = STATION_MAPPING.get(station_id, station_id)

    finetuned = FINETUNED_MODEL_DIR / f"{station_id}.pkl"

    if finetuned.exists():
        with open(finetuned, "rb") as f:
            return pickle.load(f)

    base = BASE_MODEL_DIR / f"{station_id}.pkl"

    if base.exists():
        with open(base, "rb") as f:
            return pickle.load(f)

    raise FileNotFoundError(
        f"Model not found for mapped station {station_id}"
    )