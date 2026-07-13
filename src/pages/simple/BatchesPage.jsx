// import React, { useEffect, useState, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import { api } from "../../shared/api/api.js";
// import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
// import Loader from "../../shared/components/Loader";

// function formatDate(val) {
//   if (!val) return "—";
//   const d = new Date(val);
//   if (isNaN(d.getTime())) return val;
//   return d.toLocaleDateString("ru");
// }

// function getSortValue(b, field) {
//   switch (field) {
//     case 'number':       return (b.number || '').toString().toLowerCase();
//     case 'date':         return new Date(b.createdAt || 0).getTime();
//     case 'city':         return (b.city || '').toString().toLowerCase();
//     case 'driverName':   return (b.driverName || '').toString().toLowerCase();
//     case 'carNumber':    return (b.carNumber || '').toString().toLowerCase();
//     case 'deliveryCost': return Number(b.deliveryCost) || 0;
//     case 'totalSeats':   return Number(b.totalSeats) || 0;
//     case 'totalWeight':  return Number(b.totalWeight) || 0;
//     default:             return '';
//   }
// }

// async function genNextBatchNumber(companyId) {
//   try {
//     // Грузим ВСЕ партии (без фильтра по компании — у партий companyId пустой,
//     // нумерация сквозная по всем)
//     let allBatches = [];
//     try {
//       allBatches = await api.batches.list();
//     } catch (e1) {
//       // на случай если list требует аргумент
//       allBatches = await api.batches.list(companyId);
//     }
//     const pattern = /^П(\d+)$/;
//     let maxNum = 0;
//     (allBatches || []).forEach(b => {
//       const num = b.number;
//       if (num) {
//         const m = String(num).match(pattern);
//         if (m) {
//           const n = parseInt(m[1], 10);
//           // игнорируем аномально большие номера (мусор от старых timestamp-fallback)
//           if (n > maxNum && n < 900000) maxNum = n;
//         }
//       }
//     });
//     return "П" + String(maxNum + 1).padStart(6, "0");
//   } catch (e) {
//     console.warn("Не удалось получить max номер партии, fallback:", e);
//     // Безопасный fallback — не timestamp, а первый номер
//     return "П000001";
//   }
// }

// const EMPTY_FORM = {
//   number: "", city: "", driverName: "", driverPhone: "",
//   carNumber: "", deliveryCost: "",
//   totalSeats: "", totalWeight: "",
//   // Перевозчик / представитель / грузчики
//   needCarrier: false, carrierId: "",
//   needRepresentative: false, representativeId: "",
//   needLoaders: false, loadersCount: "",
// };

// export default function BatchesPage() {
//   const navigate = useNavigate();
//   const [batches, setBatches] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [company, setCompany] = useState(getSelectedCompany());
//   const [showForm, setShowForm] = useState(false);
//   const [editBatch, setEditBatch] = useState(null);
//   const [form, setForm] = useState(EMPTY_FORM);

//   // Справочники
//   const [carriers, setCarriers] = useState([]);
//   const [representatives, setRepresentatives] = useState([]);

//   const [tab, setTab] = useState('active');
  

//   const [sortBy, setSortBy] = useState('date');
//   const [sortOrder, setSortOrder] = useState('desc');

//   const handleSort = (field) => {
//     if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
//     else { setSortBy(field); setSortOrder('asc'); }
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

//   const filteredBatches = useMemo(() => {
//     const filtered = batches.filter(b => tab === 'formed' ? !!b.isFormed : !b.isFormed);
//     return [...filtered].sort((a, b) => {
//       const av = getSortValue(a, sortBy);
//       const bv = getSortValue(b, sortBy);
//       if (av < bv) return sortOrder === 'asc' ? -1 : 1;
//       if (av > bv) return sortOrder === 'asc' ? 1 : -1;
//       return 0;
//     });
//   }, [batches, sortBy, sortOrder, tab]);

//   const tabCounts = useMemo(() => ({
//     active: batches.filter(b => !b.isFormed).length,
//     formed: batches.filter(b => !!b.isFormed).length,
//   }), [batches]);

//   useEffect(() => {
//     return subscribeSelectedCompany(c => setCompany(c));
//   }, []);

//   useEffect(() => {
//     if (!company) { setBatches([]); setLoading(false); return; }
//     load();
//   }, [company]);

