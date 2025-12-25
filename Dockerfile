# Use Node.js 18 as the base image
FROM node:18-slim

# Install Python 3, pip, Nginx, and build essentials
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# --- LAYER 1: INSTALL BACKEND DEPENDENCIES ---
# We copy requirements first to cache them (speeds up build)
COPY servers/fastapi/requirements.txt ./servers/fastapi/
# Install Python dependencies globally
RUN pip3 install --no-cache-dir -r servers/fastapi/requirements.txt --break-system-packages

# --- LAYER 2: INSTALL FRONTEND DEPENDENCIES ---
COPY servers/nextjs/package*.json ./servers/nextjs/
RUN cd servers/nextjs && npm install

# --- LAYER 3: COPY APP CODE & BUILD ---
COPY . .

# Build the Next.js frontend
RUN cd servers/nextjs && npm run build

# --- LAYER 4: CONFIGURE NGINX ---
# Ensure www-data (Nginx user) can access the files
RUN chown -R www-data:www-data /var/lib/nginx
RUN touch /run/nginx.pid && chown -R www-data:www-data /run/nginx.pid

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start the orchestrator
CMD ["node", "start.js"]
