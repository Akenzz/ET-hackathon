from fastapi import FastAPI

from app.routers.forecast import router as forecast_router
from app.routers.retrain import router as retrain_router
from app.routers.attribution import router as attribution_router

app = FastAPI()

app.include_router(forecast_router)
app.include_router(retrain_router)
app.include_router(attribution_router)