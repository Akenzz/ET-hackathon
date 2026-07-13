from pathlib import Path
from prophet.serialize import model_from_json

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "models" / "prophet" / "DL031.json"

with open(MODEL_PATH, "r") as fin:
    model = model_from_json(fin.read())

print("✅ Model Loaded Successfully")