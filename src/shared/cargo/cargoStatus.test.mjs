// Тесты движения груза. Запуск: npm test
// Фиксируют порядок цепочки, запрет перескока, права ролей и разбор QR —
// включая СТАРЫЙ формат, который уже напечатан на отгруженных наклейках.
import assert from "node:assert";
import {
  CARGO_CHAIN, CARGO_STATUS, CARGO_ROLES,
  isKnownCargoStatus, cargoLabel, nextCargoStatus, prevCargoStatus,
  canSetCargoStatus, parseScanPayload, buildScanUrl,
  // Полный маршрут, матрица ролей и журнал движения — добавлено вместе
  // со складом, местным и региональным курьером.
  CARGO_FLOW, CARGO_FLOW_KEYS, CARGO_REVERT_ROLES,
  cargoActionLabel, isOptionalCargoStep, canRoleSetStep, roleMovesCargo,
  allowedNextCargoStatuses,
  cargoEventsFrom, buildCargoEvent, appendCargoEvent,
  lastCargoEventFor, reachedCargoSteps,
  // Карта старых значений — чтобы едущий груз не начал цепочку заново.
  CARGO_LEGACY_MAP, normalizeCargoStatus, cargoStatusFromDocStatus,
  CARGO_BLOCKING_DOC_STATUSES, isCargoWorkable,
} from "./cargoStatus.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

// ---- цепочка ----

test("Цепочка из ТЗ: забрал → погрузил → представитель принял → выдал", () => {
  assert.deepStrictEqual(CARGO_CHAIN, ["picked_up", "loaded", "rep_received", "delivered"]);
});
test("Следующий шаг считается по порядку", () => {
  assert.strictEqual(nextCargoStatus(""), "picked_up");
  assert.strictEqual(nextCargoStatus("picked_up"), "loaded");
  assert.strictEqual(nextCargoStatus("loaded"), "rep_received");
  assert.strictEqual(nextCargoStatus("rep_received"), "delivered");
});
test("После выдачи шагов больше нет", () => {
  assert.strictEqual(nextCargoStatus("delivered"), null);
});
test("Мусор в текущем статусе трактуется как «не в пути»", () => {
  assert.strictEqual(nextCargoStatus("чтотопопало"), "picked_up");
  assert.strictEqual(nextCargoStatus(null), "picked_up");
});
test("Предыдущий шаг для отмены", () => {
  assert.strictEqual(prevCargoStatus("picked_up"), "");
  assert.strictEqual(prevCargoStatus("delivered"), "rep_received");
  assert.strictEqual(prevCargoStatus(""), null);
});
test("Известность статуса", () => {
  assert.ok(isKnownCargoStatus(""));
  assert.ok(isKnownCargoStatus("loaded"));
  assert.ok(!isKnownCargoStatus("Забрано"));   // старое значение из status
});
test("У каждого шага есть подпись", () => {
  for (const s of ["", ...CARGO_CHAIN]) assert.ok(cargoLabel(s).length > 0, `нет подписи для ${s}`);
});

// ---- переходы ----

test("Разрешён только следующий шаг", () => {
  assert.ok(canSetCargoStatus("", "picked_up", "COURIER").ok);
  assert.ok(canSetCargoStatus("picked_up", "loaded", "COURIER").ok);
});
test("ПЕРЕСКОК ЗАПРЕЩЁН: нельзя выдать груз, который не забирали", () => {
  const r = canSetCargoStatus("", "delivered", "COURIER");
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /перескочить/);
});
test("Нельзя прыгнуть через шаг вперёд", () => {
  assert.strictEqual(canSetCargoStatus("picked_up", "rep_received", "MANAGER").ok, false);
});
test("Повторный скан той же наклейки — не ошибка, а холостой успех", () => {
  const r = canSetCargoStatus("loaded", "loaded", "COURIER");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.noop, true);
});
test("Шаг назад: менеджеру и админу можно", () => {
  assert.ok(canSetCargoStatus("loaded", "picked_up", "MANAGER").ok);
  assert.ok(canSetCargoStatus("delivered", "rep_received", "ADMIN").ok);
});
test("Шаг назад: курьеру нельзя", () => {
  const r = canSetCargoStatus("loaded", "picked_up", "COURIER");
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /менеджер|администратор/);
});
test("Сброс в «не в пути» отдельным вызовом не делается", () => {
  assert.strictEqual(canSetCargoStatus("picked_up", "", "ADMIN").ok, false);
});
test("Неизвестный статус отвергается", () => {
  assert.strictEqual(canSetCargoStatus("", "Забрано", "ADMIN").ok, false);
  assert.strictEqual(canSetCargoStatus("", "чтоугодно", "ADMIN").ok, false);
});

