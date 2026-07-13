// import React, { useEffect, useState, useMemo } from "react";
// import { api } from "../../shared/api/api.js";

// const parseDetails = (raw) => {
//   if (!raw) return {};
//   if (typeof raw === 'object') return raw;
//   try { return JSON.parse(raw); } catch { return {}; }
// };

// function fmt(n) {
//   return Number(n || 0).toLocaleString();
// }

// export default function BookkeeperReportPage() {
//   const [batches, setBatches] = useState([]);
//   const [requests, setRequests] = useState([]);
//   const [expenses, setExpenses] = useState([]);
//   const [carriers, setCarriers] = useState([]);
//   const [representatives, setRepresentatives] = useState([]);
//   const [companies, setCompanies] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [dateFrom, setDateFrom] = useState('');
//   const [dateTo, setDateTo] = useState('');
//   const [companyId, setCompanyId] = useState('all');
//   const [selected, setSelected] = useState([]); // отмеченные партии для печати

//   const load = async () => {
//     setLoading(true);
//     try {
//       const [b, r, e, c, rep, comp] = await Promise.all([
//         api.batches.list().catch(() => []),
//         api.requests.list().catch(() => []),
//         api.expenses.list({}).catch(() => []),
//         api.carriers.list().catch(() => []),
//         api.representatives.list().catch(() => []),
//         api.companies.list().catch(() => []),
//       ]);
//       setBatches(Array.isArray(b) ? b : []);
//       setRequests(Array.isArray(r) ? r : []);
//       setExpenses(Array.isArray(e) ? e : []);
//       setCarriers(Array.isArray(c) ? c : []);
//       setRepresentatives(Array.isArray(rep) ? rep : []);
//       setCompanies(Array.isArray(comp) ? comp : []);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { load(); }, []);

//   const carrierName = (id) => carriers.find(c => c.id === id)?.name || "—";
//   const repName = (id) => representatives.find(r => r.id === id)?.name || "—";

//   // Сумма накладных партии (доход)
//   const batchIncome = (batch) => {
//     let ids = [];
//     try { ids = JSON.parse(batch.requestIds || "[]"); } catch (e) {}
//     let sum = 0;
//     ids.forEach(rid => {
//       const r = requests.find(rr => rr.id === rid);
//       if (r) {
//         const d = parseDetails(r.details);
//         sum += Number(r.totalSum || d.totalSum || 0) || 0;
//       }
//     });
//     return sum;
//   };

//   // Расходы, привязанные к накладным партии
//   const batchExpenses = (batch) => {
//     let ids = [];
//     try { ids = JSON.parse(batch.requestIds || "[]"); } catch (e) {}
//     let sum = 0;
//     expenses.forEach(ex => {
//       if (ex.requestId && ids.includes(ex.requestId)) {
//         sum += Number(ex.amount) || 0;
//       }
//     });
//     return sum;
//   };

//   // Компания партии = компания её накладных (у самих партий companyId пустой)
//   const batchCompanyId = (batch) => {
//     if (batch.companyId) return batch.companyId;
//     let ids = [];
//     try { ids = JSON.parse(batch.requestIds || "[]"); } catch (e) {}
//     for (const rid of ids) {
//       const r = requests.find(rr => rr.id === rid);
//       if (r && r.companyId) return r.companyId;
//     }
//     return null;
//   };

//   const rows = useMemo(() => {
//     return batches.filter(b => {
//       let ok = true;
//       if (companyId !== 'all') ok = ok && batchCompanyId(b) === companyId;
//       if (dateFrom) ok = ok && new Date(b.createdAt) >= new Date(dateFrom);
//       if (dateTo) ok = ok && new Date(b.createdAt) <= new Date(dateTo + "T23:59:59");
//       return ok;
//     }).map(b => {
//       const income = batchIncome(b);
//       const expense = batchExpenses(b);
//       return {
//         id: b.id,
//         name: `${b.number}`,
//         representative: repName(b.representativeId),
//         carrier: carrierName(b.carrierId),
//         loaders: b.loadersCount || 0,
//         region: b.city || "—",
//         income,
//         expense,
//         profit: income - expense,
//       };
//     });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [batches, requests, expenses, carriers, representatives, companyId, dateFrom, dateTo]);

