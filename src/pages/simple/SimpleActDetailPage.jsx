// // // import React, { useEffect, useState } from "react";
// // // import { useNavigate, useParams } from "react-router-dom";
// // // import { api } from "../../shared/api/api.js";

// // // function formatDate(val) {
// // //   if (!val) return "—";
// // //   const d = new Date(val);
// // //   if (isNaN(d.getTime())) return val;
// // //   return d.toLocaleDateString("ru");
// // // }

// // // export default function SimpleActDetailPage() {
// // //   const { id } = useParams();
// // //   const navigate = useNavigate();
// // //   const [act, setAct] = useState(null);
// // //   const [loading, setLoading] = useState(true);

// // //   useEffect(() => {
// // //     api.requests.get(id).then(data => {
// // //       let details = {};
// // //       if (data.details) try { details = typeof data.details === "string" ? JSON.parse(data.details) : data.details; } catch(e) {}
// // //       setAct({
// // //         ...data,
// // //         customer: details.customer || data.customer,
// // //         receiver: details.receiver || data.receiver,
// // //         route: details.route || data.route,
// // //         cargoText: details.cargoText || data.cargoText || "",
// // //         totals: details.totals || data.totals || {},
// // //         totalSum: data.totalSum || details.totalSum || "",
// // //         docNumber: details.docNumber || data.docNumber || data.id?.slice(0,8),
// // //       });
// // //     }).catch(e => {
// // //       alert("Ошибка: " + e.message);
// // //     }).finally(() => setLoading(false));
// // //   }, [id]);

// // //   const printLabel = async () => {
// // //     if (!act) return;
// // //     const qrData = `TASU-${act.docNumber}-${act.route?.toCity}-${act.receiver?.fio}`;
// // //     const { toDataURL } = await import("qrcode");
// // //     const qrUrl = await toDataURL(qrData, { width: 120, margin: 1 });

// // //     const label = `<!DOCTYPE html><html><head><meta charset="utf-8">
// // // <style>
// // //   @media print { body { margin: 0; } }
// // //   body { font-family: Arial, sans-serif; margin: 0; padding: 8px; background: white; }
// // //   .label { border: 2px solid #222; width: 320px; font-size: 12px; border-radius: 4px; overflow: hidden; }
// // //   .header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 2px solid #222; background: #fff; }
// // //   .logo img { height: 36px; }
// // //   .address { font-size: 9px; text-align: right; color: #444; line-height: 1.6; }
// // //   .cities { display: flex; border-bottom: 1px solid #222; }
// // //   .city-from { flex: 1; padding: 6px 8px; border-right: 1px solid #222; background: #f9f9f9; }
// // //   .city-to { flex: 2; padding: 6px 8px; background: #fff3cd; text-align: center; }
// // //   .city-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
// // //   .city-val { font-size: 11px; font-weight: 700; }
// // //   .city-big { font-size: 26px; font-weight: 900; color: #333; }
// // //   .info-row { display: flex; border-bottom: 1px solid #222; }
// // //   .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #ddd; }
// // //   .info-cell:last-child { border-right: none; }
// // //   .info-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
// // //   .info-val { font-weight: 700; font-size: 13px; }
// // //   .num-row { padding: 8px 10px; border-bottom: 1px solid #222; background: #222; color: #fff; font-size: 15px; font-weight: 900; text-align: center; letter-spacing: 3px; }
// // // </style></head><body>
// // // <div class="label">
// // //   <div class="header">
// // //     <div class="logo"><img src="https://tasu-test.vercel.app/images/logo.svg" alt="TASU"/></div>
// // //     <div class="address">г. Алматы, ул. Закарпатская 162<br/>Т: 8(727)499-02-22</div>
// // //   </div>
// // //   <div class="cities">
// // //     <div class="city-from">
// // //       <div class="city-label">город отправителя</div>
// // //       <div class="city-val">${act.route?.fromCity || "—"}</div>
// // //     </div>
// // //     <div class="city-to">
// // //       <div class="city-label">город получателя</div>
// // //       <div class="city-big">${act.route?.toCity || "—"}</div>
// // //     </div>
// // //   </div>
// // //   <div class="info-row">
// // //     <div class="info-cell"><div class="info-label">мест</div><div class="info-val">${act.totals?.seats || "—"}</div></div>
// // //     <div class="info-cell"><div class="info-label">вес</div><div class="info-val">${act.totals?.weight ? act.totals.weight + " кг" : "—"}</div></div>
// // //     <div class="info-cell"><div class="info-label">сумма</div><div class="info-val">${act.totalSum ? Number(act.totalSum).toLocaleString() + " тг" : "—"}</div></div>
// // //   </div>
// // //   <div class="num-row">№ ${act.docNumber}</div>
// // //   <div style="padding:10px;border-bottom:1px solid #222;text-align:center;">
// // //     <div style="font-size:9px;color:#888;text-transform:uppercase;margin-bottom:4px;">получатель</div>
// // //     <div style="font-size:18px;font-weight:900;">${act.receiver?.fio?.split(" ")[0] || "—"}</div>
// // //   </div>
// // //   <div style="padding:12px;text-align:center;">
// // //     <img src="${qrUrl}" alt="QR" style="width:100px;height:100px;display:block;margin:0 auto;"/>
// // //   </div>
// // // </div>
// // // <script>window.onload=function(){window.print();}</script>
// // // </body></html>`;

