# ── FASE 1: Build ──────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Copia dependencias primero (cachea node_modules)
COPY package*.json ./
RUN npm ci --silent

# Argumentos de build (los pasa el docker-compose)
ARG VITE_API_BASE_URL
ARG VITE_APP_VERSION
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Copia el código y construye
COPY . .
RUN npm run build

# ── FASE 2: Runtime ────────────────────────────────────
FROM nginx:stable-alpine AS runtime

# Elimina la config por defecto de nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia config personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia el build de Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]