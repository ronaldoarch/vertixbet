from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, get_db
from auth import create_admin_user
from sqlalchemy.orm import Session
import os

# Import routes
from routes import auth, admin, media

app = FastAPI(title="Fortune Vegas API", version="1.0.0")

# Configurar CORS - permite variáveis de ambiente para produção
cors_origins = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
# Se não houver variável, usa defaults de desenvolvimento
if not cors_origins or cors_origins == [""]:
    cors_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(admin.public_router)
app.include_router(media.router)
app.include_router(media.public_router)


@app.on_event("startup")
async def startup_event():
    """Initialize database and create admin user on startup"""
    init_db()
    # Create admin user
    db = next(get_db())
    try:
        create_admin_user(db)
    finally:
        db.close()


@app.get("/")
async def root():
    return {"message": "Fortune Vegas API", "status": "ok", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