// // //     const blob = new Blob([label], { type: "text/html; charset=utf-8" });
// // //     window.open(URL.createObjectURL(blob), "_blank");
// // //   };

// // //   if (loading) return <div style={{ padding: 32 }}>Загрузка...</div>;
// // //   if (!act) return <div style={{ padding: 32 }}>Накладная не найдена</div>;

// // //   return (
// // //     <>
// // //       <div className="navbar">
// // //         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
// // //           <h1>Накладная №{act.docNumber}</h1>
// // //           <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
// // //         </div>
// // //         <div style={{ display: "flex", gap: 10 }}>
// // //           <button className="btn" onClick={printLabel}>🏷️ Печать наклейки</button>
// // //           <button className="btn" onClick={() => navigate("/simple")}>← Назад</button>
// // //         </div>
// // //       </div>

// // //       <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
// // //         <div className="card" style={{ flex: 1, minWidth: 280 }}>
// // //           <div className="card_head"><div className="card_title">Отправитель</div></div>
// // //           <div className="card_body">
// // //             <div className="field"><div className="label">ФИО</div><div>{act.customer?.fio || "—"}</div></div>
// // //             <div className="field"><div className="label">Телефон</div><div>{act.customer?.phone || "—"}</div></div>
// // //             <div className="field"><div className="label">Город</div><div>{act.route?.fromCity || "—"}</div></div>
// // //           </div>
// // //         </div>

// // //         <div className="card" style={{ flex: 1, minWidth: 280 }}>
// // //           <div className="card_head"><div className="card_title">Получатель</div></div>
// // //           <div className="card_body">
// // //             <div className="field"><div className="label">ФИО</div><div>{act.receiver?.fio || "—"}</div></div>
// // //             <div className="field"><div className="label">Телефон</div><div>{act.receiver?.phone || "—"}</div></div>
// // //             <div className="field"><div className="label">Город</div><div>{act.route?.toCity || "—"}</div></div>
// // //           </div>
// // //         </div>

// // //         <div className="card" style={{ flex: 1, minWidth: 280 }}>
// // //           <div className="card_head"><div className="card_title">Груз</div></div>
// // //           <div className="card_body">
// // //             <div className="field"><div className="label">Мест</div><div>{act.totals?.seats || "—"}</div></div>
// // //             <div className="field"><div className="label">Вес</div><div>{act.totals?.weight ? `${act.totals.weight} кг` : "—"}</div></div>
// // //             <div className="field"><div className="label">Характер груза</div><div>{act.cargoText || "—"}</div></div>
// // //             <div className="field"><div className="label">Сумма</div><div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{act.totalSum ? `${Number(act.totalSum).toLocaleString()} тг` : "—"}</div></div>
// // //           </div>
// // //         </div>
// // //       </div>

// // //       <div className="card" style={{ marginTop: 16 }}>
// // //         <div className="card_head"><div className="card_title">Информация</div></div>
// // //         <div className="card_body">
// // //           <div className="form_grid">
// // //             <div className="field"><div className="label">Номер накладной</div><div>{act.docNumber || "—"}</div></div>
// // //             <div className="field"><div className="label">Дата</div><div>{formatDate(act.createdAt || act.date)}</div></div>
// // //             <div className="field"><div className="label">Статус</div><div>{act.status === "act" ? "В стоке" : act.status === "sent" ? "Подано" : act.status === "done" ? "Отработано" : act.status}</div></div>
// // //           </div>
// // //         </div>
// // //       </div>
// // //     </>
// // //   );
// // // }


// // import React, { useEffect, useState } from "react";
// // import { useNavigate, useParams } from "react-router-dom";
// // import { api } from "../../shared/api/api.js";

// // function formatDate(val) {
// //   if (!val) return "—";
// //   const d = new Date(val);
// //   if (isNaN(d.getTime())) return val;
// //   return d.toLocaleDateString("ru");
// // }

// // /**
// //  * HTML-escape для безопасной подстановки в шаблон наклейки.
// //  * Нужен чтобы ФИО типа "О'Коннор" или "<script>" не ломали верстку.
// //  */
// // function escapeHtml(str) {
// //   if (str === null || str === undefined) return "";
// //   return String(str)
// //     .replace(/&/g, "&amp;")
// //     .replace(/</g, "&lt;")
// //     .replace(/>/g, "&gt;")
// //     .replace(/"/g, "&quot;")
// //     .replace(/'/g, "&#39;");
// // }

// // export default function SimpleActDetailPage() {
// //   const { id } = useParams();
// //   const navigate = useNavigate();
// //   const [act, setAct] = useState(null);
// //   const [company, setCompany] = useState(null);
// //   const [loading, setLoading] = useState(true);

