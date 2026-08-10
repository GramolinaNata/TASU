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

    // ТЗ: данные автотранспорта в бланк. Раньше в шаблоне для них не было
    // токенов вовсе — графы «Автомобиль» и «Водитель» печатались пустыми,
    // и менеджер вписывал их от руки. Сами данные лежат в details.docAttrs
    // (марка, госномер, водитель, телефон) и с недавних пор обязательны
    // при формировании ТТН.
    //
    // Марка и госномер идут в одну графу: в бланке «Автомобиль» — одна
    // строка, отдельной ячейки под номер нет.
    vehicle: [a.docAttrs?.vehicleModel, a.docAttrs?.vehicleNumber]
      .map(s => String(s || "").trim()).filter(Boolean).join(" "),
    vehicle_model: String(a.docAttrs?.vehicleModel || "").trim(),
    vehicle_number: String(a.docAttrs?.vehicleNumber || "").trim(),

    // Водитель: ФИО и телефон вместе. Телефон в накладной заказчик просил
    // НЕ показывать, поэтому в графу «Водитель» идёт только ФИО, а телефон
    // отдаётся отдельным токеном — на случай, если понадобится позже.
    driver: String(a.docAttrs?.driver || "").trim(),
    driver_phone: String(a.docAttrs?.driverPhone || "").trim(),

    // Прицеп — если отмечен.
    trailer: a.docAttrs?.hasTrailer
      ? [a.docAttrs?.trailerModel, a.docAttrs?.trailerNumber]
          .map(s => String(s || "").trim()).filter(Boolean).join(" ")
      : "",
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

// Служебный токен-якорь печати. В Excel картинка НЕ привязана к тексту, как
// в docx: она кладётся поверх листа по координатам ячейки. Поэтому в бланке
// стоит токен, экспорт находит его координаты, гасит текст и ставит печать
// в эту позицию — если заказчик пришлёт новую версию бланка, печать переедет
// вместе с якорем, а не останется по забитым координатам.
const STAMP_ANCHOR = "{stamp_here}";

// Печать хранится как data:image/png;base64,… — ExcelJS нужен чистый base64
// и расширение отдельно.
function parseDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (!m) return null;
  const ext = m[1].toLowerCase() === "png" ? "png" : "jpeg";
  return { ext, base64: m[2] };
}

/**
 * Печать/подпись компании в бланк ТТН.
 *
 * Пропорции картинки в браузере без её загрузки не вычислить, поэтому берём
 * фиксированный бокс高 ~2 см (как в docx-экспорте): 90×75 px. editAs:'oneCell'
 * держит печать привязанной к ячейке при изменении ширины колонок.
 *
 * Нет печати у компании — ничего не вставляем, якорь просто гасится.
 */
function placeStamp(wb, ws, act) {
  const parsed = parseDataUrl(act?.company?.stamp);
  let anchor = null;

  ws.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cellText(cell.value) === STAMP_ANCHOR) {
        anchor = { col: cell.col, row: cell.row };
        cell.value = null;          // сам токен в документе виден быть не должен
      }
    });
  });

  if (!anchor || !parsed) return;

  const imgId = wb.addImage({ base64: parsed.base64, extension: parsed.ext });
  // ExcelJS считает координаты от нуля, а cell.col/row — от единицы.
  ws.addImage(imgId, {
    tl: { col: anchor.col - 1, row: anchor.row - 1 },
    ext: { width: 90, height: 75 },
    editAs: "oneCell",
  });
}

/**
 * Формирование ТТН.
 *
 * @param {object} act  заявка (с company)
 * @param {object} opts { asBlob: true } — вернуть Blob вместо скачивания.
 *                      Нужно для комплекта документов: там файлы складываются
 *                      в архив, а не сохраняются по одному.
 */
export async function exportTtnToXlsx(act, opts = {}) {
  const needSave = !opts.asBlob;
  const [{ default: ExcelJS }, fileSaver] = await Promise.all([
    import("exceljs"),
    needSave ? import("file-saver") : Promise.resolve(null),
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
      if (text && text.includes("{") && text !== STAMP_ANCHOR) {
        // Присваиваем плоскую строку: richText с токеном схлопываем,
        // оформление самой ячейки (шрифт, рамки) при этом не трогается.
        cell.value = fillTokens(text, data);
      }
    });
  });

  // Печать ставится ПОСЛЕ подстановки текста: обход ячеек выше не должен
  // натыкаться на уже обработанный якорь.
  placeStamp(wb, ws, act);

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const filename = `ТТН_${data.number || "новая"}.xlsx`;
  if (!needSave) return { blob, filename };
  fileSaver.saveAs(blob, filename);
  return { blob, filename };
}
