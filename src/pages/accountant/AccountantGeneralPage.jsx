// // // import React, { useEffect, useMemo, useState } from "react";
// // // import { Link } from "react-router-dom";
// // // import { api } from "../../shared/api/api.js";
// // // import { useAuth } from "../../shared/auth/AuthContext";
// // // import Loader from "../../shared/components/Loader";

// // // function formatDisplayDate(val) {
// // //   if (!val) return "—";
// // //   const d = new Date(val);
// // //   if (isNaN(d.getTime())) return val;
// // //   const day = String(d.getDate()).padStart(2, "0");
// // //   const month = String(d.getMonth() + 1).padStart(2, "0");
// // //   const year = d.getFullYear();
// // //   return `${day}.${month}.${year}`;
// // // }

// // // function normalizeIsoDate(val) {
// // //   if (!val) return "";
// // //   const d = new Date(val);
// // //   if (isNaN(d.getTime())) return "";
// // //   const yyyy = d.getFullYear();
// // //   const mm = String(d.getMonth() + 1).padStart(2, "0");
// // //   const dd = String(d.getDate()).padStart(2, "0");
// // //   return `${yyyy}-${mm}-${dd}`;
// // // }

// // // export default function AccountantGeneralPage() {
// // //   const { isAccountant, isAdmin } = useAuth();
// // //   const [q, setQ] = useState("");
// // //   const [dateFrom, setDateFrom] = useState("");
// // //   const [dateTo, setDateTo] = useState("");
// // //   const [docTypeFilter, setDocTypeFilter] = useState("all");
// // //   const [statusFilter, setStatusFilter] = useState("all");
// // //   const [snoFilter, setSnoFilter] = useState("all");
// // //   const [avrFilter, setAvrFilter] = useState("all");
// // //   const [esfFilter, setEsfFilter] = useState("all"); // Новое: ЭСФ
// // //   const [acts, setActs] = useState([]);
// // //   const [loading, setLoading] = useState(true);

// // //   const loadActs = async () => {
// // //     setLoading(true);
// // //     try {
// // //       // Загружаем все заявки со всех компаний
// // //       const list = await api.requests.list();
// // //       if (Array.isArray(list)) {
// // //         const parsed = list.map(a => {
// // //            let details = {};
// // //            if (a.details) {
// // //               try {
// // //                 details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
// // //               } catch (e) { console.error("Parse error", e); }
// // //            }
// // //            return { ...a, ...details };
// // //         });
// // //         setActs(parsed);
// // //       } else {
// // //         setActs([]);
// // //       }
// // //     } catch (e) {
// // //       console.error("Failed to load acts", e);
// // //       setActs([]);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   const toggleProcessed = async (actId, currentVal) => {
// // //     try {
// // //       await api.requests.update(actId, { isProcessedByAccountant: !currentVal });
// // //       // Обновляем локальное состояние для мгновенного отклика
// // //       setActs(prev => prev.map(a => a.id === actId ? { ...a, isProcessedByAccountant: !currentVal } : a));
// // //     } catch (err) {
// // //       alert("Ошибка при обновлении статуса: " + err.message);
// // //     }
// // //   };

// // //   useEffect(() => {
// // //     loadActs();
// // //   }, []);

// // //   const filtered = useMemo(() => {
// // //     // 1. Обязательное условие: только отработанные (отправленные бухгалтеру) и не отложенные
// // //     let list = acts.filter(a => !!a.readyForAccountant && !a.isDeferredForAccountant);

// // //     // Фильтр по типу документа
// // //     if (docTypeFilter !== "all") {
// // //         if (docTypeFilter === "warehouse") {
// // //             list = list.filter(a => a.isWarehouse);
// // //         } else if (docTypeFilter === "ttn") {
// // //             list = list.filter(a => !a.isWarehouse && (a.docType === "ttn" || a.type === "ttn"));
// // //         } else if (docTypeFilter === "smr") {
// // //             list = list.filter(a => !a.isWarehouse && (a.docType === "smr" || a.type === "smr"));
// // //         } else if (docTypeFilter === "request") {
// // //             list = list.filter(a => !a.isWarehouse && !a.docType && a.type !== "ttn" && a.type !== "smr");
// // //         }
// // //     }

// // //     // Фильтр по статусу (Активные / Аннулированные)
// // //     if (statusFilter !== "all") {
// // //         if (statusFilter === "canceled") {
// // //             list = list.filter(a => a.status === "canceled");
// // //         } else if (statusFilter === "active") {
// // //             list = list.filter(a => a.status !== "canceled" && a.status !== "draft");
// // //         } else if (statusFilter === "draft") {
// // //             list = list.filter(a => a.status === "draft");
// // //         }
// // //     }

// // //     // Фильтр по СНО
// // //     if (snoFilter !== "all") {
// // //         if (snoFilter === "done") {
// // //              list = list.filter(a => !!a.snoIssued);
// // //         } else if (snoFilter === "pending") {
// // //              list = list.filter(a => !a.snoIssued);
// // //         }
// // //     }

// // //     // Фильтр по АВР
// // //     if (avrFilter !== "all") {
// // //         if (avrFilter === "done") {
// // //              list = list.filter(a => !!a.avrSent);
// // //         } else if (avrFilter === "pending") {
// // //              list = list.filter(a => !a.avrSent);
// // //         }
// // //     }

// // //     // Фильтр по ЭСФ
// // //     if (esfFilter !== "all") {
// // //         if (esfFilter === "done") {
// // //              list = list.filter(a => !!a.esfIssued);
// // //         } else if (esfFilter === "pending") {
// // //              list = list.filter(a => !a.esfIssued);
// // //         }
// // //     }

// // //     // 2. По дате
// // //     if (dateFrom) {
// // //        list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) >= dateFrom);
// // //     }
// // //     if (dateTo) {
// // //        list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) <= dateTo);
// // //     }

// // //     // 3. Поиск
// // //     const s = q.trim().toLowerCase();
// // //     if (s) {
// // //        list = list.filter((a) => {
// // //         const hay = [
// // //           a.number, 
// // //           a.docNumber, 
// // //           a.date, 
// // //           a.customer?.fio, 
// // //           a.customer?.companyName,
// // //           a.route?.fromCity, 
// // //           a.route?.toCity, 
// // //           a.company?.name
// // //         ]
// // //           .filter(Boolean)
// // //           .join(" ")
// // //           .toLowerCase();
// // //         return hay.includes(s);
// // //       });
// // //     }
    
// // //     return list;
// // //   }, [acts, q, dateFrom, dateTo, docTypeFilter, statusFilter, snoFilter, avrFilter, esfFilter]);



// // //   return (
// // //     <>
// // //       <div className="navbar">
// // //         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
// // //           <h1>Все заявки</h1>
// // //           <div className="chip" style={{ background: "#f6ffed", borderColor: "#b7eb8f", color: "#389e0d" }}>
// // //             Бухгалтерия
// // //           </div>
// // //         </div>
// // //       </div>