// //   useEffect(() => {
// //     api.requests.get(id).then(async (data) => {
// //       let details = {};
// //       if (data.details) try { details = typeof data.details === "string" ? JSON.parse(data.details) : data.details; } catch(e) {}
// //       setAct({
// //         ...data,
// //         customer: details.customer || data.customer,
// //         receiver: details.receiver || data.receiver,
// //         route: details.route || data.route,
// //         cargoText: details.cargoText || data.cargoText || "",
// //         totals: details.totals || data.totals || {},
// //         totalSum: data.totalSum || details.totalSum || "",
// //         docNumber: details.docNumber || data.docNumber || data.id?.slice(0,8),
// //       });

// //       // Загружаем данные компании для логотипа и адреса на наклейке
// //       if (data.companyId) {
// //         try {
// //           const comp = await api.companies.get(data.companyId);
// //           setCompany(comp);
// //         } catch (e) {
// //           console.warn("Не удалось загрузить компанию:", e);
// //         }
// //       }
// //     }).catch(e => {
// //       alert("Ошибка: " + e.message);
// //     }).finally(() => setLoading(false));
// //   }, [id]);

// //   const printLabel = async () => {
// //     if (!act) return;
// //     const qrData = `TASU-${act.docNumber}-${act.route?.toCity || ""}-${act.receiver?.fio || ""}`;
// //     const { toDataURL } = await import("qrcode");
// //     const qrUrl = await toDataURL(qrData, { width: 120, margin: 1 });

// //     // Лого компании — из БД (base64 data URL или путь к файлу)
// //     // Если у компании лого не загружено — подставляем fallback
// //     const logoSrc = company?.logo || "https://tasu-test.vercel.app/images/logo.svg";

// //     // Адрес и телефон — из компании
// //     const companyAddress = company?.address || "";
// //     const companyPhone = company?.phone || "";
// //     const companyName = company?.name || "";

// //     // ТЗ: ФИО полностью, без обрезки по первому слову.
// //     // Дополнительно поддерживаем отображение "Компания + ФИО" если есть companyName.
// //     const receiverFio = act.receiver?.fio || "";
// //     const receiverCompany = act.receiver?.companyName || "";
// //     const receiverDisplay = receiverCompany && receiverFio
// //       ? `${receiverCompany}, ${receiverFio}`
// //       : (receiverCompany || receiverFio || "—");

// //     // ТЗ: Номер направления (маршрут) + Получатель (телефон)
// //     const routeFull = act.route?.fromCity && act.route?.toCity
// //       ? `${act.route.fromCity} → ${act.route.toCity}`
// //       : (act.route?.toCity || "—");
// //     const receiverPhone = act.receiver?.phone || "—";

// //     const label = `<!DOCTYPE html><html><head><meta charset="utf-8">
// // <style>
// //   @media print { body { margin: 0; } }
// //   body { font-family: Arial, sans-serif; margin: 0; padding: 8px; background: white; }
// //   .label { border: 2px solid #222; width: 340px; font-size: 12px; border-radius: 4px; overflow: hidden; }
// //   .header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 2px solid #222; background: #fff; gap: 8px; }
// //   .logo { flex-shrink: 0; max-width: 100px; }
// //   .logo img { max-height: 40px; max-width: 100px; object-fit: contain; }
// //   .address { font-size: 9px; text-align: right; color: #444; line-height: 1.4; flex: 1; }
// //   .company-name { font-weight: 700; color: #222; font-size: 10px; margin-bottom: 2px; }
// //   .cities { display: flex; border-bottom: 1px solid #222; }
// //   .city-from { flex: 1; padding: 6px 8px; border-right: 1px solid #222; background: #f9f9f9; }
// //   .city-to { flex: 2; padding: 6px 8px; background: #fff3cd; text-align: center; }
// //   .city-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
// //   .city-val { font-size: 11px; font-weight: 700; }
// //   .city-big { font-size: 24px; font-weight: 900; color: #333; }
// //   .direction-row { padding: 6px 10px; border-bottom: 1px solid #222; background: #f0f7ff; text-align: center; }
// //   .direction-label { font-size: 9px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
// //   .direction-val { font-size: 12px; font-weight: 700; color: #0050b3; }
// //   .info-row { display: flex; border-bottom: 1px solid #222; }
// //   .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #ddd; }
// //   .info-cell:last-child { border-right: none; }
// //   .info-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
// //   .info-val { font-weight: 700; font-size: 13px; }
// //   .num-row { padding: 8px 10px; border-bottom: 1px solid #222; background: #222; color: #fff; font-size: 15px; font-weight: 900; text-align: center; letter-spacing: 3px; }
// //   .receiver-block { padding: 10px; border-bottom: 1px solid #222; text-align: center; }
// //   .receiver-label { font-size: 9px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
// //   .receiver-name { font-size: 15px; font-weight: 900; color: #111; line-height: 1.3; word-wrap: break-word; }
// //   .receiver-phone { font-size: 12px; font-weight: 700; color: #0050b3; margin-top: 4px; }
// //   .qr-block { padding: 10px; text-align: center; }
// // </style></head><body>
// // <div class="label">
// //   <div class="header">
// //     <div class="logo"><img src="${escapeHtml(logoSrc)}" alt="Logo"/></div>
// //     <div class="address">
// //       ${companyName ? `<div class="company-name">${escapeHtml(companyName)}</div>` : ""}
// //       ${companyAddress ? escapeHtml(companyAddress) + "<br/>" : ""}
// //       ${companyPhone ? "Т: " + escapeHtml(companyPhone) : ""}
// //     </div>
// //   </div>
// //   <div class="cities">
// //     <div class="city-from">
// //       <div class="city-label">город отправителя</div>
// //       <div class="city-val">${escapeHtml(act.route?.fromCity || "—")}</div>
// //     </div>
// //     <div class="city-to">
// //       <div class="city-label">город получателя</div>
// //       <div class="city-big">${escapeHtml(act.route?.toCity || "—")}</div>
// //     </div>
// //   </div>
// //   <div class="direction-row">
// //     <div class="direction-label">Номер направления</div>
// //     <div class="direction-val">${escapeHtml(routeFull)}</div>
// //   </div>
// //   <div class="info-row">
// //     <div class="info-cell"><div class="info-label">мест</div><div class="info-val">${escapeHtml(String(act.totals?.seats || "—"))}</div></div>
// //     <div class="info-cell"><div class="info-label">вес</div><div class="info-val">${act.totals?.weight ? escapeHtml(String(act.totals.weight)) + " кг" : "—"}</div></div>
// //   </div>
// //   <div class="num-row">№ ${escapeHtml(act.docNumber || "")}</div>
// //   <div class="receiver-block">
// //     <div class="receiver-label">получатель</div>
// //     <div class="receiver-name">${escapeHtml(receiverDisplay)}</div>
    
