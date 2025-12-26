FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    nginx \
    build-essential \
    libreoffice \
    fontconfig \
    chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend Deps
RUN pip3 install --no-cache-dir --upgrade pip --break-system-packages
RUN pip3 install --no-cache-dir --break-system-packages \
    aiohttp \
    aiomysql \
    aiosqlite \
    asyncpg \
    fastapi[standard] \
    pathvalidate \
    pdfplumber \
    chromadb \
    sqlmodel \
    anthropic \
    google-genai \
    openai \
    fastmcp \
    dirtyjson \
    docling

# Frontend Deps
COPY servers/nextjs/package*.json ./servers/nextjs/
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN cd servers/nextjs && npm install

# Copy all code
COPY . .

# Build Frontend
RUN cd servers/nextjs && npm run build

ENV APP_DATA_DIRECTORY=/tmp/app_data
ENV TEMP_DIRECTORY=/tmp/presenton
ENV USER_CONFIG_PATH=/tmp/app_data/userConfig.json
ENV CAN_CHANGE_KEYS=false
ENV GOOGLE_MODEL_LIST_TIMEOUT_S=10
ENV STARTUP_STRICT_MODEL_CHECKS=false
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Nginx setup
COPY nginx.conf /etc/nginx/nginx.conf
RUN chown -R www-data:www-data /var/lib/nginx
RUN touch /run/nginx.pid && chown -R www-data:www-data /run/nginx.pid

EXPOSE 8080
CMD ["node", "start.js"]
