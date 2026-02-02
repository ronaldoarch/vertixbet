from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import TransactionStatus, UserRole, MediaType, NotificationType


# User Schemas
class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    cpf: Optional[str] = None
    phone: Optional[str] = None
    display_name: Optional[str] = None


class UserCreate(BaseModel):
    """Cadastro: username (telefone), password, display_name (nome). Email/CPF opcionais - backend gera email."""
    username: str  # telefone para login
    password: str
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None
    cpf: Optional[str] = None
    phone: Optional[str] = None
    affiliate_code: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    cpf: Optional[str] = None
    phone: Optional[str] = None
    balance: Optional[float] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    id: int
    role: UserRole
    balance: float
    is_active: bool
    is_verified: bool
    display_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # email como str para aceitar placeholders (ex: user_xxx@example.com)
    email: Optional[str] = None

    class Config:
        from_attributes = True


# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str


# Gateway Schemas
class GatewayBase(BaseModel):
    name: str
    type: str
    is_active: bool = True
    credentials: Optional[str] = None


class GatewayCreate(GatewayBase):
    pass


class GatewayUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    is_active: Optional[bool] = None
    credentials: Optional[str] = None


class GatewayResponse(GatewayBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# IGameWin Agent Schemas
class IGameWinAgentBase(BaseModel):
    agent_code: str
    agent_key: str
    api_url: str = "https://api.igamewin.com"
    is_active: bool = True
    rtp: float = 96.0  # RTP do agente em % (ex: 96 = 96%)
    credentials: Optional[str] = None


class IGameWinAgentCreate(IGameWinAgentBase):
    pass


class IGameWinAgentUpdate(BaseModel):
    agent_code: Optional[str] = None
    agent_key: Optional[str] = None
    api_url: Optional[str] = None
    is_active: Optional[bool] = None
    rtp: Optional[float] = None
    credentials: Optional[str] = None


class IGameWinAgentResponse(IGameWinAgentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Deposit Schemas
class DepositBase(BaseModel):
    user_id: int
    gateway_id: Optional[int] = None
    amount: float
    metadata_json: Optional[str] = None


class DepositCreate(DepositBase):
    pass


class DepositPixRequest(BaseModel):
    """Request body para criar depósito PIX. payer_* opcionais - usa dados de SiteSettings se vazios."""
    amount: float
    payer_name: Optional[str] = None
    payer_tax_id: Optional[str] = None
    payer_email: Optional[str] = None
    payer_phone: Optional[str] = None
    coupon_code: Optional[str] = None


class DepositUpdate(BaseModel):
    status: Optional[TransactionStatus] = None
    external_id: Optional[str] = None
    metadata_json: Optional[str] = None


class DepositResponse(DepositBase):
    id: int
    status: TransactionStatus
    transaction_id: str
    external_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Withdrawal Schemas
class WithdrawalBase(BaseModel):
    user_id: int
    gateway_id: Optional[int] = None
    amount: float
    metadata_json: Optional[str] = None


class WithdrawalCreate(WithdrawalBase):
    pass


class WithdrawalPixRequest(BaseModel):
    """Request body para criar saque PIX"""
    amount: float
    pix_key: str
    pix_key_type: str
    document_validation: Optional[str] = None


class WithdrawalUpdate(BaseModel):
    status: Optional[TransactionStatus] = None
    external_id: Optional[str] = None
    metadata_json: Optional[str] = None


class WithdrawalResponse(WithdrawalBase):
    id: int
    status: TransactionStatus
    transaction_id: str
    external_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# FTD Schemas
class FTDBase(BaseModel):
    user_id: int
    deposit_id: int
    amount: float
    pass_rate: float = 0.0


class FTDCreate(FTDBase):
    pass


class FTDUpdate(BaseModel):
    pass_rate: Optional[float] = None
    status: Optional[TransactionStatus] = None


class FTDResponse(FTDBase):
    id: int
    is_first_deposit: bool
    status: TransactionStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# FTD Settings Schemas
class FTDSettingsBase(BaseModel):
    pass_rate: float = 0.0
    min_amount: float = 2.0  # Depósito mínimo (R$)
    min_withdrawal: float = 10.0  # Saque mínimo (R$)
    is_active: bool = True


class FTDSettingsCreate(FTDSettingsBase):
    pass


class FTDSettingsUpdate(FTDSettingsBase):
    pass


class FTDSettingsResponse(FTDSettingsBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Coupon Schemas
class CouponBase(BaseModel):
    code: str
    discount_type: str = "percent"  # percent | fixed
    discount_value: float = 0.0
    min_deposit: float = 0.0
    max_uses: int = 0  # 0 = ilimitado
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_deposit: Optional[float] = None
    max_uses: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class CouponResponse(CouponBase):
    id: int
    used_count: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Promotion Schemas
class PromotionBase(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None


class PromotionCreate(PromotionBase):
    pass


class PromotionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None


class PromotionResponse(PromotionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Notification Schemas
class NotificationCreate(BaseModel):
    title: str
    message: str
    type: NotificationType = NotificationType.INFO
    user_id: Optional[int] = None
    link: Optional[str] = None


# Media Asset Schemas
class MediaAssetResponse(BaseModel):
    id: int
    type: str
    url: str
    filename: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    is_active: bool
    position: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Affiliate Schemas
class AffiliateBase(BaseModel):
    user_id: int
    affiliate_code: str
    cpa_amount: float = 0.0
    revshare_percentage: float = 0.0
    is_active: bool = True


class AffiliateCreate(BaseModel):
    user_id: int
    affiliate_code: str
    cpa_amount: float = 0.0
    revshare_percentage: float = 0.0


class AffiliateUpdate(BaseModel):
    cpa_amount: Optional[float] = None
    revshare_percentage: Optional[float] = None
    is_active: Optional[bool] = None


class AffiliateResponse(AffiliateBase):
    id: int
    total_earnings: float
    total_cpa_earned: float
    total_revshare_earned: float
    total_referrals: int
    total_deposits: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Theme Schemas
class ThemeBase(BaseModel):
    name: str
    colors_json: str
    is_active: bool = False


class ThemeCreate(ThemeBase):
    pass


class ThemeUpdate(BaseModel):
    name: Optional[str] = None
    colors_json: Optional[str] = None
    is_active: Optional[bool] = None


class ThemeResponse(ThemeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Provider Order Schemas
class ProviderOrderBase(BaseModel):
    provider_code: str
    display_order: int = 999
    is_priority: bool = False


class ProviderOrderCreate(ProviderOrderBase):
    pass


class ProviderOrderUpdate(BaseModel):
    display_order: Optional[int] = None
    is_priority: Optional[bool] = None


class ProviderOrderResponse(ProviderOrderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Tracking Config Schemas
class TrackingConfigBase(BaseModel):
    platform: str = "meta"
    pixel_id: Optional[str] = None
    access_token: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    is_active: bool = True
    metadata_json: Optional[str] = None


class TrackingConfigCreate(TrackingConfigBase):
    pass


class TrackingConfigUpdate(BaseModel):
    pixel_id: Optional[str] = None
    access_token: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    is_active: Optional[bool] = None
    metadata_json: Optional[str] = None


class TrackingConfigResponse(TrackingConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Site Settings Schemas
class SiteSettingsBase(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None


class SiteSettingsCreate(SiteSettingsBase):
    pass


class SiteSettingsUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None


class SiteSettingsResponse(SiteSettingsBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