// // //       <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
// // //         <div className="field" style={{ minWidth: 200, flex: 1 }}>
// // //           <div className="label">Поиск</div>
// // //           <input
// // //             value={q}
// // //             onChange={(e) => setQ(e.target.value)}
// // //             placeholder="Номер, заказчик, компания..."
// // //           />
// // //         </div>
// // //         <div className="field" style={{ width: 140 }}>
// // //            <div className="label">Тип</div>
// // //            <select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
// // //                <option value="all">Все</option>
// // //                <option value="request">Только Заявки</option>
// // //                <option value="ttn">ТТН</option>
// // //                <option value="smr">СМР</option>
// // //                <option value="warehouse">Склад</option>
// // //            </select>
// // //         </div>
// // //         <div className="field" style={{ width: 140 }}>
// // //            <div className="label">Статус</div>
// // //            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
// // //                <option value="all">Все</option>
// // //                <option value="active">Активные</option>
// // //                <option value="canceled">Аннулированные</option>
// // //                <option value="draft">Черновики</option>
// // //            </select>
// // //         </div>
// // //         <div className="field" style={{ width: 140 }}>
// // //            <div className="label">СНО</div>
// // //            <select value={snoFilter} onChange={e => setSnoFilter(e.target.value)}>
// // //                <option value="all">Все</option>
// // //                <option value="pending">Ожидает СНО</option>
// // //                <option value="done">Выставлен</option>
// // //            </select>
// // //         </div>
// // //         <div className="field" style={{ width: 140 }}>
// // //            <div className="label">АВР</div>
// // //            <select value={avrFilter} onChange={e => setAvrFilter(e.target.value)}>
// // //                <option value="all">Все</option>
// // //                <option value="pending">Ожидает АВР</option>
// // //                <option value="done">Отправлен</option>
// // //            </select>
// // //         </div>
// // //         <div className="field" style={{ width: 140 }}>
// // //            <div className="label">ЭСФ</div>
// // //            <select value={esfFilter} onChange={e => setEsfFilter(e.target.value)}>
// // //                <option value="all">Все</option>
// // //                <option value="pending">Ожидает ЭСФ</option>
// // //                <option value="done">Выставлен</option>
// // //            </select>
// // //         </div>
// // //         <div className="field" style={{ width: 140 }}>
// // //            <div className="label">Дата с</div>
// // //            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
// // //         </div>
// // //         <div className="field" style={{ width: 140 }}>
// // //            <div className="label">Дата по</div>
// // //            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
// // //         </div>
// // //       </div>

// // //       <div className="table_wrap" style={{ marginTop: 16 }}>
// // //         {loading ? (
// // //           <Loader />
// // //         ) : (
// // //           <table className="table_fixed">
// // //             <thead>
// // //               <tr>
// // //                 <th style={{ width: 100 }}>Номер</th>
// // //                 <th style={{ width: 100 }}>Дата</th>
// // //                 <th>Заказчик</th>
// // //                 <th style={{ width: 80 }}>Мест</th>
// // //                 <th style={{ width: 90 }}>Вес</th>
// // //                 <th style={{ width: 120 }}>Сумма</th>
// // //                 <th>Маршрут</th>
// // //                 <th style={{ width: 60, textAlign: 'center' }}>СНО</th>
// // //                 <th style={{ width: 60, textAlign: 'center' }}>АВР</th>
// // //                 <th style={{ width: 60, textAlign: 'center' }}>ЭСФ</th>
// // //                 <th style={{ width: 80, textAlign: 'center' }}>Статус</th>
// // //               </tr>
// // //             </thead>
// // //             <tbody>
// // //               {filtered.length === 0 ? (
// // //                 <tr>
// // //                   <td colSpan={10} className="muted" style={{ padding: 16 }}>
// // //                     В общем котле нет документов.
// // //                   </td>
// // //                 </tr>
// // //               ) : (
// // //                 filtered.map((a) => (
// // //                   <tr key={a.id} style={{ 
// // //                     opacity: a.status === 'canceled' ? 0.5 : 1,
// // //                     background: !a.isViewedByAccountant ? 'rgba(37, 99, 235, 0.05)' : 'inherit',
// // //                     borderLeft: !a.isViewedByAccountant ? '4px solid #2563eb' : 'none'
// // //                   }}>
// // //                     <td className="num">
// // //                       <Link to={`/accountant/acts/${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
// // //                         {!a.isViewedByAccountant && (
// // //                           <span title="Новая заявка" style={{ 
// // //                             width: 8, height: 8, background: '#2563eb', borderRadius: '50%', display: 'inline-block' 
// // //                           }} />
// // //                         )}
// // //                         {a.docNumber || a.number}
// // //                       </Link>
// // //                     </td>
// // //                     <td>{formatDisplayDate(a.createdAt || a.date)}</td>
// // //                     <td><div style={{ fontWeight: 500 }}>{a.customer?.companyName || a.customer?.fio || "—"}</div></td>
// // //                     <td>{a.totals?.seats || "—"}</td>
// // //                     <td>{a.totals?.weight ? `${a.totals.weight} кг` : "—"}</td>
// // //                     <td style={{ fontWeight: 700 }}>{a.totalSum ? `${parseFloat(a.totalSum).toLocaleString()} тг` : "—"}</td>
// // //                     <td>
// // //                       {a.isWarehouse ? (
// // //                         <span className="badge" style={{ background: '#e6f7ff', color: '#1890ff' }}>Склад</span>
// // //                       ) : (
// // //                         <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
// // //                           {a.route?.fromCity || "—"} → {a.route?.toCity || "—"}
// // //                         </div>
// // //                       )}
// // //                     </td>
// // //                     <td style={{ textAlign: "center" }}>
// // //                       {a.snoIssued ? (
// // //                         <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
// // //                       ) : (
// // //                         <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
// // //                       )}
// // //                     </td>
// // //                     <td style={{ textAlign: "center" }}>
// // //                       {a.avrSent ? (
// // //                         <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
// // //                       ) : (
// // //                         <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
// // //                       )}
// // //                     </td>
// // //                     <td style={{ textAlign: "center" }}>
// // //                       {a.esfIssued ? (
// // //                         <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
// // //                       ) : (
// // //                         <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
// // //                       )}
// // //                     </td>
// // //                     <td style={{ textAlign: "center" }}>
// // //                       {a.isProcessedByAccountant ? (
// // //                         <button 
// // //                           className="btn-icon" 
// // //                           onClick={() => toggleProcessed(a.id, true)}
// // //                           title="Отработано (Нажмите, чтобы отменить)"
// // //                           style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
// // //                         >
// // //                           ✅
// // //                         </button>
// // //                       ) : (
// // //                         <button 
// // //                           className="btn-icon" 
// // //                           onClick={() => toggleProcessed(a.id, false)}
// // //                           title="Пометить как отработанное"
// // //                           style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', filter: 'grayscale(1)', opacity: 0.4 }}
// // //                         >
// // //                           ⏳
// // //                         </button>
// // //                       )}
// // //                     </td>
// // //                   </tr>
// // //                 ))
// // //               )}
// // //             </tbody>
// // //           </table>
// // //         )}
// // //       </div>
// // //     </>
// // //   );
// // // }

// // import React, { useEffect, useMemo, useState } from "react";
// // import { Link } from "react-router-dom";
// // import { api } from "../../shared/api/api.js";
// // import { useAuth } from "../../shared/auth/AuthContext";
// // import Loader from "../../shared/components/Loader";

// // function formatDisplayDate(val) {
// //   if (!val) return "—";
// //   const d = new Date(val);
// //   if (isNaN(d.getTime())) return val;
// //   const day = String(d.getDate()).padStart(2, "0");
// //   const month = String(d.getMonth() + 1).padStart(2, "0");
// //   const year = d.getFullYear();
// //   return `${day}.${month}.${year}`;
// // }

// // function normalizeIsoDate(val) {
// //   if (!val) return "";
// //   const d = new Date(val);
// //   if (isNaN(d.getTime())) return "";
// //   const yyyy = d.getFullYear();
// //   const mm = String(d.getMonth() + 1).padStart(2, "0");
// //   const dd = String(d.getDate()).padStart(2, "0");
// //   return `${yyyy}-${mm}-${dd}`;
// // }

// // const COMPANY_COLORS = {
// //   'tasu_kz': '#7c3aed',
// //   'aldiyar': '#059669',
// //   'tasu_kaz': '#d97706',
// // };

// // const getCompanyColor = (companyId) => {
// //   return COMPANY_COLORS[companyId] || '#cbd5e1';
// // };

// // export default function AccountantGeneralPage() {
// //   const { isAccountant, isAdmin } = useAuth();
// //   const [q, setQ] = useState("");
// //   const [dateFrom, setDateFrom] = useState("");
// //   const [dateTo, setDateTo] = useState("");
// //   const [docTypeFilter, setDocTypeFilter] = useState("all");
// //   const [statusFilter, setStatusFilter] = useState("all");
// //   const [snoFilter, setSnoFilter] = useState("all");
// //   const [avrFilter, setAvrFilter] = useState("all");
// //   const [esfFilter, setEsfFilter] = useState("all");
// //   const [acts, setActs] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [tab, setTab] = useState("active");