// ---- роли ----

test("Этап 1: движение отмечают COURIER, MANAGER, ADMIN", () => {
  assert.deepStrictEqual(CARGO_ROLES, ["COURIER", "MANAGER", "ADMIN"]);
  for (const role of CARGO_ROLES) assert.ok(canSetCargoStatus("", "picked_up", role).ok, role);
});
test("Посторонние роли не двигают груз", () => {
  for (const role of ["ACCOUNTANT", "ACCOUNTANT2", "PRIVATE", "MANAGER2", undefined, ""]) {
    const r = canSetCargoStatus("", "picked_up", role);
    assert.strictEqual(r.ok, false, `роль ${role} прошла`);
  }
});

// ---- разбор QR ----

test("Новый QR-формат: ссылка /scan/<id>", () => {
  const r = parseScanPayload("https://tasu.kz/scan/2b7c1f9e-1111-4222-8333-444455556666");
  assert.deepStrictEqual(r, { kind: "id", value: "2b7c1f9e-1111-4222-8333-444455556666" });
});
test("Ссылка с портом и хвостом разбирается", () => {
  assert.strictEqual(parseScanPayload("http://localhost/scan/abc?x=1").value, "abc");
  assert.strictEqual(parseScanPayload("http://localhost:5173/scan/abc#z").value, "abc");
});
test("СТАРЫЙ формат наклеек: TASU-номер-город-получатель", () => {
  const r = parseScanPayload("TASU-А000007-Алматы-Иванов И.И.");
  assert.deepStrictEqual(r, { kind: "docNumber", value: "А000007" });
});
test("Старый формат: город с дефисом не ломает разбор", () => {
  assert.strictEqual(parseScanPayload("TASU-А000007-Усть-Каменогорск-Абд-Рахман").value, "А000007");
});
test("Старый формат: новая нумерация частных (голое число)", () => {
  assert.strictEqual(parseScanPayload("TASU-7-Алматы-Иванов").value, "7");
});
test("Голый uuid принимается", () => {
  const id = "2b7c1f9e-1111-4222-8333-444455556666";
  assert.deepStrictEqual(parseScanPayload(id), { kind: "id", value: id });
});
test("Мусор не распознаётся", () => {
  for (const x of ["", null, undefined, "просто текст", "https://tasu.kz/acts/123"]) {
    assert.strictEqual(parseScanPayload(x), null, `распознал мусор: ${x}`);
  }
});
test("Ссылка для наклейки собирается без двойного слэша", () => {
  assert.strictEqual(buildScanUrl("https://tasu.kz", "abc"), "https://tasu.kz/scan/abc");
  assert.strictEqual(buildScanUrl("https://tasu.kz/", "abc"), "https://tasu.kz/scan/abc");
});
test("Собранная ссылка разбирается обратно — круг замкнут", () => {
  const id = "2b7c1f9e-1111-4222-8333-444455556666";
  assert.strictEqual(parseScanPayload(buildScanUrl("https://tasu.kz", id)).value, id);
});

// ============================================================
// ПОЛНЫЙ МАРШРУТ: склад → местный курьер → фура → регион.
//
// Всё, что выше, оставлено без единой правки намеренно: эти тесты и есть
// доказательство, что расширение маршрута не тронуло едущий груз.
// ============================================================

test("Опорные шаги — это ровно прежняя четвёрка", () => {
  // CARGO_CHAIN теперь вычисляется из CARGO_FLOW, и он обязан совпасть
  // со старым списком: на нём стоит полоса прогресса в сканере и по ссылке.
  assert.deepStrictEqual(CARGO_CHAIN, CARGO_FLOW.filter(s => !s.optional).map(s => s.key));
  assert.deepStrictEqual(CARGO_CHAIN, ["picked_up", "loaded", "rep_received", "delivered"]);
});

test("Полный маршрут: девять шагов в порядке ТЗ", () => {
  assert.deepStrictEqual(CARGO_FLOW_KEYS, [
    "picked_up", "wh_accepted", "wh_released", "courier_took",
    "loaded", "in_transit", "region_took", "rep_received", "delivered",
  ]);
});

