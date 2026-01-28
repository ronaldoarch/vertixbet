"""
Módulo para integração com a API SuitPay
Documentação: https://sandbox.ws.suitpay.app (sandbox) ou https://ws.suitpay.app (produção)
"""
import httpx
import json
from typing import Optional, Dict, Any
import os


class SuitPayAPI:
    def __init__(self, client_id: str, client_secret: str, sandbox: bool = True):
        """
        Inicializa a API SuitPay
        
        Args:
            client_id: Client ID (ci) da SuitPay
            client_secret: Client Secret (cs) da SuitPay
            sandbox: Se True, usa ambiente sandbox, senão usa produção
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = "https://sandbox.ws.suitpay.app" if sandbox else "https://ws.suitpay.app"
        self.headers = {
            "ci": client_id,
            "cs": client_secret,
            "Content-Type": "application/json"
        }
    
    async def _post(self, endpoint: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Faz requisição POST para a API SuitPay"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}{endpoint}",
                    headers=self.headers,
                    json=payload
                )
                # Log da resposta para debug
                response_text = response.text
                print(f"SuitPay {endpoint} - Status: {response.status_code}")
                print(f"SuitPay {endpoint} - Response: {response_text[:500]}")
                
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            error_text = e.response.text if e.response else "Sem resposta"
            print(f"Erro HTTP SuitPay {endpoint}: {e.response.status_code} - {error_text}")
            return None
        except Exception as e:
            print(f"Erro ao chamar SuitPay {endpoint}: {str(e)}")
            return None
    
    async def generate_pix_payment(
        self,
        request_number: str,
        due_date: str,
        amount: float,
        client_name: str,
        client_document: str,
        client_email: str,
        client_phone: Optional[str] = None,
        client_address: Optional[Dict[str, Any]] = None,
        shipping_amount: Optional[float] = None,
        products: Optional[list] = None,
        callback_url: Optional[str] = None,
        username_checkout: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Gera código de pagamento PIX (Cash-in)
        Endpoint: POST /api/v1/gateway/request-qrcode
        
        Args:
            request_number: Número único da requisição
            due_date: Data de vencimento (AAAA-MM-DD)
            amount: Valor total
            client_name: Nome do cliente
            client_document: CPF/CNPJ do cliente
            client_email: E-mail do cliente
            client_phone: Telefone do cliente (DDD+TELEFONE) - opcional
            client_address: Objeto com endereço do cliente - opcional
            shipping_amount: Valor do frete - opcional
            products: Lista de produtos - opcional
            callback_url: URL do webhook - opcional
            username_checkout: Username no checkout - opcional
        
        Returns:
            Dict com dados do PIX ou None em caso de erro
        """
        # Estrutura conforme documentação oficial SuitPay
        # POST /api/v1/gateway/request-qrcode
        payload = {
            "requestNumber": request_number,
            "dueDate": due_date,
            "amount": amount,
            "client": {
                "name": client_name,
                "document": client_document,
                "email": client_email
            }
        }
        
        # Adicionar phoneNumber se fornecido
        if client_phone:
            payload["client"]["phoneNumber"] = client_phone
        
        # Adicionar address se fornecido
        if client_address:
            payload["client"]["address"] = client_address
        
        # Adicionar shippingAmount se fornecido
        if shipping_amount is not None:
            payload["shippingAmount"] = shipping_amount
        
        # Products: conforme documentação, pode ser lista vazia ou com produtos
        # Se não fornecido, enviar lista vazia para garantir compatibilidade
        if products is not None:
            payload["products"] = products
        else:
            # Enviar lista vazia se não fornecido (algumas APIs exigem o campo)
            payload["products"] = []
        
        # Adicionar callbackUrl se fornecido
        if callback_url:
            payload["callbackUrl"] = callback_url
            print(f"[SuitPayAPI] Webhook URL enviada para SuitPay: {callback_url}")
        else:
            print(f"[SuitPayAPI] ATENÇÃO: Nenhuma callbackUrl fornecida - webhook não será chamado!")
        
        # Adicionar usernameCheckout se fornecido
        if username_checkout:
            payload["usernameCheckout"] = username_checkout
        
        print(f"[SuitPayAPI] Payload enviado para SuitPay: {json.dumps(payload, indent=2, default=str)}")
        
        # Endpoint correto conforme documentação oficial SuitPay
        # POST /api/v1/gateway/request-qrcode
        return await self._post("/api/v1/gateway/request-qrcode", payload)
    
    async def transfer_pix(
        self,
        key: str,
        type_key: str,
        value: float,
        callback_url: Optional[str] = None,
        document_validation: Optional[str] = None,
        external_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Realiza transferência via PIX (Cash-out)
        Endpoint: POST /api/v1/gateway/pix-payment
        
        IMPORTANTE: É necessário cadastrar o IP do servidor na SuitPay
        (GATEWAY/CHECKOUT -> GERENCIAMENTO DE IPs)
        
        Args:
            key: Chave PIX (CPF/CNPJ, telefone, email, chave aleatória ou QR Code)
            type_key: Tipo da chave PIX: "document", "phoneNumber", "email", "randomKey", "paymentCode"
            value: Valor da transferência
            callback_url: URL do webhook - opcional
            document_validation: CPF/CNPJ para validar se pertence à chave PIX - opcional
            external_id: ID único para controle de duplicidade - opcional
        
        Returns:
            Dict com dados da transferência ou None em caso de erro
        """
        payload = {
            "key": key,
            "typeKey": type_key,
            "value": value
        }
        
        if callback_url:
            payload["callbackUrl"] = callback_url
        
        if document_validation:
            payload["documentValidation"] = document_validation
        
        if external_id:
            payload["externalId"] = external_id
        
        # Endpoint correto conforme documentação oficial SuitPay
        # POST /api/v1/gateway/pix-payment
        return await self._post("/api/v1/gateway/pix-payment", payload)
    
    @staticmethod
    def validate_webhook_hash(data: Dict[str, Any], client_secret: str) -> bool:
        """
        Valida o hash do webhook recebido da SuitPay
        
        IMPORTANTE: Conforme documentação oficial da SuitPay:
        "Mantenha a ordem dos valores contidos consistente com a ordem dos valores recebidos no JSON"
        
        Args:
            data: Dados do webhook (JSON) - deve manter ordem original
            client_secret: Client Secret (cs) da SuitPay
        
        Returns:
            True se o hash for válido, False caso contrário
        """
        import hashlib
        import copy
        
        # Faz cópia para não modificar o original
        data_copy = copy.deepcopy(data)
        
        # Remove o hash do dict para calcular
        received_hash = data_copy.pop("hash", None)
        if not received_hash:
            return False
        
        # IMPORTANTE: Concatena valores na ORDEM ORIGINAL do JSON recebido
        # Não ordenar alfabeticamente! A documentação exige manter a ordem original
        values = []
        for key, value in data_copy.items():
            if value is not None:
                values.append(str(value))
        
        # Concatena com client_secret
        string_to_hash = "".join(values) + client_secret
        
        # Calcula SHA-256
        calculated_hash = hashlib.sha256(string_to_hash.encode()).hexdigest()
        
        # Compara hashes (case-insensitive conforme documentação)
        return calculated_hash.lower() == received_hash.lower()
