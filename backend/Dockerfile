FROM python:3.12-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Criar diretórios de uploads
RUN mkdir -p uploads/logos uploads/banners && \
    chmod -R 755 uploads

# Variáveis de ambiente padrão (podem ser sobrescritas no Coolify)
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expor porta
EXPOSE 8000

# Comando para iniciar a aplicação
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
