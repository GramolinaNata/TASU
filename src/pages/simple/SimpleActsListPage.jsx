// import React, { useEffect, useState, useMemo } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { api } from "../../shared/api/api.js";
// import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
// import Loader from "../../shared/components/Loader";
// import { useAuth } from "../../shared/auth/AuthContext";

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

// const STATUS_COLORS = {
//   "act": { bg: "#e6f7ff", color: "#1890ff" },
//   "sent": { bg: "#fffbe6", color: "#d48806" },
//   "done": { bg: "#f6ffed", color: "#52c41a" },
//   "canceled": { bg: "#fff1f0", color: "#cf1322" },
// };

// function displayName(party) {
//   if (!party) return "—";
//   if (party.companyName && party.fio) return `${party.companyName}, ${party.fio}`;
//   return party.companyName || party.fio || "—";
// }

// function getSortValue(a, field) {
//   switch (field) {
//     case 'number':   return (a.docNumber || a.number || a.id || '').toString().toLowerCase();
//     case 'date':     return new Date(a.createdAt || a.date || 0).getTime();
//     case 'customer': return displayName(a.customer).toLowerCase();
//     case 'receiver': return displayName(a.receiver).toLowerCase();
//     case 'city':     return (a.route?.toCity || '').toString().toLowerCase();
//     case 'seats':    return Number(a.totals?.seats) || 0;
//     case 'weight':   return Number(a.totals?.weight) || 0;
//     case 'cargo':    return (a.cargoText || '').toString().toLowerCase();
//     case 'status':   return (a.status || '').toString().toLowerCase();
//     default:         return '';
//   }
// }

// export default function SimpleActsListPage() {
//   const location = useLocation();
//   const { isAdmin } = useAuth();
//   const [acts, setActs] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [company, setCompany] = useState(getSelectedCompany());
//   const [selected, setSelected] = useState([]);
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [activeTab, setActiveTab] = useState("all");
//   const [showBatchModal, setShowBatchModal] = useState(false);
//   const [batchForm, setBatchForm] = useState({
//     number: "", city: "", driverName: "", driverPhone: "", carNumber: "", deliveryCost: ""
//   });

//   const [sortBy, setSortBy] = useState('date');
//   const [sortOrder, setSortOrder] = useState('desc');

//   const handleSort = (field) => {
//     if (sortBy === field) {
//       setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
//     } else {
//       setSortBy(field);
//       setSortOrder('asc');
//     }
//   };

//   const sortArrow = (field) => {
//     if (sortBy !== field) return <span style={{ color: '#bbb', marginLeft: 4 }}>⇅</span>;
//     return <span style={{ color: '#1890ff', marginLeft: 4, fontWeight: 700 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
//   };

//   const SortableTh = ({ field, children, style }) => (
//     <th
//       style={{ cursor: 'pointer', userSelect: 'none', ...style }}
//       onClick={() => handleSort(field)}
//       title="Клик для сортировки"
//     >
//       {children}{sortArrow(field)}
//     </th>
//   );

//   useEffect(() => {
//     return subscribeSelectedCompany(c => setCompany(c));
//   }, []);