//   // Если что-то отмечено — работаем только с отмеченными, иначе со всеми
//   const activeRows = selected.length > 0 ? rows.filter(r => selected.includes(r.id)) : rows;

//   const toggleSelect = (id) => {
//     setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
//   };

//   const toggleAll = () => {
//     if (selected.length === rows.length) setSelected([]);
//     else setSelected(rows.map(r => r.id));
//   };

//   const totals = useMemo(() => ({
//     income: activeRows.reduce((a, r) => a + r.income, 0),
//     expense: activeRows.reduce((a, r) => a + r.expense, 0),
//     profit: activeRows.reduce((a, r) => a + r.profit, 0),
//   }), [activeRows]);

//   const printReport = () => {
//     const company = companies.find(c => c.id === companyId);
//     const period = (dateFrom || dateTo) ? `${dateFrom || '...'} — ${dateTo || '...'}` : 'весь период';

//     const trs = activeRows.map((r, i) => `<tr>
//       <td style="text-align:center">${i + 1}</td>
//       <td>${r.name}</td>
//       <td>${r.representative}</td>
//       <td>${r.carrier}</td>
//       <td style="text-align:center">${r.loaders || '—'}</td>
//       <td>${r.region}</td>
//       <td style="text-align:right">${fmt(r.income)} тг</td>
//       <td style="text-align:right">${fmt(r.expense)} тг</td>
//       <td style="text-align:right;font-weight:700">${fmt(r.profit)} тг</td>
//     </tr>`).join("");

//     const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Отчёт</title>
//     <style>
//       body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
//       h2 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
//       .sub { color: #333; font-size: 11px; margin-bottom: 16px; }
//       table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
//       th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
//       th { background: #f3f4f6; font-weight: 700; text-align: center; }
//       tfoot td { font-weight: 900; background: #f9fafb; }
//     </style></head><body>
//     <h2>Отчёт</h2>
//     <div class="sub">${company ? company.name : 'Все компании'} &nbsp;&nbsp; Период: ${period} &nbsp;&nbsp; Дата печати: ${new Date().toLocaleDateString("ru")}</div>
//     <table>
//       <thead><tr>
//         <th style="width:30px">№</th>
//         <th>Имя (партия)</th>
//         <th>Представитель</th>
//         <th>Перевозчик</th>
//         <th style="width:60px">Грузчик</th>
//         <th>Доставка по регионам</th>
//         <th>Общая сумма</th>
//         <th>Расходы</th>
//         <th>Итог расходов</th>
//       </tr></thead>
//       <tbody>${trs}</tbody>
//       <tfoot><tr>
//         <td colspan="6" style="text-align:right">ИТОГО:</td>
//         <td style="text-align:right">${fmt(totals.income)} тг</td>
//         <td style="text-align:right">${fmt(totals.expense)} тг</td>
//         <td style="text-align:right">${fmt(totals.profit)} тг</td>
//       </tr></tfoot>
//     </table>
//     <script>window.onload=function(){window.print();}</script>
//     </body></html>`;

//     const blob = new Blob([html], { type: "text/html; charset=utf-8" });
//     window.open(URL.createObjectURL(blob), "_blank");
//   };

//   return (
//     <>
//       <div className="navbar">
//         <h1>Отчёт</h1>
//         <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
//           {selected.length > 0 && (
//             <>
//               <span style={{ fontSize: "0.85rem", color: "#0369a1" }}>Выбрано: {selected.length}</span>
//               <button className="btn" onClick={() => setSelected([])}>Снять выбор</button>
//             </>
//           )}
//           <button className="btn btn--accent" onClick={printReport}>🖨 Печать отчёта</button>
//         </div>
//       </div>
//       <div className="filter" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
//         <div className="field" style={{ width: 200 }}>
//           <div className="label">Компания</div>
//           <select value={companyId} onChange={e => setCompanyId(e.target.value)}>
//             <option value="all">Все компании</option>
//             {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
//           </select>
//         </div>
//         <div className="field" style={{ width: 160 }}>
//           <div className="label">Дата с</div>
//           <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
//         </div>
//         <div className="field" style={{ width: 160 }}>
//           <div className="label">Дата по</div>
//           <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
//         </div>
//         {(companyId !== 'all' || dateFrom || dateTo) && (
//           <button className="btn" onClick={() => { setCompanyId('all'); setDateFrom(''); setDateTo(''); }}>Сбросить</button>
//         )}
//       </div>