//   // Загрузка справочников один раз
//   useEffect(() => {
//     (async () => {
//       try {
//         const [c, r] = await Promise.all([
//           api.carriers.list(),
//           api.representatives.list(),
//         ]);
//         setCarriers(Array.isArray(c) ? c : []);
//         setRepresentatives(Array.isArray(r) ? r : []);
//       } catch (e) {
//         console.error("Не удалось загрузить справочники", e);
//       }
//     })();
//   }, []);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const list = await api.batches.list(company?.id);
//       if (Array.isArray(list)) setBatches(list);
//     } catch(e) {
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const openCreate = async () => {
//     setEditBatch(null);
//     const nextNum = await genNextBatchNumber(company?.id);
//     setForm({ ...EMPTY_FORM, number: nextNum });
//     setShowForm(true);
//   };

//   const openEdit = (batch) => {
//     setEditBatch(batch);
//     setForm({
//       number: batch.number,
//       city: batch.city,
//       driverName: batch.driverName,
//       driverPhone: batch.driverPhone,
//       carNumber: batch.carNumber,
//       deliveryCost: batch.deliveryCost,
//       totalSeats: batch.totalSeats || "",
//       totalWeight: batch.totalWeight || "",
//       needCarrier: !!batch.carrierId,
//       carrierId: batch.carrierId || "",
//       needRepresentative: !!batch.representativeId,
//       representativeId: batch.representativeId || "",
//       needLoaders: (batch.loadersCount || 0) > 0,
//       loadersCount: batch.loadersCount || "",
//     });
//     setShowForm(true);
//   };

//   const handleSave = async () => {
//     if (!form.number || !form.city) return alert("Укажите номер и город");
//     try {
//       const payload = {
//         ...form,
//         totalSeats: parseInt(form.totalSeats) || 0,
//         totalWeight: parseFloat(form.totalWeight) || 0,
//         // Если галочка снята — поле обнуляем
//         carrierId: form.needCarrier ? (form.carrierId || null) : null,
//         representativeId: form.needRepresentative ? (form.representativeId || null) : null,
//         loadersCount: form.needLoaders ? (parseInt(form.loadersCount) || 0) : 0,
//       };
//       // Чистим вспомогательные флаги перед отправкой
//       delete payload.needCarrier;
//       delete payload.needRepresentative;
//       delete payload.needLoaders;

//       if (editBatch) {
//         await api.batches.update(editBatch.id, payload);
//       } else {
//         await api.batches.create({ ...payload, companyId: company?.id, requestIds: "[]" });
//       }
//       setShowForm(false);
//       load();
//     } catch(e) {
//       alert("Ошибка: " + e.message);
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("Удалить партию?")) return;
//     try {
//       await api.batches.delete(id);
//       load();
//     } catch(e) {
//       alert("Ошибка: " + e.message);
//     }
//   };

//   const handleForm = async (batch) => {
//     if (!window.confirm(
//       `Сформировать партию №${batch.number}?\n\n` +
//       `После формирования партия перейдёт в раздел "Сформированные" и будет сохранена ведомость.`
//     )) return;
//     try {
//       let requestIds = [];
//       try { requestIds = JSON.parse(batch.requestIds); } catch(e) {}

//       const vedomostData = JSON.stringify({
//         formedAt: new Date().toISOString(),
//         number: batch.number,
//         city: batch.city,
//         driverName: batch.driverName,
//         driverPhone: batch.driverPhone,
//         carNumber: batch.carNumber,
//         deliveryCost: batch.deliveryCost,
//         totalSeats: batch.totalSeats || 0,
//         totalWeight: batch.totalWeight || 0,
//         requestsCount: requestIds.length,
//         company: company?.name || '',
//       });

//       await api.batches.update(batch.id, {
//         isFormed: true,
//         formedAt: new Date().toISOString(),
//         vedomostData,
//       });
//       load();
//     } catch(e) {
//       alert("Ошибка при формировании: " + e.message);
//     }
//   };

//   const handleUnform = async (batch) => {
//     if (!window.confirm(`Вернуть партию №${batch.number} в активные?`)) return;
//     try {
//       await api.batches.update(batch.id, {
//         isFormed: false,
//         formedAt: null,
//       });
//       load();
//     } catch(e) {
//       alert("Ошибка: " + e.message);
//     }
//   };

//   const printVedomost = async (batch) => {
//     let requestIds = [];
//     try { requestIds = JSON.parse(batch.requestIds || "[]"); } catch(e) {}

//     let reqs = [];
//     if (requestIds.length > 0) {
//       reqs = await Promise.all(
//         requestIds.map(rid => api.requests.get(rid).catch(() => null))
//       );
//       reqs = reqs.filter(Boolean);
//     }

//     const { toDataURL } = await import("qrcode");
//     const qrUrl = await toDataURL(`TASU-BATCH-${batch.number}`, { width: 100, margin: 1 });

//     const rows = reqs.map((r, i) => {
//       let details = {};
//       try { details = JSON.parse(r.details || "{}"); } catch (e) {}
//       const recv = details.receiver || {};
//       const route = details.route || {};
//       const totals = details.totals || {};
//       return `<tr>
//         <td style="text-align:center">${i + 1}</td>
//         <td>${r.docNumber || details.docNumber || r.id || "—"}</td>
//         <td>${recv.fio || "—"}</td>
//         <td>${recv.phone || "—"}</td>
//         <td style="text-align:center">${totals.seats || "—"}</td>
//         <td style="text-align:center">${totals.weight ? totals.weight + " кг" : "—"}</td>
//         <td>${route.toCity || batch.city || "—"}</td>
//       </tr>`;
//     }).join("");

//     const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Грузовая ведомость ${batch.number}</title>
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
//         <div class="sub">${company?.name || ""} &nbsp;&nbsp; Партия № ${batch.number} &nbsp;&nbsp; Город: ${batch.city || "—"} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")}</div>
//       </div>
//       <img src="${qrUrl}" width="80" height="80" style="border:1px solid #ccc;padding:3px;"/>
//     </div>
//     ${rows ? `<table>
//       <thead>
//         <tr>
//           <th style="width:30px">№</th>
//           <th>Номер накладной</th>
//           <th>Получатель</th>
//           <th style="width:130px">Номер телефона</th>
//           <th style="width:50px">Мест</th>
//           <th style="width:60px">Вес</th>
//           <th style="width:90px">Город</th>
//         </tr>
//       </thead>
//       <tbody>${rows}</tbody>
//     </table>` : '<div style="color:#888;font-style:italic;margin-top:16px;">В партии нет накладных</div>'}
//     <div class="signatures">
//       <div class="sig"><div class="sig-line"></div><div class="sig-label">Выдал (ФИО, подпись)</div></div>
//       <div class="sig"><div class="sig-line"></div><div class="sig-label">Принял (ФИО, подпись)</div></div>
//     </div>
//     <script>window.onload=function(){window.print();}</script>
//     </body></html>`;

