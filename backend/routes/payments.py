"""
Rotas públicas para pagamentos (depósitos e saques) usando SuitPay e Gatebox
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from sqlalchemy import func
from models import User, Deposit, Withdrawal, Gateway, TransactionStatus, Bet, BetStatus, Affiliate, FTDSettings, FTD, Coupon, CouponType, SiteSettings, Promotion, IGameWinAgent, Notification, NotificationType
from suitpay_api import SuitPayAPI
from gatebox_api import GateboxAPI, get_gatebox_client
from schemas import DepositResponse, WithdrawalResponse, DepositPixRequest, WithdrawalPixRequest, AffiliateResponse
from dependencies import get_current_user
from igamewin_api import get_igamewin_api
from datetime import datetime, timedelta, time as dt_time
import json
import uuid
import os
import base64
from io import BytesIO
try:
    import qrcode
    QRCODE_AVAILABLE = True
except ImportError:
    QRCODE_AVAILABLE = False

router = APIRouter(prefix="/api/public/payments", tags=["payments"])
webhook_router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
gold_api_router = APIRouter(tags=["igamewin-seamless"])  # Sem prefix - rota /gold_api
affiliate_router = APIRouter(prefix="/api/public/affiliate", tags=["affiliate"])


def get_active_pix_gateway(db: Session) -> Gateway:
    """Busca gateway PIX ativo (SuitPay ou Gatebox)"""
    # Prioridade: gatebox primeiro, depois pix (SuitPay)
    gateway = db.query(Gateway).filter(
        Gateway.type == "gatebox",
        Gateway.is_active == True
    ).first()
    
    if not gateway:
        gateway = db.query(Gateway).filter(
            Gateway.type == "pix",
            Gateway.is_active == True
        ).first()
    
    if not gateway:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gateway PIX não configurado ou inativo"
        )
    
    return gateway


def validate_coupon_for_deposit(db: Session, code: str, amount: float) -> tuple[Optional[int], float, Optional[str]]:
    """
    Valida cupom para um depósito. Retorna (coupon_id, bonus_amount, error_message).
    Se error_message não for None, cupom é inválido.
    """
    if not code or not code.strip():
        return None, 0.0, None
    coupon = db.query(Coupon).filter(Coupon.code == code.strip().upper(), Coupon.is_active == True).first()
    if not coupon:
        return None, 0.0, "Cupom não encontrado ou inativo."
    from datetime import datetime as dt
    now = dt.utcnow()
    if coupon.valid_from and now < coupon.valid_from:
        return None, 0.0, "Cupom ainda não está válido."
    if coupon.valid_until and now > coupon.valid_until:
        return None, 0.0, "Cupom expirado."
    if coupon.min_deposit and amount < coupon.min_deposit:
        return None, 0.0, f"Depósito mínimo para este cupom é R$ {coupon.min_deposit:.2f}".replace(".", ",")
    if coupon.max_uses and coupon.max_uses > 0 and (coupon.used_count or 0) >= coupon.max_uses:
        return None, 0.0, "Cupom já atingiu o limite de usos."
    if coupon.discount_type == CouponType.PERCENT:
        bonus = round(amount * (coupon.discount_value / 100.0), 2)
    else:
        bonus = round(float(coupon.discount_value), 2)
    if bonus <= 0:
        return None, 0.0, None
    return coupon.id, bonus, None


def get_suitpay_client(gateway: Gateway) -> SuitPayAPI:
    """Cria cliente SuitPay a partir das credenciais do gateway"""
    try:
        credentials = json.loads(gateway.credentials) if gateway.credentials else {}
        client_id = credentials.get("client_id") or credentials.get("ci")
        client_secret = credentials.get("client_secret") or credentials.get("cs")
        sandbox = credentials.get("sandbox", True)
        
        if not client_id or not client_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Credenciais do gateway não configuradas"
            )
        
        return SuitPayAPI(client_id, client_secret, sandbox=sandbox)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Credenciais do gateway inválidas"
        )


@router.get("/validate-coupon")
async def validate_coupon_public(
    code: str,
    amount: float,
    db: Session = Depends(get_db),
):
    """
    Valida cupom para um valor de depósito. Retorna se é válido e o bônus em R$.
    Não requer autenticação (para exibir bônus antes do usuário enviar o depósito).
    """
    if not code or not code.strip() or amount <= 0:
        return {"valid": False, "bonus_amount": 0, "message": "Código ou valor inválido."}
    coupon_id, bonus_amount, err = validate_coupon_for_deposit(db, code.strip(), amount)
    if err:
        return {"valid": False, "bonus_amount": 0, "message": err}
    if coupon_id is None or bonus_amount <= 0:
        return {"valid": False, "bonus_amount": 0, "message": "Cupom não aplicável a este valor."}
    return {"valid": True, "bonus_amount": round(bonus_amount, 2), "message": None}


@router.post("/deposit/pix", response_model=DepositResponse, status_code=status.HTTP_201_CREATED)
async def create_pix_deposit(
    request: DepositPixRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria depósito via PIX usando SuitPay
    Conforme documentação oficial: POST /api/v1/gateway/request-qrcode
    
    Args:
        request: Dados do depósito (amount, payer_name, payer_tax_id, payer_email, payer_phone)
    """
    # Usar usuário autenticado
    user = current_user
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")

    coupon_id: Optional[int] = None
    bonus_amount: float = 0.0
    if request.coupon_code and request.coupon_code.strip():
        cid, bonus, err = validate_coupon_for_deposit(db, request.coupon_code.strip(), request.amount)
        if err:
            raise HTTPException(status_code=400, detail=err)
        if cid is not None and bonus > 0:
            coupon_id = cid
            bonus_amount = bonus

    settings = db.query(FTDSettings).filter(FTDSettings.is_active == True).first()
    min_deposit = getattr(settings, "min_amount", 2.0) if settings else 2.0
    if request.amount < min_deposit:
        raise HTTPException(
            status_code=400,
            detail=f"Valor mínimo de depósito é R$ {min_deposit:.2f}".replace(".", ","),
        )
    
    # Dados do pagador: automático (usuário logado) ou request/SiteSettings/env
    def _get_setting(db_session, key: str, default: str = "") -> str:
        s = db_session.query(SiteSettings).filter(SiteSettings.key == key).first()
        return (s.value or "").strip() if s and s.value else default

    # Nome: request -> SiteSettings -> usuário (display_name/username)
    payer_name = (request.payer_name or "").strip() or _get_setting(db, "pix_default_name") or (user.display_name or user.username or "Cliente")
    # CPF/CNPJ: request -> SiteSettings -> env -> 00000000191 (CPF teste para todos)
    _default_cpf = "00000000191"
    payer_tax_id = (request.payer_tax_id or "").strip() or _get_setting(db, "pix_default_tax_id") or os.getenv("PIX_DEFAULT_TAX_ID") or _default_cpf
    # E-mail: request -> SiteSettings -> usuário
    payer_email = (request.payer_email or "").strip() or _get_setting(db, "pix_default_email") or (user.email or "cliente@example.com")
    # Telefone: request -> SiteSettings -> usuário
    payer_phone_raw = (request.payer_phone or "").strip() or _get_setting(db, "pix_default_phone") or (user.phone or user.username or "")
    
    # Função para formatar telefone para Gatebox (formato: +5514987654321)
    def _format_phone_for_gatebox(phone: str) -> Optional[str]:
        """Formata telefone para o formato esperado pelo Gatebox (+5514987654321)"""
        if not phone or not phone.strip():
            return None
        # Remove caracteres não numéricos e espaços
        digits = ''.join(c for c in phone.strip() if c.isdigit())
        if not digits or len(digits) < 10:
            return None
        
        # Se já começa com +55, retorna como está (mas garante formato correto)
        if phone.strip().startswith('+55') and len(digits) >= 12:
            return f"+{digits}"
        
        # Se já começa com 55 (sem +), adiciona apenas o +
        if digits.startswith('55') and len(digits) >= 12:
            return f"+{digits}"
        
        # Se começa com 0, remove o 0
        if digits.startswith('0'):
            digits = digits[1:]
        
        # Se tem 10 dígitos (DDD 2 dígitos + número 8 dígitos), adiciona código do país 55
        if len(digits) == 10:
            return f"+55{digits}"
        
        # Se tem 11 dígitos (DDD 2 dígitos + número 9 dígitos com 9), adiciona código do país 55
        if len(digits) == 11:
            return f"+55{digits}"
        
        # Se já tem 12 ou 13 dígitos (55 + DDD + número), adiciona apenas o +
        if len(digits) >= 12:
            return f"+{digits}"
        
        return None
    
    payer_phone = _format_phone_for_gatebox(payer_phone_raw) if payer_phone_raw else None
    
    # Buscar gateway PIX ativo
    gateway = get_active_pix_gateway(db)
    
    # Gerar número único da requisição
    request_number = f"DEP_{user.id}_{int(datetime.utcnow().timestamp())}"
    external_id = request_number
    
    # URL do webhook (usar variável de ambiente ou construir)
    webhook_url = os.getenv("WEBHOOK_BASE_URL", "https://api.vertixbet.site")
    
    print(f"[DEPOSIT PIX] Criando depósito de R$ {request.amount} para usuário {user.id}")
    print(f"[DEPOSIT PIX] Gateway: {gateway.type}")
    
    pix_response = None
    metadata = {}
    
    if gateway.type == "gatebox":
        # Gatebox
        gatebox = get_gatebox_client(gateway)
        if not gatebox:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao criar cliente Gatebox. Verifique as credenciais."
            )
        
        callback_url = f"{webhook_url}/api/webhooks/gatebox"
        print(f"[DEPOSIT PIX] Webhook URL: {callback_url}")
        
        # Gatebox requer telefone no formato +5514987654321 (código país + DDD + número)
        # Se não tiver telefone válido, não enviar o campo (é opcional)
        gatebox_phone = payer_phone if payer_phone and payer_phone.startswith('+') else None
        
        pix_response = await gatebox.create_pix_qrcode(
            external_id=external_id,
            amount=request.amount,
            document=payer_tax_id,
            name=payer_name,
            expire=3600,  # 1 hora
            email=payer_email,
            phone=gatebox_phone,  # Só envia se estiver formatado corretamente
            identification=f"Depósito - {user.username}",
            description=f"Depósito de R$ {request.amount:.2f}"
        )
        
        if not pix_response:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Erro ao gerar código PIX no Gatebox. {gatebox.last_error or 'Erro desconhecido'}"
            )
        
        # Gatebox retorna resposta no formato: { "statusCode": 200, "data": { "key": "...", ... } }
        # Ou pode retornar diretamente os dados em alguns casos
        gatebox_data = pix_response.get("data") if pix_response.get("data") else pix_response
        status_code = pix_response.get("statusCode")
        
        # Verificar se a resposta indica sucesso
        if status_code and status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gatebox retornou erro. Status: {status_code}, Resposta: {pix_response}"
            )
        
        # Gatebox retorna o QR Code no campo "key" dentro de "data"
        qr_code = gatebox_data.get("key") or gatebox_data.get("qrCode") or gatebox_data.get("emvqrcps") or gatebox_data.get("qrcode")
        if not qr_code:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Resposta inválida do Gatebox. QR Code não encontrado. Resposta: {pix_response}"
            )
        
        # Extrair transaction_id e identifier
        transaction_id = gatebox_data.get("transactionId") or gatebox_data.get("identifier") or gatebox_data.get("transaction_id")
        
        # Gerar QR Code em base64 a partir do código PIX (Gatebox retorna apenas o código em texto)
        qr_code_base64 = gatebox_data.get("qrCodeBase64") or gatebox_data.get("qrcodeBase64")
        if not qr_code_base64 and QRCODE_AVAILABLE and qr_code:
            try:
                # Gerar QR Code a partir do código PIX
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=10,
                    border=4,
                )
                qr.add_data(qr_code)
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")
                # Converter para base64
                buffered = BytesIO()
                img.save(buffered, format="PNG")
                qr_code_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                print(f"[DEPOSIT PIX] QR Code gerado com sucesso a partir do código PIX")
            except Exception as e:
                print(f"[DEPOSIT PIX] Erro ao gerar QR Code: {str(e)}")
                qr_code_base64 = None
        
        # Salvar identifier do Gatebox no metadata para referência
        gatebox_identifier = gatebox_data.get("identifier")
        metadata = {
            "pix_code": qr_code,
            "pix_qr_code_base64": qr_code_base64,
            "transaction_id": transaction_id,
            "identifier": gatebox_identifier,
            "external_id": external_id,  # externalId original que enviamos
            "gatebox_identifier": gatebox_identifier,  # identifier retornado pelo Gatebox
            "gatebox_response": pix_response
        }
    else:
        # SuitPay (padrão)
        suitpay = get_suitpay_client(gateway)
        due_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
        callback_url = f"{webhook_url}/api/webhooks/suitpay/pix-cashin"
        
        print(f"[DEPOSIT PIX] Webhook URL: {callback_url}")
        print(f"[DEPOSIT PIX] Request Number: {request_number}")
        
        pix_response = await suitpay.generate_pix_payment(
            request_number=request_number,
            due_date=due_date,
            amount=request.amount,
            client_name=payer_name,
            client_document=payer_tax_id,
            client_email=payer_email,
            client_phone=payer_phone or None,
            callback_url=callback_url
        )
        
        if not pix_response:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Erro ao gerar código PIX no gateway. Verifique as credenciais e se o gateway está ativo."
            )
        
        if not pix_response.get("paymentCode"):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Resposta inválida do gateway SuitPay. Campo 'paymentCode' não encontrado. Resposta: {pix_response}"
            )
        
        metadata = {
            "pix_code": pix_response.get("paymentCode"),
            "pix_qr_code_base64": pix_response.get("paymentCodeBase64"),
            "request_number": request_number,
            "suitpay_response": pix_response
        }
    
    if coupon_id is not None and bonus_amount > 0:
        metadata["coupon_id"] = coupon_id
        metadata["coupon_code"] = request.coupon_code.strip().upper()
        metadata["bonus_amount"] = bonus_amount
    
    # External ID: Gatebox retorna identifier, mas devemos usar o externalId original que enviamos
    # O webhook do Gatebox envia o externalId original (DEP_11_...), não o identifier (QR...)
    if gateway.type == "gatebox":
        # Usar o externalId original que enviamos (DEP_11_...)
        # O identifier (QR...) está salvo no metadata
        external_id_for_deposit = external_id  # Manter o externalId original (DEP_11_...)
    else:
        external_id_for_deposit = pix_response.get("idTransaction") or external_id
    deposit = Deposit(
        user_id=user.id,
        gateway_id=gateway.id,
        amount=request.amount,
        status=TransactionStatus.PENDING,
        transaction_id=str(uuid.uuid4()),
        external_id=external_id_for_deposit,
        metadata_json=json.dumps(metadata)
    )
    
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    
    print(f"[DEPOSIT PIX] Depósito criado com sucesso:")
    print(f"[DEPOSIT PIX] - ID: {deposit.id}")
    print(f"[DEPOSIT PIX] - External ID: {deposit.external_id}")
    print(f"[DEPOSIT PIX] - Status: {deposit.status}")
    print(f"[DEPOSIT PIX] - Valor: R$ {deposit.amount}")
    print(f"[DEPOSIT PIX] - Gateway: {gateway.type}")
    if gateway.type == "gatebox":
        print(f"[DEPOSIT PIX] - Aguardando webhook do Gatebox...")
    else:
        print(f"[DEPOSIT PIX] - Webhook será chamado em: {callback_url}")
        print(f"[DEPOSIT PIX] - Aguardando webhook da SuitPay...")
    
    return deposit


