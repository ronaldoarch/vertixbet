# Dockerfile para Frontend React + Vite
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências (garantir que ambos sejam copiados)
COPY package.json package-lock.json* ./

# Instalar dependências (npm ci se tiver lock, senão npm install)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Imagem final para produção
FROM nginx:alpine

# Copiar arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta
EXPOSE 80

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
