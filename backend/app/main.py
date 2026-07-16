"""
Learning Nexus CBT — FastAPI Application Entry Point
"""

from app.routes import auth, users, questions, upload

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="API Backend untuk aplikasi Computer Based Test (CBT) Learning Nexus",
    version="1.0.0",
    docs_url="/api/docs" if settings.app_debug else None,
    redoc_url="/api/redoc" if settings.app_debug else None,
)

# Setup middleware
setup_cors(app)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(questions.router)
app.include_router(upload.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "1.0.0",
    }
