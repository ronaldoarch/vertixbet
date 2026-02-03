# Configuração de Volume Persistente para Banners e Logos

Este guia explica como configurar o armazenamento persistente para que banners e logos não sejam perdidos durante atualizações do backend.

## 📍 Localização dos Arquivos

Os arquivos de mídia (banners e logos) são salvos em:
- **Dentro do container**: `/app/uploads/`
  - Logos: `/app/uploads/logos/`
  - Banners: `/app/uploads/banners/`

## 🔧 Configuração no Coolify (ou plataforma similar)

### Passo 1: Acessar a Configuração de Volumes

1. Acesse o serviço do **backend** no Coolify
2. Vá para a aba **"Advanced"** ou **"Volumes"**
3. Clique em **"Add Volume Mount"**

### Passo 2: Preencher os Campos do Volume Mount

No modal **"Add Volume Mount"**, preencha:

#### **Name** (obrigatório):
```
media-storage
```
ou qualquer nome descritivo como `vertixbet-media` ou `uploads-persistent`

#### **Source Path** (opcional):
Deixe vazio ou use um caminho no host se necessário. O Coolify geralmente gerencia isso automaticamente quando você usa um nome de volume.

#### **Destination Path** (obrigatório):
```
/app/uploads
```
⚠️ **IMPORTANTE**: Este é o caminho dentro do container onde os arquivos serão salvos. Deve ser exatamente `/app/uploads`.

### Passo 3: Salvar e Reiniciar

1. Clique em **"Add"** para salvar o volume mount
2. Reinicie o serviço backend (botão **"Restart"** ou **"Redeploy"**)

## ✅ Verificação

Após configurar o volume:

1. Faça upload de um logo ou banner pelo painel admin
2. Verifique se o arquivo aparece corretamente
3. Faça um redeploy do backend
4. Verifique novamente - os arquivos devem continuar disponíveis

## 🔍 Estrutura Esperada

Após a configuração, a estrutura dentro do container será:
```
/app/
├── uploads/          ← Volume montado (persistente)
│   ├── logos/
│   │   └── [arquivos de logo]
│   └── banners/
│       └── [arquivos de banner]
├── main.py
├── routes/
└── ...
```

## ⚠️ Notas Importantes

1. **Primeira Configuração**: Se você já tem arquivos salvos antes de configurar o volume, eles serão perdidos no primeiro deploy. Faça backup se necessário.

2. **Arquivos Perdidos**: Se você está vendo erros 404 ao tentar carregar logos/banners, isso significa que os arquivos foram perdidos em um deploy anterior. Após configurar o volume persistente, você precisará fazer upload novamente dos arquivos pelo painel admin.

2. **Permissões**: O Dockerfile já cria os diretórios com permissões corretas (`chmod -R 755 uploads`), então não deve haver problemas de permissão.

3. **Backup**: Mesmo com volume persistente, é recomendado fazer backup periódico dos arquivos importantes.

4. **Múltiplos Containers**: Se você usar múltiplas instâncias do backend, certifique-se de que todas compartilham o mesmo volume ou use um storage compartilhado (NFS, S3, etc.).

## 🚨 Troubleshooting

### Arquivos não persistem após deploy

- Verifique se o **Destination Path** está correto: `/app/uploads`
- Verifique se o volume foi criado corretamente no Coolify
- Verifique os logs do container para erros de permissão

### Erro de permissão ao fazer upload

- O Dockerfile já configura permissões, mas se houver problemas, você pode precisar ajustar as permissões do volume no host

### Volume não aparece na lista

- Certifique-se de que salvou o volume mount corretamente
- Verifique se o serviço foi reiniciado após adicionar o volume
