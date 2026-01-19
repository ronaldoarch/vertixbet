# Integração SuitPay - Documentação

## ✅ O que foi implementado

### 1. Módulo de API (`backend/suitpay_api.py`)
- Classe `SuitPayAPI` para comunicação com a API SuitPay
- Suporte para ambiente sandbox e produção
- Métodos:
  - `generate_pix_payment()` - Gera código PIX para depósito (Cash-in)
  - `transfer_pix()` - Realiza transferência PIX para saque (Cash-out)
  - `validate_webhook_hash()` - Valida hash SHA-256 dos webhooks

### 2. Rotas Públicas (`backend/routes/payments.py`)
- **POST `/api/public/payments/deposit/pix`** - Criar depósito via PIX
  - Requer autenticação (Bearer token)
  - Parâmetros: `amount`, `payer_name`, `payer_tax_id`
  - Retorna código PIX e QR Code
  
- **POST `/api/public/payments/withdrawal/pix`** - Criar saque via PIX
  - Requer autenticação (Bearer token)
  - Parâmetros: `amount`, `destination_name`, `destination_tax_id`, `destination_bank`, `destination_account`, `destination_account_type`
  - Bloqueia saldo do usuário imediatamente

### 3. Webhooks (`backend/routes/payments.py`)
- **POST `/api/webhooks/suitpay/pix-cashin`** - Recebe notificações de depósitos
  - Valida hash SHA-256
  - Atualiza status do depósito
  - Adiciona saldo ao usuário quando `statusTransaction == "PAID_OUT"`
  - Reverte saldo em caso de `CHARGEBACK`

- **POST `/api/webhooks/suitpay/pix-cashout`** - Recebe notificações de saques
  - Valida hash SHA-256
  - Atualiza status do saque
  - Reverte saldo se `statusTransaction == "CANCELED"`

## ⚙️ Configuração necessária

### 1. Criar Gateway no Banco de Dados

No painel admin, criar um gateway com:
- **name**: "SuitPay PIX" (ou outro nome)
- **type**: "pix"
- **is_active**: `true`
- **credentials**: JSON com as credenciais:
  ```json
  {
    "client_id": "seu_client_id_aqui",
    "client_secret": "seu_client_secret_aqui",
    "sandbox": true
  }
  ```

### 2. Variáveis de Ambiente

Adicionar no Coolify:
- `WEBHOOK_BASE_URL`: URL base do seu backend (ex: `https://api.agenciamidas.com`)

### 3. Configurar Webhooks na SuitPay

No painel da SuitPay, configurar os webhooks:
- **PIX Cash-in**: `https://api.agenciamidas.com/api/webhooks/suitpay/pix-cashin`
- **PIX Cash-out**: `https://api.agenciamidas.com/api/webhooks/suitpay/pix-cashout`

### 4. IPs Permitidos (Opcional)

A SuitPay pode validar IPs. Se necessário, adicione o IP do seu servidor:
- IP do servidor: `3.132.137.46` (conforme documentação)

## 📋 Endpoints da API SuitPay

### PIX Cash-in (Depósito)
- **Endpoint**: `POST /api/v1/gateway/pix/create`
- **Campos**:
  - `value`: Valor do pagamento
  - `payerName`: Nome do pagador
  - `payerTaxId`: CPF/CNPJ do pagador
  - `requestNumber`: Número único da requisição
  - `urlCallback`: URL do webhook (opcional)

### PIX Cash-out (Saque)
- **Endpoint**: `POST /api/v1/gateway/pix/transfer`
- **Campos**:
  - `value`: Valor a transferir
  - `destinationName`: Nome do destinatário
  - `destinationTaxId`: CPF/CNPJ do destinatário
  - `destinationBank`: Código do banco
  - `destinationAccount`: Número da conta
  - `destinationAccountType`: Tipo de conta (CHECKING ou SAVINGS)
  - `urlCallback`: URL do webhook (opcional)

## 🔒 Segurança

- Autenticação via Bearer token (JWT) nos endpoints públicos
- Validação de hash SHA-256 nos webhooks
- Credenciais armazenadas no banco de dados (não em código)
- Suporte para sandbox e produção

## 📝 Notas

- Os endpoints da SuitPay podem variar. Verifique a documentação oficial se houver erros.
- Os campos podem precisar de ajustes conforme a documentação real da API.
- Teste primeiro em sandbox antes de usar em produção.
