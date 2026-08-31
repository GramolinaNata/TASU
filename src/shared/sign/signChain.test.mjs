// Тесты цепочки подписей.
//
// Два главных обещания:
//   • существующая подпись получателя работает как раньше — на неё завязаны
//     выданные ссылки, тег {%signature_receiver} и уже выданный груз;
//   • порядок ступеней соблюдается: подписать документ, которого нет, нельзя.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SIGN_ROLE, SIGN_CHAIN, SIGN_META, REQUIRE_CLIENT_REQUEST_SIGNATURE,
  isKnownSignRole, signLabel, signaturesFrom, signatureOf, hasSignature,
  putSignature, hasDocument, canFormDocument, canSign, signChainState, nextSignRole,
} from "./signChain.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("# ✓ " + name); }
  catch (e) { failed++; console.log("# ✗ " + name + " — " + e.message); }
}

const sig = (role, extra = {}) => ({
  role, name: "Иванов", image: "data:image/png;base64,xxx",
  signedAt: "2026-08-27T10:00:00.000Z", token: "t", ...extra,
});
const act = (over = {}) => ({ docType: "", type: "REQUEST", signatures: [], ...over });

// ── роли ────────────────────────────────────────────────────

test("Роль получателя НЕ ПЕРЕИМЕНОВАНА — от неё зависит прод", () => {
  // На эту строку смотрят выданные ссылки (у них роль в токене не записана),
  // тег {%signature_receiver} в бланке СМР и уже подписанные накладные.
  assert.equal(SIGN_ROLE.RECEIVER, "receiver");
});

test("Четыре ступени в порядке ТЗ, получатель последний", () => {
  assert.deepEqual(SIGN_CHAIN, ["client_request", "client_document", "driver", "receiver"]);
});

test("У каждой роли есть описание и подпись для человека", () => {
  for (const r of SIGN_CHAIN) {
    assert.ok(SIGN_META[r], `нет описания для ${r}`);
    assert.ok(SIGN_META[r].heading.length > 0);
    assert.ok(signLabel(r).length > 0);
  }
});

test("Посторонняя роль не признаётся", () => {
  assert.equal(isKnownSignRole("receiver"), true);
  assert.equal(isKnownSignRole("бухгалтер"), false);
  assert.equal(isKnownSignRole(""), false);
  assert.equal(isKnownSignRole(undefined), false);
});

// ── чтение и запись ─────────────────────────────────────────

test("Колонка разбирается из массива, строки, мусора и null", () => {
  assert.deepEqual(signaturesFrom(null), []);
  assert.deepEqual(signaturesFrom("не json"), []);
  assert.deepEqual(signaturesFrom(42), []);
  assert.deepEqual(signaturesFrom('[{"role":"receiver"}]'), [{ role: "receiver" }]);
  assert.deepEqual(signaturesFrom([null, "x", { role: "driver" }]), [{ role: "driver" }]);
});

test("Подпись роли находится, чужая — нет", () => {
  const list = [sig("client_request"), sig("receiver")];
  assert.equal(signatureOf(list, "receiver").role, "receiver");
  assert.equal(signatureOf(list, "driver"), null);
  assert.equal(hasSignature(list, "client_request"), true);
  assert.equal(hasSignature(list, "driver"), false);
});

test("Расписались дважды — берём последнюю", () => {
  const list = [sig("driver", { name: "Первый" }), sig("driver", { name: "Второй" })];
  assert.equal(signatureOf(list, "driver").name, "Второй");
});

test("Новая подпись ЗАМЕНЯЕТ свою роль и не трогает чужие", () => {
  // Иначе в документе оказались бы две подписи одного человека.
  let list = [sig("client_request", { name: "Клиент" }), sig("receiver", { name: "Получатель" })];
  list = putSignature(list, sig("receiver", { name: "Получатель-2" }));
  assert.equal(list.length, 2);
  assert.equal(signatureOf(list, "receiver").name, "Получатель-2");
  assert.equal(signatureOf(list, "client_request").name, "Клиент", "чужая подпись пострадала");
});

test("Первая подпись ложится в пустую колонку", () => {
  const list = putSignature(null, sig("client_request"));
  assert.equal(list.length, 1);
  assert.equal(list[0].role, "client_request");
});

// ── документ ────────────────────────────────────────────────

test("Документом считаются ТТН и СМР, заявка и склад — нет", () => {
  assert.equal(hasDocument({ docType: "ttn" }), true);
  assert.equal(hasDocument({ docType: "smr" }), true);
  assert.equal(hasDocument({ type: "SMR" }), true, "регистр не должен мешать");
  assert.equal(hasDocument({ type: "REQUEST" }), false);
  assert.equal(hasDocument({ docType: "warehouse" }), false);
  assert.equal(hasDocument(null), false);
});

