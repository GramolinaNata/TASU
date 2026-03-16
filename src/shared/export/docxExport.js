import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import { saveAs } from "file-saver";

// Вспомогательная функция для парсинга Base64
function base64ToBuffer(base64) {
    if (!base64) return null;
    const base64Data = base64.split(",")[1] || base64;
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

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
 * Вспомогательная функция для форматирования даты договора в формате «01» января 2026 г.
 */
function formatContractDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const months = [
      "января", "февраля", "марта", "апреля", "мая", "июня",
      "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ];
    
    const day = String(date.getDate()).padStart(2, "0");
    return `«${day}» ${months[date.getMonth()]} ${date.getFullYear()} г.`;
}

/**
 * Экспорт данных акта в Word по шаблону.
 */
export async function exportToDocx(act, templateOverride = null) {
  try {
    // 1. Определяем файл шаблона
    let typeToUse = templateOverride || act.docType || "Заявка";
    
    let templateFile = "/templates/template.docx"; // По умолчанию - Заявка
    
    if (typeToUse === "ttn") templateFile = "/templates/template_ttn.docx";
    if (typeToUse === "smr") templateFile = "/templates/template_smr.docx";
    
    if (act.isContract && !templateOverride) {
        templateFile = act.type === 'warehouse' ? "/templates/warehouse_contract.docx" : "/templates/transport_contract.docx";
    }

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

    // 1.2. Настройка модуля изображений
    const imageOptions = {
      centered: false,
      getImage: (tagValue) => {
        return base64ToBuffer(tagValue);
      },
      getSize: () => {
        return [173, 56]; // 4.58 cm x 1.48 cm (при 96 DPI)
      },
    };

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [new ImageModule(imageOptions)],
    });

    // 2. Подготовка данных
    const data = {
      logo: act.company?.logo || "", // Передаем Base64 строку логотипа
      contractNumber: act.contractNumber || "",
      contractNumberOnly: (act.contractNumber || "").split("-")[0],
      contractDate: act.contractDate ? new Date(act.contractDate).toLocaleDateString("ru-RU") : "",
      contractDateLong: act.contractDate ? formatRussianDate(act.contractDate) : "",
      contractDateQuotes: act.contractDate ? formatContractDate(act.contractDate) : "",
      document_label: typeToUse === "Заявка" ? "ЗАЯВКА" : typeToUse.toUpperCase(),
      number: act.docNumber || act.number || "",
      date: act.date || "",
      dateLong: formatRussianDate(act.date),
      loadingDate: act.date || "",
      createdAtDate: act.createdAt ? new Date(act.createdAt).toLocaleDateString("ru-RU") : "",
      ttn_header: `ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ _${act.docNumber || act.number}_`,
      customer_company: act.customer?.companyName || act.customer?.fio || "",
      customer_fio: act.customer?.fio || "",
      customer_phone: act.customer?.phone || "",
      customer_address: act.customer?.jurAddress || "",
      customer_fact_address: act.customer?.factAddress || act.customer?.jurAddress || "",
      customer_bin: act.customer?.bin || "",
      customer_bank: act.customer?.bank || "",
      customer_bik: act.customer?.bik || "",
      customer_account: act.customer?.account || "",
      customer_kbe: act.customer?.kbe || "",
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
      expeditor_fact_address: act.company?.factAddress || act.company?.address || "",
      expeditor_bin: act.company?.bin || "",
      expeditor_bank: act.company?.bank || "",
      expeditor_bik: act.company?.bik || "",
      expeditor_account: act.company?.account || "",
      expeditor_kbe: act.company?.kbe || "",
      expeditor_director_name: act.company?.director || "",
      customer_name: act.customer?.companyName || act.customer?.fio || "",
      customer_director_name: act.customer?.fio || "",
      receiver_company: act.receiver?.companyName || act.receiver?.fio || "",
      receiver_fio: act.receiver?.fio || "",
      receiver_phone: act.receiver?.phone || "",
      receiver_address: act.receiver?.jurAddress || "",
      receiver_email: act.receiver?.email || "",
      receiver_bin: act.receiver?.bin || "",
      receiver_bank: act.receiver?.bank || "",
      receiver_bik: act.receiver?.bik || "",
      receiver_account: act.receiver?.account || "",
      receiver_kbe: act.receiver?.kbe || "",
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
      stackable: act.stackable || act.fastening || "",
      transportType: act.docAttrs?.transportType === "auto_console" ? "Авто перевозки консол" :
                     act.docAttrs?.transportType === "auto_separate" ? "Авто перевозки отдельно" :
                     act.docAttrs?.transportType === "plane" ? "Самолет" :
                     act.docAttrs?.transportType === "train" ? "Поезд рейс" : "",
      is_auto: act.docAttrs?.transportType === "auto_console" || act.docAttrs?.transportType === "auto_separate",
      is_plane: act.docAttrs?.transportType === "plane",
      is_train: act.docAttrs?.transportType === "train",
      has_trailer: (act.docAttrs?.transportType === "auto_console" || act.docAttrs?.transportType === "auto_separate") && !!act.docAttrs?.hasTrailer,
      trailer_number: (act.docAttrs?.transportType === "auto_console" || act.docAttrs?.transportType === "auto_separate") ? (act.docAttrs?.trailerNumber || "") : "",
      total_seats: act.totals?.seats || 0,
      total_seats: act.totals?.seats || 0,
      total_weight: act.totals?.weight || 0,
      total_volume: act.totals?.volume ? act.totals.volume.toFixed(0) : 0,
      total_volume_m3: act.totals?.volume ? (act.totals.volume / 1000000).toFixed(2) : "0.00",
      total_volWeight: act.totals?.volWeight ? act.totals.volWeight.toFixed(2) : "0.00",
      insured_yes: act.insured ? "☑" : "☐",
      insured_no: !act.insured ? "☑" : "☐",
      cargoValue: act.cargoValue || "",
      services_total: act.total?.price || (act.totalSum ? act.totalSum + " тг." : "0 тг."),
      doc5: act.docAttrs?.doc5 || "",
      doc6: act.docAttrs?.doc6 || "",
      doc13: act.docAttrs?.doc13 || "",
      doc14: act.docAttrs?.doc14 || "",
      doc15: act.docAttrs?.doc15 || "",
      doc18: act.docAttrs?.doc18 || "",
      vehicle: (act.docAttrs?.transportType === "auto_console" || act.docAttrs?.transportType === "auto_separate") 
               ? (act.docAttrs?.vehicle || "") 
               : (act.docAttrs?.flightNumber || ""),
      driver: ((act.docAttrs?.transportType === "auto_console" || act.docAttrs?.transportType === "auto_separate") || act.docAttrs?.transportType === "train" || act.docAttrs?.transportType === "plane")
              ? (act.docAttrs?.driver || "")
              : "",
      flightNumber: (act.docAttrs?.transportType === 'plane' || act.docAttrs?.transportType === 'train') ? (act.docAttrs?.flightNumber || "") : "",
      driver_label: (act.docAttrs?.transportType === 'plane' || act.docAttrs?.transportType === 'train') ? "Ответственный" : "Водитель",
      vehicle_label: (act.docAttrs?.transportType === 'plane') ? "Номер рейса" : 
                     (act.docAttrs?.transportType === 'train') ? "Номер поезда" : "Марка, гос. номер",

      // --- SMR SPECIFIC BLOCKS ---
      smr_sender: [
        act.isSenderSameAsCustomer ? act.customer?.companyName : act.sender?.companyName,
        act.isSenderSameAsCustomer ? act.customer?.jurAddress : act.sender?.jurAddress,
        `БИН ${act.isSenderSameAsCustomer ? act.customer?.bin : act.sender?.bin}`,
        (act.route?.fromCity || "").split(",")[0].trim().toUpperCase()
      ].filter(Boolean).join("\n"),

      smr_recipient: [
        act.receiver?.companyName,
        act.receiver?.jurAddress,
        `ИИН/БИН ${act.receiver?.bin}`,
        (act.route?.toCity || "").split(",")[0].trim().toUpperCase()
      ].filter(Boolean).join("\n"),

      smr_unloading: [
        act.route?.toAddress,
        act.route?.toCity
      ].filter(Boolean).join(", "),

      smr_loading: [
        act.route?.fromAddress,
        act.route?.fromCity,
        act.date ? formatRussianDate(act.date) : ""
      ].filter(Boolean).join(", "),

      smr_carrier: [
        act.company?.name,
        act.company?.address,
        `БИН ${act.company?.bin}`,
        "КАЗАХСТАН"
      ].filter(Boolean).join("\n"),

      rows: (act.cargoRows || []).map((r, i) => ({
        index: i + 1,
        title: r.title || "",
        seats: r.seats || "",
        packaging: r.packaging || act.packaging || "", 
        length: r.length || "",
        width: r.width || "",
        height: r.height || "",
        weight: r.weight || "",
        volume: r.volume || "",
        volumeM3: r.volume ? (r.volume / 1000000).toFixed(2) : "0.00",
        volWeight: r.volWeight || "",
      })),
      warehouse_services: (act.warehouseServices || []).map((s, i) => ({
        index: i + 1,
        name: s.name || "",
        qty: s.qty || "",
        price: s.price || "",
        total: s.total || "",
      })),
      warehouse_total: (act.warehouseServices || []).reduce((acc, s) => acc + (s.total || 0), 0),
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

    let outType = templateOverride || act.docType || "Заявка";
    if (outType === "REQUEST") outType = "Заявка";
    let fileName = `${outType.toUpperCase()}_${act.docNumber || act.number}.docx`;
    
    if (act.isContract && !templateOverride) {
      fileName = `dogovor_${act.contractNumber || act.docNumber || act.number}.docx`;
    }
    saveAs(out, fileName);
  } catch (error) {
    console.error("Ошибка при экспорте DOCX:", error);
    alert(`Ошибка экспорта: ${error.message}`);
  }
}
