# 🚀 Guia de Deploy - VertixBet no Coolify

## 📋 Visão Geral

O projeto tem **2 aplicações separadas** que precisam ser deployadas:

1. **Backend** (FastAPI) - Porta `8000`
2. **Frontend** (React + Vite) - Porta `5173` (dev) ou build estático

---

## 🗂️ Estrutura do Repositório

```
fortunevegas/
├── backend/          ← API FastAPI (Python)
├── frontend/         ← App React (Vite + TypeScript)
└── app/              ← Next.js (não usado atualmente)
```

---

## 1️⃣ Deploy do Backend (FastAPI)

### Configuração no Coolify:

**Criar Aplicação 1: Backend API**

```
Repository URL: https://github.com/ronaldoarch/fortunevegas
Branch: cloudflare-deploy
Base Directory: /backend        ← AQUI!
Port: 8000
Build Pack: Dockerfile          ← Usa o Dockerfile customizado
```

### Variáveis de Ambiente:
```env
DATABASE_URL=postgresql://usuario:senha@host:5432/fortunevegas
SECRET_KEY=sua-chave-secreta-aqui
CORS_ORIGINS=https://seu-frontend.com
```

### Volume Persistente:
- **Mount Path**: `/app/uploads`
- **Type**: Named Volume
- **Name**: `fortunevegas-uploads`

---

## 2️⃣ Deploy do Frontend (React + Vite)

### Opção A: Build Estático (Recomendado)

O Vite gera arquivos estáticos que podem ser servidos por qualquer servidor web.

#### Configuração no Coolify:

**Criar Aplicação 2: Frontend**

```
Repository URL: https://github.com/ronaldoarch/fortunevegas
Branch: cloudflare-deploy
Base Directory: /frontend        ← AQUI!
Port: 80 ou 443
Build Pack: Nixpacks
Is it a static site?: SIM ✓      ← IMPORTANTE!
```

#### Build Command:
```bash
npm install && npm run build
```

#### Publish Directory:
```
dist
```

#### Variáveis de Ambiente:
```env
VITE_API_URL=https://api.seu-dominio.com
# ou
VITE_API_URL=https://backend.coolify.com
```

**⚠️ IMPORTANTE**: Precisamos atualizar o frontend para usar variável de ambiente!

---

### Opção B: Servidor Node.js (Vite Preview)

Se quiser usar o servidor Vite:

```
Base Directory: /frontend
Port: 5173 (ou outro)
Build Pack: Nixpacks
Is it a static site?: NÃO
```

#### Build Command:
```bash
npm install
```

#### Start Command:
```bash
npm run preview -- --host 0.0.0.0 --port ${PORT:-5173}
```

---

## 🔧 Configuração Necessária no Frontend

### Problema Atual

O frontend usa URLs hardcoded:
```typescript
const API_URL = 'http://localhost:8000';
```

### Solução: Variável de Ambiente

Precisamos atualizar os arquivos do frontend para usar variável de ambiente:

**Arquivos que precisam ser atualizados:**
- `frontend/src/pages/AdminLogin.tsx`
- `frontend/src/pages/Admin.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/HeroBanner.tsx`

**Exemplo de mudança:**
```typescript
// ANTES:
const API_URL = 'http://localhost:8000';

// DEPOIS:
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

## 📊 Resumo: Duas Aplicações no Coolify

### Aplicação 1: Backend API
- **Nome**: `fortunevegas-api` (ou qualquer nome)
- **Base Directory**: `/backend`
- **Port**: `8000`
- **Build Pack**: `Dockerfile`
- **URL**: `https://api.seudominio.com` (ou subdomínio do Coolify)

### Aplicação 2: Frontend Web
- **Nome**: `fortunevegas-frontend` (ou qualquer nome)
- **Base Directory**: `/frontend`
- **Port**: `80` (se estático) ou `5173` (se Node.js)
- **Build Pack**: `Nixpacks`
- **Is Static**: `SIM` (recomendado)
- **URL**: `https://seudominio.com` (ou subdomínio do Coolify)

---

## 🔗 Conectar Frontend com Backend

### 1. Após deploy do backend, anote a URL:
```
https://backend-xxx.coolify.app
ou
https://api.seudominio.com
```

### 2. Configure variável de ambiente no frontend:
```env
VITE_API_URL=https://backend-xxx.coolify.app
```

### 3. Atualize o código do frontend para usar `VITE_API_URL`

### 4. Faça redeploy do frontend

---

## ✅ Checklist de Deploy

### Backend:
- [ ] Criar aplicação no Coolify
- [ ] Configurar Base Directory: `/backend`
- [ ] Configurar PostgreSQL
- [ ] Adicionar variáveis de ambiente (DATABASE_URL, SECRET_KEY)
- [ ] Configurar volume persistente para `/app/uploads`
- [ ] Deploy e verificar `/api/health`

### Frontend:
- [ ] Criar aplicação no Coolify
- [ ] Configurar Base Directory: `/frontend`
- [ ] Marcar como "Static Site" se usar build estático
- [ ] Configurar VITE_API_URL com URL do backend
- [ ] Atualizar código do frontend para usar variável de ambiente
- [ ] Deploy e testar conexão com backend

---

## 🎯 Por que Base Directory é `/backend`?

O **Base Directory** no Coolify indica **onde está o código da aplicação dentro do repositório**.

- Se o backend está em `/backend`, use Base Directory: `/backend`
- Se o frontend está em `/frontend`, use Base Directory: `/frontend`

Assim, o Coolify sabe onde encontrar o `package.json`, `requirements.txt`, `Dockerfile`, etc.

---

## 💡 Dica

Se preferir, posso:
1. Criar um script para atualizar todas as URLs do frontend para usar `VITE_API_URL`
2. Criar um Dockerfile para o frontend também (opcional)

Quer que eu faça essas alterações?
