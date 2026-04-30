// import React, { useEffect, useState } from "react";
// import { api } from "../../shared/api/api.js";
// import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
// import Loader from "../../shared/components/Loader";

// function formatDate(val) {
//   if (!val) return "—";
//   const d = new Date(val);
//   if (isNaN(d.getTime())) return val;
//   return d.toLocaleDateString("ru");
// }

// export default function BatchesPage() {
//   const [batches, setBatches] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [company, setCompany] = useState(getSelectedCompany());
//   const [showForm, setShowForm] = useState(false);
//   const [editBatch, setEditBatch] = useState(null);
//   const [form, setForm] = useState({
//     number: "", city: "", driverName: "", driverPhone: "", carNumber: "", deliveryCost: "",
//   });

//   useEffect(() => {
//     return subscribeSelectedCompany(c => setCompany(c));
//   }, []);

//   useEffect(() => {
//     if (!company) { setBatches([]); setLoading(false); return; }
//     load();
//   }, [company]);

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

//   const openCreate = () => {
//     setEditBatch(null);
//     setForm({ number: "П" + String(Date.now()).slice(-6), city: "", driverName: "", driverPhone: "", carNumber: "", deliveryCost: "" });
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
//     });
//     setShowForm(true);
//   };

//   const handleSave = async () => {
//     if (!form.number || !form.city) return alert("Укажите номер и город");
//     try {
//       if (editBatch) {
//         await api.batches.update(editBatch.id, form);
//       } else {
//         await api.batches.create({ ...form, companyId: company?.id, requestIds: [] });
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

//   const printVedomost = async (batch) => {
//     let requestIds = [];
//     try { requestIds = JSON.parse(batch.requestIds); } catch(e) {}

//     const { toDataURL } = await import("qrcode");
//     const qrUrl = await toDataURL(`TASU-BATCH-${batch.number}`, { width: 100, margin: 1 });

//     const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Партия ${batch.number}</title>
//     <style>
//       body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
//       h2 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
//       .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #000; }
//       .info { display: flex; gap: 0; border: 1px solid #aaa; margin-bottom: 16px; }
//       .info-cell { flex: 1; padding: 8px 12px; border-right: 1px solid #aaa; font-size: 11px; }
//       .info-cell:last-child { border-right: none; }
//       .info-label { color: #666; font-size: 10px; margin-bottom: 2px; }
//       .info-val { font-weight: 700; font-size: 13px; }
//       .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 30px; }
//       .sig { flex: 1; }
//       .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 28px; }
//       .sig-label { font-size: 10px; color: #333; text-align: center; }
//     </style></head><body>
//     <div class="header">
//       <div>
//         <h2>Партия № ${batch.number}</h2>
//         <div style="color:#333;font-size:11px;margin-top:4px;">${company?.name || ""} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")} &nbsp;&nbsp; Город: ${batch.city}</div>
//       </div>
//       <img src="${qrUrl}" width="90" height="90" style="border:1px solid #ccc;padding:3px;"/>
//     </div>
//     <div class="info">
//       <div class="info-cell"><div class="info-label">Водитель</div><div class="info-val">${batch.driverName || "—"}</div></div>
//       <div class="info-cell"><div class="info-label">Телефон водителя</div><div class="info-val">${batch.driverPhone || "—"}</div></div>
//       <div class="info-cell"><div class="info-label">Номер авто</div><div class="info-val">${batch.carNumber || "—"}</div></div>
//       <div class="info-cell"><div class="info-label">Стоимость перевозки</div><div class="info-val">${batch.deliveryCost ? Number(batch.deliveryCost).toLocaleString() + " тг" : "—"}</div></div>
//     </div>
//     <div style="margin-top:8px;font-size:11px;color:#666;">Накладных в партии: ${requestIds.length}</div>
//     <div class="signatures">
//       <div class="sig"><div class="sig-line"></div><div class="sig-label">Перевозчик (подпись, М.П.)</div></div>
//       <div class="sig"><div class="sig-line"></div><div class="sig-label">Отправитель (подпись, М.П.)</div></div>
//       <div class="sig"><div class="sig-line"></div><div class="sig-label">Получатель (подпись, М.П.)</div></div>
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
//       </div>

