// import React, { useEffect, useMemo, useState } from "react";
// import { Link, useOutletContext, Navigate } from "react-router-dom";
// import { api } from "../../shared/api/api.js";
// import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
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

// export default function ActsListPage() {
//   const { user, isAccountant, isAdmin } = useAuth();
//   const { openCompanySelector } = useOutletContext();
//   const [q, setQ] = useState("");
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [acts, setActs] = useState([]);
//   const [company, setCompany] = useState(null);
//   const [loading, setLoading] = useState(true);

//   if (isAccountant && !isAdmin) {
//     return <Navigate to="/accountant/general" replace />;
//   }
// // ...
//   // Фильтрация
//   const filtered = useMemo(() => {
//     let list = acts;

//     // 1. Фильтр по компании и отсутствие docType, и исключение склада
//     if (company) {
//        list = list.filter(a => a.companyId === company.id && a.type !== 'SIMPLE' && !a.isWarehouse && !a.isDeferredForAccountant && !a.readyForAccountant);
//     } else {
//        return [];
//     }

//     // 2. По дате (используем дату создания для фильтрации в списке)
//     if (dateFrom) {
//        list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) >= dateFrom);
//     }
//     if (dateTo) {
//        list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) <= dateTo);
//     }

//     // 3. Поиск (Номер, ФИО, Город)
//     const s = q.trim().toLowerCase();
//     if (s) {
//        list = list.filter((a) => {
//         const hay = [a.number, a.docNumber, a.date, a.customer?.fio, a.route?.fromCity, a.route?.toCity]
//           .filter(Boolean)
//           .join(" ")
//           .toLowerCase();
//         return hay.includes(s);
//       });
//     }
    
//     return list;
//   }, [acts, q, company, dateFrom, dateTo]);

//   const loadActs = async () => {
//     setLoading(true);
//     try {
//       const list = await api.requests.list(company?.id);
//       if (Array.isArray(list)) {
//         const parsed = list.map(a => {
//            let details = {};
//            if (a.details) {
//               try {
//                 details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
//               } catch (e) { console.error("Parse error", e); }
//            }
//            return { ...details, ...a };
//         });
//         setActs(parsed);
//       } else {
//         setActs([]);
//       }
//     } catch (e) {
//       console.error("Failed to load acts", e);
//       setActs([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     // 1. Подписка на изменение компании
//     const unsubscribe = subscribeSelectedCompany(setCompany);
//     setCompany(getSelectedCompany());
//     return unsubscribe;
//   }, []);

//   useEffect(() => {
//     // 2. Загрузка заявок только при наличии компании
//     if (company) {
//       loadActs();
//     } else {
//       setActs([]);
//       setLoading(false);
//     }
//   }, [company]);

//   const handleAnnul = async (id, number) => {
//     if (window.confirm(`Аннулировать заявку №${number}?`)) {
//       try {
//         await api.requests.update(id, { status: "canceled" });
//         loadActs();
//       } catch (err) {
//         alert("Ошибка: " + err.message);
//       }
//     }
//   };

//   const handleRestore = async (id, number) => {
//     if (window.confirm(`Восстановить заявку №${number}?`)) {
//       try {
//         await api.requests.update(id, { status: "act" });
//         loadActs();
//       } catch (err) {
//         alert("Ошибка: " + err.message);
//       }
//     }
//   };

//   const handleDelete = async (id, number) => {
//     if (window.confirm(`ВНИМАНИЕ: Удалить заявку №${number} БЕЗВОЗВРАТНО?`)) {
//       try {
//         await api.requests.delete(id);
//         loadActs();
//       } catch (err) {
//         alert("Ошибка: " + err.message);
//       }
//     }
//   };

//   return (
//     <>
//       <div className="navbar">
//         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//           <h1>Заявки</h1>
//           {company ? (
//             <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>
//               Выбрано: {company.name}
//             </div>
//           ) : (
//             <div className="chip" style={{ background: "#fff1f0", borderColor: "#ffccc7", color: "#a8071a" }}>
//               Компания не выбрана
//             </div>
//           )}
          
//           <button className="btn btn--sm btn--ghost" onClick={openCompanySelector}>
//             Сменить
//           </button>
//         </div>

//         {(!isAccountant || isAdmin) && (
//           <Link className="btn btn--accent" to="/acts/new">
//             + Создать заявку
//           </Link>
//         )}
//       </div>

