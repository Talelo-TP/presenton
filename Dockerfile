FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    nginx \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend Deps
COPY servers/fastapi/requirements.txt ./servers/fastapi/
RUN pip3 install --no-cache-dir -r servers/fastapi/requirements.txt --break-system-packages

# Frontend Deps
COPY servers/nextjs/package*.json ./servers/nextjs/
RUN cd servers/nextjs && npm install

# Copy all code
COPY . .

# Build Frontend
RUN cd servers/nextjs && npm run build

# Nginx setup
RUN chown -R www-data:www-data /var/lib/nginx
RUN touch /run/nginx.pid && chown -R www-data:www-data /run/nginx.pid

EXPOSE 8080
CMD ["node", "start.js"]
