FROM node:20-bullseye-slim AS build

WORKDIR /app

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

FROM node:20-bullseye-slim

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
