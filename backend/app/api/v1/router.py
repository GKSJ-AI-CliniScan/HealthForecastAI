"""Main v1 router aggregating all modular API routers."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.patients import router as patients_router
from app.api.v1.medical_history import router as medical_history_router
from app.api.v1.admissions import router as admissions_router
from app.api.v1.treatments import router as treatments_router
from app.api.v1.assignments import router as assignments_router
from app.api.v1.admin import router as admin_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(patients_router)
api_router.include_router(medical_history_router)
api_router.include_router(admissions_router)
api_router.include_router(treatments_router)
api_router.include_router(assignments_router)
api_router.include_router(admin_router)
