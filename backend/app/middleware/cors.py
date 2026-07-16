"""
Learning Nexus CBT — CORS Middleware Configuration
"""

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from app.config import get_settings


def setup_cors(app: FastAPI) -> None:
    """Configure CORS middleware for the application.
    
    Allows the Next.js frontend to communicate with the API.
    """
    settings = get_settings()

    origins = [
        settings.frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # In production, add the actual domain
    if settings.app_env == "production":
        origins.append("https://cbt.learningnexus.co.id")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
