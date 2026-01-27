"""
Rotas públicas para pagamentos (depósitos e saques) usando SuitPay
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import User, Deposit, Withdrawal, Gateway, TransactionStatus, Bet, BetStatus, Affiliate
from suitpay_api import SuitPayAPI
from schemas import DepositResponse, WithdrawalResponse, DepositPixRequest, WithdrawalPixRequest, AffiliateResponse
from dependencies import get_current_user
from igamewin_api import get_igamewin_api
from datetime import datetime, timedelta
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
    
    if request.amount < 2:
        raise HTTPException(status_code=400, detail="Valor mínimo de depósito é R$ 2,00")
    
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
    webhook_url = os.getenv("WEBHOOK_BASE_URL", "https://api.agenciamidas.com")
    callback_url = f"{webhook_url}/api/webhooks/suitpay/pix-cashin"
    
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
    
    # Criar registro de depósito
    deposit = Deposit(
        user_id=user.id,
        gateway_id=gateway.id,
        amount=request.amount,
        status=TransactionStatus.PENDING,
        transaction_id=str(uuid.uuid4()),
        external_id=pix_response.get("idTransaction") or request_number,
        metadata_json=json.dumps({
            "pix_code": pix_response.get("paymentCode"),
            "pix_qr_code_base64": pix_response.get("paymentCodeBase64"),
            "request_number": request_number,
            "suitpay_response": pix_response
        })
    )
    
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    
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
    webhook_url = os.getenv("WEBHOOK_BASE_URL", "https://api.agenciamidas.com")
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

@webhook_router.post("/suitpay/pix-cashin")
async def webhook_pix_cashin(request: Request, db: Session = Depends(get_db)):
    """
    Webhook para receber notificações de PIX Cash-in (depósitos) da SuitPay
    """
    try:
        data = await request.json()
        print(f"Webhook PIX Cash-in recebido: {data}")
        
        # Buscar gateway PIX ativo para validar hash
        gateway = get_active_pix_gateway(db)
        credentials = json.loads(gateway.credentials) if gateway.credentials else {}
        client_secret = credentials.get("client_secret") or credentials.get("cs")
        
        if not client_secret:
            raise HTTPException(status_code=500, detail="Credenciais do gateway não configuradas")
        
        # Validar hash
        if not SuitPayAPI.validate_webhook_hash(data.copy(), client_secret):
            print(f"Hash inválido no webhook: {data.get('hash')}")
            raise HTTPException(status_code=401, detail="Hash inválido")
        
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
        if id_transaction:
            deposit = db.query(Deposit).filter(Deposit.external_id == id_transaction).first()
        
        if not deposit and request_number:
            # Tentar buscar pelo request_number no metadata
            deposits = db.query(Deposit).filter(
                Deposit.status == TransactionStatus.PENDING
            ).all()
            for d in deposits:
                metadata = json.loads(d.metadata_json) if d.metadata_json else {}
                if metadata.get("request_number") == request_number:
                    deposit = d
                    break
        
        if not deposit:
            print(f"Depósito não encontrado para transação: {id_transaction} ou request: {request_number}")
            return {"status": "ok", "message": "Depósito não encontrado"}
        
        # Atualizar status do depósito
        # Aceitar vários status de sucesso possíveis para cash-in (depósitos)
        # PAID_OUT é apenas para cash-out (saques), não para depósitos
        success_statuses = ["PAID", "COMPLETED", "SUCCESS", "DONE"]
        
        if status_transaction in success_statuses:
            if deposit.status != TransactionStatus.APPROVED:
                deposit.status = TransactionStatus.APPROVED
                # Adicionar saldo ao usuário
                user = db.query(User).filter(User.id == deposit.user_id).first()
                if user:
                    user.balance += deposit.amount
                    print(f"Depósito aprovado: {deposit.id}, valor: {deposit.amount}, novo saldo: {user.balance}")
        elif status_transaction == "CHARGEBACK":
            if deposit.status == TransactionStatus.APPROVED:
                # Reverter saldo se já foi aprovado
                user = db.query(User).filter(User.id == deposit.user_id).first()
                if user and user.balance >= deposit.amount:
                    user.balance -= deposit.amount
            deposit.status = TransactionStatus.CANCELLED
        
        # Atualizar metadata
        metadata = json.loads(deposit.metadata_json) if deposit.metadata_json else {}
        metadata["webhook_data"] = data
        metadata["webhook_received_at"] = datetime.utcnow().isoformat()
        deposit.metadata_json = json.dumps(metadata)
        
        db.commit()
        
        return {"status": "ok", "message": "Webhook processado com sucesso"}
    
    except Exception as e:
        print(f"Erro ao processar webhook PIX Cash-in: {str(e)}")
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
    
    # Buscar usuários referenciados por este afiliado (via affiliate_code no metadata)
    # Isso depende de como você armazena a referência do afiliado nos usuários
    # Por enquanto, retornamos os dados do afiliado
    
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
