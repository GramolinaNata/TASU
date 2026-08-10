// Статус движения груза (сканирование QR).
//
// ЗАЧЕМ ОТДЕЛЬНОЕ ПОЛЕ. Движение груза и состояние документа — РАЗНЫЕ оси.
// Груз может быть «на фуре», пока накладная «Обработана» и «Оплачена» — это не
// противоречие. Существующий Request.status держит рабочий процесс документа
// (act/sent/done/deferred/canceled), на нём стоят вкладки частных и фильтры
// разделов: запиши туда «Забрано» — и накладная выпадет из всех вкладок сразу.
// Поэтому движение груза живёт в своём поле Request.cargoStatus.
//
// В коде уже была попытка писать 'Забрано'/'Доставлено' прямо в status
// (CourierActViewPage). В базе таких значений нет ни одного — функцией не
// пользовались, и коллизия не всплыла. Здесь она закрыта по построению.

/** Цепочка из ТЗ: водитель забрал → погрузил → представитель принял → выдал. */
export const CARGO_CHAIN = ['picked_up', 'loaded', 'rep_received', 'delivered'];

export const CARGO_STATUS = {
  NONE: '',
  PICKED_UP: 'picked_up',
  LOADED: 'loaded',
  REP_RECEIVED: 'rep_received',
  DELIVERED: 'delivered',
};

/** Подписи: в списке — короткая, на кнопке — действие. */
export const CARGO_LABELS = {
  '':             { short: 'Не в пути',              action: '' },
  picked_up:      { short: 'Забран у отправителя',   action: '📦 Забрал груз' },
  loaded:         { short: 'Погружен на фуру',       action: '🚛 Погрузил на фуру' },
  rep_received:   { short: 'У представителя',        action: '🤝 Представитель принял' },
  delivered:      { short: 'Выдан получателю',       action: '🏁 Выдал получателю' },
};

/**
 * Кто вправе двигать груз.
 *
 * ЭТАП 1: все шаги — COURIER, MANAGER, ADMIN. Роли «представитель» в системе
 * нет: представители лежат справочником (Representative), пользователями они не
 * являются. Разделение шагов по ролям отложено до этапа с личными кабинетами —
 * заводить роль сейчас значило бы угадывать её устройство наперёд.
 */
export const CARGO_ROLES = ['COURIER', 'MANAGER', 'ADMIN'];

/**
 * Кто вправе отменить последний шаг.
 *
 * Отмена нужна не «на будущее»: водитель сканирует наклейку на морозе, промах
 * по кнопке — обычное дело, а без отката груз навсегда останется «выданным».
 * Курьеру откат не даём — иначе смысл фиксации теряется.
 */
export const CARGO_REVERT_ROLES = ['MANAGER', 'ADMIN'];

export function isKnownCargoStatus(value) {
  return value === '' || CARGO_CHAIN.includes(value);
}

export function cargoLabel(status) {
  return (CARGO_LABELS[status] || CARGO_LABELS['']).short;
}

export function cargoActionLabel(status) {
  return (CARGO_LABELS[status] || CARGO_LABELS['']).action;
}

/** Следующий шаг цепочки. null — груз уже выдан. */
export function nextCargoStatus(current) {
  const cur = isKnownCargoStatus(current) ? current : '';
  if (cur === '') return CARGO_CHAIN[0];
  const i = CARGO_CHAIN.indexOf(cur);
  return i >= 0 && i < CARGO_CHAIN.length - 1 ? CARGO_CHAIN[i + 1] : null;
}

/** Предыдущий шаг — для отмены ошибочного скана. */
export function prevCargoStatus(current) {
  const i = CARGO_CHAIN.indexOf(current);
  if (i < 0) return null;
  return i === 0 ? '' : CARGO_CHAIN[i - 1];
}

/**
 * Можно ли поставить target из current указанной ролью.
 *
 * Правила:
 *   • только СЛЕДУЮЩИЙ шаг — «выдал» нельзя поставить грузу, который ещё не
 *     забрали, иначе цепочка перестаёт что-либо значить;
 *   • повтор того же статуса — успех без изменений: водитель сканирует одну
 *     наклейку дважды, и это не ошибка, ругаться на него незачем;
 *   • шаг назад — только менеджеру и админу.
 *
 * Проверка обязана вызываться НА СЕРВЕРЕ: скрытая кнопка ограничением не
 * является, эндпоинт открыт для любого запроса.
 *
 * @returns {{ok: boolean, noop?: boolean, reason?: string}}
 */
export function canSetCargoStatus(current, target, role) {
  const cur = isKnownCargoStatus(current) ? current : '';

  if (!isKnownCargoStatus(target) || target === '') {
    return { ok: false, reason: 'Неизвестный статус груза' };
  }
  if (!CARGO_ROLES.includes(role)) {
    return { ok: false, reason: 'Эта роль не отмечает движение груза' };
  }
  if (target === cur) {
    return { ok: true, noop: true, reason: 'Статус уже стоит' };
  }
  if (target === nextCargoStatus(cur)) {
    return { ok: true };
  }
  if (target === prevCargoStatus(cur)) {
    if (!CARGO_REVERT_ROLES.includes(role)) {
      return { ok: false, reason: 'Отменить шаг может только менеджер или администратор' };
    }
    return { ok: true };
  }
  return {
    ok: false,
    reason: `Нельзя перескочить шаг: сейчас «${cargoLabel(cur)}», следующий — «${cargoLabel(nextCargoStatus(cur))}»`,
  };
}

/**
 * Что закодировано в отсканированном QR.
 *
 * Новый формат — ссылка <origin>/scan/<id>: её открывает любая камера телефона.
 * Старый — строка TASU-<номер>-<город>-<получатель>, она уже напечатана на
 * наклейках отгруженного груза. Поддерживаем оба, иначе всё, что сейчас едет,
 * перестанет сканироваться.
 *
 * Разбор старого формата — по ПЕРВОМУ дефису после TASU-: в городе и ФИО дефис
 * бывает («Усть-Каменогорск»), а в номере — никогда.
 *
 * @returns {{kind: 'id'|'docNumber', value: string} | null}
 */
export function parseScanPayload(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const scanMatch = raw.match(/\/scan\/([^/?#\s]+)/i);
  if (scanMatch) return { kind: 'id', value: decodeURIComponent(scanMatch[1]) };

  if (/^TASU-/i.test(raw)) {
    const rest = raw.slice(5);
    const docNumber = rest.split('-')[0].trim();
    return docNumber ? { kind: 'docNumber', value: docNumber } : null;
  }

  // Голый uuid — на случай, если QR перекодируют вручную.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return { kind: 'id', value: raw };
  }
  return null;
}

/** Содержимое QR для наклейки. */
export function buildScanUrl(origin, id) {
  const base = String(origin || '').replace(/\/+$/, '');
  return `${base}/scan/${id}`;
}
