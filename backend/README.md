# Backend VertixBet - FastAPI

Backend Python para a plataforma VertixBet com integração IGameWin.

## Instalação

```bash
# Criar ambiente virtual (se ainda não criou)
python3 -m venv venv

# Ativar ambiente virtual
# macOS/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Copiar arquivo de ambiente (opcional)
cp .env.example .env
# Editar .env com suas configurações
```

## Executar

```bash
# Ativar ambiente virtual primeiro
source venv/bin/activate  # macOS/Linux
# ou
# venv\Scripts\activate  # Windows

# Executar servidor
uvicorn main:app --reload --port 8000
```

A API estará disponível em: http://localhost:8000

Documentação interativa: http://localhost:8000/docs

## Usuário Admin Padrão

- **Username**: admin
- **Password**: admin123

⚠️ **IMPORTANTE**: Altere a senha do admin em produção!

## Estrutura

- `models.py` - Modelos do banco de dados (SQLAlchemy)
- `schemas.py` - Schemas Pydantic para validação
- `database.py` - Configuração do banco de dados
- `auth.py` - Autenticação e hash de senhas
- `igamewin_api.py` - Cliente para API do IGameWin
- `routes/` - Rotas da API
  - `auth.py` - Rotas de autenticação
  - `admin.py` - Rotas administrativas
- `main.py` - Aplicação principal FastAPI

## Endpoints Principais

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Informações do usuário logado

### Admin (requer autenticação admin)
- `GET /api/admin/stats` - Estatísticas gerais
- `GET /api/admin/users` - Listar usuários
- `POST /api/admin/users` - Criar usuário
- `GET /api/admin/deposits` - Listar depósitos
- `GET /api/admin/withdrawals` - Listar saques
- `GET /api/admin/ftds` - Listar FTDs
- `GET /api/admin/gateways` - Listar gateways
- `GET /api/admin/igamewin-agents` - Listar agentes IGameWin
- E muito mais...

Veja a documentação completa em http://localhost:8000/docs
