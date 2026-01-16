# 🔧 Troubleshooting - Erro "ModuleNotFoundError: No module named 'fastapi'"

## 🐛 Problema

O erro indica que as dependências Python não estão sendo instaladas durante o build.

## ✅ Soluções

### Solução 1: Garantir que está usando Dockerfile

No Coolify, verifique:

1. **Build Pack**: Deve estar como `Dockerfile` (não Nixpacks)
2. **Base Directory**: Deve ser `/backend`
3. **Build Context**: Deve apontar para `/backend`

### Solução 2: Verificar Build Logs

No Coolify, vá em **Logs** e verifique se aparece:

```
Step 5/10 : COPY requirements.txt .
Step 6/10 : RUN pip install -r requirements.txt
```

Se não aparecer, o build não está copiando o `requirements.txt`.

### Solução 3: Forçar Rebuild Limpo

No Coolify:
1. Vá em **Settings** → **Danger Zone**
2. Clique em **Clean Build**
3. Faça **Redeploy**

### Solução 4: Usar Nixpacks (Alternativa)

Se o Dockerfile não funcionar, tente usar Nixpacks:

1. No Coolify, mude **Build Pack** para `Nixpacks`
2. O arquivo `nixpacks.toml` já foi criado e deve funcionar

**Configuração Nixpacks:**
```
Base Directory: /backend
Build Pack: Nixpacks
Port: 8000
```

### Solução 5: Build Command Manual (Nixpacks)

Se usar Nixpacks, configure:

**Build Command:**
```bash
pip install --upgrade pip && pip install -r requirements.txt && mkdir -p uploads/logos uploads/banners
```

**Start Command:**
```bash
python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
```

---

## 🔍 Verificações

### 1. Verificar se requirements.txt existe

```bash
ls -la backend/requirements.txt
```

Deve mostrar o arquivo.

### 2. Verificar conteúdo do requirements.txt

```bash
cat backend/requirements.txt
```

Deve listar todas as dependências, incluindo `fastapi==0.115.0`.

### 3. Verificar Dockerfile

O Dockerfile deve ter:
```dockerfile
COPY requirements.txt .
RUN pip install -r requirements.txt
```

---

## 🎯 Configuração Recomendada no Coolify

### Opção A: Dockerfile (Recomendado)

```
Repository: https://github.com/ronaldoarch/fortunevegas
Branch: cloudflare-deploy
Base Directory: /backend
Build Pack: Dockerfile    ← IMPORTANTE!
Port: 8000
```

### Opção B: Nixpacks

```
Repository: https://github.com/ronaldoarch/fortunevegas
Branch: cloudflare-deploy
Base Directory: /backend
Build Pack: Nixpacks
Port: 8000
Build Command: pip install --upgrade pip && pip install -r requirements.txt && mkdir -p uploads/logos uploads/banners
Start Command: python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
```

---

## 📝 Checklist

- [ ] `requirements.txt` existe em `/backend/requirements.txt`
- [ ] `Dockerfile` existe em `/backend/Dockerfile`
- [ ] Build Pack está configurado corretamente (Dockerfile ou Nixpacks)
- [ ] Base Directory está como `/backend`
- [ ] Build logs mostram instalação do pip
- [ ] Fez Clean Build após mudanças

---

## 🚀 Próximos Passos

1. Verifique os **Build Logs** no Coolify
2. Confirme que o **Build Pack** está correto
3. Tente **Clean Build** + **Redeploy**
4. Se não funcionar, tente usar **Nixpacks** como alternativa
