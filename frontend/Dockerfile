# Dockerfile para Frontend React + Vite
FROM node:22-alpine AS builder

WORKDIR /app

# Argumentos de build - VITE_API_URL vazio = usa proxy /api (mesma origem, sem CORS)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

# Copiar arquivos de dependências
COPY package.json ./
COPY package-lock.json* ./

# Instalar dependências (npm install funciona mesmo sem package-lock.json)
RUN npm install --frozen-lockfile || npm install

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