//       {showForm && (
//         <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
//           <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, width: 480, maxWidth: "95vw" }}>
//             <h2 style={{ margin: "0 0 16px" }}>{editBatch ? "Редактировать партию" : "Новая партия"}</h2>
//             <div className="form_grid">
//               <div className="field">
//                 <div className="label">Номер партии *</div>
//                 <input value={form.number} onChange={e => setForm({...form, number: e.target.value})} placeholder="П000001" />
//               </div>
//               <div className="field">
//                 <div className="label">Город назначения *</div>
//                 <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Астана" />
//               </div>
//               <div className="field">
//                 <div className="label">ФИО водителя</div>
//                 <input value={form.driverName} onChange={e => setForm({...form, driverName: e.target.value})} placeholder="Иванов Иван" />
//               </div>
//               <div className="field">
//                 <div className="label">Телефон водителя</div>
//                 <input value={form.driverPhone} onChange={e => setForm({...form, driverPhone: e.target.value})} placeholder="+7 777 123 45 67" />
//               </div>
//               <div className="field">
//                 <div className="label">Номер авто</div>
//                 <input value={form.carNumber} onChange={e => setForm({...form, carNumber: e.target.value})} placeholder="777 ABC 01" />
//               </div>
//               <div className="field">
//                 <div className="label">Стоимость перевозки (тг)</div>
//                 <input type="number" value={form.deliveryCost} onChange={e => setForm({...form, deliveryCost: e.target.value})} placeholder="0" />
//               </div>
//             </div>
//             <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
//               <button className="btn btn--accent" onClick={handleSave}>Сохранить</button>
//               <button className="btn" onClick={() => setShowForm(false)}>Отмена</button>
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="table_wrap" style={{ marginTop: 16 }}>
//         {loading ? <Loader /> : (
//           <table className="table_fixed">
//             <thead>
//               <tr>
//                 <th style={{ width: 120 }}>Номер</th>
//                 <th style={{ width: 100 }}>Дата</th>
//                 <th>Город</th>
//                 <th>Водитель</th>
//                 <th>Номер авто</th>
//                 <th>Стоимость</th>
//                 <th style={{ width: 150 }}>Действия</th>
//               </tr>
//             </thead>
//             <tbody>
//               {batches.length === 0 ? (
//                 <tr><td colSpan={7} className="muted" style={{ padding: 16 }}>
//                   {company ? "Партий пока нет." : "Выберите компанию."}
//                 </td></tr>
//               ) : (
//                 batches.map(b => (
//                   <tr key={b.id}>
//                     <td style={{ fontWeight: 700 }}>{b.number}</td>
//                     <td>{formatDate(b.createdAt)}</td>
//                     <td>{b.city}</td>
//                     <td>
//                       <div>{b.driverName || "—"}</div>
//                       {b.driverPhone && <div className="muted" style={{ fontSize: "0.8rem" }}>{b.driverPhone}</div>}
//                     </td>
//                     <td>{b.carNumber || "—"}</td>
//                     <td>{b.deliveryCost ? `${Number(b.deliveryCost).toLocaleString()} тг` : "—"}</td>
//                     <td>
//                       <div style={{ display: "flex", gap: 6 }}>
//                         <button className="btn btn--sm" onClick={() => printVedomost(b)} title="Печать">
//   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
// </button>
// <button className="btn btn--sm" onClick={() => openEdit(b)} title="Редактировать">
//   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
// </button>
// <button className="btn btn--sm" onClick={() => handleDelete(b.id)} title="Удалить" style={{ color: "#ff4d4f" }}>
//   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
// </button>
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
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("ru");
}

