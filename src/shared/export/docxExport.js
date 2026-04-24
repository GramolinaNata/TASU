import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import { saveAs } from "file-saver";

function base64ToBuffer(base64) {
  if (!base64 || typeof base64 !== "string") return null;
  try {
    const base64Data = base64.split(",")[1] || base64;
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.warn("[Export] base64 ошибка:", e);
    return null;
  }
}

function makeWatermark(base64Logo, opacity = 0.15) {
  return new Promise((resolve) => {
    if (!base64Logo) return resolve(null);
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = (d[i] + d[i + 1] + d[i + 2]) / 3;
          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
          d[i + 3] = Math.floor(d[i + 3] * opacity);
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        console.warn("[Watermark] Не удалось загрузить лого");
        resolve(null);
      };
      img.src = base64Logo;
    } catch (e) {
      console.warn("[Watermark] Ошибка:", e);
      resolve(null);
    }
  });
}

function formatRussianDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} г.`;
}

function formatContractDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const day = String(date.getDate()).padStart(2, "0");
  return `«${day}» ${months[date.getMonth()]} ${date.getFullYear()} г.`;
}

function formatDmy(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()} г.`;
}

export async function exportToDocx(act, templateOverride = null) {
  console.log("🔵 [Export] START");

  try {
    let rawType = templateOverride || act.docType || act.type || "Заявка";
    let typeToUse = String(rawType).toLowerCase();

    let templateFile = "/templates/template.docx";
    if (typeToUse === "ttn") templateFile = "/templates/template_ttn.docx";
    if (typeToUse === "smr" || typeToUse === "cmr") templateFile = "/templates/template_smr.docx";
    if (act.isWarehouse || typeToUse === "warehouse") templateFile = "/templates/template_warehouse.docx";
    if (act.isContract && !templateOverride) {
      templateFile = act.type === "warehouse" ? "/templates/warehouse_contract.docx" : "/templates/transport_contract.docx";
    }

    console.log("🔵 [Export] Шаблон:", templateFile);

    let response = await fetch(templateFile);
    if (!response.ok) {
      console.warn(`[Export] Шаблон ${templateFile} не найден. Откат.`);
      response = await fetch("/templates/template.docx");
      if (!response.ok) throw new Error(`Шаблон не найден: ${response.status}`);
    }

    const content = await response.arrayBuffer();

    let zip;
    try {
      zip = new PizZip(content);
    } catch (e) {
      throw new Error("Шаблон повреждён");
    }

    const companyLogo = act.company?.logo || "";
    // Генерируем полупрозрачный серый водяной знак из лого
    const watermarkImage = await makeWatermark(companyLogo, 0.2);
    console.log("🔵 [Export] watermark:", watermarkImage ? "ok" : "null");

    const imageOptions = {
      centered: false,
      getImage: (tagValue, tagName) => {
        const buf = base64ToBuffer(tagValue);
        if (!buf) console.warn(`[getImage] null для ${tagName}`);
        return buf;
      },
      getSize: (img, tagValue, tagName) => {
        if (tagName === "watermark" || tagName === "watermark_corner" || tagName === "watermark_8910") {
          return [150, 150]; // уменьшенный водяной знак
        }
        return [173, 56]; // лого в шапке
      },
    };

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [new ImageModule(imageOptions)],
    });

    const data = {
      logo: companyLogo,
      watermark: watermarkImage,
      watermark_corner: watermarkImage,
      watermark_8910: watermarkImage,

      contractNumber: act.contractNumber || "",
      contractNumberOnly: (act.contractNumber || "").split("-")[0],
      contractDate: act.contractDate ? new Date(act.contractDate).toLocaleDateString("ru-RU") : "",
      contractDateLong: act.contractDate ? formatRussianDate(act.contractDate) : "",
      contractDateQuotes: act.contractDate ? formatContractDate(act.contractDate) : "",

      document_label: act.isWarehouse ? "СКЛАДСКАЯ ЗАЯВКА" : (typeToUse === "заявка" || typeToUse === "request" ? "ЗАЯВКА" : typeToUse.toUpperCase()),
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
      customer_name: act.customer?.companyName || act.customer?.fio || "",
      customer_director_name: act.customer?.fio || "",

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
      expeditor_full: [act.company?.name, act.company?.address, `БИН ${act.company?.bin}`].filter(Boolean).join("\n"),

      receiver_company: [act.receiver?.companyName || act.receiver?.fio, act.receiver?.jurAddress].filter(Boolean).join(", "),
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

      transportType: act.docAttrs?.transportType === "auto_console" ? "Авто консолидация" :
                     act.docAttrs?.transportType === "auto_separate" ? "Отдельное авто" :
                     act.docAttrs?.transportType === "plane" ? "Самолет" :
                     act.docAttrs?.transportType === "train" ? "Поезд рейс" : "",
      is_auto: act.docAttrs?.transportType === "auto_console" || act.docAttrs?.transportType === "auto_separate",
      is_plane: act.docAttrs?.transportType === "plane",
      is_train: act.docAttrs?.transportType === "train",
      has_trailer: (act.docAttrs?.transportType === "auto_console" || act.docAttrs?.transportType === "auto_separate") && !!act.docAttrs?.hasTrailer,
      trailer_number: (act.docAttrs?.transportType === "auto_console" || act.docAttrs?.transportType === "auto_separate") ? (act.docAttrs?.trailerNumber || "") : "",
      vehicle_model: act.docAttrs?.vehicleModel || "",
      vehicle_number: act.docAttrs?.vehicleNumber || "",
      trailer_model: act.docAttrs?.trailerModel || "",
      trailer_number_val: act.docAttrs?.trailerNumber || "",
      vehicle_full: [act.docAttrs?.vehicleModel, act.docAttrs?.vehicleNumber].filter(Boolean).join(" "),
      trailer_full: [act.docAttrs?.trailerModel, act.docAttrs?.trailerNumber].filter(Boolean).join(" "),

      total_seats: act.totals?.seats || 0,
      total_weight: act.totals?.weight || 0,
      total_volume: act.totals?.volume ? act.totals.volume.toFixed(0) : 0,
      total_volume_m3: act.totals?.volume ? (act.totals.volume / 1000000).toFixed(2) : "0.00",
      total_volWeight: act.totals?.volWeight ? act.totals.volWeight.toFixed(2) : "0.00",
      insured_yes: act.insured ? "✓" : "☐",
      insured_no: !act.insured ? "✓" : "☐",
      cargoValue: act.cargoValue || "",
      services_total: act.total?.price || (act.totalSum ? act.totalSum + " тг." : "0 тг."),

      doc5: act.docAttrs?.doc5 || "",
      doc6: act.docAttrs?.doc6 || "",
      doc13: act.docAttrs?.doc13 || "",
      doc14: act.docAttrs?.doc14 || "",
      doc15: act.docAttrs?.doc15 || "",
      doc18: act.docAttrs?.doc18 || "",

      vehicle: (act.docAttrs?.transportType === "auto_console" || act.docAttrs?.transportType === "auto_separate")
               ? (act.docAttrs?.vehicleNumber || act.docAttrs?.vehicle || "")
               : (act.docAttrs?.flightNumber || ""),
      driver: ((act.docAttrs?.transportType === "auto_console" || act.docAttrs?.transportType === "auto_separate") || act.docAttrs?.transportType === "train" || act.docAttrs?.transportType === "plane")
              ? (act.docAttrs?.driver || "") : "",
      flightNumber: (act.docAttrs?.transportType === "plane" || act.docAttrs?.transportType === "train") ? (act.docAttrs?.flightNumber || "") : "",
      driver_label: (act.docAttrs?.transportType === "plane" || act.docAttrs?.transportType === "train") ? "Ответственный" : "Водитель",
      vehicle_label: (act.docAttrs?.transportType === "plane") ? "Номер рейса" :
                     (act.docAttrs?.transportType === "train") ? "Номер поезда" : "Марка, гос. номер",
      manager_name: act.manager?.name || "Система",
      manager_email: act.manager?.email || "",
      manager_phone: act.manager?.phone || "",

      smr_sender: [
        act.isSenderSameAsCustomer ? act.customer?.companyName : act.sender?.companyName,
        act.isSenderSameAsCustomer ? act.customer?.jurAddress : act.sender?.jurAddress,
        `БИН ${act.isSenderSameAsCustomer ? act.customer?.bin : act.sender?.bin}`,
      ].filter(Boolean).join("\n"),

      smr_recipient: [
        act.receiver?.companyName,
        act.receiver?.jurAddress,
        `БИН ${act.receiver?.bin}`,
        (act.route?.toCity || "").split(",")[0].trim().toUpperCase()
      ].filter(Boolean).join("\n"),

      smr_unloading: [act.route?.toAddress, act.route?.toCity].filter(Boolean).join(", "),
      smr_loading: [act.route?.fromAddress, act.route?.fromCity, act.date ? formatRussianDate(act.date) : ""].filter(Boolean).join(", "),
      smr_carrier: [act.company?.name, act.company?.address, `БИН ${act.company?.bin}`, "КАЗАХСТАН"].filter(Boolean).join("\n"),

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
      warehouse_total: (act.warehouseServices || []).reduce((acc, s) => acc + (parseFloat(s.total) || 0), 0).toLocaleString("ru-RU"),
      total_sum: (act.warehouseServices || []).reduce((acc, s) => acc + (parseFloat(s.total) || 0), 0).toLocaleString("ru-RU"),

      date_dmy: formatDmy(act.date),
      client_fio_org: `${act.customer?.companyName || ""} ${act.customer?.fio || ""}`.trim(),
      performer_fio_org: act.company?.name || "",
      arrival_date_dmy: formatDmy(act.date),
      export_date_dmy: formatDmy(new Date()),
    };

    const findSrv = (keyword) => {
      const srv = (act.warehouseServices || []).find(s =>
        s.name && s.name.toLowerCase().includes(keyword.toLowerCase())
      );
      return srv ? (srv.total ? srv.total.toLocaleString() : srv.price.toLocaleString()) : "";
    };
    data.srv_storage = findSrv("хранение");
    data.srv_sorting = findSrv("сортировка");
    data.srv_packing = findSrv("упаковка");
    data.srv_marking = findSrv("маркировка");
    data.srv_moving = findSrv("перемещение");
    data.srv_photo = findSrv("фото");
    data.srv_video = findSrv("видео");
    data.srv_pass = findSrv("пропуск");
    data.srv_rp = findSrv("р/п") || findSrv("погруз") || findSrv("разгруз");
    data.date_out = act.date ? formatRussianDate(act.date) : "";
    data.receiver_name = act.receiver?.companyName || act.receiver?.fio || "";
    data.remark = act.route?.comment || "";

    try {
      doc.render(data);
    } catch (error) {
      console.error("❌ [Export] Ошибка render:", error);
      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors.map((err) => err.properties.explanation).join("\n");
        alert(`Ошибка в шаблоне:\n${errorMessages}`);
        throw new Error(errorMessages);
      }
      alert(`Ошибка render: ${error.message || error}`);
      throw error;
    }

    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    let outType = templateOverride || act.docType || act.type || "Заявка";
    if (act.isWarehouse) outType = "Складская заявка";
    else if (String(outType).toUpperCase() === "REQUEST") outType = "Заявка";
    let fileName = `${String(outType).toUpperCase()}_${act.docNumber || act.number}.docx`;
    if (act.isContract && !templateOverride) {
      fileName = `dogovor_${act.contractNumber || act.docNumber || act.number}.docx`;
    }

    saveAs(out, fileName);
    console.log("🟢 [Export] ГОТОВО");

  } catch (error) {
    console.error("❌ [Export] FATAL:", error);
    alert(`Ошибка экспорта: ${error.message || error}`);
  } 
}