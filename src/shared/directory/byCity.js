// ============================================================
// Привязка справочников (перевозчики / представители) к городам.
//
// Один перевозчик может обслуживать несколько городов, и в одном городе может
// быть несколько перевозчиков. Список городов хранится в поле `cities`
// (JSON-массив строк). Старое одиночное поле `city` осталось для записей,
// заведённых до появления списка: читаем cities ?? [city].
//
// Правило выбора (согласовано с заказчиком): фильтрация, а не жёсткая привязка.
// Если за городом никто не закреплён — показываем весь справочник, чтобы не
// блокировать работу, и помечаем это флагом isFiltered=false.
// ============================================================

import { cleanCityName } from "../tariff/calcTariff.js";

// Города обслуживания одной записи справочника → массив строк (как введены).
// Поддерживаются: массив, JSON-строка, строка через запятую (легаси-ввод),
// и fallback на одиночное поле city.
export function entityCities(item) {
  if (!item) return [];
  const raw = item.cities;
  let list = [];

  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    const s = raw.trim();
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = s.split(",");
      }
    } else {
      list = s.split(",");
    }
  }

  list = list.map((x) => String(x == null ? "" : x).trim()).filter(Boolean);

  // Записи до появления списка: единственный город лежит в city.
  if (list.length === 0 && item.city) {
    const single = String(item.city).trim();
    if (single) list = [single];
  }
  return list;
}

// Обслуживает ли запись справочника данный город.
export function servesCity(item, city) {
  const target = cleanCityName(city);
  if (!target) return false;
  return entityCities(item).some((c) => cleanCityName(c) === target);
}

// Основной хелпер выбора. Возвращает:
//   list       — что показывать в селекте
//   matched    — сколько записей реально закреплено за городом
//   isFiltered — список действительно сужен (false = показан весь справочник)
//   autoPick   — единственная закреплённая запись (её можно подставить сразу),
//                иначе null: при нескольких кандидатах выбор делает человек
export function filterByCity(items, city) {
  const all = Array.isArray(items) ? items : [];
  const target = cleanCityName(city);

  // Город не выбран — фильтровать не по чему.
  if (!target) return { list: all, matched: 0, isFiltered: false, autoPick: null };

  const matchedList = all.filter((i) => servesCity(i, city));

  // За городом никто не закреплён → fallback на весь справочник.
  if (matchedList.length === 0) {
    return { list: all, matched: 0, isFiltered: false, autoPick: null };
  }

  return {
    list: matchedList,
    matched: matchedList.length,
    isFiltered: true,
    autoPick: matchedList.length === 1 ? matchedList[0] : null,
  };
}

// Текст-подсказка под селектом. Один источник формулировок на все три места,
// чтобы ведомость и форма партии не расходились в словах.
export function cityHint(result, city, kindPlural = "перевозчики") {
  const name = String(city || "").trim();
  if (!name) return "";
  if (!result.isFiltered) return `За городом «${name}» никто не закреплён — показаны все ${kindPlural}.`;
  if (result.autoPick) return `Подставлен по городу «${name}» — можно сменить.`;
  return `Показаны закреплённые за городом «${name}» (${result.matched}).`;
}
