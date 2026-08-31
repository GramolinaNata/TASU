// Роли пользователей — единственный источник правды.
//
// ЗАЧЕМ МОДУЛЬ. Роль лежит в User.role обычной строкой, а решения по ней
// принимались в четырёх местах сразу: AuthContext (флаги), App.jsx (стартовая
// страница), RequireAuth (гейты маршрутов), UsersPage/Layout (подписи и
// бейджи), плюс инлайновые проверки в серверном контроллере. Добавление одной
// роли означало правку пяти файлов, и подписи в них уже начали расходиться.
// Здесь собраны САМИ РОЛИ и справочные данные о них.
//
// ЧТО ЭТОТ МОДУЛЬ НЕ ДЕЛАЕТ (сознательно, этап «фундамент»).
// Он НЕ переписывает существующие проверки прав. Флаги в AuthContext, ветки
// RequireAuth, фильтр курьера по городу, CARGO_ROLES и проверки в
// request.controller.ts продолжают работать ровно как раньше. Перевод их на
// этот модуль — отдельный шаг: массовая замена гейтов заодно с введением
// четырёх новых ролей означала бы, что при поломке непонятно, что сломалось —
// новая роль или переезд старой проверки.
//
// ⚠️ ЗЕРКАЛО СЕРВЕРА: server/src/lib/roles.ts. Общий модуль сделать нельзя —
// образ бэка собирается из каталога server/ и до src/ не достаёт (та же
// причина, что у courierCity.js, cargoStatus.js и accessLink.js).
// ПРИ ПРАВКЕ МЕНЯТЬ В ДВУХ МЕСТАХ.

/**
 * Значения ролей.
 *
 * СТРОКИ СЕМИ СУЩЕСТВУЮЩИХ РОЛЕЙ ТРОГАТЬ НЕЛЬЗЯ: они лежат в базе у живых
 * пользователей и зашиты в JWT на сутки. Переименование строки = мгновенная
 * потеря доступа у всех, кто с этой ролью сейчас работает.
 */
export const ROLE = {
  // --- существующие, менять запрещено ---
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MANAGER2: 'MANAGER2',
  ACCOUNTANT: 'ACCOUNTANT',
  ACCOUNTANT2: 'ACCOUNTANT2',
  COURIER: 'COURIER',
  PRIVATE: 'PRIVATE',

  // --- новые (ТЗ: роли и цепочка подписей) ---
  WAREHOUSE_KEEPER: 'WAREHOUSE_KEEPER',
  COURIER_LOCAL: 'COURIER_LOCAL',
  COURIER_REGION: 'COURIER_REGION',
  OPS_MANAGER: 'OPS_MANAGER',
};

/**
 * Справочник ролей.
 *
 * label   — подпись в интерфейсе. Для семи старых ролей строки перенесены
 *           ДОСЛОВНО из UsersPage.getRoleName и Layout.getRoleName, чтобы
 *           переход на модуль не поменял ни одной надписи на экране.
 * badge   — существующий CSS-класс бейджа, тоже дословно.
 * company — роль обязана быть привязана к компании (assignedCompanyId).
 * city    — роли назначается город (User.city).
 * cabinet — есть ли у роли готовый рабочий экран. false = кабинета ещё нет.
 */
export const ROLE_META = {
  [ROLE.ADMIN]:       { label: 'Админ',                    layoutLabel: 'Администратор', badge: 'badge-primary',   company: false, city: false, cabinet: true },
  [ROLE.MANAGER]:     { label: 'Менеджер',                  layoutLabel: 'Менеджер',      badge: 'badge-secondary', company: false, city: false, cabinet: true },
  [ROLE.MANAGER2]:    { label: 'Менеджер (ограниченный)',   layoutLabel: 'Менеджер (ограниченный)', badge: 'badge-warning', company: true,  city: false, cabinet: true },
  [ROLE.ACCOUNTANT]:  { label: 'Бухгалтер',                 layoutLabel: 'Бухгалтер',     badge: 'badge-info',      company: false, city: false, cabinet: true },
  [ROLE.ACCOUNTANT2]: { label: 'Бухгалтер 2',               layoutLabel: 'Бухгалтер 2',   badge: 'badge-info',      company: false, city: false, cabinet: true },
  [ROLE.COURIER]:     { label: 'Курьер',                    layoutLabel: 'Курьер',        badge: 'badge-warning',   company: false, city: true,  cabinet: true },
  // icon — украшение ТОЛЬКО для выпадающего списка «Уровень доступа».
  // В roleName его нет намеренно: подписи ролей закреплены тестами и
  // используются в таблицах, шапке и бейджах, где эмодзи не нужен.
  [ROLE.PRIVATE]:     { label: 'Частное лицо',              layoutLabel: 'Частное лицо',  badge: 'badge-private',   company: true,  city: false, cabinet: true, icon: '👤' },

  // Новые роли. cabinet:true — рабочий экран написан (см. home).
  [ROLE.WAREHOUSE_KEEPER]: { label: 'Кладовщик',               layoutLabel: 'Кладовщик',               badge: 'badge-warning', company: false, city: true,  cabinet: true, home: '/cabinet/warehouse' },
  [ROLE.COURIER_LOCAL]:    { label: 'Курьер (местный)',        layoutLabel: 'Курьер (местный)',        badge: 'badge-warning', company: false, city: true,  cabinet: true, home: '/cabinet/courier' },
  [ROLE.COURIER_REGION]:   { label: 'Курьер (региональный)',   layoutLabel: 'Курьер (региональный)',   badge: 'badge-warning', company: false, city: true,  cabinet: true, home: '/cabinet/region' },
  [ROLE.OPS_MANAGER]:      { label: 'Операционный менеджер',   layoutLabel: 'Операционный менеджер',   badge: 'badge-primary', company: false, city: false, cabinet: true, home: '/cabinet/ops' },
};