test("Новые шаги необязательные, прежние четыре — опорные", () => {
  for (const s of ["picked_up", "loaded", "rep_received", "delivered"]) {
    assert.strictEqual(isOptionalCargoStep(s), false, `${s} обязан остаться опорным`);
  }
  for (const s of ["wh_accepted", "wh_released", "courier_took", "in_transit", "region_took"]) {
    assert.strictEqual(isOptionalCargoStep(s), true, `${s} должен быть необязательным`);
  }
});

test("У каждого шага полного маршрута есть подпись и действие", () => {
  for (const s of CARGO_FLOW_KEYS) {
    assert.ok(cargoLabel(s).length > 0, `нет подписи для ${s}`);
    assert.ok(cargoActionLabel(s).length > 0, `нет действия для ${s}`);
  }
});

// ---- маршрут через склад ----

test("Складской путь проходится целиком", () => {
  const path = ["picked_up", "wh_accepted", "wh_released", "courier_took", "loaded",
                "in_transit", "region_took", "rep_received", "delivered"];
  let cur = "";
  for (const step of path) {
    const r = canSetCargoStatus(cur, step, "ADMIN");
    assert.ok(r.ok, `${cur || "пусто"} → ${step}: ${r.reason || ""}`);
    cur = step;
  }
});

test("СТАРЫЙ путь мимо склада по-прежнему проходится целиком", () => {
  // Главная проверка совместимости: груз, который не заходит на склад,
  // обязан ехать ровно как раньше.
  let cur = "";
  for (const step of ["picked_up", "loaded", "rep_received", "delivered"]) {
    const r = canSetCargoStatus(cur, step, "COURIER");
    assert.ok(r.ok, `${cur || "пусто"} → ${step}: ${r.reason || ""}`);
    cur = step;
  }
});

test("Необязательные шаги можно пропускать пачкой", () => {
  // От «забран» сразу на фуру — минуя склад и местного курьера.
  assert.ok(canSetCargoStatus("picked_up", "loaded", "MANAGER").ok);
  // И от «принят на склад» сразу на фуру.
  assert.ok(canSetCargoStatus("wh_accepted", "loaded", "MANAGER").ok);
});

test("Опорный шаг пропустить нельзя даже через необязательные", () => {
  // Между «на складе» и «у представителя» лежит опорный «погружен на фуру».
  const r = canSetCargoStatus("wh_accepted", "rep_received", "ADMIN");
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /перескочить/);
});

test("ВХОДНОЙ ШАГ: цепочка начинается и с приёмки на склад", () => {
  // Прежде здесь стоял запрет — «до склада обязателен забор». На первом же
  // складе заказчика это дало кладовщику НОЛЬ доступных кнопок: весь груз
  // лежал «не в пути». Клиент часто привозит груз сам, и тогда приёмка на
  // склад и есть первое событие; требовать выдуманного «забора» — значит
  // просить соврать в журнале ради прохождения проверки.
  assert.strictEqual(canSetCargoStatus("", "wh_accepted", "WAREHOUSE_KEEPER").ok, true);
  assert.strictEqual(canSetCargoStatus("", "wh_accepted", "ADMIN").ok, true);
});

test("ВХОДНОЙ ШАГ: у кладовщика есть кнопка на грузе «не в пути»", () => {
  // Ровно тот сценарий, который сломался у заказчика.
  const a = allowedNextCargoStatuses("", "WAREHOUSE_KEEPER");
  assert.ok(a.includes("wh_accepted"), "кладовщику нечего нажать: " + JSON.stringify(a));
});

test("ВХОДНЫХ ШАГОВ РОВНО ДВА — забор и приёмка на склад", () => {
  // Всё остальное по-прежнему требует пройденной цепочки: входной шаг это
  // разрешение начать, а не разрешение перескочить.
  assert.deepStrictEqual(
    CARGO_FLOW.filter(s => s.entry).map(s => s.key),
    ["picked_up", "wh_accepted"]
  );
  for (const s of ["wh_released", "courier_took", "loaded", "in_transit", "region_took", "rep_received", "delivered"]) {
    assert.strictEqual(canSetCargoStatus("", s, "ADMIN").ok, false, `${s} не должен начинать цепочку`);
  }
});

