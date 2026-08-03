// ============================================================
// Подбор контрагента для инлайн-подсказки в форме заявки.
// Вынесено из CounterpartyField отдельным модулем, чтобы покрыть тестами:
// от того, находится ли контрагент по номеру телефона, зависит, будет ли
// менеджер плодить дубли (ради этого правка и делалась).
// ============================================================

export const digits = (s) => String(s || "").replace(/\D/g, "");

export const MIN_QUERY = 2;      // с одной буквы подсказка вываливает весь справочник
export const MIN_PHONE_DIGITS = 3; // по одной-двум цифрам совпадёт пол-базы
export const MAX_HINTS = 8;

// Совпадение по имени, названию компании, БИН и телефону.
// Телефон сравниваем по цифрам: в базе он записан в разных форматах
// (+7 777 123 45 67, 87771234567, 7771234567) — иначе поиск по номеру не работает.
// Подстрокой, а не с начала: менеджер часто помнит только хвост номера.
export function matches(cp, query) {
  if (!cp) return false;
  const q = String(query || "").trim().toLowerCase();
  if (q.length < MIN_QUERY) return false;

  const inText =
    String(cp.name || "").toLowerCase().includes(q) ||
    String(cp.companyName || "").toLowerCase().includes(q) ||
    String(cp.bin || "").includes(q);

  const qd = digits(q);
  const inPhone =
    qd.length >= MIN_PHONE_DIGITS &&
    (digits(cp.phone).includes(qd) || digits(cp.contactPhone).includes(qd));

  return inText || inPhone;
}

export function findCounterpartyHints(items, query) {
  if (String(query || "").trim().length < MIN_QUERY) return [];
  return (items || []).filter((cp) => matches(cp, query)).slice(0, MAX_HINTS);
}

// Вторая строка подсказки — то, по чему человек отличает двух Ивановых.
export function subtitle(cp) {
  return [cp?.companyName, cp?.phone, cp?.bin && `БИН ${cp.bin}`]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" · ");
}
