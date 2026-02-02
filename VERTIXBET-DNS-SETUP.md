# 🔧 Configurar DNS para vertixbet.site

## 📍 Informações do Servidor

**IP do Servidor Coolify:** `147.93.147.33`  
**Domínio:** `vertixbet.site`  
**Nameservers atuais:** `ns1.dns-parking.com`, `ns2.dns-parking.com` (Hostinger)

---

## 🚀 Passo a Passo na Hostinger

### 1. Acessar Edição de DNS

1. No painel da Hostinger, você já está na página do domínio `vertixbet.site`
2. Localize a seção **"DNS/Nameservers"**
3. Clique no botão **"Editar"** ao lado de "DNS/Nameservers"

---

### 2. Adicionar Registros A

Após clicar em "Editar", você verá uma lista de registros DNS. Adicione os seguintes:

#### Registro 1: Domínio Principal
```
Tipo: A
Nome: @ (ou deixe vazio)
Valor: 147.93.147.33
TTL: 3600 (ou padrão)
```

#### Registro 2: WWW (Opcional)
```
Tipo: A
Nome: www
Valor: 147.93.147.33
TTL: 3600
```

#### Registro 3: API (OBRIGATÓRIO - Coolify não permite mesmo domínio para duas apps)
```
Tipo: A
Nome: api
Valor: 147.93.147.33
TTL: 3600
```

**⚠️ IMPORTANTE:** Este registro é **obrigatório** porque o Coolify não permite usar o mesmo domínio para backend e frontend. Você precisa usar subdomínios diferentes.

---

### 3. Como Fica na Interface da Hostinger

Na tela de edição DNS, você verá campos como:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | 147.93.147.33 | 3600 |
| A | www | 147.93.147.33 | 3600 |
| A | api | 147.93.147.33 | 3600 |

**Importante:**
- Não remova outros registros existentes (MX, TXT, etc.) a menos que saiba o que está fazendo
- Se já existir um registro A para `@` ou `www`, edite-o ao invés de criar novo

---

### 4. Salvar Configurações

1. Após adicionar/editar os registros, clique em **"Salvar"** ou **"Aplicar"**
2. Aguarde confirmação de que as alterações foram salvas

---

### 5. Aguardar Propagação DNS

- **Tempo de propagação:** 5 minutos a 48 horas (normalmente 1-2 horas)
- **Verificar propagação:** Use [https://dnschecker.org](https://dnschecker.org)
  - Digite `vertixbet.site`
  - Verifique se o IP `147.93.147.33` aparece em todos os servidores

---

## ✅ Verificar se Funcionou

### No Terminal:
```bash
dig vertixbet.site
# ou
nslookup vertixbet.site

# Deve retornar: 147.93.147.33
```

### Online:
- Acesse [https://dnschecker.org](https://dnschecker.org)
- Digite `vertixbet.site`
- Verifique se o IP `147.93.147.33` aparece globalmente

---

## 🔐 Próximos Passos (Após DNS Propagar)

### ⚠️ IMPORTANTE: Coolify não permite mesmo domínio para duas aplicações

O Coolify **não permite** usar o mesmo domínio (`vertixbet.site`) para duas aplicações diferentes. Você precisa usar **subdomínios diferentes**.

---

### Opção Recomendada: Usar Subdomínios Separados

#### 1. Adicionar Domínios no Coolify

**Backend:**
1. No Coolify, abra a aplicação **Backend**
2. Vá em **Domains** → **Add Domain**
3. Adicione: `api.vertixbet.site` ✅

**Frontend:**
1. No Coolify, abra a aplicação **Frontend**
2. Vá em **Domains** → **Add Domain**
3. Adicione: `vertixbet.site` e `www.vertixbet.site` (opcional) ✅

#### 2. Configurar DNS para Subdomínios

Na Hostinger, adicione também o registro para o subdomínio `api`:

```
Tipo: A
Nome: api
Valor: 147.93.147.33
TTL: 3600
```

#### 3. SSL Será Gerado Automaticamente

O Coolify configurará SSL via Let's Encrypt automaticamente após detectar o DNS correto.

#### 4. Atualizar Variáveis de Ambiente

**Backend - CORS_ORIGINS:**
```env
CORS_ORIGINS=https://vertixbet.site,https://www.vertixbet.site,https://api.vertixbet.site
```

**Frontend - VITE_API_URL (deixe vazio para usar proxy e evitar CORS):**
```env
VITE_API_URL=
```
Ou não defina a variável. O nginx do frontend faz proxy de `/api/` para o backend.

---

### Resultado Final

- **Frontend:** `https://vertixbet.site`
- **Backend:** `https://api.vertixbet.site`
- **API (via proxy):** `https://vertixbet.site/api/...` → encaminhado para o backend (mesma origem, sem CORS)

### 4. Fazer Redeploy

Após alterar variáveis de ambiente, faça **Redeploy** das aplicações no Coolify.

---

## ⚠️ Observações Importantes

1. **Coolify não permite mesmo domínio:** O Coolify **não permite** usar o mesmo domínio (`vertixbet.site`) para duas aplicações. Use subdomínios diferentes:
   - Frontend: `vertixbet.site`
   - Backend: `api.vertixbet.site`

2. **Renovação Automática:** Considere ativar a renovação automática do domínio para evitar perda do domínio

3. **Nameservers:** Não precisa alterar os nameservers (`dns-parking.com`). Você pode gerenciar DNS diretamente na Hostinger

4. **Hosting na Hostinger:** Se houver serviço de hosting ativo na Hostinger, desative-o para evitar conflitos com o Coolify

---

## 🆘 Troubleshooting

### DNS não resolve após configurar
- Aguarde mais tempo (pode levar até 48h)
- Verifique se salvou os registros corretamente
- Limpe cache DNS: `ipconfig /flushdns` (Windows) ou `sudo dscacheutil -flushcache` (Mac)

### SSL não gera no Coolify
- Aguarde propagação DNS completa (verifique em dnschecker.org)
- Verifique se o domínio está adicionado no Coolify
- Tente regenerar certificado manualmente no Coolify

### Erro ao editar DNS na Hostinger
- Certifique-se de estar na seção correta (DNS/Nameservers)
- Se não conseguir editar, entre em contato com suporte da Hostinger

---

## 📋 Checklist

- [ ] Acessei a seção DNS/Nameservers no painel da Hostinger
- [ ] Cliquei em "Editar"
- [ ] Adicionei registro A para `@` com IP `147.93.147.33`
- [ ] Adicionei registro A para `www` com IP `147.93.147.33` (opcional)
- [ ] Adicionei registro A para `api` com IP `147.93.147.33` (OBRIGATÓRIO)
- [ ] Salvei as alterações
- [ ] Verifiquei propagação DNS em dnschecker.org
- [ ] Adicionei domínio `api.vertixbet.site` no Coolify (Backend)
- [ ] Adicionei domínio `vertixbet.site` no Coolify (Frontend)
- [ ] Atualizei variáveis de ambiente (CORS_ORIGINS e VITE_API_URL)
- [ ] Fiz redeploy das aplicações
- [ ] SSL está funcionando (cadeado verde no navegador)

---

**Domínio:** vertixbet.site  
**IP do Servidor:** 147.93.147.33  
**Última atualização:** 2026-01-20
