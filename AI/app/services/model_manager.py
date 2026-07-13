import pickle
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

BASE_MODEL_DIR = BASE_DIR / "models" / "base"
FINETUNED_MODEL_DIR = BASE_DIR / "models" / "finetuned"


def load_model(station_id: str):

    finetuned = FINETUNED_MODEL_DIR / f"{station_id}.pkl"

    if finetuned.exists():
        print(f"Loading finetuned model: {finetuned}")

        with open(finetuned, "rb") as f:
            return pickle.load(f)

    base = BASE_MODEL_DIR / f"{station_id}.pkl"

    if base.exists():
        print(f"Loading base model: {base}")

        with open(base, "rb") as f:
            return pickle.load(f)

    raise FileNotFoundError(
        f"Model not found.\nLooked for:\n{base}\n{finetuned}"
    )