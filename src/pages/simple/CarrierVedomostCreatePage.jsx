// // import React, { useEffect, useState, useMemo } from "react";
// // import { useNavigate } from "react-router-dom";
// // import { api } from "../../shared/api/api.js";
// // import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
// // import Loader from "../../shared/components/Loader";

// // function cleanCityName(city) {
// //   return (city || "")
// //     .replace(/__PRIVATE$/, "")
// //     .replace(/__LOADERS$/, "")
// //     .replace(/__CARRIERS$/, "")
// //     .trim()
// //     .toLowerCase();
// // }

// // function getTariffCategory(t) {
// //   const wr = t.weightRanges || {};
// //   return wr._category || (t.isPrivate ? "private" : "legal");
// // }

// // function toNum(val) {
// //   const n = parseFloat(val);
// //   return Number.isFinite(n) ? n : 0;
// // }

// // // Ставка грузчика на человека, по весовым планкам тарифа (та же логика, что в ActCreatePage)
// // function findLoaderPricePerPerson(tariff, weight) {
// //   const wr = tariff.weightRanges || {};
// //   let price = 0;
// //   if (weight <= 10) price = toNum(wr.r10);
// //   else if (weight <= 20) price = toNum(wr.r20);
// //   else if (weight <= 30) price = toNum(wr.r30);
// //   else if (weight <= 80) price = toNum(wr.r80);
// //   else if (weight <= 150) price = toNum(wr.r150);
// //   else if (weight <= 300) price = toNum(wr.r300);
// //   else price = toNum(wr.r600);

// //   if (price <= 0) {
// //     price =
// //       toNum(wr.r10) || toNum(wr.r20) || toNum(wr.r30) ||
// //       toNum(wr.r80) || toNum(wr.r150) || toNum(wr.r300) || toNum(wr.r600);
// //   }
// //   return price;
// // }

// // export default function CarrierVedomostCreatePage() {
// //   const nav = useNavigate();
// //   const [company, setCompany] = useState(getSelectedCompany());
// //   const [batches, setBatches] = useState([]);
// //   const [tariffs, setTariffs] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [selectedIds, setSelectedIds] = useState({});
// //   const [representativeRate, setRepresentativeRate] = useState("");
// //   const [saving, setSaving] = useState(false);

// //   useEffect(() => {
// //     return subscribeSelectedCompany(c => setCompany(c));
// //   }, []);

// //   const load = async () => {
// //     setLoading(true);
// //     try {
// //       const [batchList, tariffList] = await Promise.all([
// //         api.batches.list(company?.id),
// //         api.tariffs.list(),
// //       ]);
// //       // ТЗ: ведомость перевозчика — только из УЖЕ сформированных партий,
// //       // которые ещё не входят ни в одну другую ведомость перевозчика
// //       const eligible = (Array.isArray(batchList) ? batchList : []).filter(
// //         b => b.isFormed && !b.carrierVedomostId
// //       );
// //       setBatches(eligible);
// //       setTariffs(Array.isArray(tariffList) ? tariffList : []);
// //     } catch (e) {
// //       console.error(e);
// //       setBatches([]);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     if (company) load();
// //     else { setBatches([]); setLoading(false); }
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [company]);

// //   const findCarrierTariff = (city) => {
// //     const cityClean = cleanCityName(city);
// //     return tariffs.find(t => getTariffCategory(t) === 'carriers' && cleanCityName(t.city) === cityClean);
// //   };

// //   const findLoaderTariff = (city) => {
// //     const cityClean = cleanCityName(city);
// //     return tariffs.find(t => getTariffCategory(t) === 'loaders' && cleanCityName(t.city) === cityClean);
// //   };

// //   const toggleBatch = (id) => {
// //     setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
// //   };

// //   const selectedBatches = useMemo(
// //     () => batches.filter(b => selectedIds[b.id]),
// //     [batches, selectedIds]
// //   );

// //   // Разбивка по каждой выбранной партии + итоги — единая точка расчёта
// //   const breakdown = useMemo(() => {
// //     const rows = selectedBatches.map(b => {
// //       const weight = toNum(b.totalWeight);

// //       const carrierTariff = findCarrierTariff(b.city);
// //       const carrierRate = carrierTariff ? toNum(carrierTariff.pricePerKg) : 0;
// //       const carrierSum = Math.round(weight * carrierRate);

// //       const loadersCount = toNum(b.loadersCount);
// //       const loaderTariff = loadersCount > 0 ? findLoaderTariff(b.city) : null;
// //       const loaderPricePerPerson = loaderTariff ? findLoaderPricePerPerson(loaderTariff, weight) : 0;
// //       const loaderSum = Math.round(loaderPricePerPerson * loadersCount);

