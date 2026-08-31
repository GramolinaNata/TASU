// Тесты модуля ролей.
//
// Главная задача набора — НЕ проверить новые роли, а зафиксировать, что семь
// старых не поехали. Строка роли лежит в базе у живых пользователей и зашита
// в JWT на сутки: опечатка в константе = потеря доступа у всех, кто с этой
// ролью сейчас работает, и увидим мы это не на сборке, а на входе людей.

import assert from "node:assert/strict";
import {
  ROLE, ROLE_META, ROLE_ORDER,
  COURIER_FAMILY, MANAGER_FAMILY, ACCOUNTANT_FAMILY,
  COMPANY_BOUND_ROLES, CITY_BOUND_ROLES, PENDING_CABINET_ROLES,
  isKnownRole, roleName, roleLayoutName, roleBadge,
  isCourierFamily, isManagerFamily, isAccountantFamily,
  needsCompany, needsCity, hasCabinet, needsPendingCabinet,
  // Кабинеты ролей: дом и запрет ходить по чужим разделам.
  RESTRICTED_ROLES, isRestrictedRole, roleHome, isPathAllowedForRole,
  // Набор выпадающего списка «Уровень доступа».
  ROLE_PICKER_GROUPS, rolePickerLabel,
} from "./roles.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("# ✓ " + name); }
  catch (e) { failed++; console.log("# ✗ " + name + " — " + e.message); }
}

// ── Регрессия: старые роли ──────────────────────────────────

// Значения переписаны здесь ЛИТЕРАЛАМИ намеренно. Сравнивать ROLE.ADMIN с
// ROLE.ADMIN бессмысленно — тест обязан ловить именно правку самой строки.
const LEGACY_ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  MANAGER2: "MANAGER2",
  ACCOUNTANT: "ACCOUNTANT",
  ACCOUNTANT2: "ACCOUNTANT2",
  COURIER: "COURIER",
  PRIVATE: "PRIVATE",
};

test("строки семи существующих ролей не изменились", () => {
  for (const [key, value] of Object.entries(LEGACY_ROLES)) {
    assert.equal(ROLE[key], value, `роль ${key} должна остаться «${value}»`);
  }
});

test("подписи существующих ролей — те же, что были в UsersPage", () => {
  // Дословно из прежнего getRoleName.
  assert.equal(roleName("ADMIN"), "Админ");
  assert.equal(roleName("ACCOUNTANT"), "Бухгалтер");
  assert.equal(roleName("ACCOUNTANT2"), "Бухгалтер 2");
  assert.equal(roleName("COURIER"), "Курьер");
  assert.equal(roleName("PRIVATE"), "Частное лицо");
  assert.equal(roleName("MANAGER2"), "Менеджер (ограниченный)");
  assert.equal(roleName("MANAGER"), "Менеджер");
});

test("подписи в шапке — те же, что были в Layout (ADMIN длиннее)", () => {
  assert.equal(roleLayoutName("ADMIN"), "Администратор");
  assert.equal(roleLayoutName("ACCOUNTANT"), "Бухгалтер");
  assert.equal(roleLayoutName("ACCOUNTANT2"), "Бухгалтер 2");
  assert.equal(roleLayoutName("COURIER"), "Курьер");
  assert.equal(roleLayoutName("PRIVATE"), "Частное лицо");
  assert.equal(roleLayoutName("MANAGER2"), "Менеджер (ограниченный)");
  assert.equal(roleLayoutName("MANAGER"), "Менеджер");
});

test("классы бейджей существующих ролей не изменились", () => {
  assert.equal(roleBadge("ADMIN"), "badge-primary");
  assert.equal(roleBadge("ACCOUNTANT"), "badge-info");
  assert.equal(roleBadge("ACCOUNTANT2"), "badge-info");
  assert.equal(roleBadge("COURIER"), "badge-warning");
  assert.equal(roleBadge("PRIVATE"), "badge-private");
  assert.equal(roleBadge("MANAGER2"), "badge-warning");
  assert.equal(roleBadge("MANAGER"), "badge-secondary");
});

