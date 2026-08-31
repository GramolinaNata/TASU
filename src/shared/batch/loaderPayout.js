// ============================================================
// Выплата грузчикам по партии.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Формула жила ровно в одном месте — на экране
// формирования ведомости перевозчика (CarrierVedomostCreatePage), где сумма
// считается и уходит в снапшот ведомости. Отчёт бухгалтера читал ТОЛЬКО этот
// снапшот, поэтому у партии БЕЗ ведомости в графе «Грузчикам» стоял ноль:
// грузчики на партии назначены (loadersCount), тариф по городу заведён, а
// сумма нигде не считалась. Заказчик это и увидел — «грузчиков в отчёте нет».
//
// Формула вынесена сюда дословно и накрыта тестом: на ней реальные выплаты
// людям, и расходиться двум её копиям нельзя.
// ============================================================
import { cleanCityName, getTariffCategory } from "../tariff/calcTariff.js";

function toNum(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Тариф грузчиков по городу партии.
 *
 * ПРО ОЧИСТКУ ГОРОДА. На экране ведомости лежала своя укороченная копия
 * cleanCityName (без суффиксов __CITYDELIVERY/__REGIONDELIVERY/__AVIA).
 * Здесь взята общая из calcTariff. Для грузчиков разницы нет: отбор идёт
 * сначала по категории 'loaders', а у таких тарифов город несёт суффикс
 * __LOADERS, который снимают обе версии одинаково.
 */
export function findLoaderTariff(tariffs, city) {
  const cityClean = cleanCityName(city);
  return (Array.isArray(tariffs) ? tariffs : []).find(
    (t) => getTariffCategory(t) === "loaders" && cleanCityName(t.city) === cityClean
  ) || null;
}

/**
 * Сумма грузчикам: вес партии × ставка за килограмм по городу.
 *
 * Количество грузчиков — ВЫКЛЮЧАТЕЛЬ, а не множитель: ставка pricePerKg в
 * тарифе задана на партию. Так считает ведомость, и менять это здесь нельзя —
 * иначе отчёт разойдётся с тем, что людям уже выплатили.
 *
 * @returns {{sum: number, rate: number, known: boolean}}
 *   known = false — грузчики назначены, но тарифа по городу нет. Это НЕ ноль:
 *   ноль означал бы «работали бесплатно», а тут сумма просто не известна, и
 *   отчёт обязан показать это иначе, чем честный ноль.
 */
export function loaderPayout({ loadersCount, weight, city, tariffs }) {
  const count = toNum(loadersCount);
  if (count <= 0) return { sum: 0, rate: 0, known: true };

  const tariff = findLoaderTariff(tariffs, city);
  if (!tariff) return { sum: 0, rate: 0, known: false };

  const rate = toNum(tariff.pricePerKg);
  return { sum: Math.round(toNum(weight) * rate), rate, known: true };
}

/**
 * Зафиксировала ли ведомость сумму грузчиков.
 *
 * Наличия строки в ведомости НЕ ДОСТАТОЧНО. Если на момент формирования тарифа
 * грузчиков по городу не было, в строку пишется loaderSum: 0 и loaderMissing:
 * true — суммы там нет, есть отметка «посчитать не удалось». Отчёт, принимая
 * такую строку за факт, показывал «0 тг» при назначенных грузчиках, то есть
 * «работали бесплатно». Проверено на данных: партия П000006 (город «вапвап»,
 * 3 грузчика, 3453 кг), снапшот ВП000005 — ставка 0, сумма 0, loaderMissing.
 *
 * У СТАРЫХ ведомостей флага loaderMissing нет вовсе (в ВП000001 и ВП000002 нет
 * даже loaderRate). Для них тот же вывод делается по факту: грузчики назначены,
 * а положительной ставки в строке нет — значит фиксировать было нечего.
 *
 * Ноль грузчиков — это ЗАФИКСИРОВАННЫЙ ноль: грузчиков не было, ставка и не
 * нужна, и «—» вместо честного нуля тут было бы враньём в другую сторону.
 */
export function loaderFixedByVedomost(vedRow) {
  if (!vedRow) return false;
  if (vedRow.loaderMissing === true) return false;
  const count = toNum(vedRow.loadersCount);
  if (count === 0) return true;
  return toNum(vedRow.loaderRate) > 0;
}