test("Начали со склада — цепочка едет дальше без «забора»", () => {
  let cur = "";
  for (const step of ["wh_accepted", "wh_released", "loaded", "rep_received", "delivered"]) {
    const r = canSetCargoStatus(cur, step, "ADMIN");
    assert.ok(r.ok, `${cur || "пусто"} → ${step}: ${r.reason || ""}`);
    cur = step;
  }
});

test("Откат через необязательные шаги разрешён менеджеру", () => {
  assert.ok(canSetCargoStatus("loaded", "picked_up", "MANAGER").ok);
  assert.ok(canSetCargoStatus("courier_took", "picked_up", "ADMIN").ok);
});

test("Откат через ОПОРНЫЙ шаг запрещён всем", () => {
  assert.strictEqual(canSetCargoStatus("delivered", "picked_up", "ADMIN").ok, false);
});

// ---- матрица ролей ----

test("Три прежние роли двигают КАЖДЫЙ шаг маршрута, включая новые", () => {
  // Ни одно действие, доступное им раньше, не стало недоступным — и новые
  // шаги им тоже открыты, иначе маршрут был бы непроходим до кабинетов.
  for (const role of ["COURIER", "MANAGER", "ADMIN"]) {
    for (const step of CARGO_FLOW_KEYS) {
      assert.ok(canRoleSetStep(role, step), `${role} не может ${step}`);
    }
  }
});

test("Операционный менеджер видит весь маршрут и вправе откатывать", () => {
  for (const step of CARGO_FLOW_KEYS) {
    assert.ok(canRoleSetStep("OPS_MANAGER", step), `OPS_MANAGER не может ${step}`);
  }
  assert.ok(CARGO_REVERT_ROLES.includes("OPS_MANAGER"));
});

test("Кладовщик отмечает только склад и погрузку", () => {
  assert.ok(canRoleSetStep("WAREHOUSE_KEEPER", "wh_accepted"));
  assert.ok(canRoleSetStep("WAREHOUSE_KEEPER", "wh_released"));
  assert.ok(canRoleSetStep("WAREHOUSE_KEEPER", "loaded"));
  assert.strictEqual(canRoleSetStep("WAREHOUSE_KEEPER", "delivered"), false);
  assert.strictEqual(canRoleSetStep("WAREHOUSE_KEEPER", "region_took"), false);
});

test("Местный курьер не выдаёт груз в регионе, региональный не работает на складе", () => {
  assert.ok(canRoleSetStep("COURIER_LOCAL", "courier_took"));
  assert.strictEqual(canRoleSetStep("COURIER_LOCAL", "delivered"), false);
  assert.ok(canRoleSetStep("COURIER_REGION", "delivered"));
  assert.strictEqual(canRoleSetStep("COURIER_REGION", "wh_accepted"), false);
});

test("Роль вне маршрута не двигает груз", () => {
  for (const role of ["ACCOUNTANT", "PRIVATE", "MANAGER2", "", undefined]) {
    assert.strictEqual(roleMovesCargo(role), false, `роль ${role} прошла`);
  }
});

test("Кладовщику отказывают именно в чужом шаге, а не вообще", () => {
  const r = canSetCargoStatus("picked_up", "delivered", "WAREHOUSE_KEEPER");
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /не отмечает шаг/);
});

test("Откат курьерским ролям закрыт", () => {
  for (const role of ["COURIER", "COURIER_LOCAL", "COURIER_REGION", "WAREHOUSE_KEEPER"]) {
    assert.strictEqual(CARGO_REVERT_ROLES.includes(role), false, `${role} не должен откатывать`);
  }
});

// ---- список доступных шагов ----

test("Доступные шаги вперёд: необязательные плюс ближайший опорный", () => {
  assert.deepStrictEqual(allowedNextCargoStatuses("picked_up", "ADMIN"),
    ["wh_accepted", "wh_released", "courier_took", "loaded"]);
  assert.deepStrictEqual(allowedNextCargoStatuses("rep_received", "ADMIN"), ["delivered"]);
  assert.deepStrictEqual(allowedNextCargoStatuses("delivered", "ADMIN"), []);
});

test("Список доступных шагов урезается ролью", () => {
  assert.deepStrictEqual(allowedNextCargoStatuses("picked_up", "WAREHOUSE_KEEPER"),
    ["wh_accepted", "wh_released", "loaded"]);
});