@router.post("/withdrawal/pix", response_model=WithdrawalResponse, status_code=status.HTTP_201_CREATED)
async def create_pix_withdrawal(
    request: WithdrawalPixRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria saque via PIX usando SuitPay
    Conforme documentação oficial: POST /api/v1/gateway/pix-payment
    
    IMPORTANTE: É necessário cadastrar o IP do servidor na SuitPay
    (GATEWAY/CHECKOUT -> GERENCIAMENTO DE IPs)
    
    Args:
        request: Dados do saque (amount, pix_key, pix_key_type, document_validation)
    """
    # Usar usuário autenticado
    user = current_user
    
    # Verificar saldo
    if user.balance < request.amount:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")
    
    settings = db.query(FTDSettings).filter(FTDSettings.is_active == True).first()
    min_withdrawal = getattr(settings, "min_withdrawal", 10.0) if settings else 10.0
    if request.amount < min_withdrawal:
        raise HTTPException(
            status_code=400,
            detail=f"Valor mínimo de saque é R$ {min_withdrawal:.2f}".replace(".", ","),
        )
    
    # Validar tipo de chave
    valid_key_types = ["document", "phoneNumber", "email", "randomKey", "paymentCode"]
    if request.pix_key_type not in valid_key_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo de chave inválido. Deve ser um dos: {', '.join(valid_key_types)}"
        )
    
    # Buscar gateway PIX ativo
    gateway = get_active_pix_gateway(db)
    
    external_id = f"WTH_{user.id}_{int(datetime.utcnow().timestamp())}"
    webhook_url = os.getenv("WEBHOOK_BASE_URL", "https://api.vertixbet.site")
    
    pix_response = None
    metadata = {}
    
    if gateway.type == "gatebox":
        # Gatebox
        gatebox = get_gatebox_client(gateway)
        if not gatebox:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao criar cliente Gatebox. Verifique as credenciais."
            )
        
        # Gatebox requer name e pode requerer documentNumber
        payer_name = request.payer_name or user.display_name or user.username or "Cliente"
        doc_validation = (request.document_validation or "").strip()
        if not doc_validation:
            doc_validation = user.cpf or ""
        
        pix_response = await gatebox.withdraw_pix(
            external_id=external_id,
            key=request.pix_key,
            name=payer_name,
            amount=request.amount,
            document_number=doc_validation if doc_validation else None,
            description=f"Saque de R$ {request.amount:.2f}"
        )
        
        if not pix_response:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Erro ao processar saque no Gatebox. {gatebox.last_error or 'Erro desconhecido'}"
            )
        
        # Gatebox retorna resposta no formato: { "statusCode": 200, "data": { "transactionId": "...", "endToEnd": "...", ... } }
        gatebox_data = pix_response.get("data") if pix_response.get("data") else pix_response
        status_code = pix_response.get("statusCode")
        
        # Verificar se a resposta indica sucesso
        if status_code and status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gatebox retornou erro no saque. Status: {status_code}, Resposta: {pix_response}"
            )
        
        metadata = {
            "external_id": external_id,
            "transaction_id": gatebox_data.get("transactionId") or gatebox_data.get("identifier"),
            "end_to_end": gatebox_data.get("endToEnd"),
            "gatebox_response": pix_response
        }
    else:
        # SuitPay (padrão)
        suitpay = get_suitpay_client(gateway)
        callback_url = f"{webhook_url}/api/webhooks/suitpay/pix-cashout"
        
        # document_validation: quando a chave é CPF/CNPJ, usar a própria chave; senão usar SiteSettings
        doc_validation = (request.document_validation or "").strip()
        if not doc_validation:
            if request.pix_key_type == "document":
                doc_validation = "".join(c for c in request.pix_key if c.isdigit())
            if not doc_validation:
                s = db.query(SiteSettings).filter(SiteSettings.key == "pix_default_tax_id").first()
                doc_validation = (s.value or "").strip() if s and s.value else ""

        pix_response = await suitpay.transfer_pix(
            key=request.pix_key,
            type_key=request.pix_key_type,
            value=request.amount,
            callback_url=callback_url,
            document_validation=doc_validation or None,
            external_id=external_id
        )
        
        if not pix_response:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Erro ao processar transferência PIX no gateway. Verifique se o IP do servidor está cadastrado na SuitPay."
            )
        
        # Verificar resposta da API SuitPay
        response_status = pix_response.get("response", "").upper()
        if response_status != "OK":
            error_messages = {
                "ACCOUNT_DOCUMENTS_NOT_VALIDATED": "Conta não validada",
                "NO_FUNDS": "Saldo insuficiente no gateway",
                "PIX_KEY_NOT_FOUND": "Chave PIX não encontrada",
                "UNAUTHORIZED_IP": "IP não autorizado. Cadastre o IP do servidor na SuitPay.",
                "DOCUMENT_VALIDATE": "A chave PIX não pertence ao documento informado",
                "DUPLICATE_EXTERNAL_ID": "External ID já foi utilizado",
                "ERROR": "Erro interno no gateway"
            }
            error_msg = error_messages.get(response_status, f"Erro: {response_status}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        metadata = {
            "pix_key": request.pix_key,
            "pix_key_type": request.pix_key_type,
            "document_validation": request.document_validation,
            "external_id": external_id,
            "suitpay_response": pix_response
        }
    
    # External ID para withdrawal: Gatebox usa identifier/transactionId dentro de data, SuitPay usa idTransaction ou external_id
    if gateway.type == "gatebox":
        gatebox_data = pix_response.get("data") if pix_response.get("data") else pix_response
        external_id_for_withdrawal = gatebox_data.get("identifier") or gatebox_data.get("transactionId") or gatebox_data.get("externalId") or external_id
    else:
        external_id_for_withdrawal = pix_response.get("idTransaction") or external_id
    
    # Criar registro de saque
    withdrawal = Withdrawal(
        user_id=user.id,
        gateway_id=gateway.id,
        amount=request.amount,
        status=TransactionStatus.PENDING,
        transaction_id=str(uuid.uuid4()),
        external_id=external_id_for_withdrawal,
        metadata_json=json.dumps(metadata)
    )
    
    # Bloquear saldo do usuário
    user.balance -= request.amount
    
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    
    return withdrawal


# ========== WEBHOOKS ==========

@webhook_router.get("/suitpay/pix-cashin")
async def test_webhook_pix_cashin():
    """Endpoint GET para testar se o webhook está acessível"""
    return {
        "status": "ok",
        "message": "Webhook endpoint está acessível",
        "endpoint": "/api/webhooks/suitpay/pix-cashin",
        "method": "POST",
        "timestamp": datetime.utcnow().isoformat()
    }

@webhook_router.post("/suitpay/pix-cashin")
async def webhook_pix_cashin(request: Request, db: Session = Depends(get_db)):
    """
    Webhook para receber notificações de PIX Cash-in (depósitos) da SuitPay
    """
    # Log inicial para capturar qualquer tentativa de chamada
    print("=" * 80)
    print(f"[WEBHOOK PIX-CASHIN] Requisição recebida em {datetime.utcnow().isoformat()}")
    print(f"[WEBHOOK PIX-CASHIN] IP do cliente: {request.client.host if request.client else 'unknown'}")
    print(f"[WEBHOOK PIX-CASHIN] Headers: {dict(request.headers)}")
    
    try:
        # Ler dados do webhook
        data = await request.json()
        print(f"[WEBHOOK PIX-CASHIN] Dados recebidos: {json.dumps(data, indent=2, default=str)}")
        
        # Buscar gateway PIX ativo para validar hash
        gateway = get_active_pix_gateway(db)
        credentials = json.loads(gateway.credentials) if gateway.credentials else {}
        client_secret = credentials.get("client_secret") or credentials.get("cs")
        sandbox = credentials.get("sandbox", False)
        
        if not client_secret:
            raise HTTPException(status_code=500, detail="Credenciais do gateway não configuradas")
        
        # Validar hash (opcional se não estiver presente, mas validar se presente)
        received_hash = data.get("hash")
        if received_hash:
            # Hash presente: validar obrigatoriamente
            if not SuitPayAPI.validate_webhook_hash(data.copy(), client_secret):
                print(f"Hash inválido no webhook: {received_hash}")
                raise HTTPException(status_code=401, detail="Hash inválido")
            print(f"Hash validado com sucesso: {received_hash[:20]}...")
        else:
            # Hash não presente: permitir apenas em sandbox ou registrar aviso
            if not sandbox:
                print(f"AVISO: Webhook recebido sem hash em ambiente de produção!")
                print(f"IP do cliente: {request.client.host if request.client else 'unknown'}")
                print(f"Headers: {dict(request.headers)}")
                # Em produção, ainda permitir mas registrar aviso crítico
            else:
                print(f"Webhook recebido sem hash (ambiente sandbox - permitido)")
        
        # Processar webhook conforme documentação oficial SuitPay
        # Campos esperados: idTransaction, typeTransaction, statusTransaction, 
        # value, payerName, payerTaxId, paymentDate, paymentCode, requestNumber, hash
        id_transaction = data.get("idTransaction")
        status_transaction = data.get("statusTransaction")
        type_transaction = data.get("typeTransaction")  # Deve ser "PIX"
        value = data.get("value")
        request_number = data.get("requestNumber")
        payment_date = data.get("paymentDate")  # Formato: dd/MM/yyyy HH:mm:ss
        payment_code = data.get("paymentCode")
        
        # Buscar depósito pelo external_id ou request_number
        deposit = None
        
        print(f"Buscando depósito - idTransaction: {id_transaction}, requestNumber: {request_number}")
        
        # Tentar buscar pelo external_id primeiro
        if id_transaction:
            deposit = db.query(Deposit).filter(Deposit.external_id == id_transaction).first()
            if deposit:
                print(f"Depósito encontrado por external_id: {deposit.id}, status: {deposit.status}")
        
        # Se não encontrou, tentar pelo request_number no metadata
        if not deposit and request_number:
            print(f"Buscando depósito por request_number: {request_number}")
            deposits = db.query(Deposit).filter(
                Deposit.status == TransactionStatus.PENDING
            ).all()
            print(f"Encontrados {len(deposits)} depósitos pendentes")
            for d in deposits:
                metadata = json.loads(d.metadata_json) if d.metadata_json else {}
                stored_request_number = metadata.get("request_number")
                print(f"Depósito {d.id}: request_number no metadata = {stored_request_number}")
                if stored_request_number == request_number:
                    deposit = d
                    print(f"Depósito encontrado por request_number: {deposit.id}")
                    break
        
        # Se ainda não encontrou, tentar buscar por qualquer depósito pendente com valor correspondente criado nas últimas 24 horas
        if not deposit and value:
            print(f"Tentando buscar por valor: {value}")
            from datetime import timedelta
            # Buscar depósitos pendentes criados nas últimas 24 horas
            time_threshold = datetime.utcnow() - timedelta(hours=24)
            all_pending = db.query(Deposit).filter(
                Deposit.status == TransactionStatus.PENDING,
                Deposit.created_at >= time_threshold
            ).order_by(Deposit.created_at.desc()).all()
            
            print(f"Encontrados {len(all_pending)} depósitos pendentes nas últimas 24h")
            for d in all_pending:
                # Comparar valores com tolerância de 0.01 para diferenças de arredondamento
                if abs(float(d.amount) - float(value)) < 0.01:
                    deposit = d
                    print(f"Depósito encontrado por valor e data: {deposit.id}, valor: {deposit.amount}, criado em: {deposit.created_at}")
                    break
        
        if not deposit:
            print(f"ERRO: Depósito não encontrado para transação: {id_transaction} ou request: {request_number} ou valor: {value}")
            print(f"Dados completos do webhook: {json.dumps(data, indent=2)}")
            return {"status": "ok", "message": "Depósito não encontrado"}
        
        # Atualizar external_id se o webhook trouxer um idTransaction diferente
        if id_transaction and deposit.external_id != id_transaction:
            print(f"Atualizando external_id do depósito {deposit.id}: {deposit.external_id} -> {id_transaction}")
            deposit.external_id = id_transaction
        
        # Atualizar status do depósito
        # Conforme documentação SuitPay: para PIX Cash-in, o status de sucesso é "PAID_OUT"
        # CHARGEBACK é para estorno
        # Normalizar status para maiúsculas para comparação
        status_transaction_upper = str(status_transaction).upper().strip() if status_transaction else ""
        # Para PIX Cash-in (depósitos), o status de sucesso é PAID_OUT conforme documentação oficial
        success_statuses = ["PAID_OUT", "PAID", "COMPLETED", "SUCCESS", "DONE", "CONFIRMED", "APPROVED"]
        
        print(f"Status da transação recebido (original): {status_transaction}")
        print(f"Status da transação normalizado: {status_transaction_upper}")
        print(f"Status atual do depósito: {deposit.status}")
        print(f"Valor do depósito: {deposit.amount}, Valor do webhook: {value}")
        print(f"Todos os dados do webhook: {json.dumps(data, indent=2, default=str)}")
        
        if status_transaction_upper in success_statuses:
            print(f"Status de sucesso detectado: {status_transaction_upper}")
            if deposit.status != TransactionStatus.APPROVED:
                print(f"Aprovando depósito {deposit.id}")
                saldo_anterior = None
                user = db.query(User).filter(User.id == deposit.user_id).first()
                bonus_to_credit = 0.0
                dep_meta = json.loads(deposit.metadata_json) if deposit.metadata_json else {}
                if dep_meta.get("coupon_id") and dep_meta.get("bonus_amount"):
                    bonus_to_credit = float(dep_meta["bonus_amount"])
                    coupon = db.query(Coupon).filter(Coupon.id == dep_meta["coupon_id"]).first()
                    if coupon:
                        coupon.used_count = (coupon.used_count or 0) + 1
                # Bônus FTD (1º depósito) e Reload (depósitos após o 1º)
                is_first_deposit = db.query(FTD).filter(FTD.user_id == deposit.user_id).first() is None
                ftd_bonus = 0.0
                reload_bonus = 0.0
                ftd_settings = db.query(FTDSettings).filter(FTDSettings.is_active == True).first()
                if user and is_first_deposit:
                    ftd_pct = getattr(ftd_settings, "ftd_bonus_percentage", 0.0) or 0.0
                    if ftd_pct > 0:
                        ftd_bonus = round(deposit.amount * (ftd_pct / 100.0), 2)
                        bonus_to_credit += ftd_bonus
                        print(f"[FTD] Bônus {ftd_pct}% no 1º depósito: R$ {ftd_bonus}")
                    # Criar registro FTD
                    pass_rate = getattr(ftd_settings, "pass_rate", 0.0) if ftd_settings else 0.0
                    ftd = FTD(
                        user_id=deposit.user_id,
                        deposit_id=deposit.id,
                        amount=deposit.amount,
                        is_first_deposit=True,
                        pass_rate=pass_rate,
                        status=TransactionStatus.APPROVED
                    )
                    db.add(ftd)
                elif user and ftd_settings:
                    # Reload: bônus em depósitos após o 1º
                    reload_pct = getattr(ftd_settings, "reload_bonus_percentage", 0.0) or 0.0
                    reload_min = getattr(ftd_settings, "reload_bonus_min_deposit", 0.0) or 0.0
                    if reload_pct > 0 and deposit.amount >= reload_min:
                        reload_bonus = round(deposit.amount * (reload_pct / 100.0), 2)
                        bonus_to_credit += reload_bonus
                        print(f"[RELOAD] Bônus {reload_pct}% no depósito: R$ {reload_bonus}")
                if user:
                    saldo_anterior = user.balance
                    bonus_bal = getattr(user, "bonus_balance", 0.0) or 0.0
                    user.balance += deposit.amount  # Apenas valor real (sacável)
                    user.bonus_balance = bonus_bal + bonus_to_credit  # Bônus: FTD/cupom/reload (não sacável)
                    print(f"Saldo: {saldo_anterior} + {deposit.amount} = {user.balance} | Bônus: {bonus_bal} + {bonus_to_credit} = {user.bonus_balance}")
                else:
                    print(f"ERRO: Usuário {deposit.user_id} não encontrado!")
                # Guardar total de bônus creditado (cupom + FTD) para possível chargeback
                dep_meta["total_bonus_credited"] = bonus_to_credit
                deposit.metadata_json = json.dumps(dep_meta)
                # Afiliado: CPA no FTD + revshare em todo depósito
                if user and user.referred_by_affiliate_id:
                    aff = db.query(Affiliate).filter(Affiliate.id == user.referred_by_affiliate_id).first()
                    if aff and aff.is_active:
                        aff_user = db.query(User).filter(User.id == aff.user_id).first()
                        if aff_user:
                            cpa_to_credit = 0.0
                            revshare_to_credit = 0.0
                            if is_first_deposit and (aff.cpa_amount or 0) > 0:
                                cpa_to_credit = float(aff.cpa_amount)
                                aff.total_cpa_earned = (aff.total_cpa_earned or 0) + cpa_to_credit
                                print(f"[AFFILIATE] CPA R$ {cpa_to_credit} para afiliado {aff.affiliate_code}")
                            if (aff.revshare_percentage or 0) > 0:
                                revshare_to_credit = round(deposit.amount * (aff.revshare_percentage / 100.0), 2)
                                aff.total_revshare_earned = (aff.total_revshare_earned or 0) + revshare_to_credit
                                print(f"[AFFILIATE] Revshare {aff.revshare_percentage}% = R$ {revshare_to_credit} para afiliado {aff.affiliate_code}")
                            total_aff = cpa_to_credit + revshare_to_credit
                            if total_aff > 0:
                                aff.total_earnings = (aff.total_earnings or 0) + total_aff
                                aff.total_deposits = (aff.total_deposits or 0) + deposit.amount
                                aff_user.balance = (aff_user.balance or 0) + total_aff
                                print(f"[AFFILIATE] Total creditado: R$ {total_aff} (saldo afiliado: {aff_user.balance})")
                deposit.status = TransactionStatus.APPROVED
                
                # Criar notificação de confirmação de depósito
                if user:
                    bonus_text = ""
                    if bonus_to_credit > 0:
                        bonus_text = f" Você também recebeu R$ {bonus_to_credit:.2f} de bônus!".replace(".", ",")
                    
                    notification = Notification(
                        title="Depósito Confirmado! 🎉",
                        message=f"Seu depósito de R$ {deposit.amount:.2f} foi confirmado com sucesso.{bonus_text}".replace(".", ","),
                        type=NotificationType.SUCCESS,
                        user_id=user.id,
                        is_read=False,
                        is_active=True,
                        link="/depositar"
                    )
                    db.add(notification)
                    print(f"[WEBHOOK SUITPAY] Notificação de confirmação criada para usuário {user.id}")
                
                print(f"Depósito {deposit.id} aprovado com sucesso")
            else:
                print(f"Depósito {deposit.id} já estava aprovado, ignorando webhook duplicado")
        elif status_transaction_upper == "CHARGEBACK":
            print(f"CHARGEBACK detectado para depósito {deposit.id}")
            if deposit.status == TransactionStatus.APPROVED:
                dep_meta = json.loads(deposit.metadata_json) if deposit.metadata_json else {}
                bonus_to_revert = float(dep_meta.get("total_bonus_credited") or dep_meta.get("bonus_amount") or 0)
                user = db.query(User).filter(User.id == deposit.user_id).first()
                if user:
                    if user.balance >= deposit.amount:
                        user.balance -= deposit.amount
                    if (getattr(user, "bonus_balance", 0) or 0) >= bonus_to_revert:
                        user.bonus_balance = max(0, (getattr(user, "bonus_balance", 0) or 0) - bonus_to_revert)
                    print(f"Chargeback: saldo={user.balance}, bonus={getattr(user, 'bonus_balance', 0)}")
                if dep_meta.get("coupon_id"):
                    coupon = db.query(Coupon).filter(Coupon.id == dep_meta["coupon_id"]).first()
                    if coupon and (coupon.used_count or 0) > 0:
                        coupon.used_count -= 1
                # Reverter créditos de afiliado (CPA e revshare) se houver
                if user and user.referred_by_affiliate_id:
                    aff = db.query(Affiliate).filter(Affiliate.id == user.referred_by_affiliate_id).first()
                    if aff:
                        aff_user = db.query(User).filter(User.id == aff.user_id).first()
                        if aff_user:
                            ftd = db.query(FTD).filter(FTD.deposit_id == deposit.id).first()
                            revshare = round(deposit.amount * (aff.revshare_percentage / 100.0), 2) if (aff.revshare_percentage or 0) > 0 else 0.0
                            cpa = float(aff.cpa_amount) if ftd and (aff.cpa_amount or 0) > 0 else 0.0
                            to_revert_aff = cpa + revshare
                            if to_revert_aff > 0 and (aff_user.balance or 0) >= to_revert_aff:
                                aff_user.balance -= to_revert_aff
                                aff.total_earnings = max(0, (aff.total_earnings or 0) - to_revert_aff)
                                if cpa > 0:
                                    aff.total_cpa_earned = max(0, (aff.total_cpa_earned or 0) - cpa)
                                if revshare > 0:
                                    aff.total_revshare_earned = max(0, (aff.total_revshare_earned or 0) - revshare)
                                aff.total_deposits = max(0, (aff.total_deposits or 0) - deposit.amount)
                                print(f"[AFFILIATE] Revertido R$ {to_revert_aff} do afiliado (chargeback)")
            deposit.status = TransactionStatus.CANCELLED
        else:
            print(f"Status desconhecido ou não processado: {status_transaction}")
        
        # Atualizar metadata
        metadata = json.loads(deposit.metadata_json) if deposit.metadata_json else {}
        metadata["webhook_data"] = data
        metadata["webhook_received_at"] = datetime.utcnow().isoformat()
        metadata["status_transaction"] = status_transaction
        deposit.metadata_json = json.dumps(metadata)
        
        print(f"Fazendo commit das alterações...")
        try:
            db.commit()
            print(f"Commit realizado com sucesso")
            
            # Refresh dos objetos para garantir que estão atualizados
            db.refresh(deposit)
            if 'user' in locals() and user:
                db.refresh(user)
                print(f"Saldo final do usuário após commit: {user.balance}")
        except Exception as commit_error:
            print(f"ERRO ao fazer commit: {str(commit_error)}")
            db.rollback()
            raise
        
        return {"status": "ok", "message": "Webhook processado com sucesso"}
    
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"[WEBHOOK PIX-CASHIN] ERRO ao processar webhook: {str(e)}")
        print(f"[WEBHOOK PIX-CASHIN] Traceback completo:\n{error_traceback}")
        print("=" * 80)
        raise HTTPException(status_code=500, detail=f"Erro ao processar webhook: {str(e)}")


@webhook_router.post("/suitpay/pix-cashout")
async def webhook_pix_cashout(request: Request, db: Session = Depends(get_db)):
    """
    Webhook para receber notificações de PIX Cash-out (saques) da SuitPay
    """
    try:
        data = await request.json()
        
        # Buscar gateway PIX ativo para validar hash
        gateway = get_active_pix_gateway(db)
        credentials = json.loads(gateway.credentials) if gateway.credentials else {}
        client_secret = credentials.get("client_secret") or credentials.get("cs")
        
        if not client_secret:
            raise HTTPException(status_code=500, detail="Credenciais do gateway não configuradas")
        
        # Validar hash
        if not SuitPayAPI.validate_webhook_hash(data.copy(), client_secret):
            raise HTTPException(status_code=401, detail="Hash inválido")
        
        # Processar webhook
        id_transaction = data.get("idTransaction")
        status_transaction = data.get("statusTransaction")
        
        # Buscar saque pelo external_id
        withdrawal = None
        if id_transaction:
            withdrawal = db.query(Withdrawal).filter(Withdrawal.external_id == id_transaction).first()
        
        if not withdrawal:
            return {"status": "ok", "message": "Saque não encontrado"}
        
        # Atualizar status do saque
        if status_transaction == "PAID_OUT":
            withdrawal.status = TransactionStatus.APPROVED
        elif status_transaction == "CANCELED":
            # Reverter saldo se foi cancelado
            if withdrawal.status == TransactionStatus.PENDING:
                user = db.query(User).filter(User.id == withdrawal.user_id).first()
                if user:
                    user.balance += withdrawal.amount
            withdrawal.status = TransactionStatus.CANCELLED
        
        # Atualizar metadata
        metadata = json.loads(withdrawal.metadata_json) if withdrawal.metadata_json else {}
        metadata["webhook_data"] = data
        metadata["webhook_received_at"] = datetime.utcnow().isoformat()
        withdrawal.metadata_json = json.dumps(metadata)
        
        db.commit()

        return {"status": "ok", "message": "Webhook processado com sucesso"}
    
    except Exception as e:
        print(f"Erro ao processar webhook PIX Cash-out: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar webhook: {str(e)}")


# ========== GATEBOX WEBHOOKS ==========
@webhook_router.get("/gatebox")
async def webhook_gatebox_info():
    """Informações sobre os webhooks do Gatebox"""
    webhook_url = os.getenv("WEBHOOK_BASE_URL", "https://api.vertixbet.site")
    return {
        "status": "ok",
        "message": "Webhook endpoint está acessível",
        "endpoint": f"{webhook_url}/api/webhooks/gatebox",
        "method": "POST",
        "supported_types": [
            "PIX_PAY_IN",      # Depósito PIX
            "PIX_PAY_OUT",     # Saque PIX
            "PIX_REVERSAL",    # Estorno de depósito
            "PIX_REVERSAL_OUT", # Estorno de saque
            "PIX_REFUND"       # Reembolso
        ],
        "timestamp": datetime.utcnow().isoformat()
    }

@webhook_router.post("/gatebox")
async def webhook_gatebox(request: Request, db: Session = Depends(get_db)):
    """
    Webhook unificado para receber notificações do Gatebox
    Suporta: PIX_PAY_IN, PIX_PAY_OUT, PIX_REVERSAL, PIX_REVERSAL_OUT, PIX_REFUND
    """
    try:
        data = await request.json()
        print(f"[WEBHOOK GATEBOX] Dados recebidos: {json.dumps(data, indent=2)}")
        
        # Buscar gateway Gatebox ativo
        gateway = db.query(Gateway).filter(
            Gateway.type == "gatebox",
            Gateway.is_active == True
        ).first()
        
        if not gateway:
            return {"status": "ok", "message": "Gateway Gatebox não encontrado"}
        
        # Gatebox pode enviar dados diretamente ou dentro de um objeto
        webhook_data = data.get("data") if data.get("data") else data
        
        # Identificar tipo de webhook - Gatebox usa "event" no nível raiz
        webhook_type = data.get("event") or webhook_data.get("event") or webhook_data.get("type") or data.get("type") or ""
        
        # External ID pode estar em invoice.externalId ou transaction.externalId
        invoice_data = data.get("invoice") or {}
        transaction_data = data.get("transaction") or {}
        external_id = (
            transaction_data.get("externalId") or 
            invoice_data.get("externalId") or 
            webhook_data.get("externalId") or 
            webhook_data.get("external_id") or 
            data.get("externalId")
        )
        
        transaction_id = (
            transaction_data.get("transactionId") or 
            webhook_data.get("transactionId") or 
            webhook_data.get("transaction_id") or 
            data.get("transactionId")
        )
        
        identifier = webhook_data.get("identifier") or data.get("identifier")
        status_val = data.get("status") or webhook_data.get("status") or webhook_data.get("statusTransaction")
        amount = transaction_data.get("amount") or webhook_data.get("amount") or webhook_data.get("value") or data.get("amount")
        
        print(f"[WEBHOOK GATEBOX] Event: {webhook_type}, External ID: {external_id}, Status: {status_val}, Amount: {amount}")
        
        # Processar conforme o tipo
        if webhook_type == "PIX_PAY_IN":
            # Depósito PIX
            return await _process_gatebox_deposit(db, external_id, transaction_id, identifier, status_val, amount, data)
        elif webhook_type == "PIX_PAY_OUT":
            # Saque PIX
            return await _process_gatebox_withdrawal(db, external_id, transaction_id, identifier, status_val, data)
        elif webhook_type == "PIX_REVERSAL":
            # Estorno de depósito (chargeback)
            return await _process_gatebox_reversal(db, external_id, transaction_id, identifier, status_val, amount, data)
        elif webhook_type == "PIX_REVERSAL_OUT":
            # Estorno de saque
            return await _process_gatebox_reversal_out(db, external_id, transaction_id, identifier, status_val, data)
        elif webhook_type == "PIX_REFUND":
            # Reembolso
            return await _process_gatebox_refund(db, external_id, transaction_id, identifier, status_val, data)
        else:
            # Tentar identificar automaticamente pelo external_id se não tiver event
            if external_id:
                if external_id.startswith("DEP_"):
                    return await _process_gatebox_deposit(db, external_id, transaction_id, identifier, status_val, amount, data)
                elif external_id.startswith("WTH_"):
                    return await _process_gatebox_withdrawal(db, external_id, transaction_id, identifier, status_val, data)
            
            print(f"[WEBHOOK GATEBOX] Tipo não reconhecido: {webhook_type}, event: {data.get('event')}, dados: {data}")
            return {"status": "ok", "message": f"Tipo de webhook não reconhecido: {webhook_type}"}
    
    except Exception as e:
        print(f"[WEBHOOK GATEBOX] Erro: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


async def _process_gatebox_deposit(db: Session, external_id: str, transaction_id: str, identifier: str, status_val: str, amount: float, data: dict):
    """Processa webhook de depósito PIX do Gatebox"""
    # Buscar depósito pelo externalId original (DEP_11_...)
    deposit = None
    if external_id:
        deposit = db.query(Deposit).filter(Deposit.external_id == external_id).first()
    
    # Se não encontrou, tentar buscar pelo identifier (QR...) que pode estar no metadata
    if not deposit and identifier:
        # Buscar depósitos pendentes recentes e verificar metadata
        from datetime import timedelta
        time_threshold = datetime.utcnow() - timedelta(hours=24)
        pending_deposits = db.query(Deposit).filter(
            Deposit.status == TransactionStatus.PENDING,
            Deposit.created_at >= time_threshold
        ).all()
        for d in pending_deposits:
            try:
                meta = json.loads(d.metadata_json) if d.metadata_json else {}
                gatebox_resp = meta.get("gatebox_response", {})
                gatebox_data = gatebox_resp.get("data") if gatebox_resp.get("data") else gatebox_resp
                if gatebox_data.get("identifier") == identifier or gatebox_data.get("identifier") == identifier:
                    deposit = d
                    print(f"[WEBHOOK GATEBOX] Depósito encontrado por identifier no metadata: {d.id}")
                    break
            except:
                pass
    
    if not deposit and transaction_id:
        deposit = db.query(Deposit).filter(Deposit.external_id == transaction_id).first()
    
    if not deposit:
        print(f"[WEBHOOK GATEBOX] Depósito não encontrado - External ID: {external_id}, Identifier: {identifier}, Transaction ID: {transaction_id}")
        return {"status": "ok", "message": "Depósito não encontrado"}
    
    # Atualizar status
    status_upper = str(status_val).upper() if status_val else ""
    if status_upper in ["PAID", "COMPLETED", "SUCCESS", "CONFIRMED", "APPROVED", "CREATED"]:
        if deposit.status != TransactionStatus.APPROVED:
            # Mesma lógica do SuitPay para aprovar depósito
            user = db.query(User).filter(User.id == deposit.user_id).first()
            bonus_to_credit = 0.0
            dep_meta = json.loads(deposit.metadata_json) if deposit.metadata_json else {}
            if dep_meta.get("coupon_id") and dep_meta.get("bonus_amount"):
                bonus_to_credit = float(dep_meta["bonus_amount"])
                coupon = db.query(Coupon).filter(Coupon.id == dep_meta["coupon_id"]).first()
                if coupon:
                    coupon.used_count = (coupon.used_count or 0) + 1
            is_first_deposit = db.query(FTD).filter(FTD.user_id == deposit.user_id).first() is None
            ftd_bonus = 0.0
            reload_bonus = 0.0
            ftd_settings = db.query(FTDSettings).filter(FTDSettings.is_active == True).first()
            if user and is_first_deposit:
                ftd_pct = getattr(ftd_settings, "ftd_bonus_percentage", 0.0) or 0.0
                if ftd_pct > 0:
                    ftd_bonus = round(deposit.amount * (ftd_pct / 100.0), 2)
                    bonus_to_credit += ftd_bonus
                pass_rate = getattr(ftd_settings, "pass_rate", 0.0) if ftd_settings else 0.0
                ftd = FTD(
                    user_id=deposit.user_id,
                    deposit_id=deposit.id,
                    amount=deposit.amount,
                    is_first_deposit=True,
                    pass_rate=pass_rate,
                    status=TransactionStatus.APPROVED
                )
                db.add(ftd)
            elif user and ftd_settings:
                reload_pct = getattr(ftd_settings, "reload_bonus_percentage", 0.0) or 0.0
                reload_min = getattr(ftd_settings, "reload_bonus_min_deposit", 0.0) or 0.0
                if reload_pct > 0 and deposit.amount >= reload_min:
                    reload_bonus = round(deposit.amount * (reload_pct / 100.0), 2)
                    bonus_to_credit += reload_bonus
            if user:
                bonus_bal = getattr(user, "bonus_balance", 0.0) or 0.0
                user.balance += deposit.amount
                user.bonus_balance = bonus_bal + bonus_to_credit
                dep_meta["total_bonus_credited"] = bonus_to_credit
                deposit.metadata_json = json.dumps(dep_meta)
                if user.referred_by_affiliate_id:
                    aff = db.query(Affiliate).filter(Affiliate.id == user.referred_by_affiliate_id).first()
                    if aff and aff.is_active:
                        aff_user = db.query(User).filter(User.id == aff.user_id).first()
                        if aff_user:
                            if is_first_deposit and (aff.cpa_amount or 0) > 0:
                                cpa_to_credit = float(aff.cpa_amount)
                                aff.total_cpa_earned = (aff.total_cpa_earned or 0) + cpa_to_credit
                            if (aff.revshare_percentage or 0) > 0:
                                revshare_to_credit = round(deposit.amount * (aff.revshare_percentage / 100.0), 2)
                                aff.total_revshare_earned = (aff.total_revshare_earned or 0) + revshare_to_credit
                                aff_user.balance = (aff_user.balance or 0) + revshare_to_credit
            deposit.status = TransactionStatus.APPROVED
            
            # Criar notificação de confirmação de depósito
            if user:
                bonus_text = ""
                if bonus_to_credit > 0:
                    bonus_text = f" Você também recebeu R$ {bonus_to_credit:.2f} de bônus!".replace(".", ",")
                
                notification = Notification(
                    title="Depósito Confirmado! 🎉",
                    message=f"Seu depósito de R$ {deposit.amount:.2f} foi confirmado com sucesso.{bonus_text}".replace(".", ","),
                    type=NotificationType.SUCCESS,
                    user_id=user.id,
                    is_read=False,
                    is_active=True,
                    link="/depositar"
                )
                db.add(notification)
                print(f"[WEBHOOK GATEBOX] Notificação de confirmação criada para usuário {user.id}")
            
            db.commit()
    
    return {"status": "ok", "message": "Depósito processado"}


async def _process_gatebox_withdrawal(db: Session, external_id: str, transaction_id: str, identifier: str, status_val: str, data: dict):
    """Processa webhook de saque PIX do Gatebox"""
    withdrawal = None
    if external_id:
        withdrawal = db.query(Withdrawal).filter(Withdrawal.external_id == external_id).first()
    if not withdrawal and identifier:
        withdrawal = db.query(Withdrawal).filter(Withdrawal.external_id == identifier).first()
    if not withdrawal and transaction_id:
        withdrawal = db.query(Withdrawal).filter(Withdrawal.external_id == transaction_id).first()
    
    if not withdrawal:
        return {"status": "ok", "message": "Saque não encontrado"}
    
    status_upper = str(status_val).upper() if status_val else ""
    if status_upper in ["PAID", "COMPLETED", "SUCCESS", "CONFIRMED", "APPROVED"]:
        withdrawal.status = TransactionStatus.APPROVED
    elif status_upper in ["CANCELED", "CANCELLED", "FAILED", "ERROR"]:
        if withdrawal.status == TransactionStatus.PENDING:
            user = db.query(User).filter(User.id == withdrawal.user_id).first()
            if user:
                user.balance += withdrawal.amount
        withdrawal.status = TransactionStatus.CANCELLED
    
    metadata = json.loads(withdrawal.metadata_json) if withdrawal.metadata_json else {}
    metadata["webhook_data"] = data
    metadata["webhook_received_at"] = datetime.utcnow().isoformat()
    withdrawal.metadata_json = json.dumps(metadata)
    
    db.commit()
    return {"status": "ok", "message": "Saque processado"}


async def _process_gatebox_reversal(db: Session, external_id: str, transaction_id: str, identifier: str, status_val: str, amount: float, data: dict):
    """Processa estorno de depósito (chargeback) do Gatebox"""
    deposit = None
    if external_id:
        deposit = db.query(Deposit).filter(Deposit.external_id == external_id).first()
    if not deposit and identifier:
        deposit = db.query(Deposit).filter(Deposit.external_id == identifier).first()
    if not deposit and transaction_id:
        deposit = db.query(Deposit).filter(Deposit.external_id == transaction_id).first()
    
    if not deposit:
        return {"status": "ok", "message": "Depósito não encontrado para estorno"}
    
    # Reverter depósito (mesma lógica do SuitPay chargeback)
    if deposit.status == TransactionStatus.APPROVED:
        user = db.query(User).filter(User.id == deposit.user_id).first()
        if user:
            # Reverter saldo real
            if user.balance >= deposit.amount:
                user.balance -= deposit.amount
            # Reverter bônus
            dep_meta = json.loads(deposit.metadata_json) if deposit.metadata_json else {}
            total_bonus = dep_meta.get("total_bonus_credited", 0.0)
            if total_bonus > 0 and (user.bonus_balance or 0) >= total_bonus:
                user.bonus_balance = (user.bonus_balance or 0) - total_bonus
            # Reverter cupom
            if dep_meta.get("coupon_id"):
                coupon = db.query(Coupon).filter(Coupon.id == dep_meta["coupon_id"]).first()
                if coupon:
                    coupon.used_count = max(0, (coupon.used_count or 0) - 1)
            # Reverter afiliado
            if user.referred_by_affiliate_id:
                aff = db.query(Affiliate).filter(Affiliate.id == user.referred_by_affiliate_id).first()
                if aff:
                    aff_user = db.query(User).filter(User.id == aff.user_id).first()
                    ftd = db.query(FTD).filter(FTD.deposit_id == deposit.id).first()
                    revshare = round(deposit.amount * (aff.revshare_percentage / 100.0), 2) if (aff.revshare_percentage or 0) > 0 else 0.0
                    cpa = float(aff.cpa_amount) if ftd and (aff.cpa_amount or 0) > 0 else 0.0
                    to_revert_aff = cpa + revshare
                    if to_revert_aff > 0 and aff_user and (aff_user.balance or 0) >= to_revert_aff:
                        aff_user.balance -= to_revert_aff
                        aff.total_cpa_earned = max(0, (aff.total_cpa_earned or 0) - cpa)
                        aff.total_revshare_earned = max(0, (aff.total_revshare_earned or 0) - revshare)
        deposit.status = TransactionStatus.CANCELLED
    
    metadata = json.loads(deposit.metadata_json) if deposit.metadata_json else {}
    metadata["reversal_data"] = data
    metadata["reversal_received_at"] = datetime.utcnow().isoformat()
    deposit.metadata_json = json.dumps(metadata)
    
    db.commit()
    return {"status": "ok", "message": "Estorno de depósito processado"}


async def _process_gatebox_reversal_out(db: Session, external_id: str, transaction_id: str, identifier: str, status_val: str, data: dict):
    """Processa estorno de saque do Gatebox"""
    withdrawal = None
    if external_id:
        withdrawal = db.query(Withdrawal).filter(Withdrawal.external_id == external_id).first()
    if not withdrawal and identifier:
        withdrawal = db.query(Withdrawal).filter(Withdrawal.external_id == identifier).first()
    if not withdrawal and transaction_id:
        withdrawal = db.query(Withdrawal).filter(Withdrawal.external_id == transaction_id).first()
    
    if not withdrawal:
        return {"status": "ok", "message": "Saque não encontrado para estorno"}
    
    # Se o saque foi aprovado, reverter (devolver saldo ao usuário)
    if withdrawal.status == TransactionStatus.APPROVED:
        user = db.query(User).filter(User.id == withdrawal.user_id).first()
        if user:
            user.balance += withdrawal.amount
        withdrawal.status = TransactionStatus.CANCELLED
    
    metadata = json.loads(withdrawal.metadata_json) if withdrawal.metadata_json else {}
    metadata["reversal_out_data"] = data
    metadata["reversal_out_received_at"] = datetime.utcnow().isoformat()
    withdrawal.metadata_json = json.dumps(metadata)
    
    db.commit()
    return {"status": "ok", "message": "Estorno de saque processado"}


async def _process_gatebox_refund(db: Session, external_id: str, transaction_id: str, identifier: str, status_val: str, data: dict):
    """Processa reembolso do Gatebox"""
    # Reembolso pode ser de depósito ou saque - tentar ambos
    deposit = None
    withdrawal = None
    
    if external_id:
        deposit = db.query(Deposit).filter(Deposit.external_id == external_id).first()
        withdrawal = db.query(Withdrawal).filter(Withdrawal.external_id == external_id).first()
    
    if deposit:
        # Reembolso de depósito - tratar como estorno
        return await _process_gatebox_reversal(db, external_id, transaction_id, identifier, status_val, deposit.amount, data)
    elif withdrawal:
        # Reembolso de saque - tratar como estorno de saque
        return await _process_gatebox_reversal_out(db, external_id, transaction_id, identifier, status_val, data)
    else:
        return {"status": "ok", "message": "Transação não encontrada para reembolso"}


@webhook_router.post("/gatebox/pix-cashin")
async def webhook_gatebox_cashin(request: Request, db: Session = Depends(get_db)):
    """
    Webhook legado para PIX Cash-in - redireciona para webhook unificado
    Mantido para compatibilidade
    """
    # Adicionar tipo ao payload e redirecionar para webhook unificado
    from fastapi import Request as FastAPIRequest
    data = await request.json()
    data["type"] = "PIX_PAY_IN"
    # Criar novo request com dados modificados
    class ModifiedRequest:
        def __init__(self, original_request, new_data):
            self._original = original_request
            self._data = new_data
        async def json(self):
            return self._data
        def __getattr__(self, name):
            return getattr(self._original, name)
    modified_request = ModifiedRequest(request, data)
    return await webhook_gatebox(modified_request, db)


@webhook_router.post("/gatebox/check-status")
async def gatebox_check_status(
    external_id: Optional[str] = None,
    transaction_id: Optional[str] = None,
    end_to_end: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Consulta status de transação Gatebox via API (polling)
    Útil quando Gatebox não tem webhook automático
    """
    try:
        gateway = db.query(Gateway).filter(
            Gateway.type == "gatebox",
            Gateway.is_active == True
        ).first()
        
        if not gateway:
            raise HTTPException(status_code=404, detail="Gateway Gatebox não encontrado")
        
        gatebox = get_gatebox_client(gateway)
        if not gatebox:
            raise HTTPException(status_code=500, detail="Erro ao criar cliente Gatebox")
        
        status_data = await gatebox.get_pix_status(
            transaction_id=transaction_id,
            external_id=external_id,
            end_to_end=end_to_end
        )
        
        if not status_data:
            raise HTTPException(status_code=502, detail=f"Erro ao consultar status. {gatebox.last_error or 'Erro desconhecido'}")
        
        # Processar status e atualizar depósito/saque se necessário
        # (mesma lógica do webhook)
        
        return {"status": "ok", "data": status_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@webhook_router.post("/gatebox/pix-cashout")
async def webhook_gatebox_cashout(request: Request, db: Session = Depends(get_db)):
    """
    Webhook legado para PIX Cash-out - redireciona para webhook unificado
    Mantido para compatibilidade
    """
    # Adicionar tipo ao payload e redirecionar para webhook unificado
    data = await request.json()
    data["type"] = "PIX_PAY_OUT"
    # Criar novo request com dados modificados
    class ModifiedRequest:
        def __init__(self, original_request, new_data):
            self._original = original_request
            self._data = new_data
        async def json(self):
            return self._data
        def __getattr__(self, name):
            return getattr(self._original, name)
    modified_request = ModifiedRequest(request, data)
    return await webhook_gatebox(modified_request, db)


# ========== IGameWin Seamless Mode - gold_api (Site Endpoint) ==========
def _validate_igamewin_seamless(data: dict, db: Session) -> Optional[IGameWinAgent]:
    """Valida agent_code e agent_secret/agent_token contra o agente ativo"""
    agent_code = data.get("agent_code")
    received_secret = data.get("agent_secret") or data.get("agent_token")
    if not agent_code or not received_secret:
        return None
    agent = db.query(IGameWinAgent).filter(
        IGameWinAgent.agent_code == agent_code,
        IGameWinAgent.is_active == True
    ).first()
    if not agent:
        return None
    # IGameWin Seamless usa agent_secret; aceita agent_key ou credentials.agent_secret
    creds = {}
    if agent.credentials:
        try:
            creds = json.loads(agent.credentials) or {}
        except Exception:
            pass
    expected_secret = creds.get("agent_secret") or agent.agent_key
    if received_secret != expected_secret:
        return None
    return agent


@gold_api_router.post("/gold_api")
async def igamewin_gold_api(request: Request, db: Session = Depends(get_db)):
    """
    IGameWin Seamless API - Site Endpoint (gold_api).
    IGameWin chama este endpoint com method=user_balance ou method=transaction.
    Site Endpoint no painel: https://api.vertixbet.site (não incluir /gold_api)
    """
    try:
        data = await request.json()
        method = data.get("method")
        if not method:
            return {"status": 0, "msg": "INVALID_PARAMETER", "user_balance": 0}

        agent = _validate_igamewin_seamless(data, db)
        if not agent:
            return {"status": 0, "msg": "INVALID_AGENT", "user_balance": 0}

        user_code = data.get("user_code")
        if not user_code:
            return {"status": 0, "msg": "INVALID_PARAMETER", "user_balance": 0}

        user = db.query(User).filter(User.username == user_code).first()
        if not user:
            return {"status": 0, "msg": "INVALID_USER", "user_balance": 0}

        total_balance = (user.balance or 0) + (getattr(user, "bonus_balance", 0) or 0)

        if method == "user_balance":
            return {"status": 1, "user_balance": round(total_balance, 2)}

        if method == "transaction":
            game_type = data.get("game_type", "slot")
            slot_data = data.get("slot") or data.get("live") or data.get(game_type)
            if not slot_data:
                return {"status": 0, "msg": "INVALID_PARAMETER", "user_balance": round(total_balance, 2)}

            bet_money = float(slot_data.get("bet_money") or slot_data.get("bet") or 0)
            win_money = float(slot_data.get("win_money") or slot_data.get("win") or 0)
            txn_id = slot_data.get("txn_id") or slot_data.get("transaction_id")
            txn_type = slot_data.get("txn_type", "debit_credit")

            if txn_type == "debit":
                win_money = 0
            elif txn_type == "credit":
                bet_money = 0

            if not txn_id:
                return {"status": 0, "msg": "INVALID_PARAMETER", "user_balance": round(total_balance, 2)}

            txn_id_str = str(txn_id)  # IGameWin envia txn_id como número; Bet.transaction_id é VARCHAR
            existing = db.query(Bet).filter(Bet.transaction_id == txn_id_str).first()
            if existing:
                total_balance = (user.balance or 0) + (getattr(user, "bonus_balance", 0) or 0)
                return {"status": 1, "user_balance": round(total_balance, 2)}

            total_available = (user.balance or 0) + (getattr(user, "bonus_balance", 0) or 0)
            if bet_money > 0 and total_available < bet_money:
                return {"status": 0, "msg": "INSUFFICIENT_USER_FUNDS", "user_balance": round(total_available, 2)}

            bonus_bal = getattr(user, "bonus_balance", 0) or 0
            to_deduct = bet_money
            if bonus_bal >= to_deduct:
                user.bonus_balance = bonus_bal - to_deduct
            elif bonus_bal > 0:
                user.bonus_balance = 0
                user.balance = (user.balance or 0) - (to_deduct - bonus_bal)
            else:
                user.balance = (user.balance or 0) - to_deduct

            if win_money > 0:
                user.balance = (user.balance or 0) + win_money
            else:
                cashback_promo = db.query(Promotion).filter(
                    Promotion.promotion_type == "cashback",
                    Promotion.is_active == True,
                    (Promotion.valid_from == None) | (Promotion.valid_from <= datetime.utcnow()),
                    (Promotion.valid_until == None) | (Promotion.valid_until >= datetime.utcnow()),
                    Promotion.bonus_value > 0
                ).order_by(Promotion.display_order.desc()).first()
                if cashback_promo:
                    cashback_amount = round(bet_money * (cashback_promo.bonus_value / 100.0), 2)
                    if cashback_amount > 0:
                        user.bonus_balance = (getattr(user, "bonus_balance", 0) or 0) + cashback_amount

            bet_status = BetStatus.WON if win_money > 0 else BetStatus.LOST
            bet = Bet(
                user_id=user.id,
                game_id=slot_data.get("game_code"),
                game_name=slot_data.get("game_code"),
                provider=slot_data.get("provider_code", "IGameWin"),
                amount=bet_money,
                win_amount=win_money,
                status=bet_status,
                transaction_id=txn_id_str,
                external_id=txn_id_str,
                metadata_json=json.dumps(data)
            )
            db.add(bet)
            db.commit()
            db.refresh(user)
            total_balance = (user.balance or 0) + (getattr(user, "bonus_balance", 0) or 0)
            return {"status": 1, "user_balance": round(total_balance, 2)}

        return {"status": 0, "msg": "INVALID_METHOD", "user_balance": 0}
    except Exception as e:
        print(f"[gold_api] Erro: {e}")
        import traceback
        traceback.print_exc()
        return {"status": 0, "msg": "INTERNAL_ERROR", "user_balance": 0}


@webhook_router.post("/igamewin/bet")
async def webhook_igamewin_bet(request: Request, db: Session = Depends(get_db)):
    """
    Webhook para receber notificações de apostas do IGameWin
    Processa apostas e atualiza saldo do jogador
    
    Campos esperados do IGameWin:
    - user_code: Código do usuário
    - game_code: Código do jogo
    - bet_amount: Valor da aposta
    - win_amount: Valor ganho (0 se perdeu)
    - transaction_id: ID único da transação
    - status: Status da aposta (win/lose)
    """
    try:
        data = await request.json()
        
        # Extrair dados do webhook
        user_code = data.get("user_code") or data.get("userCode")
        game_code = data.get("game_code") or data.get("gameCode")
        bet_amount = float(data.get("bet_amount") or data.get("betAmount") or 0)
        win_amount = float(data.get("win_amount") or data.get("winAmount") or 0)
        transaction_id = data.get("transaction_id") or data.get("transactionId")
        status = data.get("status", "").lower()
        
        if not user_code or not transaction_id:
            return {"status": "error", "message": "user_code e transaction_id são obrigatórios"}
        
        # Buscar usuário pelo username (user_code)
        user = db.query(User).filter(User.username == user_code).first()
        if not user:
            return {"status": "error", "message": f"Usuário {user_code} não encontrado"}
        
        # Verificar se a aposta já foi processada
        existing_bet = db.query(Bet).filter(Bet.transaction_id == transaction_id).first()
        if existing_bet:
            return {"status": "ok", "message": "Aposta já processada"}
        
        # Criar registro de aposta
        bet_status = BetStatus.WON if status == "win" else BetStatus.LOST
        if win_amount == 0:
            bet_status = BetStatus.LOST
        
        bet = Bet(
            user_id=user.id,
            game_id=game_code,
            game_name=data.get("game_name") or data.get("gameName") or "Unknown",
            provider="IGameWin",
            amount=bet_amount,
            win_amount=win_amount,
            status=bet_status,
            transaction_id=transaction_id,
            external_id=transaction_id,
            metadata_json=json.dumps(data)
        )
        
        db.add(bet)
        
        # Atualizar saldo: debitar da aposta (bonus_balance primeiro, depois balance)
        bonus_bal = getattr(user, "bonus_balance", 0) or 0
        to_deduct = bet_amount
        if bonus_bal >= to_deduct:
            user.bonus_balance = bonus_bal - to_deduct
        elif bonus_bal > 0:
            user.bonus_balance = 0
            user.balance = (user.balance or 0) - (to_deduct - bonus_bal)
        else:
            user.balance = (user.balance or 0) - to_deduct
        # Ganhos vão para balance (sacável)
        if win_amount > 0:
            user.balance = (user.balance or 0) + win_amount
        else:
            # Cashback: se perdeu, verificar promoção ativa de cashback
            from datetime import datetime as dt
            now = dt.utcnow()
            cashback_promo = db.query(Promotion).filter(
                Promotion.promotion_type == "cashback",
                Promotion.is_active == True,
                (Promotion.valid_from == None) | (Promotion.valid_from <= now),
                (Promotion.valid_until == None) | (Promotion.valid_until >= now),
                Promotion.bonus_value > 0
            ).order_by(Promotion.display_order.desc()).first()
            if cashback_promo:
                min_dep = getattr(cashback_promo, "min_deposit", 0) or 0
                if min_dep > 0:
                    total_deposited = db.query(func.sum(Deposit.amount)).filter(
                        Deposit.user_id == user.id,
                        Deposit.status == TransactionStatus.APPROVED
                    ).scalar() or 0
                    if total_deposited < min_dep:
                        cashback_promo = None  # Não aplica: depósito mínimo não atingido
                if cashback_promo:
                    cashback_amount = round(bet_amount * (cashback_promo.bonus_value / 100.0), 2)
                    if cashback_amount > 0:
                        user.bonus_balance = (getattr(user, "bonus_balance", 0) or 0) + cashback_amount
                        print(f"[CASHBACK] {cashback_promo.bonus_value}% = R$ {cashback_amount} para {user_code}")
        
        # Sincronizar com IGameWin se houver divergência (fonte de verdade)
        api = get_igamewin_api(db)
        if api:
            igamewin_balance = await api.get_user_balance(user_code)
            if igamewin_balance is not None:
                total_local = (user.balance or 0) + (getattr(user, "bonus_balance", 0) or 0)
                if abs(igamewin_balance - total_local) > 0.01:
                    user.balance = igamewin_balance
                    user.bonus_balance = 0  # Reset split em caso de sync
        
        db.commit()
        db.refresh(bet)
        
        return {"status": "ok", "message": "Aposta processada com sucesso", "bet_id": bet.id}
    
    except Exception as e:
        print(f"Erro ao processar webhook IGameWin bet: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao processar webhook: {str(e)}")


# ========== AFFILIATE PANEL ==========
@affiliate_router.get("/dashboard", response_model=AffiliateResponse)
async def get_affiliate_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Painel do afiliado - retorna dados do afiliado logado"""
    affiliate = db.query(Affiliate).filter(Affiliate.user_id == current_user.id).first()
    if not affiliate:
        raise HTTPException(status_code=404, detail="Você não é um afiliado")
    
    return affiliate


@affiliate_router.get("/stats")
async def get_affiliate_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Estatísticas do afiliado"""
    affiliate = db.query(Affiliate).filter(Affiliate.user_id == current_user.id).first()
    if not affiliate:
        raise HTTPException(status_code=404, detail="Você não é um afiliado")
    
    return {
        "affiliate_code": affiliate.affiliate_code,
        "cpa_amount": affiliate.cpa_amount,
        "revshare_percentage": affiliate.revshare_percentage,
        "total_earnings": affiliate.total_earnings,
        "total_cpa_earned": affiliate.total_cpa_earned,
        "total_revshare_earned": affiliate.total_revshare_earned,
        "total_referrals": affiliate.total_referrals,
        "total_deposits": affiliate.total_deposits,
        "is_active": affiliate.is_active
    }


def _affiliate_period_bounds(period: str):
    """Retorna (start_dt, end_dt) em UTC para o período. end_dt é inclusive (fim do dia)."""
    now = datetime.utcnow()
    today = now.date()
    if period == "this_week":
        start_dt = datetime.combine(today - timedelta(days=today.weekday()), dt_time(0, 0, 0))
        end_dt = datetime.combine(today, now.time()) if now.date() == today else datetime.combine(today, dt_time(23, 59, 59))
    elif period == "last_week":
        start_dt = datetime.combine(today - timedelta(days=today.weekday() + 7), dt_time(0, 0, 0))
        end_dt = datetime.combine(today - timedelta(days=today.weekday() + 1), dt_time(23, 59, 59))
    elif period == "this_month":
        start_dt = datetime.combine(today.replace(day=1), dt_time(0, 0, 0))
        end_dt = now
    elif period == "last_month":
        first_this = today.replace(day=1)
        last_month_end = first_this - timedelta(days=1)
        first_last = last_month_end.replace(day=1)
        start_dt = datetime.combine(first_last, dt_time(0, 0, 0))
        end_dt = datetime.combine(last_month_end, dt_time(23, 59, 59))
    else:
        start_dt = datetime.combine(today - timedelta(days=7), dt_time(0, 0, 0))
        end_dt = now
    return start_dt, end_dt


@affiliate_router.get("/meus-dados")
async def get_affiliate_meus_dados(
    period: str = "this_week",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Métricas do afiliado por período (novos subordinados, depósitos, FTDs, saques, etc.)."""
    affiliate = db.query(Affiliate).filter(Affiliate.user_id == current_user.id).first()
    if not affiliate:
        raise HTTPException(status_code=404, detail="Você não é um afiliado")
    
    start_dt, end_dt = _affiliate_period_bounds(period)
    
    # Usuários indicados por este afiliado no período (cadastrados no período)
    new_referrals = db.query(User).filter(
        User.referred_by_affiliate_id == affiliate.id,
        User.created_at >= start_dt,
        User.created_at <= end_dt
    ).count()
    
    # Depósitos aprovados dos indicados no período
    deposits_q = db.query(func.coalesce(func.sum(Deposit.amount), 0)).join(User).filter(
        User.referred_by_affiliate_id == affiliate.id,
        Deposit.status == TransactionStatus.APPROVED,
        Deposit.created_at >= start_dt,
        Deposit.created_at <= end_dt
    )
    total_deposits_period = deposits_q.scalar() or 0
    deposits_count = db.query(Deposit).join(User).filter(
        User.referred_by_affiliate_id == affiliate.id,
        Deposit.status == TransactionStatus.APPROVED,
        Deposit.created_at >= start_dt,
        Deposit.created_at <= end_dt
    ).count()
    
    # FTDs (primeiros depósitos) dos indicados no período
    ftds_count = db.query(FTD).join(User).filter(
        User.referred_by_affiliate_id == affiliate.id,
        FTD.created_at >= start_dt,
        FTD.created_at <= end_dt
    ).count()
    ftds_amount = db.query(func.coalesce(func.sum(FTD.amount), 0)).join(User).filter(
        User.referred_by_affiliate_id == affiliate.id,
        FTD.created_at >= start_dt,
        FTD.created_at <= end_dt
    ).scalar() or 0
    
    # Saques aprovados dos indicados no período
    withdrawals_q = db.query(func.coalesce(func.sum(Withdrawal.amount), 0)).join(User).filter(
        User.referred_by_affiliate_id == affiliate.id,
        Withdrawal.status == TransactionStatus.APPROVED,
        Withdrawal.created_at >= start_dt,
        Withdrawal.created_at <= end_dt
    )
    total_withdrawals_period = withdrawals_q.scalar() or 0
    withdrawals_count = db.query(Withdrawal).join(User).filter(
        User.referred_by_affiliate_id == affiliate.id,
        Withdrawal.status == TransactionStatus.APPROVED,
        Withdrawal.created_at >= start_dt,
        Withdrawal.created_at <= end_dt
    ).count()
    
    return {
        "period": period,
        "start": start_dt.isoformat(),
        "end": end_dt.isoformat(),
        "new_referrals": new_referrals,
        "deposits_count": deposits_count,
        "deposits_total": round(total_deposits_period, 2),
        "ftds_count": ftds_count,
        "ftds_amount": round(ftds_amount, 2),
        "withdrawals_count": withdrawals_count,
        "withdrawals_total": round(total_withdrawals_period, 2),
    }