// //   </div>
// //   <div class="qr-block">
// //     <img src="${qrUrl}" alt="QR" style="width:100px;height:100px;display:block;margin:0 auto;"/>
// //   </div>
// // </div>
// // <script>window.onload=function(){window.print();}</script>
// // </body></html>`;

// //     const blob = new Blob([label], { type: "text/html; charset=utf-8" });
// //     window.open(URL.createObjectURL(blob), "_blank");
// //   };

// //   if (loading) return <div style={{ padding: 32 }}>Загрузка...</div>;
// //   if (!act) return <div style={{ padding: 32 }}>Накладная не найдена</div>;

// //   // Полное отображение получателя (ФИО + компания) на странице тоже
// //   const receiverDisplay = act.receiver?.companyName && act.receiver?.fio
// //     ? `${act.receiver.companyName}, ${act.receiver.fio}`
// //     : (act.receiver?.companyName || act.receiver?.fio || "—");

// //   const customerDisplay = act.customer?.companyName && act.customer?.fio
// //     ? `${act.customer.companyName}, ${act.customer.fio}`
// //     : (act.customer?.companyName || act.customer?.fio || "—");

// //   // ТЗ: Частные лица — сток не должен содержать сумму.
// //   // Здесь детальная страница, но корректно не показывать сумму для SIMPLE (частные лица).
// //   // Определяем по типу: SIMPLE — это частные лица в упрощённом режиме.
// //   const isPrivate = act.type === "SIMPLE" || act.isSimple;

// //   return (
// //     <>
// //       <div className="navbar">
// //         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
// //           <h1>Накладная №{act.docNumber}</h1>
// //           <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
// //         </div>
// //         <div style={{ display: "flex", gap: 10 }}>
// //           <button className="btn" onClick={printLabel}>🏷️ Печать наклейки</button>
// //           <button className="btn" onClick={() => navigate("/simple")}>← Назад</button>
// //         </div>
// //       </div>

// //       <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
// //         <div className="card" style={{ flex: 1, minWidth: 280 }}>
// //           <div className="card_head"><div className="card_title">Отправитель</div></div>
// //           <div className="card_body">
// //             <div className="field"><div className="label">ФИО / Компания</div><div>{customerDisplay}</div></div>
// //             <div className="field"><div className="label">Телефон</div><div>{act.customer?.phone || "—"}</div></div>
// //             <div className="field"><div className="label">Город</div><div>{act.route?.fromCity || "—"}</div></div>
// //           </div>
// //         </div>

// //         <div className="card" style={{ flex: 1, minWidth: 280 }}>
// //           <div className="card_head"><div className="card_title">Получатель</div></div>
// //           <div className="card_body">
// //             <div className="field"><div className="label">ФИО / Компания</div><div>{receiverDisplay}</div></div>
// //             <div className="field"><div className="label">Телефон</div><div>{act.receiver?.phone || "—"}</div></div>
// //             <div className="field"><div className="label">Город</div><div>{act.route?.toCity || "—"}</div></div>
// //           </div>
// //         </div>

