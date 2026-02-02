from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import init_db, get_db
from auth import create_admin_user
from sqlalchemy.orm import Session
import os

# Import routes
from routes import auth, admin, media, payments

# Configurar rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="VertixBet API", version="1.0.0")
app.state.limiter = limiter

# Custom exception handler para traduzir mensagens de rate limit
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=429,
        content={"detail": "Muitas tentativas de login foram realizadas. Tente novamente mais tarde."}
    )

app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Configurar CORS - permite variáveis de ambiente para produção
# Domínios de produção sempre incluídos para evitar bloqueio
PRODUCTION_ORIGINS = [
    "https://vertixbet.site",
    "https://www.vertixbet.site",
    "https://api.vertixbet.site",
]
cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
cors_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] if cors_origins_env else []

if not cors_origins:
    cors_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
        *PRODUCTION_ORIGINS,
    ]
else:
    # Mesclar origens de produção (evita CORS bloqueado se CORS_ORIGINS estiver incompleto)
    for origin in PRODUCTION_ORIGINS:
        if origin not in cors_origins:
            cors_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https?://(.*\.)?(vertixbet\.site|agenciamidas\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(admin.public_router)
app.include_router(media.router)
app.include_router(media.public_router)
app.include_router(payments.router)
app.include_router(payments.webhook_router)
app.include_router(payments.gold_api_router)  # /gold_api - IGameWin Seamless Site Endpoint
app.include_router(payments.affiliate_router)


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
    return {"message": "VertixBet API", "status": "ok", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
