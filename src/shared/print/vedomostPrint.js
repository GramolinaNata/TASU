// ============================================================
// Единый модуль печати ведомостей (грузовая + перевозчика).
// Вид зафиксирован по эталону заказчика — чтобы печать из разных
// страниц не расходилась. Все места печати вызывают эти две функции.
//
// Контракты данных:
//   printCargoVedomost({ companyName, batchNumber, city, rows })
//     rows: [{ docNumber, receiver, phone, seats, weight, city, sum }]
//   printCarrierVedomost({ companyName, vedomostNumber, rows, totals })
//     rows: [{ number, city, weight, carrierName, carrierRate, carrierSum, representativeName }]
//     totals: { totalWeight, carrierSum, representativeRate, representativeSum }
// ============================================================

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fmt(n) {
  return (Number(n) || 0).toLocaleString("ru-RU");
}
function today() {
  return new Date().toLocaleDateString("ru-RU");
}
function openPrint(html) {
  const blob = new Blob([html], { type: "text/html; charset=utf-8" });
  window.open(URL.createObjectURL(blob), "_blank");
}

const BASE_STYLE = `
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #000; }
  h2 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
  .sub { color: #333; font-size: 11px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
  th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; font-weight: 700; text-align: center; }
  .totals { margin-top: 16px; display: flex; gap: 24px; flex-wrap: wrap; }
  .totals div { padding: 8px 14px; border: 1px solid #000; border-radius: 4px; font-weight: 700; }
  .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
  .sig { flex: 1; }
  .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 28px; }
  .sig-label { font-size: 10px; color: #333; text-align: center; }
`;

// ── ГРУЗОВАЯ ВЕДОМОСТЬ ──────────────────────────────────────
// Строки по накладным. QR в правом верхнем углу, строка ИТОГО,
// подписи «Выдал» / «Принял».
export async function printCargoVedomost({ companyName = "", batchNumber = "", city = "", rows = [], representativeName = "", representativePhone = "" }) {
  const { toDataURL } = await import("qrcode");
  const qrUrl = await toDataURL(`TASU-BATCH-${batchNumber}`, { width: 120, margin: 1 });

  // ТЗ: контакт нашего представителя в грузовой ведомости (имя · телефон).
  // Показываем строку только если что-то задано.
  const repContact = [representativeName, representativePhone].map(s => String(s || "").trim()).filter(Boolean).join(" · ");
  const repHtml = repContact ? `<div class="sub" style="margin-top:4px">Представитель: ${esc(repContact)}</div>` : "";

  let total = 0;
  const rowsHtml = rows.map((r, i) => {
    const sum = (r.sum === 0 || r.sum) ? Number(r.sum) : null;
    if (sum != null) total += sum;
    return `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${esc(r.docNumber || "—")}</td>
      <td>${esc(r.receiver || "—")}</td>
      <td>${esc(r.phone || "—")}</td>
      <td style="text-align:center">${r.seats ? esc(String(r.seats)) : "—"}</td>
      <td style="text-align:center">${r.weight ? esc(String(r.weight)) + " кг" : "—"}</td>
      <td>${esc(r.city || "—")}</td>
      <td style="text-align:right;font-weight:700">${sum != null ? fmt(sum) + " тг" : "—"}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Грузовая ведомость ${esc(batchNumber)}</title>
  <style>${BASE_STYLE}</style></head><body>
    <div class="header">
      <div>
        <h2>Грузовая ведомость</h2>
        <div class="sub">${esc(companyName)} &nbsp;&nbsp; Партия № ${esc(batchNumber)} &nbsp;&nbsp; Город: ${esc(city || "—")} &nbsp;&nbsp; Дата: ${today()}</div>
        ${repHtml}
      </div>
      <img src="${qrUrl}" width="80" height="80" style="border:1px solid #ccc;padding:3px;"/>
    </div>
    <table>
      <thead><tr>
        <th style="width:30px">№</th>
        <th>Номер накладной</th>
        <th>Получатель</th>
        <th style="width:130px">Номер телефона</th>
        <th style="width:50px">Мест</th>
        <th style="width:60px">Вес</th>
        <th style="width:90px">Город</th>
        <th style="width:100px">Сумма</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot><tr>
        <td colspan="7" style="text-align:right;font-weight:900">ИТОГО:</td>
        <td style="text-align:right;font-weight:900">${fmt(total)} тг</td>
      </tr></tfoot>
    </table>
    <div class="signatures">
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Выдал (ФИО, подпись)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Принял (ФИО, подпись)</div></div>
    </div>
    <script>window.onload=function(){window.print();}</script>
  </body></html>`;
  openPrint(html);
}

// ── ВЕДОМОСТЬ ПЕРЕВОЗЧИКА ───────────────────────────────────
// Строки по партиям. Плашки итогов, подписи «Составил» / «Принял».
export function printCarrierVedomost({ companyName = "", vedomostNumber = "", rows = [], totals = {} }) {
  const rowsHtml = rows.map((r, i) => `<tr>
    <td style="text-align:center">${i + 1}</td>
    <td>${esc(r.number)}</td>
    <td>${esc(r.city)}</td>
    <td style="text-align:center">${fmt(r.weight)} кг</td>
    <td>${esc(r.carrierName || "—")}</td>
    <td style="text-align:center">${fmt(r.carrierRate)} тг/кг</td>
    <td style="text-align:center;font-weight:700">${fmt(r.carrierSum)} тг</td>
    <td>${esc(r.representativeName || "—")}</td>
  </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ведомость перевозчика ${esc(vedomostNumber)}</title>
  <style>${BASE_STYLE}</style></head><body>
    <div class="header">
      <div>
        <h2>Ведомость перевозчика</h2>
        <div class="sub">${esc(companyName)} &nbsp;&nbsp; № ${esc(vedomostNumber)} &nbsp;&nbsp; Дата: ${today()}</div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th style="width:24px">№</th>
        <th>Партия</th>
        <th>Город</th>
        <th style="width:60px">Вес</th>
        <th>Перевозчик</th>
        <th style="width:70px">Тариф</th>
        <th style="width:80px">Сумма перевозчику</th>
        <th>Представитель</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="totals">
      <div>Общий вес: ${fmt(totals.totalWeight)} кг</div>
      <div>Сумма перевозчику: ${fmt(totals.carrierSum)} тг</div>
      <div>Сумма представителю: ${fmt(totals.representativeSum)} тг</div>
    </div>
    <div class="signatures">
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Составил (ФИО, подпись)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Принял (ФИО, подпись)</div></div>
    </div>
    <script>window.onload=function(){window.print();}</script>
  </body></html>`;
  openPrint(html);
}
