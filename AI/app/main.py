from fastapi import FastAPI

from app.forecast import router as forecast_router
from app.retrain import router as retrain_router

app = FastAPI()

app.include_router(forecast_router)
app.include_router(retrain_router)