// //       return {
// //         batchId: b.id,
// //         number: b.number,
// //         city: b.city,
// //         weight,
// //         carrierId: b.carrierId,
// //         carrierRate,
// //         carrierSum,
// //         carrierMissing: !!b.carrierId && !carrierTariff,
// //         loadersCount,
// //         loaderPricePerPerson,
// //         loaderSum,
// //         loaderMissing: loadersCount > 0 && !loaderTariff,
// //         representativeId: b.representativeId,
// //       };
// //     });

// //     const totalWeight = rows.reduce((acc, r) => acc + r.weight, 0);
// //     const carrierSum = rows.reduce((acc, r) => acc + r.carrierSum, 0);
// //     const loaderSum = rows.reduce((acc, r) => acc + r.loaderSum, 0);
// //     const representativeSum = Math.round(totalWeight * toNum(representativeRate));

// //     return { rows, totalWeight, carrierSum, loaderSum, representativeSum };
// //   }, [selectedBatches, tariffs, representativeRate]);

// //   const hasMissingTariffs = breakdown.rows.some(r => r.carrierMissing || r.loaderMissing);

// //   const handleCreate = async () => {
// //     if (selectedBatches.length === 0) {
// //       alert("Выберите хотя бы одну партию");
// //       return;
// //     }
// //     if (hasMissingTariffs) {
// //       const proceed = window.confirm(
// //         "Для некоторых партий не найден тариф перевозчика или грузчиков (сумма будет 0 по этой партии). Продолжить всё равно?"
// //       );
// //       if (!proceed) return;
// //     }

// //     setSaving(true);
// //     try {
// //       const result = await api.carrierVedomosts.create({
// //         companyId: company?.id,
// //         batchIds: selectedBatches.map(b => b.id),
// //         data: {
// //           rows: breakdown.rows,
// //           representativeRate: toNum(representativeRate),
// //           companyName: company?.name || "",
// //           createdAt: new Date().toISOString(),
// //         },
// //         totalWeight: breakdown.totalWeight,
// //         carrierSum: breakdown.carrierSum,
// //         loaderSum: breakdown.loaderSum,
// //         representativeSum: breakdown.representativeSum,
// //       });
// //       alert(`Ведомость перевозчика №${result.number} сформирована!`);
// //       nav("/simple/batches");
// //     } catch (e) {
// //       alert("Ошибка при создании ведомости: " + (e.message || e));
// //     } finally {
// //       setSaving(false);
// //     }
// //   };

// //   return (
// //     <>
// //       <div className="navbar">
// //         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
// //           <h1>Ведомость перевозчика</h1>
// //           {company && <div className="chip">{company.name}</div>}
// //         </div>
// //         <button className="btn" onClick={() => nav("/simple/batches")}>← К партиям</button>
// //       </div>

// //       <div style={{ marginTop: 12, padding: '8px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.85rem' }}>
// //         💡 Отметьте партии, из которых нужно сформировать ведомость перевозчика. Доступны только уже <strong>сформированные</strong> партии, ещё не включённые в другую ведомость.
// //       </div>

// //       <div className="table_wrap" style={{ marginTop: 16 }}>
// //         {loading ? <Loader /> : (
// //           <table className="table_fixed">
// //             <thead>
// //               <tr>
// //                 <th style={{ width: 40 }}></th>
// //                 <th style={{ width: 120 }}>Номер</th>
// //                 <th>Город</th>
// //                 <th style={{ width: 100, textAlign: 'center' }}>Вес (кг)</th>
// //                 <th style={{ width: 100, textAlign: 'center' }}>Грузчиков</th>
// //               </tr>
// //             </thead>
// //             <tbody>
// //               {batches.length === 0 ? (
// //                 <tr><td colSpan={5} className="muted" style={{ padding: 16 }}>
// //                   Нет доступных сформированных партий.
// //                 </td></tr>
// //               ) : batches.map(b => (
// //                 <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => toggleBatch(b.id)}>
// //                   <td onClick={e => e.stopPropagation()}>
// //                     <input type="checkbox" checked={!!selectedIds[b.id]} onChange={() => toggleBatch(b.id)} />
// //                   </td>
// //                   <td style={{ fontWeight: 700 }}>{b.number}</td>
// //                   <td>{b.city}</td>
// //                   <td style={{ textAlign: 'center' }}>{b.totalWeight || 0}</td>
// //                   <td style={{ textAlign: 'center' }}>{b.loadersCount || 0}</td>
// //                 </tr>
// //               ))}
// //             </tbody>
// //           </table>
// //         )}
// //       </div>

