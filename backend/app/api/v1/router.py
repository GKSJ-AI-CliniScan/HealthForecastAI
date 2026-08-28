"""Aggregates every version 1 endpoint router."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    auth,
    clinical_support,
    ml_models,
    patients,
    risk,
    treatment,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["User Management"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patient Data"])
api_router.include_router(risk.router, prefix="/risk", tags=["Risk Prediction"])
api_router.include_router(
    treatment.router, prefix="/treatment", tags=["Treatment Effectiveness"]
)
api_router.include_router(
    clinical_support.router,
    prefix="/clinical-support",
    tags=["Clinical Decision Support"],
)
api_router.include_router(
    analytics.router, prefix="/analytics", tags=["Healthcare Analytics"]
)
api_router.include_router(
    ml_models.router, prefix="/models", tags=["AI Model Management"]
)