// ── ворота на формирование ──────────────────────────────────

// Ворота проверяются в ОБОИХ положениях флага явным opts.require, а не
// «как сейчас настроено». Иначе набор ломался бы при каждом переключении
// константы — а переключать её предстоит: сейчас ворота выключены, включим,
// когда заказчик перейдёт на процесс.
const ON = { require: true };
const OFF = { require: false };

test("ВОРОТА ВКЛЮЧЕНЫ: без подписи заявки документ не формируется", () => {
  const r = canFormDocument(act(), ON);
  assert.equal(r.ok, false);
  assert.match(r.reason, /не подписал заявку/);
});

test("ВОРОТА ВКЛЮЧЕНЫ: с подписью заявки — формируется", () => {
  assert.equal(canFormDocument(act({ signatures: [sig("client_request")] }), ON).ok, true);
});

test("ВОРОТА ВКЛЮЧЕНЫ: чужая подпись воротами не считается", () => {
  // Подпись получателя от прошлой перевозки не открывает формирование.
  assert.equal(canFormDocument(act({ signatures: [sig("receiver")] }), ON).ok, false);
});

test("ВОРОТА ВЫКЛЮЧЕНЫ: документ формируется как раньше", () => {
  // Ровно то поведение, которое было до цепочки подписей. На проде все
  // существующие заявки без подписи — с включёнными воротами отгрузка встала бы.
  assert.equal(canFormDocument(act(), OFF).ok, true);
  assert.equal(canFormDocument(act({ signatures: [] }), OFF).ok, true);
});

test("ВЫКЛЮЧЕННЫЕ ВОРОТА не отменяют остальной порядок цепочки", () => {
  // Ослабляется ровно одно условие. Подпись документа, которого нет, и
  // подпись водителя раньше клиента запрещены при любом положении флага.
  assert.equal(canSign(act(), "client_document", OFF).ok, false);
  assert.equal(canSign(act({ docType: "ttn" }), "driver", OFF).ok, false);
});

test("Флаг сейчас выключен — сознательное решение по выкату", () => {
  // Тест-напоминание: значение читают ворота и на клиенте, и на сервере.
  // Меняя его, поменяйте И зеркало server/src/lib/signChain.ts.
  assert.equal(REQUIRE_CLIENT_REQUEST_SIGNATURE, false);
});

test("Умолчание берётся из константы, если opts не передан", () => {
  assert.equal(canFormDocument(act()).ok, REQUIRE_CLIENT_REQUEST_SIGNATURE === false);
});

// ── порядок сбора подписей ──────────────────────────────────

test("Подпись заявки доступна всегда — с неё цепочка начинается", () => {
  assert.equal(canSign(act(), "client_request").ok, true);
});

test("Подпись документа недоступна, пока документа нет", () => {
  const r = canSign(act({ signatures: [sig("client_request")] }), "client_document");
  assert.equal(r.ok, false);
  assert.match(r.reason, /не сформирован/);
});

test("ВОРОТА ВКЛЮЧЕНЫ: подпись документа недоступна без подписи заявки", () => {
  const r = canSign(act({ docType: "ttn" }), "client_document", ON);
  assert.equal(r.ok, false);
  assert.match(r.reason, /заявку/);
});

test("ВОРОТА ВЫКЛЮЧЕНЫ: подпись документа собирается без подписи заявки", () => {
  // Так и задумано: цепочку собирают в любом порядке снизу вверх, пока
  // обязательность подписи заявки не включена.
  assert.equal(canSign(act({ docType: "ttn" }), "client_document", OFF).ok, true);
});

test("Документ сформирован и заявка подписана — документ подписывать можно", () => {
  const a = act({ docType: "smr", signatures: [sig("client_request")] });
  assert.equal(canSign(a, "client_document").ok, true);
});

test("Водитель не подписывает раньше клиента", () => {
  const a = act({ docType: "ttn", signatures: [sig("client_request")] });
  const r = canSign(a, "driver");
  assert.equal(r.ok, false);
  assert.match(r.reason, /не подписал документ/);
});

test("Вся цепочка проходится по порядку", () => {
  let a = act();
  assert.ok(canSign(a, "client_request").ok);
  a = { ...a, signatures: putSignature(a.signatures, sig("client_request")) };

  assert.ok(canFormDocument(a).ok, "документ должен открыться");
  a = { ...a, docType: "smr" };

  assert.ok(canSign(a, "client_document").ok);
  a = { ...a, signatures: putSignature(a.signatures, sig("client_document")) };

  assert.ok(canSign(a, "driver").ok);
  a = { ...a, signatures: putSignature(a.signatures, sig("driver")) };

  assert.equal(a.signatures.length, 3);
});