// //       {selectedBatches.length > 0 && (
// //         <div className="card" style={{ marginTop: 16 }}>
// //           <div className="card_head"><div className="card_title">Расчёт по выбранным партиям ({selectedBatches.length})</div></div>
// //           <div className="card_body">
// //             <table className="table_fixed">
// //               <thead>
// //                 <tr>
// //                   <th>Партия</th>
// //                   <th>Город</th>
// //                   <th style={{ textAlign: 'center' }}>Вес</th>
// //                   <th style={{ textAlign: 'center' }}>Тариф перевозчика</th>
// //                   <th style={{ textAlign: 'center' }}>Сумма перевозчику</th>
// //                   <th style={{ textAlign: 'center' }}>Грузчиков × тариф</th>
// //                   <th style={{ textAlign: 'center' }}>Сумма грузчикам</th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {breakdown.rows.map(r => (
// //                   <tr key={r.batchId}>
// //                     <td>{r.number}</td>
// //                     <td>{r.city}</td>
// //                     <td style={{ textAlign: 'center' }}>{r.weight} кг</td>
// //                     <td style={{ textAlign: 'center' }}>
// //                       {r.carrierMissing ? <span style={{ color: '#dc2626' }}>тариф не найден</span> : `${r.carrierRate} тг/кг`}
// //                     </td>
// //                     <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.carrierSum.toLocaleString()} тг</td>
// //                     <td style={{ textAlign: 'center' }}>
// //                       {r.loadersCount > 0
// //                         ? (r.loaderMissing ? <span style={{ color: '#dc2626' }}>тариф не найден</span> : `${r.loadersCount} × ${r.loaderPricePerPerson} тг`)
// //                         : '—'}
// //                     </td>
// //                     <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.loaderSum.toLocaleString()} тг</td>
// //                   </tr>
// //                 ))}
// //               </tbody>
// //             </table>

// //             <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
// //               <div className="field" style={{ width: 220 }}>
// //                 <div className="label">Тариф представителя (тг/кг)</div>
// //                 <input
// //                   type="number"
// //                   value={representativeRate}
// //                   onChange={e => setRepresentativeRate(e.target.value)}
// //                   placeholder="0"
// //                 />
// //               </div>
// //               <div style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
// //                 Общий вес: <strong>{breakdown.totalWeight.toLocaleString()} кг</strong>
// //               </div>
// //               <div style={{ padding: '8px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
// //                 Сумма перевозчику: <strong>{breakdown.carrierSum.toLocaleString()} тг</strong>
// //               </div>
// //               <div style={{ padding: '8px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
// //                 Сумма грузчикам: <strong>{breakdown.loaderSum.toLocaleString()} тг</strong>
// //               </div>
// //               <div style={{ padding: '8px 16px', background: '#fdf4ff', borderRadius: 8, border: '1px solid #f0abfc' }}>
// //                 Сумма представителю: <strong>{breakdown.representativeSum.toLocaleString()} тг</strong>
// //               </div>
// //             </div>

// //             <div style={{ marginTop: 20 }}>
// //               <button className="btn btn--accent btn--lg" onClick={handleCreate} disabled={saving}>
// //                 {saving ? "Формирование..." : "✓ Сформировать ведомость перевозчика"}
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </>
// //   );
// // }


// import React, { useEffect, useState, useMemo } from "react";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import { api } from "../../shared/api/api.js";
// import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
// import Loader from "../../shared/components/Loader";

// function cleanCityName(city) {
//   return (city || "")
//     .replace(/__PRIVATE$/, "")
//     .replace(/__LOADERS$/, "")
//     .replace(/__CARRIERS$/, "")
//     .trim()
//     .toLowerCase();
// }

// function getTariffCategory(t) {
//   const wr = t.weightRanges || {};
//   return wr._category || (t.isPrivate ? "private" : "legal");
// }

// function toNum(val) {
//   const n = parseFloat(val);
//   return Number.isFinite(n) ? n : 0;
// }

// // Ставка грузчика на человека, по весовым планкам тарифа (та же логика, что в ActCreatePage)
// function findLoaderPricePerPerson(tariff, weight) {
//   const wr = tariff.weightRanges || {};
//   let price = 0;
//   if (weight <= 10) price = toNum(wr.r10);
//   else if (weight <= 20) price = toNum(wr.r20);
//   else if (weight <= 30) price = toNum(wr.r30);
//   else if (weight <= 80) price = toNum(wr.r80);
//   else if (weight <= 150) price = toNum(wr.r150);
//   else if (weight <= 300) price = toNum(wr.r300);
//   else price = toNum(wr.r600);

//   if (price <= 0) {
//     price =
//       toNum(wr.r10) || toNum(wr.r20) || toNum(wr.r30) ||
//       toNum(wr.r80) || toNum(wr.r150) || toNum(wr.r300) || toNum(wr.r600);
//   }
//   return price;
// }

