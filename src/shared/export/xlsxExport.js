import * as XLSX from "xlsx";

function formatRussianDate(dateStr) {
  if (!dateStr) return "";
  const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} г.`;
}

function buildData(act) {
  const a = act.docAttrs || {};
  const transportType =
    a.transportType === "auto_console" ? "авто (консолидация)" :
    a.transportType === "auto_separate" ? "авто (отдельное)" :
    a.transportType === "plane" ? "авиа" :
    a.transportType === "train" ? "ж/д" : "авто";

  const senderName = act.isSenderSameAsCustomer
    ? (act.customer?.companyName || act.customer?.fio || "")
    : (act.sender?.companyName || act.sender?.fio || "");
  const senderAddr = act.isSenderSameAsCustomer ? (act.customer?.jurAddress || "") : (act.sender?.jurAddress || "");
  const senderBin = act.isSenderSameAsCustomer ? (act.customer?.bin || "") : (act.sender?.bin || "");

  const loading = [act.route?.fromAddress, act.route?.fromCity].filter(Boolean).join(", ");
  const unloading = [act.route?.toAddress, act.route?.toCity].filter(Boolean).join(", ");

  return {
    number: act.docNumber || act.number || "",
    date: formatRussianDate(act.date),
    vehicle_model: a.vehicleModel || "",
    vehicle_number: a.vehicleNumber || "",
    expeditor_name: act.company?.name || "",
    driver: a.driver || "",
    transportType,
    customer_company: act.customer?.companyName || act.customer?.fio || "",
    sender_name: senderName,
    sender_address: senderAddr,
    sender_bin: senderBin,
    receiver_company: act.receiver?.companyName || act.receiver?.fio || "",
    receiver_bin: act.receiver?.bin || "",
    receiver_phone: act.receiver?.phone || "",
    smr_loading: loading,
    smr_unloading: unloading,
    cargoText: act.cargoText || "",
    total_seats: act.totals?.seats ?? 0,
    total_weight: act.totals?.weight ?? 0,
    totalSum: act.totalSum ? `${act.totalSum} тг` : "",
  };
}

function fill(str, data) {
  return String(str).replace(/\{(\w+)\}/g, (m, key) => (data[key] !== undefined ? data[key] : ""));
}

export async function exportTtnToXlsx(act) {
  const resp = await fetch("/templates/ttn_template.xlsx");
  if (!resp.ok) throw new Error("Шаблон ТТН не найден: /templates/ttn_template.xlsx");
  const buf = await resp.arrayBuffer();

  const wb = XLSX.read(buf, { type: "array", cellStyles: true });
  const ws = wb.Sheets[wb.SheetNames[0]];

  const data = buildData(act);

  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell && typeof cell.v === "string" && cell.v.includes("{")) {
        cell.v = fill(cell.v, data);
        if (cell.w !== undefined) delete cell.w;
      }
    }
  }

  const fname = `ТТН_${data.number || "новая"}.xlsx`;
  XLSX.writeFile(wb, fname, { bookType: "xlsx", cellStyles: true });
}