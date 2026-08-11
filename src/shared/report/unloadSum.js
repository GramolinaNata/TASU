// ============================================================
// Сумма ВЫГРУЗКИ по накладной — для отчёта бухгалтера.
//
// ЗАЧЕМ. Выгрузка считается движком (ставка за место × количество мест) и
// попадает в сумму накладной. Но в отчёте она не видна: сидит внутри «Выручки»
// одним числом. Заказчик ищет её глазами и не находит.
//
// ПОЧЕМУ ЭТО НЕ ТАК ПРОСТО, КАК ВЕС. Вес отчёт уже считал и просто не выводил.
// Выгрузка НЕ ХРАНИТСЯ НИГДЕ: частная накладная сохраняет только итог
// (details = totals, totalSum, …), разбивки в ней нет. Поэтому значение
// приходится восстанавливать, и честность источника здесь важнее удобства.
//
// ДВА ИСТОЧНИКА, В ПОРЯДКЕ ДОВЕРИЯ:
//   1) exact — строка услуг с calcKey 'unload'. Это ровно то число, которое
//      вошло в сумму накладной. Есть у юрлиц, оформленных после того, как
//      расчёт стал раскладываться построчно.
//   2) estimate — пересчёт по ТЕКУЩЕМУ тарифу. Тарифы с тех пор могли
//      поменяться, поэтому число справочное. Отчёт обязан показать, что оно
//      восстановленное, — иначе бухгалтер примет оценку за факт.
//
// ЧТО ЭТОТ МОДУЛЬ НЕ ДЕЛАЕТ. Не трогает выручку, налоги и прибыль. Выгрузка
// УЖЕ ВНУТРИ выручки — прибавлять её куда-либо ещё значит задвоить.
// ============================================================

import { calcDeliveryPrice } from "../tariff/calcTariff.js";

export const UNLOAD_KEY = "unload";

function parse(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

/** Частная накладная — по типу или по признаку в details (как на бэке). */
export function isSimple(request) {
  const d = parse(request && request.details);
  return (request && request.type === "SIMPLE") || d.isSimple === true;
}

/**
 * Точное значение из сохранённой таблицы услуг.
 * @returns {number|null} null — строки нет, значит точного источника не будет.
 */
export function unloadFromServices(request) {
  const d = parse(request && request.details);
  const rows = Array.isArray(d.warehouseServices) ? d.warehouseServices : [];
  const hit = rows.filter(r => r && r.calcKey === UNLOAD_KEY);
  if (hit.length === 0) return null;
  // По названию НЕ ищем намеренно: у старых накладных вся расшифровка склеена
  // в одну строку («… + выгрузка 3 мест × 1 000 тг»), и её сумма — это ВЕСЬ
  // расчёт, а не выгрузка. Совпадение по слову дало бы 11 840 вместо 3 000.
  return hit.reduce((a, r) => a + num(r.total != null ? r.total : r.price), 0);
}

/**
 * Точное значение, сохранённое в самой накладной (details.unloadSum).
 *
 * Это источник для ЧАСТНЫХ: таблицы услуг у них нет, поэтому выгрузка пишется
 * отдельным полем в момент оформления — тем числом, которое движок положил
 * в сумму. Ноль тоже значимый ответ («тариф выгрузки не задан»), поэтому
 * отличаем отсутствие ключа от нуля.
 *
 * @returns {number|null}
 */
export function unloadFromField(request) {
  const d = parse(request && request.details);
  if (d.unloadSum == null || d.unloadSum === "") return null;
  const v = parseFloat(d.unloadSum);
  return Number.isFinite(v) ? v : null;
}

/**
 * Выгрузка по одной накладной.
 * @returns {{ sum: number, exact: boolean, known: boolean }}
 *   known=false — тариф не найден, показать «—», а не ноль: ноль означал бы
 *   «выгрузки не было», а мы просто не знаем.
 */
export function unloadOfRequest(request, tariffs) {
  // Поле накладной — самый точный источник: записано в момент оформления.
  const field = unloadFromField(request);
  if (field != null) return { sum: field, exact: true, known: true };

  const stored = unloadFromServices(request);
  if (stored != null) return { sum: stored, exact: true, known: true };

  const d = parse(request && request.details);
  const totals = d.totals || {};
  const seats = num(totals.seats);
  // Выгрузка = ставка × места. Нет мест — нечего считать, и это факт, а не
  // пробел: движок в таком случае строку выгрузки тоже не создаёт.
  if (seats <= 0) return { sum: 0, exact: false, known: true };

  const city = (d.route && d.route.toCity) || "";
  if (!city) return { sum: 0, exact: false, known: false };

  const res = calcDeliveryPrice({
    tariffs,
    city,
    fromCity: (d.route && d.route.fromCity) || "",
    weightKg: num(totals.weight),
    volumeM3: num(d.volumeM3),
    seats,
    category: isSimple(request) ? "private" : "legal",
    transport: d.transportType === "avia_console" ? "avia" : "auto",
  });
  if (!res.ok) return { sum: 0, exact: false, known: false };

  const line = (res.lines || []).find(l => l.key === UNLOAD_KEY);
  return { sum: line ? num(line.amount) : 0, exact: false, known: true };
}

/**
 * Выгрузка по списку накладных партии.
 * exact — все слагаемые точные; known — известно хотя бы что-то.
 */
export function unloadOfRequests(requests, tariffs) {
  let sum = 0, exact = true, known = false;
  for (const r of requests || []) {
    if (!r) continue;
    const u = unloadOfRequest(r, tariffs);
    if (!u.known) { exact = false; continue; }
    known = true;
    sum += u.sum;
    if (!u.exact) exact = false;
  }
  return { sum, exact, known };
}
