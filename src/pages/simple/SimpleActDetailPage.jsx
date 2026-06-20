// import React, { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { api } from "../../shared/api/api.js";

// function formatDate(val) {
//   if (!val) return "—";
//   const d = new Date(val);
//   if (isNaN(d.getTime())) return val;
//   return d.toLocaleDateString("ru");
// }

// function escapeHtml(str) {
//   if (str === null || str === undefined) return "";
//   return String(str)
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#39;");
// }

// export default function SimpleActDetailPage() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [act, setAct] = useState(null);
//   const [company, setCompany] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!id || id === 'new') {
//       setLoading(false);
//       return;
//     }
//     api.requests.get(id).then(async (data) => {
//       let details = {};
//       if (data.details) try { details = typeof data.details === "string" ? JSON.parse(data.details) : data.details; } catch(e) {}
//       setAct({
//         ...data,
//         customer: details.customer || data.customer,
//         receiver: details.receiver || data.receiver,
//         route: details.route || data.route,
//         cargoText: details.cargoText || data.cargoText || "",
//         totals: details.totals || data.totals || {},
//         totalSum: data.totalSum || details.totalSum || "",
//         docNumber: details.docNumber || data.docNumber || data.id?.slice(0,8),
//         transportType: details.transportType || data.transportType || "auto_console",
//       });

//       if (data.companyId) {
//         try {
//           const comp = await api.companies.get(data.companyId);
//           setCompany(comp);
//         } catch (e) {
//           console.warn("Не удалось загрузить компанию:", e);
//         }
//       }
//     }).catch(e => {
//       alert("Ошибка: " + e.message);
//     }).finally(() => setLoading(false));
//   }, [id]);

//   // 🆕 Печать наклейки (на груз) — частные лица
//   // ТЗ v3: убран адрес/телефон компании, оставлены только логотип + название ИП
//   // Формат увеличен до 100×150мм, без URL/дат при печати
//   const printLabel = async () => {
//     if (!act) return;

//     // 🆕 Если компания ещё не загрузилась — дозагружаем СИНХРОННО, чтобы лого было правильное
//     let comp = company;
//     if (!comp && act.companyId) {
//       try {
//         comp = await api.companies.get(act.companyId);
//         setCompany(comp);
//       } catch (e) {
//         console.warn("Не удалось загрузить компанию для печати:", e);
//       }
//     }
//     if (!comp) {
//       alert("Дождитесь загрузки данных компании и попробуйте ещё раз");
//       return;
//     }

//     const qrData = `TASU-${act.docNumber}-${act.route?.toCity || ""}-${act.receiver?.fio || ""}`;
//     const { toDataURL } = await import("qrcode");
//     const qrUrl = await toDataURL(qrData, { width: 140, margin: 1 });

//     const logoSrc = comp?.logo || "";
//     const companyName = comp?.name || "";

//     // Если логотипа нет — делаем заглушку из инициалов/первых букв названия ИП
//     const logoFallbackInitials = (() => {
//       if (!companyName) return "TASU";
//       const cleaned = companyName.replace(/ТОО|ИП|OOO|LLP/gi, "").trim();
//       return cleaned.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || cleaned.slice(0, 4).toUpperCase();
//     })();

//     const receiverFio = act.receiver?.fio || "";
//     const receiverCompany = act.receiver?.companyName || "";
//     const receiverDisplay = receiverCompany && receiverFio
//       ? `${receiverCompany}, ${receiverFio}`
//       : (receiverCompany || receiverFio || "—");

//     const routeFull = act.route?.fromCity && act.route?.toCity
//       ? `${act.route.fromCity} → ${act.route.toCity}`
//       : (act.route?.toCity || "—");