// //   const loadActs = async () => {
// //     setLoading(true);
// //     try {
// //       const list = await api.requests.list();
// //       if (Array.isArray(list)) {
// //         const parsed = list.map(a => {
// //            let details = {};
// //            if (a.details) {
// //               try {
// //                 details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
// //               } catch (e) { console.error("Parse error", e); }
// //            }
// //            return { ...a, ...details };
// //         });
// //         setActs(parsed);
// //       } else {
// //         setActs([]);
// //       }
// //     } catch (e) {
// //       console.error("Failed to load acts", e);
// //       setActs([]);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const toggleProcessed = async (actId, currentVal) => {
// //     try {
// //       await api.requests.update(actId, { isProcessedByAccountant: !currentVal });
// //       setActs(prev => prev.map(a => a.id === actId ? { ...a, isProcessedByAccountant: !currentVal } : a));
// //     } catch (err) {
// //       alert("Ошибка при обновлении статуса: " + err.message);
// //     }
// //   };

// //   useEffect(() => {
// //     loadActs();
// //   }, []);

// //   const filtered = useMemo(() => {
// //     let list = acts.filter(a => !!a.readyForAccountant && !a.isDeferredForAccountant);

// //     if (tab === "active") {
// //       list = list.filter(a => !a.isProcessedByAccountant);
// //     } else {
// //       list = list.filter(a => !!a.isProcessedByAccountant);
// //     }

// //     if (docTypeFilter !== "all") {
// //         if (docTypeFilter === "warehouse") {
// //             list = list.filter(a => a.isWarehouse);
// //         } else if (docTypeFilter === "ttn") {
// //             list = list.filter(a => !a.isWarehouse && (a.docType === "ttn" || a.type === "ttn"));
// //         } else if (docTypeFilter === "smr") {
// //             list = list.filter(a => !a.isWarehouse && (a.docType === "smr" || a.type === "smr"));
// //         } else if (docTypeFilter === "request") {
// //             list = list.filter(a => !a.isWarehouse && !a.docType && a.type !== "ttn" && a.type !== "smr");
// //         }
// //     }

// //     if (statusFilter !== "all") {
// //         if (statusFilter === "canceled") {
// //             list = list.filter(a => a.status === "canceled");
// //         } else if (statusFilter === "active") {
// //             list = list.filter(a => a.status !== "canceled" && a.status !== "draft");
// //         } else if (statusFilter === "draft") {
// //             list = list.filter(a => a.status === "draft");
// //         }
// //     }

// //     if (snoFilter !== "all") {
// //         if (snoFilter === "done") list = list.filter(a => !!a.snoIssued);
// //         else if (snoFilter === "pending") list = list.filter(a => !a.snoIssued);
// //     }

// //     if (avrFilter !== "all") {
// //         if (avrFilter === "done") list = list.filter(a => !!a.avrSent);
// //         else if (avrFilter === "pending") list = list.filter(a => !a.avrSent);
// //     }

// //     if (esfFilter !== "all") {
// //         if (esfFilter === "done") list = list.filter(a => !!a.esfIssued);
// //         else if (esfFilter === "pending") list = list.filter(a => !a.esfIssued);
// //     }

// //     if (dateFrom) list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) >= dateFrom);
// //     if (dateTo) list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) <= dateTo);

// //     const s = q.trim().toLowerCase();
// //     if (s) {
// //        list = list.filter((a) => {
// //         const hay = [
// //           a.number, a.docNumber, a.date,
// //           a.customer?.fio, a.customer?.companyName,
// //           a.route?.fromCity, a.route?.toCity, a.company?.name
// //         ].filter(Boolean).join(" ").toLowerCase();
// //         return hay.includes(s);
// //       });
// //     }

// //     return list;
// //   }, [acts, q, dateFrom, dateTo, docTypeFilter, statusFilter, snoFilter, avrFilter, esfFilter, tab]);

// //   const totals = useMemo(() => {
// //     return filtered.reduce((acc, a) => {
// //       acc.count += 1;
// //       acc.seats += Number(a.totals?.seats) || 0;
// //       acc.weight += Number(a.totals?.weight) || 0;
// //       acc.sum += Number(a.totalSum) || 0;
// //       return acc;
// //     }, { count: 0, seats: 0, weight: 0, sum: 0 });
// //   }, [filtered]);

// //   const exportToExcel = (data) => {
// //     const rows = [
// //       ['Номер', 'Дата', 'Заказчик', 'Маршрут', 'Мест', 'Вес (кг)', 'Сумма (тг)', 'СНО', 'АВР', 'ЭСФ', 'Компания'],
// //       ...data.map(a => [
// //         a.docNumber || a.number || '',
// //         formatDisplayDate(a.createdAt || a.date),
// //         a.customer?.companyName || a.customer?.fio || '',
// //         `${a.route?.fromCity || ''} → ${a.route?.toCity || ''}`,
// //         a.totals?.seats || '',
// //         a.totals?.weight || '',
// //         a.totalSum ? parseFloat(a.totalSum).toLocaleString() : '',
// //         a.snoIssued ? 'Да' : 'Нет',
// //         a.avrSent ? 'Да' : 'Нет',
// //         a.esfIssued ? 'Да' : 'Нет',
// //         a.company?.name || a.companyId || '',
// //       ])
// //     ];
// //     const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
// //     const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
// //     const url = URL.createObjectURL(blob);
// //     const link = document.createElement('a');
// //     link.href = url;
// //     link.download = `заявки_${new Date().toLocaleDateString('ru')}.csv`;
// //     link.click();
// //     URL.revokeObjectURL(url);
// //   };

// //   return (
// //     <>
// //       <div className="navbar">
// //         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
// //           <h1>Все заявки</h1>
// //           <div className="chip" style={{ background: "#f6ffed", borderColor: "#b7eb8f", color: "#389e0d" }}>
// //             Бухгалтерия
// //           </div>
// //         </div>
// //         <button className="btn" onClick={() => exportToExcel(filtered)}>
// //           📥 Скачать Excel
// //         </button>
// //       </div>

// //       <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
// //         <button
// //           className={`btn ${tab === 'active' ? 'btn--accent' : ''}`}
// //           onClick={() => setTab('active')}
// //         >
// //           Активные
// //         </button>
// //         <button
// //           className={`btn ${tab === 'processed' ? 'btn--accent' : ''}`}
// //           onClick={() => setTab('processed')}
// //         >
// //           Отработанные
// //         </button>
// //       </div>

// //       <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
// //         <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
// //           <span style={{ width: 12, height: 12, borderRadius: 2, background: '#7c3aed', display: 'inline-block' }} />
// //           ИП TASU KZ
// //         </div>
// //         <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
// //           <span style={{ width: 12, height: 12, borderRadius: 2, background: '#059669', display: 'inline-block' }} />
// //           ИП Алдияр
// //         </div>
// //         <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
// //           <span style={{ width: 12, height: 12, borderRadius: 2, background: '#d97706', display: 'inline-block' }} />
// //           ТОО TASU KAZAKHSTAN
// //         </div>
// //       </div>

