from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
import asyncio
import time
import uuid
import json

from database import get_db
from dependencies import get_current_admin_user, get_current_user
from models import (
    User, Deposit, Withdrawal, FTD, Gateway, IGameWinAgent, FTDSettings,
    TransactionStatus, UserRole, Bet, BetStatus, Notification, NotificationType,
    Affiliate, Theme, ProviderOrder, TrackingConfig, SiteSettings, Coupon, CouponType, Promotion
)
from schemas import (
    UserResponse, UserCreate, UserUpdate,
    DepositResponse, DepositCreate, DepositUpdate,
    WithdrawalResponse, WithdrawalCreate, WithdrawalUpdate,
    FTDResponse, FTDCreate, FTDUpdate,
    GatewayResponse, GatewayCreate, GatewayUpdate,
    IGameWinAgentResponse, IGameWinAgentCreate, IGameWinAgentUpdate,
    FTDSettingsResponse, FTDSettingsCreate, FTDSettingsUpdate,
    AffiliateResponse, AffiliateCreate, AffiliateUpdate,
    ThemeResponse, ThemeCreate, ThemeUpdate,
    ProviderOrderResponse, ProviderOrderCreate, ProviderOrderUpdate,
    TrackingConfigResponse, TrackingConfigCreate, TrackingConfigUpdate,
    SiteSettingsResponse, SiteSettingsCreate, SiteSettingsUpdate,
    CouponResponse, CouponCreate, CouponUpdate,
    PromotionResponse, PromotionCreate, PromotionUpdate
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
        settings = FTDSettings(pass_rate=0.0, min_amount=2.0, min_withdrawal=10.0, is_active=True)
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


# ========== COUPONS ==========
@router.get("/coupons", response_model=List[CouponResponse])
async def get_coupons(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    q = db.query(Coupon)
    if is_active is not None:
        q = q.filter(Coupon.is_active == is_active)
    return q.order_by(Coupon.id.desc()).all()


@router.post("/coupons", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    data: CouponCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    code = (data.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Código do cupom é obrigatório")
    existing = db.query(Coupon).filter(Coupon.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um cupom com este código")
    discount_type = CouponType.PERCENT if (data.discount_type or "percent") == "percent" else CouponType.FIXED
    coupon = Coupon(
        code=code,
        discount_type=discount_type,
        discount_value=data.discount_value,
        min_deposit=data.min_deposit,
        max_uses=data.max_uses or 0,
        valid_from=data.valid_from,
        valid_until=data.valid_until,
        is_active=data.is_active,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.put("/coupons/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: int,
    data: CouponUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")
    update_data = data.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"]:
        update_data["code"] = update_data["code"].strip().upper()
    if "discount_type" in update_data:
        update_data["discount_type"] = CouponType.PERCENT if update_data["discount_type"] == "percent" else CouponType.FIXED
    for k, v in update_data.items():
        setattr(coupon, k, v)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.delete("/coupons/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")
    db.delete(coupon)
    db.commit()


# ========== PROMOTIONS ==========
@router.get("/promotions", response_model=List[PromotionResponse])
async def get_promotions(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    q = db.query(Promotion)
    if is_active is not None:
        q = q.filter(Promotion.is_active == is_active)
    return q.order_by(Promotion.display_order.asc(), Promotion.id.desc()).all()


@router.post("/promotions", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    data: PromotionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    promotion = Promotion(**data.model_dump())
    db.add(promotion)
    db.commit()
    db.refresh(promotion)
    return promotion


@router.put("/promotions/{promotion_id}", response_model=PromotionResponse)
async def update_promotion(
    promotion_id: int,
    data: PromotionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promoção não encontrada")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(promotion, k, v)
    db.commit()
    db.refresh(promotion)
    return promotion


@router.delete("/promotions/{promotion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_promotion(
    promotion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(status_code=404, detail="Promoção não encontrada")
    db.delete(promotion)
    db.commit()


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
    
    # Verificar se agent_code está sendo atualizado e se já existe em outro registro
    if 'agent_code' in update_data:
        existing_agent = db.query(IGameWinAgent).filter(
            IGameWinAgent.agent_code == update_data['agent_code'],
            IGameWinAgent.id != agent_id
        ).first()
        if existing_agent:
            raise HTTPException(status_code=400, detail="Agent code already exists")
    
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


@router.get("/igamewin/agent-balance")
async def get_igamewin_agent_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get IGameWin agent balance - Cannot deposit via API, must use IGameWin admin"""
    api = get_igamewin_api(db)
    if not api:
        raise HTTPException(
            status_code=400, 
            detail="Nenhum agente IGameWin ativo configurado ou credenciais incompletas (agent_code/agent_key vazios)"
        )

    balance = await api.get_agent_balance()
    if balance is None:
        raise HTTPException(
            status_code=502,
            detail=f"Não foi possível obter saldo do agente da IGameWin ({api.last_error or 'erro desconhecido'})"
        )

    return {
        "agent_code": api.agent_code,
        "balance": balance,
        "note": "Para adicionar saldo ao agente, utilize o painel administrativo da IGameWin. Esta API permite apenas consultar o saldo."
    }


@router.get("/igamewin/games")
async def list_igamewin_games(
    provider_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    api = get_igamewin_api(db)
    if not api:
        raise HTTPException(
            status_code=400, 
            detail="Nenhum agente IGameWin ativo configurado ou credenciais incompletas (agent_code/agent_key vazios)"
        )

    providers = await api.get_providers()
    if providers is None:
        raise HTTPException(
            status_code=502,
            detail=f"Não foi possível obter provedores da IGameWin ({api.last_error or 'erro desconhecido'})"
        )
    
    # Ordenar provedores pela ordem definida no banco
    provider_orders = db.query(ProviderOrder).all()
    order_map = {po.provider_code: po.display_order for po in provider_orders}
    priority_providers = {po.provider_code for po in provider_orders if po.is_priority}
    
    def sort_providers(p):
        code = p.get("code") or p.get("provider_code") or ""
        is_priority = code in priority_providers
        order = order_map.get(code, 999)
        return (not is_priority, order if not is_priority else 0, code)
    
    providers = sorted(providers, key=sort_providers)

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


# Cache para jogos da home (3 provedores, 15 jogos cada) - TTL 5 min
_home_games_cache: Optional[dict] = None
_home_games_cache_ts: float = 0
_HOME_GAMES_CACHE_TTL_SEC = 300  # 5 minutos


@public_router.get("/games")
async def public_games(
    provider_code: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    api = get_igamewin_api(db)
    if not api:
        raise HTTPException(
            status_code=400, 
            detail="Nenhum agente IGameWin ativo configurado ou credenciais incompletas (agent_code/agent_key vazios)"
        )

    # Usar cache para home (sem provider_code) - evita chamadas repetidas à IGameWin
    global _home_games_cache, _home_games_cache_ts
    if not provider_code and _home_games_cache is not None:
        if (time.time() - _home_games_cache_ts) < _HOME_GAMES_CACHE_TTL_SEC:
            return _home_games_cache

    providers = await api.get_providers()
    if providers is None:
        raise HTTPException(
            status_code=502,
            detail=f"Não foi possível obter provedores da IGameWin ({api.last_error or 'erro desconhecido'})"
        )
    
    # Ordenar provedores pela ordem definida no banco
    provider_orders = db.query(ProviderOrder).order_by(ProviderOrder.display_order.asc()).all()
    order_map = {po.provider_code: po.display_order for po in provider_orders}
    priority_providers = {po.provider_code for po in provider_orders if po.is_priority}
    
    # Obter os 3 provedores prioritários ordenados por display_order
    # Apenas os que têm is_priority=True, ordenados por display_order
    priority_provider_list = [
        po.provider_code for po in sorted(
            [po for po in provider_orders if po.is_priority],
            key=lambda x: x.display_order
        )
    ][:3]  # Apenas os 3 primeiros
    
    # Ordenar: primeiro os prioritários por display_order (1, 2, 3), depois os outros por ordem, depois os sem ordem
    def sort_providers(p):
        code = p.get("code") or p.get("provider_code") or ""
        is_priority = code in priority_providers
        order = order_map.get(code, 999)
        # Se é prioritário, usar o display_order diretamente para manter ordem 1, 2, 3
        if is_priority:
            priority_index = priority_provider_list.index(code) if code in priority_provider_list else 999
            return (0, priority_index, code)
        return (1, order, code)
    
    providers = sorted(providers, key=sort_providers)
    
    # Se provider_code foi especificado, retorna apenas jogos desse provedor
    if provider_code:
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
    
    # Se não há provider_code, busca jogos APENAS dos 3 provedores prioritários (para home)
    # Limite: 3 provedores, 15 jogos por provedor - chamadas em PARALELO para reduzir tempo
    GAMES_PER_PROVIDER = 15
    MAX_PROVIDERS = 3
    all_games = []
    
    # Filtrar apenas os 3 provedores prioritários
    if priority_provider_list:
        provider_code_map = {p.get("code") or p.get("provider_code"): p for p in providers}
        active_providers = []
        for prov_code in priority_provider_list[:MAX_PROVIDERS]:
            if prov_code in provider_code_map:
                provider = provider_code_map[prov_code]
                if str(provider.get("status", 1)) in ["1", "true", "True"]:
                    active_providers.append(provider)
    else:
        # Fallback: usar os 3 primeiros provedores ativos da API se não houver ProviderOrder
        active_providers = [
            p for p in providers
            if str(p.get("status", 1)) in ["1", "true", "True"]
        ][:MAX_PROVIDERS]
    
    async def fetch_games_for_provider(provider: dict) -> list:
        prov_code = provider.get("code") or provider.get("provider_code")
        if not prov_code:
            return []
        games = await api.get_games(provider_code=prov_code)
        if games is None:
            return []
        games = _normalize_games(games, prov_code)
        result = []
        for g in games:
            if len(result) >= GAMES_PER_PROVIDER:
                break
            status_val = g.get("status")
            is_active = (status_val == 1) or (status_val is True) or (str(status_val).lower() == "active")
            if not is_active:
                continue
            result.append({
                "name": g.get("game_name") or g.get("name") or g.get("title") or g.get("gameTitle"),
                "code": g.get("game_code") or g.get("code") or g.get("game_id") or g.get("id") or g.get("slug"),
                "provider": g.get("provider_code") or g.get("provider") or g.get("provider_name") or g.get("vendor") or g.get("vendor_name") or prov_code,
                "banner": g.get("banner") or g.get("image") or g.get("icon"),
                "status": "active"
            })
        return result
    
    # Buscar jogos dos 3 provedores EM PARALELO (reduz tempo de ~2min para ~30-40s)
    if active_providers:
        tasks = [fetch_games_for_provider(p) for p in active_providers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for games_list in results:
            if isinstance(games_list, Exception):
                continue
            all_games.extend(games_list)

    response = {
        "providers": providers,
        "provider_code": None,
        "games": all_games
    }
    # Salvar no cache para home (sem provider_code)
    if not provider_code:
        _home_games_cache = response
        _home_games_cache_ts = time.time()
    return response


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
        raise HTTPException(
            status_code=400, 
            detail="Nenhum agente IGameWin ativo configurado ou credenciais incompletas (agent_code/agent_key vazios)"
        )
    
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
    
    # IMPORTANTE: Sincronizar saldo do jogador com IGameWin antes de lançar o jogo
    # Verificar saldo atual no IGameWin
    igamewin_balance = await api.get_user_balance(current_user.username)
    
    # Se o usuário não existe no IGameWin ou tem saldo diferente, sincronizar
    if igamewin_balance is None:
        # Usuário não existe no IGameWin, criar e transferir saldo
        user_created = await api.create_user(current_user.username, is_demo=False)
        if not user_created:
            raise HTTPException(
                status_code=502,
                detail=f"Erro ao criar usuário no IGameWin. {api.last_error or 'Erro desconhecido'}"
            )
        # Transferir todo o saldo do jogador para o IGameWin
        if current_user.balance > 0:
            transfer_result = await api.transfer_in(current_user.username, current_user.balance)
            if not transfer_result:
                raise HTTPException(
                    status_code=502,
                    detail=f"Erro ao transferir saldo para IGameWin. {api.last_error or 'Erro desconhecido'}"
                )
    elif igamewin_balance != current_user.balance:
        # Saldos diferentes, sincronizar
        balance_diff = current_user.balance - igamewin_balance
        if balance_diff > 0:
            # Saldo local maior, transferir diferença para IGameWin
            transfer_result = await api.transfer_in(current_user.username, balance_diff)
            if not transfer_result:
                raise HTTPException(
                    status_code=502,
                    detail=f"Erro ao transferir saldo para IGameWin. {api.last_error or 'Erro desconhecido'}"
                )
        elif balance_diff < 0:
            # Saldo IGameWin maior (usuário ganhou), apenas atualizar saldo local
            # NÃO fazer transfer_out aqui - isso retiraria o dinheiro que o usuário ganhou!
            # O saldo será sincronizado pelo webhook quando houver apostas
            current_user.balance = igamewin_balance
            db.commit()
            print(f"[GAME LAUNCH] Saldo sincronizado: usuário {current_user.username} ganhou R$ {abs(balance_diff):.2f}")
    
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


# ========== AFFILIATES ==========
@router.get("/affiliates", response_model=List[AffiliateResponse])
async def get_affiliates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Lista todos os afiliados"""
    affiliates = db.query(Affiliate).offset(skip).limit(limit).all()
    return affiliates


@router.get("/affiliates/{affiliate_id}", response_model=AffiliateResponse)
async def get_affiliate(
    affiliate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Busca um afiliado específico"""
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado não encontrado")
    return affiliate


@router.post("/affiliates", response_model=AffiliateResponse, status_code=status.HTTP_201_CREATED)
async def create_affiliate(
    affiliate_data: AffiliateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Cria um novo afiliado"""
    # Verificar se o usuário existe
    user = db.query(User).filter(User.id == affiliate_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se já existe afiliado para este usuário
    existing = db.query(Affiliate).filter(Affiliate.user_id == affiliate_data.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este usuário já é um afiliado")
    
    # Verificar se o código já existe
    existing_code = db.query(Affiliate).filter(Affiliate.affiliate_code == affiliate_data.affiliate_code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Código de afiliado já existe")
    
    affiliate = Affiliate(
        user_id=affiliate_data.user_id,
        affiliate_code=affiliate_data.affiliate_code,
        cpa_amount=affiliate_data.cpa_amount,
        revshare_percentage=affiliate_data.revshare_percentage
    )
    
    db.add(affiliate)
    db.commit()
    db.refresh(affiliate)
    
    return affiliate


@router.put("/affiliates/{affiliate_id}", response_model=AffiliateResponse)
async def update_affiliate(
    affiliate_id: int,
    affiliate_data: AffiliateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Atualiza um afiliado (CPA e revshare)"""
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado não encontrado")
    
    if affiliate_data.cpa_amount is not None:
        affiliate.cpa_amount = affiliate_data.cpa_amount
    
    if affiliate_data.revshare_percentage is not None:
        if affiliate_data.revshare_percentage < 0 or affiliate_data.revshare_percentage > 100:
            raise HTTPException(status_code=400, detail="Revshare deve estar entre 0 e 100")
        affiliate.revshare_percentage = affiliate_data.revshare_percentage
    
    if affiliate_data.is_active is not None:
        affiliate.is_active = affiliate_data.is_active
    
    db.commit()
    db.refresh(affiliate)
    
    return affiliate


@router.delete("/affiliates/{affiliate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_affiliate(
    affiliate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Deleta um afiliado"""
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).first()
    if not affiliate:
        raise HTTPException(status_code=404, detail="Afiliado não encontrado")
    
    db.delete(affiliate)
    db.commit()


# ========== THEMES ==========
@router.get("/themes", response_model=List[ThemeResponse])
async def get_themes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Lista todos os temas"""
    themes = db.query(Theme).all()
    return themes


@router.get("/themes/active", response_model=ThemeResponse)
async def get_active_theme(
    db: Session = Depends(get_db)
):
    """Retorna o tema ativo (público, não requer autenticação)"""
    theme = db.query(Theme).filter(Theme.is_active == True).first()
    if not theme:
        # Retornar tema padrão se não houver tema ativo
        default_colors = {
            "primary": "#0a4d3e",
            "secondary": "#0d5d4b",
            "accent": "#d4af37",
            "background": "#0a0e0f",
            "text": "#ffffff",
            "textSecondary": "#9ca3af",
            "success": "#10b981",
            "error": "#ef4444",
            "warning": "#f59e0b"
        }
        return {
            "id": 0,
            "name": "Default",
            "colors_json": json.dumps(default_colors),
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    return theme


@public_router.get("/themes/active", response_model=ThemeResponse)
async def get_active_theme_public(
    db: Session = Depends(get_db)
):
    """Retorna o tema ativo (público)"""
    return await get_active_theme(db)


@router.get("/themes/{theme_id}", response_model=ThemeResponse)
async def get_theme(
    theme_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Busca um tema específico"""
    theme = db.query(Theme).filter(Theme.id == theme_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Tema não encontrado")
    return theme


@router.post("/themes", response_model=ThemeResponse, status_code=status.HTTP_201_CREATED)
async def create_theme(
    theme_data: ThemeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Cria um novo tema"""
    # Verificar se o nome já existe
    existing = db.query(Theme).filter(Theme.name == theme_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tema com este nome já existe")
    
    # Validar JSON de cores
    try:
        colors = json.loads(theme_data.colors_json)
        required_colors = ["primary", "secondary", "accent", "background", "text"]
        for color in required_colors:
            if color not in colors:
                raise HTTPException(status_code=400, detail=f"Cor '{color}' é obrigatória")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="colors_json deve ser um JSON válido")
    
    # Se este tema será ativo, desativar outros
    if theme_data.is_active:
        db.query(Theme).update({Theme.is_active: False})
    
    theme = Theme(
        name=theme_data.name,
        colors_json=theme_data.colors_json,
        is_active=theme_data.is_active
    )
    
    db.add(theme)
    db.commit()
    db.refresh(theme)
    
    return theme


@router.put("/themes/{theme_id}", response_model=ThemeResponse)
async def update_theme(
    theme_id: int,
    theme_data: ThemeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Atualiza um tema"""
    theme = db.query(Theme).filter(Theme.id == theme_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Tema não encontrado")
    
    if theme_data.name is not None:
        # Verificar se o nome já existe em outro tema
        existing = db.query(Theme).filter(Theme.name == theme_data.name, Theme.id != theme_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tema com este nome já existe")
        theme.name = theme_data.name
    
    if theme_data.colors_json is not None:
        # Validar JSON de cores
        try:
            colors = json.loads(theme_data.colors_json)
            required_colors = ["primary", "secondary", "accent", "background", "text"]
            for color in required_colors:
                if color not in colors:
                    raise HTTPException(status_code=400, detail=f"Cor '{color}' é obrigatória")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="colors_json deve ser um JSON válido")
        theme.colors_json = theme_data.colors_json
    
    if theme_data.is_active is not None:
        # Se ativando este tema, desativar outros
        if theme_data.is_active:
            db.query(Theme).filter(Theme.id != theme_id).update({Theme.is_active: False})
        theme.is_active = theme_data.is_active
    
    db.commit()
    db.refresh(theme)
    
    return theme


@router.delete("/themes/{theme_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_theme(
    theme_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Deleta um tema"""
    theme = db.query(Theme).filter(Theme.id == theme_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Tema não encontrado")
    
    # Não permitir deletar tema ativo
    if theme.is_active:
        raise HTTPException(status_code=400, detail="Não é possível deletar o tema ativo")
    
    db.delete(theme)
    db.commit()


# ========== PROVIDER ORDER ==========
@router.get("/provider-orders", response_model=List[ProviderOrderResponse])
async def get_provider_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Lista todas as ordens de provedores"""
    orders = db.query(ProviderOrder).order_by(ProviderOrder.display_order.asc()).all()
    return orders


@router.post("/provider-orders", response_model=ProviderOrderResponse)
async def create_provider_order(
    order_data: ProviderOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Cria ou atualiza ordem de um provedor"""
    existing = db.query(ProviderOrder).filter(ProviderOrder.provider_code == order_data.provider_code).first()
    if existing:
        existing.display_order = order_data.display_order
        existing.is_priority = order_data.is_priority
        db.commit()
        db.refresh(existing)
        return existing
    
    order = ProviderOrder(**order_data.dict())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.put("/provider-orders/bulk", response_model=List[ProviderOrderResponse])
async def update_provider_orders_bulk(
    orders: List[ProviderOrderCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Atualiza múltiplas ordens de provedores de uma vez"""
    updated = []
    for order_data in orders:
        existing = db.query(ProviderOrder).filter(ProviderOrder.provider_code == order_data.provider_code).first()
        if existing:
            existing.display_order = order_data.display_order
            existing.is_priority = order_data.is_priority
            updated.append(existing)
        else:
            new_order = ProviderOrder(**order_data.dict())
            db.add(new_order)
            updated.append(new_order)
    db.commit()
    for order in updated:
        db.refresh(order)
    return updated


@router.delete("/provider-orders/{provider_code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider_order(
    provider_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Remove ordem de um provedor"""
    order = db.query(ProviderOrder).filter(ProviderOrder.provider_code == provider_code).first()
    if order:
        db.delete(order)
        db.commit()


# ========== TRACKING CONFIG ==========
@router.get("/tracking-configs", response_model=List[TrackingConfigResponse])
async def get_tracking_configs(
    platform: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Lista configurações de tracking"""
    query = db.query(TrackingConfig)
    if platform:
        query = query.filter(TrackingConfig.platform == platform)
    configs = query.all()
    return configs


@router.get("/tracking-configs/{config_id}", response_model=TrackingConfigResponse)
async def get_tracking_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Obtém uma configuração de tracking específica"""
    config = db.query(TrackingConfig).filter(TrackingConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração de tracking não encontrada")
    return config


@router.post("/tracking-configs", response_model=TrackingConfigResponse)
async def create_tracking_config(
    config_data: TrackingConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Cria uma nova configuração de tracking"""
    config = TrackingConfig(**config_data.dict())
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@router.put("/tracking-configs/{config_id}", response_model=TrackingConfigResponse)
async def update_tracking_config(
    config_id: int,
    config_data: TrackingConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Atualiza uma configuração de tracking"""
    config = db.query(TrackingConfig).filter(TrackingConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração de tracking não encontrada")
    
    update_data = config_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    
    db.commit()
    db.refresh(config)
    return config


@router.delete("/tracking-configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tracking_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Deleta uma configuração de tracking"""
    config = db.query(TrackingConfig).filter(TrackingConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração de tracking não encontrada")
    
    db.delete(config)
    db.commit()


# ========== SITE SETTINGS ==========
@router.get("/site-settings", response_model=List[SiteSettingsResponse])
async def get_site_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Lista todas as configurações do site"""
    settings = db.query(SiteSettings).all()
    return settings


@router.get("/site-settings/{key}", response_model=SiteSettingsResponse)
async def get_site_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Busca uma configuração específica por chave"""
    setting = db.query(SiteSettings).filter(SiteSettings.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    return setting


@router.post("/site-settings", response_model=SiteSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_site_setting(
    setting_data: SiteSettingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Cria uma nova configuração do site"""
    # Verificar se já existe
    existing = db.query(SiteSettings).filter(SiteSettings.key == setting_data.key).first()
    if existing:
        raise HTTPException(status_code=400, detail="Configuração com esta chave já existe")
    
    setting = SiteSettings(
        key=setting_data.key,
        value=setting_data.value,
        description=setting_data.description
    )
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


@router.put("/site-settings/{key}", response_model=SiteSettingsResponse)
async def update_site_setting(
    key: str,
    setting_data: SiteSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Atualiza uma configuração do site"""
    setting = db.query(SiteSettings).filter(SiteSettings.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    
    update_data = setting_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setting, field, value)
    
    db.commit()
    db.refresh(setting)
    return setting


@router.delete("/site-settings/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Deleta uma configuração do site"""
    setting = db.query(SiteSettings).filter(SiteSettings.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    
    db.delete(setting)
    db.commit()


# ========== PUBLIC MINIMUMS (depósito/saque) ==========
@public_router.get("/minimums")
async def get_minimums(db: Session = Depends(get_db)):
    """Retorna depósito mínimo e saque mínimo (público, para validação no frontend)."""
    settings = db.query(FTDSettings).filter(FTDSettings.is_active == True).first()
    if not settings:
        return {"min_deposit": 2.0, "min_withdrawal": 10.0}
    return {
        "min_deposit": getattr(settings, "min_amount", 2.0),
        "min_withdrawal": getattr(settings, "min_withdrawal", 10.0),
    }


# ========== PUBLIC SITE SETTINGS ==========
@public_router.get("/site-settings/{key}")
async def get_public_site_setting(
    key: str,
    db: Session = Depends(get_db)
):
    """Busca uma configuração pública do site (sem autenticação)"""
    setting = db.query(SiteSettings).filter(SiteSettings.key == key).first()
    if not setting:
        return {"key": key, "value": None}
    return {"key": setting.key, "value": setting.value}


# ========== PUBLIC PROMOTIONS ==========
@public_router.get("/promotions", response_model=List[PromotionResponse])
async def get_public_promotions(db: Session = Depends(get_db)):
    """Lista promoções ativas para o usuário (público, sem autenticação)."""
    now = datetime.utcnow()
    q = db.query(Promotion).filter(Promotion.is_active == True)
    q = q.filter(
        (Promotion.valid_from == None) | (Promotion.valid_from <= now)
    ).filter(
        (Promotion.valid_until == None) | (Promotion.valid_until >= now)
    )
    return q.order_by(Promotion.display_order.asc(), Promotion.id.desc()).all()