// //         <div className="card" style={{ flex: 1, minWidth: 280 }}>
// //           <div className="card_head"><div className="card_title">Груз</div></div>
// //           <div className="card_body">
// //             <div className="field"><div className="label">Мест</div><div>{act.totals?.seats || "—"}</div></div>
// //             <div className="field"><div className="label">Вес</div><div>{act.totals?.weight ? `${act.totals.weight} кг` : "—"}</div></div>
// //             <div className="field"><div className="label">Характер груза</div><div>{act.cargoText || "—"}</div></div>
// //             {/* ТЗ: Частные лица — Сток не должен содержать сумму */}
// //             {!isPrivate && (
// //               <div className="field">
// //                 <div className="label">Сумма</div>
// //                 <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
// //                   {act.totalSum ? `${Number(act.totalSum).toLocaleString()} тг` : "—"}
// //                 </div>
// //               </div>
// //             )}
// //           </div>
// //         </div>
// //       </div>

// //       <div className="card" style={{ marginTop: 16 }}>
// //         <div className="card_head"><div className="card_title">Информация</div></div>
// //         <div className="card_body">
// //           <div className="form_grid">
// //             <div className="field"><div className="label">Номер накладной</div><div>{act.docNumber || "—"}</div></div>
// //             <div className="field"><div className="label">Дата</div><div>{formatDate(act.createdAt || act.date)}</div></div>
// //             <div className="field"><div className="label">Статус</div><div>{act.status === "act" ? "В стоке" : act.status === "sent" ? "Подано" : act.status === "done" ? "Отработано" : act.status}</div></div>
// //           </div>
// //         </div>
// //       </div>
// //     </>
// //   );
// // }


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

//   // Печать наклейки (старая)
//   const printLabel = async () => {
//     if (!act) return;
//     const qrData = `TASU-${act.docNumber}-${act.route?.toCity || ""}-${act.receiver?.fio || ""}`;
//     const { toDataURL } = await import("qrcode");
//     const qrUrl = await toDataURL(qrData, { width: 120, margin: 1 });

//     const logoSrc = company?.logo || "https://tasu-test.vercel.app/images/logo.svg";
//     const companyAddress = company?.address || "";
//     const companyPhone = company?.phone || "";
//     const companyName = company?.name || "";

//     const receiverFio = act.receiver?.fio || "";
//     const receiverCompany = act.receiver?.companyName || "";
//     const receiverDisplay = receiverCompany && receiverFio
//       ? `${receiverCompany}, ${receiverFio}`
//       : (receiverCompany || receiverFio || "—");

//     const routeFull = act.route?.fromCity && act.route?.toCity
//       ? `${act.route.fromCity} → ${act.route.toCity}`
//       : (act.route?.toCity || "—");

//     const label = `<!DOCTYPE html><html><head><meta charset="utf-8">
// <style>
//   @media print { body { margin: 0; } }
//   body { font-family: Arial, sans-serif; margin: 0; padding: 8px; background: white; }
//   .label { border: 2px solid #222; width: 340px; font-size: 12px; border-radius: 4px; overflow: hidden; }
//   .header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 2px solid #222; gap: 8px; }
//   .logo img { max-height: 40px; max-width: 100px; object-fit: contain; }
//   .address { font-size: 9px; text-align: right; color: #444; line-height: 1.4; flex: 1; }
//   .company-name { font-weight: 700; color: #222; font-size: 10px; margin-bottom: 2px; }
//   .cities { display: flex; border-bottom: 1px solid #222; }
//   .city-from { flex: 1; padding: 6px 8px; border-right: 1px solid #222; background: #f9f9f9; }
//   .city-to { flex: 2; padding: 6px 8px; background: #fff3cd; text-align: center; }
//   .city-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
//   .city-val { font-size: 11px; font-weight: 700; }
//   .city-big { font-size: 24px; font-weight: 900; color: #333; }
//   .direction-row { padding: 6px 10px; border-bottom: 1px solid #222; background: #f0f7ff; text-align: center; }
//   .direction-label { font-size: 9px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
//   .direction-val { font-size: 12px; font-weight: 700; color: #0050b3; }
//   .info-row { display: flex; border-bottom: 1px solid #222; }
//   .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #ddd; }
//   .info-cell:last-child { border-right: none; }
//   .info-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
//   .info-val { font-weight: 700; font-size: 13px; }
//   .num-row { padding: 8px 10px; border-bottom: 1px solid #222; background: #222; color: #fff; font-size: 15px; font-weight: 900; text-align: center; letter-spacing: 3px; }
//   .receiver-block { padding: 10px; border-bottom: 1px solid #222; text-align: center; }
//   .receiver-label { font-size: 9px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
//   .receiver-name { font-size: 15px; font-weight: 900; color: #111; line-height: 1.3; }
//   .qr-block { padding: 10px; text-align: center; }
// </style></head><body>
// <div class="label">
//   <div class="header">
//     <div class="logo"><img src="${escapeHtml(logoSrc)}" alt="Logo"/></div>
//     <div class="address">
//       ${companyName ? `<div class="company-name">${escapeHtml(companyName)}</div>` : ""}
//       ${companyAddress ? escapeHtml(companyAddress) + "<br/>" : ""}
//       ${companyPhone ? "Т: " + escapeHtml(companyPhone) : ""}
//     </div>
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
//     <img src="${qrUrl}" alt="QR" style="width:100px;height:100px;display:block;margin:0 auto;"/>
//   </div>
// </div>
// <script>window.onload=function(){window.print();}</script>
// </body></html>`;

