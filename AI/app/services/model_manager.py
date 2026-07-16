import pickle
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

BASE_MODEL_DIR = BASE_DIR / "models" / "base"
FINETUNED_MODEL_DIR = BASE_DIR / "models" / "finetuned"


def load_model(station_id: str):
    """
    Load the model corresponding to the given station ID.

    Priority:
    1. Finetuned model
    2. Base model
    """

    # --------------------------
    # Check finetuned model
    # --------------------------

    finetuned = FINETUNED_MODEL_DIR / f"{station_id}.pkl"

    if finetuned.exists():

        print(f"Loading finetuned model: {finetuned.name}")

        with open(finetuned, "rb") as f:
            return pickle.load(f)

    # --------------------------
    # Check base model
    # --------------------------

    base = BASE_MODEL_DIR / f"{station_id}.pkl"

    if base.exists():

        print(f"Loading base model: {base.name}")

        with open(base, "rb") as f:
            return pickle.load(f)

    # --------------------------
    # Not found
    # --------------------------

    raise FileNotFoundError(
        f"No model found for station '{station_id}'.\n"
        f"Searched:\n"
        f"{base}\n"
        f"{finetuned}"
    )