// //       <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
// //         <div className="field" style={{ minWidth: 200, flex: 1 }}>
// //           <div className="label">Поиск</div>
// //           <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Номер, заказчик, компания..." />
// //         </div>
// //         <div className="field" style={{ width: 140 }}>
// //            <div className="label">Тип</div>
// //            <select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
// //                <option value="all">Все</option>
// //                <option value="request">Только Заявки</option>
// //                <option value="ttn">ТТН</option>
// //                <option value="smr">СМР</option>
// //                <option value="warehouse">Склад</option>
// //            </select>
// //         </div>
// //         <div className="field" style={{ width: 140 }}>
// //            <div className="label">Статус</div>
// //            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
// //                <option value="all">Все</option>
// //                <option value="active">Активные</option>
// //                <option value="canceled">Аннулированные</option>
// //                <option value="draft">Черновики</option>
// //            </select>
// //         </div>
// //         <div className="field" style={{ width: 140 }}>
// //            <div className="label">СНО</div>
// //            <select value={snoFilter} onChange={e => setSnoFilter(e.target.value)}>
// //                <option value="all">Все</option>
// //                <option value="pending">Ожидает СНО</option>
// //                <option value="done">Выставлен</option>
// //            </select>
// //         </div>
// //         <div className="field" style={{ width: 140 }}>
// //            <div className="label">АВР</div>
// //            <select value={avrFilter} onChange={e => setAvrFilter(e.target.value)}>
// //                <option value="all">Все</option>
// //                <option value="pending">Ожидает АВР</option>
// //                <option value="done">Отправлен</option>
// //            </select>
// //         </div>
// //         <div className="field" style={{ width: 140 }}>
// //            <div className="label">ЭСФ</div>
// //            <select value={esfFilter} onChange={e => setEsfFilter(e.target.value)}>
// //                <option value="all">Все</option>
// //                <option value="pending">Ожидает ЭСФ</option>
// //                <option value="done">Выставлен</option>
// //            </select>
// //         </div>
// //         <div className="field" style={{ width: 140 }}>
// //            <div className="label">Дата с</div>
// //            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
// //         </div>
// //         <div className="field" style={{ width: 140 }}>
// //            <div className="label">Дата по</div>
// //            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
// //         </div>
// //       </div>

// //       {/* Итоги */}
// //       <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
// //         <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
// //           Заявок: <strong>{totals.count}</strong>
// //         </div>
// //         <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
// //           Мест: <strong>{totals.seats}</strong>
// //         </div>
// //         <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
// //           Вес: <strong>{totals.weight} кг</strong>
// //         </div>
// //         <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
// //           Сумма: <strong>{totals.sum.toLocaleString()} тг</strong>
// //         </div>
// //       </div>

// //       <div className="table_wrap" style={{ marginTop: 16 }}>
// //         {loading ? (
// //           <Loader />
// //         ) : (
// //           <table className="table_fixed">
// //             <thead>
// //               <tr>
// //                 <th style={{ width: 100 }}>Номер</th>
// //                 <th style={{ width: 100 }}>Дата</th>
// //                 <th>Заказчик</th>
// //                 <th style={{ width: 80 }}>Мест</th>
// //                 <th style={{ width: 90 }}>Вес</th>
// //                 <th style={{ width: 120 }}>Сумма</th>
// //                 <th>Маршрут</th>
// //                 <th style={{ width: 60, textAlign: 'center' }}>СНО</th>
// //                 <th style={{ width: 60, textAlign: 'center' }}>АВР</th>
// //                 <th style={{ width: 60, textAlign: 'center' }}>ЭСФ</th>
// //                 <th style={{ width: 80, textAlign: 'center' }}>Статус</th>
// //               </tr>
// //             </thead>
// //             <tbody>
// //               {filtered.length === 0 ? (
// //                 <tr>
// //                   <td colSpan={11} className="muted" style={{ padding: 16 }}>
// //                     В общем котле нет документов.
// //                   </td>
// //                 </tr>
// //               ) : (
// //                 filtered.map((a) => (
// //                   <tr key={a.id} style={{
// //                     opacity: a.status === 'canceled' ? 0.5 : 1,
// //                     background: !a.isViewedByAccountant ? 'rgba(37, 99, 235, 0.05)' : 'inherit',
// //                     borderLeft: !a.isViewedByAccountant ? '4px solid #2563eb' : `4px solid ${getCompanyColor(a.companyId)}`
// //                   }}>
// //                     <td className="num">
// //                       <Link to={`/accountant/acts/${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
// //                         {!a.isViewedByAccountant && (
// //                           <span title="Новая заявка" style={{
// //                             width: 8, height: 8, background: '#2563eb', borderRadius: '50%', display: 'inline-block'
// //                           }} />
// //                         )}
// //                         {a.docNumber || a.number}
// //                       </Link>
// //                     </td>
// //                     <td>{formatDisplayDate(a.createdAt || a.date)}</td>
// //                     <td><div style={{ fontWeight: 500 }}>{a.customer?.companyName || a.customer?.fio || "—"}</div></td>
// //                     <td>{a.totals?.seats || "—"}</td>
// //                     <td>{a.totals?.weight ? `${a.totals.weight} кг` : "—"}</td>
// //                     <td style={{ fontWeight: 700 }}>{a.totalSum ? `${parseFloat(a.totalSum).toLocaleString()} тг` : "—"}</td>
// //                     <td>
// //                       {a.isWarehouse ? (
// //                         <span className="badge" style={{ background: '#e6f7ff', color: '#1890ff' }}>Склад</span>
// //                       ) : (
// //                         <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
// //                           {a.route?.fromCity || "—"} → {a.route?.toCity || "—"}
// //                         </div>
// //                       )}
// //                     </td>
// //                     <td style={{ textAlign: "center" }}>
// //                       {a.snoIssued ? (
// //                         <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
// //                       ) : (
// //                         <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
// //                       )}
// //                     </td>
// //                     <td style={{ textAlign: "center" }}>
// //                       {a.avrSent ? (
// //                         <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
// //                       ) : (
// //                         <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
// //                       )}
// //                     </td>
// //                     <td style={{ textAlign: "center" }}>
// //                       {a.esfIssued ? (
// //                         <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
// //                       ) : (
// //                         <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
// //                       )}
// //                     </td>
// //                     <td style={{ textAlign: "center" }}>
// //                       {a.isProcessedByAccountant ? (
// //                         <button
// //                           className="btn-icon"
// //                           onClick={() => toggleProcessed(a.id, true)}
// //                           title="Отработано (Нажмите, чтобы отменить)"
// //                           style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
// //                         >
// //                           ✅
// //                         </button>
// //                       ) : (
// //                         <button
// //                           className="btn-icon"
// //                           onClick={() => toggleProcessed(a.id, false)}
// //                           title="Пометить как отработанное"
// //                           style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', filter: 'grayscale(1)', opacity: 0.4 }}
// //                         >
// //                           ⏳
// //                         </button>
// //                       )}
// //                     </td>
// //                   </tr>
// //                 ))
// //               )}
// //             </tbody>
// //           </table>
// //         )}
// //       </div>
// //     </>
// //   );
// // }



// import React, { useEffect, useMemo, useState } from "react";
// import { Link } from "react-router-dom";
// import { api } from "../../shared/api/api.js";
// import { useAuth } from "../../shared/auth/AuthContext";
// import Loader from "../../shared/components/Loader";

// function formatDisplayDate(val) {
//   if (!val) return "—";
//   const d = new Date(val);
//   if (isNaN(d.getTime())) return val;
//   const day = String(d.getDate()).padStart(2, "0");
//   const month = String(d.getMonth() + 1).padStart(2, "0");
//   const year = d.getFullYear();
//   return `${day}.${month}.${year}`;
// }