//     const blob = new Blob([html], { type: "text/html; charset=utf-8" });
//     window.open(URL.createObjectURL(blob), "_blank");
//   };

//   return (
//     <>
//       <div className="navbar">
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <h1>Партии</h1>
//           <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
//           {company && <div className="chip">{company.name}</div>}
//         </div>
//         <button className="btn btn--accent" onClick={openCreate}>+ Новая партия</button>
//         <button className="btn" onClick={() => navigate("/simple/carrier-vedomost/new")}>
//   📦 Ведомость перевозчика
// </button>
//       </div>

//       <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
//         <button
//           className={`btn ${tab === 'active' ? 'btn--accent' : ''}`}
//           onClick={() => setTab('active')}
//         >
//           🟢 Активные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.active})</span>
//         </button>
//         <button
//           className={`btn ${tab === 'formed' ? 'btn--accent' : ''}`}
//           onClick={() => setTab('formed')}
//         >
//           ✅ Сформированные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.formed})</span>
//         </button>
//       </div>

//       {showForm && (
//         <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
//           <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, width: 520, maxWidth: "95vw", maxHeight: '90vh', overflowY: 'auto' }}>
//             <h2 style={{ margin: "0 0 16px" }}>{editBatch ? "Редактировать партию" : "Новая партия"}</h2>
//             <div className="form_grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//               <div className="field">
//                 <div className="label">Номер партии *</div>
//                 <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="П000001" />
//               </div>
//               <div className="field">
//                 <div className="label">Город назначения *</div>
//                 <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Астана" />
//               </div>
//               <div className="field">
//                 <div className="label">ФИО водителя</div>
//                 <input value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} placeholder="Иванов Иван" />
//               </div>
//               <div className="field">
//                 <div className="label">Телефон водителя</div>
//                 <input value={form.driverPhone} onChange={e => setForm({ ...form, driverPhone: e.target.value })} placeholder="+7 777 123 45 67" />
//               </div>
//               <div className="field">
//                 <div className="label">Номер авто</div>
//                 <input value={form.carNumber} onChange={e => setForm({ ...form, carNumber: e.target.value })} placeholder="777 ABC 01" />
//               </div>
//               <div className="field">
//                 <div className="label">Стоимость перевозки (тг)</div>
//                 <input type="number" value={form.deliveryCost} onChange={e => setForm({ ...form, deliveryCost: e.target.value })} placeholder="0" />
//               </div>
//               <div className="field">
//                 <div className="label">Количество мест</div>
//                 <input type="number" value={form.totalSeats} onChange={e => setForm({ ...form, totalSeats: e.target.value })} placeholder="0" />
//               </div>
//               <div className="field">
//                 <div className="label">Общий вес (кг)</div>
//                 <input type="number" value={form.totalWeight} onChange={e => setForm({ ...form, totalWeight: e.target.value })} placeholder="0" />
//               </div>
//             </div>

//             {/* Перевозчик / представитель / грузчики */}
//             <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
//               <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Доп. участники партии</div>

//               <div>
//                 <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
//                   <input type="checkbox" checked={form.needCarrier} onChange={e => setForm({ ...form, needCarrier: e.target.checked })} />
//                   🚚 Нужен перевозчик
//                 </label>
//                 {form.needCarrier && (
//                   <select
//                     value={form.carrierId}
//                     onChange={e => setForm({ ...form, carrierId: e.target.value })}
//                     style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
//                   >
//                     <option value="">— выберите перевозчика —</option>
//                     {carriers.map(c => (
//                       <option key={c.id} value={c.id}>{c.name}{c.city ? ` (${c.city})` : ''}{c.phone ? ` · ${c.phone}` : ''}</option>
//                     ))}
//                   </select>
//                 )}
//               </div>

//               <div>
//                 <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
//                   <input type="checkbox" checked={form.needRepresentative} onChange={e => setForm({ ...form, needRepresentative: e.target.checked })} />
//                   🧑‍💼 Нужен представитель
//                 </label>
//                 {form.needRepresentative && (
//                   <select
//                     value={form.representativeId}
//                     onChange={e => setForm({ ...form, representativeId: e.target.value })}
//                     style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
//                   >
//                     <option value="">— выберите представителя —</option>
//                     {representatives.map(r => (
//                       <option key={r.id} value={r.id}>{r.name}{r.city ? ` (${r.city})` : ''}{r.phone ? ` · ${r.phone}` : ''}</option>
//                     ))}
//                   </select>
//                 )}
//               </div>

//               <div>
//                 <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
//                   <input type="checkbox" checked={form.needLoaders} onChange={e => setForm({ ...form, needLoaders: e.target.checked })} />
//                   💪 Нужны грузчики
//                 </label>
//                 {form.needLoaders && (
//                   <input
//                     type="number"
//                     min="0"
//                     value={form.loadersCount}
//                     onChange={e => setForm({ ...form, loadersCount: e.target.value })}
//                     placeholder="Количество грузчиков"
//                     style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
//                   />
//                 )}
//               </div>
//             </div>