//     const label = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Наклейка</title>
// <style>
//   @page { size: 100mm 150mm; margin: 0; }
//   @media print { body { margin: 0; } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
//   body { font-family: Arial, sans-serif; margin: 0; padding: 8px; background: white; }
//   .label { border: 2px solid #222; width: 380px; font-size: 13px; border-radius: 4px; overflow: hidden; }
//   .header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 2px solid #222; gap: 10px; }
//   .logo img { max-height: 50px; max-width: 130px; object-fit: contain; }
//   .logo-text { font-weight: 900; color: #222; font-size: 22px; letter-spacing: 1px; padding: 4px 10px; border: 2px solid #222; border-radius: 6px; background: #f5f5f5; }
//   .company-name { font-weight: 900; color: #222; font-size: 14px; text-align: right; flex: 1; }
//   .cities { display: flex; border-bottom: 1px solid #222; }
//   .city-from { flex: 1; padding: 8px 10px; border-right: 1px solid #222; background: #f9f9f9; }
//   .city-to { flex: 2; padding: 8px 10px; background: #fff3cd; text-align: center; }
//   .city-label { font-size: 10px; color: #888; margin-bottom: 3px; text-transform: uppercase; }
//   .city-val { font-size: 13px; font-weight: 700; }
//   .city-big { font-size: 28px; font-weight: 900; color: #333; }
//   .direction-row { padding: 8px 12px; border-bottom: 1px solid #222; background: #f0f7ff; text-align: center; }
//   .direction-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 3px; }
//   .direction-val { font-size: 14px; font-weight: 700; color: #0050b3; }
//   .info-row { display: flex; border-bottom: 1px solid #222; }
//   .info-cell { flex: 1; padding: 7px 10px; border-right: 1px solid #ddd; }
//   .info-cell:last-child { border-right: none; }
//   .info-label { font-size: 10px; color: #888; margin-bottom: 3px; text-transform: uppercase; }
//   .info-val { font-weight: 700; font-size: 15px; }
//   .num-row { padding: 10px 12px; border-bottom: 1px solid #222; background: #222; color: #fff; font-size: 17px; font-weight: 900; text-align: center; letter-spacing: 3px; }
//   .receiver-block { padding: 12px; border-bottom: 1px solid #222; text-align: center; }
//   .receiver-label { font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
//   .receiver-name { font-size: 17px; font-weight: 900; color: #111; line-height: 1.3; }
//   .qr-block { padding: 12px; text-align: center; }
// </style></head><body>
// <div class="label">
//   <div class="header">
//     <div class="logo">${logoSrc ? `<img src="${escapeHtml(logoSrc)}" alt="Logo"/>` : `<div class="logo-text">${escapeHtml(logoFallbackInitials)}</div>`}</div>
//   </div>
//   <div class="cities">
//     <div class="city-from">
//       <div class="city-label">город отправителя</div>
//       <div class="city-val">${escapeHtml(act.route?.fromCity || "—")}</div>
//     </div>
//     <div class="city-to">
//       <div class="city-label">город получателя</div>
//       <div class="city-big">${escapeHtml(act.route?.toCity || "—")}</div>
//     </div>
//   </div>
//   <div class="direction-row">
//     <div class="direction-label">Номер направления</div>
//     <div class="direction-val">${escapeHtml(routeFull)}</div>
//   </div>
//   <div class="info-row">
//     <div class="info-cell"><div class="info-label">мест</div><div class="info-val">${escapeHtml(String(act.totals?.seats || "—"))}</div></div>
//     <div class="info-cell"><div class="info-label">вес</div><div class="info-val">${act.totals?.weight ? escapeHtml(String(act.totals.weight)) + " кг" : "—"}</div></div>
//   </div>
//   <div class="num-row">№ ${escapeHtml(act.docNumber || "")}</div>
//   <div class="receiver-block">
//     <div class="receiver-label">получатель</div>
//     <div class="receiver-name">${escapeHtml(receiverDisplay)}</div>
//   </div>
//   <div class="qr-block">
//     <img src="${qrUrl}" alt="QR" style="width:120px;height:120px;display:block;margin:0 auto;"/>
//   </div>
// </div>
// <script>window.onload=function(){window.print();}</script>
// </body></html>`;

//     const blob = new Blob([label], { type: "text/html; charset=utf-8" });
//     window.open(URL.createObjectURL(blob), "_blank");
//   };

//   // ТЗ v2.2: ЧЕК для клиента — компактный формат по образцу, 2 копии на странице
//   const printReceipt = async () => {
//     if (!act) return;

//     // 🆕 Дожидаемся загрузки компании, иначе на чеке будет пусто
//     let comp = company;
//     if (!comp && act.companyId) {
//       try {
//         comp = await api.companies.get(act.companyId);
//         setCompany(comp);
//       } catch (e) {
//         console.warn("Не удалось загрузить компанию для печати чека:", e);
//       }
//     }
//     if (!comp) {
//       alert("Дождитесь загрузки данных компании и попробуйте ещё раз");
//       return;
//     }