test("Всё из списка доступных действительно проходит проверку", () => {
  for (const cur of ["", ...CARGO_FLOW_KEYS]) {
    for (const step of allowedNextCargoStatuses(cur, "ADMIN")) {
      assert.ok(canSetCargoStatus(cur, step, "ADMIN").ok, `${cur} → ${step} обещан, но запрещён`);
    }
  }
});

// ---- журнал движения ----

test("Пустой журнал разбирается из null, мусора и строки", () => {
  assert.deepStrictEqual(cargoEventsFrom(null), []);
  assert.deepStrictEqual(cargoEventsFrom(undefined), []);
  assert.deepStrictEqual(cargoEventsFrom("не json"), []);
  assert.deepStrictEqual(cargoEventsFrom(42), []);
  assert.deepStrictEqual(cargoEventsFrom('[{"status":"loaded"}]'), [{ status: "loaded" }]);
});

test("Запись журнала содержит шаг, время и автора", () => {
  const e = buildCargoEvent("loaded", { id: 7, name: "Иванов", role: "COURIER" }, { at: "2026-08-26T10:00:00.000Z" });
  assert.strictEqual(e.status, "loaded");
  assert.strictEqual(e.at, "2026-08-26T10:00:00.000Z");
  assert.strictEqual(e.byId, 7);
  assert.strictEqual(e.byName, "Иванов");
  assert.strictEqual(e.byRole, "COURIER");
  assert.strictEqual(e.back, false);
});

test("Автор неизвестен — поля пустые, а не падение", () => {
  const e = buildCargoEvent("picked_up");
  assert.strictEqual(e.byId, null);
  assert.strictEqual(e.byName, "");
  assert.ok(e.at.length > 0);
});

test("Добавление записи не теряет прежние", () => {
  let log = null;
  log = appendCargoEvent(log, buildCargoEvent("picked_up", { role: "COURIER" }));
  log = appendCargoEvent(log, buildCargoEvent("loaded", { role: "COURIER" }));
  assert.strictEqual(log.length, 2);
  assert.deepStrictEqual(log.map(e => e.status), ["picked_up", "loaded"]);
});

test("Откат остаётся в истории, но пройденным шагом не считается", () => {
  let log = appendCargoEvent(null, buildCargoEvent("picked_up", { role: "MANAGER" }));
  log = appendCargoEvent(log, buildCargoEvent("loaded", { role: "MANAGER" }));
  log = appendCargoEvent(log, buildCargoEvent("picked_up", { role: "MANAGER" }, { back: true }));
  assert.strictEqual(log.length, 3, "запись отката обязана сохраниться");
  assert.deepStrictEqual(reachedCargoSteps(log), ["picked_up", "loaded"]);
});

test("Пройденные шаги отдаются в порядке маршрута, а не записи", () => {
  const log = [
    buildCargoEvent("loaded", { role: "ADMIN" }),
    buildCargoEvent("picked_up", { role: "ADMIN" }),
    buildCargoEvent("wh_accepted", { role: "ADMIN" }),
  ];
  assert.deepStrictEqual(reachedCargoSteps(log), ["picked_up", "wh_accepted", "loaded"]);
});

test("Последняя отметка по шагу — самая свежая, откаты не в счёт", () => {
  const log = [
    buildCargoEvent("wh_accepted", { name: "Первый" }, { at: "2026-08-01T00:00:00.000Z" }),
    buildCargoEvent("wh_accepted", { name: "Второй" }, { at: "2026-08-02T00:00:00.000Z" }),
    buildCargoEvent("wh_accepted", { name: "Откат" }, { at: "2026-08-03T00:00:00.000Z", back: true }),
  ];
  assert.strictEqual(lastCargoEventFor(log, "wh_accepted").byName, "Второй");
  assert.strictEqual(lastCargoEventFor(log, "delivered"), null);
});

test("Мусор в журнале не ломает разбор пройденных шагов", () => {
  const log = [null, "строка", { status: "чтотопопало" }, buildCargoEvent("picked_up", {})];
  assert.deepStrictEqual(reachedCargoSteps(log), ["picked_up"]);
});

// ---- аннулированные накладные ----

test("АННУЛИРОВАННУЮ накладную не двигают", () => {
  // Кабинет кладовщика показывал аннулированные наравне с живыми — в его
  // урезанной выдаче поля status нет вовсе, отличить было нечем. Одну такую
  // успели провести через приёмку и отпуск склада.
  const r = isCargoWorkable({ status: "canceled" });
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /аннулирована/);
});

