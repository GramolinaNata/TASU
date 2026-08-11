import React, { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { useAuth } from "../../shared/auth/AuthContext";

function formatDisplayDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}
import { exportToDocx } from "../../shared/export/docxExport.js";
import { exportTtnToXlsx } from "../../shared/export/xlsxExport.js";
import { exportBundle } from "../../shared/export/exportBundle.js";
import AccessLinksDialog from "./AccessLinksDialog.jsx";
import { buildScanUrl } from "../../shared/cargo/cargoStatus.js";
import {
  getActSection, sectionPatch, sectionPath, sectionAfterAccountant, SECTION,
} from "../../shared/acts/section.js";
import { getCompanies } from "../../shared/storage/companyStorage.js";
import { printLabelViaIframe } from "../../shared/print/labelPrint.js";
import { MoneyTh, MoneyTd, MoneyBlock } from "../../shared/money/Money.jsx";

function safeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function ActDetailsPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { isAdmin, isAccountant, isManager } = useAuth();
  const [act, setAct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef(null);
// 🆕 ТЗ v3: Печать наклейки с логотипом выбранной компании
//   const printLabel = async () => {
//     if (!act) return;

//     let comp = null;
//     if (act.companyId) {
//       try {
//         comp = await api.companies.get(act.companyId);
//       } catch (e) {
//         try {
//           const all = await api.companies.list();
//           comp = all.find(c => c.id === act.companyId) || null;
//         } catch (e2) { /* ignore */ }
//       }
//     }
//     const logoSrc = comp?.logo || "";
//     const companyName = comp?.name || "ТСУ Казахстан";

//     const logoFallbackInitials = (() => {
//       if (!companyName) return "TASU";
//       const cleaned = companyName.replace(/ТОО|ИП|OOO|LLP/gi, "").trim();
//       return cleaned.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || cleaned.slice(0, 4).toUpperCase();
//     })();

//     const num = act?.docNumber || act?.number || '';
//     const fromCity = act?.route?.fromCity || '—';
//     const toCity = act?.route?.toCity || '—';
//     const receiver = act?.receiver?.fio || act?.receiver?.companyName || '—';
//     const seats = act?.totals?.seats || '—';
//     const weight = act?.totals?.weight || '—';

//     let qrUrl = '';
//     try {
//       const { toDataURL } = await import("qrcode");
//       const qrData = `TASU-${act.docNumber}-${act.route?.toCity || ""}-${act.receiver?.fio || ""}`;
//       qrUrl = await toDataURL(qrData, { width: 140, margin: 1 });
//     } catch (e) {
//       console.warn("QR generation failed", e);
//     }

//     const esc = (s) => String(s == null ? '' : s)
//       .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

//     const routeFull = fromCity && toCity ? `${fromCity} → ${toCity}` : toCity;

//     const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Наклейка ${esc(num)}</title>
// <style>
//   @page { size: 100mm 150mm; margin: 0; }
//   @media print {
//     body { margin: 0; }
//     html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//   }
//   * { box-sizing: border-box; }
//   html, body { width: 100mm; height: 150mm; }
//   body {
//     font-family: Arial, Helvetica, sans-serif;
//     margin: 0;
//     padding: 0;
//     background: #fff;
//     color: #000;
//   }
//   .label {
//     width: 100mm;
//     height: 150mm;
//     border: 1.5mm solid #000;
//     display: flex;
//     flex-direction: column;
//   }
//   .header {
//     display: flex;
//     justify-content: center;
//     align-items: center;
//     padding: 4mm;
//     border-bottom: 1mm solid #000;
//     min-height: 16mm;
//   }
//   .logo img { max-height: 12mm; max-width: 60mm; object-fit: contain; filter: grayscale(1) contrast(2); }
//   .logo-text { font-weight: 900; font-size: 7mm; letter-spacing: 1mm; border: 1mm solid #000; padding: 2mm 4mm; }
//   .cities { display: flex; border-bottom: 1mm solid #000; }
//   .city-from { flex: 1; padding: 3mm 4mm; border-right: 1mm solid #000; }
//   .city-to { flex: 2; padding: 3mm 4mm; text-align: center; }
//   .city-label { font-size: 3mm; text-transform: uppercase; margin-bottom: 1mm; font-weight: 700; }
//   .city-val { font-size: 5mm; font-weight: 900; }
//   .city-big { font-size: 10mm; font-weight: 900; line-height: 1; }
//   .direction-row { padding: 3mm 4mm; border-bottom: 1mm solid #000; text-align: center; }
//   .direction-label { font-size: 3mm; text-transform: uppercase; margin-bottom: 1mm; font-weight: 700; }
//   .direction-val { font-size: 5mm; font-weight: 900; }
//   .info-row { display: flex; border-bottom: 1mm solid #000; }
//   .info-cell { flex: 1; padding: 3mm 4mm; border-right: 1mm solid #000; }
//   .info-cell:last-child { border-right: none; }
//   .info-label { font-size: 3mm; text-transform: uppercase; margin-bottom: 1mm; font-weight: 700; }
//   .info-val { font-weight: 900; font-size: 6mm; }
//   .num-row {
//     padding: 4mm;
//     border-bottom: 1mm solid #000;
//     background: #000;
//     color: #fff;
//     font-size: 7mm;
//     font-weight: 900;
//     text-align: center;
//     letter-spacing: 2mm;
//   }
//   .receiver-block { padding: 4mm; border-bottom: 1mm solid #000; text-align: center; }
//   .receiver-label { font-size: 3mm; text-transform: uppercase; margin-bottom: 2mm; font-weight: 700; }
//   .receiver-name { font-size: 6mm; font-weight: 900; line-height: 1.3; }
//   .qr-block { padding: 4mm; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center; }
//   .qr-block img { width: 30mm; height: 30mm; filter: grayscale(1) contrast(2); }
// </style></head><body>
// <div class="label">
//   <div class="header">
//     <div class="logo">${logoSrc ? `<img src="${esc(logoSrc)}" alt="Logo"/>` : `<div class="logo-text">${esc(logoFallbackInitials)}</div>`}</div>
//   </div>
//   <div class="cities">
//     <div class="city-from">
//       <div class="city-label">Отправитель</div>
//       <div class="city-val">${esc(fromCity)}</div>
//     </div>
//     <div class="city-to">
//       <div class="city-label">Получатель</div>
//       <div class="city-big">${esc(toCity)}</div>
//     </div>
//   </div>
//   <div class="direction-row">
//     <div class="direction-label">Направление</div>
//     <div class="direction-val">${esc(routeFull)}</div>
//   </div>
//   <div class="info-row">
//     <div class="info-cell"><div class="info-label">мест</div><div class="info-val">${esc(seats)}</div></div>
//     <div class="info-cell"><div class="info-label">вес</div><div class="info-val">${esc(weight)} кг</div></div>
//   </div>
//   <div class="num-row">№ ${esc(num)}</div>
//   <div class="receiver-block">
//     <div class="receiver-label">получатель</div>
//     <div class="receiver-name">${esc(receiver)}</div>
//   </div>
//   ${qrUrl ? `<div class="qr-block"><img src="${qrUrl}" alt="QR"/></div>` : ''}
// </div>
// <script>window.onload = () => { window.print(); }</script>
// </body></html>`;

//     const blob = new Blob([html], { type: 'text/html' });
//     const url = URL.createObjectURL(blob);
//     window.open(url, '_blank');
//   };


const printLabel = async () => {
    if (!act) return;

    let comp = null;
    if (act.companyId) {
      try {
        comp = await api.companies.get(act.companyId);
      } catch (e) {
        try {
          const all = await api.companies.list();
          comp = all.find(c => c.id === act.companyId) || null;
        } catch (e2) { /* ignore */ }
      }
    }
    const logoSrc = comp?.logo || "";
    const companyName = comp?.name || "ТСУ Казахстан";

    const logoFallbackInitials = (() => {
      if (!companyName) return "TASU";
      const cleaned = companyName.replace(/ТОО|ИП|OOO|LLP/gi, "").trim();
      return cleaned.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || cleaned.slice(0, 4).toUpperCase();
    })();

    const num = act?.docNumber || act?.number || '';
    const fromCity = act?.route?.fromCity || '';
    const toCity = act?.route?.toCity || '';
    const receiver = act?.receiver?.fio || act?.receiver?.companyName || '—';
    const seats = act?.totals?.seats || '—';
    const weight = act?.totals?.weight || '—';

    let qrUrl = '';
    try {
      const { toDataURL } = await import("qrcode");
      // ТЗ: в QR теперь ССЫЛКА на страницу сканера — её открывает любая камера
      // телефона. Прежняя строка TASU-... остаётся на наклейке текстом под
      // кодом: по ней сверяют груз глазами.
      const qrData = buildScanUrl(window.location.origin, act.id);
      // Оптимизировали размер генерируемого QR-кода для лучшей четкости на термопринтере
      qrUrl = await toDataURL(qrData, { width: 250, margin: 0 });
    } catch (e) {
      console.warn("QR generation failed", e);
    }

    const esc = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // HTML и CSS адаптированы строго под термопечать 100x150 мм
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Наклейка ${esc(num)}</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  @media print {
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    /* max-height, а НЕ height: высота ровно в размер листа при малейшем
       округлении вниз давала браузеру вторую страницу, и на неё уезжал
       последний блок наклейки — QR. Контент и так короче листа. */
    html, body { width: 100mm; max-height: 150mm; overflow: hidden; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100mm; max-height: 150mm; overflow: hidden; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
    color: #000;
  }
  .label {
    width: 100mm;
    /* Было height: 150mm — ровно в лист. Вместе с рамкой и округлением это
       и порождало вторую страницу. Теперь высота по содержимому, с потолком
       в размер этикетки. */
    max-height: 150mm;
    border: 1.5mm solid #000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Логотип четко слева, название справа */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 3mm;
    padding: 3mm 4mm;
    border-bottom: 1mm solid #000;
  }
  .logo { display: flex; align-items: center; flex-shrink: 0; }
  .logo img { max-height: 10mm; max-width: 40mm; object-fit: contain; filter: grayscale(1) contrast(2); }
  .logo-text { font-weight: 900; font-size: 5.5mm; letter-spacing: 0.5mm; border: 0.8mm solid #000; padding: 1mm 2.5mm; text-align: center; }
  .company-name { font-weight: 700; font-size: 3.2mm; text-align: right; line-height: 1.2; max-width: 50mm; }

  .cities { display: flex; border-bottom: 1mm solid #000; }
  .city-from { flex: 1; padding: 2.5mm 4mm; border-right: 1mm solid #000; }
  .city-to { flex: 2; padding: 2.5mm 4mm; text-align: center; }
  .city-label { font-size: 2.6mm; text-transform: uppercase; margin-bottom: 1mm; font-weight: 700; color: #000; }
  .city-val { font-size: 4.5mm; font-weight: 900; }
  .city-big { font-size: 8mm; font-weight: 900; line-height: 1; }
  .city-empty { color: #bbb; }

  .direction-row { padding: 2.5mm 4mm; border-bottom: 1mm solid #000; text-align: center; }
  .direction-label { font-size: 2.6mm; text-transform: uppercase; margin-bottom: 1mm; font-weight: 700; color: #000; }
  .direction-val { font-size: 4.5mm; font-weight: 900; }

  .info-row { display: flex; border-bottom: 1mm solid #000; }
  .info-cell { flex: 1; padding: 2.5mm 4mm; border-right: 1mm solid #000; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-size: 2.6mm; text-transform: uppercase; margin-bottom: 1mm; font-weight: 700; color: #000; }
  .info-val { font-weight: 900; font-size: 5.5mm; }

  .num-row {
    padding: 3mm 4mm;
    border-bottom: 1mm solid #000;
    background: #000;
    color: #fff;
    font-size: 6.5mm;
    font-weight: 900;
    text-align: center;
    letter-spacing: 1.5mm;
  }

  .receiver-block { padding: 3mm 4mm; border-bottom: 1mm solid #000; text-align: center; }
  .receiver-label { font-size: 2.6mm; text-transform: uppercase; margin-bottom: 1mm; font-weight: 700; color: #000; }
  .receiver-name { font-size: 5mm; font-weight: 900; line-height: 1.2; }

  /* Нижний блок для QR-кода.
     Было flex: 1 — блок забирал ВЕСЬ остаток листа (около 76 мм из 150),
     и итоговая высота зависела от того, как браузер посчитает этот остаток.
     Теперь высота фиксированная: сумма блоков перестаёт "плавать",
     и наклейка гарантированно укладывается в один лист. */
  .qr-block {
    flex: 0 0 auto;
    height: 34mm;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2mm;
    background: #fff;
  }
  .qr-block img {
    max-height: 30mm;
    max-width: 30mm;
    width: auto;
    height: auto;
    aspect-ratio: 1 / 1;
    filter: grayscale(1) contrast(3);
    image-rendering: pixelated;
  }
</style></head><body>
<div class="label">
  <div class="header">
    <div class="logo">${logoSrc ? `<img src="${esc(logoSrc)}" alt="Logo"/>` : `<div class="logo-text">${esc(logoFallbackInitials)}</div>`}</div>
    <div class="company-name">${esc(companyName)}</div>
  </div>
  <div class="cities">
    <div class="city-from">
      <div class="city-label">Отправитель</div>
      <div class="city-val ${fromCity ? '' : 'city-empty'}">${esc(fromCity) || 'не указан'}</div>
    </div>
    <div class="city-to">
      <div class="city-label">Получатель</div>
      <div class="city-big ${toCity ? '' : 'city-empty'}">${esc(toCity) || '—'}</div>
    </div>
  </div>
  ${fromCity && toCity ? `<div class="direction-row">
    <div class="direction-label">Направление</div>
    <div class="direction-val">${esc(fromCity)} → ${esc(toCity)}</div>
  </div>` : ''}
  <div class="info-row">
    <div class="info-cell"><div class="info-label">мест</div><div class="info-val">${esc(seats)}</div></div>
    <div class="info-cell"><div class="info-label">вес</div><div class="info-val">${esc(weight)}${weight !== '—' ? ' кг' : ''}</div></div>
  </div>
  <div class="num-row">№ ${esc(num)}</div>
  <div class="receiver-block">
    <div class="receiver-label">получатель</div>
    <div class="receiver-name">${esc(receiver)}</div>
  </div>
  ${qrUrl ? `<div class="qr-block"><img src="${qrUrl}" alt="QR"/></div>` : ''}
</div>
<script>
  window.onload = () => { 
    window.print(); 
    setTimeout(() => { window.close(); }, 500); // Автоматически закрывать окно после отправки на печать
  }
</script>
</body></html>`;

    // Печать через общий хелпер (скрытый iframe), а не отдельной вкладкой:
    // способ печати у юрлиц и частных должен быть один, чтобы не разъезжался.
    // Вид наклейки не затронут — HTML выше остался прежним.
    printLabelViaIframe(html, { title: `Наклейка ${num}` });
}
  // 🆕 ТЗ v3: Печать наклейки с логотипом выбранной компании
  // - логотип + название ИП динамически из карточки компании
  // - убран блок отправителя полностью
  // - только имя получателя (без телефона, без контактов)
  // - формат 100×150мм, цвета сохраняются, без URL/дат при печати
  const downloadQRCode = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `QR_Act_${act?.docNumber || id}.png`;
      link.href = url;
      link.click();
    }
  };

  const isSMRPath = location.pathname.startsWith('/smr');
  const isTTNPath = location.pathname.startsWith('/requests');
  const isWarehousePath = location.pathname.startsWith('/warehouse');
  const isDeferredPath = location.pathname.startsWith('/deferred');
  const isSentPath = location.pathname.startsWith('/sent');
  const isAccountantPath = location.pathname.startsWith('/accountant/acts');

  const basePath = isAccountantPath ? "/accountant/general" : (isSentPath ? "/sent" : (isAccountant && !isAdmin ? "/accountant/general" : (isDeferredPath ? "/deferred" : isSMRPath ? "/smr" : (isTTNPath ? "/requests" : (isWarehousePath ? "/warehouse" : "/acts")))));
  const crumbLabel = isAccountantPath ? "Бухгалтерия" : (isSentPath ? "Отработанные" : (isAccountant && !isAdmin ? "Бухгалтерия" : (isDeferredPath ? "Отложенные" : isSMRPath ? "СМР" : (isTTNPath ? "ТТН" : (isWarehousePath ? "Склад" : "Заявки")))));

  const [services, setServices] = useState([]);
  const [total, setTotal] = useState({ price: "" });

  const [showDocForm, setShowDocForm] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  // ТЗ: диалог одноразовых ссылок для наёмных водителей и получателей.
  const [showLinks, setShowLinks] = useState(false);
  const [notifyingManager, setNotifyingManager] = useState(false);
  const [docAttrs, setDocAttrs] = useState({
    doc5: "", doc6: "", doc13: "", doc14: "", doc15: "", doc18: "",
    vehicleModel: "",
    vehicleNumber: "",
    driver: "",
    // ТЗ: телефон водителя хранится в базе, но в ТТН/СМР НЕ выводится —
    // в маппинг экспорта (docxExport/xlsxExport) он намеренно не добавлен.
    driverPhone: "",
    hasTrailer: false,
    trailerModel: "",
    trailerNumber: "",
    transportType: "auto_console",
    flightNumber: "",
  });

  const hasFormedDocument = () => {
    if (!act) return false;
    const t = act.type || act.docType;
    if (t === 'ttn' || t === 'smr' || t === 'TTN' || t === 'SMR') return true;
    if (act.isWarehouse) {
      if (act.warehouseFormed === true) return true;
      if (Array.isArray(act.warehouseServices) && act.warehouseServices.length > 0) {
        const hasRealService = act.warehouseServices.some(
          s => s && (s.name || '').toString().trim().length > 0
        );
        return hasRealService;
      }
      return false;
    }
    return false;
  };

  const loadAct = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const found = await api.requests.get(id);
      if (found) {
        let details = {};
        if (found.details) {
          try {
            details = typeof found.details === 'string' ? JSON.parse(found.details) : found.details;
          } catch (e) { console.error("Parse details error", e); }
        }

        const mergedAct = { ...found, ...details };
        setAct(mergedAct);

        setServices(
          Array.isArray(details.services) && details.services.length
            ? details.services
            : [{ id: safeUuid(), name: "Доставка", qty: "1", sum: "0" }]
        );
        setTotal(details.total || { price: "" });
        if (details.docAttrs) {
          setDocAttrs(prev => ({ ...prev, ...details.docAttrs }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAct();
  }, [id]);

  useEffect(() => {
    if (act && isAccountant && !act.isViewedByAccountant) {
      const markAsViewed = async () => {
        try {
          await api.requests.update(act.id, { isViewedByAccountant: true });
          setAct(prev => ({ ...prev, isViewedByAccountant: true }));
        } catch (e) {
          console.error("Failed to mark as viewed", e);
        }
      };
      markAsViewed();
    }
  }, [act, isAccountant]);

  useEffect(() => {
    if (act && (!isAccountant || isAdmin) && act.updatedByAccountant && !act.isViewedByManager) {
      const markAsViewedManager = async () => {
        try {
          await api.requests.update(act.id, { isViewedByManager: true });
          setAct(prev => ({ ...prev, isViewedByManager: true }));
        } catch (e) {
          console.error("Failed to mark as viewed (manager)", e);
        }
      };
      markAsViewedManager();
    }
  }, [act, isAccountant, isAdmin]);

  const chooseDocType = async (type) => {
    if (!id) return;
    if (type === "ttn" || type === "smr") {
       setShowDocForm(type);
       return;
    }
    setActionLoading(true);
    try {
      // ТЗ: перевод на склад — такое же действие, как формирование СМР/ТТН,
      // только без модалки: складу поля транспорта не нужны.
      //
      // sectionPatch(WAREHOUSE) гасит docType от прежней ТТН/СМР, поэтому
      // накладная не остаётся одновременно в двух разделах — это тот самый
      // дубль «склад + СМР», который мы чинили. Заодно после перевода
      // печатается складская накладная, а не ТТН.
      const target = type === 'warehouse' ? SECTION.WAREHOUSE
        : type === 'ttn' ? SECTION.TTN
        : type === 'smr' ? SECTION.SMR
        : SECTION.ACT;
      await api.requests.update(id, { ...sectionPatch(target), status: "act" });
      await loadAct();
      alert(target === SECTION.WAREHOUSE
        ? "Накладная переведена на склад."
        : "Документ успешно сформирован!");
      nav(sectionPath(target, id));
    } catch (err) {
      alert("Ошибка: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ТЗ: данные автотранспорта обязательны при ФОРМИРОВАНИИ документа, но не
  // при сохранении заявки — заявку заводят, когда машина ещё не назначена.
  // Поэтому проверка стоит здесь, а не в validateBeforeSave формы заявки.
  //
  // Требуются только для авто: у самолёта и поезда машины нет, там свои поля
  // (номер рейса, вагон). Телефон водителя в список НЕ входит — заказчик
  // просил его хранить, а обязательность обосновывал тем, что «иначе непонятно,
  // кто вёз»; для этого достаточно марки, госномера и Ф.И.О.
  const missingVehicleFields = () => {
    if (!String(docAttrs.transportType || "").startsWith("auto")) return [];
    const required = [
      ["vehicleModel", "Марка автомобиля"],
      ["vehicleNumber", "Госномер автомобиля"],
      ["driver", "Водитель (Ф.И.О.)"],
    ];
    return required
      .filter(([key]) => !String(docAttrs[key] || "").trim())
      .map(([, label]) => label);
  };

  const confirmDocType = async () => {
    if (!id || !showDocForm) return;
    const missing = missingVehicleFields();
    if (missing.length) {
      alert(
        `Нельзя сформировать ${showDocForm.toUpperCase()}: не заполнены данные автотранспорта.\n\n` +
        missing.map(m => "• " + m).join("\n") +
        "\n\nБез них в документе не видно, кто вёз груз."
      );
      return;
    }
    setActionLoading(true);
    try {
      // sectionPatch гасит признак склада: формирование ТТН/СМР переводит
      // накладную в свой раздел целиком, а не добавляет её во второй.
      const target = showDocForm === 'ttn' ? SECTION.TTN : SECTION.SMR;
      await api.requests.update(id, {
        ...sectionPatch(target),
        docAttrs,
        status: "act"
      });
      await loadAct();
      setShowDocForm(null);
      alert(showDocForm === "ttn" ? "ТТН успешно сформирована!" : "СМР успешно сформирована!");
      nav(sectionPath(target, id));
    } catch (err) {
      alert("Ошибка: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Отмена формирования сбрасывает состояние ПОЛНОСТЬЮ за один запрос.
  // Раньше снимались только type и docType, а признак склада оставался — и
  // накладную тут же отсеивал фильтр «Заявок». Со стороны это выглядело как
  // «нажал, ничего не произошло», приходилось вручную снимать галочку склада.
  //
  // warehouseServices очищаются вместе с остальным: иначе hasFormedDocument
  // продолжит считать документ сформированным и пустит заявку к бухгалтеру.
  // docAttrs (марка авто, госномер, водитель) НЕ трогаем — это ручной ввод
  // менеджера, к формированию документа он отношения не имеет.
  const handleCancelFormation = async () => {
    if (!id) return;
    if (!window.confirm("Отменить формирование документа? Заявка вернётся в общий список.")) return;
    setActionLoading(true);
    try {
      await api.requests.update(id, {
        ...sectionPatch(SECTION.ACT),
        warehouseServices: [],
        status: "act",
      });
      await loadAct();
      nav(sectionPath(SECTION.ACT));
    } catch (err) {
      // Раньше здесь не было ни try/catch, ни alert: ошибка сервера уходила
      // в никуда и добавляла ощущение «кнопка не работает».
      alert("Не удалось отменить формирование: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnToRequests = async () => {
    if (!id || !act) return;
    if (window.confirm("Вернуть документ из отработанных в список заявок? Дата будет обновлена на сегодняшнюю.")) {
      setActionLoading(true);
      try {
        // Раздел, в который накладная вернётся, считается по её типу документа:
        // при отправке бухгалтеру он не затирался. Раньше здесь стояла лесенка
        // if/else, которая расходилась с фильтрами списков.
        const target = sectionAfterAccountant(act);
        const patch = sectionPatch(target);
        await api.requests.update(id, { ...patch, isProcessedByAccountant: false });
        const updated = await api.requests.restore(id);
        setAct(prev => ({ ...prev, ...updated, ...patch, isProcessedByAccountant: false }));
        alert("Документ возвращён в работу! Дата обновлена на сегодняшнюю.");
        nav(sectionPath(target));
      } catch (err) {
        alert("Ошибка: " + err.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleSendToAccountant = async () => {
    if (!id || !act) return;
    if (!hasFormedDocument()) {
      alert("Сначала сформируйте документ: СМР, ТТН или Складскую заявку (добавьте хотя бы одну складскую услугу). Без сформированного документа отправить бухгалтеру нельзя.");
      return;
    }
    if (window.confirm("Отправить документ бухгалтеру? После этого он появится в списке бухгалтерии.")) {
      setActionLoading(true);
      try {
        // Транзитный переход: тип документа сохраняется, чтобы при возврате
        // накладная легла обратно в свой раздел.
        const patch = sectionPatch(SECTION.ACCOUNTANT);
        const updated = await api.requests.update(id, patch);
        setAct(prev => ({ ...prev, ...updated, ...patch }));
        alert("Документ отправлен бухгалтеру!");
      } catch (err) {
        alert("Ошибка: " + err.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleToggleDefer = async () => {
    if (!id || !act) return;
    const isNowDeferred = !!act.isDeferredForAccountant;
    const actionText = isNowDeferred ? "Вернуть документ в общий список?" : "Переместить документ в отложенные?";
    if (window.confirm(actionText)) {
      setActionLoading(true);
      try {
        // Откладывание — транзитное состояние, возврат считается по типу
        // документа. Лесенка if/else заменена на тот же расчёт, что и в списках.
        const target = isNowDeferred ? sectionAfterAccountant(act) : SECTION.DEFERRED;
        const patch = sectionPatch(target);
        const updated = await api.requests.update(id, patch);
        setAct(prev => ({ ...prev, ...updated, ...patch }));
        nav(sectionPath(target));
      } catch (err) {
        alert("Ошибка: " + err.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleAnnul = async () => {
    if (!id || !act) return;
    const num = act.docNumber || act.number;
    if (window.confirm(`Аннулировать документ №${num}?`)) {
      setActionLoading(true);
      try {
        const updated = await api.requests.update(id, { status: "canceled" });
        setAct(updated);
      } catch (err) {
        alert("Ошибка: " + err.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleAnnulAndClone = async () => {
    if (!id || !act) return;
    if (!window.confirm("Аннулировать текущий документ и создать новый со всеми теми же данными?")) return;
    setActionLoading(true);
    try {
      const result = await api.requests.cancelAndClone(id);
      const newId = result?.id;
      const newNumber = result?.docNumber || "";
      if (newId) {
        alert(`Документ аннулирован.\nСоздана новая заявка №${newNumber}.\nОткрываю...`);
        if (act.isWarehouse) nav(`/warehouse/${newId}`);
        else if (act.type === 'smr' || act.docType === 'smr') nav(`/smr/${newId}`);
        else if (act.type === 'ttn' || act.docType === 'ttn') nav(`/requests/${newId}`);
        else nav(`/acts/${newId}`);
      } else {
        alert("Документ создан, но не получилось определить ID. Обновите страницу.");
      }
    } catch (err) {
      alert("Ошибка: " + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (id && act && window.confirm("Восстановить заявку?")) {
      setActionLoading(true);
      try {
        const updated = await api.requests.update(id, { status: "act" });
        setAct(updated);
      } catch (err) {
        alert("Ошибка: " + err.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleCompleteByAccountant = async (val) => {
    if (!id || !act) return;
    setAct(prev => ({ ...prev, isProcessedByAccountant: val }));
    try {
      if (val) {
        await api.requests.completeByAccountant(id);
        await api.requests.update(id, { isProcessedByAccountant: true });
      } else {
        await api.requests.update(id, { isProcessedByAccountant: false });
      }
    } catch (err) {
      alert(err.message);
      setAct(prev => ({ ...prev, isProcessedByAccountant: !val }));
    }
  };

  const addServiceRow = () => {
    setServices((prev) => [...prev, { id: safeUuid(), name: "", qty: "1", sum: "0" }]);
  };

  const removeServiceRow = (rowId) => {
    setServices((prev) => prev.filter((x) => x.id !== rowId));
  };

  const setServiceRow = (rowId, patch) => {
    setServices((prev) => prev.map((x) => (x.id === rowId ? { ...x, ...patch } : x)));
  };

  const saveExtra = async () => {
    if (!id) return;
    const updated = await api.requests.update(id, { services, total });
    setAct(updated);
    alert("Сохранено!");
  };

  const handleExport = async (docTypeOverride = null, roleOverride = null) => {
    if (!act || !act.companyId) {
      alert("Не указана компания экспедитор");
      return;
    }

    // ТЗ: данные автотранспорта подтягиваются в ТТН и СМР автоматически, но
    // подтягивать нечего, если их не заполнили. Раньше документ в таком случае
    // выгружался МОЛЧА с пустыми графами «Автомобиль» и «Водитель» — менеджер
    // узнавал об этом уже над распечатанным бланком и вписывал ручкой.
    //
    // Проверка обязательности стоит на ФОРМИРОВАНИИ документа, но заявки,
    // созданные до её появления, через неё не проходили — предупреждаем здесь.
    const kind = String(docTypeOverride || act.docType || act.type || "").toLowerCase();
    if ((kind === "ttn" || kind === "smr") && !act.isWarehouse) {
      const missing = missingVehicleFields();
      if (missing.length) {
        const ok = window.confirm(
          `В заявке не заполнены данные автотранспорта:\n\n` +
          missing.map(m => "• " + m).join("\n") +
          `\n\nВ бланке ${kind.toUpperCase()} графы «Автомобиль» и «Водитель» останутся пустыми.\n` +
          `Заполнить: «Редактировать» → блок «Транспорт».\n\n` +
          `Выгрузить всё равно?`
        );
        if (!ok) return;
      }
    }

    setExportLoading(true);
    try {
      let comp = null;
      try {
        comp = await api.companies.get(act.companyId);
      } catch (e) {
        console.warn("New getCompany endpoint not found, falling back to list...", e);
        const allComps = await api.companies.list();
        comp = allComps.find(c => c.id === act.companyId);
      }
      if (!comp) {
        alert("Данные компании не найдены на сервере");
        return;
      }
      const exportType = docTypeOverride || act.docType;
      // ТТН — отдельная официальная форма в Excel; остальное — docx.
      //
      // ТЗ: у складской заявки печатается СКЛАДСКАЯ накладная, а не ТТН.
      // Признак склада главнее docType: он мог остаться от прежнего
      // формирования ТТН (заявку сделали ТТН, потом добавили складскую услугу).
      // Раньше проверка на "ttn" стояла первой и безусловно уводила экспорт
      // в Excel-бланк ТТН — из-за этого ветка склада в docxExport
      // (templateFile = template_warehouse.docx) была недостижима в принципе.
      if (exportType === "ttn" && !act.isWarehouse) {
        await exportTtnToXlsx({ ...act, company: comp });
      } else {
        await exportToDocx({ ...act, company: comp, role: roleOverride || act.role }, exportType);
      }
      setShowExportMenu(false);
    } catch (err) {
      console.error("Export error:", err);
      alert("Ошибка при загрузке данных компании: " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // ТЗ: комплект отгрузочных документов одним архивом. Состав зависит от типа
  // заявки (см. bundlePlan). Если часть документов не собралась — архив всё
  // равно отдаётся, а внутри лежит ОШИБКИ.txt: молча отдавать неполный
  // комплект нельзя, бухгалтер решит, что всё на месте.
  const handleBundle = async () => {
    if (!act) return;
    setExportLoading(true);
    try {
      let comp = null;
      try { comp = await api.companies.get(act.companyId); }
      catch { const all = await api.companies.list(); comp = all.find(c => c.id === act.companyId); }
      if (!comp) { alert("Данные компании не найдены на сервере"); return; }

      const res = await exportBundle({ ...act, company: comp });
      if (res.failed.length) {
        alert(
          `Комплект собран частично.

Готово: ${res.ok.join(", ") || "—"}
` +
          `Не удалось: ${res.failed.map(f => f.label).join(", ")}

` +
          `Подробности — в файле ОШИБКИ.txt внутри архива.`
        );
      }
      setShowExportMenu(false);
    } catch (err) {
      alert("Ошибка сборки комплекта: " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) return <div className="muted" style={{padding: 20}}>Загрузка...</div>;

  if (!act) {
    return (
      <div className="topbar">
        <div>
          <div className="crumbs">{crumbLabel} / Не найдено</div>
          <h1>Акт не найден</h1>
        </div>
        <div className="topbar_actions">
          <button className="btn" onClick={() => nav(basePath)}>← Назад</button>
        </div>
      </div>
    );
  }

  const canSendToAccountant = hasFormedDocument();
  const isActualAccountant = isAccountant;
  const canCompleteByAccountant = isActualAccountant;

  const blockReasonText = (() => {
    if (!act) return "";
    if (act.isWarehouse) {
      return "Отправка бухгалтеру доступна только после формирования Складской заявки (добавьте хотя бы одну складскую услугу).";
    }
    return "Отправка бухгалтеру доступна только после формирования СМР или ТТН.";
  })();

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumbs">{crumbLabel} / {act.docNumber || act.number}</div>
          <h1>{act.docNumber || act.number}</h1>
        </div>

        <div className="topbar_actions">
          <button className="btn" onClick={() => nav(basePath)}>← Назад</button>

          {(!isAccountant || isAdmin) && (
            <>
              <button
                className="btn btn--accent"
                onClick={() => {
                  let editBase = '/acts';
                  if (act.isWarehouse) editBase = '/warehouse';
                  else if (act.type === 'smr' || act.docType === 'smr') editBase = '/smr';
                  else if (act.type === 'ttn' || act.docType === 'ttn') editBase = '/requests';
                  nav(`${editBase}/${act.id}/edit`);
                }}
                disabled={act.status === 'canceled' || actionLoading}
                title={act.readyForAccountant
                  ? "Внимание: при сохранении заявка вернётся в активные у бухгалтера с пометкой 'правка'"
                  : ""}
              >
                {act.readyForAccountant ? "✏ Редактировать (вернётся к бухгалтеру)" : "Редактировать"}
              </button>

              {!isSentPath && act.status !== 'canceled' && !act.readyForAccountant && !act.isWarehouse && !act.isDeferredForAccountant && act.type !== "ttn" && act.docType !== "ttn" && (
                <button className="btn btn--ghost" onClick={() => chooseDocType("ttn")} disabled={actionLoading}>
                  {actionLoading ? "Формирование..." : "Сформировать ТТН"}
                </button>
              )}

              {!isSentPath && act.status !== 'canceled' && !act.readyForAccountant && !act.isWarehouse && !act.isDeferredForAccountant && act.type !== "smr" && act.docType !== "smr" && (
                <button className="btn btn--ghost" onClick={() => chooseDocType("smr")} disabled={actionLoading}>
                  {actionLoading ? "Формирование..." : "Сформировать СМР"}
                </button>
              )}

              {/* ТЗ: перевод на склад кнопкой из заявки, наравне с СМР/ТТН.
                  Условия те же, что у соседей, плюс «ещё не на складе».
                  Снять склад можно кнопкой «Отменить формирование» — она видна
                  и для складских, отдельной кнопки возврата не нужно. */}
              {!isSentPath && act.status !== 'canceled' && !act.readyForAccountant && !act.isWarehouse && !act.isDeferredForAccountant && (
                <button className="btn btn--ghost" onClick={() => chooseDocType("warehouse")} disabled={actionLoading}>
                  {actionLoading ? "Перевод..." : "📦 На склад"}
                </button>
              )}

              {/* ТЗ: ссылка для наёмного водителя или получателя — вместо
                  учётки и кабинета. Аннулированную накладную не отдаём. */}
              {!isSentPath && act.status !== 'canceled' && (
                <button className="btn btn--ghost" onClick={() => setShowLinks(true)}>
                  🔗 Ссылка
                </button>
              )}

              {!isSentPath && act.status !== 'canceled' && !act.readyForAccountant && (
                <button
                  className={`btn ${act.isDeferredForAccountant ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={handleToggleDefer}
                  disabled={actionLoading}
                >
                  {actionLoading ? "..." : (act.isDeferredForAccountant ? "Вернуть из отложенных" : "Отложить")}
                </button>
              )}

              {!isSentPath && act.status !== 'canceled' && (
                <button className="btn btn--danger" onClick={handleAnnul} disabled={actionLoading}>
                   {actionLoading ? "..." : "Аннулировать"}
                </button>
              )}

              {!isSentPath && act.status !== 'canceled' && (
                <button
                  className="btn"
                  onClick={handleAnnulAndClone}
                  disabled={actionLoading}
                  title="Аннулировать текущий документ и создать новый с теми же данными"
                  style={{ background: '#fa8c16', borderColor: '#fa8c16', color: '#fff' }}
                >
                  {actionLoading ? "..." : "↻ Аннулировать и создать новую"}
                </button>
              )}

              {/* Кнопка видна во всех разделах, куда накладную мог увести
                  документ или склад. Раньше условием был только docType: в
                  раздел пускало по двум полям (docType ИЛИ type), а выйти
                  можно было по одному — у старых записей кнопки не было вовсе. */}
              {!isSentPath && act.status !== 'canceled' &&
               [SECTION.TTN, SECTION.SMR, SECTION.WAREHOUSE].includes(getActSection(act)) && (
                <button className="btn btn--danger" onClick={handleCancelFormation} disabled={actionLoading}>
                  Отменить формирование
                </button>
              )}
            </>
          )}

          {act.status === 'canceled' && isAdmin && (
            <button
              className="btn"
              style={{ borderColor: "#108ee9", color: "#108ee9" }}
              onClick={handleRestore}
              disabled={actionLoading}
            >
              {actionLoading ? "..." : "Восстановить"}
            </button>
          )}

          {act.status !== 'canceled' ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  className="btn"
                  style={{ background: '#2b5797', color: '#fff', borderColor: '#2b5797', opacity: exportLoading ? 0.7 : 1 }}
                  onClick={() => {
                    if (exportLoading) return;
                    if (act.docType) {
                      setShowExportMenu(!showExportMenu);
                    } else {
                      handleExport();
                    }
                  }}
                  disabled={exportLoading}
                >
                  {exportLoading ? "⏳ Загрузка..." : (act.docType ? "Экспорт в Word ▼" : "Экспорт в Word")}
                </button>

              {showExportMenu && act.docType && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, background: '#fff',
                  border: '1px solid #ddd', borderRadius: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000, minWidth: 500, marginTop: 5
                }}>
                  <div className="menu_item" style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={() => handleExport("Заявка", "expeditor")}>
                    📄 Заявка (Экспедитор)
                  </div>
                  <div className="menu_item" style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={() => handleExport("Заявка", "carrier")}>
                    📄 Заявка (Перевозчик)
                  </div>
                  {/* У складской заявки печатается складская накладная,
                      даже если docType остался 'ttn' от прежнего формирования.
                      Подпись должна говорить правду, иначе менеджер жмёт «ТТН»,
                      а получает другой документ. */}
                  {/* ТЗ: комплект отгрузочных документов одним архивом. */}
                  <div className="menu_item" style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee', fontWeight: 700 }} onClick={handleBundle}>
                    📦 Комплект документов (ZIP)
                  </div>
                  <div className="menu_item" style={{ padding: '10px 15px', cursor: 'pointer' }} onClick={() => handleExport(act.docType)}>
                    🚛 Экспорт как {act.isWarehouse ? "СКЛАДСКАЯ НАКЛАДНАЯ" : act.docType.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ТЗ: одноразовые ссылки — выдача, список выданных, отзыв. */}
      {showLinks && (
        <AccessLinksDialog
          act={act}
          onClose={() => setShowLinks(false)}
          onChanged={loadAct}
        />
      )}

      {showDocForm && (
        <div className="card" style={{ marginTop: 16, border: '2px solid var(--accent)', background: '#f0faff' }}>
          <div className="card_head">
            <div className="card_title">Заполнение данных для {showDocForm.toUpperCase()}</div>
          </div>
          <div className="card_body">
            <div className="form_grid">
              <div className="field" style={{ gridColumn: 'span 2', marginBottom: 10 }}>
                <div className="label">Вид перевозки <span className="text_danger">*</span></div>
                <select
                  value={docAttrs.transportType}
                  onChange={e => setDocAttrs({...docAttrs, transportType: e.target.value})}
                  style={{ fontWeight: 'bold', padding: '8px' }}
                >
                  <option value="auto_console">Авто консолидация</option>
                  <option value="auto_separate">Отдельное авто</option>
                  <option value="plane">Самолет</option>
                  <option value="train">Поезд рейс</option>
                </select>
              </div>

              {docAttrs.transportType.startsWith("auto") && (
                <>
                  {/* ТЗ: при формировании ТТН/СМР данные авто обязательны —
                      иначе непонятно, кто вёз. Звёздочка отмечает это на форме,
                      сама проверка стоит в confirmDocType. */}
                  <div className="field">
                    <div className="label">Марка автомобиля *</div>
                    <input value={docAttrs.vehicleModel} onChange={e => setDocAttrs({...docAttrs, vehicleModel: e.target.value})} placeholder="Volvo" />
                  </div>
                  <div className="field">
                    <div className="label">Госномер автомобиля *</div>
                    <input value={docAttrs.vehicleNumber} onChange={e => setDocAttrs({...docAttrs, vehicleNumber: e.target.value})} placeholder="016ACT02" />
                  </div>
                  <div className="field">
                    <div className="label">Водитель (Ф.И.О.) *</div>
                    <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
                  </div>
                  {/* Телефон водителя: хранится в базе, в накладную не попадает. */}
                  <div className="field">
                    <div className="label">Телефон водителя</div>
                    <input
                      value={docAttrs.driverPhone || ""}
                      onChange={e => setDocAttrs({...docAttrs, driverPhone: e.target.value})}
                      placeholder="+7 777 123 45 67"
                      title="Сохраняется в базе, в ТТН/СМР не выводится"
                    />
                  </div>
                  <div className="field" style={{ gridColumn: 'span 1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, cursor: 'pointer', marginTop: 32 }}>
                      <input
                        type="checkbox"
                        checked={!!docAttrs.hasTrailer}
                        onChange={e => setDocAttrs({...docAttrs, hasTrailer: e.target.checked})}
                      />
                      Имеется прицеп
                    </label>
                  </div>
                  {docAttrs.hasTrailer && (
                    <>
                      <div className="field">
                        <div className="label">Марка прицепа</div>
                        <input value={docAttrs.trailerModel} onChange={e => setDocAttrs({...docAttrs, trailerModel: e.target.value})} placeholder="Schmitz" />
                      </div>
                      <div className="field">
                        <div className="label">Госномер прицепа</div>
                        <input value={docAttrs.trailerNumber} onChange={e => setDocAttrs({...docAttrs, trailerNumber: e.target.value})} placeholder="21WSZ05" />
                      </div>
                    </>
                  )}
                </>
              )}

              {docAttrs.transportType === "plane" && (
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <div className="label">Номер рейса <span className="text_danger">*</span></div>
                  <input value={docAttrs.flightNumber} onChange={e => setDocAttrs({...docAttrs, flightNumber: e.target.value})} placeholder="KC-987" />
                </div>
              )}

              {docAttrs.transportType === "train" && (
                <>
                  <div className="field">
                    <div className="label">Поезд / Вагон / Рейс</div>
                    <input value={docAttrs.flightNumber} onChange={e => setDocAttrs({...docAttrs, flightNumber: e.target.value})} />
                  </div>
                  <div className="field">
                    <div className="label">Ф.И.О. ответственного (если есть)</div>
                    <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
                  </div>
                </>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button className="btn btn--accent" onClick={confirmDocType} disabled={actionLoading}>
                {actionLoading ? "Создание..." : "Подтвердить и Сформировать"}
              </button>
              <button className="btn" onClick={() => setShowDocForm(null)} disabled={actionLoading}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {(!isAccountant || isAdmin) && act.status !== 'canceled' && !isDeferredPath && (
        <div className="action_banner" style={{
           marginTop: 16,
           background: act.readyForAccountant ? 'rgba(82, 196, 26, 0.05)' : (canSendToAccountant ? 'var(--card)' : '#fff5f5'),
           borderLeft: `4px solid ${act.readyForAccountant ? '#52c41a' : (canSendToAccountant ? '#faad14' : '#ff4d4f')}`,
           padding: '20px', borderRadius: 8,
           display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16,
           justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
           <div>
              <div style={{fontWeight: 700, fontSize: '1.1rem', marginBottom: 4}}>
                {act.readyForAccountant
                  ? "✅ Документ отправлен бухгалтеру"
                  : (canSendToAccountant ? "Документ готов к передаче?" : "⚠ Сначала сформируйте документ")
                }
              </div>
              <div className="muted" style={{fontSize: '0.9rem'}}>
                {act.readyForAccountant
                  ? "Можно редактировать заявку — после сохранения она автоматически вернётся к бухгалтеру в Активные с пометкой 'правка'"
                  : (canSendToAccountant
                      ? "После отправки бухгалтер сможет увидеть заявку и приступить к оформлению СНО/АВР/ЭСФ"
                      : blockReasonText)
                }
              </div>
           </div>
           {!act.readyForAccountant ? (
             <button
                className="btn btn--primary"
                onClick={handleSendToAccountant}
                disabled={actionLoading || !canSendToAccountant}
                title={!canSendToAccountant ? blockReasonText : ""}
                style={{
                  background: canSendToAccountant ? '#52c41a' : '#d9d9d9',
                  borderColor: canSendToAccountant ? '#52c41a' : '#d9d9d9',
                  color: '#fff', padding: '10px 24px', fontWeight: 700,
                  cursor: canSendToAccountant ? 'pointer' : 'not-allowed',
                  opacity: canSendToAccountant ? 1 : 0.6
                }}
              >
                {actionLoading ? "Отправка..." : "▶ Отправить бухгалтеру"}
              </button>
           ) : (
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: '#52c41a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                   <span>✓ Отправлено</span>
                </div>
             </div>
           )}
        </div>
      )}

      {/* 🆕 Кнопка печати наклейки */}
      {act.status !== 'canceled' && (
        <div style={{ marginTop: '10px', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              className="btn"
              style={{ background: '#00a854', color: '#fff', borderColor: '#00a854' }}
              onClick={printLabel}
            >
              🏷️ Печать наклейки
            </button>
        </div>
      )}

      <div className="summary_grid" style={{marginTop: 16}}>
          <div className="summary_item">
              <div className="label">Номер</div>
              <div className="v">{act.docNumber || act.number}</div>
          </div>
          <div className="summary_item">
              <div className="label">Дата погрузки</div>
              <div className="v">{formatDisplayDate(act.date) || "—"}</div>
          </div>
          <div className="summary_item">
              <div className="label">Дата создания</div>
              <div className="v">{formatDisplayDate(act.createdAt || act.date)}</div>
          </div>
          <div className="summary_item">
              <div className="label">Статус</div>
              <div>
                {act.status === "canceled" ? (
                  <span className="badge badge--danger">Аннулирована</span>
                  ) : act.status === "act" ? (
                     <>
                      {!act.docType && (
                        act.isWarehouse ? (
                          <span className="badge" style={{ background: '#52c41a', color: '#fff' }}>Склад</span>
                        ) : (
                          <span className="badge badge--ttn">Заявка</span>
                        )
                      )}
                      {(act.type === "ttn" || act.docType === "ttn") && <span className="badge badge--ttn" style={{marginTop: 5, background: '#52c41a'}}>ТТН</span>}
                      {(act.type === "smr" || act.docType === "smr") && <span className="badge badge--ttn" style={{marginTop: 5, background: '#1890ff'}}>СМР</span>}
                     </>
                ) : (
                  <span className="badge badge--draft">Черновик</span>
                )}
              </div>
          </div>
          <div className="summary_item">
              <div className="label">Страховка</div>
              <div className="v">{act.insured ? "Да" : "Нет"}</div>
              {act.insured && act.cargoValue && (
                <MoneyBlock>
                  <div className="v" style={{ fontSize: '0.85em', color: 'var(--accent)', fontWeight: 700 }}>
                    (сумма страховки: {act.cargoValue})
                  </div>
                </MoneyBlock>
              )}
          </div>
          {/* ТЗ: сумма заявки скрыта от ограниченного менеджера */}
          <MoneyBlock>
            <div className="summary_item">
              <div className="label">Сумма</div>
              <div className="v">{act.totalSum || "—"}</div>
            </div>
          </MoneyBlock>
          {act.isWarehouse && (
            <div className="summary_item">
                <div className="label">Тип</div>
                <div className="v"><span className="badge" style={{ background: '#52c41a', color: '#fff' }}>Склад (Складские услуги)</span></div>
            </div>
          )}
      </div>

      <div className="split_2" style={{ marginTop: 14 }}>
        {(isAccountant || isSentPath) && (
          <div className="info_card" style={{ gridColumn: 'span 2', borderRadius: 8, padding: 20 }}>
            <div className="info_title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 16 }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--info)' }}>Отметка Бухгалтерии</span>
            </div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', padding: '12px 16px', borderRadius: 6, border: '1px solid var(--line)', flex: '1 1 min-content' }}>
                 <div style={{ flex: 1, fontWeight: 500, fontSize: '0.95rem', color: 'var(--text)' }}>
                    Счет на оплату (СНО) выставлен
                 </div>
                 {isAccountant ? (
                   <label className="toggle_switch" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input type="checkbox" style={{ display: 'none' }} checked={!!act.snoIssued}
                        onChange={async (e) => {
                          const val = e.target.checked;
                          setAct(prev => ({ ...prev, snoIssued: val }));
                          try { await api.requests.update(act.id, { snoIssued: val }); }
                          catch (err) { alert(err.message); setAct(prev => ({ ...prev, snoIssued: !val })); }
                        }}
                      />
                      <div className="toggle_slider" style={{ width: 44, height: 24, background: act.snoIssued ? 'var(--success)' : 'var(--muted)', borderRadius: 24, position: 'relative', transition: 'background 0.3s' }}>
                        <div className="toggle_knob" style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: act.snoIssued ? 22 : 2, transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                      </div>
                   </label>
                 ) : (
                   <span className="badge" style={{ background: act.snoIssued ? '#f6ffed' : '#fffbe6', color: act.snoIssued ? '#52c41a' : '#faad14', padding: '4px 12px', borderColor: act.snoIssued ? '#b7eb8f' : '#ffe58f' }}>
                     {act.snoIssued ? "Да" : "Нет"}
                   </span>
                 )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', padding: '12px 16px', borderRadius: 6, border: '1px solid var(--line)', flex: '1 1 min-content' }}>
                 <div style={{ flex: 1, fontWeight: 500, fontSize: '0.95rem', color: 'var(--text)' }}>
                    Акт выполненных работ (АВР) отправлен
                 </div>
                 {isAccountant ? (
                   <label className="toggle_switch" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input type="checkbox" style={{ display: 'none' }} checked={!!act.avrSent}
                        onChange={async (e) => {
                          const val = e.target.checked;
                          setAct(prev => ({ ...prev, avrSent: val }));
                          try { await api.requests.update(act.id, { avrSent: val }); }
                          catch (err) { alert(err.message); setAct(prev => ({ ...prev, avrSent: !val })); }
                        }}
                      />
                      <div className="toggle_slider" style={{ width: 44, height: 24, background: act.avrSent ? 'var(--info)' : 'var(--muted)', borderRadius: 24, position: 'relative', transition: 'background 0.3s' }}>
                        <div className="toggle_knob" style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: act.avrSent ? 22 : 2, transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                      </div>
                   </label>
                 ) : (
                   <span className="badge" style={{ background: act.avrSent ? '#e6f7ff' : '#fffbe6', color: act.avrSent ? '#1890ff' : '#faad14', padding: '4px 12px', borderColor: act.avrSent ? '#91caff' : '#ffe58f' }}>
                     {act.avrSent ? "Да" : "Нет"}
                   </span>
                 )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', padding: '12px 16px', borderRadius: 6, border: '1px solid var(--line)', flex: '1 1 min-content' }}>
                 <div style={{ flex: 1, fontWeight: 500, fontSize: '0.95rem', color: 'var(--text)' }}>
                    Электронная счет-фактура (ЭСФ) выставлена
                 </div>
                 {isAccountant ? (
                   <label className="toggle_switch" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <input type="checkbox" style={{ display: 'none' }} checked={!!act.esfIssued}
                        onChange={async (e) => {
                          const val = e.target.checked;
                          setAct(prev => ({ ...prev, esfIssued: val }));
                          try { await api.requests.update(act.id, { esfIssued: val }); }
                          catch (err) { alert(err.message); setAct(prev => ({ ...prev, esfIssued: !val })); }
                        }}
                      />
                      <div className="toggle_slider" style={{ width: 44, height: 24, background: act.esfIssued ? '#722ed1' : 'var(--muted)', borderRadius: 24, position: 'relative', transition: 'background 0.3s' }}>
                        <div className="toggle_knob" style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: act.esfIssued ? 22 : 2, transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                      </div>
                   </label>
                 ) : (
                   <span className="badge" style={{ background: act.esfIssued ? '#f9f0ff' : '#fffbe6', color: act.esfIssued ? '#722ed1' : '#faad14', padding: '4px 12px', borderColor: act.esfIssued ? '#d3adf7' : '#ffe58f' }}>
                     {act.esfIssued ? "Да" : "Нет"}
                   </span>
                 )}
              </div>

              <div className={`processed_card ${act.isProcessedByAccountant ? 'processed_card--active' : ''}`}>
                  <div className={`processed_text ${act.isProcessedByAccountant ? 'processed_text--active' : ''}`}>
                     ✅ Заявка полностью обработана (Отработано)
                  </div>

                  {isAccountant && (
                    <div style={{ marginTop: 12 }}>
                      <button className="btn btn--sm"
                        style={{
                          width: '100%',
                          background: act.updatedByAccountant && !act.isViewedByManager ? 'var(--bg)' : 'var(--info)',
                          color: act.updatedByAccountant && !act.isViewedByManager ? 'var(--text-muted)' : '#fff',
                          borderColor: 'var(--line)', fontWeight: 700, height: '42px'
                        }}
                        onClick={async () => {
                           if (notifyingManager) return;
                           setNotifyingManager(true);
                           try {
                             await api.requests.update(act.id, { updatedByAccountant: true, isViewedByManager: false });
                             setAct(prev => ({ ...prev, updatedByAccountant: true, isViewedByManager: false }));
                           } catch (e) {
                             alert("Ошибка при уведомлении: " + e.message);
                           } finally {
                             setNotifyingManager(false);
                           }
                        }}
                        disabled={act.updatedByAccountant && !act.isViewedByManager || notifyingManager}
                      >
                        {act.updatedByAccountant && !act.isViewedByManager ? "⏳ Уведомление отправлено" : (notifyingManager ? "⏳ Отправка..." : "🔔 Уведомить менеджера об изменениях")}
                      </button>
                    </div>
                  )}

                  {canCompleteByAccountant ? (
                    <label className="toggle_switch" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                       <input type="checkbox" style={{ display: 'none' }} checked={!!act.isProcessedByAccountant}
                         onChange={(e) => handleCompleteByAccountant(e.target.checked)}
                       />
                       <div className="toggle_slider" style={{ width: 44, height: 24, background: act.isProcessedByAccountant ? 'var(--success)' : 'var(--muted)', borderRadius: 24, position: 'relative', transition: 'background 0.3s' }}>
                         <div className="toggle_knob" style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: act.isProcessedByAccountant ? 22 : 2, transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                       </div>
                    </label>
                  ) : (
                    <span className="badge" style={{ background: act.isProcessedByAccountant ? '#f6ffed' : '#fffbe6', color: act.isProcessedByAccountant ? '#52c41a' : '#faad14' }}>
                       {act.isProcessedByAccountant ? "Да" : "Нет"}
                    </span>
                  )}
               </div>

            </div>
          </div>
        )}

        <div className="info_card">
          <div className="info_title">Заказчик</div>
          <div className="kv">
            <div className="k">ФИО / Название</div>
            <div className="v">{act.customer?.fio || "—"}</div>
            <div className="k">Телефон</div>
            <div className="v">{act.customer?.phone || "—"}</div>
            <div className="k">Компания</div>
            <div className="v">{act.customer?.companyName || "—"}</div>
            <div className="k">БИН</div>
            <div className="v">{act.customer?.bin || "—"}</div>
            <div className="k">Адрес (Юр)</div>
            <div className="v">{act.customer?.jurAddress || "—"}</div>
            <div className="k">Банк</div>
            <div className="v">{act.customer?.bank || "—"}</div>
            <div className="k">Счет</div>
            <div className="v">{act.customer?.account || "—"}</div>
          </div>
        </div>

        <div className="info_card">
          <div className="info_title">Грузоотправитель</div>
          {act.isSenderSameAsCustomer ? (
            <div className="muted" style={{ padding: '10px 0' }}>
               Тот же, что и заказчик
            </div>
          ) : (
            <div className="kv">
              <div className="k">ФИО / Название</div>
              <div className="v">{act.sender?.fio || "—"}</div>
              <div className="k">Телефон</div>
              <div className="v">{act.sender?.phone || "—"}</div>
              <div className="k">Компания</div>
              <div className="v">{act.sender?.companyName || "—"}</div>
              <div className="k">БИН</div>
              <div className="v">{act.sender?.bin || "—"}</div>
              <div className="k">Адрес (Юр)</div>
              <div className="v">{act.sender?.jurAddress || "—"}</div>
              <div className="k">Email</div>
              <div className="v">{act.sender?.email || "—"}</div>
            </div>
          )}
        </div>

        <div className="info_card">
          <div className="info_title">Получатель</div>
           <div className="kv">
            <div className="k">ФИО / Название</div>
            <div className="v">{act.receiver?.fio || "—"}</div>
            <div className="k">Телефон</div>
            <div className="v">{act.receiver?.phone || "—"}</div>
            <div className="k">Компания</div>
            <div className="v">{act.receiver?.companyName || "—"}</div>
            <div className="k">БИН</div>
            <div className="v">{act.receiver?.bin || "—"}</div>
            <div className="k">Адрес (Юр)</div>
            <div className="v">{act.receiver?.jurAddress || "—"}</div>
            <div className="k">Банк</div>
            <div className="v">{act.receiver?.bank || "—"}</div>
            <div className="k">Счет</div>
            <div className="v">{act.receiver?.account || "—"}</div>
          </div>
        </div>

      </div>

       <div className="info_card" style={{ marginTop: 14 }}>
            <div className="info_title">Маршрут и сроки</div>
            <div className="kv">
               <div className="k">Маршрут</div>
               <div className="v">{act.route?.fromCity} → {act.route?.toCity}</div>
               <div className="k">Адрес отправителя</div>
               <div className="v">{act.route?.fromAddress || "—"}</div>
               <div className="k">Адрес получателя</div>
               <div className="v">{act.route?.toAddress || "—"}</div>
               <div className="k">Срок доставки</div>
               <div className="v">{act.deliveryTerm || "—"}</div>
               <div className="k">Комментарий</div>
               <div className="v">{act.route?.comment || "—"}</div>
            </div>
       </div>

      {/* ТЗ: подписана ли СМР — видно сразу, без выгрузки документа.
          Подпись получателя приходит по одноразовой ссылке (/sign/:token)
          и хранится в Request.signatures. Показываем и миниатюру: менеджеру
          важно убедиться, что расписались, а не нажали случайно. */}
      {!act.isWarehouse && (act.type === 'smr' || act.docType === 'smr' || act.type === 'ttn' || act.docType === 'ttn') && (() => {
        const sign = (Array.isArray(act.signatures) ? act.signatures : [])
          .filter(s => s && s.role === 'receiver' && s.image)
          .slice(-1)[0];
        return (
          <div className="card" style={{ marginTop: 14, padding: 16 }}>
            {sign ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 26 }}>✍️</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: '#237804' }}>Подписано получателем</div>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {sign.name ? `${sign.name} · ` : ''}
                    {sign.signedAt ? new Date(sign.signedAt).toLocaleString('ru') : ''}
                  </div>
                </div>
                <img
                  src={sign.image}
                  alt="Подпись получателя"
                  style={{ height: 54, maxWidth: 200, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', padding: 4 }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 26, opacity: 0.5 }}>✍️</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#d48806' }}>Ожидает подписи получателя</div>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    Отправьте ссылку кнопкой «🔗 Ссылка» → «Подпись получателя».
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {!act.isWarehouse && (act.type === 'ttn' || act.docType === 'ttn' || act.type === 'smr' || act.docType === 'smr' || (act.type === 'REQUEST' && act.docAttrs?.transportType)) && (
        <div className="card card--transport" style={{ marginTop: 14 }}>
          <div className="card_head card_head--transport" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card_title">Транспортная информация ({(act.type || act.docType).toUpperCase()})</div>
          </div>
          <div className="card_body">
            <div className="form_grid">
              <div className="field">
                <div className="label">Вид перевозки</div>
                <div className="v v--accent">
                  {act.docAttrs?.transportType === "auto_console" ? "Авто консолидация" :
                   act.docAttrs?.transportType === "auto_separate" ? "Отдельное авто" :
                   act.docAttrs?.transportType === "plane" ? "Самолет" :
                   act.docAttrs?.transportType === "train" ? "Поезд рейс" : "—"}
                </div>
              </div>

              {act.docAttrs?.flightNumber && (
                <div className="field">
                  <div className="label">{act.docAttrs.transportType === 'plane' ? 'Номер рейса' : 'Поезд / Вагон'}</div>
                  <div className="v v--bold">{act.docAttrs.flightNumber}</div>
                </div>
              )}
              {(act.docAttrs?.vehicleModel || act.docAttrs?.vehicleNumber || act.docAttrs?.vehicle) && (
                <>
                  {act.docAttrs?.vehicleModel && (
                    <div className="field">
                      <div className="label">Марка автомобиля</div>
                      <div className="v v--bold">{act.docAttrs.vehicleModel}</div>
                    </div>
                  )}
                  {act.docAttrs?.vehicleNumber ? (
                    <div className="field">
                      <div className="label">Госномер автомобиля</div>
                      <div className="v v--bold">{act.docAttrs.vehicleNumber}</div>
                    </div>
                  ) : (
                    !act.docAttrs?.vehicleModel && act.docAttrs?.vehicle && (
                      <div className="field">
                        <div className="label">Автомобиль</div>
                        <div className="v v--bold">{act.docAttrs.vehicle}</div>
                      </div>
                    )
                  )}
                </>
              )}
              {act.docAttrs?.hasTrailer && (
                <>
                  {act.docAttrs?.trailerModel && (
                    <div className="field">
                      <div className="label">Марка прицепа</div>
                      <div className="v v--bold">{act.docAttrs.trailerModel}</div>
                    </div>
                  )}
                  {act.docAttrs?.trailerNumber ? (
                    <div className="field">
                      <div className="label">Госномер прицепа</div>
                      <div className="v v--bold">{act.docAttrs.trailerNumber}</div>
                    </div>
                  ) : (
                    !act.docAttrs?.trailerModel && (
                      <div className="field">
                        <div className="label">Прицеп</div>
                        <div className="v v--bold">Да</div>
                      </div>
                    )
                  )}
                </>
              )}
              {act.docAttrs?.driver && (
                <div className="field">
                  <div className="label">{(act.docAttrs.transportType === 'train' || act.docAttrs.transportType === 'plane') ? 'Ответственный' : 'Водитель'}</div>
                  <div className="v">{act.docAttrs.driver}</div>
                </div>
              )}
              {/* Телефон водителя виден в карточке (это и есть «в базе»),
                  но в ТТН/СМР не выводится — в маппинг экспорта не добавлен. */}
              {act.docAttrs?.driverPhone && (
                <div className="field">
                  <div className="label">Телефон водителя</div>
                  <div className="v">{act.docAttrs.driverPhone}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="info_card" style={{ marginTop: 14 }}>
        <div className="info_title">Груз</div>
        <div className="text_block text_block--mb10">{act.cargoText || "—"}</div>

         <div className="kv kv--cargo">
           <div>
             <div className="k">Вид упаковки</div>
             <div className="v">{act.packaging || "—"}</div>
           </div>
         </div>

        {Array.isArray(act.cargoRows) && (
            <div className="table_wrap">
                <table className="table_fixed">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Название</th>
                            <th>Мест</th>
                            <th>Длина (см)</th>
                            <th>Ширина (см)</th>
                            <th>Высота (см)</th>
                            <th>Вес (кг)</th>
                            <th>Объем (см³)</th>
                            <th>Об. вес (кг)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {act.cargoRows.map((r, i) => (
                            <tr key={i}>
                                <td>{i+1}</td>
                                <td>{r.title || "—"}</td>
                                <td>{r.seats}</td>
                                <td>{r.length}</td>
                                <td>{r.width}</td>
                                <td>{r.height}</td>
                                <td>{r.weight}</td>
                                <td>{r.volume}</td>
                                <td>{r.volWeight}</td>
                            </tr>
                        ))}
                    </tbody>
                    {act.totals && (
                        <tfoot style={{fontWeight: 700, background: '#f5f5f5'}}>
                            <tr>
                                <td colSpan={2}>Итого</td>
                                <td>{act.totals.seats}</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td>{act.totals.weight}</td>
                                <td>{act.totals.volume?.toFixed(0)}</td>
                                <td>{act.totals.volWeight?.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            )}
      </div>

      {Array.isArray(act.warehouseServices) && act.warehouseServices.length > 0 && (
        <div className="info_card" style={{ marginTop: 14 }}>
          <div className="info_title">{act.isWarehouse ? "Складские услуги" : "Услуги"}</div>
          <div className="table_wrap">
            <table className="table_fixed">
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>№</th>
                        <th style={{ minWidth: 300 }}>Наименование услуги</th>
                        <th style={{ width: 100 }}>Кол-во</th>
                        {/* ТЗ: денежные колонки скрыты от ограниченного менеджера.
                            Заголовок и ячейка прячутся парой, итог ниже — согласованно. */}
                        <MoneyTh style={{ width: 120 }}>Цена</MoneyTh>
                        <MoneyTh style={{ width: 120 }}>Сумма</MoneyTh>
                    </tr>
                </thead>
                <tbody>
                    {act.warehouseServices.map((s, idx) => (
                        <tr key={s.id || idx}>
                            <td>{idx + 1}</td>
                            <td>{s.name || "—"}</td>
                            <td>{s.qty}</td>
                            <MoneyTd>{s.price?.toLocaleString()}</MoneyTd>
                            <MoneyTd style={{ fontWeight: 700 }}>{s.total?.toLocaleString()}</MoneyTd>
                        </tr>
                    ))}
                </tbody>
                <tfoot style={{ background: '#f9f9f9' }}>
                    <tr style={{ fontWeight: 700 }}>
                        <td colSpan={2} style={{ textAlign: 'right' }}>Итого:</td>
                        <td>{act.warehouseServices.reduce((acc, s) => acc + (parseFloat(s.qty) || 0), 0)}</td>
                        <MoneyTd></MoneyTd>
                        <MoneyTd style={{ fontWeight: 900 }}>
                          {act.warehouseServices.reduce((acc, s) => acc + (s.total || 0), 0).toLocaleString()}
                        </MoneyTd>
                    </tr>
                </tfoot>
             </table>
          </div>
        </div>
      )}
    </>
  );
}