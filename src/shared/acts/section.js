// Единое состояние накладной: в каком разделе она находится.
//
// ЗАЧЕМ. Раньше «раздел» вычислялся шесть раз независимо и по-разному:
// isBaseAct в «Заявках», isBaseSmr в СМР, isBaseTtn в ТТН плюс инлайн-фильтры
// на Складе, у бухгалтера и в Отложенных. Условия разошлись, и накладная могла
// пройти сразу в два списка (склад + СМР — дубль) либо не пройти ни в один
// (ready + deferred — накладная пропадала отовсюду).
//
// Теперь раздел один и вычисляется здесь. Функция возвращает РОВНО ОДНУ строку,
// поэтому попасть в два списка накладная физически не может: каждый список
// сравнивает результат со своим значением.
//
// ИСТОЧНИК ПРАВДЫ. Если в details записано поле section — берём его: переходы
// (сформировать ТТН/СМР, склад, бухгалтер, отмена) перезаписывают его явно.
// Если поля нет (запись создана старым клиентом или ещё не мигрирована) —
// выводим состояние из старых флагов тем же правилом, что и миграция.
// Старые флаги при этом продолжают писаться и не удаляются: пока правка не
// обкатана, по ним возможен откат.

export const SECTION = {
  SIMPLE: 'simple',        // частные лица — отдельный контур (/simple)
  DEFERRED: 'deferred',    // Отложенные
  ACCOUNTANT: 'accountant',// Отработанные / Бухгалтерия
  WAREHOUSE: 'warehouse',  // Склад
  TTN: 'ttn',              // ТТН
  SMR: 'smr',              // СМР
  ACT: 'act',              // Заявки
};

const KNOWN_SECTIONS = new Set(Object.values(SECTION));

export function isKnownSection(value) {
  return typeof value === 'string' && KNOWN_SECTIONS.has(value);
}

// details приходит то объектом, то JSON-строкой (форма редактирования частной
// накладной шлёт строкой). Разбираем оба варианта, как это делает сервер.
function parseDetails(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Списки работают с уже склеенным объектом { ...request, ...details }, а скрипт
// миграции — с сырой строкой из БД. Принимаем оба вида.
function flatten(act) {
  if (!act || typeof act !== 'object') return {};
  if (!act.details) return act;
  return { ...act, ...parseDetails(act.details) };
}

const isTtn = (a) => a.docType === 'ttn' || a.type === 'ttn' || a.type === 'TTN';
const isSmr = (a) => a.docType === 'smr' || a.type === 'smr' || a.type === 'SMR';

/**
 * Состояние, выведенное ИЗ СТАРЫХ ФЛАГОВ. Порядок проверок и есть правило
 * взаимоисключения: первое совпадение сверху выигрывает.
 *
 * 1. simple     — частные, у них своя механика статусов, сюда не заходят
 * 2. deferred   — отложено: снимает противоречие между AccountantGeneralPage
 *                 (ready && !deferred) и DeferredPage (deferred && !ready).
 *                 Отложено — значит вернулось к менеджеру, у бухгалтера её нет
 * 3. accountant — отправлено бухгалтеру
 * 4. warehouse  — склад бьёт ТТН/СМР: так уже написано в четырёх фильтрах
 *                 (SentToAccountantPage, DeferredPage, AccountantGeneralPage)
 *                 и этого же требует заказчик — перевёл в склад, ушло из СМР
 * 5. ttn
 * 6. smr
 * 7. act        — всё остальное
 */
export function deriveSection(act) {
  const a = flatten(act);

  if (a.type === 'SIMPLE' || a.isSimple === true) return SECTION.SIMPLE;
  if (a.isDeferredForAccountant) return SECTION.DEFERRED;
  if (a.readyForAccountant) return SECTION.ACCOUNTANT;
  if (a.isWarehouse) return SECTION.WAREHOUSE;
  if (isTtn(a)) return SECTION.TTN;
  if (isSmr(a)) return SECTION.SMR;
  return SECTION.ACT;
}

/**
 * Состояние накладной. Записанное поле section приоритетнее вывода из флагов.
 */
export function getActSection(act) {
  const a = flatten(act);
  if (isKnownSection(a.section)) return a.section;
  return deriveSection(a);
}

/**
 * Набор полей, который переход должен записать, чтобы состояние стало
 * однозначным. Возвращается ВМЕСТЕ со старыми флагами: пока правка не обкатана,
 * оба представления держим согласованными, иначе откат станет невозможен.
 *
 * ДВА ВИДА СОСТОЯНИЙ.
 *
 * Разделы менеджера (Заявки / ТТН / СМР / Склад) описывают, ЧТО это за
 * документ. Переход между ними переписывает состояние целиком: гасит признак
 * склада, переставляет docType и type. Именно эта неполнота и давала дубли —
 * галочка «склад» не убирала docType, и накладная оставалась в СМР.
 *
 * Транзитные состояния (у бухгалтера / отложено) описывают, ГДЕ документ сейчас,
 * и тип документа НЕ трогают: по isWarehouse и docType накладная возвращается
 * в свой раздел. Затри их здесь — и складская накладная после возврата из
 * отложенных уехала бы в «Заявки».
 */
export function sectionPatch(section) {
  if (!isKnownSection(section)) {
    throw new Error(`Неизвестное состояние накладной: ${section}`);
  }
  if (section === SECTION.SIMPLE) {
    throw new Error('Частные накладные живут на своих статусах и этим переходом не переводятся');
  }

  if (section === SECTION.ACCOUNTANT) {
    return { section, readyForAccountant: true, isDeferredForAccountant: false };
  }
  if (section === SECTION.DEFERRED) {
    return { section, readyForAccountant: false, isDeferredForAccountant: true };
  }

  return {
    section,
    type: section === SECTION.TTN ? 'ttn' : section === SECTION.SMR ? 'smr' : 'REQUEST',
    docType: section === SECTION.TTN ? 'ttn' : section === SECTION.SMR ? 'smr' : null,
    isWarehouse: section === SECTION.WAREHOUSE,
    readyForAccountant: false,
    isDeferredForAccountant: false,
  };
}

/**
 * Куда накладная вернётся, когда с неё снимут флаги бухгалтера. Тип документа
 * при переходах к бухгалтеру и в отложенные сохраняется, поэтому раздел
 * восстанавливается по нему.
 */
export function sectionAfterAccountant(act) {
  return deriveSection({
    ...flatten(act),
    section: undefined,
    readyForAccountant: false,
    isDeferredForAccountant: false,
  });
}

/**
 * Куда вести пользователя после перехода. Раньше маршрут собирался лесенкой
 * if/else в двух местах карточки и расходился с фильтрами списков — накладная
 * уезжала на /acts, где её тут же отсеивал фильтр.
 */
export function sectionPath(section, id) {
  const base = {
    [SECTION.SIMPLE]: '/simple',
    [SECTION.DEFERRED]: '/deferred',
    [SECTION.ACCOUNTANT]: '/sent',
    [SECTION.WAREHOUSE]: '/warehouse',
    [SECTION.TTN]: '/requests',
    [SECTION.SMR]: '/smr',
    [SECTION.ACT]: '/acts',
  }[section] || '/acts';
  return id ? `${base}/${id}` : base;
}
