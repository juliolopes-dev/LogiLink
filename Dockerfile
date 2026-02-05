# ============================================
# Dockerfile Único - LogiLink DRP System
# Backend (Node.js/Fastify) + Frontend (React/Vite)
# ============================================

# Estágio 1: Build do Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Argumentos para variáveis de ambiente do Firebase (passadas no build)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_VAPID_KEY

# Converter ARGs em variáveis de ambiente para o build do Vite
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY

# Copiar package.json e package-lock.json do frontend
COPY frontend/package*.json ./

# Instalar dependências do frontend
RUN npm ci

# Copiar código fonte do frontend
COPY frontend/ ./

# Build do frontend (gera arquivos estáticos em dist/)
RUN npm run build

# ============================================
# Estágio 2: Build do Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Instalar dependências do sistema necessárias para o Prisma
RUN apk add --no-cache openssl-dev

# Copiar package.json e package-lock.json do backend
COPY backend/package*.json ./

# Instalar dependências do backend
RUN npm ci

# Copiar código fonte do backend
COPY backend/ ./

# Gerar Prisma Client com a engine correta
RUN npx prisma generate

# Build do backend (compila TypeScript para JavaScript)
RUN npm run build

# ============================================
# Estágio 3: Imagem Final de Produção
FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema necessárias para o Prisma em runtime
RUN apk add --no-cache openssl

# Instalar apenas dependências de produção
COPY backend/package*.json ./
RUN npm ci --only=production

# Copiar Prisma schema e gerar client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copiar backend compilado do estágio anterior
COPY --from=backend-builder /app/backend/dist ./dist

# Copiar frontend buildado do estágio anterior
COPY --from=frontend-builder /app/frontend/dist ./public

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Mudar ownership dos arquivos
RUN chown -R nodejs:nodejs /app

# Usar usuário não-root
USER nodejs

# Expor porta do backend
EXPOSE 3000

# Variáveis de ambiente (serão sobrescritas no Easypanel)
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar o servidor
CMD ["node", "dist/server.js"]