//       <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
//         <div style={{ padding: "10px 16px", background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd" }}>
//           Общая сумма: <strong>{fmt(totals.income)} тг</strong>
//         </div>
//         <div style={{ padding: "10px 16px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
//           Расходы: <strong>{fmt(totals.expense)} тг</strong>
//         </div>
//         <div style={{ padding: "10px 16px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
//           Итог: <strong>{fmt(totals.profit)} тг</strong>
//         </div>
//       </div>

//       <div className="table_wrap" style={{ marginTop: 16 }}>
//         {loading ? <div style={{ padding: 16 }}>Загрузка...</div> : (
//           <table className="table">
//            <thead>
//               <tr>
//                 <th style={{ width: 36 }}>
//                   <input type="checkbox" checked={selected.length === rows.length && rows.length > 0} onChange={toggleAll} />
//                 </th>
//                 <th style={{ width: 40 }}>№</th>
//                 <th>Имя (партия)</th>
//                 <th>Представитель</th>
//                 <th>Перевозчик</th>
//                 <th style={{ width: 80, textAlign: "center" }}>Грузчик</th>
//                 <th>Доставка по регионам</th>
//                 <th style={{ textAlign: "right" }}>Общая сумма</th>
//                 <th style={{ textAlign: "right" }}>Расходы</th>
//                 <th style={{ textAlign: "right" }}>Итог расходов</th>
//               </tr>
//             </thead>
//             <tbody>
//               {rows.length === 0 ? (
//                 <tr><td colSpan={10} className="muted" style={{ padding: 16 }}>Нет данных за выбранный период</td></tr>
//               ) : rows.map((r, i) => (
//                 <tr key={r.id} style={{ background: selected.includes(r.id) ? "rgba(24,144,255,0.06)" : "" }}>
//                   <td style={{ textAlign: "center" }}>
//                     <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} />
//                   </td>
//                   <td>{i + 1}</td>
//                   <td style={{ fontWeight: 700 }}>{r.name}</td>
//                   <td>{r.representative}</td>
//                   <td>{r.carrier}</td>
//                   <td style={{ textAlign: "center" }}>{r.loaders || '—'}</td>
//                   <td>{r.region}</td>
//                   <td style={{ textAlign: "right" }}>{fmt(r.income)} тг</td>
//                   <td style={{ textAlign: "right" }}>{fmt(r.expense)} тг</td>
//                   <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(r.profit)} тг</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//     </>
//   );
// }



import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../shared/api/api.js";

const parseDetails = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
};

const parseJson = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

function fmt(n) {
  return Number(n || 0).toLocaleString();
}