// export default function CarrierVedomostCreatePage() {
//   const nav = useNavigate();
//   const [searchParams] = useSearchParams();
//   const [company, setCompany] = useState(getSelectedCompany());
//   const [batches, setBatches] = useState([]);
//   const [tariffs, setTariffs] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedIds, setSelectedIds] = useState({});
//   const [representativeRate, setRepresentativeRate] = useState("");
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     return subscribeSelectedCompany(c => setCompany(c));
//   }, []);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const [batchList, tariffList] = await Promise.all([
//         api.batches.list(company?.id),
//         api.tariffs.list(),
//       ]);
//       // ТЗ: ведомость перевозчика — только из УЖЕ сформированных партий,
//       // которые ещё не входят ни в одну другую ведомость перевозчика
//       const eligible = (Array.isArray(batchList) ? batchList : []).filter(
//         b => b.isFormed && !b.carrierVedomostId
//       );
//       setBatches(eligible);
//       setTariffs(Array.isArray(tariffList) ? tariffList : []);

//       // Предвыбор партий, переданных из BatchesPage галочками
//       const idsParam = searchParams.get('ids');
//       if (idsParam) {
//         const preselected = {};
//         idsParam.split(',').forEach(id => { preselected[id] = true; });
//         setSelectedIds(preselected);
//       }
//     } catch (e) {
//       console.error(e);
//       setBatches([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (company) load();
//     else { setBatches([]); setLoading(false); }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [company]);

//   const findCarrierTariff = (city) => {
//     const cityClean = cleanCityName(city);
//     return tariffs.find(t => getTariffCategory(t) === 'carriers' && cleanCityName(t.city) === cityClean);
//   };

//   const findLoaderTariff = (city) => {
//     const cityClean = cleanCityName(city);
//     return tariffs.find(t => getTariffCategory(t) === 'loaders' && cleanCityName(t.city) === cityClean);
//   };

//   const toggleBatch = (id) => {
//     setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
//   };

//   const selectedBatches = useMemo(
//     () => batches.filter(b => selectedIds[b.id]),
//     [batches, selectedIds]
//   );

//   // Разбивка по каждой выбранной партии + итоги — единая точка расчёта
//   const breakdown = useMemo(() => {
//     const rows = selectedBatches.map(b => {
//       const weight = toNum(b.totalWeight);

//       const carrierTariff = findCarrierTariff(b.city);
//       const carrierRate = carrierTariff ? toNum(carrierTariff.pricePerKg) : 0;
//       const carrierSum = Math.round(weight * carrierRate);

//       const loadersCount = toNum(b.loadersCount);
//       const loaderTariff = loadersCount > 0 ? findLoaderTariff(b.city) : null;
//       const loaderPricePerPerson = loaderTariff ? findLoaderPricePerPerson(loaderTariff, weight) : 0;
//       const loaderSum = Math.round(loaderPricePerPerson * loadersCount);

//       return {
//         batchId: b.id,
//         number: b.number,
//         city: b.city,
//         weight,
//         carrierId: b.carrierId,
//         carrierRate,
//         carrierSum,
//         carrierMissing: !!b.carrierId && !carrierTariff,
//         loadersCount,
//         loaderPricePerPerson,
//         loaderSum,
//         loaderMissing: loadersCount > 0 && !loaderTariff,
//         representativeId: b.representativeId,
//       };
//     });

//     const totalWeight = rows.reduce((acc, r) => acc + r.weight, 0);
//     const carrierSum = rows.reduce((acc, r) => acc + r.carrierSum, 0);
//     const loaderSum = rows.reduce((acc, r) => acc + r.loaderSum, 0);
//     const representativeSum = Math.round(totalWeight * toNum(representativeRate));

//     return { rows, totalWeight, carrierSum, loaderSum, representativeSum };
//   }, [selectedBatches, tariffs, representativeRate]);

//   const hasMissingTariffs = breakdown.rows.some(r => r.carrierMissing || r.loaderMissing);

//   const handleCreate = async () => {
//     if (selectedBatches.length === 0) {
//       alert("Выберите хотя бы одну партию");
//       return;
//     }
//     if (hasMissingTariffs) {
//       const proceed = window.confirm(
//         "Для некоторых партий не найден тариф перевозчика или грузчиков (сумма будет 0 по этой партии). Продолжить всё равно?"
//       );
//       if (!proceed) return;
//     }

//     setSaving(true);
//     try {
//       const result = await api.carrierVedomosts.create({
//         companyId: company?.id,
//         batchIds: selectedBatches.map(b => b.id),
//         data: {
//           rows: breakdown.rows,
//           representativeRate: toNum(representativeRate),
//           companyName: company?.name || "",
//           createdAt: new Date().toISOString(),
//         },
//         totalWeight: breakdown.totalWeight,
//         carrierSum: breakdown.carrierSum,
//         loaderSum: breakdown.loaderSum,
//         representativeSum: breakdown.representativeSum,
//       });
//       alert(`Ведомость перевозчика №${result.number} сформирована!`);
//       nav("/simple/batches");
//     } catch (e) {
//       alert("Ошибка при создании ведомости: " + (e.message || e));
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <>
//       <div className="navbar">
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <h1>Ведомость перевозчика</h1>
//           {company && <div className="chip">{company.name}</div>}
//         </div>
//         <button className="btn" onClick={() => nav("/simple/batches")}>← К партиям</button>
//       </div>