//       <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
//         <div className="field" style={{ minWidth: 200, flex: 1 }}>
//           <div className="label">Поиск</div>
//           <input
//             value={q}
//             onChange={(e) => setQ(e.target.value)}
//             placeholder="Номер, заказчик, страна, город..."
//           />
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

//       <div className="table_wrap" style={{ marginTop: 16 }}>
//         {loading ? (
//           <Loader />
//         ) : (
//           <table className="table_fixed">
//             <thead>
//               <tr>
//                 <th style={{ width: 100 }}>Номер</th>
//                 <th style={{ width: 100 }}>Дата</th>
//                 <th style={{ width: 100 }}>Статус</th>
//                 <th>Страна, город (откуда)</th>
//                 <th>Страна, город (куда)</th>
//                 <th>Заказчик</th>
//                 <th>Вид транспорта</th>
//                 <th style={{ width: 80 }}>Мест</th>
//                 <th style={{ width: 80 }}>Вес (кг)</th>
//                 <th style={{ width: 100 }}>Сумма (тг)</th>
//                 {(!isAccountant || isAdmin) && <th style={{ width: 120, textAlign: "right" }}>Действия</th>}
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.length === 0 ? (
//                 <tr>
//                   <td colSpan={11} className="muted" style={{ padding: 16 }}>
//                     {company ? "В этой компании нет заявок." : "Выберите компанию."}
//                   </td>
//                 </tr>
//               ) : (
//                 filtered.map((a) => (
//                   <tr key={a.id} style={{ opacity: a.status === 'canceled' ? 0.5 : 1 }}>
//                     <td className="num">
//                       <Link to={`/acts/${a.id}`}>{a.docNumber || a.number}</Link>
//                     </td>
//                     <td>{formatDisplayDate(a.createdAt || a.date)}</td>
//                     <td>
//                       {a.status === 'canceled' ? (
//                         <span className="badge badge--danger">Аннулирована</span>
//                       ) : a.status === 'Забрано' ? (
//                         <span className="badge" style={{ background: '#e6f7ff', color: '#1890ff', borderColor: '#91caff' }}>Забрано</span>
//                       ) : a.status === 'Доставлено' ? (
//                         <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', borderColor: '#b7eb8f' }}>Доставлено</span>
//                       ) : a.status === 'act' ? (
//                         a.isWarehouse ? (
//                           <span className="badge" style={{ background: '#52c41a', color: '#fff' }}>Склад</span>
//                         ) : (
//                           <span className="badge badge--ttn">Заявка</span>
//                         )
//                       ) : (
//                         <span className="badge badge--draft">Черновик</span>
//                       )}
//                     </td>
//                     <td>{a.route?.fromCity || "—"}</td>
//                     <td>{a.route?.toCity || "—"}</td>
//                     <td>
//                       <div style={{ fontWeight: 500 }}>{a.customer?.fio || "—"}</div>
//                     </td>
//                     <td>
//                       {a.docAttrs?.transportType === 'auto_console' || a.docAttrs?.transportType === 'auto_separate' ? "Авто" :
//                         a.docAttrs?.transportType === 'plane' ? "Самолет" :
//                           a.docAttrs?.transportType === 'train' ? "Поезд" : (a.cargoText || "—")}
//                     </td>
//                     <td style={{ textAlign: 'center' }}>{a.totals?.seats || "—"}</td>
//                     <td style={{ textAlign: 'center' }}>{a.totals?.weight || "—"}</td>
//                     <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
//                       {a.totalSum ? Number(a.totalSum).toLocaleString() : "—"}
//                     </td>
//                     {(!isAccountant || isAdmin) && (
//                       <td style={{ textAlign: "right" }}>
//                         <details className="actions-dropdown">
//                           <summary className="btn-actions">
//                             <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
//                           </summary>
//                           <div className="actions-menu">
//                             <Link className="actions-item" to={`/acts/${a.id}`}>
//                               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
//                               Просмотр
//                             </Link>

//                             {a.status !== 'canceled' && (
//                               <Link className="actions-item" to={`/acts/${a.id}/edit`}>
//                                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
//                                 Редактировать
//                               </Link>
//                             )}

//                             {a.status !== 'canceled' && (
//                               <button className="actions-item" onClick={() => handleAnnul(a.id, a.docNumber || a.number)}>
//                                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
//                                 Аннулировать
//                               </button>
//                             )}

//                             {isAdmin && a.status === 'canceled' && (
//                               <button className="actions-item" onClick={() => handleRestore(a.id, a.docNumber || a.number)}>
//                                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
//                                 Восстановить
//                               </button>
//                             )}

//                             {isAdmin && (
//                               <button className="actions-item danger" onClick={() => handleDelete(a.id, a.docNumber || a.number)}>
//                                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
//                                 Удалить
//                               </button>
//                             )}
//                           </div>
//                         </details>
//                       </td>
//                     )}
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



import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, Navigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
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

// ---- СОРТИРОВКА ----
function getSortValue(a, field) {
  switch (field) {
    case 'number':    return (a.docNumber || a.number || '').toString().toLowerCase();
    case 'date':      return new Date(a.createdAt || a.date || 0).getTime();
    case 'status':    return (a.status || '').toString().toLowerCase();
    case 'fromCity':  return (a.route?.fromCity || '').toString().toLowerCase();
    case 'toCity':    return (a.route?.toCity || '').toString().toLowerCase();
    case 'customer':  return (a.customer?.fio || '').toString().toLowerCase();
    case 'transport': return (a.docAttrs?.transportType || a.cargoText || '').toString().toLowerCase();
    case 'seats':     return Number(a.totals?.seats) || 0;
    case 'weight':    return Number(a.totals?.weight) || 0;
    case 'totalSum':  return Number(a.totalSum) || 0;
    default:          return '';
  }
}

export default function ActsListPage() {
  const { user, isAccountant, isAdmin } = useAuth();
  const { openCompanySelector } = useOutletContext();
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [acts, setActs] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Сортировка
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  if (isAccountant && !isAdmin) {
    return <Navigate to="/accountant/general" replace />;
  }

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

  // Фильтрация + сортировка
  const filtered = useMemo(() => {
    let list = acts;

    if (company) {
       list = list.filter(a => a.companyId === company.id && a.type !== 'SIMPLE' && !a.isWarehouse && !a.isDeferredForAccountant && !a.readyForAccountant);
    } else {
       return [];
    }

    if (dateFrom) {
       list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) >= dateFrom);
    }
    if (dateTo) {
       list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) <= dateTo);
    }

    const s = q.trim().toLowerCase();
    if (s) {
       list = list.filter((a) => {
        const hay = [a.number, a.docNumber, a.date, a.customer?.fio, a.route?.fromCity, a.route?.toCity]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(s);
      });
    }

    // СОРТИРОВКА
    const sorted = [...list].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [acts, q, company, dateFrom, dateTo, sortBy, sortOrder]);

  const loadActs = async () => {
    setLoading(true);
    try {
      const list = await api.requests.list(company?.id);
      if (Array.isArray(list)) {
        const parsed = list.map(a => {
           let details = {};
           if (a.details) {
              try {
                details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
              } catch (e) { console.error("Parse error", e); }
           }
           return { ...details, ...a };
        });
        setActs(parsed);
      } else {
        setActs([]);
      }
    } catch (e) {
      console.error("Failed to load acts", e);
      setActs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeSelectedCompany(setCompany);
    setCompany(getSelectedCompany());
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (company) {
      loadActs();
    } else {
      setActs([]);
      setLoading(false);
    }
  }, [company]);

  const handleAnnul = async (id, number) => {
    if (window.confirm(`Аннулировать заявку №${number}?`)) {
      try {
        await api.requests.update(id, { status: "canceled" });
        loadActs();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  const handleRestore = async (id, number) => {
    if (window.confirm(`Восстановить заявку №${number}?`)) {
      try {
        await api.requests.update(id, { status: "act" });
        loadActs();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  const handleDelete = async (id, number) => {
    if (window.confirm(`ВНИМАНИЕ: Удалить заявку №${number} БЕЗВОЗВРАТНО?`)) {
      try {
        await api.requests.delete(id);
        loadActs();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Заявки</h1>
          {company ? (
            <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>
              Выбрано: {company.name}
            </div>
          ) : (
            <div className="chip" style={{ background: "#fff1f0", borderColor: "#ffccc7", color: "#a8071a" }}>
              Компания не выбрана
            </div>
          )}

          <button className="btn btn--sm btn--ghost" onClick={openCompanySelector}>
            Сменить
          </button>
        </div>

        {(!isAccountant || isAdmin) && (
          <Link className="btn btn--accent" to="/acts/new">
            + Создать заявку
          </Link>
        )}
      </div>

      <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ minWidth: 200, flex: 1 }}>
          <div className="label">Поиск</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Номер, заказчик, страна, город..."
          />
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

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? (
          <Loader />
        ) : (
          <table className="table_fixed">
            <thead>
              <tr>
                <SortableTh field="number" style={{ width: 100 }}>Номер</SortableTh>
                <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
                <SortableTh field="status" style={{ width: 100 }}>Статус</SortableTh>
                <SortableTh field="fromCity">Страна, город (откуда)</SortableTh>
                <SortableTh field="toCity">Страна, город (куда)</SortableTh>
                <SortableTh field="customer">Заказчик</SortableTh>
                <SortableTh field="transport">Вид транспорта</SortableTh>
                <SortableTh field="seats" style={{ width: 80 }}>Мест</SortableTh>
                <SortableTh field="weight" style={{ width: 80 }}>Вес (кг)</SortableTh>
                <SortableTh field="totalSum" style={{ width: 100 }}>Сумма (тг)</SortableTh>
                {(!isAccountant || isAdmin) && <th style={{ width: 120, textAlign: "right" }}>Действия</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="muted" style={{ padding: 16 }}>
                    {company ? "В этой компании нет заявок." : "Выберите компанию."}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} style={{ opacity: a.status === 'canceled' ? 0.5 : 1 }}>
                    <td className="num">
                      <Link to={`/acts/${a.id}`}>{a.docNumber || a.number}</Link>
                    </td>
                    <td>{formatDisplayDate(a.createdAt || a.date)}</td>
                    <td>
                      {a.status === 'canceled' ? (
                        <span className="badge badge--danger">Аннулирована</span>
                      ) : a.status === 'Забрано' ? (
                        <span className="badge" style={{ background: '#e6f7ff', color: '#1890ff', borderColor: '#91caff' }}>Забрано</span>
                      ) : a.status === 'Доставлено' ? (
                        <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', borderColor: '#b7eb8f' }}>Доставлено</span>
                      ) : a.status === 'act' ? (
                        a.isWarehouse ? (
                          <span className="badge" style={{ background: '#52c41a', color: '#fff' }}>Склад</span>
                        ) : (
                          <span className="badge badge--ttn">Заявка</span>
                        )
                      ) : (
                        <span className="badge badge--draft">Черновик</span>
                      )}
                    </td>
                    <td>{a.route?.fromCity || "—"}</td>
                    <td>{a.route?.toCity || "—"}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.customer?.fio || "—"}</div>
                    </td>
                    <td>
                      {a.docAttrs?.transportType === 'auto_console' || a.docAttrs?.transportType === 'auto_separate' ? "Авто" :
                        a.docAttrs?.transportType === 'plane' ? "Самолет" :
                          a.docAttrs?.transportType === 'train' ? "Поезд" : (a.cargoText || "—")}
                    </td>
                    <td style={{ textAlign: 'center' }}>{a.totals?.seats || "—"}</td>
                    <td style={{ textAlign: 'center' }}>{a.totals?.weight || "—"}</td>
                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {a.totalSum ? Number(a.totalSum).toLocaleString() : "—"}
                    </td>
                    {(!isAccountant || isAdmin) && (
                      <td style={{ textAlign: "right" }}>
                        <details className="actions-dropdown">
                          <summary className="btn-actions">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
                          </summary>
                          <div className="actions-menu">
                            <Link className="actions-item" to={`/acts/${a.id}`}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              Просмотр
                            </Link>

                            {a.status !== 'canceled' && (
                              <Link className="actions-item" to={`/acts/${a.id}/edit`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                Редактировать
                              </Link>
                            )}

                            {a.status !== 'canceled' && (
                              <button className="actions-item" onClick={() => handleAnnul(a.id, a.docNumber || a.number)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                Аннулировать
                              </button>
                            )}

                            {isAdmin && a.status === 'canceled' && (
                              <button className="actions-item" onClick={() => handleRestore(a.id, a.docNumber || a.number)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                                Восстановить
                              </button>
                            )}

                            {isAdmin && (
                              <button className="actions-item danger" onClick={() => handleDelete(a.id, a.docNumber || a.number)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                Удалить
                              </button>
                            )}
                          </div>
                        </details>
                      </td>
                    )}
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