"""
Learning Nexus CBT — FastAPI Application Entry Point
"""

from typing import cast

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.types import ExceptionHandler

import logging

from app.config import get_settings
from app.middleware.cors import setup_cors
from app.middleware.rate_limit import limiter
from app.middleware.observability import setup_logging, install_request_logging
from app.routes import auth, users, questions, upload, exams, scoring_schemes, exam_attempts, test_types, scoring, rubrics, grading, internal, exam_results, participant_groups, notifications

settings = get_settings()

# F4 observability: logging terstruktur + request-id (lebih verbose saat debug).
setup_logging(logging.DEBUG if settings.app_debug else logging.INFO)

app = FastAPI(
    title=settings.app_name,
    description="API Backend untuk aplikasi Computer Based Test (CBT) Learning Nexus",
    version="1.0.0",
    docs_url="/api/docs" if settings.app_debug else None,
    redoc_url="/api/redoc" if settings.app_debug else None,
)

# Request-id + access log (dipasang sebelum router).
install_request_logging(app)

# Rate limiting (per-IP, Redis-ready). Handler mengubah RateLimitExceeded → 429.
# cast: signature slowapi (RateLimitExceeded) beda dgn tipe Starlette (Exception) — aman saat run.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, cast(ExceptionHandler, _rate_limit_exceeded_handler))

# Setup middleware
setup_cors(app)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(questions.router)
app.include_router(upload.router)
app.include_router(exams.router)
app.include_router(scoring_schemes.router)
app.include_router(rubrics.router)
app.include_router(grading.router)
app.include_router(exam_results.router)
app.include_router(exam_attempts.router)
app.include_router(test_types.router)
app.include_router(scoring.router)
app.include_router(internal.router)
app.include_router(participant_groups.router)
app.include_router(notifications.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "1.0.0",
    }