//     const blob = new Blob([label], { type: "text/html; charset=utf-8" });
//     window.open(URL.createObjectURL(blob), "_blank");
//   };

//   // 🆕 ТЗ v2: ЧЕК НА ЭКСПОРТ для частного лица
//   const printReceipt = () => {
//     if (!act) return;

//     const today = new Date().toLocaleDateString("ru-RU");
//     const logoSrc = company?.logo || "";
//     const stampSrc = company?.stamp || "";
//     const companyName = company?.name || "";
//     const companyAddress = company?.address || "";
//     const companyPhone = company?.phone || "";

//     const receiverFio = act.receiver?.fio || "—";
//     const receiverPhone = act.receiver?.phone || "—";
//     const receiverCompany = act.receiver?.companyName || "";

//     const senderFio = act.customer?.fio || "—";
//     const senderPhone = act.customer?.phone || "—";

//     const seats = act.totals?.seats || "—";
//     const weight = act.totals?.weight ? `${act.totals.weight} кг` : "—";
//     const sum = act.totalSum ? `${Number(act.totalSum).toLocaleString()} тг` : "—";

//     const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
// <title>Чек на экспорт №${escapeHtml(act.docNumber)}</title>
// <style>
//   @page { size: A5; margin: 10mm; }
//   @media print { body { margin: 0; } }
//   body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; color: #111; background: #fff; }
//   .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
//   .logo { max-height: 60px; max-width: 200px; }
//   .company-info { text-align: right; font-size: 11px; line-height: 1.4; color: #333; }
//   .company-info .name { font-weight: 900; font-size: 13px; margin-bottom: 4px; color: #000; }
//   h1 { text-align: center; font-size: 22px; margin: 16px 0; letter-spacing: 2px; }
//   .doc-num { text-align: center; font-size: 16px; font-weight: 700; padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 16px; }
//   .grid-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
//   .field { padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; background: #fafafa; }
//   .field-label { font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 1px; }
//   .field-value { font-weight: 700; font-size: 14px; color: #111; }
//   .totals-block { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 16px 0; padding: 16px; background: #fff7e6; border: 2px solid #faad14; border-radius: 8px; }
//   .total-cell { text-align: center; }
//   .total-cell .label { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 6px; }
//   .total-cell .value { font-size: 22px; font-weight: 900; color: #d46b08; }
//   .safety-note { margin-top: 24px; padding: 14px; border: 2px dashed #ff4d4f; background: #fff1f0; border-radius: 6px; font-size: 12px; line-height: 1.5; color: #a8071a; }
//   .safety-note .title { font-weight: 900; margin-bottom: 6px; font-size: 13px; text-transform: uppercase; }
//   .footer { margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
//   .signature { flex: 1; }
//   .signature .line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 4px; }
//   .signature .label { font-size: 10px; color: #666; }
//   .stamp-area { flex: 0 0 160px; text-align: center; padding-left: 20px; }
//   .stamp-area img { max-width: 130px; max-height: 130px; }
//   .stamp-area .placeholder { width: 130px; height: 130px; border: 2px dashed #ccc; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #ccc; font-size: 11px; }
//   .date-row { text-align: center; margin-top: 20px; font-size: 11px; color: #888; }
// </style>
// </head><body>

// <div class="header">
//   <div>
//     ${logoSrc ? `<img src="${escapeHtml(logoSrc)}" class="logo" alt="logo"/>` : `<div style="font-weight:900;font-size:18px;">${escapeHtml(companyName)}</div>`}
//   </div>
//   <div class="company-info">
//     ${companyName ? `<div class="name">${escapeHtml(companyName)}</div>` : ""}
//     ${companyAddress ? `<div>${escapeHtml(companyAddress)}</div>` : ""}
//     ${companyPhone ? `<div>Тел.: ${escapeHtml(companyPhone)}</div>` : ""}
//   </div>
// </div>

// <h1>ЧЕК НА ЭКСПОРТ</h1>

// <div class="doc-num">Накладная № ${escapeHtml(act.docNumber || "")}</div>

// <div class="grid-row">
//   <div class="field">
//     <div class="field-label">Отправитель</div>
//     <div class="field-value">${escapeHtml(senderFio)}</div>
//     <div style="font-size:11px;color:#666;margin-top:4px;">тел.: ${escapeHtml(senderPhone)}</div>
//   </div>
//   <div class="field">
//     <div class="field-label">Получатель</div>
//     <div class="field-value">${escapeHtml(receiverFio)}</div>
//     ${receiverCompany ? `<div style="font-size:11px;color:#666;margin-top:2px;">${escapeHtml(receiverCompany)}</div>` : ""}
//     <div style="font-size:11px;color:#666;margin-top:2px;">тел.: ${escapeHtml(receiverPhone)}</div>
//   </div>
// </div>

// <div class="grid-row">
//   <div class="field">
//     <div class="field-label">Город отправителя</div>
//     <div class="field-value">${escapeHtml(act.route?.fromCity || "—")}</div>
//   </div>
//   <div class="field">
//     <div class="field-label">Город получателя</div>
//     <div class="field-value">${escapeHtml(act.route?.toCity || "—")}</div>
//   </div>
// </div>