//     const now = new Date();
//     const pad = (n) => String(n).padStart(2, '0');
//     const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

//     const companyName = comp?.name || "";
//     const companyBin = comp?.bin || "";
//     const companyPhones = (comp?.phone || "")
//       .split(/[,\n;]/)
//       .map(s => s.trim())
//       .filter(Boolean);

//     const docNum = act.docNumber || act.number || "—";
//     const senderFio = act.customer?.fio || "—";
//     const senderPhone = act.customer?.phone || "";
//     const receiverFio = act.receiver?.fio || "—";
//     const receiverPhone = act.receiver?.phone || "";
//     const toCity = act.route?.toCity || "—";
//     const seats = act.totals?.seats || "—";
//     const weight = act.totals?.weight ? `${act.totals.weight} кг` : "—";
//     const sum = act.totalSum ? Number(act.totalSum).toLocaleString() : "—";

//     const tt = act.transportType || act.docAttrs?.transportType;
//     const transportLabel =
//       tt === 'plane' ? 'Авиа' :
//       tt === 'train' ? 'Поезд' :
//       tt === 'avia_console' ? 'Авиа' :
//       'Авто';

//     const paymentLabel = "ОПЛАТА ПОЛУЧАТЕЛЕМ";
//     const userName = act.user?.name || act.creator?.name || act.createdByName || "";

//     const receiptBlock = `
// <div class="receipt">
//   <div class="row"><strong>${escapeHtml(companyName)}</strong></div>
//   ${companyBin ? `<div class="row">ИИН/БИН: ${escapeHtml(companyBin)}</div>` : ''}
//   <div class="row"><strong>№${escapeHtml(docNum)}</strong></div>
//   <div class="sep">- - - - - - - - - - - - - - - - - -</div>
//   <div class="row">Отпр: ${escapeHtml(senderFio)}${senderPhone ? ' ' + escapeHtml(senderPhone) : ''}</div>
//   <div class="row">Получ: ${escapeHtml(receiverFio)}${receiverPhone ? ' ' + escapeHtml(receiverPhone) : ''}</div>
//   <div class="row">Направление: ${escapeHtml(toCity)}</div>
//   <div class="sep">- - - - - - - - - - - - - - - - - -</div>
//   <div class="row">Перевозка: ${escapeHtml(transportLabel)}</div>
//   <div class="row">Мест: ${escapeHtml(String(seats))} | Вес: ${escapeHtml(String(weight))}</div>
//   <div class="row"><strong>Итого: ${escapeHtml(String(sum))} тг</strong></div>
//   <div class="row">Дата: ${escapeHtml(dateStr)}</div>
//   <div class="sep">- - - - - - - - - - - - - - - - - -</div>
//   <div class="row"><strong>${escapeHtml(paymentLabel)}</strong></div>
//   <div class="row">подпись: _______________</div>
//   ${companyPhones.length > 0 ? `<div class="row">Тел: ${escapeHtml(companyPhones.join(', '))}</div>` : ''}
// </div>`;

//     const html = `<!DOCTYPE html>
// <html><head><meta charset="utf-8">
// <title>Чек №${escapeHtml(docNum)}</title>
// <style>
// @page { size: 70mm auto; margin: 0; }
//   @media print { body { margin: 0; } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
//   body { font-family: 'Courier New', monospace; padding: 4px; max-width: 280px; margin: 0 auto; color: #000; background: #fff; font-size: 11px; line-height: 1.25; font-weight: 700; }
//   .receipt { padding: 4px 2px; margin-bottom: 8px; border-bottom: 1px dashed #000; }
//   .receipt:last-child { border-bottom: none; }
//   .row { margin: 0; word-wrap: break-word; font-weight: 700; }
//   .sep { color: #000; margin: 2px 0; font-weight: 700; }
//   .space { height: 4px; }
//   strong { font-weight: 900; }
// </style>
// </head><body>
// ${receiptBlock}
// ${receiptBlock}
// <script>window.onload = () => { window.print(); }</script>
// </body></html>`;

//     const blob = new Blob([html], { type: "text/html; charset=utf-8" });
//     window.open(URL.createObjectURL(blob), "_blank");
//   };