//   useEffect(() => {
//     // Админ видит частные накладные всех компаний (не зависит от переключателя).
//     // Менеджер/PRIVATE — только свою выбранную компанию.
//     if (!isAdmin && !company) { setActs([]); setLoading(false); return; }
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [company, location.state?.refresh, isAdmin]);
//   const load = async () => {
//     setLoading(true);
//     try {
//       // Админ — без companyId (все компании); остальные — по своей компании
//       const list = await api.requests.list(isAdmin ? undefined : company?.id);
//       if (Array.isArray(list)) {
//         const simple = list
//           .filter(a => {
//             let details = {};
//             if (a.details) try { details = typeof a.details === "string" ? JSON.parse(a.details) : a.details; } catch(e) {}
//             return a.type === "SIMPLE" || details.isSimple;
//           })
//           .map(a => {
//             let details = {};
//             if (a.details) try { details = typeof a.details === "string" ? JSON.parse(a.details) : a.details; } catch(e) {}
//             return {
//               ...a,
//               customer: details.customer || a.customer,
//               receiver: details.receiver || a.receiver,
//               route: details.route || a.route,
//               cargoText: details.cargoText || a.cargoText || "",
//               totals: details.totals || a.totals || {},
//               transportType: details.transportType || a.transportType,
//               totalSum: a.totalSum || details.totalSum || "",
//               docNumber: details.docNumber || a.docNumber || a.id?.slice(0, 8),
//             };
//           });
//         setActs(simple);
//       }
//     } catch(e) {
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const updateStatus = async (id, newStatus) => {
//     try {
//       await api.requests.update(id, { status: newStatus });
//       load();
//     } catch(e) {
//       alert("Ошибка: " + e.message);
//     }
//   };

//   const cancelAct = async (act) => {
//     if (!window.confirm(`Аннулировать накладную №${act.docNumber || act.number}?\nЭто действие можно отменить из таба "Аннулированные".`)) return;
//     try {
//       await api.requests.update(act.id, { status: 'canceled' });
//       load();
//     } catch(e) {
//       alert("Ошибка: " + e.message);
//     }
//   };

//   const restoreAct = async (act) => {
//     if (!window.confirm(`Восстановить накладную №${act.docNumber || act.number}?`)) return;
//     try {
//       await api.requests.update(act.id, { status: 'act' });
//       load();
//     } catch(e) {
//       alert("Ошибка: " + e.message);
//     }
//   };

//   const filtered = useMemo(() => {
//     let list = acts.filter(a => {
//       const s = search.trim().toLowerCase();
//       const searchFields = [
//         a.docNumber, a.number,
//         a.customer?.fio, a.customer?.companyName, a.customer?.phone,
//         a.receiver?.fio, a.receiver?.companyName, a.receiver?.phone,
//         a.route?.toCity, a.route?.fromCity,
//         a.cargoText,
//       ].filter(Boolean).join(" ").toLowerCase();
//       const matchSearch = !s || searchFields.includes(s);

//       let matchDate = true;
//       if (dateFrom) matchDate = matchDate && new Date(a.createdAt || a.date) >= new Date(dateFrom);
//       if (dateTo) matchDate = matchDate && new Date(a.createdAt || a.date) <= new Date(dateTo + "T23:59:59");
//      let matchTab = true;
//       if (activeTab === "stock") matchTab = a.status === "act";
//       if (activeTab === "sent") matchTab = a.status === "sent";
//       if (activeTab === "done") matchTab = a.status === "done";
//       if (activeTab === "canceled") matchTab = a.status === "canceled";
//       if (activeTab === "all") matchTab = a.status !== "canceled";
//       // При активном поиске игнорируем вкладку — ищем по всем накладным,
//       // чтобы можно было найти номер в любом статусе
//       if (s) {
//         return matchSearch && matchDate && a.status !== "canceled";
//       }
//       return matchSearch && matchDate && matchTab;
//     });

//     const sorted = [...list].sort((a, b) => {
//       const av = getSortValue(a, sortBy);
//       const bv = getSortValue(b, sortBy);
//       if (av < bv) return sortOrder === 'asc' ? -1 : 1;
//       if (av > bv) return sortOrder === 'asc' ? 1 : -1;
//       return 0;
//     });

//     return sorted;
//   }, [acts, search, dateFrom, dateTo, activeTab, sortBy, sortOrder]);

//   const displayActs = selected.length > 0 ? filtered.filter(a => selected.includes(a.id)) : filtered;
//   const totalSeats = displayActs.reduce((acc, a) => acc + (Number(a.totals?.seats) || 0), 0);
//   const totalWeight = displayActs.reduce((acc, a) => acc + (Number(a.totals?.weight) || 0), 0);

//   const toggleSelect = (id) => {
//     setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
//   };

//   const toggleAll = () => {
//     if (selected.length === filtered.length) setSelected([]);
//     else setSelected(filtered.map(a => a.id));
//   };

//   const openBatchModal = () => {
//     if (selected.length === 0) return alert("Выберите накладные");
//     const selectedActs = filtered.filter(a => selected.includes(a.id));
//     const city = selectedActs[0]?.route?.toCity || "";
//     setBatchForm({
//       number: "П" + String(Date.now()).slice(-6),
//       city,
//       driverName: "", driverPhone: "", carNumber: "", deliveryCost: ""
//     });
//     setShowBatchModal(true);
//   };

//   const saveBatchAndPrint = async () => {
//     if (!batchForm.number || !batchForm.city) return alert("Укажите номер и город");
//     const selectedActs = filtered.filter(a => selected.includes(a.id));

//     try {
//       await api.batches.create({
//         ...batchForm,
//         companyId: company?.id,
//         requestIds: selected,
//       });

//       await printVedomost(selectedActs, batchForm);
//       setShowBatchModal(false);
//       setSelected([]);
//     } catch(e) {
//       alert("Ошибка: " + e.message);
//     }
//   };

//   const printVedomost = async (selectedActs, batchData) => {
//     const totalS = selectedActs.reduce((acc, a) => acc + (Number(a.totals?.seats) || 0), 0);
//     const totalW = selectedActs.reduce((acc, a) => acc + (Number(a.totals?.weight) || 0), 0);
//     const totalSm = selectedActs.reduce((acc, a) => acc + (Number(a.totalSum) || 0), 0);

//     const qrData = `TASU-BATCH-${batchData.number}-${batchData.city}`;
//     const { toDataURL } = await import("qrcode");
//     const qrUrl = await toDataURL(qrData, { width: 120, margin: 1 });

//     const rows = selectedActs.map((a, i) => {
//       const receiverDisplay = a.receiver?.companyName && a.receiver?.fio
//         ? `${a.receiver.companyName}, ${a.receiver.fio}`
//         : (a.receiver?.companyName || a.receiver?.fio || "—");

//       return `
//       <tr>
//         <td style="text-align:center">${i + 1}</td>
//         <td>${escapeHtml(a.docNumber || a.number || a.id?.slice(0,8) || "—")}</td>
//         <td>${escapeHtml(receiverDisplay)}</td>
//         <td>${escapeHtml(a.receiver?.phone || "—")}</td>
//         <td style="text-align:center">${escapeHtml(String(a.totals?.seats || "—"))}</td>
//         <td style="text-align:center">${a.totals?.weight ? escapeHtml(String(a.totals.weight)) + " кг" : "—"}</td>
//         <td>${escapeHtml(a.route?.toCity || "—")}</td>
//       </tr>
//     `;
//     }).join("");
//     const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Грузовая ведомость ${escapeHtml(batchData.number)}</title>
//     <style>
//       body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
//       .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #000; }
//       h2 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
//       .sub { color: #333; font-size: 11px; margin-top: 4px; }
//       table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
//       th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
//       th { background: #f3f4f6; font-weight: 700; text-align: center; }
//       .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
//       .sig { flex: 1; }
//       .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 28px; }
//       .sig-label { font-size: 10px; color: #333; text-align: center; }
//     </style></head><body>
//     <div class="header">
//       <div>
//         <h2>Грузовая ведомость</h2>
//         <div class="sub">${escapeHtml(company?.name || "")} &nbsp;&nbsp; Партия № ${escapeHtml(batchData.number)} &nbsp;&nbsp; Город: ${escapeHtml(batchData.city || "—")} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")}</div>
//       </div>
//       <img src="${qrUrl}" width="80" height="80" style="border:1px solid #ccc;padding:3px;"/>
//     </div>
//     <table>
//       <thead><tr>
//         <th style="width:30px">№</th>
//         <th>Номер накладной</th>
//         <th>Получатель</th>
//         <th style="width:130px">Номер телефона</th>
//         <th style="width:50px">Мест</th>
//         <th style="width:60px">Вес</th>
//         <th style="width:90px">Город</th>
//       </tr></thead>
//       <tbody>${rows}</tbody>
//     </table>
//     <div class="signatures">
//       <div class="sig"><div class="sig-line"></div><div class="sig-label">Выдал (ФИО, подпись)</div></div>
//       <div class="sig"><div class="sig-line"></div><div class="sig-label">Принял (ФИО, подпись)</div></div>
//     </div>
//     <script>window.onload=function(){window.print();}</script>
//     </body></html>`;

//     const blob = new Blob([html], { type: "text/html; charset=utf-8" });
//     window.open(URL.createObjectURL(blob), "_blank");
//   };

//   const tabCounts = {
//     all: acts.filter(a => a.status !== "canceled").length,
//     stock: acts.filter(a => a.status === "act").length,
//     sent: acts.filter(a => a.status === "sent").length,
//     done: acts.filter(a => a.status === "done").length,
//     canceled: acts.filter(a => a.status === "canceled").length,
//   };

//   return (
//     <>
//       <div className="navbar">
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <h1>Накладные</h1>
//           <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
//           {company && <div className="chip">{company.name}</div>}
//         </div>
//         <div style={{ display: "flex", gap: 10 }}>
//           {selected.length > 0 && (
//             <button className="btn btn--accent" onClick={openBatchModal}>
//               📋 Грузовая ведомость ({selected.length})
//             </button>
//           )}
//           <Link className="btn btn--accent" to="/simple/new">+ Новая накладная</Link>
//         </div>
//       </div>

//       {showBatchModal && (
//         <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
//           <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, width: 520, maxWidth: "95vw" }}>
//             <h2 style={{ margin: "0 0 4px" }}>Создать партию и распечатать ведомость</h2>
//             <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: "0.9rem" }}>Накладных: {selected.length}</p>
//             <div className="form_grid">
//               <div className="field">
//                 <div className="label">Номер партии *</div>
//                 <input value={batchForm.number} onChange={e => setBatchForm({...batchForm, number: e.target.value})} placeholder="П000001" />
//               </div>
//               <div className="field">
//                 <div className="label">Город назначения *</div>
//                 <input value={batchForm.city} onChange={e => setBatchForm({...batchForm, city: e.target.value})} placeholder="Астана" />
//               </div>
//               <div className="field">
//                 <div className="label">ФИО водителя</div>
//                 <input value={batchForm.driverName} onChange={e => setBatchForm({...batchForm, driverName: e.target.value})} placeholder="Иванов Иван" />
//               </div>
//               <div className="field">
//                 <div className="label">Телефон водителя</div>
//                 <input value={batchForm.driverPhone} onChange={e => setBatchForm({...batchForm, driverPhone: e.target.value})} placeholder="+7 777 123 45 67" />
//               </div>
//               <div className="field">
//                 <div className="label">Номер авто</div>
//                 <input value={batchForm.carNumber} onChange={e => setBatchForm({...batchForm, carNumber: e.target.value})} placeholder="777 ABC 01" />
//               </div>
//               <div className="field">
//                 <div className="label">Стоимость перевозки (тг)</div>
//                 <input type="number" value={batchForm.deliveryCost} onChange={e => setBatchForm({...batchForm, deliveryCost: e.target.value})} placeholder="0" />
//               </div>
//             </div>
//             <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
//               <button className="btn btn--accent" onClick={saveBatchAndPrint}>💾 Сохранить и распечатать</button>
//               <button className="btn" onClick={() => setShowBatchModal(false)}>Отмена</button>
//             </div>
//           </div>
//         </div>
//       )}

//       <div style={{ display: "flex", gap: 4, marginTop: 16, borderBottom: "2px solid var(--line)" }}>
//         {[
//           { key: "all", label: "Все" },
//           { key: "stock", label: "В стоке" },
//           { key: "sent", label: "Подано" },
//           { key: "done", label: "Отработано" },
//           { key: "canceled", label: "Аннулированные" },
//         ].map(tab => (
//           <button
//             key={tab.key}
//             onClick={() => { setActiveTab(tab.key); setSelected([]); }}
//             style={{
//               padding: "8px 16px",
//               border: "none",
//               borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
//               background: "none",
//               cursor: "pointer",
//               fontWeight: activeTab === tab.key ? 700 : 400,
//               color: activeTab === tab.key ? (tab.key === "canceled" ? "#cf1322" : "var(--accent)") : "var(--text-muted)",
//               marginBottom: -2,
//               fontSize: "0.9rem",
//             }}
//           >
//             {tab.label} <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>({tabCounts[tab.key]})</span>
//           </button>
//         ))}
//       </div>

//       <div className="filter" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
//         <div className="field" style={{ minWidth: 200, flex: 1 }}>
//           <div className="label">🔍 Поиск (номер накладной, ФИО, телефон, город)</div>
//           <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Введите № накладной (например А000001) или любую часть данных..." />
//         </div>
//         <div className="field" style={{ width: 160 }}>
//           <div className="label">Дата с</div>
//           <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
//         </div>
//         <div className="field" style={{ width: 160 }}>
//           <div className="label">Дата по</div>
//           <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
//         </div>
//       </div>

//       <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
//         <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
//           Накладных: <strong>{selected.length > 0 ? selected.length : filtered.length}</strong>
//           {selected.length > 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}> (выбрано)</span>}
//         </div>
//         <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
//           Мест: <strong>{totalSeats}</strong>
//         </div>
//         <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
//           Вес: <strong>{totalWeight} кг</strong>
//         </div>
//       </div>

//       <div className="table_wrap" style={{ marginTop: 16 }}>
//         {loading ? <Loader /> : (
//           <table className="table_fixed">
//             <thead>
//               <tr>
//                 <th style={{ width: 40 }}>
//                   <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
//                 </th>
//                 <SortableTh field="number" style={{ width: 120 }}>Номер</SortableTh>
//                 <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
//                 <SortableTh field="customer">Отправитель</SortableTh>
//                 <SortableTh field="receiver">Получатель</SortableTh>
//                 <SortableTh field="city">Город</SortableTh>
//                 <SortableTh field="seats" style={{ width: 70 }}>Мест</SortableTh>
//                 <SortableTh field="weight" style={{ width: 90 }}>Вес</SortableTh>
//                 <SortableTh field="cargo">Груз</SortableTh>
//                 <SortableTh field="status" style={{ width: 120 }}>Статус</SortableTh>
//                 <th style={{ width: 100 }}>Действия</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.length === 0 ? (
//                 <tr><td colSpan={11} className="muted" style={{ padding: 16 }}>
//                   {company ? "Накладных пока нет." : "Выберите компанию."}
//                 </td></tr>
//               ) : (
//                 filtered.map(a => {
//                   const statusStyle = STATUS_COLORS[a.status] || { bg: "#f5f5f5", color: "#999" };
//                   const isCanceled = a.status === "canceled";
//                   return (
//                     <tr
//                       key={a.id}
//                       style={{
//                         background: selected.includes(a.id) ? "rgba(24,144,255,0.06)" : (isCanceled ? "#fff5f5" : ""),
//                         opacity: isCanceled ? 0.7 : 1,
//                       }}
//                     >
//                       <td style={{ textAlign: "center" }}>
//                         <input
//                           type="checkbox"
//                           checked={selected.includes(a.id)}
//                           onChange={() => toggleSelect(a.id)}
//                           disabled={isCanceled}
//                         />
//                       </td>
//                       <td className="num">
//                         <Link to={`/simple/${a.id}`} style={{ textDecoration: isCanceled ? "line-through" : "none" }}>
//                           {a.docNumber || a.number || a.id?.slice(0, 8)}
//                         </Link>
//                       </td>
//                       <td>{formatDate(a.createdAt || a.date)}</td>
//                       <td>
//                         <div style={{ fontWeight: 500 }}>{displayName(a.customer)}</div>
//                         {a.customer?.phone && <div className="muted" style={{ fontSize: "0.8rem" }}>{a.customer.phone}</div>}
//                       </td>
//                       <td>
//                         <div style={{ fontWeight: 500 }}>{displayName(a.receiver)}</div>
//                         {a.receiver?.phone && <div className="muted" style={{ fontSize: "0.8rem" }}>{a.receiver.phone}</div>}
//                       </td>
//                       <td>{a.route?.toCity || "—"}</td>
//                       <td style={{ textAlign: "center" }}>{a.totals?.seats || "—"}</td>
//                       <td style={{ textAlign: "center" }}>{a.totals?.weight ? `${a.totals.weight} кг` : "—"}</td>
//                       <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{a.cargoText || "—"}</td>
//                       <td>
//                         {isCanceled ? (
//                           <span style={{
//                             background: statusStyle.bg,
//                             color: statusStyle.color,
//                             padding: "3px 8px",
//                             borderRadius: 4,
//                             fontSize: "0.8rem",
//                             fontWeight: 600,
//                           }}>
//                             Аннулирована
//                           </span>
//                         ) : (
//                           <select
//                             value={a.status || "act"}
//                             onChange={e => updateStatus(a.id, e.target.value)}
//                             style={{
//                               background: statusStyle.bg,
//                               color: statusStyle.color,
//                               border: "none",
//                               borderRadius: 4,
//                               padding: "3px 6px",
//                               fontSize: "0.8rem",
//                               fontWeight: 600,
//                               cursor: "pointer",
//                             }}
//                           >
//                             <option value="act">В стоке</option>
//                             <option value="sent">Подано</option>
//                             <option value="done">Отработано</option>
//                           </select>
//                         )}
//                       </td>
//                       <td>
//                         {isCanceled ? (
//                           <button
//                             className="btn btn--sm"
//                             onClick={() => restoreAct(a)}
//                             title="Восстановить накладную"
//                             style={{ background: '#52c41a', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
//                           >
//                             ↩ Восстановить
//                           </button>
//                         ) : (
//                           <button
//                             className="btn btn--sm"
//                             onClick={() => cancelAct(a)}
//                             title="Аннулировать накладную"
//                             style={{ background: '#fff', border: '1px solid #ff4d4f', color: '#ff4d4f', fontSize: 11, fontWeight: 600 }}
//                           >
//                             🗑 Аннулировать
//                           </button>
//                         )}
//                       </td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>
//           </table>
//         )}
//       </div>
//     </>
//   );
// }



import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";
import { useAuth } from "../../shared/auth/AuthContext";

// 🆕 ТЗ: буква компании + П, нумерация по порядку с 1 (как у обычных партий)
function batchCompanyPrefix(company) {
  if (!company || !company.name) return "П";
  const n = company.name.toLowerCase();
  if (n.includes("алдияр")) return "АП";
  if (n.includes("tasu kz") && n.includes("ип")) return "IPTП";
  if (n.includes("tasu")) return "ТП";
  const first = (company.name.trim()[0] || "П").toUpperCase();
  return first + "П";
}

async function genNextBatchNumberSimple(company) {
  const prefix = batchCompanyPrefix(company);
  try {
    let all = [];
    try { all = await api.batches.list(); } catch (e) { all = await api.batches.list(company?.id); }
    const pattern = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)$");
    let maxNum = 0;
    (all || []).forEach(b => {
      const m = String(b.number || "").match(pattern);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum && n < 900000) maxNum = n;
      }
    });
    return prefix + String(maxNum + 1).padStart(6, "0");
  } catch (e) {
    return prefix + "000001";
  }
}


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