//             <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
//               <button className="btn btn--accent" onClick={handleSave}>Сохранить</button>
//               <button className="btn" onClick={() => setShowForm(false)}>Отмена</button>
//             </div>
//           </div>
//         </div>
//       )}

//       <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, fontSize: '0.85rem', color: '#854d0e' }}>
//         💡 Кликни по строке партии, чтобы открыть её детали и список накладных
//       </div>

//       <div className="table_wrap" style={{ marginTop: 16 }}>
//         {loading ? <Loader /> : (
//           <table className="table_fixed">
//             <thead>
//               <tr>
//                 <SortableTh field="number" style={{ width: 120 }}>Номер</SortableTh>
//                 <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
//                 <SortableTh field="city">Город</SortableTh>
//                 <SortableTh field="driverName">Водитель</SortableTh>
//                 <SortableTh field="carNumber">Авто</SortableTh>
//                 <SortableTh field="totalSeats" style={{ width: 80, textAlign: 'center' }}>Мест</SortableTh>
//                 <SortableTh field="totalWeight" style={{ width: 100, textAlign: 'center' }}>Вес</SortableTh>
//                 <SortableTh field="deliveryCost" style={{ width: 130 }}>Стоимость</SortableTh>
//                 <th style={{ width: 280 }}>Действия</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredBatches.length === 0 ? (
//                 <tr><td colSpan={9} className="muted" style={{ padding: 16 }}>
//                   {!company ? "Выберите компанию." :
//                     tab === 'active' ? 'Нет активных партий' : 'Нет сформированных партий'}
//                 </td></tr>
//               ) : (
//                 filteredBatches.map(b => (
//                   <tr
//                     key={b.id}
//                     onClick={(e) => {
//                       if (e.target.closest('button') || e.target.closest('.actions-cell')) return;
//                       navigate(`/simple/batches/${b.id}`);
//                     }}
//                     style={{
//                       borderLeft: b.isFormed ? '4px solid #22c55e' : '4px solid transparent',
//                       cursor: 'pointer',
//                       transition: 'background 0.15s',
//                     }}
//                     onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
//                     onMouseLeave={(e) => e.currentTarget.style.background = ''}
//                   >
//                     <td style={{ fontWeight: 700 }}>
//                       {b.number}
//                       {b.isFormed && (
//                         <div style={{
//                           fontSize: '0.65rem',
//                           padding: '1px 6px',
//                           background: '#d1fae5',
//                           color: '#065f46',
//                           borderRadius: 3,
//                           fontWeight: 700,
//                           marginTop: 2,
//                           display: 'inline-block',
//                         }}>
//                           ✓ {formatDate(b.formedAt)}
//                         </div>
//                       )}
//                     </td>
//                     <td>{formatDate(b.createdAt)}</td>
//                     <td>{b.city}</td>
//                     <td>
//                       <div>{b.driverName || "—"}</div>
//                       {b.driverPhone && <div className="muted" style={{ fontSize: "0.8rem" }}>{b.driverPhone}</div>}
//                     </td>
//                     <td>{b.carNumber || "—"}</td>
//                     <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.totalSeats || "—"}</td>
//                     <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.totalWeight ? `${Number(b.totalWeight).toLocaleString()} кг` : "—"}</td>
//                     <td>{b.deliveryCost ? `${Number(b.deliveryCost).toLocaleString()} тг` : "—"}</td>
//                     <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
//                       <div style={{ display: "flex", gap: 6, flexWrap: 'wrap' }}>
//                         <button
//                           className="btn btn--sm"
//                           onClick={() => navigate(`/simple/batches/${b.id}`)}
//                           title="Открыть детали партии"
//                           style={{ background: '#2563eb', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
//                         >
//                           👁 Открыть
//                         </button>
//                         <button
//                           className="btn btn--sm"
//                           onClick={() => printVedomost(b)}
//                           title="Распечатать ведомость"
//                           style={{ fontSize: 11 }}
//                         >
//                           🖨 Печать
//                         </button>
//                         {b.isFormed ? (
//                           <button
//                             className="btn btn--sm"
//                             onClick={() => handleUnform(b)}
//                             title="Вернуть в активные"
//                             style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', fontSize: 11 }}
//                           >
//                             ↩ В активные
//                           </button>
//                         ) : (
//                           <button
//                             className="btn btn--sm"
//                             onClick={() => handleForm(b)}
//                             title="Сформировать партию"
//                             style={{ background: '#22c55e', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
//                           >
//                             ✓ Сформировать
//                           </button>
//                         )}
//                         <button className="btn btn--sm" onClick={() => openEdit(b)} title="Редактировать">
//                           <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
//                         </button>
//                         <button className="btn btn--sm" onClick={() => handleDelete(b.id)} title="Удалить" style={{ color: "#ff4d4f" }}>
//                           <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         )}
//       </div>
//     </>
//   );
// }


import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { useAuth } from "../../shared/auth/AuthContext";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("ru");
}

function getSortValue(b, field) {
  switch (field) {
    case 'number':       return (b.number || '').toString().toLowerCase();
    case 'date':         return new Date(b.createdAt || 0).getTime();
    case 'city':         return (b.city || '').toString().toLowerCase();
    case 'driverName':   return (b.driverName || '').toString().toLowerCase();
    case 'carNumber':    return (b.carNumber || '').toString().toLowerCase();
    case 'deliveryCost': return Number(b.deliveryCost) || 0;
    case 'totalSeats':   return Number(b.totalSeats) || 0;
    case 'totalWeight':  return Number(b.totalWeight) || 0;
    default:             return '';
  }
}