// ---- СОРТИРОВКА ----
function getSortValue(b, field) {
  switch (field) {
    case 'number':       return (b.number || '').toString().toLowerCase();
    case 'date':         return new Date(b.createdAt || 0).getTime();
    case 'city':         return (b.city || '').toString().toLowerCase();
    case 'driverName':   return (b.driverName || '').toString().toLowerCase();
    case 'carNumber':    return (b.carNumber || '').toString().toLowerCase();
    case 'deliveryCost': return Number(b.deliveryCost) || 0;
    default:             return '';
  }
}

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(getSelectedCompany());
  const [showForm, setShowForm] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [form, setForm] = useState({
    number: "", city: "", driverName: "", driverPhone: "", carNumber: "", deliveryCost: "",
  });

  // Сортировка
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

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

  const sortedBatches = useMemo(() => {
    return [...batches].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [batches, sortBy, sortOrder]);

  useEffect(() => {
    return subscribeSelectedCompany(c => setCompany(c));
  }, []);

  useEffect(() => {
    if (!company) { setBatches([]); setLoading(false); return; }
    load();
  }, [company]);

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

  const openCreate = () => {
    setEditBatch(null);
    setForm({ number: "П" + String(Date.now()).slice(-6), city: "", driverName: "", driverPhone: "", carNumber: "", deliveryCost: "" });
    setShowForm(true);
  };

  const openEdit = (batch) => {
    setEditBatch(batch);
    setForm({
      number: batch.number,
      city: batch.city,
      driverName: batch.driverName,
      driverPhone: batch.driverPhone,
      carNumber: batch.carNumber,
      deliveryCost: batch.deliveryCost,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.number || !form.city) return alert("Укажите номер и город");
    try {
      if (editBatch) {
        await api.batches.update(editBatch.id, form);
      } else {
        await api.batches.create({ ...form, companyId: company?.id, requestIds: [] });
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

  const printVedomost = async (batch) => {
    let requestIds = [];
    try { requestIds = JSON.parse(batch.requestIds); } catch(e) {}

    const { toDataURL } = await import("qrcode");
    const qrUrl = await toDataURL(`TASU-BATCH-${batch.number}`, { width: 100, margin: 1 });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Партия ${batch.number}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
      h2 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #000; }
      .info { display: flex; gap: 0; border: 1px solid #aaa; margin-bottom: 16px; }
      .info-cell { flex: 1; padding: 8px 12px; border-right: 1px solid #aaa; font-size: 11px; }
      .info-cell:last-child { border-right: none; }
      .info-label { color: #666; font-size: 10px; margin-bottom: 2px; }
      .info-val { font-weight: 700; font-size: 13px; }
      .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 30px; }
      .sig { flex: 1; }
      .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 28px; }
      .sig-label { font-size: 10px; color: #333; text-align: center; }
    </style></head><body>
    <div class="header">
      <div>
        <h2>Партия № ${batch.number}</h2>
        <div style="color:#333;font-size:11px;margin-top:4px;">${company?.name || ""} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")} &nbsp;&nbsp; Город: ${batch.city}</div>
      </div>
      <img src="${qrUrl}" width="90" height="90" style="border:1px solid #ccc;padding:3px;"/>
    </div>
    <div class="info">
      <div class="info-cell"><div class="info-label">Водитель</div><div class="info-val">${batch.driverName || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Телефон водителя</div><div class="info-val">${batch.driverPhone || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Номер авто</div><div class="info-val">${batch.carNumber || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Стоимость перевозки</div><div class="info-val">${batch.deliveryCost ? Number(batch.deliveryCost).toLocaleString() + " тг" : "—"}</div></div>
    </div>
    <div style="margin-top:8px;font-size:11px;color:#666;">Накладных в партии: ${requestIds.length}</div>
    <div class="signatures">
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Перевозчик (подпись, М.П.)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Отправитель (подпись, М.П.)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Получатель (подпись, М.П.)</div></div>
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

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, width: 480, maxWidth: "95vw" }}>
            <h2 style={{ margin: "0 0 16px" }}>{editBatch ? "Редактировать партию" : "Новая партия"}</h2>
            <div className="form_grid">
              <div className="field">
                <div className="label">Номер партии *</div>
                <input value={form.number} onChange={e => setForm({...form, number: e.target.value})} placeholder="П000001" />
              </div>
              <div className="field">
                <div className="label">Город назначения *</div>
                <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Астана" />
              </div>
              <div className="field">
                <div className="label">ФИО водителя</div>
                <input value={form.driverName} onChange={e => setForm({...form, driverName: e.target.value})} placeholder="Иванов Иван" />
              </div>
              <div className="field">
                <div className="label">Телефон водителя</div>
                <input value={form.driverPhone} onChange={e => setForm({...form, driverPhone: e.target.value})} placeholder="+7 777 123 45 67" />
              </div>
              <div className="field">
                <div className="label">Номер авто</div>
                <input value={form.carNumber} onChange={e => setForm({...form, carNumber: e.target.value})} placeholder="777 ABC 01" />
              </div>
              <div className="field">
                <div className="label">Стоимость перевозки (тг)</div>
                <input type="number" value={form.deliveryCost} onChange={e => setForm({...form, deliveryCost: e.target.value})} placeholder="0" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn--accent" onClick={handleSave}>Сохранить</button>
              <button className="btn" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                <SortableTh field="number" style={{ width: 120 }}>Номер</SortableTh>
                <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
                <SortableTh field="city">Город</SortableTh>
                <SortableTh field="driverName">Водитель</SortableTh>
                <SortableTh field="carNumber">Номер авто</SortableTh>
                <SortableTh field="deliveryCost">Стоимость</SortableTh>
                <th style={{ width: 150 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedBatches.length === 0 ? (
                <tr><td colSpan={7} className="muted" style={{ padding: 16 }}>
                  {company ? "Партий пока нет." : "Выберите компанию."}
                </td></tr>
              ) : (
                sortedBatches.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700 }}>{b.number}</td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>{b.city}</td>
                    <td>
                      <div>{b.driverName || "—"}</div>
                      {b.driverPhone && <div className="muted" style={{ fontSize: "0.8rem" }}>{b.driverPhone}</div>}
                    </td>
                    <td>{b.carNumber || "—"}</td>
                    <td>{b.deliveryCost ? `${Number(b.deliveryCost).toLocaleString()} тг` : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn--sm" onClick={() => printVedomost(b)} title="Печать">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        </button>
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