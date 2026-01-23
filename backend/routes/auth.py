from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import get_db
from schemas import LoginRequest, Token, UserResponse, UserCreate
from auth import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash, get_user_by_username
from dependencies import get_current_user
from models import User, UserRole
from collections import defaultdict
from datetime import datetime, timedelta
import threading

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Rate limiter será injetado via app.state.limiter
def get_limiter(request: Request):
    """Helper para obter o limiter do app"""
    return request.app.state.limiter

# Rate limiting por username (não por IP) para evitar bloqueio compartilhado
# Estrutura: {username: [timestamps das tentativas]}
_login_attempts = defaultdict(list)
_lock = threading.Lock()
_RATE_LIMIT_MAX = 5  # Máximo de tentativas
_RATE_LIMIT_WINDOW = timedelta(minutes=1)  # Janela de tempo


def check_rate_limit(username: str) -> bool:
    """
    Verifica se o username excedeu o limite de tentativas.
    Retorna True se está dentro do limite, False se excedeu.
    """
    now = datetime.utcnow()
    username_lower = username.lower().strip()
    
    with _lock:
        # Limpar tentativas antigas (fora da janela de tempo)
        _login_attempts[username_lower] = [
            ts for ts in _login_attempts[username_lower]
            if now - ts < _RATE_LIMIT_WINDOW
        ]
        
        # Verificar se excedeu o limite
        if len(_login_attempts[username_lower]) >= _RATE_LIMIT_MAX:
            return False
        
        # Registrar nova tentativa
        _login_attempts[username_lower].append(now)
        return True


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Verificar se username já existe
    if get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Verificar se email já existe
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Criar novo usuário
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        cpf=user_data.cpf,
        phone=user_data.phone,
        password_hash=get_password_hash(user_data.password),
        role=UserRole.USER,
        balance=0.0,
        is_active=True,
        is_verified=False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post("/login", response_model=Token)
async def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    # Rate limiting: usar username/email em vez de IP para evitar bloqueio compartilhado
    # Isso evita que usuários no mesmo Wi-Fi compartilhem o limite
    
    if not check_rate_limit(login_data.username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login foram realizadas. Tente novamente mais tarde."
        )
    
    # authenticate_user já tenta por username e email
    user = authenticate_user(db, login_data.username, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Se o login foi bem-sucedido, limpar tentativas anteriores desse username
    username_lower = login_data.username.lower().strip()
    with _lock:
        _login_attempts[username_lower] = []
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user