// <div class="totals-block">
//   <div class="total-cell">
//     <div class="label">Кол-во мест</div>
//     <div class="value">${escapeHtml(String(seats))}</div>
//   </div>
//   <div class="total-cell">
//     <div class="label">Вес</div>
//     <div class="value">${escapeHtml(String(weight))}</div>
//   </div>
//   <div class="total-cell">
//     <div class="label">Сумма</div>
//     <div class="value">${escapeHtml(String(sum))}</div>
//   </div>
// </div>

// ${act.cargoText ? `
// <div class="field" style="margin-bottom:16px;">
//   <div class="field-label">Характер груза</div>
//   <div class="field-value">${escapeHtml(act.cargoText)}</div>
// </div>
// ` : ""}

// <div class="safety-note">
//   <div class="title">⚠ Информация о безопасности груза</div>
//   Отправитель гарантирует, что в грузе отсутствуют запрещённые к перевозке предметы:
//   огнеопасные, взрывоопасные, радиоактивные, наркотические и психотропные вещества,
//   оружие и боеприпасы. Перевозчик не несёт ответственности за повреждение хрупких предметов
//   без надлежащей упаковки. Все претензии принимаются в течение 24 часов с момента получения груза.
// </div>

// <div class="footer">
//   <div class="signature">
//     <div class="line"></div>
//     <div class="label">Подпись отправителя / дата</div>
//   </div>
//   <div class="stamp-area">
//     ${stampSrc
//       ? `<img src="${escapeHtml(stampSrc)}" alt="печать"/>`
//       : `<div class="placeholder">М.П.</div>`
//     }
//   </div>
// </div>

// <div class="date-row">Сформировано: ${escapeHtml(today)}</div>

