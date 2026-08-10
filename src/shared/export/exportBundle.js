// Комплект отгрузочных документов по заявке одним архивом.
//
// ТЗ: бухгалтеру в «Отработанных» нужна одна кнопка, которая собирает весь
// комплект по заявке, а не шесть отдельных скачиваний.
//
// СОСТАВ ЗАВИСИТ ОТ ТИПА ЗАЯВКИ, а не задан жёстким списком: печатать ТТН для
// складской заявки бессмысленно, а складской акт — для перевозки. Иначе в
// архив попадал бы мусор, и бухгалтер разбирал бы, что из этого настоящее.
//
// Бухгалтерский акт выполненных работ (форма Р-1) в комплект НЕ входит —
// это отдельный документ, шаблона под него в системе нет.
//
// ЧАСТИЧНЫЙ СБОЙ НЕ РОНЯЕТ ПАКЕТ. Если один документ не собрался, остальные
// всё равно попадают в архив, а внутрь кладётся ОШИБКИ.txt с перечнем.
// Молча отдавать неполный комплект нельзя: бухгалтер решит, что всё на месте.
//
// Архив собирается PizZip — он уже стоит как зависимость docxtemplater,
// новых библиотек не требуется.

import { exportToDocx } from "./docxExport.js";
import { exportTtnToXlsx } from "./xlsxExport.js";

/** Тип документа заявки: ttn | smr | warehouse | request. */
function docKind(act) {
  if (act?.isWarehouse) return "warehouse";
  const t = String(act?.docType || act?.type || "").toLowerCase();
  if (t === "ttn") return "ttn";
  if (t === "smr" || t === "cmr") return "smr";
  return "request";
}

/**
 * Состав комплекта. Каждый пункт: подпись для отчёта об ошибках и то, как
 * получить файл.
 */
export function bundlePlan(act) {
  const kind = docKind(act);
  const items = [];

  if (kind === "warehouse") {
    // Складская: акт приёма-передачи ТМЦ + договор склада.
    items.push({ label: "Складской акт", make: () => exportToDocx(act, "warehouse", { asBlob: true }) });
    items.push({ label: "Договор склада", make: () => exportToDocx({ ...act, isContract: true, type: "warehouse" }, null, { asBlob: true }) });
    return items;
  }

  // Перевозка: сама заявка + перевозочный документ + договор.
  items.push({ label: "Заявка", make: () => exportToDocx(act, "Заявка", { asBlob: true }) });

  if (kind === "ttn") {
    items.push({ label: "ТТН", make: () => exportTtnToXlsx(act, { asBlob: true }) });
  } else if (kind === "smr") {
    items.push({ label: "СМР", make: () => exportToDocx(act, "smr", { asBlob: true }) });
  }

  items.push({ label: "Договор перевозки", make: () => exportToDocx({ ...act, isContract: true }, null, { asBlob: true }) });
  return items;
}

/** Имя файла в архиве: без символов, запрещённых в файловых системах. */
function safeName(s) {
  return String(s || "").replace(/[\\/:*?"<>|]/g, "_").trim();
}

/**
 * Собирает комплект и отдаёт архив.
 *
 * @param {object} act   заявка (с company — иначе документы соберутся без
 *                       реквизитов и печати)
 * @param {object} opts  { asBlob: true } — вернуть архив, не скачивая
 * @returns {Promise<{blob: Blob, filename: string, ok: string[], failed: Array}>}
 */
export async function exportBundle(act, opts = {}) {
  const [{ default: PizZip }, fileSaver] = await Promise.all([
    import("pizzip"),
    opts.asBlob ? Promise.resolve(null) : import("file-saver"),
  ]);

  const num = act?.docNumber || act?.number || "без-номера";
  const zip = new PizZip();
  const ok = [];
  const failed = [];

  // Последовательно, а не Promise.all: docxtemplater и ExcelJS тянут шаблоны
  // и картинки, параллельный запуск на слабом ноутбуке заметно тяжелее,
  // а выигрыш во времени для трёх файлов незаметен.
  for (const item of bundlePlan(act)) {
    try {
      const res = await item.make();
      if (!res?.blob) throw new Error("Экспорт не вернул файл");
      const buf = await res.blob.arrayBuffer();
      zip.file(safeName(`${num}_${item.label}${extOf(res.filename)}`), buf);
      ok.push(item.label);
    } catch (e) {
      failed.push({ label: item.label, error: String(e?.message || e) });
    }
  }

  if (failed.length) {
    const text =
      `Комплект по накладной ${num} собран НЕ ПОЛНОСТЬЮ.\r\n\r\n` +
      `Не удалось сформировать:\r\n` +
      failed.map(f => `  • ${f.label}: ${f.error}`).join("\r\n") +
      `\r\n\r\nОстальные документы в архиве и пригодны к использованию.\r\n`;
    zip.file("ОШИБКИ.txt", text);
  }

  const blob = zip.generate({ type: "blob", mimeType: "application/zip" });
  const filename = safeName(`${num}_комплект.zip`);

  if (!opts.asBlob) fileSaver.saveAs(blob, filename);
  return { blob, filename, ok, failed };
}

function extOf(filename) {
  const m = String(filename || "").match(/(\.[a-z0-9]+)$/i);
  return m ? m[1] : "";
}
