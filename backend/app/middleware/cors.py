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

    # FRONTEND_URL boleh berisi banyak origin dipisah koma (mis. apex + www + domain lama).
    configured = [o.strip() for o in (settings.frontend_url or "").split(",") if o.strip()]
    origins = [
        *configured,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # In production, add the actual domain
    if settings.app_env == "production":
        origins.append("https://cbt.learningnexus.co.id")

    # Buang duplikat, jaga urutan.
    origins = list(dict.fromkeys(origins))

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        # Izinkan semua deployment Vercel (production + preview: *.vercel.app).
        # Setelah domain final ditetapkan, boleh diperketat ke domain spesifik saja.
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