/** Порядок ролей в выпадающих списках «Персонала». */
export const ROLE_ORDER = [
  ROLE.MANAGER,
  ROLE.MANAGER2,
  ROLE.OPS_MANAGER,
  ROLE.ACCOUNTANT,
  ROLE.ACCOUNTANT2,
  ROLE.WAREHOUSE_KEEPER,
  ROLE.COURIER,
  ROLE.COURIER_LOCAL,
  ROLE.COURIER_REGION,
  ROLE.PRIVATE,
  ROLE.ADMIN,
];

// ── Семейства ───────────────────────────────────────────────
//
// COURIER_LOCAL сделан «на основе COURIER», но НЕ вместо него: у существующих
// пользователей в базе стоит COURIER, и эта строка обязана продолжать
// работать. Поэтому старая роль и две новые собраны в семейство, а сам
// COURIER остаётся полноценным значением, а не синонимом.

export const COURIER_FAMILY = [ROLE.COURIER, ROLE.COURIER_LOCAL, ROLE.COURIER_REGION];
export const MANAGER_FAMILY = [ROLE.MANAGER, ROLE.MANAGER2, ROLE.OPS_MANAGER];
export const ACCOUNTANT_FAMILY = [ROLE.ACCOUNTANT, ROLE.ACCOUNTANT2];

/** Роли с привязкой к компании (сейчас — PRIVATE и MANAGER2). */
export const COMPANY_BOUND_ROLES = Object.keys(ROLE_META).filter((r) => ROLE_META[r].company);

/** Роли, которым назначается город. */
export const CITY_BOUND_ROLES = Object.keys(ROLE_META).filter((r) => ROLE_META[r].city);

/**
 * Роли БЕЗ готового кабинета.
 *
 * ПОЧЕМУ ЭТО ВАЖНО. Маршруты /acts, /simple, /counterparties гейта не имеют
 * вовсе — их видит любой авторизованный, а стартовая страница для незнакомой
 * роли падает в <Navigate to="/acts">. То есть роль, добавленная в справочник
 * и никуда больше, автоматически получила бы ПОЛНЫЙ интерфейс менеджера
 * вместе с суммами. Пока экраны не написаны, такие роли уводятся на заглушку
 * /cabinet — см. RequireAuth и App.jsx.
 */
export const PENDING_CABINET_ROLES = Object.keys(ROLE_META).filter((r) => !ROLE_META[r].cabinet);

/** Куда уводить роль, у которой кабинета ещё нет. */
export const PENDING_CABINET_PATH = '/cabinet';

// ============================================================
// ЗАПЕРТЫЕ РОЛИ.
//
// У четырёх новых ролей появился рабочий экран — и вместе с ним появилась
// опасность, которой раньше не было. Пока стояло cabinet:false, их заворачивало
// на заглушку ОТОВСЮДУ. Стоит поставить cabinet:true — и заворот пропадает,
// а маршруты /acts, /simple, /counterparties гейта не имеют вовсе: кладовщик
// оказался бы в полном интерфейсе менеджера вместе с суммами.
//
// Поэтому доступ у них не «по умолчанию разрешено, кое-где запрещено», а
// наоборот: разрешён только свой кабинет и общий список исключений. Всё
// остальное уводит домой. Семи существующих ролей это правило не касается —
// они не входят в RESTRICTED_ROLES.
// ============================================================
export const RESTRICTED_ROLES = [
  ROLE.WAREHOUSE_KEEPER,
  ROLE.COURIER_LOCAL,
  ROLE.COURIER_REGION,
  ROLE.OPS_MANAGER,
];

