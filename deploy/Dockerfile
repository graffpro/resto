# Multi-stage build for QR Restaurant Management System

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN yarn install --production=false
COPY frontend/ ./
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

# Stage 2: Python backend + Nginx
FROM python:3.11-slim
WORKDIR /app

# Install nginx and supervisor
RUN apt-get update && apt-get install -y --no-install-recommends nginx supervisor && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/build /var/www/html

# Nginx config
COPY deploy/nginx.conf /etc/nginx/sites-available/default

# Supervisor config
COPY deploy/supervisord.conf /etc/supervisor/conf.d/app.conf

# Entrypoint script
COPY deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port 80
EXPOSE 80

CMD ["/app/entrypoint.sh"]