test("ПОДПИСЬ ПОЛУЧАТЕЛЯ БЕЗ ВОРОТ — она была до цепочки", () => {
  // Ключевая проверка совместимости: выдача уже едущего груза не должна
  // упереться в незаполненную цепочку, которой в его времена не было.
  assert.equal(canSign(act(), "receiver").ok, true);
  assert.equal(canSign(act({ docType: "ttn" }), "receiver").ok, true);
});

test("Неизвестную роль подписать нельзя", () => {
  assert.equal(canSign(act(), "кто_угодно").ok, false);
});

// ── состояние цепочки ───────────────────────────────────────

test("Состояние показывает все четыре ступени", () => {
  const s = signChainState(act());
  assert.equal(s.length, 4);
  assert.deepEqual(s.map((x) => x.role), SIGN_CHAIN);
  assert.equal(s.every((x) => !x.signed), true);
});

test("Подписанная ступень помечена и несёт имя со временем", () => {
  const a = act({ signatures: [sig("client_request", { name: "Петров" })] });
  const s = signChainState(a).find((x) => x.role === "client_request");
  assert.equal(s.signed, true);
  assert.equal(s.name, "Петров");
  assert.equal(s.at, "2026-08-27T10:00:00.000Z");
});

test("Недоступная ступень объясняет причину", () => {
  const s = signChainState(act()).find((x) => x.role === "driver");
  assert.equal(s.available, false);
  assert.ok(s.reason.length > 0, "молчаливый запрет бесполезен");
});

test("Следующая ступень — ближайшая доступная и неподписанная", () => {
  assert.equal(nextSignRole(act()), "client_request");
  const signed = act({ signatures: [sig("client_request")] });
  // Документа ещё нет, поэтому дальше по цепочке — только получатель.
  assert.equal(nextSignRole(signed), "receiver");
  const withDoc = act({ docType: "ttn", signatures: [sig("client_request")] });
  assert.equal(nextSignRole(withDoc), "client_document");
});

test("Всё подписано — следующей ступени нет", () => {
  const a = act({
    docType: "ttn",
    signatures: SIGN_CHAIN.map((r) => sig(r)),
  });
  assert.equal(nextSignRole(a), null);
});

// ── синхронность зеркал ─────────────────────────────────────
//
// Модуль продублирован на сервере (server/src/lib/signChain.ts): образ бэка
// собирается из server/ и до src/ не достаёт. Дубль опасен тем, что правку
// делают в одном файле, а забывают во втором — и рассинхрон НИЧЕГО не ломает
// на сборке, он проявляется только на проде и молча.
//
// Самый дорогой случай ровно такой: ворота выключены на фронте и включены на
// сервере. Кнопка активна, менеджер жмёт, сервер отвечает 409 — и выглядит
// это как случайная поломка, а не как настройка.
const SERVER_MIRROR = readFileSync(
  new URL("../../../server/src/lib/signChain.ts", import.meta.url),
  "utf8"
);

test("ЗЕРКАЛО: флаг ворот совпадает на клиенте и на сервере", () => {
  const m = /REQUIRE_CLIENT_REQUEST_SIGNATURE\s*=\s*(true|false)/.exec(SERVER_MIRROR);
  assert.ok(m, "в server/src/lib/signChain.ts не найдено объявление флага");
  const serverValue = m[1] === "true";
  assert.equal(
    serverValue,
    REQUIRE_CLIENT_REQUEST_SIGNATURE,
    `флаг разошёлся: фронт ${REQUIRE_CLIENT_REQUEST_SIGNATURE}, сервер ${serverValue}. ` +
    "Поставьте одинаковое значение в src/shared/sign/signChain.js и server/src/lib/signChain.ts"
  );
});

test("ЗЕРКАЛО: строки ролей подписи совпадают", () => {
  // Переименование роли на одной стороне рвёт цепочку так же тихо: подпись
  // ляжет под одним именем, а прочитают её под другим.
  for (const [key, value] of Object.entries(SIGN_ROLE)) {
    const re = new RegExp(`${key}\\s*:\\s*['"]${value}['"]`);
    assert.ok(re.test(SERVER_MIRROR), `роль ${key}='${value}' не совпадает с серверным зеркалом`);
  }
});

console.log(`\n# Итого (signChain): ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