//       <div style={{ marginTop: 12, padding: '8px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.85rem' }}>
//         💡 Отметьте партии, из которых нужно сформировать ведомость перевозчика. Доступны только уже <strong>сформированные</strong> партии, ещё не включённые в другую ведомость.
//       </div>

//       <div className="table_wrap" style={{ marginTop: 16 }}>
//         {loading ? <Loader /> : (
//           <table className="table_fixed">
//             <thead>
//               <tr>
//                 <th style={{ width: 40 }}></th>
//                 <th style={{ width: 120 }}>Номер</th>
//                 <th>Город</th>
//                 <th style={{ width: 100, textAlign: 'center' }}>Вес (кг)</th>
//                 <th style={{ width: 100, textAlign: 'center' }}>Грузчиков</th>
//               </tr>
//             </thead>
//             <tbody>
//               {batches.length === 0 ? (
//                 <tr><td colSpan={5} className="muted" style={{ padding: 16 }}>
//                   Нет доступных сформированных партий.
//                 </td></tr>
//               ) : batches.map(b => (
//                 <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => toggleBatch(b.id)}>
//                   <td onClick={e => e.stopPropagation()}>
//                     <input type="checkbox" checked={!!selectedIds[b.id]} onChange={() => toggleBatch(b.id)} />
//                   </td>
//                   <td style={{ fontWeight: 700 }}>{b.number}</td>
//                   <td>{b.city}</td>
//                   <td style={{ textAlign: 'center' }}>{b.totalWeight || 0}</td>
//                   <td style={{ textAlign: 'center' }}>{b.loadersCount || 0}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>

//       {selectedBatches.length > 0 && (
//         <div className="card" style={{ marginTop: 16 }}>
//           <div className="card_head"><div className="card_title">Расчёт по выбранным партиям ({selectedBatches.length})</div></div>
//           <div className="card_body">
//             <table className="table_fixed">
//               <thead>
//                 <tr>
//                   <th>Партия</th>
//                   <th>Город</th>
//                   <th style={{ textAlign: 'center' }}>Вес</th>
//                   <th style={{ textAlign: 'center' }}>Тариф перевозчика</th>
//                   <th style={{ textAlign: 'center' }}>Сумма перевозчику</th>
//                   <th style={{ textAlign: 'center' }}>Грузчиков × тариф</th>
//                   <th style={{ textAlign: 'center' }}>Сумма грузчикам</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {breakdown.rows.map(r => (
//                   <tr key={r.batchId}>
//                     <td>{r.number}</td>
//                     <td>{r.city}</td>
//                     <td style={{ textAlign: 'center' }}>{r.weight} кг</td>
//                     <td style={{ textAlign: 'center' }}>
//                       {r.carrierMissing ? <span style={{ color: '#dc2626' }}>тариф не найден</span> : `${r.carrierRate} тг/кг`}
//                     </td>
//                     <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.carrierSum.toLocaleString()} тг</td>
//                     <td style={{ textAlign: 'center' }}>
//                       {r.loadersCount > 0
//                         ? (r.loaderMissing ? <span style={{ color: '#dc2626' }}>тариф не найден</span> : `${r.loadersCount} × ${r.loaderPricePerPerson} тг`)
//                         : '—'}
//                     </td>
//                     <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.loaderSum.toLocaleString()} тг</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>

//             <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
//               <div className="field" style={{ width: 220 }}>
//                 <div className="label">Тариф представителя (тг/кг)</div>
//                 <input
//                   type="number"
//                   value={representativeRate}
//                   onChange={e => setRepresentativeRate(e.target.value)}
//                   placeholder="0"
//                 />
//               </div>
//               <div style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
//                 Общий вес: <strong>{breakdown.totalWeight.toLocaleString()} кг</strong>
//               </div>
//               <div style={{ padding: '8px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
//                 Сумма перевозчику: <strong>{breakdown.carrierSum.toLocaleString()} тг</strong>
//               </div>
//               <div style={{ padding: '8px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
//                 Сумма грузчикам: <strong>{breakdown.loaderSum.toLocaleString()} тг</strong>
//               </div>
//               <div style={{ padding: '8px 16px', background: '#fdf4ff', borderRadius: 8, border: '1px solid #f0abfc' }}>
//                 Сумма представителю: <strong>{breakdown.representativeSum.toLocaleString()} тг</strong>
//               </div>
//             </div>

//             <div style={{ marginTop: 20 }}>
//               <button className="btn btn--accent btn--lg" onClick={handleCreate} disabled={saving}>
//                 {saving ? "Формирование..." : "✓ Сформировать ведомость перевозчика"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }



import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";

function cleanCityName(city) {
  return (city || "")
    .replace(/__PRIVATE$/, "")
    .replace(/__LOADERS$/, "")
    .replace(/__CARRIERS$/, "")
    .trim()
    .toLowerCase();
}