export default function BookkeeperReportPage() {
  const [batches, setBatches] = useState([]);
  const [requests, setRequests] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [representatives, setRepresentatives] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [carrierVedomosts, setCarrierVedomosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [companyId, setCompanyId] = useState('all');
  const [selected, setSelected] = useState([]); // отмеченные партии для печати

  const load = async () => {
    setLoading(true);
    try {
      const [b, r, e, c, rep, comp, cv] = await Promise.all([
        api.batches.list().catch(() => []),
        api.requests.list().catch(() => []),
        api.expenses.list({}).catch(() => []),
        api.carriers.list().catch(() => []),
        api.representatives.list().catch(() => []),
        api.companies.list().catch(() => []),
        api.carrierVedomosts.list().catch(() => []),
      ]);
      setBatches(Array.isArray(b) ? b : []);
      setRequests(Array.isArray(r) ? r : []);
      setExpenses(Array.isArray(e) ? e : []);
      setCarriers(Array.isArray(c) ? c : []);
      setRepresentatives(Array.isArray(rep) ? rep : []);
      setCompanies(Array.isArray(comp) ? comp : []);
      setCarrierVedomosts(Array.isArray(cv) ? cv : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const carrierName = (id) => carriers.find(c => c.id === id)?.name || "—";
  const repName = (id) => representatives.find(r => r.id === id)?.name || "—";

  // Сумма накладных партии (доход)
  const batchIncome = (batch) => {
    let ids = [];
    try { ids = JSON.parse(batch.requestIds || "[]"); } catch (e) {}
    let sum = 0;
    ids.forEach(rid => {
      const r = requests.find(rr => rr.id === rid);
      if (r) {
        const d = parseDetails(r.details);
        sum += Number(r.totalSum || d.totalSum || 0) || 0;
      }
    });
    return sum;
  };

  // Расходы, привязанные к накладным партии (ручной ввод бухгалтера)
  const batchExpenses = (batch) => {
    let ids = [];
    try { ids = JSON.parse(batch.requestIds || "[]"); } catch (e) {}
    let sum = 0;
    expenses.forEach(ex => {
      if (ex.requestId && ids.includes(ex.requestId)) {
        sum += Number(ex.amount) || 0;
      }
    });
    return sum;
  };

  // ТЗ: суммы перевозчику/грузчикам/представителю — из сформированной ведомости
  // перевозчика, если партия в неё входит (берём точную разбивку по этой партии,
  // а не общий итог ведомости, т.к. в одну ведомость может входить несколько партий)
  const batchPayouts = (batch) => {
    if (!batch.carrierVedomostId) {
      return { carrierSum: 0, loaderSum: 0, representativeSum: 0 };
    }
    const vedomost = carrierVedomosts.find(v => v.id === batch.carrierVedomostId);
    if (!vedomost) return { carrierSum: 0, loaderSum: 0, representativeSum: 0 };

    const snapshot = parseJson(vedomost.data) || {};
    const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
    const row = rows.find(r => r.batchId === batch.id);
    if (!row) return { carrierSum: 0, loaderSum: 0, representativeSum: 0 };

    const representativeRate = Number(snapshot.representativeRate) || 0;
    const representativeSum = Math.round((Number(row.weight) || 0) * representativeRate);

    return {
      carrierSum: Number(row.carrierSum) || 0,
      loaderSum: Number(row.loaderSum) || 0,
      representativeSum,
    };
  };

  // Компания партии = компания её накладных (у самих партий companyId пустой)
  const batchCompanyId = (batch) => {
    if (batch.companyId) return batch.companyId;
    let ids = [];
    try { ids = JSON.parse(batch.requestIds || "[]"); } catch (e) {}
    for (const rid of ids) {
      const r = requests.find(rr => rr.id === rid);
      if (r && r.companyId) return r.companyId;
    }
    return null;
  };

  const rows = useMemo(() => {
    return batches.filter(b => {
      let ok = true;
      if (companyId !== 'all') ok = ok && batchCompanyId(b) === companyId;
      if (dateFrom) ok = ok && new Date(b.createdAt) >= new Date(dateFrom);
      if (dateTo) ok = ok && new Date(b.createdAt) <= new Date(dateTo + "T23:59:59");
      return ok;
    }).map(b => {
      const income = batchIncome(b);
      const expense = batchExpenses(b);
      const payouts = batchPayouts(b);

      // ТЗ: налог считается от компании партии по её ставке (Company.taxRate, %)
      const compId = batchCompanyId(b);
      const comp = companies.find(c => c.id === compId);
      const taxRate = Number(comp?.taxRate) || 0;
      const taxAmount = Math.round(income * (taxRate / 100));

      const totalPayouts = expense + payouts.carrierSum + payouts.loaderSum + payouts.representativeSum + taxAmount;

      return {
        id: b.id,
        name: `${b.number}`,
        representative: repName(b.representativeId),
        carrier: carrierName(b.carrierId),
        loaders: b.loadersCount || 0,
        region: b.city || "—",
        income,
        expense,
        carrierSum: payouts.carrierSum,
        loaderSum: payouts.loaderSum,
        representativeSum: payouts.representativeSum,
        taxRate,
        taxAmount,
        totalPayouts,
        profit: income - totalPayouts,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, requests, expenses, carriers, representatives, companies, carrierVedomosts, companyId, dateFrom, dateTo]);

  // Если что-то отмечено — работаем только с отмеченными, иначе со всеми
  const activeRows = selected.length > 0 ? rows.filter(r => selected.includes(r.id)) : rows;

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === rows.length) setSelected([]);
    else setSelected(rows.map(r => r.id));
  };

  const totals = useMemo(() => ({
    income: activeRows.reduce((a, r) => a + r.income, 0),
    expense: activeRows.reduce((a, r) => a + r.expense, 0),
    carrierSum: activeRows.reduce((a, r) => a + r.carrierSum, 0),
    loaderSum: activeRows.reduce((a, r) => a + r.loaderSum, 0),
    representativeSum: activeRows.reduce((a, r) => a + r.representativeSum, 0),
    taxAmount: activeRows.reduce((a, r) => a + r.taxAmount, 0),
    totalPayouts: activeRows.reduce((a, r) => a + r.totalPayouts, 0),
    profit: activeRows.reduce((a, r) => a + r.profit, 0),
  }), [activeRows]);

  const printReport = () => {
    const company = companies.find(c => c.id === companyId);
    const period = (dateFrom || dateTo) ? `${dateFrom || '...'} — ${dateTo || '...'}` : 'весь период';

    const trs = activeRows.map((r, i) => `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${r.name}</td>
      <td>${r.representative}</td>
      <td>${r.carrier}</td>
      <td style="text-align:center">${r.loaders || '—'}</td>
      <td>${r.region}</td>
      <td style="text-align:right">${fmt(r.income)} тг</td>
      <td style="text-align:right">${fmt(r.expense)} тг</td>
      <td style="text-align:right">${fmt(r.carrierSum)} тг</td>
      <td style="text-align:right">${fmt(r.loaderSum)} тг</td>
      <td style="text-align:right">${fmt(r.representativeSum)} тг</td>
      <td style="text-align:right">${fmt(r.taxAmount)} тг</td>
      <td style="text-align:right;font-weight:700">${fmt(r.profit)} тг</td>
    </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Отчёт</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
      h2 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
      .sub { color: #333; font-size: 11px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10px; }
      th, td { border: 1px solid #000; padding: 5px 6px; text-align: left; }
      th { background: #f3f4f6; font-weight: 700; text-align: center; }
      tfoot td { font-weight: 900; background: #f9fafb; }
    </style></head><body>
    <h2>Отчёт</h2>
    <div class="sub">${company ? company.name : 'Все компании'} &nbsp;&nbsp; Период: ${period} &nbsp;&nbsp; Дата печати: ${new Date().toLocaleDateString("ru")}</div>
    <table>
      <thead><tr>
        <th style="width:26px">№</th>
        <th>Партия</th>
        <th>Представитель</th>
        <th>Перевозчик</th>
        <th style="width:50px">Грузчик</th>
        <th>Регион</th>
        <th>Выручка</th>
        <th>Расходы</th>
        <th>Перевозчику</th>
        <th>Грузчикам</th>
        <th>Представителю</th>
        <th>Налог</th>
        <th>Прибыль</th>
      </tr></thead>
      <tbody>${trs}</tbody>
      <tfoot><tr>
        <td colspan="6" style="text-align:right">ИТОГО:</td>
        <td style="text-align:right">${fmt(totals.income)} тг</td>
        <td style="text-align:right">${fmt(totals.expense)} тг</td>
        <td style="text-align:right">${fmt(totals.carrierSum)} тг</td>
        <td style="text-align:right">${fmt(totals.loaderSum)} тг</td>
        <td style="text-align:right">${fmt(totals.representativeSum)} тг</td>
        <td style="text-align:right">${fmt(totals.taxAmount)} тг</td>
        <td style="text-align:right">${fmt(totals.profit)} тг</td>
      </tr></tfoot>
    </table>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <>
      <div className="navbar">
        <h1>Отчёт</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {selected.length > 0 && (
            <>
              <span style={{ fontSize: "0.85rem", color: "#0369a1" }}>Выбрано: {selected.length}</span>
              <button className="btn" onClick={() => setSelected([])}>Снять выбор</button>
            </>
          )}
          <button className="btn btn--accent" onClick={printReport}>🖨 Печать отчёта</button>
        </div>
      </div>
      <div className="filter" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field" style={{ width: 200 }}>
          <div className="label">Компания</div>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)}>
            <option value="all">Все компании</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ width: 160 }}>
          <div className="label">Дата с</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="field" style={{ width: 160 }}>
          <div className="label">Дата по</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(companyId !== 'all' || dateFrom || dateTo) && (
          <button className="btn" onClick={() => { setCompanyId('all'); setDateFrom(''); setDateTo(''); }}>Сбросить</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ padding: "10px 16px", background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd" }}>
          Выручка: <strong>{fmt(totals.income)} тг</strong>
        </div>
        <div style={{ padding: "10px 16px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
          Расходы: <strong>{fmt(totals.expense)} тг</strong>
        </div>
        <div style={{ padding: "10px 16px", background: "#fefce8", borderRadius: 8, border: "1px solid #fde047" }}>
          Перевозчику: <strong>{fmt(totals.carrierSum)} тг</strong>
        </div>
        <div style={{ padding: "10px 16px", background: "#fefce8", borderRadius: 8, border: "1px solid #fde047" }}>
          Грузчикам: <strong>{fmt(totals.loaderSum)} тг</strong>
        </div>
        <div style={{ padding: "10px 16px", background: "#fefce8", borderRadius: 8, border: "1px solid #fde047" }}>
          Представителю: <strong>{fmt(totals.representativeSum)} тг</strong>
        </div>
        <div style={{ padding: "10px 16px", background: "#f5f3ff", borderRadius: 8, border: "1px solid #ddd6fe" }}>
          Налог: <strong>{fmt(totals.taxAmount)} тг</strong>
        </div>
        <div style={{ padding: "10px 16px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
          Итоговая прибыль: <strong>{fmt(totals.profit)} тг</strong>
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <div style={{ padding: 16 }}>Загрузка...</div> : (
          <table className="table">
           <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={selected.length === rows.length && rows.length > 0} onChange={toggleAll} />
                </th>
                <th style={{ width: 40 }}>№</th>
                <th>Партия</th>
                <th>Представитель</th>
                <th>Перевозчик</th>
                <th style={{ width: 70, textAlign: "center" }}>Грузчик</th>
                <th>Регион</th>
                <th style={{ textAlign: "right" }}>Выручка</th>
                <th style={{ textAlign: "right" }}>Расходы</th>
                <th style={{ textAlign: "right" }}>Перевозчику</th>
                <th style={{ textAlign: "right" }}>Грузчикам</th>
                <th style={{ textAlign: "right" }}>Представителю</th>
                <th style={{ textAlign: "right" }}>Налог</th>
                <th style={{ textAlign: "right" }}>Прибыль</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={13} className="muted" style={{ padding: 16 }}>Нет данных за выбранный период</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.id} style={{ background: selected.includes(r.id) ? "rgba(24,144,255,0.06)" : "" }}>
                  <td style={{ textAlign: "center" }}>
                    <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                  </td>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 700 }}>{r.name}</td>
                  <td>{r.representative}</td>
                  <td>{r.carrier}</td>
                  <td style={{ textAlign: "center" }}>{r.loaders || '—'}</td>
                  <td>{r.region}</td>
                  <td style={{ textAlign: "right" }}>{fmt(r.income)} тг</td>
                  <td style={{ textAlign: "right" }}>{fmt(r.expense)} тг</td>
                  <td style={{ textAlign: "right" }}>{fmt(r.carrierSum)} тг</td>
                  <td style={{ textAlign: "right" }}>{fmt(r.loaderSum)} тг</td>
                  <td style={{ textAlign: "right" }}>{fmt(r.representativeSum)} тг</td>
                  <td style={{ textAlign: "right" }}>{fmt(r.taxAmount)} тг</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(r.profit)} тг</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}