test("Рабочие статусы документа движению не мешают", () => {
  // Груз может ехать, пока накладная «Обработана» или «Оплачена» — это
  // разные оси, и смешивать их нельзя.
  for (const st of ["act", "sent", "done", "draft", "deferred", "", undefined]) {
    assert.strictEqual(isCargoWorkable({ status: st }).ok, true, `статус «${st}» не должен блокировать`);
  }
  assert.strictEqual(isCargoWorkable(null).ok, true);
});

test("Блокирующий статус ровно один — аннулирование", () => {
  assert.deepStrictEqual(CARGO_BLOCKING_DOC_STATUSES, ["canceled"]);
});

// ---- карта старых значений ----

test("КАРТА: прежняя четвёрка отображается сама в себя", () => {
  // Обещание записано буквами, а не подразумевается. Первый же переименованный
  // шаг обязан появиться в карте, иначе история едущего груза оборвётся.
  for (const s of ["picked_up", "loaded", "rep_received", "delivered"]) {
    assert.strictEqual(CARGO_LEGACY_MAP[s], s, `${s} обязан отображаться в себя`);
    assert.strictEqual(normalizeCargoStatus(s), s);
  }
});

test("КАРТА: каждое значение ведёт в существующий шаг маршрута", () => {
  for (const [from, to] of Object.entries(CARGO_LEGACY_MAP)) {
    assert.ok(CARGO_FLOW_KEYS.includes(to), `${from} ведёт в несуществующий шаг ${to}`);
  }
});

test("КАРТА: новые шаги проходят нормализацию без изменений", () => {
  for (const s of CARGO_FLOW_KEYS) assert.strictEqual(normalizeCargoStatus(s), s);
});

test("КАРТА: протечка из статуса документа читается, а не теряется", () => {
  // «Забрано»/«Доставлено» писались ПРЯМО в Request.status старым курьерским
  // экраном. Если такое значение оказалось в cargoStatus, трактовать его как
  // «не в пути» — соврать: груз-то забрали.
  assert.strictEqual(normalizeCargoStatus("Забрано"), "picked_up");
  assert.strictEqual(normalizeCargoStatus("Доставлено"), "delivered");
  assert.strictEqual(normalizeCargoStatus("  забрано  "), "picked_up");
  assert.strictEqual(normalizeCargoStatus("ДОСТАВЛЕНО"), "delivered");
});

test("КАРТА: мусор и пустота дают «не в пути», как раньше", () => {
  for (const v of ["", "   ", "чтотопопало", null, undefined, 42, {}]) {
    assert.strictEqual(normalizeCargoStatus(v), "", `«${String(v)}» должно дать пусто`);
  }
});

test("КАРТА не расширяет список допустимых: ставить «Забрано» по-прежнему нельзя", () => {
  // isKnownCargoStatus остаётся строгой. Карта нужна для ЧТЕНИЯ базы,
  // а не для приёма таких значений на вход.
  assert.strictEqual(isKnownCargoStatus("Забрано"), false);
  assert.strictEqual(canSetCargoStatus("", "Забрано", "ADMIN").ok, false);
  assert.strictEqual(canSetCargoStatus("", "Доставлено", "ADMIN").ok, false);
});

test("Старое значение в базе продолжает цепочку, а не начинает заново", () => {
  // До карты груз с «Забрано» считался нетронутым, и следующим шагом ему
  // предлагали «забрать» ещё раз.
  assert.strictEqual(nextCargoStatus("Забрано"), "loaded");
  assert.ok(canSetCargoStatus("Забрано", "loaded", "COURIER").ok);
  assert.strictEqual(canSetCargoStatus("Забрано", "picked_up", "COURIER").ok, true,
    "повтор того же шага — холостой успех");
});

test("Движение из статуса документа выводится только для старых значений", () => {
  assert.strictEqual(cargoStatusFromDocStatus("Забрано"), "picked_up");
  assert.strictEqual(cargoStatusFromDocStatus("Доставлено"), "delivered");
  // Рабочий процесс документа движением груза не является — это разные оси.
  for (const s of ["Заявка", "Обработана", "Оплачена", "", null, undefined]) {
    assert.strictEqual(cargoStatusFromDocStatus(s), "", `«${String(s)}» не движение груза`);
  }
});

console.log(`\nИтого (cargoStatus): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