/**
 * Пути, открытые запертой роли помимо её кабинета.
 *
 * /scan — сканирование наклейки: кладовщик и курьеры работают телефоном, и
 * запрещать им камеру значило бы заставить искать накладную руками. Сам экран
 * сканирования опирается на серверную проверку шага, лишнего там не сделать.
 */
const RESTRICTED_EXTRA_PATHS = ['/scan'];

// ============================================================
// ГРУППЫ ДЛЯ ВЫПАДАЮЩЕГО СПИСКА «Уровень доступа».
//
// ЗАЧЕМ В МОДУЛЕ, А НЕ В UsersPage. Список ролей там собирался наполовину
// вручную (семь <option> текстом), наполовину фильтром `!hasCabinet(r)` —
// то есть «новая роль» определялась через «у неё ещё нет кабинета». Как
// только кабинеты написали и флаг cabinet стал true у всех, фильтр вернул
// пустой массив: заголовок группы остался, а выбрать под ним стало нечего.
// Проверить это было нечем — разметку тесты не видят.
//
// Теперь набор живёт здесь и накрыт тестом «в выпадашке доступны ВСЕ роли»:
// добавили роль и забыли про список — тест падает, а не заказчик.
//
// Деление по смыслу, а не по возрасту: «новые» через полгода перестанут быть
// новыми, а вот роли, запертые в кабинете движения груза, так и останутся
// отдельной группой.
// ============================================================
export const ROLE_PICKER_GROUPS = [
  { label: '', roles: ROLE_ORDER.filter((r) => !RESTRICTED_ROLES.includes(r)) },
  { label: 'Движение груза — свой кабинет', roles: ROLE_ORDER.filter((r) => RESTRICTED_ROLES.includes(r)) },
];

/** Подпись роли в выпадающем списке — с эмодзи, если он у роли есть. */
export function rolePickerLabel(role) {
  const meta = ROLE_META[role];
  if (!meta) return roleName(role);
  return meta.icon ? `${meta.icon} ${meta.label}` : meta.label;
}

/** Домашний путь роли. Для незапертых ролей — корень, как и было. */
export function roleHome(role) {
  return ROLE_META[role]?.home || '/';
}

/** Заперта ли роль в своём кабинете. */
export function isRestrictedRole(role) {
  return RESTRICTED_ROLES.includes(role);
}

/**
 * Можно ли запертой роли открыть этот путь.
 * Незапертые роли пропускаются без изменений — их доступ решают прежние гейты.
 */
export function isPathAllowedForRole(role, pathname) {
  if (!isRestrictedRole(role)) return true;
  const path = String(pathname || '');
  const home = roleHome(role);
  if (path === home || path.startsWith(home + '/')) return true;
  return RESTRICTED_EXTRA_PATHS.some((p) => path === p || path.startsWith(p + '/'));
}

// ── Хелперы ─────────────────────────────────────────────────

export function isKnownRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_META, String(role || ''));
}

/**
 * Подпись роли.
 *
 * Неизвестная роль отдаёт «Менеджер» — так вело себя UsersPage.getRoleName
 * (финальный `return 'Менеджер'`), и менять это поведение сейчас не нужно.
 */
export function roleName(role) {
  return ROLE_META[role]?.label || ROLE_META[ROLE.MANAGER].label;
}

/** Подпись роли в шапке (Layout): у ADMIN она длиннее, чем в «Персонале». */
export function roleLayoutName(role) {
  return ROLE_META[role]?.layoutLabel || ROLE_META[ROLE.MANAGER].layoutLabel;
}

/** CSS-класс бейджа. Неизвестная роль — как раньше, badge-secondary. */
export function roleBadge(role) {
  return ROLE_META[role]?.badge || ROLE_META[ROLE.MANAGER].badge;
}

export function isCourierFamily(role) {
  return COURIER_FAMILY.includes(role);
}

export function isManagerFamily(role) {
  return MANAGER_FAMILY.includes(role);
}

export function isAccountantFamily(role) {
  return ACCOUNTANT_FAMILY.includes(role);
}

/** Обязательна ли роли привязка к компании. */
export function needsCompany(role) {
  return !!ROLE_META[role]?.company;
}

/** Назначается ли роли город. */
export function needsCity(role) {
  return !!ROLE_META[role]?.city;
}

/** Есть ли у роли готовый рабочий экран. Неизвестная роль → считаем, что есть
 *  (она уже как-то работает сегодня, уводить её на заглушку нельзя). */
export function hasCabinet(role) {
  return ROLE_META[role] ? ROLE_META[role].cabinet : true;
}

/** Нужно ли увести роль на заглушку кабинета. */
export function needsPendingCabinet(role) {
  return PENDING_CABINET_ROLES.includes(role);
}
