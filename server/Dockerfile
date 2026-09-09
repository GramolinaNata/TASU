# bookworm, а не bullseye: репозиторий bullseye-security больше не отдаёт
# пакеты, и apt-get в сборке падал с кодом 100 — Railway не мог собрать образ.
FROM node:20-bookworm-slim AS build

WORKDIR /app

# openssl нужен ИМЕННО ЗДЕСЬ, а не только в финальном образе. Prisma
# определяет версию libssl во время `prisma generate` и под неё кладёт движок;
# binaryTargets в schema.prisma не заданы, значит цель выбирается на месте.
# Без openssl в этой стадии берётся умолчание debian-openssl-1.1.x, и на
# bookworm (libssl3) контейнер падает на старте: «could not locate the Query
# Engine for debian-openssl-3.0.x ... was generated for debian-openssl-1.1.x».
# Стадия сборки и финальный образ обязаны видеть один и тот же openssl.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript -> dist
RUN npm run build

FROM node:20-bookworm-slim

WORKDIR /app

# Ensure OpenSSL is available for Prisma engines
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy built artifacts and node_modules
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json package-lock.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run migrations then start API
CMD ["sh", "-c", "npm run migrate && npm run start"]