//   if (loading) return <div style={{ padding: 32 }}>Загрузка...</div>;
//   if (!act) return <div style={{ padding: 32 }}>Накладная не найдена</div>;

//   const receiverDisplay = act.receiver?.companyName && act.receiver?.fio
//     ? `${act.receiver.companyName}, ${act.receiver.fio}`
//     : (act.receiver?.companyName || act.receiver?.fio || "—");

//   const customerDisplay = act.customer?.companyName && act.customer?.fio
//     ? `${act.customer.companyName}, ${act.customer.fio}`
//     : (act.customer?.companyName || act.customer?.fio || "—");

//   const isPrivate = act.type === "SIMPLE" || act.isSimple;

//   return (
//     <>
//       <div className="navbar">
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <h1>Накладная №{act.docNumber}</h1>
//           <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
//         </div>
//         <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
//           <button className="btn" onClick={printLabel}>🏷️ Наклейка</button>
//           <button className="btn btn--accent" onClick={printReceipt} style={{ background: "#fa8c16", borderColor: "#fa8c16" }}>
//             🧾 Чек
//           </button>
//           <button className="btn" onClick={() => navigate("/simple")}>← Назад</button>
//         </div>
//       </div>

//       <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
//         <div className="card" style={{ flex: 1, minWidth: 280 }}>
//           <div className="card_head"><div className="card_title">Отправитель</div></div>
//           <div className="card_body">
//             <div className="field"><div className="label">ФИО / Компания</div><div>{customerDisplay}</div></div>
//             <div className="field"><div className="label">Телефон</div><div>{act.customer?.phone || "—"}</div></div>
//             <div className="field"><div className="label">Город</div><div>{act.route?.fromCity || "—"}</div></div>
//           </div>
//         </div>

//         <div className="card" style={{ flex: 1, minWidth: 280 }}>
//           <div className="card_head"><div className="card_title">Получатель</div></div>
//           <div className="card_body">
//             <div className="field"><div className="label">ФИО / Компания</div><div>{receiverDisplay}</div></div>
//             <div className="field"><div className="label">Телефон</div><div>{act.receiver?.phone || "—"}</div></div>
//             <div className="field"><div className="label">Город</div><div>{act.route?.toCity || "—"}</div></div>
//           </div>
//         </div>

//         <div className="card" style={{ flex: 1, minWidth: 280 }}>
//           <div className="card_head"><div className="card_title">Груз</div></div>
//           <div className="card_body">
//             <div className="field"><div className="label">Мест</div><div>{act.totals?.seats || "—"}</div></div>
//             <div className="field"><div className="label">Вес</div><div>{act.totals?.weight ? `${act.totals.weight} кг` : "—"}</div></div>
//             <div className="field"><div className="label">Характер груза</div><div>{act.cargoText || "—"}</div></div>
//             {!isPrivate && (
//               <div className="field">
//                 <div className="label">Сумма</div>
//                 <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
//                   {act.totalSum ? `${Number(act.totalSum).toLocaleString()} тг` : "—"}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       <div className="card" style={{ marginTop: 16 }}>
//         <div className="card_head"><div className="card_title">Информация</div></div>
//         <div className="card_body">
//           <div className="form_grid">
//             <div className="field"><div className="label">Номер накладной</div><div>{act.docNumber || "—"}</div></div>
//             <div className="field"><div className="label">Дата</div><div>{formatDate(act.createdAt || act.date)}</div></div>
//             <div className="field"><div className="label">Статус</div><div>{act.status === "act" ? "В стоке" : act.status === "sent" ? "Подано" : act.status === "done" ? "Отработано" : act.status}</div></div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }


