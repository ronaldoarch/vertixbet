"""
Rotas públicas para pagamentos (depósitos e saques) usando SuitPay
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from sqlalchemy import func
from models import User, Deposit, Withdrawal, Gateway, TransactionStatus, Bet, BetStatus, Affiliate, FTDSettings, FTD, Coupon, CouponType
from suitpay_api import SuitPayAPI
from schemas import DepositResponse, WithdrawalResponse, DepositPixRequest, WithdrawalPixRequest, AffiliateResponse
from dependencies import get_current_user
from igamewin_api import get_igamewin_api
from datetime import datetime, timedelta, time as dt_time
import json
import uuid
import os

router = APIRouter(prefix="/api/public/payments", tags=["payments"])
webhook_router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
affiliate_router = APIRouter(prefix="/api/public/affiliate", tags=["affiliate"])


def get_active_pix_gateway(db: Session) -> Gateway:
    """Busca gateway PIX ativo"""
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
    
    # Validar CPF/CNPJ (não pode estar vazio conforme SuitPay)
    if not request.payer_tax_id or not request.payer_tax_id.strip():
        raise HTTPException(
            status_code=400, 
            detail="CPF/CNPJ é obrigatório para gerar código PIX. Por favor, complete seu cadastro."
        )
    
    # Buscar gateway PIX ativo
    gateway = get_active_pix_gateway(db)
    
    # Criar cliente SuitPay
    suitpay = get_suitpay_client(gateway)
    
    # Gerar número único da requisição
    request_number = f"DEP_{user.id}_{int(datetime.utcnow().timestamp())}"
    
    # Data de vencimento (30 dias a partir de hoje)
    due_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    # URL do webhook (usar variável de ambiente ou construir)
    webhook_url = os.getenv("WEBHOOK_BASE_URL", "https://api.vertixbet.site")
    callback_url = f"{webhook_url}/api/webhooks/suitpay/pix-cashin"
    
    print(f"[DEPOSIT PIX] Criando depósito de R$ {request.amount} para usuário {user.id}")
    print(f"[DEPOSIT PIX] Webhook URL configurada: {callback_url}")
    print(f"[DEPOSIT PIX] Request Number: {request_number}")
    
    # Gerar código PIX conforme documentação oficial
    pix_response = await suitpay.generate_pix_payment(
        request_number=request_number,
        due_date=due_date,
        amount=request.amount,
        client_name=request.payer_name,
        client_document=request.payer_tax_id,
        client_email=request.payer_email,
        client_phone=request.payer_phone,
        callback_url=callback_url
    )
    
    if not pix_response:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Erro ao gerar código PIX no gateway. Verifique as credenciais e se o gateway está ativo."
        )
    
    # Validar campos obrigatórios na resposta
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
    deposit = Deposit(
        user_id=user.id,
        gateway_id=gateway.id,
        amount=request.amount,
        status=TransactionStatus.PENDING,
        transaction_id=str(uuid.uuid4()),
        external_id=pix_response.get("idTransaction") or request_number,
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
    
    # Criar cliente SuitPay
    suitpay = get_suitpay_client(gateway)
    
    # URL do webhook
    webhook_url = os.getenv("WEBHOOK_BASE_URL", "https://api.vertixbet.site")
    callback_url = f"{webhook_url}/api/webhooks/suitpay/pix-cashout"
    
    # Gerar external_id único para controle de duplicidade
    external_id = f"WTH_{user.id}_{int(datetime.utcnow().timestamp())}"
    
    # Realizar transferência PIX conforme documentação oficial
    transfer_response = await suitpay.transfer_pix(
        key=request.pix_key,
        type_key=request.pix_key_type,
        value=request.amount,
        callback_url=callback_url,
        document_validation=request.document_validation,
        external_id=external_id
    )
    
    if not transfer_response:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Erro ao processar transferência PIX no gateway. Verifique se o IP do servidor está cadastrado na SuitPay."
        )
    
    # Verificar resposta da API
    response_status = transfer_response.get("response", "").upper()
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
    
    # Criar registro de saque
    withdrawal = Withdrawal(
        user_id=user.id,
        gateway_id=gateway.id,
        amount=request.amount,
        status=TransactionStatus.PENDING,
        transaction_id=str(uuid.uuid4()),
        external_id=transfer_response.get("idTransaction") or external_id,
        metadata_json=json.dumps({
            "pix_key": request.pix_key,
            "pix_key_type": request.pix_key_type,
            "document_validation": request.document_validation,
            "external_id": external_id,
            "suitpay_response": transfer_response
        })
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
                if user:
                    saldo_anterior = user.balance
                    user.balance += deposit.amount + bonus_to_credit
                    print(f"Saldo anterior: {saldo_anterior}, Valor creditado: {deposit.amount} + bônus: {bonus_to_credit}, Novo saldo: {user.balance}")
                else:
                    print(f"ERRO: Usuário {deposit.user_id} não encontrado!")
                
                deposit.status = TransactionStatus.APPROVED
                print(f"Depósito {deposit.id} aprovado com sucesso")
            else:
                print(f"Depósito {deposit.id} já estava aprovado, ignorando webhook duplicado")
        elif status_transaction_upper == "CHARGEBACK":
            print(f"CHARGEBACK detectado para depósito {deposit.id}")
            if deposit.status == TransactionStatus.APPROVED:
                dep_meta = json.loads(deposit.metadata_json) if deposit.metadata_json else {}
                bonus_to_revert = float(dep_meta.get("bonus_amount") or 0)
                total_to_revert = deposit.amount + bonus_to_revert
                user = db.query(User).filter(User.id == deposit.user_id).first()
                if user and user.balance >= total_to_revert:
                    user.balance -= total_to_revert
                    print(f"Saldo revertido: {user.balance}")
                if dep_meta.get("coupon_id"):
                    coupon = db.query(Coupon).filter(Coupon.id == dep_meta["coupon_id"]).first()
                    if coupon and (coupon.used_count or 0) > 0:
                        coupon.used_count -= 1
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
        
        # Atualizar saldo do jogador
        # Debitar valor da aposta
        user.balance -= bet_amount
        
        # Se ganhou, creditar valor ganho
        if win_amount > 0:
            user.balance += win_amount
        
        # Sincronizar saldo com IGameWin
        api = get_igamewin_api(db)
        if api:
            # Obter saldo atual do IGameWin
            igamewin_balance = await api.get_user_balance(user_code)
            if igamewin_balance is not None:
                # Sincronizar: se o saldo do IGameWin for diferente, ajustar
                if abs(igamewin_balance - user.balance) > 0.01:  # Tolerância de 1 centavo
                    user.balance = igamewin_balance
        
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
