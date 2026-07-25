// Нормализация списка городов обслуживания для справочников
// (перевозчики / представители).
//
// В базе `cities` лежит JSON-массивом строк. С клиента может прийти массив,
// готовая JSON-строка или строка через запятую — приводим к одному виду.
// Старое одиночное поле `city` не удаляем: его читают места, ещё не знающие
// про список (fallback cities ?? [city]).

export function normalizeCities(input: any): string | undefined {
  if (input === undefined) return undefined;
  if (input === null) return '';

  let list: any[] = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return '';
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        list = Array.isArray(parsed) ? parsed : [];
      } catch {
        list = s.split(',');
      }
    } else {
      list = s.split(',');
    }
  } else {
    return '';
  }

  const clean: string[] = [];
  list.forEach((x) => {
    const v = String(x == null ? '' : x).trim();
    // Дубли по регистру не плодим: город в списке должен быть один раз.
    if (v && !clean.some((c) => c.toLowerCase() === v.toLowerCase())) clean.push(v);
  });
  return JSON.stringify(clean);
}

// Первый город списка — чтобы устаревшее поле `city` оставалось осмысленным
// для мест, которые ещё показывают его (подписи в селектах партии и т.п.).
export function primaryCity(citiesJson: string | undefined): string | undefined {
  if (citiesJson === undefined) return undefined;
  try {
    const arr = JSON.parse(citiesJson || '[]');
    return Array.isArray(arr) && arr.length > 0 ? String(arr[0]) : '';
  } catch {
    return '';
  }
}
