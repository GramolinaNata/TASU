// Кабинеты ролей движения груза.
//
// ЧЕТЫРЕ КАБИНЕТА — ОДИН ЭКРАН. Кладовщик, местный курьер, региональный курьер
// и операционный менеджер делают одно и то же: смотрят свой груз и отмечают
// свои шаги. Различаются заголовком, областью видимости и набором кнопок —
// это данные, а не код. Четыре почти одинаковые страницы разъехались бы уже
// на второй правке.
//
// ⚠️ ЗЕРКАЛО СЕРВЕРА: server/src/controllers/request.controller.ts
// (CABINET_SCOPE в getCabinetRequests). Область видимости проверяется НА
// СЕРВЕРЕ — здесь она нужна для показа и для подписи «город не назначен».
// ПРИ ПРАВКЕ МЕНЯТЬ В ДВУХ МЕСТАХ.

import { ROLE } from '../auth/roles.js';
import { CARGO_FLOW_KEYS, allowedNextCargoStatuses } from './cargoStatus.js';

/**
 * ПО КАКОМУ ГОРОДУ РОЛЬ ВИДИТ ГРУЗ.
 *
 * 'fromCity' — город отправления: там стоит склад и работает местный курьер,
 *              они имеют дело с грузом ДО отправки;
 * 'toCity'   — город назначения: там принимает и выдаёт региональный курьер;
 * 'all'      — без ограничения по городу (операционный менеджер).
 *
 * Существующая роль COURIER продолжает считаться по своему правилу в
 * courierCity.js (там toCity) — оно не менялось.
 */
export const CABINETS = {
  [ROLE.WAREHOUSE_KEEPER]: {
    path: '/cabinet/warehouse',
    title: 'Склад',
    subtitle: 'Приёмка и отпуск груза',
    icon: '🏬',
    scope: 'fromCity',
    steps: ['wh_accepted', 'wh_released'],
  },
  [ROLE.COURIER_LOCAL]: {
    path: '/cabinet/courier',
    title: 'Местный курьер',
    subtitle: 'Забор груза и погрузка на фуру',
    icon: '🛵',
    scope: 'fromCity',
    steps: ['courier_took', 'loaded'],
  },
  [ROLE.COURIER_REGION]: {
    path: '/cabinet/region',
    title: 'Региональный курьер',
    subtitle: 'Приёмка в регионе и выдача получателю',
    icon: '🚐',
    scope: 'toCity',
    // ЗАКРЕПЛЕНИЯ ГРУЗА ЗА ЧЕЛОВЕКОМ ПОКА НЕТ: видно весь груз своего города
    // назначения. Персональная привязка — отдельный шаг, там появится поле в
    // накладной и экран назначения у операционного менеджера.
    steps: ['region_took', 'delivered'],
  },
  [ROLE.OPS_MANAGER]: {
    path: '/cabinet/ops',
    title: 'Операционный контроль',
    subtitle: 'Все этапы движения груза',
    icon: '🗺️',
    scope: 'all',
    // Все шаги маршрута: роль контролирует цепочку целиком и правит чужие
    // промахи (она же единственная новая роль в CARGO_REVERT_ROLES).
    steps: CARGO_FLOW_KEYS,
    showJournal: true,
  },
};

export function cabinetFor(role) {
  return CABINETS[role] || null;
}

/** Все пути кабинетов — для маршрутизации. */
export const CABINET_ROUTES = Object.entries(CABINETS).map(([role, cfg]) => ({ role, ...cfg }));

/**
 * Кнопки, которые кабинет показывает для конкретной накладной.
 *
 * Пересечение двух ограничений: что вообще разрешено роли из текущего статуса
 * (движок, allowedNextCargoStatuses) И что входит в набор кабинета. Движок
 * шире набора намеренно — например, кладовщику разрешена и погрузка на фуру,
 * но в его кабинете кнопки погрузки нет: это дело курьера, а не склада.
 * Сервер при этом проверяет ШИРОКОЕ правило — кабинет сужает, а не расширяет.
 */
export function cabinetActions(cabinet, currentStatus, role) {
  if (!cabinet) return [];
  const allowed = allowedNextCargoStatuses(currentStatus, role);
  return allowed.filter((s) => cabinet.steps.includes(s));
}

/** Город роли, по которому она видит груз ('all' — город не нужен). */
export function cabinetCityField(role) {
  return CABINETS[role]?.scope || 'all';
}
