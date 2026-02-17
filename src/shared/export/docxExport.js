import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

/**
 * Экспорт данных акта в Word по шаблону.
 * Шаблон должен находиться в /public/templates/template.docx
 */
export async function exportToDocx(act) {
  try {
    // 1. Загрузка файла шаблона
    const response = await fetch("/templates/template.docx");
    const content = await response.arrayBuffer();

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 2. Подготовка данных для шаблона
    const data = {
      number: act.number || "",
      date: act.date || "",
      
      // Заказчик (наименование)
      customer_company: act.customer?.companyName || act.customer?.fio || "",
      customer_fio: act.customer?.fio || "",
      customer_phone: act.customer?.phone || "",
      customer_address: act.customer?.jurAddress || "",
      customer_bin: act.customer?.bin || "",
      customer_bank: act.customer?.bank || "",
      customer_account: act.customer?.account || "",

      // Экспедитор (Текущая выбранная компания)
      expeditor_name: act.company?.name || "",
      expeditor_phone: act.company?.phone || "",
      expeditor_email: act.company?.email || "",
      expeditor_address: act.company?.address || "",
      expeditor_director: act.company?.director || "",

      // Получатель
      receiver_company: act.receiver?.companyName || act.receiver?.fio || "",
      receiver_fio: act.receiver?.fio || "",
      receiver_phone: act.receiver?.phone || "",
      receiver_address: act.receiver?.jurAddress || "",

      // Данные по грузу
      cargoText: act.cargoText || "",
      totalSum: act.totalSum || "", // Стоимость груза по инвойсу
      packaging: act.packaging || "",
      deliveryTerm: act.deliveryTerm || "",
      fastening: act.fastening || "",
      
      // Итоги таблицы
      total_seats: act.totals?.seats || 0,
      total_weight: act.totals?.weight || 0,
      total_volume: act.totals?.volume ? act.totals.volume.toFixed(0) : 0,

      // Страховка (√) - используем символы для галочек
      insured_yes: act.insured ? "☑" : "☐",
      insured_no: !act.insured ? "☑" : "☐",

      // Стоимость услуг и расчеты
      services_total: act.total?.price || (act.totalSum ? act.totalSum + " тг." : "0 тг."),

      // Специфические поля (2-18)
      doc5: act.docAttrs?.doc5 || "",
      doc6: act.docAttrs?.doc6 || "",
      doc13: act.docAttrs?.doc13 || "",
      doc14: act.docAttrs?.doc14 || "",
      doc15: act.docAttrs?.doc15 || "",
      doc18: act.docAttrs?.doc18 || "",

      // Таблица грузов
      rows: (act.cargoRows || []).map((r, i) => ({
        index: i + 1,
        title: r.title || "",
        seats: r.seats || "",
        length: r.length || "",
        width: r.width || "",
        height: r.height || "",
        weight: r.weight || "",
        volume: r.volume || "",
        volWeight: r.volWeight || "",
      })),
    };

    // 3. Рендеринг документа
    doc.render(data);

    // 4. Генерация и скачивание
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    saveAs(out, `Заявка_${act.number}.docx`);
  } catch (error) {
    console.error("Ошибка при экспорте DOCX:", error);
    alert("Не удалось сформировать документ. Проверьте наличие шаблона /public/templates/template.docx");
  }
}
