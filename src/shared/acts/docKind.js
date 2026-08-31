// Какой перевозочный документ нужен направлению.
//
// ТЗ: перевозки по Казахстану оформляются СМР, перевозки в Россию — ТТН.
//
// ОТКУДА БЕРЁТСЯ СТРАНА. Из тарифа направления (weightRanges._country).
// Список городов назначения в заявке и так строится из тарифов
// (getDeliveryDestinations), поэтому достаточно один раз отметить российские
// направления в справочнике — и выбор документа станет автоматическим для
// всех заявок по ним. Альтернативы хуже: поле «страна» в самой заявке
// заполняет менеджер и рано или поздно ошибётся, а словарь «город → страна»
// в коде сломается на первом же новом городе.
//
// ЧТО ЭТОТ МОДУЛЬ НЕ ДЕЛАЕТ. Он не выбирает документ за менеджера, а
// ПОДСКАЗЫВАЕТ. Тип документа управляет не только печатью, но и разделом
// (/smr против /requests) и путём экспорта; отнимать ручной выбор на основе
// одной галочки в справочнике нельзя — первая же неверно заведённая страна
// заблокировала бы работу по направлению.

import { cleanCityName, getTariffCategory, getTariffCountry, getTariffTransport, DEFAULT_FROM_CITY } from '../tariff/calcTariff.js';

export const COUNTRY = { KZ: 'KZ', RU: 'RU' };

export const COUNTRY_LABELS = {
  [COUNTRY.KZ]: 'Казахстан',
  [COUNTRY.RU]: 'Россия',
};

/** Документ по стране назначения. */
export const DOC_BY_COUNTRY = {
  [COUNTRY.KZ]: 'smr',
  [COUNTRY.RU]: 'ttn',
};

export const DOC_LABELS = { smr: 'СМР', ttn: 'ТТН' };

export function isKnownCountry(v) {
  return v === COUNTRY.KZ || v === COUNTRY.RU;
}

export function countryLabel(v) {
  return COUNTRY_LABELS[v] || COUNTRY_LABELS[COUNTRY.KZ];
}

/**
 * Страна города назначения по справочнику тарифов.
 *
 * Ищем тариф доставки на этот город. Направление (fromCity) учитываем, если
 * оно задано: один и тот же город может быть заведён из разных пунктов
 * отправления, но страна у него от этого не меняется — поэтому при промахе
 * по паре берём любой тариф с таким городом назначения.
 *
 * @returns {{country: string, source: 'tariff'|'default', tariff?: object}}
 */
export function countryForCity(tariffs, cityRaw, fromCityRaw, category) {
  const clean = cleanCityName(cityRaw);
  if (!clean) return { country: COUNTRY.KZ, source: 'default' };

  const inScope = (t) => {
    const cat = getTariffCategory(t);
    if (cat !== 'legal' && cat !== 'private') return false;
    if (category && cat !== category) return false;
    return cleanCityName(t.city) === clean;
  };

  const list = (tariffs || []).filter(inScope);
  if (!list.length) return { country: COUNTRY.KZ, source: 'default' };

  // Точное совпадение по паре направлений приоритетнее.
  const cleanFrom = cleanCityName(fromCityRaw) || cleanCityName(DEFAULT_FROM_CITY);
  const exact = list.find((t) => (cleanCityName(t.fromCity) || cleanCityName(DEFAULT_FROM_CITY)) === cleanFrom);
  const t = exact || list[0];
  return { country: getTariffCountry(t), source: 'tariff', tariff: t };
}

/**
 * Рекомендованный документ для направления.
 *
 * @returns {{kind: 'smr'|'ttn', country: string, source: string, reason: string}}
 */
export function docKindForRoute(tariffs, route = {}, category) {
  const { country, source, tariff } = countryForCity(tariffs, route.toCity, route.fromCity, category);
  const kind = DOC_BY_COUNTRY[country];
  const to = String(route.toCity || '').trim() || '—';

  const reason = source === 'tariff'
    ? `${to} — ${countryLabel(country)} (по справочнику тарифов): ${DOC_LABELS[kind]}`
    // Тариф не найден — страну не знаем. Говорим об этом прямо, а не выдаём
    // умолчание за факт: иначе менеджер решит, что система «проверила».
    : `Направление «${to}» в тарифах не найдено — страна не определена. По умолчанию Казахстан: ${DOC_LABELS[kind]}`;

  return { kind, country, source, reason, tariff };
}

/** Совпадает ли уже выбранный тип документа с рекомендованным. */
export function docKindMatches(act, recommendedKind) {
  const cur = String(act?.docType || act?.type || '').toLowerCase();
  if (cur !== 'ttn' && cur !== 'smr') return null; // документа ещё нет
  return cur === recommendedKind;
}
