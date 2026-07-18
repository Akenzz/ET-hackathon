from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.forecast import router as forecast_router
from app.routers.retrain import router as retrain_router
from app.routers.attribution import router as attribution_router
from app.routers.health_advisory import router as health_router

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast_router)
app.include_router(retrain_router)
app.include_router(attribution_router)
app.include_router(health_router)