test("неизвестная роль ведёт себя как раньше: «Менеджер» и badge-secondary", () => {
  // Прежний getRoleName заканчивался безусловным return 'Менеджер'.
  assert.equal(roleName("ЧТО_ТО_ПОПАЛО"), "Менеджер");
  assert.equal(roleBadge("ЧТО_ТО_ПОПАЛО"), "badge-secondary");
  assert.equal(roleName(undefined), "Менеджер");
  assert.equal(roleName(null), "Менеджер");
});

test("привязка к компании осталась ровно у PRIVATE и MANAGER2", () => {
  // Проверка в UsersPage и user.controller: (role === 'PRIVATE' || role === 'MANAGER2').
  assert.deepEqual([...COMPANY_BOUND_ROLES].sort(), ["MANAGER2", "PRIVATE"]);
  assert.equal(needsCompany("PRIVATE"), true);
  assert.equal(needsCompany("MANAGER2"), true);
  assert.equal(needsCompany("MANAGER"), false);
  assert.equal(needsCompany("ADMIN"), false);
  assert.equal(needsCompany("COURIER"), false);
});

// ── Новые роли ──────────────────────────────────────────────

const NEW_ROLES = ["WAREHOUSE_KEEPER", "COURIER_LOCAL", "COURIER_REGION", "OPS_MANAGER"];

test("четыре новые роли заведены", () => {
  for (const r of NEW_ROLES) {
    assert.equal(ROLE[r], r, `роль ${r} должна быть заведена`);
    assert.ok(ROLE_META[r], `у роли ${r} должно быть описание`);
  }
});

test("новые роли не пересекаются со старыми", () => {
  const legacy = new Set(Object.values(LEGACY_ROLES));
  for (const r of NEW_ROLES) {
    assert.ok(!legacy.has(r), `${r} не должна совпадать со старой ролью`);
  }
});

test("всего ролей 11 и все значения уникальны", () => {
  const values = Object.values(ROLE);
  assert.equal(values.length, 11);
  assert.equal(new Set(values).size, 11, "дублей среди значений быть не должно");
});

test("у каждой роли есть описание, и наоборот", () => {
  const values = new Set(Object.values(ROLE));
  const metas = new Set(Object.keys(ROLE_META));
  assert.deepEqual([...values].sort(), [...metas].sort());
});

test("в списке для выпадашки перечислены все роли без дублей", () => {
  assert.equal(ROLE_ORDER.length, Object.keys(ROLE).length);
  assert.equal(new Set(ROLE_ORDER).size, ROLE_ORDER.length);
  for (const r of ROLE_ORDER) assert.ok(isKnownRole(r), `${r} должна быть известной`);
});

// ── набор выпадающего списка «Уровень доступа» ──────────────
//
// Эти проверки появились после живой поломки: список собирался фильтром
// `!hasCabinet(r)` — «новая роль» значило «кабинета ещё нет». Кабинеты
// написали, флаг стал true у всех, фильтр вернул пустоту, и в интерфейсе
// повис заголовок группы без единой строки под ним. Разметку тесты не видят,
// поэтому набор ролей вынесен в модуль и проверяется здесь.

test("ВЫПАДАШКА: выбрать можно КАЖДУЮ роль системы", () => {
  const inPicker = ROLE_PICKER_GROUPS.flatMap((g) => g.roles);
  assert.deepEqual([...inPicker].sort(), [...Object.values(ROLE)].sort());
});

test("ВЫПАДАШКА: ни одна группа не пуста", () => {
  // Пустой <optgroup> рисует заголовок и ничего под ним — ровно то, что
  // увидел заказчик.
  for (const g of ROLE_PICKER_GROUPS) {
    assert.ok(g.roles.length > 0, `группа «${g.label || 'без заголовка'}» пуста`);
  }
});

test("ВЫПАДАШКА: роль не попадает в две группы сразу", () => {
  const all = ROLE_PICKER_GROUPS.flatMap((g) => g.roles);
  assert.equal(new Set(all).size, all.length);
});

test("ВЫПАДАШКА: четыре кабинетные роли вынесены в свою группу", () => {
  const cabinetGroup = ROLE_PICKER_GROUPS.find((g) => g.label);
  assert.ok(cabinetGroup, "группа с заголовком должна быть");
  assert.deepEqual([...cabinetGroup.roles].sort(), [...RESTRICTED_ROLES].sort());
});

