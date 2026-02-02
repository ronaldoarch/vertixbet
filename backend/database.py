from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from models import Base
import os

# Obter DATABASE_URL e normalizar postgres:// para postgresql://
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fortunevegas.db")
# SQLAlchemy 2.0 requer postgresql:// em vez de postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    # Migração: adicionar coluna referred_by_affiliate_id em users (afiliado que indicou)
    try:
        with engine.connect() as conn:
            if "sqlite" in DATABASE_URL:
                conn.execute(text("ALTER TABLE users ADD COLUMN referred_by_affiliate_id INTEGER REFERENCES affiliates(id)"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_affiliate_id INTEGER REFERENCES affiliates(id)"))
            conn.commit()
    except Exception:
        pass  # Coluna já existe ou tabela não existe
    # Migração: adicionar coluna min_withdrawal em ftd_settings
    try:
        with engine.connect() as conn:
            if "sqlite" in DATABASE_URL:
                conn.execute(text("ALTER TABLE ftd_settings ADD COLUMN min_withdrawal REAL DEFAULT 10.0"))
            else:
                conn.execute(text("ALTER TABLE ftd_settings ADD COLUMN IF NOT EXISTS min_withdrawal DOUBLE PRECISION DEFAULT 10.0"))
            conn.commit()
    except Exception:
        pass
    # Migração: adicionar coluna rtp em igamewin_agents
    try:
        with engine.connect() as conn:
            if "sqlite" in DATABASE_URL:
                conn.execute(text("ALTER TABLE igamewin_agents ADD COLUMN rtp REAL DEFAULT 96.0"))
            else:
                conn.execute(text("ALTER TABLE igamewin_agents ADD COLUMN IF NOT EXISTS rtp DOUBLE PRECISION DEFAULT 96.0"))
            conn.commit()
    except Exception:
        pass
    # Migração: display_name em users
    try:
        with engine.connect() as conn:
            if "sqlite" in DATABASE_URL:
                conn.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR(200)"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(200)"))
            conn.commit()
    except Exception:
        pass
    # Migração: ftd_bonus_percentage em ftd_settings
    try:
        with engine.connect() as conn:
            if "sqlite" in DATABASE_URL:
                conn.execute(text("ALTER TABLE ftd_settings ADD COLUMN ftd_bonus_percentage REAL DEFAULT 0.0"))
            else:
                conn.execute(text("ALTER TABLE ftd_settings ADD COLUMN IF NOT EXISTS ftd_bonus_percentage DOUBLE PRECISION DEFAULT 0.0"))
            conn.commit()
    except Exception:
        pass
    # Migração: bonus_balance em users (bônus não sacável)
    try:
        with engine.connect() as conn:
            if "sqlite" in DATABASE_URL:
                conn.execute(text("ALTER TABLE users ADD COLUMN bonus_balance REAL DEFAULT 0.0"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_balance DOUBLE PRECISION DEFAULT 0.0"))
            conn.commit()
    except Exception:
        pass
    # Migração: reload_bonus em ftd_settings
    try:
        with engine.connect() as conn:
            if "sqlite" in DATABASE_URL:
                conn.execute(text("ALTER TABLE ftd_settings ADD COLUMN reload_bonus_percentage REAL DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE ftd_settings ADD COLUMN reload_bonus_min_deposit REAL DEFAULT 0.0"))
            else:
                conn.execute(text("ALTER TABLE ftd_settings ADD COLUMN IF NOT EXISTS reload_bonus_percentage DOUBLE PRECISION DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE ftd_settings ADD COLUMN IF NOT EXISTS reload_bonus_min_deposit DOUBLE PRECISION DEFAULT 0.0"))
            conn.commit()
    except Exception:
        pass
    # Migração: use_demo_mode em igamewin_agents
    try:
        with engine.connect() as conn:
            if "sqlite" in DATABASE_URL:
                conn.execute(text("ALTER TABLE igamewin_agents ADD COLUMN use_demo_mode INTEGER DEFAULT 0"))
            else:
                conn.execute(text("ALTER TABLE igamewin_agents ADD COLUMN IF NOT EXISTS use_demo_mode BOOLEAN DEFAULT FALSE"))
            conn.commit()
    except Exception:
        pass
    # Migração: promotion_type, bonus_value, min_deposit em promotions
    try:
        with engine.connect() as conn:
            if "sqlite" in DATABASE_URL:
                conn.execute(text("ALTER TABLE promotions ADD COLUMN promotion_type VARCHAR(50) DEFAULT 'display'"))
                conn.execute(text("ALTER TABLE promotions ADD COLUMN bonus_value REAL DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE promotions ADD COLUMN min_deposit REAL DEFAULT 0.0"))
            else:
                conn.execute(text("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS promotion_type VARCHAR(50) DEFAULT 'display'"))
                conn.execute(text("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS bonus_value DOUBLE PRECISION DEFAULT 0.0"))
                conn.execute(text("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS min_deposit DOUBLE PRECISION DEFAULT 0.0"))
            conn.commit()
    except Exception:
        pass


def get_db():
    """Dependency for getting DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
