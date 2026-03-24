# ---- Stage 1: Serveur Node ----
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .

# ---- Stage 2: Runtime (nginx + node) ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache nginx

WORKDIR /app

# Serveur Node
COPY --from=server-build /app/server ./server

# Frontend statique
COPY index.html manifest.json sw.js ./
COPY css/   ./css/
COPY js/    ./js/
COPY icons/ ./icons/

# Config nginx
COPY nginx.conf /etc/nginx/http.d/default.conf

# Script de démarrage
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 80

CMD ["sh", "/app/start.sh"]
