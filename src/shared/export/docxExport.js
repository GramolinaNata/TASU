import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

/**
 * Вспомогательная функция для форматирования даты на русском языке
 * Пример: "28 мая 2024 г."
 */
function formatRussianDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];
  
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} г.`;
}

/**
 * Экспорт данных акта в Word по шаблону.
 */
export async function exportToDocx(act) {
  try {
    // 1. Определяем файл шаблона
    let templateFile = "/templates/template.docx";
    if (act.docType === "ttn") templateFile = "/templates/template_ttn.docx";
    if (act.docType === "smr") templateFile = "/templates/template_smr.docx";

    console.log(`[Export] Попытка загрузки шаблона: ${templateFile}`);

    let response = await fetch(templateFile);
    
    // Если специфичный шаблон не найден или произошла ошибка
    if (!response.ok) {
        console.warn(`[Export] Шаблон ${templateFile} не найден (${response.status}). Откат к стандартному.`);
        response = await fetch("/templates/template.docx");
        if (!response.ok) {
            throw new Error(`Стандартный шаблон /templates/template.docx также не найден (${response.status})`);
        }
    }
    
    const content = await response.arrayBuffer();

    let zip;
    try {
        zip = new PizZip(content);
    } catch (e) {
        throw new Error("Файл шаблона поврежден или имеет неверный формат (не ZIP/DOCX)");
    }

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 2. Подготовка данных
    const data = {
      // ... (то же самое, что и было)
      number: act.number || "",
      date: act.date || "",
      dateLong: formatRussianDate(act.date),
      loadingDate: act.date || "",
      createdAtDate: act.createdAt ? new Date(act.createdAt).toLocaleDateString("ru-RU") : "",
      ttn_header: `ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ _${act.number}_`,
      customer_company: act.customer?.companyName || act.customer?.fio || "",
      customer_fio: act.customer?.fio || "",
      customer_phone: act.customer?.phone || "",
      customer_address: act.customer?.jurAddress || "",
      customer_bin: act.customer?.bin || "",
      customer_bank: act.customer?.bank || "",
      customer_account: act.customer?.account || "",
      customer_email: act.customer?.email || "",
      is_sender_same: !!act.isSenderSameAsCustomer,
      is_sender_different: !act.isSenderSameAsCustomer,
      sender_name: act.isSenderSameAsCustomer ? (act.customer?.companyName || act.customer?.fio || "") : (act.sender?.companyName || act.sender?.fio || ""),
      sender_fio: act.isSenderSameAsCustomer ? (act.customer?.fio || "") : (act.sender?.fio || ""),
      sender_phone: act.isSenderSameAsCustomer ? (act.customer?.phone || "") : (act.sender?.phone || ""),
      sender_address: act.isSenderSameAsCustomer ? (act.customer?.jurAddress || "") : (act.sender?.jurAddress || ""),
      sender_email: act.isSenderSameAsCustomer ? (act.customer?.email || "") : (act.sender?.email || ""),
      sender_bin: act.isSenderSameAsCustomer ? (act.customer?.bin || "") : (act.sender?.bin || ""),
      expeditor_name: act.company?.name || "",
      expeditor_phone: act.company?.phone || "",
      expeditor_email: act.company?.email || "",
      expeditor_address: act.company?.address || "",
      expeditor_director: act.company?.director || "",
      director: act.company?.director || "",
      "53": act.company?.director || "", 
      receiver_company: act.receiver?.companyName || act.receiver?.fio || "",
      receiver_fio: act.receiver?.fio || "",
      receiver_phone: act.receiver?.phone || "",
      receiver_address: act.receiver?.jurAddress || "",
      receiver_email: act.receiver?.email || "",
      fromCity: act.route?.fromCity || "",
      toCity: act.route?.toCity || "",
      fromAddress: act.route?.fromAddress || "",
      toAddress: act.route?.toAddress || "",
      routeFull: `${act.route?.fromCity || ""} - ${act.route?.toCity || ""}`,
      comment: act.route?.comment || "",
      cargoText: act.cargoText || "",
      totalSum: act.totalSum || "", 
      packaging: act.packaging || "",
      deliveryTerm: act.deliveryTerm || "",
      fastening: act.fastening || "",
      transportType: act.docAttrs?.transportType === "auto_console" ? "Авто перевозки консол" :
                     act.docAttrs?.transportType === "auto_separate" ? "Авто перевозки отдельно" :
                     act.docAttrs?.transportType === "plane" ? "Самолет" :
                     act.docAttrs?.transportType === "train" ? "Поезд рейс" : "",
      billableWeight: Math.max(act.totals?.weight || 0, act.totals?.volWeight || 0).toFixed(2),
      isPlane: act.docAttrs?.transportType === "plane",
      total_seats: act.totals?.seats || 0,
      total_weight: act.totals?.weight || 0,
      total_volume: act.totals?.volume ? act.totals.volume.toFixed(0) : 0,
      insured_yes: act.insured ? "☑" : "☐",
      insured_no: !act.insured ? "☑" : "☐",
      services_total: act.total?.price || (act.totalSum ? act.totalSum + " тг." : "0 тг."),
      doc5: act.docAttrs?.doc5 || "",
      doc6: act.docAttrs?.doc6 || "",
      doc13: act.docAttrs?.doc13 || "",
      doc14: act.docAttrs?.doc14 || "",
      doc15: act.docAttrs?.doc15 || "",
      doc18: act.docAttrs?.doc18 || "",
      vehicle: act.docAttrs?.vehicle || "",
      driver: act.docAttrs?.driver || "",
      grossWeight: act.docAttrs?.grossWeight || "",
      totalSeatsTTN: act.docAttrs?.totalSeats || act.totals?.seats || "",
      loadingArrival: act.docAttrs?.loadingArrival || "",
      loadingEnd: act.docAttrs?.loadingEnd || "",
      unloadingArrival: act.docAttrs?.unloadingArrival || "",
      unloadingEnd: act.docAttrs?.unloadingEnd || "",
      cargoNotes: act.docAttrs?.cargoNotes || "Груз под таможенным контролем",
      flightNumber: act.docAttrs?.flightNumber || "",
      rows: (act.cargoRows || []).map((r, i) => ({
        index: i + 1,
        title: r.title || "",
        seats: r.seats || "",
        packaging: r.packaging || act.packaging || "", // Пробуем взять из строки или общее
        length: r.length || "",
        width: r.width || "",
        height: r.height || "",
        weight: r.weight || "",
        volume: r.volume || "",
        volWeight: r.volWeight || "",
      })),
    };

    // 3. Рендеринг
    try {
        doc.render(data);
    } catch (error) {
        if (error.properties && error.properties.errors instanceof Array) {
            const errorMessages = error.properties.errors
                .map((err) => err.properties.explanation)
                .join("\n");
            console.error("[Export] Детальные ошибки:", errorMessages);
            throw new Error(`Ошибка в тегах шаблона:\n${errorMessages}`);
        }
        throw error;
    }

    // 4. Генерация
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const fileName = act.docType ? `${act.docType.toUpperCase()}_${act.number}.docx` : `Заявка_${act.number}.docx`;
    saveAs(out, fileName);
  } catch (error) {
    console.error("Ошибка при экспорте DOCX:", error);
    alert(`Ошибка экспорта: ${error.message}`);
  }
}
