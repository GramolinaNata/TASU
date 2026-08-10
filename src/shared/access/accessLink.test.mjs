// Тесты одноразовых ссылок. Запуск: npm test
// Главное, что фиксируют: три предохранителя (срок / однократность / отзыв)
// и состав публичной выдачи — ссылка уходит в чужой мессенджер, лишнего
// в ней быть не должно.
import assert from "node:assert";
import {
  LINK_PURPOSE, TTL_OPTIONS, DEFAULT_TTL_DAYS,
  linkState, isLinkUsable, linkPath, buildLinkUrl, expiryFromNow,
  publicCargoView, FORBIDDEN_PUBLIC_FIELDS,
} from "./accessLink.js";

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("✓ " + name); }
  catch (e) { failed++; console.error("✗ FAIL: " + name + "\n   " + e.message); }
}

const NOW = Date.parse("2026-08-07T12:00:00.000Z");
const через = (h) => new Date(NOW + h * 3600 * 1000).toISOString();

// ---- предохранители ----

test("Свежая ссылка активна", () => {
  assert.strictEqual(linkState({ expiresAt: через(72) }, NOW), "active");
  assert.ok(isLinkUsable({ expiresAt: через(72) }, NOW));
});
test("ПРЕДОХРАНИТЕЛЬ 1 — срок: истёкшая не работает", () => {
  assert.strictEqual(linkState({ expiresAt: через(-1) }, NOW), "expired");
  assert.ok(!isLinkUsable({ expiresAt: через(-1) }, NOW));
});
test("Ссылка гаснет ровно в момент истечения, не позже", () => {
  assert.strictEqual(linkState({ expiresAt: new Date(NOW).toISOString() }, NOW), "expired");
});
test("ПРЕДОХРАНИТЕЛЬ 2 — однократность: использованная не работает", () => {
  assert.strictEqual(linkState({ expiresAt: через(72), usedAt: через(1) }, NOW), "used");
  assert.ok(!isLinkUsable({ expiresAt: через(72), usedAt: через(1) }, NOW));
});
test("ПРЕДОХРАНИТЕЛЬ 3 — отзыв: отозванная не работает даже в срок", () => {
  assert.strictEqual(linkState({ expiresAt: через(72), revokedAt: через(1) }, NOW), "revoked");
});
test("Отзыв важнее использования — в интерфейсе видно, что погасили вручную", () => {
  assert.strictEqual(linkState({ expiresAt: через(72), usedAt: через(1), revokedAt: через(2) }, NOW), "revoked");
});
test("Мусор вместо записи не считается активной ссылкой", () => {
  for (const x of [null, undefined, "строка", 42]) {
    assert.strictEqual(isLinkUsable(x, NOW), false, `прошло: ${x}`);
  }
});
test("Ссылка без срока не протухает сама — гасится только действием или отзывом", () => {
  assert.strictEqual(linkState({}, NOW), "active");
  assert.strictEqual(linkState({ usedAt: через(1) }, NOW), "used");
});

// ---- срок выдачи ----

test("Варианты срока: 1 / 3 / 7 дней, по умолчанию 3", () => {
  assert.deepStrictEqual(TTL_OPTIONS.map(o => o.days), [1, 3, 7]);
  assert.strictEqual(DEFAULT_TTL_DAYS, 3);
});
test("Дата окончания считается от текущего момента", () => {
  assert.strictEqual(expiryFromNow(3, NOW), new Date(NOW + 3 * 86400000).toISOString());
});
test("Кривой срок заменяется значением по умолчанию", () => {
  assert.strictEqual(expiryFromNow(0, NOW), expiryFromNow(DEFAULT_TTL_DAYS, NOW));
  assert.strictEqual(expiryFromNow(-5, NOW), expiryFromNow(DEFAULT_TTL_DAYS, NOW));
  assert.strictEqual(expiryFromNow("ой", NOW), expiryFromNow(DEFAULT_TTL_DAYS, NOW));
});

// ---- адреса ----

test("Статус груза и подпись ведут на разные страницы", () => {
  assert.strictEqual(linkPath(LINK_PURPOSE.CARGO, "abc"), "/t/abc");
  assert.strictEqual(linkPath(LINK_PURPOSE.SIGN, "abc"), "/sign/abc");
});
test("Ссылка собирается без двойного слэша", () => {
  assert.strictEqual(buildLinkUrl("https://tasu.kz", LINK_PURPOSE.CARGO, "abc"), "https://tasu.kz/t/abc");
  assert.strictEqual(buildLinkUrl("https://tasu.kz/", LINK_PURPOSE.SIGN, "abc"), "https://tasu.kz/sign/abc");
});

// ---- состав публичной выдачи ----

const заявка = {
  id: "id-1", docNumber: "ERW000011", cargoStatus: "loaded", cargoStatusAt: "2026-08-07T10:00:00.000Z",
  totalSum: "450000", companyId: "c-1", managerId: 3,
};
const детали = {
  route: { fromCity: "Алматы", toCity: "Астана", fromAddress: "склад 1", toAddress: "ул. Абая 15" },
  totals: { seats: 3, weight: 24 },
  customer: { fio: "Иванов", phone: "+7 777" },
  receiver: { fio: "Петров", phone: "+7 707" },
  services: [{ name: "Доставка", sum: 450000 }],
};

test("По ссылке видно то, что нужно водителю", () => {
  const v = publicCargoView(заявка, детали);
  assert.strictEqual(v.docNumber, "ERW000011");
  assert.strictEqual(v.fromCity, "Алматы");
  assert.strictEqual(v.toCity, "Астана");
  assert.strictEqual(v.seats, 3);
  assert.strictEqual(v.weight, 24);
  assert.strictEqual(v.cargoStatus, "loaded");
});
test("АДРЕС ВЫГРУЗКИ отдаётся — водитель туда везёт", () => {
  assert.strictEqual(publicCargoView(заявка, детали).unloadingAddress, "ул. Абая 15");
});
test("СУММ, КОНТРАГЕНТОВ И ТЕЛЕФОНОВ в выдаче нет", () => {
  const v = publicCargoView(заявка, детали);
  const плоско = JSON.stringify(v);
  for (const f of FORBIDDEN_PUBLIC_FIELDS) {
    assert.ok(!(f in v), `поле ${f} просочилось в публичную выдачу`);
  }
  assert.ok(!плоско.includes("450000"), "сумма просочилась");
  assert.ok(!плоско.includes("Иванов"), "ФИО заказчика просочилось");
  assert.ok(!плоско.includes("Петров"), "ФИО получателя просочилось");
  assert.ok(!плоско.includes("+7"), "телефон просочился");
});
test("Адрес ЗАГРУЗКИ не отдаём — водителю нужен только адрес выгрузки", () => {
  assert.ok(!JSON.stringify(publicCargoView(заявка, детали)).includes("склад 1"));
});
test("Пустая заявка не роняет выдачу", () => {
  const v = publicCargoView(null, {});
  assert.strictEqual(v.docNumber, "");
  assert.strictEqual(v.seats, 0);
});

console.log(`\nИтого (accessLink): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