async function genNextBatchNumber(companyId) {
  try {
    // Грузим ВСЕ партии (без фильтра по компании — у партий companyId пустой,
    // нумерация сквозная по всем)
    let allBatches = [];
    try {
      allBatches = await api.batches.list();
    } catch (e1) {
      // на случай если list требует аргумент
      allBatches = await api.batches.list(companyId);
    }
    const pattern = /^П(\d+)$/;
    let maxNum = 0;
    (allBatches || []).forEach(b => {
      const num = b.number;
      if (num) {
        const m = String(num).match(pattern);
        if (m) {
          const n = parseInt(m[1], 10);
          // игнорируем аномально большие номера (мусор от старых timestamp-fallback)
          if (n > maxNum && n < 900000) maxNum = n;
        }
      }
    });
    return "П" + String(maxNum + 1).padStart(6, "0");
  } catch (e) {
    console.warn("Не удалось получить max номер партии, fallback:", e);
    // Безопасный fallback — не timestamp, а первый номер
    return "П000001";
  }
}

const EMPTY_FORM = {
  number: "", city: "", driverName: "", driverPhone: "",
  carNumber: "", deliveryCost: "",
  totalSeats: "", totalWeight: "",
  // Перевозчик / представитель / грузчики
  needCarrier: false, carrierId: "",
  needRepresentative: false, representativeId: "",
  needLoaders: false, loadersCount: "",
};

