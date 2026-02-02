from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    AGENT = "agent"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)  # telefone para login
    email = Column(String(255), unique=True, index=True, nullable=False)  # gerado se não informado
    display_name = Column(String(200), nullable=True)  # nome do usuário
    cpf = Column(String(14), unique=True, index=True)
    phone = Column(String(20))
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    balance = Column(Float, default=0.0, nullable=False)  # Saldo real (sacável)
    bonus_balance = Column(Float, default=0.0, nullable=False)  # Bônus FTD/cupom/reload (usável em jogos, não sacável)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    referred_by_affiliate_id = Column(Integer, ForeignKey("affiliates.id"), nullable=True, index=True)  # Afiliado que indicou
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships (primaryjoin: conta de afiliado do usuário = Affiliate.user_id == User.id)
    deposits = relationship("Deposit", back_populates="user")
    withdrawals = relationship("Withdrawal", back_populates="user")
    ftds = relationship("FTD", back_populates="user")
    bets = relationship("Bet", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    affiliate = relationship("Affiliate", back_populates="user", uselist=False, primaryjoin="User.id==Affiliate.user_id")


class Gateway(Base):
    __tablename__ = "gateways"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(String(50), nullable=False)  # pix, card, etc
    is_active = Column(Boolean, default=True, nullable=False)
    credentials = Column(Text)  # JSON string with credentials
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IGameWinAgent(Base):
    __tablename__ = "igamewin_agents"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_code = Column(String(100), unique=True, nullable=False)
    agent_key = Column(String(255), nullable=False)
    api_url = Column(String(255), default="https://api.igamewin.com", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    rtp = Column(Float, default=96.0, nullable=False)  # RTP do agente em % (ex: 96 = 96%)
    credentials = Column(Text)  # JSON string with additional credentials
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Deposit(Base):
    __tablename__ = "deposits"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    gateway_id = Column(Integer, ForeignKey("gateways.id"))
    amount = Column(Float, nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING, nullable=False)
    transaction_id = Column(String(255), unique=True, index=True)
    external_id = Column(String(255), index=True)  # ID from gateway
    metadata_json = Column(Text)  # JSON string with additional data
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="deposits")
    gateway = relationship("Gateway")


class Withdrawal(Base):
    __tablename__ = "withdrawals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    gateway_id = Column(Integer, ForeignKey("gateways.id"))
    amount = Column(Float, nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING, nullable=False)
    transaction_id = Column(String(255), unique=True, index=True)
    external_id = Column(String(255), index=True)
    metadata_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="withdrawals")
    gateway = relationship("Gateway")


class FTD(Base):
    __tablename__ = "ftds"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    deposit_id = Column(Integer, ForeignKey("deposits.id"), nullable=False)
    amount = Column(Float, nullable=False)
    is_first_deposit = Column(Boolean, default=True, nullable=False)
    pass_rate = Column(Float, default=0.0, nullable=False)  # Taxa de passagem
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="ftds")


class FTDSettings(Base):
    __tablename__ = "ftd_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    pass_rate = Column(Float, default=0.0, nullable=False)  # Taxa de passagem (interno)
    ftd_bonus_percentage = Column(Float, default=0.0, nullable=False)  # Bônus % no 1º depósito (ex: 100 = dobra)
    reload_bonus_percentage = Column(Float, default=0.0, nullable=False)  # Bônus % em depósitos após o 1º (reload)
    reload_bonus_min_deposit = Column(Float, default=0.0, nullable=False)  # Depósito mínimo para reload (R$)
    min_amount = Column(Float, default=2.0, nullable=False)  # Depósito mínimo (R$)
    min_withdrawal = Column(Float, default=10.0, nullable=False)  # Saque mínimo (R$)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MediaType(str, enum.Enum):
    LOGO = "logo"
    BANNER = "banner"


class MediaAsset(Base):
    __tablename__ = "media_assets"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(MediaType), nullable=False, index=True)
    url = Column(String(500), nullable=False)  # URL relativa: /uploads/banners/arquivo.jpg
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer)  # Tamanho em bytes
    mime_type = Column(String(100))  # image/jpeg, image/png, etc
    is_active = Column(Boolean, default=True, nullable=False)
    position = Column(Integer, default=0, nullable=False)  # Ordem para banners
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BetStatus(str, enum.Enum):
    PENDING = "pending"
    WON = "won"
    LOST = "lost"
    CANCELLED = "cancelled"


