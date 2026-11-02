# ==============================================================================
# Dockerfile Multietapa para FerreMax SaaS / White-Label (Producción)
# ==============================================================================

# ETAPA 1: Construcción y compilación de TypeScript
FROM node:20-alpine AS builder

WORKDIR /build

# Instalar dependencias necesarias para compilar módulos nativos
RUN apk add --no-cache openssl python3 make g++

# Copiar archivos de dependencias del backend
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

WORKDIR /build/backend
RUN npm ci

# Generar cliente de Prisma ORM
RUN npx prisma generate

# Copiar código fuente y compilar TypeScript
COPY backend/tsconfig.json ./
COPY backend/src ./src/
RUN npm run build

# ==============================================================================
# ETAPA 2: Imagen final de ejecución ultraligera (Producción)
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Instalar OpenSSL para SQLite y utilidades esenciales
RUN apk add --no-cache openssl ca-certificates tzdata

ENV NODE_ENV=production
ENV PORT=4000
ENV PROJECT_ROOT=/app

# Copiar dependencias de producción compiladas
COPY --from=builder /build/backend/node_modules ./backend/node_modules
COPY --from=builder /build/backend/dist ./backend/dist
COPY --from=builder /build/backend/package*.json ./backend/
COPY --from=builder /build/backend/prisma ./backend/prisma

# Copiar la aplicación web estática frontend
COPY *.html ./

# Crear directorios para datos persistentes (volúmenes de Docker)
RUN mkdir -p /app/data /app/uploads /app/backups

# Exponer el puerto del servidor
EXPOSE 4000

# Script de arranque: ejecuta migraciones y luego arranca el servidor
WORKDIR /app/backend
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
