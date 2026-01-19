from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
import uuid
import json

from database import get_db
from dependencies import get_current_admin_user, get_current_user
from models import (
    User, Deposit, Withdrawal, FTD, Gateway, IGameWinAgent, FTDSettings,
    TransactionStatus, UserRole, Bet, BetStatus, Notification, NotificationType
)
from schemas import (
    UserResponse, UserCreate, UserUpdate,
    DepositResponse, DepositCreate, DepositUpdate,
    WithdrawalResponse, WithdrawalCreate, WithdrawalUpdate,
    FTDResponse, FTDCreate, FTDUpdate,
    GatewayResponse, GatewayCreate, GatewayUpdate,
    IGameWinAgentResponse, IGameWinAgentCreate, IGameWinAgentUpdate,
    FTDSettingsResponse, FTDSettingsCreate, FTDSettingsUpdate
)
from auth import get_password_hash
from igamewin_api import get_igamewin_api

router = APIRouter(prefix="/api/admin", tags=["admin"])
public_router = APIRouter(prefix="/api/public", tags=["public"])


# ========== USERS ==========
@router.get("/users", response_model=List[UserResponse])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    user = User(
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
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return None


# ========== DEPOSITS ==========
@router.get("/deposits", response_model=List[DepositResponse])
async def get_deposits(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[TransactionStatus] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(Deposit)
    if status_filter:
        query = query.filter(Deposit.status == status_filter)
    if user_id:
        query = query.filter(Deposit.user_id == user_id)
    deposits = query.order_by(desc(Deposit.created_at)).offset(skip).limit(limit).all()
    return deposits


@router.get("/deposits/{deposit_id}", response_model=DepositResponse)
async def get_deposit(
    deposit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    return deposit


@router.post("/deposits", response_model=DepositResponse, status_code=status.HTTP_201_CREATED)
async def create_deposit(
    deposit_data: DepositCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == deposit_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    transaction_id = f"DEP_{uuid.uuid4().hex[:16].upper()}"
    deposit = Deposit(
        user_id=deposit_data.user_id,
        gateway_id=deposit_data.gateway_id,
        amount=deposit_data.amount,
        status=TransactionStatus.PENDING,
        transaction_id=transaction_id,
        metadata_json=deposit_data.metadata_json
    )
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    return deposit


@router.put("/deposits/{deposit_id}", response_model=DepositResponse)
async def update_deposit(
    deposit_id: int,
    deposit_data: DepositUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    deposit = db.query(Deposit).filter(Deposit.id == deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    update_data = deposit_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deposit, field, value)
    
    # If approved, update user balance
    if deposit_data.status == TransactionStatus.APPROVED and deposit.status != TransactionStatus.APPROVED:
        user = db.query(User).filter(User.id == deposit.user_id).first()
        user.balance += deposit.amount
        
        # Check if this is first deposit (FTD)
        existing_ftd = db.query(FTD).filter(FTD.user_id == deposit.user_id).first()
        if not existing_ftd:
            # Create FTD
            ftd_settings = db.query(FTDSettings).filter(FTDSettings.is_active == True).first()
            pass_rate = ftd_settings.pass_rate if ftd_settings else 0.0
            
            ftd = FTD(
                user_id=deposit.user_id,
                deposit_id=deposit.id,
                amount=deposit.amount,
                is_first_deposit=True,
                pass_rate=pass_rate,
                status=TransactionStatus.APPROVED
            )
            db.add(ftd)
    
    db.commit()
    db.refresh(deposit)
    return deposit


# ========== WITHDRAWALS ==========
@router.get("/withdrawals", response_model=List[WithdrawalResponse])
async def get_withdrawals(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[TransactionStatus] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(Withdrawal)
    if status_filter:
        query = query.filter(Withdrawal.status == status_filter)
    if user_id:
        query = query.filter(Withdrawal.user_id == user_id)
    withdrawals = query.order_by(desc(Withdrawal.created_at)).offset(skip).limit(limit).all()
    return withdrawals


@router.get("/withdrawals/{withdrawal_id}", response_model=WithdrawalResponse)
async def get_withdrawal(
    withdrawal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    withdrawal = db.query(Withdrawal).filter(Withdrawal.id == withdrawal_id).first()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    return withdrawal


@router.post("/withdrawals", response_model=WithdrawalResponse, status_code=status.HTTP_201_CREATED)
async def create_withdrawal(
    withdrawal_data: WithdrawalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == withdrawal_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.balance < withdrawal_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    transaction_id = f"WD_{uuid.uuid4().hex[:16].upper()}"
    withdrawal = Withdrawal(
        user_id=withdrawal_data.user_id,
        gateway_id=withdrawal_data.gateway_id,
        amount=withdrawal_data.amount,
        status=TransactionStatus.PENDING,
        transaction_id=transaction_id,
        metadata_json=withdrawal_data.metadata_json
    )
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    return withdrawal


@router.put("/withdrawals/{withdrawal_id}", response_model=WithdrawalResponse)
async def update_withdrawal(
    withdrawal_id: int,
    withdrawal_data: WithdrawalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    withdrawal = db.query(Withdrawal).filter(Withdrawal.id == withdrawal_id).first()
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    update_data = withdrawal_data.model_dump(exclude_unset=True)
    
    # If approved, deduct from user balance
    if withdrawal_data.status == TransactionStatus.APPROVED and withdrawal.status != TransactionStatus.APPROVED:
        user = db.query(User).filter(User.id == withdrawal.user_id).first()
        if user.balance < withdrawal.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        user.balance -= withdrawal.amount
    # If rejected or cancelled and was approved, refund
    elif withdrawal_data.status in [TransactionStatus.REJECTED, TransactionStatus.CANCELLED] and withdrawal.status == TransactionStatus.APPROVED:
        user = db.query(User).filter(User.id == withdrawal.user_id).first()
        user.balance += withdrawal.amount
    
    for field, value in update_data.items():
        setattr(withdrawal, field, value)
    
    db.commit()
    db.refresh(withdrawal)
    return withdrawal


# ========== FTDs ==========
@router.get("/ftds", response_model=List[FTDResponse])
async def get_ftds(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(FTD)
    if user_id:
        query = query.filter(FTD.user_id == user_id)
    ftds = query.order_by(desc(FTD.created_at)).offset(skip).limit(limit).all()
    return ftds


@router.get("/ftds/{ftd_id}", response_model=FTDResponse)
async def get_ftd(
    ftd_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    ftd = db.query(FTD).filter(FTD.id == ftd_id).first()
    if not ftd:
        raise HTTPException(status_code=404, detail="FTD not found")
    return ftd


@router.put("/ftds/{ftd_id}", response_model=FTDResponse)
async def update_ftd(
    ftd_id: int,
    ftd_data: FTDUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    ftd = db.query(FTD).filter(FTD.id == ftd_id).first()
    if not ftd:
        raise HTTPException(status_code=404, detail="FTD not found")
    
    update_data = ftd_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ftd, field, value)
    
    db.commit()
    db.refresh(ftd)
    return ftd


@router.get("/ftd-settings", response_model=FTDSettingsResponse)
async def get_ftd_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    settings = db.query(FTDSettings).filter(FTDSettings.is_active == True).first()
    if not settings:
        # Create default settings
        settings = FTDSettings(pass_rate=0.0, min_amount=0.0, is_active=True)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/ftd-settings", response_model=FTDSettingsResponse)
async def update_ftd_settings(
    settings_data: FTDSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    settings = db.query(FTDSettings).filter(FTDSettings.is_active == True).first()
    if not settings:
        settings = FTDSettings(**settings_data.model_dump())
        db.add(settings)
    else:
        update_data = settings_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    return settings


# ========== GATEWAYS ==========
@router.get("/gateways", response_model=List[GatewayResponse])
async def get_gateways(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    gateways = db.query(Gateway).all()
    return gateways


@router.get("/gateways/{gateway_id}", response_model=GatewayResponse)
async def get_gateway(
    gateway_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    gateway = db.query(Gateway).filter(Gateway.id == gateway_id).first()
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway not found")
    return gateway


@router.post("/gateways", response_model=GatewayResponse, status_code=status.HTTP_201_CREATED)
async def create_gateway(
    gateway_data: GatewayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    existing = db.query(Gateway).filter(Gateway.name == gateway_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Gateway name already exists")
    
    gateway = Gateway(**gateway_data.model_dump())
    db.add(gateway)
    db.commit()
    db.refresh(gateway)
    return gateway


@router.put("/gateways/{gateway_id}", response_model=GatewayResponse)
async def update_gateway(
    gateway_id: int,
    gateway_data: GatewayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    gateway = db.query(Gateway).filter(Gateway.id == gateway_id).first()
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway not found")
    
    update_data = gateway_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(gateway, field, value)
    
    db.commit()
    db.refresh(gateway)
    return gateway


@router.delete("/gateways/{gateway_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gateway(
    gateway_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    gateway = db.query(Gateway).filter(Gateway.id == gateway_id).first()
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway not found")
    db.delete(gateway)
    db.commit()
    return None


# ========== IGAMEWIN AGENTS ==========
@router.get("/igamewin-agents", response_model=List[IGameWinAgentResponse])
async def get_igamewin_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    agents = db.query(IGameWinAgent).all()
    return agents


@router.get("/igamewin-agents/{agent_id}", response_model=IGameWinAgentResponse)
async def get_igamewin_agent(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    agent = db.query(IGameWinAgent).filter(IGameWinAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="IGameWin agent not found")
    return agent


@router.post("/igamewin-agents", response_model=IGameWinAgentResponse, status_code=status.HTTP_201_CREATED)
async def create_igamewin_agent(
    agent_data: IGameWinAgentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    existing = db.query(IGameWinAgent).filter(IGameWinAgent.agent_code == agent_data.agent_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Agent code already exists")
    
    agent = IGameWinAgent(**agent_data.model_dump())
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.put("/igamewin-agents/{agent_id}", response_model=IGameWinAgentResponse)
async def update_igamewin_agent(
    agent_id: int,
    agent_data: IGameWinAgentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    agent = db.query(IGameWinAgent).filter(IGameWinAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="IGameWin agent not found")
    
    update_data = agent_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)
    
    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/igamewin-agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_igamewin_agent(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    agent = db.query(IGameWinAgent).filter(IGameWinAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="IGameWin agent not found")
    db.delete(agent)
    db.commit()
    return None


# ========== IGAMEWIN GAMES ==========
def _choose_provider(providers: list, provider_code: Optional[str]) -> Optional[str]:
    chosen = provider_code
    if not chosen:
        active = [p for p in providers if str(p.get("status", 1)) in ["1", "true", "True"]]
        if active:
            chosen = active[0].get("code") or active[0].get("provider_code")
        elif providers:
            chosen = providers[0].get("code") or providers[0].get("provider_code")
    return chosen


def _normalize_games(games: list, chosen_provider: Optional[str]) -> list:
    if chosen_provider:
        for g in games:
            if not g.get("provider_code"):
                g["provider_code"] = chosen_provider
    return games


@router.get("/igamewin/games")
async def list_igamewin_games(
    provider_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    api = get_igamewin_api(db)
    if not api:
        raise HTTPException(status_code=400, detail="Nenhum agente IGameWin ativo configurado")

    providers = await api.get_providers()
    if providers is None:
        raise HTTPException(
            status_code=502,
            detail=f"Não foi possível obter provedores da IGameWin ({api.last_error or 'erro desconhecido'})"
        )

    chosen_provider = _choose_provider(providers, provider_code)

    games = await api.get_games(provider_code=chosen_provider)
    if games is None:
        raise HTTPException(
            status_code=502,
            detail=f"Não foi possível obter jogos da IGameWin (verifique provider_code e credenciais do agente). {api.last_error or ''}".strip()
        )

    games = _normalize_games(games, chosen_provider)

    return {
        "providers": providers,
        "provider_code": chosen_provider,
        "games": games
    }


@public_router.get("/games")
async def public_games(
    provider_code: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    api = get_igamewin_api(db)
    if not api:
        raise HTTPException(status_code=400, detail="Nenhum agente IGameWin ativo configurado")

    providers = await api.get_providers()
    if providers is None:
        raise HTTPException(
            status_code=502,
            detail=f"Não foi possível obter provedores da IGameWin ({api.last_error or 'erro desconhecido'})"
        )

    chosen_provider = _choose_provider(providers, provider_code)

    games = await api.get_games(provider_code=chosen_provider)
    if games is None:
        raise HTTPException(
            status_code=502,
            detail=f"Não foi possível obter jogos da IGameWin (verifique provider_code e credenciais do agente). {api.last_error or ''}".strip()
        )

    games = _normalize_games(games, chosen_provider)

    public_games = []
    for g in games:
        status_val = g.get("status")
        is_active = (status_val == 1) or (status_val is True) or (str(status_val).lower() == "active")
        if not is_active:
            continue
        public_games.append({
            "name": g.get("game_name") or g.get("name") or g.get("title") or g.get("gameTitle"),
            "code": g.get("game_code") or g.get("code") or g.get("game_id") or g.get("id") or g.get("slug"),
            "provider": g.get("provider_code") or g.get("provider") or g.get("provider_name") or g.get("vendor") or g.get("vendor_name") or chosen_provider,
            "banner": g.get("banner") or g.get("image") or g.get("icon"),
            "status": "active"
        })

    return {
        "providers": providers,
        "provider_code": chosen_provider,
        "games": public_games
    }


@public_router.get("/games/{game_code}/launch")
async def launch_game(
    game_code: str,
    provider_code: Optional[str] = Query(None),
    lang: str = Query("pt", description="Language code"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Launch a game - requires user authentication
    
    Follows IGameWin API documentation:
    - Uses user_code (username) to launch game
    - Returns launch_url from API response
    - If provider_code is not provided, searches for the game in the game list to find its provider
    """
    api = get_igamewin_api(db)
    if not api:
        raise HTTPException(status_code=400, detail="Nenhum agente IGameWin ativo configurado")
    
    # Se provider_code não foi fornecido, buscar na lista de jogos
    if not provider_code:
        providers = await api.get_providers()
        if providers is None:
            raise HTTPException(
                status_code=502,
                detail=f"Não foi possível obter provedores da IGameWin ({api.last_error or 'erro desconhecido'})"
            )
        
        # Tentar encontrar o jogo em cada provider
        found_provider = None
        for provider in providers:
            provider_code_to_try = provider.get("code") or provider.get("provider_code")
            if not provider_code_to_try:
                continue
            
            games = await api.get_games(provider_code=provider_code_to_try)
            if games:
                for game in games:
                    game_code_from_api = game.get("game_code") or game.get("code") or game.get("game_id") or game.get("id")
                    if game_code_from_api == game_code:
                        found_provider = provider_code_to_try
                        break
                if found_provider:
                    break
        
        if found_provider:
            provider_code = found_provider
        else:
            # Se não encontrou, usar o primeiro provider ativo como fallback
            active_providers = [p for p in providers if str(p.get("status", 1)) in ["1", "true", "True"]]
            if active_providers:
                provider_code = active_providers[0].get("code") or active_providers[0].get("provider_code")
            elif providers:
                provider_code = providers[0].get("code") or providers[0].get("provider_code")
    
    # Se ainda não tem provider_code, retornar erro
    if not provider_code:
        raise HTTPException(
            status_code=400,
            detail="provider_code é obrigatório. Não foi possível determinar o provider do jogo."
        )
    
    # Gerar URL de lançamento do jogo usando user_code (username)
    launch_url = await api.launch_game(
        user_code=current_user.username,
        game_code=game_code,
        provider_code=provider_code,
        lang=lang
    )
    
    if not launch_url:
        raise HTTPException(
            status_code=502,
            detail=f"Não foi possível iniciar o jogo. {api.last_error or 'Erro desconhecido'}"
        )
    
    return {
        "game_url": launch_url,
        "launch_url": launch_url,  # Mantém compatibilidade
        "game_code": game_code,
        "provider_code": provider_code,
        "username": current_user.username,
        "user_code": current_user.username
    }


# ========== STATS ==========
@router.get("/stats")
async def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    from datetime import date, timedelta
    
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    
    # Total de usuários
    total_users = db.query(User).count()
    
    # Usuários registrados hoje
    usuarios_registrados_hoje = db.query(User).filter(
        func.date(User.created_at) == today
    ).count()
    
    # Balanço total dos jogadores com saldo
    users_with_balance = db.query(User).filter(User.balance > 0).all()
    balanco_jogador_total = sum(u.balance for u in users_with_balance)
    jogadores_com_saldo = len(users_with_balance)
    
    # Depósitos
    total_deposits = db.query(Deposit).filter(Deposit.status == TransactionStatus.APPROVED).count()
    total_deposit_amount = db.query(Deposit).filter(Deposit.status == TransactionStatus.APPROVED).with_entities(
        func.sum(Deposit.amount)
    ).scalar() or 0.0
    pending_deposits = db.query(Deposit).filter(Deposit.status == TransactionStatus.PENDING).count()
    
    # Depósitos recebidos (aprovados) hoje
    pagamentos_recebidos_hoje = db.query(Deposit).filter(
        Deposit.status == TransactionStatus.APPROVED,
        func.date(Deposit.created_at) == today
    ).count()
    valor_pagamentos_recebidos_hoje = db.query(Deposit).filter(
        Deposit.status == TransactionStatus.APPROVED,
        func.date(Deposit.created_at) == today
    ).with_entities(func.sum(Deposit.amount)).scalar() or 0.0
    
    # PIX recebido hoje (depósitos PIX aprovados hoje)
    pix_recebido_hoje = db.query(Deposit).join(Gateway).filter(
        Deposit.status == TransactionStatus.APPROVED,
        Gateway.type == "pix",
        func.date(Deposit.created_at) == today
    ).with_entities(func.sum(Deposit.amount)).scalar() or 0.0
    pix_recebido_count_hoje = db.query(Deposit).join(Gateway).filter(
        Deposit.status == TransactionStatus.APPROVED,
        Gateway.type == "pix",
        func.date(Deposit.created_at) == today
    ).count()
    
    # Saques
    total_withdrawals = db.query(Withdrawal).filter(Withdrawal.status == TransactionStatus.APPROVED).count()
    total_withdrawal_amount = db.query(Withdrawal).filter(Withdrawal.status == TransactionStatus.APPROVED).with_entities(
        func.sum(Withdrawal.amount)
    ).scalar() or 0.0
    pending_withdrawals = db.query(Withdrawal).filter(Withdrawal.status == TransactionStatus.PENDING).count()
    
    # Pagamentos feitos (saques aprovados) hoje
    pagamentos_feitos_hoje = db.query(Withdrawal).filter(
        Withdrawal.status == TransactionStatus.APPROVED,
        func.date(Withdrawal.created_at) == today
    ).count()
    valor_pagamentos_feitos_hoje = db.query(Withdrawal).filter(
        Withdrawal.status == TransactionStatus.APPROVED,
        func.date(Withdrawal.created_at) == today
    ).with_entities(func.sum(Withdrawal.amount)).scalar() or 0.0
    
    # PIX feito hoje (saques PIX aprovados hoje)
    pix_feito_hoje = db.query(Withdrawal).join(Gateway).filter(
        Withdrawal.status == TransactionStatus.APPROVED,
        Gateway.type == "pix",
        func.date(Withdrawal.created_at) == today
    ).with_entities(func.sum(Withdrawal.amount)).scalar() or 0.0
    pix_feito_count_hoje = db.query(Withdrawal).join(Gateway).filter(
        Withdrawal.status == TransactionStatus.APPROVED,
        Gateway.type == "pix",
        func.date(Withdrawal.created_at) == today
    ).count()
    
    # PIX gerado hoje (pendentes ou aprovados)
    pix_gerado_hoje = db.query(Deposit).join(Gateway).filter(
        Gateway.type == "pix",
        func.date(Deposit.created_at) == today
    ).count()
    pix_gerado_pago_hoje = db.query(Deposit).join(Gateway).filter(
        Gateway.type == "pix",
        Deposit.status == TransactionStatus.APPROVED,
        func.date(Deposit.created_at) == today
    ).count()
    pix_percentual_pago = (pix_gerado_pago_hoje / pix_gerado_hoje * 100) if pix_gerado_hoje > 0 else 0
    
    # FTDs
    total_ftds = db.query(FTD).count()
    ftd_hoje = db.query(FTD).filter(func.date(FTD.created_at) == today).count()
    
    # GGR (Gross Gaming Revenue) - receita bruta de jogos
    # Simplificado: diferença entre depósitos e saques aprovados
    ggr_gerado = total_deposit_amount - total_withdrawal_amount
    ggr_taxa = 17.0  # Taxa padrão de 17% (pode ser configurável)
    
    # Total pago em GGR (assumindo que GGR pago = saques aprovados)
    total_pago_ggr = total_withdrawal_amount
    pagamentos_feitos_total = total_withdrawals
    
    # Receita líquida / Lucro total
    net_revenue = total_deposit_amount - total_withdrawal_amount
    
    # Depósitos hoje
    depositos_hoje = db.query(Deposit).filter(func.date(Deposit.created_at) == today).count()
    
    return {
        # Métricas básicas
        "total_users": total_users,
        "total_deposits": total_deposits,
        "total_withdrawals": total_withdrawals,
        "total_ftds": total_ftds,
        "total_deposit_amount": total_deposit_amount,
        "total_withdrawal_amount": total_withdrawal_amount,
        "pending_deposits": pending_deposits,
        "pending_withdrawals": pending_withdrawals,
        "net_revenue": net_revenue,
        
        # Métricas expandidas
        "usuarios_na_casa": total_users,
        "usuarios_registrados_hoje": usuarios_registrados_hoje,
        "balanco_jogador_total": balanco_jogador_total,
        "jogadores_com_saldo": jogadores_com_saldo,
        "ggr_gerado": ggr_gerado,
        "ggr_taxa": ggr_taxa,
        "total_pago_ggr": total_pago_ggr,
        "pix_recebido_hoje": pix_recebido_hoje,
        "pix_recebido_count_hoje": pix_recebido_count_hoje,
        "pix_feito_hoje": pix_feito_hoje,
        "pix_feito_count_hoje": pix_feito_count_hoje,
        "pix_gerado_hoje": pix_gerado_hoje,
        "pix_percentual_pago": pix_percentual_pago,
        "pagamentos_recebidos_hoje": pagamentos_recebidos_hoje,
        "valor_pagamentos_recebidos_hoje": valor_pagamentos_recebidos_hoje,
        "pagamentos_feitos_hoje": pagamentos_feitos_hoje,
        "valor_pagamentos_feitos_hoje": valor_pagamentos_feitos_hoje,
        "pagamentos_feitos_total": pagamentos_feitos_total,
        "ftd_hoje": ftd_hoje,
        "depositos_hoje": depositos_hoje,
        "total_lucro": net_revenue,
    }


# ========== GGR REPORT ==========
@router.get("/ggr/report")
async def get_ggr_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Relatório de GGR (Gross Gaming Revenue)"""
    from datetime import datetime, date
    
    # Parse dates or use defaults
    if start_date:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    else:
        start = datetime.combine(date.today(), datetime.min.time())
    
    if end_date:
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    else:
        end = datetime.utcnow()
    
    # Total de depósitos aprovados no período
    total_deposits = db.query(Deposit).filter(
        Deposit.status == TransactionStatus.APPROVED,
        Deposit.created_at >= start,
        Deposit.created_at <= end
    ).with_entities(func.sum(Deposit.amount)).scalar() or 0.0
    
    # Total de saques aprovados no período
    total_withdrawals = db.query(Withdrawal).filter(
        Withdrawal.status == TransactionStatus.APPROVED,
        Withdrawal.created_at >= start,
        Withdrawal.created_at <= end
    ).with_entities(func.sum(Withdrawal.amount)).scalar() or 0.0
    
    # Total de apostas no período
    total_bets = db.query(Bet).filter(
        Bet.created_at >= start,
        Bet.created_at <= end
    ).with_entities(func.sum(Bet.amount)).scalar() or 0.0
    
    # Total ganho em apostas
    total_wins = db.query(Bet).filter(
        Bet.status == BetStatus.WON,
        Bet.created_at >= start,
        Bet.created_at <= end
    ).with_entities(func.sum(Bet.win_amount)).scalar() or 0.0
    
    # GGR = Total Apostado - Total Ganho
    ggr = total_bets - total_wins
    
    # NGR (Net Gaming Revenue) = GGR - Bonuses (simplificado, pode incluir bônus depois)
    ngr = ggr
    
    return {
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat()
        },
        "deposits": {
            "total": total_deposits,
            "count": db.query(Deposit).filter(
                Deposit.status == TransactionStatus.APPROVED,
                Deposit.created_at >= start,
                Deposit.created_at <= end
            ).count()
        },
        "withdrawals": {
            "total": total_withdrawals,
            "count": db.query(Withdrawal).filter(
                Withdrawal.status == TransactionStatus.APPROVED,
                Withdrawal.created_at >= start,
                Withdrawal.created_at <= end
            ).count()
        },
        "bets": {
            "total_amount": total_bets,
            "total_wins": total_wins,
            "count": db.query(Bet).filter(
                Bet.created_at >= start,
                Bet.created_at <= end
            ).count()
        },
        "ggr": ggr,
        "ngr": ngr,
        "ggr_rate": (ggr / total_bets * 100) if total_bets > 0 else 0.0,
    }


# ========== BETS ==========
@router.get("/bets")
async def get_bets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[int] = None,
    status: Optional[BetStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Listar apostas"""
    query = db.query(Bet)
    
    if user_id:
        query = query.filter(Bet.user_id == user_id)
    if status:
        query = query.filter(Bet.status == status)
    
    bets = query.order_by(desc(Bet.created_at)).offset(skip).limit(limit).all()
    
    return [
        {
            "id": bet.id,
            "user_id": bet.user_id,
            "username": bet.user.username if bet.user else None,
            "game_id": bet.game_id,
            "game_name": bet.game_name,
            "provider": bet.provider,
            "amount": bet.amount,
            "win_amount": bet.win_amount,
            "status": bet.status.value,
            "transaction_id": bet.transaction_id,
            "created_at": bet.created_at.isoformat(),
        }
        for bet in bets
    ]


@router.get("/bets/{bet_id}")
async def get_bet(
    bet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Obter aposta específica"""
    bet = db.query(Bet).filter(Bet.id == bet_id).first()
    if not bet:
        raise HTTPException(status_code=404, detail="Aposta não encontrada")
    
    return {
        "id": bet.id,
        "user_id": bet.user_id,
        "username": bet.user.username if bet.user else None,
        "game_id": bet.game_id,
        "game_name": bet.game_name,
        "provider": bet.provider,
        "amount": bet.amount,
        "win_amount": bet.win_amount,
        "status": bet.status.value,
        "transaction_id": bet.transaction_id,
        "external_id": bet.external_id,
        "metadata": json.loads(bet.metadata_json) if bet.metadata_json else None,
        "created_at": bet.created_at.isoformat(),
        "updated_at": bet.updated_at.isoformat(),
    }


# ========== NOTIFICATIONS ==========
@router.get("/notifications")
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[int] = None,
    is_read: Optional[bool] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Listar notificações"""
    query = db.query(Notification)
    
    if user_id:
        query = query.filter(Notification.user_id == user_id)
    else:
        # Admin vê apenas notificações globais (user_id = null)
        query = query.filter(Notification.user_id == None)
    
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    if is_active is not None:
        query = query.filter(Notification.is_active == is_active)
    
    notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()
    
    return [
        {
            "id": notif.id,
            "title": notif.title,
            "message": notif.message,
            "type": notif.type.value,
            "user_id": notif.user_id,
            "username": notif.user.username if notif.user else None,
            "is_read": notif.is_read,
            "is_active": notif.is_active,
            "link": notif.link,
            "created_at": notif.created_at.isoformat(),
        }
        for notif in notifications
    ]


@router.post("/notifications")
async def create_notification(
    title: str,
    message: str,
    type: NotificationType = NotificationType.INFO,
    user_id: Optional[int] = None,
    link: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Criar notificação"""
    notification = Notification(
        title=title,
        message=message,
        type=type,
        user_id=user_id,  # null = notificação global
        link=link,
        is_active=True,
        is_read=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type.value,
        "user_id": notification.user_id,
        "is_read": notification.is_read,
        "is_active": notification.is_active,
        "link": notification.link,
        "created_at": notification.created_at.isoformat(),
    }


@router.put("/notifications/{notification_id}")
async def update_notification(
    notification_id: int,
    title: Optional[str] = None,
    message: Optional[str] = None,
    type: Optional[NotificationType] = None,
    is_active: Optional[bool] = None,
    link: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Atualizar notificação"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    
    if title is not None:
        notification.title = title
    if message is not None:
        notification.message = message
    if type is not None:
        notification.type = type
    if is_active is not None:
        notification.is_active = is_active
    if link is not None:
        notification.link = link
    
    db.commit()
    db.refresh(notification)
    
    return {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type.value,
        "is_active": notification.is_active,
        "link": notification.link,
    }


@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Deletar notificação"""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    
    db.delete(notification)
    db.commit()
    
    return {"success": True, "message": "Notificação deletada com sucesso"}