import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../shared/api/api.js";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("ru");
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function SimpleActDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [act, setAct] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Режим редактирования
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }
    api.requests.get(id).then(async (data) => {
      let details = {};
      if (data.details) try { details = typeof data.details === "string" ? JSON.parse(data.details) : data.details; } catch(e) {}
      setAct({
        ...data,
        customer: details.customer || data.customer,
        receiver: details.receiver || data.receiver,
        route: details.route || data.route,
        cargoText: details.cargoText || data.cargoText || "",
        totals: details.totals || data.totals || {},
        totalSum: data.totalSum || details.totalSum || "",
        docNumber: details.docNumber || data.docNumber || data.id?.slice(0,8),
        transportType: details.transportType || data.transportType || "auto_console",
      });

      if (data.companyId) {
        try {
          const comp = await api.companies.get(data.companyId);
          setCompany(comp);
        } catch (e) {
          console.warn("Не удалось загрузить компанию:", e);
        }
      }
    }).catch(e => {
      alert("Ошибка: " + e.message);
    }).finally(() => setLoading(false));
  }, [id]);

  // Войти в режим редактирования — заполняем форму из act
  const startEdit = () => {
    setForm({
      senderName: act.customer?.fio || "",
      senderPhone: act.customer?.phone || "",
      senderCompany: act.customer?.companyName || "",
      fromCity: act.route?.fromCity || "",
      receiverName: act.receiver?.fio || "",
      receiverPhone: act.receiver?.phone || "",
      receiverCompany: act.receiver?.companyName || "",
      toCity: act.route?.toCity || "",
      seats: act.totals?.seats ?? "",
      weight: act.totals?.weight ?? "",
      cargoText: act.cargoText || "",
      totalSum: act.totalSum || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
  };

  // Сохранить изменения — собираем details заново и шлём update
  const saveEdit = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const newDetails = {
        isSimple: true,
        transportType: act.transportType || "auto_console",
        customer: { fio: form.senderName, phone: form.senderPhone, companyName: form.senderCompany },
        receiver: { fio: form.receiverName, phone: form.receiverPhone, companyName: form.receiverCompany },
        route: { fromCity: form.fromCity, toCity: form.toCity },
        cargoText: form.cargoText,
        totals: { seats: Number(form.seats) || 0, weight: Number(form.weight) || 0 },
        totalSum: form.totalSum,
        docNumber: act.docNumber,
      };

      await api.requests.update(act.id, {
        details: JSON.stringify(newDetails),
        totalSum: form.totalSum ? String(form.totalSum) : "",
      });

      // Обновляем локальное состояние
      setAct(prev => ({
        ...prev,
        customer: newDetails.customer,
        receiver: newDetails.receiver,
        route: newDetails.route,
        cargoText: newDetails.cargoText,
        totals: newDetails.totals,
        totalSum: newDetails.totalSum,
      }));
      setEditing(false);
      setForm(null);
      alert("Сохранено");
    } catch (e) {
      alert("Ошибка сохранения: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Печать наклейки (на груз) — частные лица
  const printLabel = async () => {
    if (!act) return;

    let comp = company;
    if (!comp && act.companyId) {
      try {
        comp = await api.companies.get(act.companyId);
        setCompany(comp);
      } catch (e) {
        console.warn("Не удалось загрузить компанию для печати:", e);
      }
    }
    if (!comp) {
      alert("Дождитесь загрузки данных компании и попробуйте ещё раз");
      return;
    }

    const qrData = `TASU-${act.docNumber}-${act.route?.toCity || ""}-${act.receiver?.fio || ""}`;
    const { toDataURL } = await import("qrcode");
    const qrUrl = await toDataURL(qrData, { width: 140, margin: 1 });

    const logoSrc = comp?.logo || "";
    const companyName = comp?.name || "";

    const logoFallbackInitials = (() => {
      if (!companyName) return "TASU";
      const cleaned = companyName.replace(/ТОО|ИП|OOO|LLP/gi, "").trim();
      return cleaned.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || cleaned.slice(0, 4).toUpperCase();
    })();

    const receiverFio = act.receiver?.fio || "";
    const receiverCompany = act.receiver?.companyName || "";
    const receiverDisplay = receiverCompany && receiverFio
      ? `${receiverCompany}, ${receiverFio}`
      : (receiverCompany || receiverFio || "—");

    const routeFull = act.route?.fromCity && act.route?.toCity
      ? `${act.route.fromCity} → ${act.route.toCity}`
      : (act.route?.toCity || "—");

    const label = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Наклейка</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  @media print { body { margin: 0; } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: Arial, sans-serif; margin: 0; padding: 8px; background: white; }
  .label { border: 2px solid #222; width: 380px; font-size: 13px; border-radius: 4px; overflow: hidden; }
  .header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 2px solid #222; gap: 10px; }
  .logo img { max-height: 50px; max-width: 130px; object-fit: contain; }
  .logo-text { font-weight: 900; color: #222; font-size: 22px; letter-spacing: 1px; padding: 4px 10px; border: 2px solid #222; border-radius: 6px; background: #f5f5f5; }
  .cities { display: flex; border-bottom: 1px solid #222; }
  .city-from { flex: 1; padding: 8px 10px; border-right: 1px solid #222; background: #f9f9f9; }
  .city-to { flex: 2; padding: 8px 10px; background: #fff3cd; text-align: center; }
  .city-label { font-size: 10px; color: #888; margin-bottom: 3px; text-transform: uppercase; }
  .city-val { font-size: 13px; font-weight: 700; }
  .city-big { font-size: 28px; font-weight: 900; color: #333; }
  .direction-row { padding: 8px 12px; border-bottom: 1px solid #222; background: #f0f7ff; text-align: center; }
  .direction-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 3px; }
  .direction-val { font-size: 14px; font-weight: 700; color: #0050b3; }
  .info-row { display: flex; border-bottom: 1px solid #222; }
  .info-cell { flex: 1; padding: 7px 10px; border-right: 1px solid #ddd; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-size: 10px; color: #888; margin-bottom: 3px; text-transform: uppercase; }
  .info-val { font-weight: 700; font-size: 15px; }
  .num-row { padding: 10px 12px; border-bottom: 1px solid #222; background: #222; color: #fff; font-size: 17px; font-weight: 900; text-align: center; letter-spacing: 3px; }
  .receiver-block { padding: 12px; border-bottom: 1px solid #222; text-align: center; }
  .receiver-label { font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
  .receiver-name { font-size: 17px; font-weight: 900; color: #111; line-height: 1.3; }
  .qr-block { padding: 12px; text-align: center; }
</style></head><body>
<div class="label">
  <div class="header">
    <div class="logo">${logoSrc ? `<img src="${escapeHtml(logoSrc)}" alt="Logo"/>` : `<div class="logo-text">${escapeHtml(logoFallbackInitials)}</div>`}</div>
  </div>
  <div class="cities">
    <div class="city-from">
      <div class="city-label">город отправителя</div>
      <div class="city-val">${escapeHtml(act.route?.fromCity || "—")}</div>
    </div>
    <div class="city-to">
      <div class="city-label">город получателя</div>
      <div class="city-big">${escapeHtml(act.route?.toCity || "—")}</div>
    </div>
  </div>
  <div class="direction-row">
    <div class="direction-label">Номер направления</div>
    <div class="direction-val">${escapeHtml(routeFull)}</div>
  </div>
  <div class="info-row">
    <div class="info-cell"><div class="info-label">мест</div><div class="info-val">${escapeHtml(String(act.totals?.seats || "—"))}</div></div>
    <div class="info-cell"><div class="info-label">вес</div><div class="info-val">${act.totals?.weight ? escapeHtml(String(act.totals.weight)) + " кг" : "—"}</div></div>
  </div>
  <div class="num-row">№ ${escapeHtml(act.docNumber || "")}</div>
  <div class="receiver-block">
    <div class="receiver-label">получатель</div>
    <div class="receiver-name">${escapeHtml(receiverDisplay)}</div>
  </div>
  <div class="qr-block">
    <img src="${qrUrl}" alt="QR" style="width:120px;height:120px;display:block;margin:0 auto;"/>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    const blob = new Blob([label], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  // Чек для клиента — компактный формат, 2 копии на странице
  const printReceipt = async () => {
    if (!act) return;

    let comp = company;
    if (!comp && act.companyId) {
      try {
        comp = await api.companies.get(act.companyId);
        setCompany(comp);
      } catch (e) {
        console.warn("Не удалось загрузить компанию для печати чека:", e);
      }
    }
    if (!comp) {
      alert("Дождитесь загрузки данных компании и попробуйте ещё раз");
      return;
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const companyName = comp?.name || "";
    const companyBin = comp?.bin || "";
    const companyPhones = (comp?.phone || "")
      .split(/[,\n;]/)
      .map(s => s.trim())
      .filter(Boolean);

    const docNum = act.docNumber || act.number || "—";
    const senderFio = act.customer?.fio || "—";
    const senderPhone = act.customer?.phone || "";
    const receiverFio = act.receiver?.fio || "—";
    const receiverPhone = act.receiver?.phone || "";
    const toCity = act.route?.toCity || "—";
    const seats = act.totals?.seats || "—";
    const weight = act.totals?.weight ? `${act.totals.weight} кг` : "—";
    const sum = act.totalSum ? Number(act.totalSum).toLocaleString() : "—";

    const tt = act.transportType || act.docAttrs?.transportType;
    const transportLabel =
      tt === 'plane' ? 'Авиа' :
      tt === 'train' ? 'Поезд' :
      tt === 'avia_console' ? 'Авиа' :
      'Авто';

    const paymentLabel = "ОПЛАТА ПОЛУЧАТЕЛЕМ";

    const receiptBlock = `
<div class="receipt">
  <div class="row"><strong>${escapeHtml(companyName)}</strong></div>
  ${companyBin ? `<div class="row">БИН: ${escapeHtml(companyBin)}</div>` : ''}
  <div class="row"><strong>№${escapeHtml(docNum)}</strong></div>
  <div class="sep">- - - - - - - - - - - - - - - - - -</div>
  <div class="row">Отпр: ${escapeHtml(senderFio)}${senderPhone ? ' ' + escapeHtml(senderPhone) : ''}</div>
  <div class="row">Получ: ${escapeHtml(receiverFio)}${receiverPhone ? ' ' + escapeHtml(receiverPhone) : ''}</div>
  <div class="row">Направление: ${escapeHtml(toCity)}</div>
  <div class="sep">- - - - - - - - - - - - - - - - - -</div>
  <div class="row">Перевозка: ${escapeHtml(transportLabel)}</div>
  <div class="row">Мест: ${escapeHtml(String(seats))} | Вес: ${escapeHtml(String(weight))}</div>
  <div class="row"><strong>Итого: ${escapeHtml(String(sum))} тг</strong></div>
  <div class="row">Дата: ${escapeHtml(dateStr)}</div>
  <div class="sep">- - - - - - - - - - - - - - - - - -</div>
  <div class="row"><strong>${escapeHtml(paymentLabel)}</strong></div>
  <div class="row">подпись: _______________</div>
  ${companyPhones.length > 0 ? `<div class="row">Тел: ${escapeHtml(companyPhones.join(', '))}</div>` : ''}
</div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Чек №${escapeHtml(docNum)}</title>
<style>
@page { size: 70mm auto; margin: 0; }
  @media print { body { margin: 0; } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: 'Courier New', monospace; padding: 4px; max-width: 280px; margin: 0 auto; color: #000; background: #fff; font-size: 11px; line-height: 1.25; font-weight: 700; }
  .receipt { padding: 4px 2px; margin-bottom: 8px; border-bottom: 1px dashed #000; }
  .receipt:last-child { border-bottom: none; }
  .row { margin: 0; word-wrap: break-word; font-weight: 700; }
  .sep { color: #000; margin: 2px 0; font-weight: 700; }
  strong { font-weight: 900; }
</style>
</head><body>
${receiptBlock}
${receiptBlock}
<script>window.onload = () => { window.print(); }</script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  if (loading) return <div style={{ padding: 32 }}>Загрузка...</div>;
  if (!act) return <div style={{ padding: 32 }}>Накладная не найдена</div>;

  const receiverDisplay = act.receiver?.companyName && act.receiver?.fio
    ? `${act.receiver.companyName}, ${act.receiver.fio}`
    : (act.receiver?.companyName || act.receiver?.fio || "—");

  const customerDisplay = act.customer?.companyName && act.customer?.fio
    ? `${act.customer.companyName}, ${act.customer.fio}`
    : (act.customer?.companyName || act.customer?.fio || "—");

  const isPrivate = act.type === "SIMPLE" || act.isSimple;

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Накладная №{act.docNumber}</h1>
          <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!editing && (
            <button className="btn btn--accent" onClick={startEdit}>✏️ Редактировать</button>
          )}
          {editing && (
            <>
              <button className="btn btn--accent" onClick={saveEdit} disabled={saving} style={{ background: "#52c41a", borderColor: "#52c41a" }}>
                {saving ? "Сохранение..." : "💾 Сохранить"}
              </button>
              <button className="btn" onClick={cancelEdit} disabled={saving}>Отмена</button>
            </>
          )}
          <button className="btn" onClick={printLabel}>🏷️ Наклейка</button>
          <button className="btn btn--accent" onClick={printReceipt} style={{ background: "#fa8c16", borderColor: "#fa8c16" }}>
            🧾 Чек
          </button>
          <button className="btn" onClick={() => navigate("/simple")}>← Назад</button>
        </div>
      </div>

      {editing ? (
        <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: 1, minWidth: 280 }}>
            <div className="card_head"><div className="card_title">Отправитель</div></div>
            <div className="card_body">
              <div className="field"><div className="label">ФИО</div><input value={form.senderName} onChange={e => setForm({...form, senderName: e.target.value})} /></div>
              <div className="field"><div className="label">Компания</div><input value={form.senderCompany} onChange={e => setForm({...form, senderCompany: e.target.value})} /></div>
              <div className="field"><div className="label">Телефон</div><input value={form.senderPhone} onChange={e => setForm({...form, senderPhone: e.target.value})} /></div>
              <div className="field"><div className="label">Город</div><input value={form.fromCity} onChange={e => setForm({...form, fromCity: e.target.value})} /></div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 280 }}>
            <div className="card_head"><div className="card_title">Получатель</div></div>
            <div className="card_body">
              <div className="field"><div className="label">ФИО</div><input value={form.receiverName} onChange={e => setForm({...form, receiverName: e.target.value})} /></div>
              <div className="field"><div className="label">Компания</div><input value={form.receiverCompany} onChange={e => setForm({...form, receiverCompany: e.target.value})} /></div>
              <div className="field"><div className="label">Телефон</div><input value={form.receiverPhone} onChange={e => setForm({...form, receiverPhone: e.target.value})} /></div>
              <div className="field"><div className="label">Город</div><input value={form.toCity} onChange={e => setForm({...form, toCity: e.target.value})} /></div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 280 }}>
            <div className="card_head"><div className="card_title">Груз</div></div>
            <div className="card_body">
              <div className="field"><div className="label">Мест</div><input type="number" value={form.seats} onChange={e => setForm({...form, seats: e.target.value})} /></div>
              <div className="field"><div className="label">Вес (кг)</div><input type="number" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} /></div>
              <div className="field"><div className="label">Характер груза</div><input value={form.cargoText} onChange={e => setForm({...form, cargoText: e.target.value})} /></div>
              <div className="field"><div className="label">Сумма (тг)</div><input type="number" value={form.totalSum} onChange={e => setForm({...form, totalSum: e.target.value})} /></div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: 1, minWidth: 280 }}>
            <div className="card_head"><div className="card_title">Отправитель</div></div>
            <div className="card_body">
              <div className="field"><div className="label">ФО / Компания</div><div>{customerDisplay}</div></div>
              <div className="field"><div className="label">Телефон</div><div>{act.customer?.phone || "—"}</div></div>
              <div className="field"><div className="label">Город</div><div>{act.route?.fromCity || "—"}</div></div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 280 }}>
            <div className="card_head"><div className="card_title">Получатель</div></div>
            <div className="card_body">
              <div className="field"><div className="label">ФО / Компания</div><div>{receiverDisplay}</div></div>
              <div className="field"><div className="label">Телефон</div><div>{act.receiver?.phone || "—"}</div></div>
              <div className="field"><div className="label">Город</div><div>{act.route?.toCity || "—"}</div></div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: 280 }}>
            <div className="card_head"><div className="card_title">Груз</div></div>
            <div className="card_body">
              <div className="field"><div className="label">Мест</div><div>{act.totals?.seats || "—"}</div></div>
              <div className="field"><div className="label">Вес</div><div>{act.totals?.weight ? `${act.totals.weight} кг` : "—"}</div></div>
              <div className="field"><div className="label">Характер груза</div><div>{act.cargoText || "—"}</div></div>
              {!isPrivate && (
                <div className="field">
                  <div className="label">Сумма</div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                    {act.totalSum ? `${Number(act.totalSum).toLocaleString()} тг` : "—"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head"><div className="card_title">Информация</div></div>
        <div className="card_body">
          <div className="form_grid">
            <div className="field"><div className="label">Номер накладной</div><div>{act.docNumber || "—"}</div></div>
            <div className="field"><div className="label">Дата</div><div>{formatDate(act.createdAt || act.date)}</div></div>
            <div className="field"><div className="label">Статус</div><div>{act.status === "act" ? "В стоке" : act.status === "sent" ? "Подано" : act.status === "done" ? "Отработано" : act.status}</div></div>
          </div>
        </div>
      </div>
    </>
  );
}