class Bet(Base):
    __tablename__ = "bets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(String(255))  # ID do jogo (IGameWin ou outro provider)
    game_name = Column(String(255))  # Nome do jogo
    provider = Column(String(100))  # IGameWin, Pragmatic, etc
    amount = Column(Float, nullable=False)  # Valor da aposta
    win_amount = Column(Float, default=0.0)  # Valor ganho (0 se perdeu)
    status = Column(Enum(BetStatus), default=BetStatus.PENDING, nullable=False)
    transaction_id = Column(String(255), unique=True, index=True)
    external_id = Column(String(255), index=True)  # ID do provider externo
    metadata_json = Column(Text)  # JSON com dados adicionais do jogo
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="bets")


class NotificationType(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    PROMOTION = "promotion"


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Enum(NotificationType), default=NotificationType.INFO, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = notificação global
    is_read = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    link = Column(String(500))  # Link opcional (ex: /promo/bonus)
    metadata_json = Column(Text)  # JSON com dados adicionais
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notifications")


class Affiliate(Base):
    __tablename__ = "affiliates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)  # Um usuário = um afiliado
    affiliate_code = Column(String(50), unique=True, index=True, nullable=False)  # Código único do afiliado
    cpa_amount = Column(Float, default=0.0, nullable=False)  # Valor do CPA (Cost Per Acquisition)
    revshare_percentage = Column(Float, default=0.0, nullable=False)  # Percentual de revshare (0-100)
    total_earnings = Column(Float, default=0.0, nullable=False)  # Total ganho pelo afiliado
    total_cpa_earned = Column(Float, default=0.0, nullable=False)  # Total ganho em CPA
    total_revshare_earned = Column(Float, default=0.0, nullable=False)  # Total ganho em revshare
    total_referrals = Column(Integer, default=0, nullable=False)  # Total de indicações
    total_deposits = Column(Float, default=0.0, nullable=False)  # Total depositado pelos indicados
    is_active = Column(Boolean, default=True, nullable=False)
    metadata_json = Column(Text)  # JSON com dados adicionais
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships (foreign_keys: dono da conta afiliado; desambigua de User.referred_by_affiliate_id)
    user = relationship("User", back_populates="affiliate", foreign_keys=[user_id])


class Theme(Base):
    __tablename__ = "themes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # Nome do tema
    is_active = Column(Boolean, default=False, nullable=False)  # Apenas um tema pode estar ativo
    colors_json = Column(Text, nullable=False)  # JSON com as cores do tema
    # Estrutura esperada:
    # {
    #   "primary": "#0a4d3e",
    #   "secondary": "#0d5d4b",
    #   "accent": "#d4af37",
    #   "background": "#0a0e0f",
    #   "text": "#ffffff",
    #   "textSecondary": "#gray-300",
    #   "success": "#10b981",
    #   "error": "#ef4444",
    #   "warning": "#f59e0b"
    # }
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProviderOrder(Base):
    __tablename__ = "provider_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_code = Column(String(100), unique=True, nullable=False, index=True)  # Código do provedor (ex: "PRAGMATIC", "SPRIBE")
    display_order = Column(Integer, nullable=False, default=999)  # Ordem de exibição (menor = primeiro)
    is_priority = Column(Boolean, default=False, nullable=False)  # Se é um dos 3 primeiros (prioritário)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TrackingConfig(Base):
    __tablename__ = "tracking_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String(50), nullable=False, default="meta")  # meta, google, tiktok, etc
    pixel_id = Column(String(255))  # Meta Pixel ID
    access_token = Column(String(500))  # Meta Access Token
    webhook_url = Column(String(500))  # URL do webhook do Meta
    webhook_verify_token = Column(String(255))  # Token de verificação do webhook
    is_active = Column(Boolean, default=True, nullable=False)
    metadata_json = Column(Text)  # JSON com configurações adicionais
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SiteSettings(Base):
    __tablename__ = "site_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)  # Ex: "support_phone", "support_email", etc
    value = Column(Text, nullable=True)  # Valor da configuração
    description = Column(String(255))  # Descrição do que é essa configuração
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CouponType(str, enum.Enum):
    PERCENT = "percent"
    FIXED = "fixed"


class Promotion(Base):
    __tablename__ = "promotions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)  # URL da imagem/banner
    link_url = Column(String(500), nullable=True)  # Link externo ou rota (ex: /depositar)
    display_order = Column(Integer, default=0, nullable=False)  # Ordem de exibição
    is_active = Column(Boolean, default=True, nullable=False)
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Coupon(Base):
    __tablename__ = "coupons"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_type = Column(Enum(CouponType), default=CouponType.PERCENT, nullable=False)
    discount_value = Column(Float, nullable=False)  # % ou R$
    min_deposit = Column(Float, default=0.0, nullable=False)  # Depósito mínimo para usar
    max_uses = Column(Integer, default=0, nullable=False)  # 0 = ilimitado
    used_count = Column(Integer, default=0, nullable=False)
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
