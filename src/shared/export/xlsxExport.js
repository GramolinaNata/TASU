// ============================================================
// Экспорт ТТН в официальный бланк (Приложение 9 к Правилам перевозок
// грузов автомобильным транспортом).
//
// Шаблон: public/templates/ttn_2026.xlsx — присланный заказчиком бланк,
// из которого вычищены данные образца и расставлены токены {ключ}.
//
// ПОЧЕМУ ExcelJS, А НЕ SheetJS. Прежняя версия читала и писала шаблон через
// SheetJS (xlsx). Community-сборка не пишет обратно оформление: на записи
// терялись рамки (58 определений → 1), шрифты, ссылки на стили у 1350 ячеек
// и весь блок pageSetup (A4, альбом). Госформа выезжала голой сеткой в
// книжной ориентации. ExcelJS переносит стили и параметры печати из шаблона
// один в один — проверено сравнением styles.xml до и после записи.
//
// exceljs грузится динамическим import() — библиотека тяжёлая (~1 МБ),
// и в основной чанк её тянуть незачем: ТТН выгружают редко.
// ============================================================

// file-saver подключается динамически вместе с exceljs: тогда у модуля нет
// браузерных зависимостей на верхнем уровне и buildTtnData можно импортировать
// в Node — например, из теста или скрипта проверки бланка.

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

// Имя стороны: у юрлица — компания, у частника — ФИО.
function partyName(party) {
  if (!party) return "";
  return party.companyName || party.fio || "";
}

// Адрес пункта: «улица, город». Пустые части выкидываем, чтобы не
// оставлять висячих запятых, когда адрес не заполнен.
function joinAddress(addr, city) {
  return [addr, city].map(s => String(s || "").trim()).filter(Boolean).join(", ");
}

// ── Данные для бланка ───────────────────────────────────────
// Ключи совпадают с токенами {ключ} внутри ttn_2026.xlsx.
// Единицы измерения («мест», «кг») входят в значение — так в бланке
// заказчика: в самих ячейках K32/W32 стоит «1 мест» и «142 кг».
export function buildTtnData(act) {
  const a = act || {};

  const d = a.date ? new Date(a.date) : null;
  const validDate = d && !isNaN(d.getTime());

  // Грузоотправитель. Форма заявки пишет sender = null, когда отправитель
  // совпадает с заказчиком (флаг isSenderSameAsCustomer, по умолчанию true).
  // В реальных данных флаг у большинства заявок вообще не сохранён, поэтому
  // ориентируемся на факт: есть отдельный отправитель — берём его, нет —
  // подставляем заказчика. Иначе графа «Грузоотправитель» в госформе
  // осталась бы пустой почти везде.
  const sender = partyName(a.sender) ? a.sender : a.customer;

  const seats = Number(a.totals?.seats) || 0;
  const weight = Number(a.totals?.weight) || 0;

  // Контакт получателя: «ФИО / телефон». Если чего-то нет — без разделителя.
  const receiverContact = [partyName(a.receiver), a.receiver?.phone]
    .map(s => String(s || "").trim()).filter(Boolean).join(" / ");

  return {
    number: a.docNumber || a.number || "",
    day: validDate ? String(d.getDate()) : "",
    month_year: validDate ? `${MONTHS[d.getMonth()]} ${d.getFullYear()} г.` : "",

    // «Автопредприятие» — компания-экспедитор, из которой выписана заявка
    // (согласовано с заказчиком). Перевозчик из справочника Carrier сюда
    // не подходит: он назначается на уровне партии, а не заявки.
    carrier_company: a.company?.name || "",

    customer: partyName(a.customer),
    sender: partyName(sender),
    receiver: partyName(a.receiver),

    loading_address: joinAddress(a.route?.fromAddress, a.route?.fromCity),
    unloading_address: joinAddress(a.route?.toAddress, a.route?.toCity),
    receiver_contact: receiverContact,

    cargo: a.cargoText || "",
    seats: seats ? `${seats} мест` : "",
    weight: weight ? `${weight} кг` : "",

    // «Масса брутто прописью»: по решению заказчика дублируем цифрами —
    // ровно так заполнен его собственный образец бланка.
    weight_words: weight ? `${weight} кг` : "",
  };
}

// Подстановка {ключ} внутри строки. Неизвестный ключ гасим в пустоту,
// чтобы в готовом документе не осталось висящих фигурных скобок.
function fillTokens(str, data) {
  return String(str).replace(/\{(\w+)\}/g, (_, key) => (data[key] !== undefined ? data[key] : ""));
}

// Текст ячейки ExcelJS: обычная строка, объект richText или формула.
// Нас интересуют только первые два — в бланке токены лежат текстом.
function cellText(value) {
  if (typeof value === "string") return value;
  if (value && Array.isArray(value.richText)) {
    return value.richText.map(r => r.text).join("");
  }
  return null;
}

export async function exportTtnToXlsx(act) {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const resp = await fetch("/templates/ttn_2026.xlsx");
  if (!resp.ok) throw new Error("Шаблон ТТН не найден: /templates/ttn_2026.xlsx");
  const buf = await resp.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];

  const data = buildTtnData(act);

  // Обходим только ячейки со значениями. Объединённые блоки ExcelJS отдаёт
  // ведущей ячейкой, поэтому писать в «хвост» объединения не пытаемся.
  ws.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const text = cellText(cell.value);
      if (text && text.includes("{")) {
        // Присваиваем плоскую строку: richText с токеном схлопываем,
        // оформление самой ячейки (шрифт, рамки) при этом не трогается.
        cell.value = fillTokens(text, data);
      }
    });
  });

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `ТТН_${data.number || "новая"}.xlsx`);
}
