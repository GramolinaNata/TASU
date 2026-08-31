// Тесты кабинетов движения груза.
//
// Проверяют главное обещание: кабинет СУЖАЕТ права, а не расширяет. Кнопка,
// которой нет в наборе кабинета, не появится; кнопка, которую не разрешает
// движок роли, не появится тем более. Сервер при этом проверяет широкое
// правило сам — кабинет для него не авторитет.

import assert from "node:assert/strict";
import { CABINETS, CABINET_ROUTES, cabinetFor, cabinetActions, cabinetCityField } from "./cabinets.js";
import { CARGO_FLOW_KEYS, canSetCargoStatus, canRoleSetStep } from "./cargoStatus.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("# ✓ " + name); }
  catch (e) { failed++; console.log("# ✗ " + name + " — " + e.message); }
}

const ROLES = ["WAREHOUSE_KEEPER", "COURIER_LOCAL", "COURIER_REGION", "OPS_MANAGER"];

test("кабинет есть ровно у четырёх новых ролей", () => {
  assert.deepEqual(Object.keys(CABINETS).sort(), [...ROLES].sort());
  for (const r of ROLES) assert.ok(cabinetFor(r), `нет кабинета у ${r}`);
});

test("у старых ролей кабинета движения груза нет", () => {
  for (const r of ["ADMIN", "MANAGER", "COURIER", "PRIVATE", "ACCOUNTANT", "MANAGER2"]) {
    assert.equal(cabinetFor(r), null, `${r} не должна иметь этот кабинет`);
  }
});

test("пути кабинетов уникальны и лежат под /cabinet/", () => {
  const paths = CABINET_ROUTES.map((c) => c.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const p of paths) assert.ok(p.startsWith("/cabinet/"), `путь «${p}» вне /cabinet`);
});

test("шаги кабинетов — существующие шаги маршрута", () => {
  for (const [role, cfg] of Object.entries(CABINETS)) {
    for (const s of cfg.steps) {
      assert.ok(CARGO_FLOW_KEYS.includes(s), `${role}: шага «${s}» нет в маршруте`);
    }
  }
});

test("ТЗ: у каждой роли ровно её кнопки", () => {
  assert.deepEqual(CABINETS.WAREHOUSE_KEEPER.steps, ["wh_accepted", "wh_released"]);
  assert.deepEqual(CABINETS.COURIER_LOCAL.steps, ["courier_took", "loaded"]);
  assert.deepEqual(CABINETS.COURIER_REGION.steps, ["region_took", "delivered"]);
  assert.deepEqual(CABINETS.OPS_MANAGER.steps, CARGO_FLOW_KEYS);
});

test("каждый шаг кабинета РАЗРЕШЁН его роли движком", () => {
  // Иначе кабинет показывал бы кнопку, на которую сервер ответит отказом.
  for (const [role, cfg] of Object.entries(CABINETS)) {
    for (const s of cfg.steps) {
      assert.ok(canRoleSetStep(role, s), `${role} не вправе ставить «${s}»`);
    }
  }
});

test("область видимости: склад и местный — откуда, региональный — куда", () => {
  assert.equal(cabinetCityField("WAREHOUSE_KEEPER"), "fromCity");
  assert.equal(cabinetCityField("COURIER_LOCAL"), "fromCity");
  assert.equal(cabinetCityField("COURIER_REGION"), "toCity");
  assert.equal(cabinetCityField("OPS_MANAGER"), "all");
  assert.equal(cabinetCityField("MANAGER"), "all");
});

// ── кнопки ──────────────────────────────────────────────────

test("кладовщик видит приёмку сразу после забора груза", () => {
  const a = cabinetActions(CABINETS.WAREHOUSE_KEEPER, "picked_up", "WAREHOUSE_KEEPER");
  assert.deepEqual(a, ["wh_accepted", "wh_released"]);
});

test("кладовщику НЕ показывают погрузку, хотя движок ему её разрешает", () => {
  // Ровно то, ради чего кабинет отделён от матрицы: погрузка на фуру —
  // дело курьера, а не склада, хотя в CARGO_FLOW роль там присутствует.
  assert.ok(canRoleSetStep("WAREHOUSE_KEEPER", "loaded"), "движок погрузку разрешает");
  const a = cabinetActions(CABINETS.WAREHOUSE_KEEPER, "wh_released", "WAREHOUSE_KEEPER");
  assert.ok(!a.includes("loaded"), "в кабинете склада погрузки быть не должно");
});

test("местный курьер: взял и погрузил", () => {
  assert.deepEqual(cabinetActions(CABINETS.COURIER_LOCAL, "wh_released", "COURIER_LOCAL"),
    ["courier_took", "loaded"]);
});

test("региональный курьер: принял и выдал", () => {
  assert.deepEqual(cabinetActions(CABINETS.COURIER_REGION, "in_transit", "COURIER_REGION"),
    ["region_took"]);
  assert.deepEqual(cabinetActions(CABINETS.COURIER_REGION, "rep_received", "COURIER_REGION"),
    ["delivered"]);
});

test("у выданного груза кнопок нет ни у кого", () => {
  for (const r of ROLES) {
    assert.deepEqual(cabinetActions(CABINETS[r], "delivered", r), [], `${r} что-то может после выдачи`);
  }
});

test("роль не видит кнопок чужого этапа", () => {
  // Региональному нечего делать с грузом, который ещё на складе.
  assert.deepEqual(cabinetActions(CABINETS.COURIER_REGION, "wh_accepted", "COURIER_REGION"), []);
  // Складу нечего делать с грузом, который уже в пути.
  assert.deepEqual(cabinetActions(CABINETS.WAREHOUSE_KEEPER, "in_transit", "WAREHOUSE_KEEPER"), []);
});

test("ГЛАВНОЕ: любая показанная кнопка проходит проверку движка", () => {
  // Обещание, которое легко нарушить правкой набора шагов: кабинет не имеет
  // права предложить действие, на которое сервер ответит отказом.
  for (const [role, cfg] of Object.entries(CABINETS)) {
    for (const cur of ["", ...CARGO_FLOW_KEYS]) {
      for (const step of cabinetActions(cfg, cur, role)) {
        const r = canSetCargoStatus(cur, step, role);
        assert.ok(r.ok, `${role}: «${cur}» → «${step}» показан, но запрещён (${r.reason || ""})`);
      }
    }
  }
});

test("операционный менеджер ведёт груз по всей цепочке", () => {
  let cur = "";
  const seen = [];
  for (let i = 0; i < CARGO_FLOW_KEYS.length; i++) {
    const a = cabinetActions(CABINETS.OPS_MANAGER, cur, "OPS_MANAGER");
    if (!a.length) break;
    cur = a[a.length - 1]; // идём по опорным шагам
    seen.push(cur);
  }
  assert.equal(cur, "delivered", "цепочка должна доходить до выдачи");
  assert.ok(seen.length >= 4, "опорных шагов не меньше четырёх");
});

test("журнал показывается только операционному менеджеру", () => {
  assert.equal(CABINETS.OPS_MANAGER.showJournal, true);
  for (const r of ["WAREHOUSE_KEEPER", "COURIER_LOCAL", "COURIER_REGION"]) {
    assert.ok(!CABINETS[r].showJournal, `${r} не должен видеть журнал целиком`);
  }
});

test("нет кабинета — нет и кнопок", () => {
  assert.deepEqual(cabinetActions(null, "picked_up", "MANAGER"), []);
  assert.deepEqual(cabinetActions(cabinetFor("ADMIN"), "picked_up", "ADMIN"), []);
});

console.log(`\n# Итого (cabinets): ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
