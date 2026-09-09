# ============================================================
# ЕДИНЫЙ образ: фронт и бэк из одного коммита, в одном контейнере.
#
# ЗАЧЕМ. Раньше это были два сервиса Railway, оба на авто-деплое из main.
# Собирались они с разной скоростью (фронт — vite build, бэк — npm ci +
# prisma generate + tsc), поэтому новый фронт выходил в прод раньше нового
# бэка и звал маршруты, которых там ещё не было. Один образ убирает саму
# возможность разъехаться: версия физически одна.
#
# Старые Dockerfile.web, server/Dockerfile и Dockerfile.railway НЕ трогаем —
# на них держатся текущие сервисы, и в них же откат.
# ============================================================

# ── 1. Фронт ────────────────────────────────────────────────
FROM node:20-bookworm-slim AS web-build
WORKDIR /app
# Порядок важен: корневой postinstall запускает
# `prisma generate --schema=server/prisma/schema.prisma`, поэтому схема
# обязана лежать в образе ДО npm ci. Ровно так же сделано в рабочем
# Dockerfile.web — кэш слоёв тут приносится в жертву осознанно.
COPY . .
RUN npm ci
# ОТНОСИТЕЛЬНЫЙ путь вместо вшитого боевого адреса. Раньше в Dockerfile.railway
# стояло ENV VITE_API_URL=https://tasu-production.up.railway.app/api, и адрес
# запекался в бандл — любая сборка, включая превью, била в боевой API.
# Теперь фронт и API за одним nginx, и относительного пути достаточно.
ENV VITE_API_URL=/api
RUN npm run build

# ── 2. Бэк ──────────────────────────────────────────────────
FROM node:20-bookworm-slim AS api-build
# openssl нужен ИМЕННО ЗДЕСЬ, а не только в финальном образе.
# Prisma определяет версию libssl во время `prisma generate` и под неё
# кладёт движок. Без openssl в этой стадии версия не определялась, бралось
# умолчание debian-openssl-1.1.x — и контейнер падал на старте:
# «could not locate the Query Engine for debian-openssl-3.0.x ... was
# generated for debian-openssl-1.1.x». Стадия сборки и финальный образ
# обязаны видеть один и тот же openssl.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
# npm run build = prisma generate && tsc
RUN npm run build

# ── 3. Итоговый образ ───────────────────────────────────────
# Debian-slim, а не alpine: на этой же базе собран рабочий server/Dockerfile,
# и совместимость Prisma с openssl там уже проверена в бою. Менять базу
# заодно с архитектурой — заводить второй источник проблем.
FROM node:20-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      nginx openssl ca-certificates gettext-base curl \
 && rm -rf /var/lib/apt/lists/* \
 # Дефолтный сайт Debian слушает 80 и перехватил бы наш конфиг.
 && rm -f /etc/nginx/sites-enabled/default

WORKDIR /app

# Бэк: собранный код, зависимости и схема (Prisma читает её в рантайме).
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/dist ./dist
COPY --from=api-build /app/prisma ./prisma
COPY server/package.json ./package.json

# Фронт: статика под nginx.
COPY --from=web-build /app/dist /usr/share/nginx/html

COPY nginx.single.conf /etc/nginx/templates/app.conf.template
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
# Порт снаружи. На Railway переопределяется переменной PORT.
ENV PORT=80
EXPOSE 80

# Миграций при старте НЕТ намеренно. Прежний CMD был
# `npm run migrate && npm run start`: неудачная миграция не давала запуститься
# node, сервис уходил в рестарт-петлю, а обновлённый фронт оставался смотреть
# в мёртвый API. На этом проекте миграции к тому же сломаны (есть откаченная
# baseline), схему катаем `prisma db push` вручную.
CMD ["/usr/local/bin/docker-entrypoint.sh"]