test("ВЫПАДАШКА: подписи не пустые, у частного лица сохранён значок", () => {
  for (const r of Object.values(ROLE)) {
    assert.ok(rolePickerLabel(r).trim().length > 0, `нет подписи у ${r}`);
  }
  assert.equal(rolePickerLabel("PRIVATE"), "👤 Частное лицо");
  // Значок ТОЛЬКО в списке: roleName закреплён тестами и идёт в таблицы и шапку.
  assert.equal(roleName("PRIVATE"), "Частное лицо");
});

// ── Семейства ───────────────────────────────────────────────

test("старый COURIER остаётся курьером — новые роли его не заменяют", () => {
  // Смысл всей затеи: у людей в базе стоит COURIER, эта строка обязана жить.
  assert.equal(isCourierFamily("COURIER"), true);
  assert.equal(isCourierFamily("COURIER_LOCAL"), true);
  assert.equal(isCourierFamily("COURIER_REGION"), true);
  assert.ok(COURIER_FAMILY.includes("COURIER"), "COURIER обязан быть в семействе");
});

test("семейство курьеров не затягивает посторонние роли", () => {
  for (const r of ["MANAGER", "MANAGER2", "ADMIN", "PRIVATE", "ACCOUNTANT", "WAREHOUSE_KEEPER"]) {
    assert.equal(isCourierFamily(r), false, `${r} не курьер`);
  }
});

test("семейства менеджеров и бухгалтеров собраны верно", () => {
  assert.deepEqual([...MANAGER_FAMILY].sort(), ["MANAGER", "MANAGER2", "OPS_MANAGER"]);
  assert.deepEqual([...ACCOUNTANT_FAMILY].sort(), ["ACCOUNTANT", "ACCOUNTANT2"]);
  assert.equal(isManagerFamily("OPS_MANAGER"), true);
  assert.equal(isManagerFamily("COURIER"), false);
  assert.equal(isAccountantFamily("ACCOUNTANT2"), true);
  assert.equal(isAccountantFamily("ADMIN"), false);
});

test("семейства не пересекаются между собой", () => {
  const all = [...COURIER_FAMILY, ...MANAGER_FAMILY, ...ACCOUNTANT_FAMILY];
  assert.equal(new Set(all).size, all.length, "роль не может быть в двух семействах");
});

// ── Города и кабинеты ───────────────────────────────────────

test("город назначается курьерам и кладовщику", () => {
  assert.equal(needsCity("COURIER"), true);
  assert.equal(needsCity("COURIER_LOCAL"), true);
  assert.equal(needsCity("COURIER_REGION"), true);
  assert.equal(needsCity("WAREHOUSE_KEEPER"), true);
  assert.equal(needsCity("MANAGER"), false);
  assert.equal(needsCity("OPS_MANAGER"), false);
  assert.deepEqual([...CITY_BOUND_ROLES].sort(),
    ["COURIER", "COURIER_LOCAL", "COURIER_REGION", "WAREHOUSE_KEEPER"]);
});

test("кабинеты написаны у всех ролей — на заглушку не уводит никого", () => {
  // Раньше здесь фиксировалось «кабинета нет у четырёх новых ролей». Экраны
  // написаны, поэтому проверка перевёрнута: заглушка осталась в коде как
  // механизм для будущих ролей, но пустой список — это её нормальное
  // состояние. Как только появится роль без экрана, тест это поймает.
  assert.deepEqual(PENDING_CABINET_ROLES, []);
  for (const r of Object.values(ROLE)) {
    assert.equal(hasCabinet(r), true, `${r} обязана иметь кабинет`);
    assert.equal(needsPendingCabinet(r), false, `${r} не должна уходить на заглушку`);
  }
});

test("неизвестная роль на заглушку не уводится", () => {
  // Иначе роль, о которой мы не знаем, но которая сегодня как-то работает,
  // потеряла бы доступ после выката.
  assert.equal(hasCabinet("ЧТО_ТО_ПОПАЛО"), true);
  assert.equal(needsPendingCabinet("ЧТО_ТО_ПОПАЛО"), false);
  assert.equal(needsPendingCabinet(undefined), false);
});