const STATUS_COLORS = {
  "act": { bg: "#e6f7ff", color: "#1890ff" },
  "sent": { bg: "#fffbe6", color: "#d48806" },
  "done": { bg: "#f6ffed", color: "#52c41a" },
  "canceled": { bg: "#fff1f0", color: "#cf1322" },
};

function displayName(party) {
  if (!party) return "—";
  if (party.companyName && party.fio) return `${party.companyName}, ${party.fio}`;
  return party.companyName || party.fio || "—";
}

function getSortValue(a, field) {
  switch (field) {
    case 'number':   return (a.docNumber || a.number || a.id || '').toString().toLowerCase();
    case 'date':     return new Date(a.createdAt || a.date || 0).getTime();
    case 'customer': return displayName(a.customer).toLowerCase();
    case 'receiver': return displayName(a.receiver).toLowerCase();
    case 'city':     return (a.route?.toCity || '').toString().toLowerCase();
    case 'seats':    return Number(a.totals?.seats) || 0;
    case 'weight':   return Number(a.totals?.weight) || 0;
    case 'cargo':    return (a.cargoText || '').toString().toLowerCase();
    case 'status':   return (a.status || '').toString().toLowerCase();
    default:         return '';
  }
}

export default function SimpleActsListPage() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState(getSelectedCompany());
  const [selected, setSelected] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({
    number: "", city: "", driverName: "", driverPhone: "", carNumber: "", deliveryCost: ""
  });

  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortArrow = (field) => {
    if (sortBy !== field) return <span style={{ color: '#bbb', marginLeft: 4 }}>⇅</span>;
    return <span style={{ color: '#1890ff', marginLeft: 4, fontWeight: 700 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const SortableTh = ({ field, children, style }) => (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', ...style }}
      onClick={() => handleSort(field)}
      title="Клик для сортировки"
    >
      {children}{sortArrow(field)}
    </th>
  );

  useEffect(() => {
    return subscribeSelectedCompany(c => setCompany(c));
  }, []);

  useEffect(() => {
    // Админ видит частные накладные всех компаний (не зависит от переключателя).
    // Менеджер/PRIVATE — только свою выбранную компанию.
    if (!isAdmin && !company) { setActs([]); setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, location.state?.refresh, isAdmin]);
  const load = async () => {
    setLoading(true);
    try {
      // Админ — без companyId (все компании); остальные — по своей компании
      const list = await api.requests.list(isAdmin ? undefined : company?.id);
      if (Array.isArray(list)) {
        const simple = list
          .filter(a => {
            let details = {};
            if (a.details) try { details = typeof a.details === "string" ? JSON.parse(a.details) : a.details; } catch(e) {}
            return a.type === "SIMPLE" || details.isSimple;
          })
          .map(a => {
            let details = {};
            if (a.details) try { details = typeof a.details === "string" ? JSON.parse(a.details) : a.details; } catch(e) {}
            return {
              ...a,
              customer: details.customer || a.customer,
              receiver: details.receiver || a.receiver,
              route: details.route || a.route,
              cargoText: details.cargoText || a.cargoText || "",
              totals: details.totals || a.totals || {},
              transportType: details.transportType || a.transportType,
              totalSum: a.totalSum || details.totalSum || "",
              docNumber: details.docNumber || a.docNumber || a.id?.slice(0, 8),
            };
          });
        setActs(simple);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.requests.update(id, { status: newStatus });
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const cancelAct = async (act) => {
    if (!window.confirm(`Аннулировать накладную №${act.docNumber || act.number}?\nЭто действие можно отменить из таба "Аннулированные".`)) return;
    try {
      await api.requests.update(act.id, { status: 'canceled' });
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const restoreAct = async (act) => {
    if (!window.confirm(`Восстановить накладную №${act.docNumber || act.number}?`)) return;
    try {
      await api.requests.update(act.id, { status: 'act' });
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const filtered = useMemo(() => {
    let list = acts.filter(a => {
      const s = search.trim().toLowerCase();
      const searchFields = [
        a.docNumber, a.number,
        a.customer?.fio, a.customer?.companyName, a.customer?.phone,
        a.receiver?.fio, a.receiver?.companyName, a.receiver?.phone,
        a.route?.toCity, a.route?.fromCity,
        a.cargoText,
      ].filter(Boolean).join(" ").toLowerCase();
      const matchSearch = !s || searchFields.includes(s);

      let matchDate = true;
      if (dateFrom) matchDate = matchDate && new Date(a.createdAt || a.date) >= new Date(dateFrom);
      if (dateTo) matchDate = matchDate && new Date(a.createdAt || a.date) <= new Date(dateTo + "T23:59:59");
     let matchTab = true;
      if (activeTab === "stock") matchTab = a.status === "act";
      if (activeTab === "sent") matchTab = a.status === "sent";
      if (activeTab === "done") matchTab = a.status === "done";
      if (activeTab === "canceled") matchTab = a.status === "canceled";
      if (activeTab === "all") matchTab = a.status !== "canceled";
      // При активном поиске игнорируем вкладку — ищем по всем накладным,
      // чтобы можно было найти номер в любом статусе
      if (s) {
        return matchSearch && matchDate && a.status !== "canceled";
      }
      return matchSearch && matchDate && matchTab;
    });

    const sorted = [...list].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [acts, search, dateFrom, dateTo, activeTab, sortBy, sortOrder]);

  const displayActs = selected.length > 0 ? filtered.filter(a => selected.includes(a.id)) : filtered;
  const totalSeats = displayActs.reduce((acc, a) => acc + (Number(a.totals?.seats) || 0), 0);
  const totalWeight = displayActs.reduce((acc, a) => acc + (Number(a.totals?.weight) || 0), 0);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(a => a.id));
  };

  const openBatchModal = async () => {
    if (selected.length === 0) return alert("Выберите накладные");
    const selectedActs = filtered.filter(a => selected.includes(a.id));
    const city = selectedActs[0]?.route?.toCity || "";
    const number = await genNextBatchNumberSimple(company);
    setBatchForm({
      number,
      city,
      driverName: "", driverPhone: "", carNumber: "", deliveryCost: ""
    });
    setShowBatchModal(true);
  };

  const saveBatchAndPrint = async () => {
    if (!batchForm.number || !batchForm.city) return alert("Укажите номер и город");
    const selectedActs = filtered.filter(a => selected.includes(a.id));

    try {
      await api.batches.create({
        ...batchForm,
        companyId: company?.id,
        requestIds: selected,
      });

      await printVedomost(selectedActs, batchForm);
      setShowBatchModal(false);
      setSelected([]);
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const printVedomost = async (selectedActs, batchData) => {
    const totalS = selectedActs.reduce((acc, a) => acc + (Number(a.totals?.seats) || 0), 0);
    const totalW = selectedActs.reduce((acc, a) => acc + (Number(a.totals?.weight) || 0), 0);
    const totalSm = selectedActs.reduce((acc, a) => acc + (Number(a.totalSum) || 0), 0);

    const qrData = `TASU-BATCH-${batchData.number}-${batchData.city}`;
    const { toDataURL } = await import("qrcode");
    const qrUrl = await toDataURL(qrData, { width: 120, margin: 1 });

    const rows = selectedActs.map((a, i) => {
      const receiverDisplay = a.receiver?.companyName && a.receiver?.fio
        ? `${a.receiver.companyName}, ${a.receiver.fio}`
        : (a.receiver?.companyName || a.receiver?.fio || "—");

      return `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${escapeHtml(a.docNumber || a.number || a.id?.slice(0,8) || "—")}</td>
        <td>${escapeHtml(receiverDisplay)}</td>
        <td>${escapeHtml(a.receiver?.phone || "—")}</td>
        <td style="text-align:center">${escapeHtml(String(a.totals?.seats || "—"))}</td>
        <td style="text-align:center">${a.totals?.weight ? escapeHtml(String(a.totals.weight)) + " кг" : "—"}</td>
        <td>${escapeHtml(a.route?.toCity || "—")}</td>
        <td style="text-align:right;font-weight:700">${a.totalSum ? Number(a.totalSum).toLocaleString() + " тг" : "—"}</td>
      </tr>
    `;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Грузовая ведомость ${escapeHtml(batchData.number)}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #000; }
      h2 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
      .sub { color: #333; font-size: 11px; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
      th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
      th { background: #f3f4f6; font-weight: 700; text-align: center; }
      .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
      .sig { flex: 1; }
      .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 28px; }
      .sig-label { font-size: 10px; color: #333; text-align: center; }
    </style></head><body>
    <div class="header">
      <div>
        <h2>Грузовая ведомость</h2>
        <div class="sub">${escapeHtml(company?.name || "")} &nbsp;&nbsp; Партия № ${escapeHtml(batchData.number)} &nbsp;&nbsp; Город: ${escapeHtml(batchData.city || "—")} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")}</div>
      </div>
      <img src="${qrUrl}" width="80" height="80" style="border:1px solid #ccc;padding:3px;"/>
    </div>
    <table>
      <thead><tr>
        <th style="width:30px">№</th>
        <th>Номер накладной</th>
        <th>Получатель</th>
        <th style="width:130px">Номер телефона</th>
        <th style="width:50px">Мест</th>
        <th style="width:60px">Вес</th>
        <th style="width:90px">Город</th>
        <th style="width:100px">Сумма</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="6" style="text-align:right;font-weight:900">ИТОГО:</td>
          <td style="text-align:right;font-weight:900">${totalSm.toLocaleString()} тг</td>
        </tr>
      </tfoot>
    </table>
    <div class="signatures">
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Выдал (ФИО, подпись)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Принял (ФИО, подпись)</div></div>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  const tabCounts = {
    all: acts.filter(a => a.status !== "canceled").length,
    stock: acts.filter(a => a.status === "act").length,
    sent: acts.filter(a => a.status === "sent").length,
    done: acts.filter(a => a.status === "done").length,
    canceled: acts.filter(a => a.status === "canceled").length,
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Накладные</h1>
          <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
          {company && <div className="chip">{company.name}</div>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {selected.length > 0 && (
            <button className="btn btn--accent" onClick={openBatchModal}>
              📋 Грузовая ведомость ({selected.length})
            </button>
          )}
          <Link className="btn btn--accent" to="/simple/new">+ Новая накладная</Link>
        </div>
      </div>

      {showBatchModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, width: 520, maxWidth: "95vw" }}>
            <h2 style={{ margin: "0 0 4px" }}>Создать партию и распечатать ведомость</h2>
            <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: "0.9rem" }}>Накладных: {selected.length}</p>
            <div className="form_grid">
              <div className="field">
                <div className="label">Номер партии *</div>
                <input value={batchForm.number} onChange={e => setBatchForm({...batchForm, number: e.target.value})} placeholder="П000001" />
              </div>
              <div className="field">
                <div className="label">Город назначения *</div>
                <input value={batchForm.city} onChange={e => setBatchForm({...batchForm, city: e.target.value})} placeholder="Астана" />
              </div>
              <div className="field">
                <div className="label">ФИО водителя</div>
                <input value={batchForm.driverName} onChange={e => setBatchForm({...batchForm, driverName: e.target.value})} placeholder="Иванов Иван" />
              </div>
              <div className="field">
                <div className="label">Телефон водителя</div>
                <input value={batchForm.driverPhone} onChange={e => setBatchForm({...batchForm, driverPhone: e.target.value})} placeholder="+7 777 123 45 67" />
              </div>
              <div className="field">
                <div className="label">Номер авто</div>
                <input value={batchForm.carNumber} onChange={e => setBatchForm({...batchForm, carNumber: e.target.value})} placeholder="777 ABC 01" />
              </div>
              <div className="field">
                <div className="label">Стоимость перевозки (тг)</div>
                <input type="number" value={batchForm.deliveryCost} onChange={e => setBatchForm({...batchForm, deliveryCost: e.target.value})} placeholder="0" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn--accent" onClick={saveBatchAndPrint}>💾 Сохранить и распечатать</button>
              <button className="btn" onClick={() => setShowBatchModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginTop: 16, borderBottom: "2px solid var(--line)" }}>
        {[
          { key: "all", label: "Все" },
          { key: "stock", label: "В стоке" },
          { key: "sent", label: "Подано" },
          { key: "done", label: "Отработано" },
          { key: "canceled", label: "Аннулированные" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelected([]); }}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? (tab.key === "canceled" ? "#cf1322" : "var(--accent)") : "var(--text-muted)",
              marginBottom: -2,
              fontSize: "0.9rem",
            }}
          >
            {tab.label} <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>({tabCounts[tab.key]})</span>
          </button>
        ))}
      </div>

      <div className="filter" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ minWidth: 200, flex: 1 }}>
          <div className="label">🔍 Поиск (номер накладной, ФИО, телефон, город)</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Введите № накладной (например А000001) или любую часть данных..." />
        </div>
        <div className="field" style={{ width: 160 }}>
          <div className="label">Дата с</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="field" style={{ width: 160 }}>
          <div className="label">Дата по</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
          Накладных: <strong>{selected.length > 0 ? selected.length : filtered.length}</strong>
          {selected.length > 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}> (выбрано)</span>}
        </div>
        <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
          Мест: <strong>{totalSeats}</strong>
        </div>
        <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
          Вес: <strong>{totalWeight} кг</strong>
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                <SortableTh field="number" style={{ width: 120 }}>Номер</SortableTh>
                <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
                <SortableTh field="customer">Отправитель</SortableTh>
                <SortableTh field="receiver">Получатель</SortableTh>
                <SortableTh field="city">Город</SortableTh>
                <SortableTh field="seats" style={{ width: 70 }}>Мест</SortableTh>
                <SortableTh field="weight" style={{ width: 90 }}>Вес</SortableTh>
                <SortableTh field="cargo">Груз</SortableTh>
                <SortableTh field="status" style={{ width: 120 }}>Статус</SortableTh>
                <th style={{ width: 100 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="muted" style={{ padding: 16 }}>
                  {company ? "Накладных пока нет." : "Выберите компанию."}
                </td></tr>
              ) : (
                filtered.map(a => {
                  const statusStyle = STATUS_COLORS[a.status] || { bg: "#f5f5f5", color: "#999" };
                  const isCanceled = a.status === "canceled";
                  return (
                    <tr
                      key={a.id}
                      style={{
                        background: selected.includes(a.id) ? "rgba(24,144,255,0.06)" : (isCanceled ? "#fff5f5" : ""),
                        opacity: isCanceled ? 0.7 : 1,
                      }}
                    >
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          disabled={isCanceled}
                        />
                      </td>
                      <td className="num">
                        <Link to={`/simple/${a.id}`} style={{ textDecoration: isCanceled ? "line-through" : "none" }}>
                          {a.docNumber || a.number || a.id?.slice(0, 8)}
                        </Link>
                      </td>
                      <td>{formatDate(a.createdAt || a.date)}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{displayName(a.customer)}</div>
                        {a.customer?.phone && <div className="muted" style={{ fontSize: "0.8rem" }}>{a.customer.phone}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{displayName(a.receiver)}</div>
                        {a.receiver?.phone && <div className="muted" style={{ fontSize: "0.8rem" }}>{a.receiver.phone}</div>}
                      </td>
                      <td>{a.route?.toCity || "—"}</td>
                      <td style={{ textAlign: "center" }}>{a.totals?.seats || "—"}</td>
                      <td style={{ textAlign: "center" }}>{a.totals?.weight ? `${a.totals.weight} кг` : "—"}</td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{a.cargoText || "—"}</td>
                      <td>
                        {isCanceled ? (
                          <span style={{
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}>
                            Аннулирована
                          </span>
                        ) : (
                          <select
                            value={a.status || "act"}
                            onChange={e => updateStatus(a.id, e.target.value)}
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              border: "none",
                              borderRadius: 4,
                              padding: "3px 6px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            <option value="act">В стоке</option>
                            <option value="sent">Подано</option>
                            <option value="done">Отработано</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {isCanceled ? (
                          <button
                            className="btn btn--sm"
                            onClick={() => restoreAct(a)}
                            title="Восстановить накладную"
                            style={{ background: '#52c41a', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
                          >
                            ↩ Восстановить
                          </button>
                        ) : (
                          <button
                            className="btn btn--sm"
                            onClick={() => cancelAct(a)}
                            title="Аннулировать накладную"
                            style={{ background: '#fff', border: '1px solid #ff4d4f', color: '#ff4d4f', fontSize: 11, fontWeight: 600 }}
                          >
                            🗑 Аннулировать
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}