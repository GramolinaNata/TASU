# Проект ТАСУ — CRM для логистики (Казахстан)

## Стек
Vite 7 + React 19 + Express + Prisma 5.22 + Postgres. Бэк в server/ (TypeScript).

## Сборка и запуск
- Фронт: npm run build → docker compose up -d --build web
- Бэк: docker compose up -d --build api
- После сборки ОБЯЗАТЕЛЬНО Ctrl+Shift+R в браузере (иначе старый кэш)

## ПРАВИЛО: авто-сборка фронта
После КАЖДОЙ правки фронта (файлы в src/) Claude сам запускает:
  npm run build; docker compose up -d --build web
и сообщает пользователю, когда готово. Не ждать отдельной просьбы.
- Прод на Railway, деплой автоматически по git push
- Прод-база обновляется через npx prisma db push (миграции сломаны — есть битая 20260310225022_add_contracts_v2 с повторным CREATE TABLE "User")

## ВАЖНО при правках
В файлах есть закомментированные копии кода (мёртвые блоки). Перед изменением
проверяй, что редактируешь ЖИВОЙ блок, а не закомментированный.
Особенно: SentToAccountantPage.jsx, TariffsPage.jsx, BatchesPage.jsx

## Ключевые файлы
- Движок тарифов: src/shared/tariff/calcTariff.js
- Тарифы: src/pages/admin/TariffsPage.jsx
- Партии: src/pages/simple/BatchesPage.jsx
- Детали партии и печать ведомостей: src/pages/simple/BatchDetailPage.jsx
- Накладные частных: src/pages/simple/SimpleActsListPage.jsx
- Отчёт бухгалтера: BookkeeperReportPage.jsx
- Аналитика: src/pages/admin/AdminStatsPage.jsx

## Язык
Отвечать по-русски.
