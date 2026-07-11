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
import { getCompanies } from "../../shared/storage/companyStorage.js";

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
    const fromCity = act?.route?.fromCity || '—';
    const toCity = act?.route?.toCity || '—';
    const receiver = act?.receiver?.fio || act?.receiver?.companyName || '—';
    const seats = act?.totals?.seats || '—';
    const weight = act?.totals?.weight || '—';

    let qrUrl = '';
    try {
      const { toDataURL } = await import("qrcode");
      const qrData = `TASU-${num}-${toCity}-${receiver}`;
      qrUrl = await toDataURL(qrData, { width: 140, margin: 1 });
    } catch (e) {
      console.warn("QR generation failed", e);
    }

    const esc = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const routeFull = fromCity && toCity ? `${fromCity} → ${toCity}` : toCity;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Наклейка ${esc(num)}</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  @media print {
    body { margin: 0; }
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { box-sizing: border-box; }
  html, body { width: 100mm; height: 150mm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
  }
  .label {
    width: 100mm;
    height: 150mm;
    border: 1.5mm solid #000;
    display: flex;
    flex-direction: column;
  }
  .header {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 4mm;
    border-bottom: 1mm solid #000;
    min-height: 16mm;
  }
  .logo img { max-height: 12mm; max-width: 60mm; object-fit: contain; filter: grayscale(1) contrast(2); }
  .logo-text { font-weight: 900; font-size: 7mm; letter-spacing: 1mm; border: 1mm solid #000; padding: 2mm 4mm; }
  .cities { display: flex; border-bottom: 1mm solid #000; }
  .city-from { flex: 1; padding: 3mm 4mm; border-right: 1mm solid #000; }
  .city-to { flex: 2; padding: 3mm 4mm; text-align: center; }
  .city-label { font-size: 3mm; text-transform: uppercase; margin-bottom: 1mm; font-weight: 700; }
  .city-val { font-size: 5mm; font-weight: 900; }
  .city-big { font-size: 10mm; font-weight: 900; line-height: 1; }
  .direction-row { padding: 3mm 4mm; border-bottom: 1mm solid #000; text-align: center; }
  .direction-label { font-size: 3mm; text-transform: uppercase; margin-bottom: 1mm; font-weight: 700; }
  .direction-val { font-size: 5mm; font-weight: 900; }
  .info-row { display: flex; border-bottom: 1mm solid #000; }
  .info-cell { flex: 1; padding: 3mm 4mm; border-right: 1mm solid #000; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-size: 3mm; text-transform: uppercase; margin-bottom: 1mm; font-weight: 700; }
  .info-val { font-weight: 900; font-size: 6mm; }
  .num-row {
    padding: 4mm;
    border-bottom: 1mm solid #000;
    background: #000;
    color: #fff;
    font-size: 7mm;
    font-weight: 900;
    text-align: center;
    letter-spacing: 2mm;
  }
  .receiver-block { padding: 4mm; border-bottom: 1mm solid #000; text-align: center; }
  .receiver-label { font-size: 3mm; text-transform: uppercase; margin-bottom: 2mm; font-weight: 700; }
  .receiver-name { font-size: 6mm; font-weight: 900; line-height: 1.3; }
  .qr-block { padding: 4mm; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center; }
  .qr-block img { width: 30mm; height: 30mm; filter: grayscale(1) contrast(2); }
</style></head><body>
<div class="label">
  <div class="header">
    <div class="logo">${logoSrc ? `<img src="${esc(logoSrc)}" alt="Logo"/>` : `<div class="logo-text">${esc(logoFallbackInitials)}</div>`}</div>
  </div>
  <div class="cities">
    <div class="city-from">
      <div class="city-label">Отправитель</div>
      <div class="city-val">${esc(fromCity)}</div>
    </div>
    <div class="city-to">
      <div class="city-label">Получатель</div>
      <div class="city-big">${esc(toCity)}</div>
    </div>
  </div>
  <div class="direction-row">
    <div class="direction-label">Направление</div>
    <div class="direction-val">${esc(routeFull)}</div>
  </div>
  <div class="info-row">
    <div class="info-cell"><div class="info-label">мест</div><div class="info-val">${esc(seats)}</div></div>
    <div class="info-cell"><div class="info-label">вес</div><div class="info-val">${esc(weight)} кг</div></div>
  </div>
  <div class="num-row">№ ${esc(num)}</div>
  <div class="receiver-block">
    <div class="receiver-label">получатель</div>
    <div class="receiver-name">${esc(receiver)}</div>
  </div>
  ${qrUrl ? `<div class="qr-block"><img src="${qrUrl}" alt="QR"/></div>` : ''}
</div>
<script>window.onload = () => { window.print(); }</script>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };
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
  const [notifyingManager, setNotifyingManager] = useState(false);
  const [docAttrs, setDocAttrs] = useState({
    doc5: "", doc6: "", doc13: "", doc14: "", doc15: "", doc18: "",
    vehicleModel: "",
    vehicleNumber: "",
    driver: "",
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
      await api.requests.update(id, { type: type, docType: type, status: "act" });
      await loadAct();
      alert("Документ успешно сформирован!");
      if (type === 'ttn') nav(`/requests/${id}`);
      else if (type === 'smr') nav(`/smr/${id}`);
    } catch (err) {
      alert("Ошибка: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDocType = async () => {
    if (!id || !showDocForm) return;
    setActionLoading(true);
    try {
      await api.requests.update(id, {
        type: showDocForm,
        docType: showDocForm,
        docAttrs,
        status: "act"
      });
      await loadAct();
      setShowDocForm(null);
      alert(showDocForm === "ttn" ? "ТТН успешно сформирована!" : "СМР успешно сформирована!");
      if (showDocForm === 'ttn') nav(`/requests/${id}`);
      else if (showDocForm === 'smr') nav(`/smr/${id}`);
      setShowDocForm(null);
    } catch (err) {
      alert("Ошибка: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelFormation = async () => {
    if (!id) return;
    if (window.confirm("Отменить формирование документа? Заявка вернется в общий список.")) {
      await api.requests.update(id, { type: 'REQUEST', docType: null, status: "act" });
      await loadAct();
      setActionLoading(false);
      nav("/acts");
    }
  };

  const handleReturnToRequests = async () => {
    if (!id || !act) return;
    if (window.confirm("Вернуть документ из отработанных в список заявок? Дата будет обновлена на сегодняшнюю.")) {
      setActionLoading(true);
      try {
        await api.requests.update(id, {
          readyForAccountant: false,
          isDeferredForAccountant: false,
          isProcessedByAccountant: false,
        });
        const updated = await api.requests.restore(id);
        setAct(prev => ({
          ...prev, ...updated,
          readyForAccountant: false,
          isDeferredForAccountant: false,
          isProcessedByAccountant: false,
        }));
        alert("Документ возвращен в работу! Дата обновлена на сегодняшнюю.");
        if (act.isWarehouse) nav('/warehouse');
        else if (act.type === 'smr' || act.docType === 'smr') nav('/smr');
        else nav('/requests');
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
        const updated = await api.requests.update(id, {
          readyForAccountant: true,
          isDeferredForAccountant: false
        });
        setAct(prev => ({
          ...prev, ...updated,
          readyForAccountant: true,
          isDeferredForAccountant: false
        }));
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
        const updated = await api.requests.update(id, { isDeferredForAccountant: !isNowDeferred });
        setAct(updated);
        if (!isNowDeferred) {
           nav('/deferred');
        } else {
           if (act.isWarehouse) nav('/warehouse');
           else if (act.type === 'smr' || act.docType === 'smr') nav('/smr');
           else if (act.type === 'ttn' || act.docType === 'ttn') nav('/requests');
           else nav('/acts');
        }
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

  const handleExport = async (docTypeOverride = null) => {
    if (!act || !act.companyId) {
      alert("Не указана компания экспедитор");
      return;
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
      // ТТН — отдельная официальная форма в Excel; остальное — docx
      if (exportType === "ttn") {
        await exportTtnToXlsx({ ...act, company: comp });
      } else {
        await exportToDocx({ ...act, company: comp }, exportType);
      }
      setShowExportMenu(false);
    } catch (err) {
      console.error("Export error:", err);
      alert("Ошибка при загрузке данных компании: " + err.message);
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

              {!isSentPath && act.status !== 'canceled' && act.docType && (
                <button className="btn btn--danger" onClick={handleCancelFormation}>
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
                  zIndex: 1000, minWidth: 200, marginTop: 5
                }}>
                  <div className="menu_item" style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={() => handleExport("Заявка")}>
                    📄 Экспорт как Заявка
                  </div>
                  <div className="menu_item" style={{ padding: '10px 15px', cursor: 'pointer' }} onClick={() => handleExport(act.docType)}>
                    🚛 Экспорт как {act.docType.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

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
                  <div className="field">
                    <div className="label">Марка автомобиля</div>
                    <input value={docAttrs.vehicleModel} onChange={e => setDocAttrs({...docAttrs, vehicleModel: e.target.value})} placeholder="Volvo" />
                  </div>
                  <div className="field">
                    <div className="label">Госномер автомобиля</div>
                    <input value={docAttrs.vehicleNumber} onChange={e => setDocAttrs({...docAttrs, vehicleNumber: e.target.value})} placeholder="016ACT02" />
                  </div>
                  <div className="field">
                    <div className="label">Водитель (Ф.И.О.)</div>
                    <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
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
                <div className="v" style={{ fontSize: '0.85em', color: 'var(--accent)', fontWeight: 700 }}>
                  (сумма страховки: {act.cargoValue})
                </div>
              )}
          </div>
          <div className="summary_item">
    <div className="label">Сумма</div>
    <div className="v">{act.totalSum || "—"}</div>
</div>
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
                        <th style={{ width: 120 }}>Цена</th>
                        <th style={{ width: 120 }}>Сумма</th>
                    </tr>
                </thead>
                <tbody>
                    {act.warehouseServices.map((s, idx) => (
                        <tr key={s.id || idx}>
                            <td>{idx + 1}</td>
                            <td>{s.name || "—"}</td>
                            <td>{s.qty}</td>
                            <td>{s.price?.toLocaleString()}</td>
                            <td style={{ fontWeight: 700 }}>{s.total?.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot style={{ background: '#f9f9f9' }}>
                    <tr style={{ fontWeight: 700 }}>
                        <td colSpan={2} style={{ textAlign: 'right' }}>Итого:</td>
                        <td>{act.warehouseServices.reduce((acc, s) => acc + (parseFloat(s.qty) || 0), 0)}</td>
                        <td></td>
                        <td style={{ fontWeight: 900 }}>
                          {act.warehouseServices.reduce((acc, s) => acc + (s.total || 0), 0).toLocaleString()}
                        </td>
                    </tr>
                </tfoot>
             </table>
          </div>
        </div>
      )}
    </>
  );
}