export default function BatchesPage() {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(getSelectedCompany());
  const [showForm, setShowForm] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Справочники
  const [carriers, setCarriers] = useState([]);
  const [representatives, setRepresentatives] = useState([]);

  const [tab, setTab] = useState('active');

  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // ТЗ: выбор партий галочками для формирования ведомости перевозчика
  const [selectedForVedomost, setSelectedForVedomost] = useState({});

  // Свободные накладные (не входящие в партии) + выбор для текущей партии
  const [freeRequests, setFreeRequests] = useState([]);
  const [selectedReqIds, setSelectedReqIds] = useState([]);

  const toggleVedomostSelect = (id) => {
    setSelectedForVedomost(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedVedomostCount = useMemo(
    () => Object.values(selectedForVedomost).filter(Boolean).length,
    [selectedForVedomost]
  );

  const goToCreateVedomost = () => {
    const ids = Object.keys(selectedForVedomost).filter(id => selectedForVedomost[id]);
    if (ids.length === 0) return;
    navigate(`/simple/carrier-vedomost/new?ids=${ids.join(',')}`);
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
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

  const filteredBatches = useMemo(() => {
    const filtered = batches.filter(b => tab === 'formed' ? !!b.isFormed : !b.isFormed);
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [batches, sortBy, sortOrder, tab]);

  const tabCounts = useMemo(() => ({
    active: batches.filter(b => !b.isFormed).length,
    formed: batches.filter(b => !!b.isFormed).length,
  }), [batches]);

  useEffect(() => {
    return subscribeSelectedCompany(c => setCompany(c));
  }, []);

  useEffect(() => {
    if (!company) { setBatches([]); setLoading(false); return; }
    load();
  }, [company]);

  // Загрузка справочников один раз
  useEffect(() => {
    (async () => {
      try {
        const [c, r] = await Promise.all([
          api.carriers.list(),
          api.representatives.list(),
        ]);
        setCarriers(Array.isArray(c) ? c : []);
        setRepresentatives(Array.isArray(r) ? r : []);
      } catch (e) {
        console.error("Не удалось загрузить справочники", e);
      }
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.batches.list(company?.id);
      if (Array.isArray(list)) setBatches(list);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка свободных накладных: статус act, ещё не в какой-либо партии.
  // Возвращает нормализованные объекты { id, number, city, receiver, seats, weight }.
  const loadFreeRequests = async (currentBatchRequestIds = []) => {
    try {
      const [reqs, allBatches] = await Promise.all([
        api.requests.list(),
        api.batches.list(),
      ]);

      // Собираем id всех накладных, уже занятых партиями (кроме редактируемой)
      const busy = new Set();
      (allBatches || []).forEach(b => {
        if (editBatch && b.id === editBatch.id) return;
        let ids = [];
        try { ids = JSON.parse(b.requestIds || "[]"); } catch (e) { ids = []; }
        (ids || []).forEach(id => busy.add(id));
      });

      const free = (reqs || [])
        .filter(r => {
          const status = r.status || "";
          // берём готовые накладные (act) и простые (SIMPLE); черновики пропускаем
          const isReady = status === "act" || r.type === "SIMPLE" || status === "";
          return isReady && !busy.has(r.id);
        })
        .map(r => {
          let d = {};
          try { d = typeof r.details === "string" ? JSON.parse(r.details) : (r.details || {}); } catch (e) { d = {}; }
          const totals = d.totals || {};
          const receiver = d.receiver || {};
          const route = d.route || {};
          return {
            id: r.id,
            number: d.docNumber || r.docNumber || r.number || "—",
            city: route.toCity || "—",
            receiver: receiver.fio || receiver.companyName || "—",
            seats: Number(totals.seats) || 0,
            weight: Number(totals.weight) || 0,
          };
        });

      setFreeRequests(free);
      setSelectedReqIds(currentBatchRequestIds);
    } catch (e) {
      console.error("Не удалось загрузить свободные накладные", e);
      setFreeRequests([]);
    }
  };

  // Накладные, отсортированные: совпадающие с городом партии — сверху
  const sortedFreeRequests = useMemo(() => {
    const cityClean = (form.city || "").trim().toLowerCase();
    return [...freeRequests].sort((a, b) => {
      const ma = (a.city || "").trim().toLowerCase() === cityClean ? 0 : 1;
      const mb = (b.city || "").trim().toLowerCase() === cityClean ? 0 : 1;
      if (ma !== mb) return ma - mb;
      return (a.number || "").localeCompare(b.number || "", "ru");
    });
  }, [freeRequests, form.city]);

  // Автоподсчёт веса/мест из выбранных накладных
  const selectedTotals = useMemo(() => {
    let seats = 0, weight = 0;
    freeRequests.forEach(r => {
      if (selectedReqIds.includes(r.id)) { seats += r.seats; weight += r.weight; }
    });
    return { seats, weight };
  }, [freeRequests, selectedReqIds]);

  const toggleReq = (id) => {
    setSelectedReqIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openCreate = async () => {
    setEditBatch(null);
    const nextNum = await genNextBatchNumber(company?.id);
    setForm({ ...EMPTY_FORM, number: nextNum });
    setSelectedReqIds([]);
    await loadFreeRequests([]);
    setShowForm(true);
  };

  const openEdit = (batch) => {
    setEditBatch(batch);
    let existingIds = [];
    try { existingIds = JSON.parse(batch.requestIds || "[]"); } catch (e) { existingIds = []; }
    loadFreeRequests(existingIds);
    setForm({
      number: batch.number,
      city: batch.city,
      driverName: batch.driverName,
      driverPhone: batch.driverPhone,
      carNumber: batch.carNumber,
      deliveryCost: batch.deliveryCost,
      totalSeats: batch.totalSeats || "",
      totalWeight: batch.totalWeight || "",
      needCarrier: !!batch.carrierId,
      carrierId: batch.carrierId || "",
      needRepresentative: !!batch.representativeId,
      representativeId: batch.representativeId || "",
      needLoaders: (batch.loadersCount || 0) > 0,
      loadersCount: batch.loadersCount || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.number || !form.city) return alert("Укажите номер и город");
    try {
      const payload = {
        ...form,
        // вес/места считаются из выбранных накладных
        totalSeats: selectedTotals.seats,
        totalWeight: selectedTotals.weight,
        requestIds: JSON.stringify(selectedReqIds),
        // Если галочка снята — поле обнуляем
        carrierId: form.needCarrier ? (form.carrierId || null) : null,
        representativeId: form.needRepresentative ? (form.representativeId || null) : null,
        loadersCount: form.needLoaders ? (parseInt(form.loadersCount) || 0) : 0,
      };
      // Чистим вспомогательные флаги перед отправкой
      delete payload.needCarrier;
      delete payload.needRepresentative;
      delete payload.needLoaders;

      if (editBatch) {
        await api.batches.update(editBatch.id, payload);
      } else {
        await api.batches.create({ ...payload, companyId: company?.id });
      }
      setShowForm(false);
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить партию?")) return;
    try {
      await api.batches.delete(id);
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const handleForm = async (batch) => {
    if (!window.confirm(
      `Сформировать партию №${batch.number}?\n\n` +
      `После формирования партия перейдёт в раздел "Сформированные" и будет сохранена ведомость.`
    )) return;
    try {
      let requestIds = [];
      try { requestIds = JSON.parse(batch.requestIds); } catch(e) {}

      const vedomostData = JSON.stringify({
        formedAt: new Date().toISOString(),
        number: batch.number,
        city: batch.city,
        driverName: batch.driverName,
        driverPhone: batch.driverPhone,
        carNumber: batch.carNumber,
        deliveryCost: batch.deliveryCost,
        totalSeats: batch.totalSeats || 0,
        totalWeight: batch.totalWeight || 0,
        requestsCount: requestIds.length,
        company: company?.name || '',
      });

      await api.batches.update(batch.id, {
        isFormed: true,
        formedAt: new Date().toISOString(),
        vedomostData,
      });
      load();
    } catch(e) {
      alert("Ошибка при формировании: " + e.message);
    }
  };

  const handleUnform = async (batch) => {
    if (!window.confirm(`Вернуть партию №${batch.number} в активные?`)) return;
    try {
      await api.batches.update(batch.id, {
        isFormed: false,
        formedAt: null,
      });
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const printVedomost = async (batch) => {
    let requestIds = [];
    try { requestIds = JSON.parse(batch.requestIds || "[]"); } catch(e) {}

    let reqs = [];
    if (requestIds.length > 0) {
      reqs = await Promise.all(
        requestIds.map(rid => api.requests.get(rid).catch(() => null))
      );
      reqs = reqs.filter(Boolean);
    }

    const { toDataURL } = await import("qrcode");
    const qrUrl = await toDataURL(`TASU-BATCH-${batch.number}`, { width: 100, margin: 1 });

    const rows = reqs.map((r, i) => {
      let details = {};
      try { details = JSON.parse(r.details || "{}"); } catch (e) {}
      const recv = details.receiver || {};
      const route = details.route || {};
      const totals = details.totals || {};
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${r.docNumber || details.docNumber || r.id || "—"}</td>
        <td>${recv.fio || "—"}</td>
        <td>${recv.phone || "—"}</td>
        <td style="text-align:center">${totals.seats || "—"}</td>
        <td style="text-align:center">${totals.weight ? totals.weight + " кг" : "—"}</td>
        <td>${route.toCity || batch.city || "—"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Грузовая ведомость ${batch.number}</title>
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
        <div class="sub">${company?.name || ""} &nbsp;&nbsp; Партия № ${batch.number} &nbsp;&nbsp; Город: ${batch.city || "—"} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")}</div>
      </div>
      <img src="${qrUrl}" width="80" height="80" style="border:1px solid #ccc;padding:3px;"/>
    </div>
    ${rows ? `<table>
      <thead>
        <tr>
          <th style="width:30px">№</th>
          <th>Номер накладной</th>
          <th>Получатель</th>
          <th style="width:130px">Номер телефона</th>
          <th style="width:50px">Мест</th>
          <th style="width:60px">Вес</th>
          <th style="width:90px">Город</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` : '<div style="color:#888;font-style:italic;margin-top:16px;">В партии нет накладных</div>'}
    <div class="signatures">
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Выдал (ФИО, подпись)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Принял (ФИО, подпись)</div></div>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Партии</h1>
          <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
          {company && <div className="chip">{company.name}</div>}
        </div>
        <button className="btn btn--accent" onClick={openCreate}>+ Новая партия</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className={`btn ${tab === 'active' ? 'btn--accent' : ''}`}
          onClick={() => setTab('active')}
        >
          🟢 Активные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.active})</span>
        </button>
        <button
          className={`btn ${tab === 'formed' ? 'btn--accent' : ''}`}
          onClick={() => setTab('formed')}
        >
          ✅ Сформированные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.formed})</span>
        </button>
      </div>

      {!isManager && tab === 'formed' && selectedVedomostCount > 0 && (
        <div style={{
          marginTop: 12, padding: '12px 16px', background: '#eef2ff', border: '1px solid #c7d2fe',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
        }}>
          <div style={{ fontWeight: 700 }}>Выбрано партий: {selectedVedomostCount}</div>
          <button className="btn btn--accent" onClick={goToCreateVedomost}>
            📦 Сформировать ведомость перевозчика
          </button>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, width: 520, maxWidth: "95vw", maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: "0 0 16px" }}>{editBatch ? "Редактировать партию" : "Новая партия"}</h2>
            <div className="form_grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <div className="label">Номер партии *</div>
                <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="П000001" />
              </div>
              <div className="field">
                <div className="label">Город назначения *</div>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Астана" />
              </div>
              <div className="field">
                <div className="label">ФИО водителя</div>
                <input value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} placeholder="Иванов Иван" />
              </div>
              <div className="field">
                <div className="label">Телефон водителя</div>
                <input value={form.driverPhone} onChange={e => setForm({ ...form, driverPhone: e.target.value })} placeholder="+7 777 123 45 67" />
              </div>
              <div className="field">
                <div className="label">Номер авто</div>
                <input value={form.carNumber} onChange={e => setForm({ ...form, carNumber: e.target.value })} placeholder="777 ABC 01" />
              </div>
              <div className="field">
                <div className="label">Стоимость перевозки (тг)</div>
                <input type="number" value={form.deliveryCost} onChange={e => setForm({ ...form, deliveryCost: e.target.value })} placeholder="0" />
              </div>
              <div className="field">
                <div className="label">Количество мест <span style={{ color: '#94a3b8', fontWeight: 400 }}>(из накладных)</span></div>
                <input type="number" value={selectedTotals.seats} readOnly style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>
              <div className="field">
                <div className="label">Общий вес, кг <span style={{ color: '#94a3b8', fontWeight: 400 }}>(из накладных)</span></div>
                <input type="number" value={selectedTotals.weight} readOnly style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>
            </div>

            {/* Выбор накладных в партию */}
            <div style={{ marginTop: 16, padding: 14, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
                  Накладные в партии
                </div>
                <div style={{ fontSize: '0.8rem', color: '#0369a1' }}>
                  выбрано: <strong>{selectedReqIds.length}</strong> · {selectedTotals.weight} кг · {selectedTotals.seats} мест
                </div>
              </div>

              {sortedFreeRequests.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '8px 0' }}>
                  Нет свободных накладных. Создайте накладную (Упрощённый режим) или заявку — она появится здесь.
                </div>
              ) : (
                <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sortedFreeRequests.map(r => {
                    const cityMatch = (r.city || "").trim().toLowerCase() === (form.city || "").trim().toLowerCase();
                    const checked = selectedReqIds.includes(r.id);
                    return (
                      <label key={r.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer',
                        background: checked ? '#dbeafe' : '#fff',
                        border: `1px solid ${checked ? '#60a5fa' : '#e2e8f0'}`, borderRadius: 6,
                      }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleReq(r.id)} />
                        <span style={{ fontWeight: 700, minWidth: 90 }}>{r.number}</span>
                        <span style={{ flex: 1, fontSize: '0.85rem' }}>{r.receiver}</span>
                        <span style={{ fontSize: '0.8rem', color: cityMatch ? '#059669' : '#64748b', fontWeight: cityMatch ? 700 : 400 }}>
                          {r.city}{cityMatch ? ' ✓' : ''}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#475569', minWidth: 60, textAlign: 'right' }}>{r.weight} кг</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 8 }}>
                Совпадающие с городом «{form.city || '—'}» отмечены ✓ и показаны сверху. Можно добавить и попутные из других городов.
              </div>
            </div>

            {/* Перевозчик / представитель / грузчики */}
            <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Доп. участники партии</div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.needCarrier} onChange={e => setForm({ ...form, needCarrier: e.target.checked })} />
                  🚚 Нужен перевозчик
                </label>
                {form.needCarrier && (
                  <select
                    value={form.carrierId}
                    onChange={e => setForm({ ...form, carrierId: e.target.value })}
                    style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    <option value="">— выберите перевозчика —</option>
                    {carriers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.city ? ` (${c.city})` : ''}{c.phone ? ` · ${c.phone}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.needRepresentative} onChange={e => setForm({ ...form, needRepresentative: e.target.checked })} />
                  🧑‍💼 Нужен представитель
                </label>
                {form.needRepresentative && (
                  <select
                    value={form.representativeId}
                    onChange={e => setForm({ ...form, representativeId: e.target.value })}
                    style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    <option value="">— выберите представителя —</option>
                    {representatives.map(r => (
                      <option key={r.id} value={r.id}>{r.name}{r.city ? ` (${r.city})` : ''}{r.phone ? ` · ${r.phone}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.needLoaders} onChange={e => setForm({ ...form, needLoaders: e.target.checked })} />
                  💪 Нужны грузчики
                </label>
                {form.needLoaders && (
                  <input
                    type="number"
                    min="0"
                    value={form.loadersCount}
                    onChange={e => setForm({ ...form, loadersCount: e.target.value })}
                    placeholder="Количество грузчиков"
                    style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn--accent" onClick={handleSave}>Сохранить</button>
              <button className="btn" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, fontSize: '0.85rem', color: '#854d0e' }}>
        💡 Кликни по строке партии, чтобы открыть её детали и список накладных
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                {!isManager && tab === 'formed' && <th style={{ width: 36 }}></th>}
                <SortableTh field="number" style={{ width: 120 }}>Номер</SortableTh>
                <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
                <SortableTh field="city">Город</SortableTh>
                <SortableTh field="driverName">Водитель</SortableTh>
                <SortableTh field="carNumber">Авто</SortableTh>
                <SortableTh field="totalSeats" style={{ width: 80, textAlign: 'center' }}>Мест</SortableTh>
                <SortableTh field="totalWeight" style={{ width: 100, textAlign: 'center' }}>Вес</SortableTh>
                <SortableTh field="deliveryCost" style={{ width: 130 }}>Стоимость</SortableTh>
                <th style={{ width: 280 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length === 0 ? (
                <tr><td colSpan={(!isManager && tab === 'formed') ? 10 : 9} className="muted" style={{ padding: 16 }}>
                  {!company ? "Выберите компанию." :
                    tab === 'active' ? 'Нет активных партий' : 'Нет сформированных партий'}
                </td></tr>
              ) : (
                filteredBatches.map(b => (
                  <tr
                    key={b.id}
                    onClick={(e) => {
                      if (e.target.closest('button') || e.target.closest('.actions-cell') || e.target.closest('.checkbox-cell')) return;
                      navigate(`/simple/batches/${b.id}`);
                    }}
                    style={{
                      borderLeft: b.isFormed ? '4px solid #22c55e' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    {!isManager && tab === 'formed' && (
                      <td className="checkbox-cell" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={!!selectedForVedomost[b.id]}
                          onChange={() => toggleVedomostSelect(b.id)}
                        />
                      </td>
                    )}
                    <td style={{ fontWeight: 700 }}>
                      {b.number}
                      {b.isFormed && (
                        <div style={{
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          background: '#d1fae5',
                          color: '#065f46',
                          borderRadius: 3,
                          fontWeight: 700,
                          marginTop: 2,
                          display: 'inline-block',
                        }}>
                          ✓ {formatDate(b.formedAt)}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>{b.city}</td>
                    <td>
                      <div>{b.driverName || "—"}</div>
                      {b.driverPhone && <div className="muted" style={{ fontSize: "0.8rem" }}>{b.driverPhone}</div>}
                    </td>
                    <td>{b.carNumber || "—"}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.totalSeats || "—"}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.totalWeight ? `${Number(b.totalWeight).toLocaleString()} кг` : "—"}</td>
                    <td>{b.deliveryCost ? `${Number(b.deliveryCost).toLocaleString()} тг` : "—"}</td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn--sm"
                          onClick={() => navigate(`/simple/batches/${b.id}`)}
                          title="Открыть детали партии"
                          style={{ background: '#2563eb', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
                        >
                          👁 Открыть
                        </button>
                        <button
                          className="btn btn--sm"
                          onClick={() => printVedomost(b)}
                          title="Распечатать ведомость"
                          style={{ fontSize: 11 }}
                        >
                          🖨 Печать
                        </button>
                        {b.isFormed ? (
                          <button
                            className="btn btn--sm"
                            onClick={() => handleUnform(b)}
                            title="Вернуть в активные"
                            style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', fontSize: 11 }}
                          >
                            ↩ В активные
                          </button>
                        ) : (
                          <button
                            className="btn btn--sm"
                            onClick={() => handleForm(b)}
                            title="Сформировать партию"
                            style={{ background: '#22c55e', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
                          >
                            ✓ Сформировать
                          </button>
                        )}
                        <button className="btn btn--sm" onClick={() => openEdit(b)} title="Редактировать">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        <button className="btn btn--sm" onClick={() => handleDelete(b.id)} title="Удалить" style={{ color: "#ff4d4f" }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}