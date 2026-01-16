# 🚀 Guia Rápido: Configuração do Coolify para Fortune Vegas

## 📋 Checklist de Configuração

### 1️⃣ Criar Aplicação Backend no Coolify

1. **Projects** → **Create a new Application**
2. **Repository URL**: `https://github.com/ronaldoarch/fortunevegas`
3. **Branch**: `cloudflare-deploy` (ou sua branch principal)
4. **Base Directory**: `/backend`
5. **Port**: `8000`
6. **Build Pack**: `Nixpacks` (ou `Dockerfile` se preferir usar o Dockerfile customizado)

---

### 2️⃣ Configurar PostgreSQL

1. No Coolify, crie um serviço **PostgreSQL**
2. Defina:
   - Database: `fortunevegas`
   - User: `postgres` (ou outro)
   - Password: (senha forte)
3. **Copie a connection string** (ex: `postgresql://postgres:senha@postgres-db:5432/fortunevegas`)

---

### 3️⃣ Variáveis de Ambiente

Na página da aplicação, vá em **Environment Variables** e adicione:

#### Obrigatórias:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/fortunevegas
SECRET_KEY=sua-chave-secreta-super-segura-aqui
```

**Gerar SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### Opcionais (se frontend em domínio diferente):

```env
CORS_ORIGINS=https://seu-dominio-frontend.com,https://www.seu-dominio.com
PORT=8000
```

---

### 4️⃣ Volume Persistente para Uploads

**CRÍTICO**: Configure para não perder banners/logos.

1. Na aplicação, vá em **Volumes**
2. Clique em **Add Volume**
3. Configure:
   - **Mount Path**: `/app/uploads`
   - **Type**: `Named Volume`
   - **Name**: `fortunevegas-uploads`

Isso garante persistência dos arquivos de imagem mesmo após atualizações.

---

### 5️⃣ Build e Deploy

1. Clique em **Deploy** (ou **Redeploy** se já existir)
2. Aguarde o build completar
3. Verifique os logs para confirmar que:
   - Banco de dados conectou
   - Tabelas foram criadas
   - Servidor iniciou na porta 8000

---

### 6️⃣ Verificar Funcionamento

#### Health Check:
```bash
curl https://seu-dominio.com/api/health
```

Deve retornar:
```json
{"status": "healthy"}
```

#### Verificar Banco:
```bash
# Via terminal do container PostgreSQL ou interface do Coolify
psql -U postgres -d fortunevegas -c "\dt"
```

Deve listar as tabelas: `users`, `media_assets`, `deposits`, etc.

---

## 🔧 Troubleshooting Rápido

### ❌ Erro: "Could not connect to database"

✅ **Solução:**
- Verifique se `DATABASE_URL` está correto
- Confirme que o serviço PostgreSQL está rodando
- Teste a conexão do container da aplicação com o PostgreSQL

### ❌ Erro: "Permission denied" em uploads

✅ **Solução:**
- Confirme que o volume está montado em `/app/uploads`
- Verifique permissões: o Dockerfile já cria com `chmod 755`

### ❌ Imagens não aparecem após upload

✅ **Solução:**
- Confirme que o volume está montado
- Verifique se os arquivos foram salvos em `/app/uploads/banners` e `/app/uploads/logos`
- Confirme que a URL base da API está acessível (CORS configurado)

---

## 📝 Notas Importantes

1. **Banco de Dados**: O SQLAlchemy cria as tabelas automaticamente no primeiro startup
2. **Admin User**: Um usuário admin é criado automaticamente (`admin`/`admin123` - **ALTERE EM PRODUÇÃO!**)
3. **Uploads**: Sempre use volume persistente para não perder imagens
4. **HTTPS**: Configure SSL/TLS no Coolify para segurança

---

## 🔄 Atualizações Futuras

Para atualizar a aplicação:
1. Faça commit/push no repositório
2. No Coolify, clique em **Redeploy**
3. Dados do PostgreSQL e arquivos no volume serão preservados

---

## 📚 Arquivos Criados

- ✅ `backend/Dockerfile` - Imagem Docker customizada
- ✅ `backend/.dockerignore` - Ignora arquivos desnecessários
- ✅ `backend/COOLIFY.md` - Documentação detalhada
- ✅ `COOLIFY-SETUP.md` - Este guia rápido

---

## ✨ Próximos Passos

1. Configurar domínio customizado no Coolify
2. Configurar SSL/HTTPS
3. Configurar backup automático do PostgreSQL
4. Configurar monitoramento/logs
5. (Opcional) Configurar CI/CD para auto-deploy

---

**Dúvidas?** Consulte `backend/COOLIFY.md` para documentação detalhada.