// <script>window.onload=function(){window.print();}</script>
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
//           {/* 🆕 ТЗ v2: Чек на экспорт */}
//           <button className="btn btn--accent" onClick={printReceipt} style={{ background: "#fa8c16", borderColor: "#fa8c16" }}>
//             🧾 Чек на экспорт
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

  // Печать наклейки (на груз)
  const printLabel = async () => {
    if (!act) return;
    const qrData = `TASU-${act.docNumber}-${act.route?.toCity || ""}-${act.receiver?.fio || ""}`;
    const { toDataURL } = await import("qrcode");
    const qrUrl = await toDataURL(qrData, { width: 120, margin: 1 });

    const logoSrc = company?.logo || "https://tasu-test.vercel.app/images/logo.svg";
    const companyAddress = company?.address || "";
    const companyPhone = company?.phone || "";
    const companyName = company?.name || "";

    const receiverFio = act.receiver?.fio || "";
    const receiverCompany = act.receiver?.companyName || "";
    const receiverDisplay = receiverCompany && receiverFio
      ? `${receiverCompany}, ${receiverFio}`
      : (receiverCompany || receiverFio || "—");

    const routeFull = act.route?.fromCity && act.route?.toCity
      ? `${act.route.fromCity} → ${act.route.toCity}`
      : (act.route?.toCity || "—");

    const label = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @media print { body { margin: 0; } }
  body { font-family: Arial, sans-serif; margin: 0; padding: 8px; background: white; }
  .label { border: 2px solid #222; width: 340px; font-size: 12px; border-radius: 4px; overflow: hidden; }
  .header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 2px solid #222; gap: 8px; }
  .logo img { max-height: 40px; max-width: 100px; object-fit: contain; }
  .address { font-size: 9px; text-align: right; color: #444; line-height: 1.4; flex: 1; }
  .company-name { font-weight: 700; color: #222; font-size: 10px; margin-bottom: 2px; }
  .cities { display: flex; border-bottom: 1px solid #222; }
  .city-from { flex: 1; padding: 6px 8px; border-right: 1px solid #222; background: #f9f9f9; }
  .city-to { flex: 2; padding: 6px 8px; background: #fff3cd; text-align: center; }
  .city-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
  .city-val { font-size: 11px; font-weight: 700; }
  .city-big { font-size: 24px; font-weight: 900; color: #333; }
  .direction-row { padding: 6px 10px; border-bottom: 1px solid #222; background: #f0f7ff; text-align: center; }
  .direction-label { font-size: 9px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
  .direction-val { font-size: 12px; font-weight: 700; color: #0050b3; }
  .info-row { display: flex; border-bottom: 1px solid #222; }
  .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #ddd; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
  .info-val { font-weight: 700; font-size: 13px; }
  .num-row { padding: 8px 10px; border-bottom: 1px solid #222; background: #222; color: #fff; font-size: 15px; font-weight: 900; text-align: center; letter-spacing: 3px; }
  .receiver-block { padding: 10px; border-bottom: 1px solid #222; text-align: center; }
  .receiver-label { font-size: 9px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
  .receiver-name { font-size: 15px; font-weight: 900; color: #111; line-height: 1.3; }
  .qr-block { padding: 10px; text-align: center; }
</style></head><body>
<div class="label">
  <div class="header">
    <div class="logo"><img src="${escapeHtml(logoSrc)}" alt="Logo"/></div>
    <div class="address">
      ${companyName ? `<div class="company-name">${escapeHtml(companyName)}</div>` : ""}
      ${companyAddress ? escapeHtml(companyAddress) + "<br/>" : ""}
      ${companyPhone ? "Т: " + escapeHtml(companyPhone) : ""}
    </div>
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
    <img src="${qrUrl}" alt="QR" style="width:100px;height:100px;display:block;margin:0 auto;"/>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    const blob = new Blob([label], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  // 🆕 ТЗ v2.2: ЧЕК для клиента — компактный формат по образцу, 2 копии на странице
  const printReceipt = () => {
    if (!act) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const companyName = company?.name || "";
    const companyBin = company?.bin || "";
    const companyPhones = (company?.phone || "")
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

    const transportLabel =
      act.docAttrs?.transportType === 'plane' ? 'Авиа' :
      act.docAttrs?.transportType === 'train' ? 'Поезд' :
      (act.docAttrs?.transportType === 'auto_console' || act.docAttrs?.transportType === 'auto_separate') ? 'Авто' :
      'Авиа';

    const paymentLabel = "ОПЛАТА ПОЛУЧАТЕЛЕМ";
    const userName = act.user?.name || act.creator?.name || act.createdByName || "";

    const receiptBlock = `
<div class="receipt">
  <div class="row"><strong>${escapeHtml(companyName)}</strong></div>
  ${companyBin ? `<div class="row">ИИН/БИН: ${escapeHtml(companyBin)}</div>` : ''}
  <div class="row">№${escapeHtml(docNum)}</div>
  <div class="sep">- - - - - - - - - - - - - - - - - - -</div>
  <div class="row">Отправитель: ${escapeHtml(senderFio)}${senderPhone ? ' ' + escapeHtml(senderPhone) : ''}</div>
  <div class="sep">- - - - - - - - - - - - - - - - - - -</div>
  <div class="row">Получатель: ${escapeHtml(receiverFio)}${receiverPhone ? ' ' + escapeHtml(receiverPhone) : ''}</div>
  ${receiverPhone ? `<div class="row">Телефон: ${escapeHtml(receiverPhone)}</div>` : ''}
  <div class="sep">- - - - - - - - - - - - - - - - - - -</div>
  <div class="row">Направление: ${escapeHtml(toCity)}</div>
  <div class="sep">- - - - - - - - - - - - - - - - - - -</div>
  <div class="row">Вид перевозки: ${escapeHtml(transportLabel)}</div>
  <div class="row">Количество мест: ${escapeHtml(String(seats))}</div>
  <div class="row">Вес: ${escapeHtml(String(weight))}</div>
  <div class="row">Итого к оплате: ${escapeHtml(String(sum))}</div>
  <div class="row">Дата: ${escapeHtml(dateStr)}</div>
  <div class="sep">- - - - - - - - - - - - - - - - - - -</div>
  ${userName ? `<div class="row">Пользователь: ${escapeHtml(userName)}</div>` : ''}
  <div class="row"><strong>${escapeHtml(paymentLabel)}</strong></div>
  <div class="space"></div>
  <div class="row">подпись отправителя: _______________</div>
  <div class="sep">- - - - - - - - - - - - - - - - - - -</div>
  ${companyPhones.length > 0 ? `<div class="row">Контакты:</div>${companyPhones.map(p => `<div class="row">${escapeHtml(p)}</div>`).join('')}` : ''}
  <div class="sep">- - - - - - - - - - - - - - - - - - -</div>
</div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Чек №${escapeHtml(docNum)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  @media print { body { margin: 0; } }
  body { font-family: 'Courier New', monospace; padding: 6px; max-width: 320px; margin: 0 auto; color: #000; background: #fff; font-size: 12px; line-height: 1.4; }
  .receipt { padding: 6px 4px; margin-bottom: 16px; border-bottom: 1px dashed #999; }
  .receipt:last-child { border-bottom: none; }
  .row { margin: 1px 0; word-wrap: break-word; }
  .sep { color: #555; margin: 3px 0; }
  .space { height: 6px; }
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
          <button className="btn" onClick={printLabel}>🏷️ Наклейка</button>
          {/* 🆕 ТЗ v2: Чек для клиента */}
          <button className="btn btn--accent" onClick={printReceipt} style={{ background: "#fa8c16", borderColor: "#fa8c16" }}>
            🧾 Чек
          </button>
          <button className="btn" onClick={() => navigate("/simple")}>← Назад</button>
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div className="card_head"><div className="card_title">Отправитель</div></div>
          <div className="card_body">
            <div className="field"><div className="label">ФИО / Компания</div><div>{customerDisplay}</div></div>
            <div className="field"><div className="label">Телефон</div><div>{act.customer?.phone || "—"}</div></div>
            <div className="field"><div className="label">Город</div><div>{act.route?.fromCity || "—"}</div></div>
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div className="card_head"><div className="card_title">Получатель</div></div>
          <div className="card_body">
            <div className="field"><div className="label">ФИО / Компания</div><div>{receiverDisplay}</div></div>
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