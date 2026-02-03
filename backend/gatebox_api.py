"""
Módulo para integração com a API Gatebox
Documentação: https://api.gatebox.com.br
"""
import httpx
import json
from typing import Optional, Dict, Any
import os


class GateboxAPI:
    def __init__(self, username: str, password: str, api_url: str = "https://api.gatebox.com.br"):
        """
        Inicializa a API Gatebox
        
        Args:
            username: Username da conta Gatebox
            password: Password da conta Gatebox
            api_url: URL base da API (default: produção)
        """
        self.username = username
        self.password = password
        self.api_url = api_url.rstrip('/')
        self.access_token: Optional[str] = None
        self.last_error: Optional[str] = None
    
    async def _authenticate(self) -> bool:
        """Autentica e obtém access_token"""
        if self.access_token:
            return True
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_url}/v1/customers/auth/sign-in",
                    json={
                        "username": self.username,
                        "password": self.password
                    }
                )
                response.raise_for_status()
                data = response.json()
                self.access_token = data.get("access_token")
                if not self.access_token:
                    self.last_error = "access_token não encontrado na resposta"
                    return False
                return True
        except httpx.HTTPStatusError as e:
            error_text = e.response.text if e.response else "Sem resposta"
            self.last_error = f"Erro HTTP autenticação: {e.response.status_code} - {error_text}"
            return False
        except Exception as e:
            self.last_error = f"Erro ao autenticar: {str(e)}"
            return False
    
    async def _request(self, method: str, endpoint: str, payload: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Faz requisição autenticada para a API Gatebox"""
        if not await self._authenticate():
            return None
        
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                if method == "GET":
                    response = await client.get(f"{self.api_url}{endpoint}", headers=headers)
                elif method == "POST":
                    response = await client.post(f"{self.api_url}{endpoint}", headers=headers, json=payload or {})
                else:
                    self.last_error = f"Método HTTP não suportado: {method}"
                    return None
                
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            error_text = e.response.text if e.response else "Sem resposta"
            self.last_error = f"Erro HTTP {endpoint}: {e.response.status_code} - {error_text}"
            print(f"[GateboxAPI] Erro {endpoint}: {e.response.status_code} - {error_text}")
            return None
        except Exception as e:
            self.last_error = f"Erro ao chamar {endpoint}: {str(e)}"
            print(f"[GateboxAPI] Erro {endpoint}: {str(e)}")
            return None
    
    async def create_pix_qrcode(
        self,
        external_id: str,
        amount: float,
        document: str,
        name: str,
        expire: int = 3600,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        identification: Optional[str] = None,
        description: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Cria QR Code PIX imediato (Cash-In)
        Endpoint: POST /v1/customers/pix/create-immediate-qrcode
        
        Args:
            external_id: ID de conciliação único
            amount: Valor do depósito
            document: CPF/CNPJ do pagador
            name: Nome completo do pagador
            expire: Tempo de expiração em segundos (default: 3600 = 1 hora)
            email: E-mail do pagador (opcional)
            phone: Telefone do pagador (opcional, ex: +5514987654321)
            identification: Descrição exibida no pagamento (opcional)
            description: Descrição da transação (opcional)
        
        Returns:
            Dict com dados do PIX ou None em caso de erro
        """
        payload = {
            "externalId": external_id,
            "amount": amount,
            "document": document,
            "name": name,
            "expire": expire
        }
        
        if email:
            payload["email"] = email
        if phone:
            payload["phone"] = phone
        if identification:
            payload["identification"] = identification
        if description:
            payload["description"] = description
        
        return await self._request("POST", "/v1/customers/pix/create-immediate-qrcode", payload)
    
    async def get_pix_status(
        self,
        transaction_id: Optional[str] = None,
        external_id: Optional[str] = None,
        end_to_end: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Consulta status de transação PIX
        Endpoint: GET /v1/customers/pix/status
        
        Args:
            transaction_id: ID da transação Gatebox (opcional)
            external_id: ID de conciliação (opcional)
            end_to_end: EndToEnd ID do PIX (opcional)
        
        Returns:
            Dict com status da transação ou None em caso de erro
        """
        params = []
        if transaction_id:
            params.append(f"transactionId={transaction_id}")
        if external_id:
            params.append(f"externalId={external_id}")
        if end_to_end:
            params.append(f"endToEnd={end_to_end}")
        
        query = "?" + "&".join(params) if params else ""
        return await self._request("GET", f"/v1/customers/pix/status{query}")
    
    async def withdraw_pix(
        self,
        external_id: str,
        key: str,
        name: str,
        amount: float,
        document_number: Optional[str] = None,
        description: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Realiza saque via PIX (Cash-Out)
        Endpoint: POST /v1/customers/pix/withdraw
        
        Args:
            external_id: ID de conciliação único
            key: Chave PIX do recebedor
            name: Nome completo do recebedor
            amount: Valor do saque
            document_number: CPF/CNPJ do recebedor (obrigatório se validação de chave ativa)
            description: Descrição da transação (opcional)
        
        Returns:
            Dict com dados do saque ou None em caso de erro
        """
        payload = {
            "externalId": external_id,
            "key": key,
            "name": name,
            "amount": amount
        }
        
        if document_number:
            payload["documentNumber"] = document_number
        if description:
            payload["description"] = description
        
        print(f"[GATEBOX WITHDRAW] Enviando payload: {json.dumps(payload, indent=2)}")
        result = await self._request("POST", "/v1/customers/pix/withdraw", payload)
        if result:
            print(f"[GATEBOX WITHDRAW] Resposta recebida: {json.dumps(result, indent=2)}")
        else:
            print(f"[GATEBOX WITHDRAW] Erro na requisição: {self.last_error}")
        return result
    
    async def get_balance(self) -> Optional[float]:
        """
        Consulta saldo da conta
        Endpoint: POST /v1/customers/account/balance
        
        Returns:
            Saldo disponível ou None em caso de erro
        """
        data = await self._request("POST", "/v1/customers/account/balance")
        if not data:
            return None
        return data.get("balance", 0.0)
    
    async def validate_pix_key(self, pix_key: str) -> Optional[Dict[str, Any]]:
        """
        Valida chave PIX
        Endpoint: GET /v1/customers/pix/pix-search?dict={chave}
        
        Args:
            pix_key: Chave PIX a validar (sem pontuação)
        
        Returns:
            Dict com dados da chave ou None em caso de erro
        """
        return await self._request("GET", f"/v1/customers/pix/pix-search?dict={pix_key}")


def get_gatebox_client(gateway) -> Optional[GateboxAPI]:
    """
    Cria cliente Gatebox a partir de um Gateway configurado
    
    Args:
        gateway: Objeto Gateway do banco de dados
    
    Returns:
        Instância GateboxAPI ou None se credenciais inválidas
    """
    if not gateway or gateway.type != "gatebox":
        return None
    
    credentials = {}
    if gateway.credentials:
        try:
            credentials = json.loads(gateway.credentials)
        except Exception:
            pass
    
    username = credentials.get("username") or credentials.get("client_id")
    password = credentials.get("password") or credentials.get("client_secret")
    api_url = credentials.get("api_url", "https://api.gatebox.com.br")
    
    if not username or not password:
        return None
    
    return GateboxAPI(username=username, password=password, api_url=api_url)