// ── Запертые роли ───────────────────────────────────────────

test("заперты ровно четыре новые роли", () => {
  assert.deepEqual([...RESTRICTED_ROLES].sort(), [...NEW_ROLES].sort());
  for (const r of NEW_ROLES) assert.equal(isRestrictedRole(r), true, `${r} должна быть заперта`);
});

test("СЕМЬ СТАРЫХ РОЛЕЙ НЕ ЗАПЕРТЫ — их доступ решают прежние гейты", () => {
  // Ключевая проверка совместимости: правило «разрешён только свой кабинет»
  // не должно задеть тех, кто работает сегодня.
  for (const r of Object.values(LEGACY_ROLES)) {
    assert.equal(isRestrictedRole(r), false, `${r} не должна быть заперта`);
    for (const p of ["/acts", "/simple", "/admin/users", "/sent", "/courier", "/"]) {
      assert.equal(isPathAllowedForRole(r, p), true, `${r} потеряла доступ к ${p}`);
    }
  }
});

test("неизвестная роль не запирается", () => {
  assert.equal(isRestrictedRole("ЧТО_ТО_ПОПАЛО"), false);
  assert.equal(isPathAllowedForRole("ЧТО_ТО_ПОПАЛО", "/acts"), true);
  assert.equal(isPathAllowedForRole(undefined, "/acts"), true);
});

test("у каждой запертой роли свой домашний кабинет, и все они разные", () => {
  const homes = NEW_ROLES.map((r) => roleHome(r));
  for (const h of homes) assert.ok(h.startsWith("/cabinet/"), `дом «${h}» вне /cabinet`);
  assert.equal(new Set(homes).size, homes.length, "две роли не могут делить кабинет");
});

test("запертая роль ходит только в свой кабинет", () => {
  assert.equal(isPathAllowedForRole("WAREHOUSE_KEEPER", "/cabinet/warehouse"), true);
  assert.equal(isPathAllowedForRole("WAREHOUSE_KEEPER", "/cabinet/warehouse/123"), true);
  // Чужой кабинет — тоже нельзя.
  assert.equal(isPathAllowedForRole("WAREHOUSE_KEEPER", "/cabinet/ops"), false);
  assert.equal(isPathAllowedForRole("COURIER_REGION", "/cabinet/warehouse"), false);
});

test("запертой роли закрыты разделы менеджера и админа", () => {
  // То, ради чего правило и вводилось: /acts гейта не имеет вовсе.
  for (const r of NEW_ROLES) {
    for (const p of ["/acts", "/simple", "/sent", "/admin/users", "/counterparties", "/companies"]) {
      assert.equal(isPathAllowedForRole(r, p), false, `${r} прошла в ${p}`);
    }
  }
});

test("сканер открыт запертым ролям: они работают телефоном", () => {
  for (const r of NEW_ROLES) {
    assert.equal(isPathAllowedForRole(r, "/scan"), true);
    assert.equal(isPathAllowedForRole(r, "/scan/abc-123"), true);
  }
});

test("похожий префикс не пускает: /scanner — не /scan", () => {
  assert.equal(isPathAllowedForRole("COURIER_LOCAL", "/scanner"), false);
  assert.equal(isPathAllowedForRole("COURIER_LOCAL", "/cabinet/courier-x"), false);
});

test("незапертой роли путь не ограничивается вообще", () => {
  assert.equal(isPathAllowedForRole("ADMIN", "/cabinet/warehouse"), true);
  assert.equal(isPathAllowedForRole("MANAGER", "/что/угодно"), true);
});

test("isKnownRole различает заведённые и посторонние строки", () => {
  assert.equal(isKnownRole("COURIER"), true);
  assert.equal(isKnownRole("OPS_MANAGER"), true);
  assert.equal(isKnownRole("SUPERUSER"), false);
  assert.equal(isKnownRole(""), false);
  assert.equal(isKnownRole(undefined), false);
});

console.log(`\n# Итого (roles): ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