function getTariffCategory(t) {
  const wr = t.weightRanges || {};
  return wr._category || (t.isPrivate ? "private" : "legal");
}

function toNum(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

// Ставка грузчика на человека, по весовым планкам тарифа (та же логика, что в ActCreatePage)
function findLoaderPricePerPerson(tariff, weight) {
  const wr = tariff.weightRanges || {};
  let price = 0;
  if (weight <= 10) price = toNum(wr.r10);
  else if (weight <= 20) price = toNum(wr.r20);
  else if (weight <= 30) price = toNum(wr.r30);
  else if (weight <= 80) price = toNum(wr.r80);
  else if (weight <= 150) price = toNum(wr.r150);
  else if (weight <= 300) price = toNum(wr.r300);
  else price = toNum(wr.r600);

  if (price <= 0) {
    price =
      toNum(wr.r10) || toNum(wr.r20) || toNum(wr.r30) ||
      toNum(wr.r80) || toNum(wr.r150) || toNum(wr.r300) || toNum(wr.r600);
  }
  return price;
}

import { useAuth } from "../../shared/auth/AuthContext";

export default function CarrierVedomostCreatePage() {
  const nav = useNavigate();
  const { isManager } = useAuth();
  const [searchParams] = useSearchParams();
  const [company, setCompany] = useState(getSelectedCompany());
  const [batches, setBatches] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [representatives, setRepresentatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState({});
  const [representativeRate, setRepresentativeRate] = useState("");
  const [saving, setSaving] = useState(false);
  // ТЗ: после формирования остаёмся на странице и даём распечатать
  const [createdVedomost, setCreatedVedomost] = useState(null);

  // ТЗ: суммы перевозчику/грузчикам/представителю — не для менеджеров
  if (isManager) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_body" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Доступ ограничен</div>
          <div className="muted">Ведомость перевозчика доступна только администратору и бухгалтеру.</div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    return subscribeSelectedCompany(c => setCompany(c));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [batchList, tariffList, carrierList, repList] = await Promise.all([
        api.batches.list(company?.id),
        api.tariffs.list(),
        api.carriers.list().catch(() => []),
        api.representatives.list().catch(() => []),
      ]);
      // ТЗ: ведомость перевозчика — только из УЖЕ сформированных партий,
      // которые ещё не входят ни в одну другую ведомость перевозчика
      const eligible = (Array.isArray(batchList) ? batchList : []).filter(
        b => b.isFormed && !b.carrierVedomostId
      );
      setBatches(eligible);
      setTariffs(Array.isArray(tariffList) ? tariffList : []);
      setCarriers(Array.isArray(carrierList) ? carrierList : []);
      setRepresentatives(Array.isArray(repList) ? repList : []);

      // Предвыбор партий, переданных из BatchesPage галочками
      const idsParam = searchParams.get('ids');
      if (idsParam) {
        const preselected = {};
        idsParam.split(',').forEach(id => { preselected[id] = true; });
        setSelectedIds(preselected);
      }
    } catch (e) {
      console.error(e);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company) load();
    else { setBatches([]); setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  const findCarrierTariff = (city) => {
    const cityClean = cleanCityName(city);
    return tariffs.find(t => getTariffCategory(t) === 'carriers' && cleanCityName(t.city) === cityClean);
  };

  const findLoaderTariff = (city) => {
    const cityClean = cleanCityName(city);
    return tariffs.find(t => getTariffCategory(t) === 'loaders' && cleanCityName(t.city) === cityClean);
  };

  const toggleBatch = (id) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedBatches = useMemo(
    () => batches.filter(b => selectedIds[b.id]),
    [batches, selectedIds]
  );

  // Разбивка по каждой выбранной партии + итоги — единая точка расчёта
  const breakdown = useMemo(() => {
    const rows = selectedBatches.map(b => {
      const weight = toNum(b.totalWeight);

      const carrierTariff = findCarrierTariff(b.city);
      const carrierRate = carrierTariff ? toNum(carrierTariff.pricePerKg) : 0;
      const carrierSum = Math.round(weight * carrierRate);
      const carrierName = b.carrierId
        ? (carriers.find(c => c.id === b.carrierId)?.name || "—")
        : "—";

      const loadersCount = toNum(b.loadersCount);
      const loaderTariff = loadersCount > 0 ? findLoaderTariff(b.city) : null;
const loaderRate = loaderTariff ? toNum(loaderTariff.pricePerKg) : 0;
const loaderSum = Math.round(weight * loaderRate);
      const representativeName = b.representativeId
        ? (representatives.find(r => r.id === b.representativeId)?.name || "—")
        : "—";

      return {
        batchId: b.id,
        number: b.number,
        city: b.city,
        weight,
        carrierId: b.carrierId,
        carrierName,
        carrierRate,
        carrierSum,
        carrierMissing: !!b.carrierId && !carrierTariff,
        loadersCount,
loaderRate,
        loaderSum,
        loaderMissing: loadersCount > 0 && !loaderTariff,
        representativeId: b.representativeId,
        representativeName,
      };
    });

    const totalWeight = rows.reduce((acc, r) => acc + r.weight, 0);
    const carrierSum = rows.reduce((acc, r) => acc + r.carrierSum, 0);
    const loaderSum = rows.reduce((acc, r) => acc + r.loaderSum, 0);
    const representativeSum = Math.round(totalWeight * toNum(representativeRate));

    return { rows, totalWeight, carrierSum, loaderSum, representativeSum };
  }, [selectedBatches, tariffs, carriers, representatives, representativeRate]);

  const hasMissingTariffs = breakdown.rows.some(r => r.carrierMissing || r.loaderMissing);

  // ТЗ: печать ведомости перевозчика — перевозчик, общий вес, тариф перевозчика,
  // сумма перевозчику, грузчики, тариф грузчика, сумма грузчика, представители,
  // тариф представителя, сумма представителю — суммы автоматические
  const printCarrierVedomost = (vedomostNumber, snapshot) => {
    const esc = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const rowsHtml = snapshot.rows.map((r, i) => `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${esc(r.number)}</td>
      <td>${esc(r.city)}</td>
      <td style="text-align:center">${r.weight} кг</td>
      <td>${esc(r.carrierName)}</td>
      <td style="text-align:center">${r.carrierRate} тг/кг</td>
      <td style="text-align:center;font-weight:700">${r.carrierSum.toLocaleString()} тг</td>
      <td style="text-align:center">${r.loadersCount || '—'}</td>
      <td style="text-align:center">${r.loadersCount > 0 ? r.loaderRate + ' тг/кг' : '—'}</td>
      <td style="text-align:center;font-weight:700">${r.loaderSum.toLocaleString()} тг</td>
      <td>${esc(r.representativeName)}</td>
    </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ведомость перевозчика ${esc(vedomostNumber)}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #000; }
      h2 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
      .sub { color: #333; font-size: 11px; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10px; }
      th, td { border: 1px solid #000; padding: 5px 6px; text-align: left; }
      th { background: #f3f4f6; font-weight: 700; text-align: center; }
      .totals { margin-top: 16px; display: flex; gap: 24px; flex-wrap: wrap; }
      .totals div { padding: 8px 14px; border: 1px solid #000; border-radius: 4px; font-weight: 700; }
      .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
      .sig { flex: 1; }
      .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 28px; }
      .sig-label { font-size: 10px; color: #333; text-align: center; }
    </style></head><body>
    <div class="header">
      <div>
        <h2>Ведомость перевозчика</h2>
        <div class="sub">${esc(snapshot.companyName)} &nbsp;&nbsp; № ${esc(vedomostNumber)} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:24px">№</th>
          <th>Партия</th>
          <th>Город</th>
          <th style="width:60px">Вес</th>
          <th>Перевозчик</th>
          <th style="width:70px">Тариф</th>
          <th style="width:80px">Сумма перевозчику</th>
          <th style="width:50px">Грузч.</th>
          <th style="width:70px">Тариф грузчика</th>
          <th style="width:80px">Сумма грузчикам</th>
          <th>Представитель</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="totals">
      <div>Общий вес: ${snapshot.totalWeight.toLocaleString()} кг</div>
      <div>Сумма перевозчику: ${snapshot.carrierSum.toLocaleString()} тг</div>
      <div>Сумма грузчикам: ${snapshot.loaderSum.toLocaleString()} тг</div>
      <div>Тариф представителя: ${snapshot.representativeRate} тг/кг</div>
      <div>Сумма представителю: ${snapshot.representativeSum.toLocaleString()} тг</div>
    </div>
    <div class="signatures">
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Составил (ФИО, подпись)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Принял (ФИО, подпись)</div></div>
    </div>
    <script>window.onload = () => { window.print(); }</script>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const handleCreate = async () => {
    if (selectedBatches.length === 0) {
      alert("Выберите хотя бы одну партию");
      return;
    }
    if (hasMissingTariffs) {
      const proceed = window.confirm(
        "Для некоторых партий не найден тариф перевозчика или грузчиков (сумма будет 0 по этой партии). Продолжить всё равно?"
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const snapshot = {
        rows: breakdown.rows,
        representativeRate: toNum(representativeRate),
        companyName: company?.name || "",
        totalWeight: breakdown.totalWeight,
        carrierSum: breakdown.carrierSum,
        loaderSum: breakdown.loaderSum,
        representativeSum: breakdown.representativeSum,
        createdAt: new Date().toISOString(),
      };

      const result = await api.carrierVedomosts.create({
        companyId: company?.id,
        batchIds: selectedBatches.map(b => b.id),
        data: snapshot,
        totalWeight: breakdown.totalWeight,
        carrierSum: breakdown.carrierSum,
        loaderSum: breakdown.loaderSum,
        representativeSum: breakdown.representativeSum,
      });

      // ТЗ: остаёмся на странице, даём распечатать сразу
      setCreatedVedomost({ number: result.number, snapshot });
    } catch (e) {
      alert("Ошибка при создании ведомости: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  // ---- Экран успеха после формирования ----
  if (createdVedomost) {
    return (
      <>
        <div className="navbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1>Ведомость перевозчика №{createdVedomost.number}</h1>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card_body" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Ведомость перевозчика №{createdVedomost.number} сформирована
            </div>
            <div className="muted" style={{ marginBottom: 24 }}>
              Партии ({createdVedomost.snapshot.rows.length}) закреплены за этой ведомостью и больше не будут доступны для повторного выбора.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn btn--accent btn--lg"
                onClick={() => printCarrierVedomost(createdVedomost.number, createdVedomost.snapshot)}
              >
                🖨 Распечатать ведомость
              </button>
              <button className="btn btn--lg" onClick={() => nav("/simple/batches")}>
                ← К партиям
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Ведомость перевозчика</h1>
          {company && <div className="chip">{company.name}</div>}
        </div>
        <button className="btn" onClick={() => nav("/simple/batches")}>← К партиям</button>
      </div>

      <div style={{ marginTop: 12, padding: '8px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.85rem' }}>
        💡 Отметьте партии, из которых нужно сформировать ведомость перевозчика. Доступны только уже <strong>сформированные</strong> партии, ещё не включённые в другую ведомость.
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th style={{ width: 120 }}>Номер</th>
                <th>Город</th>
                <th style={{ width: 100, textAlign: 'center' }}>Вес (кг)</th>
                <th style={{ width: 100, textAlign: 'center' }}>Грузчиков</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={5} className="muted" style={{ padding: 16 }}>
                  Нет доступных сформированных партий.
                </td></tr>
              ) : batches.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => toggleBatch(b.id)}>
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={!!selectedIds[b.id]} onChange={() => toggleBatch(b.id)} />
                  </td>
                  <td style={{ fontWeight: 700 }}>{b.number}</td>
                  <td>{b.city}</td>
                  <td style={{ textAlign: 'center' }}>{b.totalWeight || 0}</td>
                  <td style={{ textAlign: 'center' }}>{b.loadersCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedBatches.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card_head"><div className="card_title">Расчёт по выбранным партиям ({selectedBatches.length})</div></div>
          <div className="card_body">
            <table className="table_fixed">
              <thead>
                <tr>
                  <th>Партия</th>
                  <th>Город</th>
                  <th style={{ textAlign: 'center' }}>Вес</th>
                  <th>Перевозчик</th>
                  <th style={{ textAlign: 'center' }}>Тариф перевозчика</th>
                  <th style={{ textAlign: 'center' }}>Сумма перевозчику</th>
                  <th style={{ textAlign: 'center' }}>Грузчиков × тариф</th>
                  <th style={{ textAlign: 'center' }}>Сумма грузчикам</th>
                  <th>Представитель</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.rows.map(r => (
                  <tr key={r.batchId}>
                    <td>{r.number}</td>
                    <td>{r.city}</td>
                    <td style={{ textAlign: 'center' }}>{r.weight} кг</td>
                    <td>{r.carrierName}</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.carrierMissing ? <span style={{ color: '#dc2626' }}>тариф не найден</span> : `${r.carrierRate} тг/кг`}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.carrierSum.toLocaleString()} тг</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.loadersCount > 0
                        ? (r.loaderMissing ? <span style={{ color: '#dc2626' }}>тариф не найден</span> : `${r.weight} кг × ${r.loaderRate} тг/кг`)
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.loaderSum.toLocaleString()} тг</td>
                    <td>{r.representativeName}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="field" style={{ width: 220 }}>
                <div className="label">Тариф представителя (тг/кг)</div>
                <input
                  type="number"
                  value={representativeRate}
                  onChange={e => setRepresentativeRate(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                Общий вес: <strong>{breakdown.totalWeight.toLocaleString()} кг</strong>
              </div>
              <div style={{ padding: '8px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                Сумма перевозчику: <strong>{breakdown.carrierSum.toLocaleString()} тг</strong>
              </div>
              <div style={{ padding: '8px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                Сумма грузчикам: <strong>{breakdown.loaderSum.toLocaleString()} тг</strong>
              </div>
              <div style={{ padding: '8px 16px', background: '#fdf4ff', borderRadius: 8, border: '1px solid #f0abfc' }}>
                Сумма представителю: <strong>{breakdown.representativeSum.toLocaleString()} тг</strong>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button className="btn btn--accent btn--lg" onClick={handleCreate} disabled={saving}>
                {saving ? "Формирование..." : "✓ Сформировать ведомость перевозчика"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}