// function normalizeIsoDate(val) {
//   if (!val) return "";
//   const d = new Date(val);
//   if (isNaN(d.getTime())) return "";
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`;
// }

// // Палитра для динамического раскрашивания компаний.
// // Цвет назначается по индексу компании в списке — каждая получает свой.
// const COLOR_PALETTE = [
//   '#7c3aed', // фиолетовый
//   '#059669', // зелёный
//   '#d97706', // оранжевый
//   '#dc2626', // красный
//   '#2563eb', // синий
//   '#db2777', // розовый
//   '#0891b2', // циан
//   '#65a30d', // лайм
//   '#9333ea', // пурпурный
//   '#ea580c', // оранжево-красный
// ];

// /**
//  * Детерминированный цвет для компании по её id.
//  * Одна и та же компания всегда получает один и тот же цвет.
//  */
// function getCompanyColor(companyId, companyList) {
//   if (!companyId || !Array.isArray(companyList)) return '#cbd5e1';
//   const idx = companyList.findIndex(c => c.id === companyId);
//   if (idx < 0) return '#cbd5e1';
//   return COLOR_PALETTE[idx % COLOR_PALETTE.length];
// }

// export default function AccountantGeneralPage() {
//   const { isAccountant, isAdmin } = useAuth();
//   const [q, setQ] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [docTypeFilter, setDocTypeFilter] = useState("all");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [snoFilter, setSnoFilter] = useState("all");
//   const [avrFilter, setAvrFilter] = useState("all");
//   const [esfFilter, setEsfFilter] = useState("all");
//   // ТЗ: Бухгалтер — фильтрация по компаниям
//   const [companyFilter, setCompanyFilter] = useState("all");
//   const [acts, setActs] = useState([]);
//   const [companies, setCompanies] = useState([]);
//   const [loading, setLoading] = useState(true);
//   // ТЗ: Добавить фильтрацию активных и завершённых
//   const [tab, setTab] = useState("active");

//   const loadData = async () => {
//     setLoading(true);
//     try {
//       const [list, compList] = await Promise.all([
//         api.requests.list(),
//         api.companies.list().catch(() => []),
//       ]);

//       if (Array.isArray(compList)) setCompanies(compList);

//       if (Array.isArray(list)) {
//         const parsed = list.map(a => {
//            let details = {};
//            if (a.details) {
//               try {
//                 details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
//               } catch (e) { console.error("Parse error", e); }
//            }
//            return { ...a, ...details };
//         });
//         setActs(parsed);
//       } else {
//         setActs([]);
//       }
//     } catch (e) {
//       console.error("Failed to load data", e);
//       setActs([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const toggleProcessed = async (actId, currentVal) => {
//     try {
//       if (!currentVal) {
//         // Помечаем как отработанное через специальный endpoint —
//         // он сам проставит completedAt и проверит роль ACCOUNTANT на бэке
//         await api.requests.completeByAccountant(actId);
//       } else {
//         // Снятие отметки — обычный update
//         await api.requests.update(actId, { isProcessedByAccountant: false });
//       }
//       setActs(prev => prev.map(a => a.id === actId ? { ...a, isProcessedByAccountant: !currentVal } : a));
//     } catch (err) {
//       alert("Ошибка при обновлении статуса: " + err.message);
//     }
//   };

//   useEffect(() => {
//     loadData();
//   }, []);

//   const filtered = useMemo(() => {
//     // Базовое условие: только отправленные бухгалтеру и не отложенные
//     let list = acts.filter(a => !!a.readyForAccountant && !a.isDeferredForAccountant);

//     // ТЗ: Активные / Завершённые
//     if (tab === "active") {
//       list = list.filter(a => !a.isProcessedByAccountant);
//     } else {
//       list = list.filter(a => !!a.isProcessedByAccountant);
//     }

//     // ТЗ: Фильтр по компаниям
//     if (companyFilter !== "all") {
//       list = list.filter(a => a.companyId === companyFilter);
//     }

//     if (docTypeFilter !== "all") {
//         if (docTypeFilter === "warehouse") {
//             list = list.filter(a => a.isWarehouse);
//         } else if (docTypeFilter === "ttn") {
//             list = list.filter(a => !a.isWarehouse && (a.docType === "ttn" || a.type === "ttn"));
//         } else if (docTypeFilter === "smr") {
//             list = list.filter(a => !a.isWarehouse && (a.docType === "smr" || a.type === "smr"));
//         } else if (docTypeFilter === "request") {
//             list = list.filter(a => !a.isWarehouse && !a.docType && a.type !== "ttn" && a.type !== "smr");
//         }
//     }

//     if (statusFilter !== "all") {
//         if (statusFilter === "canceled") {
//             list = list.filter(a => a.status === "canceled");
//         } else if (statusFilter === "active") {
//             list = list.filter(a => a.status !== "canceled" && a.status !== "draft");
//         } else if (statusFilter === "draft") {
//             list = list.filter(a => a.status === "draft");
//         }
//     }

//     if (snoFilter !== "all") {
//         if (snoFilter === "done") list = list.filter(a => !!a.snoIssued);
//         else if (snoFilter === "pending") list = list.filter(a => !a.snoIssued);
//     }

//     if (avrFilter !== "all") {
//         if (avrFilter === "done") list = list.filter(a => !!a.avrSent);
//         else if (avrFilter === "pending") list = list.filter(a => !a.avrSent);
//     }

//     if (esfFilter !== "all") {
//         if (esfFilter === "done") list = list.filter(a => !!a.esfIssued);
//         else if (esfFilter === "pending") list = list.filter(a => !a.esfIssued);
//     }

//     if (dateFrom) list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) >= dateFrom);
//     if (dateTo) list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) <= dateTo);

//     const s = q.trim().toLowerCase();
//     if (s) {
//        list = list.filter((a) => {
//         const hay = [
//           a.number, a.docNumber, a.date,
//           a.customer?.fio, a.customer?.companyName,
//           a.route?.fromCity, a.route?.toCity, a.company?.name
//         ].filter(Boolean).join(" ").toLowerCase();
//         return hay.includes(s);
//       });
//     }

//     return list;
//   }, [acts, q, dateFrom, dateTo, docTypeFilter, statusFilter, snoFilter, avrFilter, esfFilter, tab, companyFilter]);

//   // Счётчики для вкладок — считаем на всех заявках, доступных бухгалтеру
//   const tabCounts = useMemo(() => {
//     const base = acts.filter(a => !!a.readyForAccountant && !a.isDeferredForAccountant);
//     const applyCompany = (l) => companyFilter === "all" ? l : l.filter(a => a.companyId === companyFilter);
//     return {
//       active: applyCompany(base.filter(a => !a.isProcessedByAccountant)).length,
//       processed: applyCompany(base.filter(a => !!a.isProcessedByAccountant)).length,
//     };
//   }, [acts, companyFilter]);

//   const totals = useMemo(() => {
//     return filtered.reduce((acc, a) => {
//       acc.count += 1;
//       acc.seats += Number(a.totals?.seats) || 0;
//       acc.weight += Number(a.totals?.weight) || 0;
//       acc.sum += Number(a.totalSum) || 0;
//       return acc;
//     }, { count: 0, seats: 0, weight: 0, sum: 0 });
//   }, [filtered]);

//   const exportToExcel = (data) => {
//     const rows = [
//       ['Номер', 'Дата', 'Заказчик', 'Маршрут', 'Мест', 'Вес (кг)', 'Сумма (тг)', 'СНО', 'АВР', 'ЭСФ', 'Компания'],
//       ...data.map(a => {
//         const compName = companies.find(c => c.id === a.companyId)?.name || a.company?.name || a.companyId || '';
//         return [
//           a.docNumber || a.number || '',
//           formatDisplayDate(a.createdAt || a.date),
//           a.customer?.companyName || a.customer?.fio || '',
//           `${a.route?.fromCity || ''} → ${a.route?.toCity || ''}`,
//           a.totals?.seats || '',
//           a.totals?.weight || '',
//           a.totalSum ? parseFloat(a.totalSum).toLocaleString() : '',
//           a.snoIssued ? 'Да' : 'Нет',
//           a.avrSent ? 'Да' : 'Нет',
//           a.esfIssued ? 'Да' : 'Нет',
//           compName,
//         ];
//       })
//     ];
//     const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
//     const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `заявки_${new Date().toLocaleDateString('ru')}.csv`;
//     link.click();
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <>
//       <div className="navbar">
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <h1>Все заявки</h1>
//           <div className="chip" style={{ background: "#f6ffed", borderColor: "#b7eb8f", color: "#389e0d" }}>
//             Бухгалтерия
//           </div>
//         </div>
//         <button className="btn" onClick={() => exportToExcel(filtered)}>
//           📥 Скачать Excel
//         </button>
//       </div>

//       {/* ТЗ: Активные / Завершённые */}
//       <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
//         <button
//           className={`btn ${tab === 'active' ? 'btn--accent' : ''}`}
//           onClick={() => setTab('active')}
//         >
//           Активные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.active})</span>
//         </button>
//         <button
//           className={`btn ${tab === 'processed' ? 'btn--accent' : ''}`}
//           onClick={() => setTab('processed')}
//         >
//           Завершённые <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.processed})</span>
//         </button>
//       </div>

//       {/* Динамическая легенда компаний */}
//       {companies.length > 0 && (
//         <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
//           {companies.map(c => (
//             <div
//               key={c.id}
//               style={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: 6,
//                 fontSize: '0.85rem',
//                 cursor: 'pointer',
//                 padding: '2px 8px',
//                 borderRadius: 4,
//                 background: companyFilter === c.id ? 'rgba(0,0,0,0.05)' : 'transparent',
//                 fontWeight: companyFilter === c.id ? 700 : 400,
//               }}
//               onClick={() => setCompanyFilter(companyFilter === c.id ? 'all' : c.id)}
//               title="Нажмите, чтобы отфильтровать по этой компании"
//             >
//               <span style={{
//                 width: 12, height: 12, borderRadius: 2,
//                 background: getCompanyColor(c.id, companies),
//                 display: 'inline-block'
//               }} />
//               {c.name}
//             </div>
//           ))}
//           {companyFilter !== 'all' && (
//             <button
//               className="btn btn--sm"
//               onClick={() => setCompanyFilter('all')}
//               style={{ fontSize: '0.8rem', padding: '2px 10px' }}
//             >
//               ✕ Сбросить фильтр компании
//             </button>
//           )}
//         </div>
//       )}

//       <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
//         <div className="field" style={{ minWidth: 200, flex: 1 }}>
//           <div className="label">Поиск</div>
//           <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Номер, заказчик, компания..." />
//         </div>

//         {/* ТЗ: Фильтр по компаниям — отдельный селектор (для тех, кому удобнее через dropdown) */}
//         <div className="field" style={{ width: 200 }}>
//            <div className="label">Компания</div>
//            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
//                <option value="all">Все компании</option>
//                {companies.map(c => (
//                  <option key={c.id} value={c.id}>{c.name}</option>
//                ))}
//            </select>
//         </div>

//         <div className="field" style={{ width: 140 }}>
//            <div className="label">Тип</div>
//            <select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
//                <option value="all">Все</option>
//                <option value="request">Только Заявки</option>
//                <option value="ttn">ТТН</option>
//                <option value="smr">СМР</option>
//                <option value="warehouse">Склад</option>
//            </select>
//         </div>
//         <div className="field" style={{ width: 140 }}>
//            <div className="label">Статус</div>
//            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
//                <option value="all">Все</option>
//                <option value="active">Активные</option>
//                <option value="canceled">Аннулированные</option>
//                <option value="draft">Черновики</option>
//            </select>
//         </div>
//         <div className="field" style={{ width: 140 }}>
//            <div className="label">СНО</div>
//            <select value={snoFilter} onChange={e => setSnoFilter(e.target.value)}>
//                <option value="all">Все</option>
//                <option value="pending">Ожидает СНО</option>
//                <option value="done">Выставлен</option>
//            </select>
//         </div>
//         <div className="field" style={{ width: 140 }}>
//            <div className="label">АВР</div>
//            <select value={avrFilter} onChange={e => setAvrFilter(e.target.value)}>
//                <option value="all">Все</option>
//                <option value="pending">Ожидает АВР</option>
//                <option value="done">Отправлен</option>
//            </select>
//         </div>
//         <div className="field" style={{ width: 140 }}>
//            <div className="label">ЭСФ</div>
//            <select value={esfFilter} onChange={e => setEsfFilter(e.target.value)}>
//                <option value="all">Все</option>
//                <option value="pending">Ожидает ЭСФ</option>
//                <option value="done">Выставлен</option>
//            </select>
//         </div>
//         <div className="field" style={{ width: 140 }}>
//            <div className="label">Дата с</div>
//            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
//         </div>
//         <div className="field" style={{ width: 140 }}>
//            <div className="label">Дата по</div>
//            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
//         </div>
//       </div>

//       {/* Итоги */}
//       <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
//         <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
//           Заявок: <strong>{totals.count}</strong>
//         </div>
//         <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
//           Мест: <strong>{totals.seats}</strong>
//         </div>
//         <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
//           Вес: <strong>{totals.weight} кг</strong>
//         </div>
//         <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
//           Сумма: <strong>{totals.sum.toLocaleString()} тг</strong>
//         </div>
//       </div>

//       <div className="table_wrap" style={{ marginTop: 16 }}>
//         {loading ? (
//           <Loader />
//         ) : (
//           <table className="table_fixed">
//             <thead>
//               <tr>
//                 <th style={{ width: 100 }}>Номер</th>
//                 <th style={{ width: 100 }}>Дата</th>
//                 <th style={{ width: 180 }}>Компания</th>
//                 <th>Заказчик</th>
//                 <th style={{ width: 80 }}>Мест</th>
//                 <th style={{ width: 90 }}>Вес</th>
//                 <th style={{ width: 120 }}>Сумма</th>
//                 <th>Маршрут</th>
//                 <th style={{ width: 60, textAlign: 'center' }}>СНО</th>
//                 <th style={{ width: 60, textAlign: 'center' }}>АВР</th>
//                 <th style={{ width: 60, textAlign: 'center' }}>ЭСФ</th>
//                 <th style={{ width: 80, textAlign: 'center' }}>Статус</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.length === 0 ? (
//                 <tr>
//                   <td colSpan={12} className="muted" style={{ padding: 16 }}>
//                     {tab === 'active' ? 'Нет активных заявок' : 'Нет завершённых заявок'}
//                     {companyFilter !== 'all' && ' для выбранной компании'}.
//                   </td>
//                 </tr>
//               ) : (
//                 filtered.map((a) => {
//                   const compName = companies.find(c => c.id === a.companyId)?.name || a.company?.name || '—';
//                   const compColor = getCompanyColor(a.companyId, companies);
//                   return (
//                     <tr key={a.id} style={{
//                       opacity: a.status === 'canceled' ? 0.5 : 1,
//                       background: !a.isViewedByAccountant ? 'rgba(37, 99, 235, 0.05)' : 'inherit',
//                       borderLeft: !a.isViewedByAccountant ? '4px solid #2563eb' : `4px solid ${compColor}`
//                     }}>
//                       <td className="num">
//                         <Link to={`/accountant/acts/${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
//                           {!a.isViewedByAccountant && (
//                             <span title="Новая заявка" style={{
//                               width: 8, height: 8, background: '#2563eb', borderRadius: '50%', display: 'inline-block'
//                             }} />
//                           )}
//                           {a.docNumber || a.number}
//                         </Link>
//                       </td>
//                       <td>{formatDisplayDate(a.createdAt || a.date)}</td>
//                       <td>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
//                           <span style={{
//                             width: 10, height: 10, borderRadius: 2,
//                             background: compColor, display: 'inline-block', flexShrink: 0
//                           }} />
//                           <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
//                             {compName}
//                           </span>
//                         </div>
//                       </td>
//                       <td><div style={{ fontWeight: 500 }}>{a.customer?.companyName || a.customer?.fio || "—"}</div></td>
//                       <td>{a.totals?.seats || "—"}</td>
//                       <td>{a.totals?.weight ? `${a.totals.weight} кг` : "—"}</td>
//                       <td style={{ fontWeight: 700 }}>{a.totalSum ? `${parseFloat(a.totalSum).toLocaleString()} тг` : "—"}</td>
//                       <td>
//                         {a.isWarehouse ? (
//                           <span className="badge" style={{ background: '#e6f7ff', color: '#1890ff' }}>Склад</span>
//                         ) : (
//                           <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
//                             {a.route?.fromCity || "—"} → {a.route?.toCity || "—"}
//                           </div>
//                         )}
//                       </td>
//                       <td style={{ textAlign: "center" }}>
//                         {a.snoIssued ? (
//                           <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
//                         ) : (
//                           <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
//                         )}
//                       </td>
//                       <td style={{ textAlign: "center" }}>
//                         {a.avrSent ? (
//                           <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
//                         ) : (
//                           <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
//                         )}
//                       </td>
//                       <td style={{ textAlign: "center" }}>
//                         {a.esfIssued ? (
//                           <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
//                         ) : (
//                           <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
//                         )}
//                       </td>
//                       <td style={{ textAlign: "center" }}>
//                         {a.isProcessedByAccountant ? (
//                           <button
//                             className="btn-icon"
//                             onClick={() => toggleProcessed(a.id, true)}
//                             title="Отработано (Нажмите, чтобы отменить)"
//                             style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
//                           >
//                             ✅
//                           </button>
//                         ) : (
//                           <button
//                             className="btn-icon"
//                             onClick={() => toggleProcessed(a.id, false)}
//                             title="Пометить как отработанное"
//                             style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', filter: 'grayscale(1)', opacity: 0.4 }}
//                           >
//                             ⏳
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



import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { useAuth } from "../../shared/auth/AuthContext";
import Loader from "../../shared/components/Loader";

function formatDisplayDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function normalizeIsoDate(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const COLOR_PALETTE = [
  '#7c3aed', '#059669', '#d97706', '#dc2626', '#2563eb',
  '#db2777', '#0891b2', '#65a30d', '#9333ea', '#ea580c',
];

function getCompanyColor(companyId, companyList) {
  if (!companyId || !Array.isArray(companyList)) return '#cbd5e1';
  const idx = companyList.findIndex(c => c.id === companyId);
  if (idx < 0) return '#cbd5e1';
  return COLOR_PALETTE[idx % COLOR_PALETTE.length];
}

// ---- СОРТИРОВКА ----
function getSortValue(a, field, companies) {
  switch (field) {
    case 'number':   return (a.docNumber || a.number || '').toString().toLowerCase();
    case 'date':     return new Date(a.createdAt || a.date || 0).getTime();
    case 'company':  return (companies.find(c => c.id === a.companyId)?.name || a.company?.name || '').toString().toLowerCase();
    case 'customer': return (a.customer?.companyName || a.customer?.fio || '').toString().toLowerCase();
    case 'seats':    return Number(a.totals?.seats) || 0;
    case 'weight':   return Number(a.totals?.weight) || 0;
    case 'totalSum': return Number(a.totalSum) || 0;
    case 'route':    return ((a.route?.fromCity || '') + ' ' + (a.route?.toCity || '')).toLowerCase();
    case 'sno':      return a.snoIssued ? 1 : 0;
    case 'avr':      return a.avrSent ? 1 : 0;
    case 'esf':      return a.esfIssued ? 1 : 0;
    case 'processed':return a.isProcessedByAccountant ? 1 : 0;
    default:         return '';
  }
}

export default function AccountantGeneralPage() {
  const { isAccountant, isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [snoFilter, setSnoFilter] = useState("all");
  const [avrFilter, setAvrFilter] = useState("all");
  const [esfFilter, setEsfFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [acts, setActs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");

  // Сортировка
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, compList] = await Promise.all([
        api.requests.list(),
        api.companies.list().catch(() => []),
      ]);

      if (Array.isArray(compList)) setCompanies(compList);

      if (Array.isArray(list)) {
        const parsed = list.map(a => {
           let details = {};
           if (a.details) {
              try {
                details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
              } catch (e) { console.error("Parse error", e); }
           }
           return { ...a, ...details };
        });
        setActs(parsed);
      } else {
        setActs([]);
      }
    } catch (e) {
      console.error("Failed to load data", e);
      setActs([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleProcessed = async (actId, currentVal) => {
    try {
      if (!currentVal) {
        await api.requests.completeByAccountant(actId);
      } else {
        await api.requests.update(actId, { isProcessedByAccountant: false });
      }
      setActs(prev => prev.map(a => a.id === actId ? { ...a, isProcessedByAccountant: !currentVal } : a));
    } catch (err) {
      alert("Ошибка при обновлении статуса: " + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let list = acts.filter(a => !!a.readyForAccountant && !a.isDeferredForAccountant);

    if (tab === "active") {
      list = list.filter(a => !a.isProcessedByAccountant);
    } else {
      list = list.filter(a => !!a.isProcessedByAccountant);
    }

    if (companyFilter !== "all") {
      list = list.filter(a => a.companyId === companyFilter);
    }

    if (docTypeFilter !== "all") {
        if (docTypeFilter === "warehouse") {
            list = list.filter(a => a.isWarehouse);
        } else if (docTypeFilter === "ttn") {
            list = list.filter(a => !a.isWarehouse && (a.docType === "ttn" || a.type === "ttn"));
        } else if (docTypeFilter === "smr") {
            list = list.filter(a => !a.isWarehouse && (a.docType === "smr" || a.type === "smr"));
        } else if (docTypeFilter === "request") {
            list = list.filter(a => !a.isWarehouse && !a.docType && a.type !== "ttn" && a.type !== "smr");
        }
    }

    if (statusFilter !== "all") {
        if (statusFilter === "canceled") {
            list = list.filter(a => a.status === "canceled");
        } else if (statusFilter === "active") {
            list = list.filter(a => a.status !== "canceled" && a.status !== "draft");
        } else if (statusFilter === "draft") {
            list = list.filter(a => a.status === "draft");
        }
    }

    if (snoFilter !== "all") {
        if (snoFilter === "done") list = list.filter(a => !!a.snoIssued);
        else if (snoFilter === "pending") list = list.filter(a => !a.snoIssued);
    }

    if (avrFilter !== "all") {
        if (avrFilter === "done") list = list.filter(a => !!a.avrSent);
        else if (avrFilter === "pending") list = list.filter(a => !a.avrSent);
    }

    if (esfFilter !== "all") {
        if (esfFilter === "done") list = list.filter(a => !!a.esfIssued);
        else if (esfFilter === "pending") list = list.filter(a => !a.esfIssued);
    }

    if (dateFrom) list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) >= dateFrom);
    if (dateTo) list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) <= dateTo);

    const s = q.trim().toLowerCase();
    if (s) {
       list = list.filter((a) => {
        const hay = [
          a.number, a.docNumber, a.date,
          a.customer?.fio, a.customer?.companyName,
          a.route?.fromCity, a.route?.toCity, a.company?.name
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(s);
      });
    }

    // СОРТИРОВКА
    const sorted = [...list].sort((a, b) => {
      const av = getSortValue(a, sortBy, companies);
      const bv = getSortValue(b, sortBy, companies);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [acts, q, dateFrom, dateTo, docTypeFilter, statusFilter, snoFilter, avrFilter, esfFilter, tab, companyFilter, sortBy, sortOrder, companies]);

  const tabCounts = useMemo(() => {
    const base = acts.filter(a => !!a.readyForAccountant && !a.isDeferredForAccountant);
    const applyCompany = (l) => companyFilter === "all" ? l : l.filter(a => a.companyId === companyFilter);
    return {
      active: applyCompany(base.filter(a => !a.isProcessedByAccountant)).length,
      processed: applyCompany(base.filter(a => !!a.isProcessedByAccountant)).length,
    };
  }, [acts, companyFilter]);

  const totals = useMemo(() => {
    return filtered.reduce((acc, a) => {
      acc.count += 1;
      acc.seats += Number(a.totals?.seats) || 0;
      acc.weight += Number(a.totals?.weight) || 0;
      acc.sum += Number(a.totalSum) || 0;
      return acc;
    }, { count: 0, seats: 0, weight: 0, sum: 0 });
  }, [filtered]);

  const exportToExcel = (data) => {
    const rows = [
      ['Номер', 'Дата', 'Заказчик', 'Маршрут', 'Мест', 'Вес (кг)', 'Сумма (тг)', 'СНО', 'АВР', 'ЭСФ', 'Компания'],
      ...data.map(a => {
        const compName = companies.find(c => c.id === a.companyId)?.name || a.company?.name || a.companyId || '';
        return [
          a.docNumber || a.number || '',
          formatDisplayDate(a.createdAt || a.date),
          a.customer?.companyName || a.customer?.fio || '',
          `${a.route?.fromCity || ''} → ${a.route?.toCity || ''}`,
          a.totals?.seats || '',
          a.totals?.weight || '',
          a.totalSum ? parseFloat(a.totalSum).toLocaleString() : '',
          a.snoIssued ? 'Да' : 'Нет',
          a.avrSent ? 'Да' : 'Нет',
          a.esfIssued ? 'Да' : 'Нет',
          compName,
        ];
      })
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `заявки_${new Date().toLocaleDateString('ru')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Все заявки</h1>
          <div className="chip" style={{ background: "#f6ffed", borderColor: "#b7eb8f", color: "#389e0d" }}>
            Бухгалтерия
          </div>
        </div>
        <button className="btn" onClick={() => exportToExcel(filtered)}>
          📥 Скачать Excel
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className={`btn ${tab === 'active' ? 'btn--accent' : ''}`}
          onClick={() => setTab('active')}
        >
          Активные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.active})</span>
        </button>
        <button
          className={`btn ${tab === 'processed' ? 'btn--accent' : ''}`}
          onClick={() => setTab('processed')}
        >
          Завершённые <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.processed})</span>
        </button>
      </div>

      {companies.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {companies.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: '2px 8px',
                borderRadius: 4,
                background: companyFilter === c.id ? 'rgba(0,0,0,0.05)' : 'transparent',
                fontWeight: companyFilter === c.id ? 700 : 400,
              }}
              onClick={() => setCompanyFilter(companyFilter === c.id ? 'all' : c.id)}
              title="Нажмите, чтобы отфильтровать по этой компании"
            >
              <span style={{
                width: 12, height: 12, borderRadius: 2,
                background: getCompanyColor(c.id, companies),
                display: 'inline-block'
              }} />
              {c.name}
            </div>
          ))}
          {companyFilter !== 'all' && (
            <button
              className="btn btn--sm"
              onClick={() => setCompanyFilter('all')}
              style={{ fontSize: '0.8rem', padding: '2px 10px' }}
            >
              ✕ Сбросить фильтр компании
            </button>
          )}
        </div>
      )}

      <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ minWidth: 200, flex: 1 }}>
          <div className="label">Поиск</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Номер, заказчик, компания..." />
        </div>

        <div className="field" style={{ width: 200 }}>
           <div className="label">Компания</div>
           <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
               <option value="all">Все компании</option>
               {companies.map(c => (
                 <option key={c.id} value={c.id}>{c.name}</option>
               ))}
           </select>
        </div>

        <div className="field" style={{ width: 140 }}>
           <div className="label">Тип</div>
           <select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
               <option value="all">Все</option>
               <option value="request">Только Заявки</option>
               <option value="ttn">ТТН</option>
               <option value="smr">СМР</option>
               <option value="warehouse">Склад</option>
           </select>
        </div>
        <div className="field" style={{ width: 140 }}>
           <div className="label">Статус</div>
           <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
               <option value="all">Все</option>
               <option value="active">Активные</option>
               <option value="canceled">Аннулированные</option>
               <option value="draft">Черновики</option>
           </select>
        </div>
        <div className="field" style={{ width: 140 }}>
           <div className="label">СНО</div>
           <select value={snoFilter} onChange={e => setSnoFilter(e.target.value)}>
               <option value="all">Все</option>
               <option value="pending">Ожидает СНО</option>
               <option value="done">Выставлен</option>
           </select>
        </div>
        <div className="field" style={{ width: 140 }}>
           <div className="label">АВР</div>
           <select value={avrFilter} onChange={e => setAvrFilter(e.target.value)}>
               <option value="all">Все</option>
               <option value="pending">Ожидает АВР</option>
               <option value="done">Отправлен</option>
           </select>
        </div>
        <div className="field" style={{ width: 140 }}>
           <div className="label">ЭСФ</div>
           <select value={esfFilter} onChange={e => setEsfFilter(e.target.value)}>
               <option value="all">Все</option>
               <option value="pending">Ожидает ЭСФ</option>
               <option value="done">Выставлен</option>
           </select>
        </div>
        <div className="field" style={{ width: 140 }}>
           <div className="label">Дата с</div>
           <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="field" style={{ width: 140 }}>
           <div className="label">Дата по</div>
           <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
          Заявок: <strong>{totals.count}</strong>
        </div>
        <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
          Мест: <strong>{totals.seats}</strong>
        </div>
        <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
          Вес: <strong>{totals.weight} кг</strong>
        </div>
        <div style={{ padding: '8px 16px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--line)', fontSize: '0.9rem' }}>
          Сумма: <strong>{totals.sum.toLocaleString()} тг</strong>
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? (
          <Loader />
        ) : (
          <table className="table_fixed">
            <thead>
              <tr>
                <SortableTh field="number" style={{ width: 100 }}>Номер</SortableTh>
                <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
                <SortableTh field="company" style={{ width: 180 }}>Компания</SortableTh>
                <SortableTh field="customer">Заказчик</SortableTh>
                <SortableTh field="seats" style={{ width: 80 }}>Мест</SortableTh>
                <SortableTh field="weight" style={{ width: 90 }}>Вес</SortableTh>
                <SortableTh field="totalSum" style={{ width: 120 }}>Сумма</SortableTh>
                <SortableTh field="route">Маршрут</SortableTh>
                <SortableTh field="sno" style={{ width: 60, textAlign: 'center' }}>СНО</SortableTh>
                <SortableTh field="avr" style={{ width: 60, textAlign: 'center' }}>АВР</SortableTh>
                <SortableTh field="esf" style={{ width: 60, textAlign: 'center' }}>ЭСФ</SortableTh>
                <SortableTh field="processed" style={{ width: 80, textAlign: 'center' }}>Статус</SortableTh>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="muted" style={{ padding: 16 }}>
                    {tab === 'active' ? 'Нет активных заявок' : 'Нет завершённых заявок'}
                    {companyFilter !== 'all' && ' для выбранной компании'}.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const compName = companies.find(c => c.id === a.companyId)?.name || a.company?.name || '—';
                  const compColor = getCompanyColor(a.companyId, companies);
                  return (
                    <tr key={a.id} style={{
                      opacity: a.status === 'canceled' ? 0.5 : 1,
                      background: !a.isViewedByAccountant ? 'rgba(37, 99, 235, 0.05)' : 'inherit',
                      borderLeft: !a.isViewedByAccountant ? '4px solid #2563eb' : `4px solid ${compColor}`
                    }}>
                      <td className="num">
                        <Link to={`/accountant/acts/${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {!a.isViewedByAccountant && (
                            <span title="Новая заявка" style={{
                              width: 8, height: 8, background: '#2563eb', borderRadius: '50%', display: 'inline-block'
                            }} />
                          )}
                          {a.docNumber || a.number}
                        </Link>
                      </td>
                      <td>{formatDisplayDate(a.createdAt || a.date)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: 2,
                            background: compColor, display: 'inline-block', flexShrink: 0
                          }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {compName}
                          </span>
                        </div>
                      </td>
                      <td><div style={{ fontWeight: 500 }}>{a.customer?.companyName || a.customer?.fio || "—"}</div></td>
                      <td>{a.totals?.seats || "—"}</td>
                      <td>{a.totals?.weight ? `${a.totals.weight} кг` : "—"}</td>
                      <td style={{ fontWeight: 700 }}>{a.totalSum ? `${parseFloat(a.totalSum).toLocaleString()} тг` : "—"}</td>
                      <td>
                        {a.isWarehouse ? (
                          <span className="badge" style={{ background: '#e6f7ff', color: '#1890ff' }}>Склад</span>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {a.route?.fromCity || "—"} → {a.route?.toCity || "—"}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {a.snoIssued ? (
                          <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
                        ) : (
                          <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {a.avrSent ? (
                          <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
                        ) : (
                          <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {a.esfIssued ? (
                          <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem' }}>Да</span>
                        ) : (
                          <span className="badge" style={{ background: '#fffbe6', color: '#faad14', padding: '2px 6px', fontSize: '0.75rem' }}>Нет</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {a.isProcessedByAccountant ? (
                          <button
                            className="btn-icon"
                            onClick={() => toggleProcessed(a.id, true)}
                            title="Отработано (Нажмите, чтобы отменить)"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
                          >
                            ✅
                          </button>
                        ) : (
                          <button
                            className="btn-icon"
                            onClick={() => toggleProcessed(a.id, false)}
                            title="Пометить как отработанное"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', filter: 'grayscale(1)', opacity: 0.4 }}
                          >
                            ⏳
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