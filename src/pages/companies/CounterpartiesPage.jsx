// // import React, { useEffect, useState, useMemo } from "react";
// // import { Link, useOutletContext } from "react-router-dom";
// // import { api } from "../../shared/api/api.js";
// // import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
// // import Loader from "../../shared/components/Loader";
// // import Modal from "../../shared/ui/Modal.jsx";

// // export default function CounterpartiesPage() {
// //   const { openCompanySelector } = useOutletContext();
// //   const [counterparties, setCounterparties] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [q, setQ] = useState("");
// //   const [showModal, setShowModal] = useState(false);
// //   const [editingCp, setEditingCp] = useState(null);

// //   // Form state
// //   const [formData, setFormData] = useState({
// //     name: "", phone: "", email: "", companyName: "", bin: "", address: "",
// //     bank: "", bik: "", account: "", kbe: ""
// //   });

// //   const loadData = async () => {
// //     setLoading(true);
// //     try {
// //       const data = await api.counterparties.list();
// //       setCounterparties(Array.isArray(data) ? data : []);
// //     } catch (e) {
// //       console.error(e);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     loadData();
// //   }, []);

// //   const filtered = useMemo(() => {
// //     const s = q.toLowerCase().trim();
// //     if (!s) return counterparties;
// //     return counterparties.filter(c => 
// //       c.name.toLowerCase().includes(s) || 
// //       c.companyName.toLowerCase().includes(s) ||
// //       c.bin.includes(s)
// //     );
// //   }, [counterparties, q]);

// //   const handleEdit = (cp) => {
// //     setEditingCp(cp);
// //     setFormData({ ...cp });
// //     setShowModal(true);
// //   };

// //   const handleDelete = async (id) => {
// //     if (window.confirm("Удалить контрагента?")) {
// //       try {
// //         await api.counterparties.delete(id);
// //         loadData();
// //       } catch (e) {
// //         alert("Ошибка при удалении");
// //       }
// //     }
// //   };

// //   const handleSave = async (e) => {
// //     e.preventDefault();
// //     try {
// //       if (editingCp) {
// //         await api.counterparties.update(editingCp.id, formData);
// //       } else {
// //         const company = getSelectedCompany();
// //         await api.counterparties.create({ ...formData, companyId: company?.id });
// //       }
// //       setShowModal(false);
// //       loadData();
// //     } catch (e) {
// //       alert("Ошибка при сохранении");
// //     }
// //   };


// //   return (
// //     <>
// //       <div className="navbar">
// //         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
// //           <h1>Контрагенты</h1>
// //           <div className="chip">КЛИЕНТЫ И ПОЛУЧАТЕЛИ</div>
// //         </div>
// //         <button className="btn btn--accent" onClick={() => { setEditingCp(null); setFormData({
// //           name: "", phone: "", email: "", companyName: "", bin: "", address: "",
// //           bank: "", bik: "", account: "", kbe: ""
// //         }); setShowModal(true); }}>
// //           + Добавить контрагента
// //         </button>
// //       </div>

// //       <div className="filter" style={{ marginTop: 20 }}>
// //         <div className="field" style={{ flex: 1 }}>
// //           <div className="label">Поиск</div>
// //           <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по имени, БИН или названию компании..." />
// //         </div>
// //       </div>

// //       <div className="table_wrap" style={{ marginTop: 16 }}>
// //         {loading ? <Loader /> : (
// //           <table>
// //             <thead>
// //               <tr>
// //                 <th>Имя (ФИО)</th>
// //                 <th>Компания</th>
// //                 <th>БИН</th>
// //                 <th>Телефон / Email</th>
// //                 <th>Банк</th>
// //                 <th style={{ width: 120 }}>Действия</th>
// //               </tr>
// //             </thead>
// //             <tbody>
// //               {filtered.length === 0 ? (
// //                 <tr><td colSpan={6} className="muted">Контрагенты не найдены.</td></tr>
// //               ) : filtered.map(c => (
// //                 <tr key={c.id}>
// //                   <td><strong>{c.name}</strong></td>
// //                   <td>{c.companyName || "—"}</td>
// //                   <td>{c.bin || "—"}</td>
// //                   <td>
// //                     {c.phone && <div>{c.phone}</div>}
// //                     {c.email && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{c.email}</div>}
// //                   </td>
// //                   <td style={{ fontSize: '0.8rem' }}>
// //                     {c.bank ? `${c.bank} (БИК: ${c.bik})` : "—"}
// //                   </td>
// //                   <td style={{ textAlign: "right" }}>
// //                     <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
// //                       <button className="btn btn--sm" onClick={() => handleEdit(c)}>ред.</button>
// //                       <button className="btn btn--sm btn--danger" onClick={() => handleDelete(c.id)}>х</button>
// //                     </div>
// //                   </td>
// //                 </tr>
// //               ))}
// //             </tbody>
// //           </table>
// //         )}
// //       </div>

// //       {showModal && (
// //         <Modal title={editingCp ? "Редактировать контрагента" : "Новый контрагент"} onClose={() => setShowModal(false)}>
// //           <form onSubmit={handleSave} className="form_grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
// //             <div className="field" style={{ gridColumn: 'span 2' }}>
// //               <div className="label">ФИО / Контактное лицо <span className="text_danger">*</span></div>
// //               <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
// //             </div>
// //             <div className="field">
// //               <div className="label">Название компании</div>
// //               <input value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
// //             </div>
// //             <div className="field">
// //               <div className="label">БИН / ИИН</div>
// //               <input value={formData.bin} onChange={e => setFormData({...formData, bin: e.target.value})} />
// //             </div>
// //             <div className="field">
// //               <div className="label">Телефон</div>
// //               <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
// //             </div>
// //             <div className="field">
// //               <div className="label">Email</div>
// //               <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
// //             </div>
// //             <div className="field" style={{ gridColumn: 'span 2' }}>
// //               <div className="label">Адрес</div>
// //               <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
// //             </div>
// //             <hr style={{ gridColumn: 'span 2', border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
// //             <div className="field" style={{ gridColumn: 'span 2' }}>
// //               <div className="label">Банк</div>
// //               <input value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})} />
// //             </div>
// //             <div className="field">
// //               <div className="label">БИК</div>
// //               <input value={formData.bik} onChange={e => setFormData({...formData, bik: e.target.value})} />
// //             </div>
// //             <div className="field">
// //               <div className="label">Счет (IBAN)</div>
// //               <input value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} />
// //             </div>
// //             <div className="field">
// //               <div className="label">КБЕ</div>
// //               <input value={formData.kbe} onChange={e => setFormData({...formData, kbe: e.target.value})} />
// //             </div>
// //             <div style={{ gridColumn: 'span 2', marginTop: 16, display: 'flex', gap: 12 }}>
// //                <button className="btn btn--accent" type="submit" style={{ flex: 1 }}>Сохранить</button>
// //                <button className="btn" type="button" onClick={() => setShowModal(false)}>Отмена</button>
// //             </div>
// //           </form>
// //         </Modal>
// //       )}
// //     </>
// //   );
// // }





// import React, { useEffect, useState, useMemo } from "react";
// import { api } from "../../shared/api/api.js";
// import { getSelectedCompany } from "../../shared/storage/companyStorage.js";
// import Loader from "../../shared/components/Loader";
// import Modal from "../../shared/ui/Modal.jsx";

// export default function CounterpartiesPage() {
//   const [counterparties, setCounterparties] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [q, setQ] = useState("");
//   const [showModal, setShowModal] = useState(false);
//   const [editingCp, setEditingCp] = useState(null);

//   const [formData, setFormData] = useState({
//     name: "", phone: "", email: "", companyName: "", bin: "", address: "",
//     bank: "", bik: "", account: "", kbe: "", director: ""
//   });

//   const loadData = async () => {
//     setLoading(true);
//     try {
//       const data = await api.counterparties.list();
//       setCounterparties(Array.isArray(data) ? data : []);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadData();
//   }, []);

//   const filtered = useMemo(() => {
//     const s = q.toLowerCase().trim();
//     if (!s) return counterparties;
//     return counterparties.filter(c =>
//       c.name?.toLowerCase().includes(s) ||
//       c.companyName?.toLowerCase().includes(s) ||
//       c.bin?.includes(s)
//     );
//   }, [counterparties, q]);

//   const handleEdit = (cp) => {
//     setEditingCp(cp);
//     setFormData({ director: "", ...cp });
//     setShowModal(true);
//   };

//   const handleNew = () => {
//     setEditingCp(null);
//     setFormData({ name: "", phone: "", email: "", companyName: "", bin: "", address: "", bank: "", bik: "", account: "", kbe: "", director: "" });
//     setShowModal(true);
//   };

//   const handleDelete = async (id) => {
//     if (window.confirm("Удалить контрагента?")) {
//       try {
//         await api.counterparties.delete(id);
//         loadData();
//       } catch (e) {
//         alert("Ошибка при удалении");
//       }
//     }
//   };

//   const handleSave = async (e) => {
//     e.preventDefault();
//     try {
//       if (editingCp) {
//         await api.counterparties.update(editingCp.id, formData);
//       } else {
//         const company = getSelectedCompany();
//         await api.counterparties.create({ ...formData, companyId: company?.id });
//       }
//       setShowModal(false);
//       loadData();
//     } catch (e) {
//       alert("Ошибка при сохранении");
//     }
//   };

//   return (
//     <>
//       <div className="navbar">
//         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
//           <h1>Контрагенты</h1>
//           <div className="chip">КЛИЕНТЫ / ПОЛУЧАТЕЛИ</div>
//         </div>
//         <button className="btn btn--accent" onClick={handleNew}>+ Добавить контрагента</button>
//       </div>

//       <div className="filter" style={{ marginTop: 20 }}>
//         <div className="field" style={{ flex: 1 }}>
//           <div className="label">Поиск</div>
//           <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по имени, БИН или названию компании..." />
//         </div>
//       </div>

//       <div className="table_wrap" style={{ marginTop: 16 }}>
//         {loading ? <Loader /> : (
//           <table>
//             <thead>
//               <tr>
//                 <th>ФИО / Контактное лицо</th>
//                 <th>Директор</th>
//                 <th>Компания</th>
//                 <th>БИН</th>
//                 <th>Телефон / Email</th>
//                 <th>Банк</th>
//                 <th style={{ width: 120 }}>Действия</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.length === 0 ? (
//                 <tr><td colSpan={7} className="muted">Контрагенты не найдены.</td></tr>
//               ) : filtered.map(c => (
//                 <tr key={c.id}>
//                   <td><strong>{c.name}</strong></td>
//                   <td>{c.director || "—"}</td>
//                   <td>{c.companyName || "—"}</td>
//                   <td>{c.bin || "—"}</td>
//                   <td>
//                     {c.phone && <div>{c.phone}</div>}
//                     {c.email && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{c.email}</div>}
//                   </td>
//                   <td style={{ fontSize: '0.8rem' }}>
//                     {c.bank ? `${c.bank} (БК: ${c.bik})` : "—"}
//                   </td>
//                   <td style={{ textAlign: "right" }}>
//                     <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
//                       <button className="btn btn--sm" onClick={() => handleEdit(c)}>ред.</button>
//                       <button className="btn btn--sm btn--danger" onClick={() => handleDelete(c.id)}>х</button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>

//       {showModal && (
//         <Modal title={editingCp ? "Редактировать контрагента" : "Новый контрагент"} onClose={() => setShowModal(false)}>
//           <form onSubmit={handleSave} className="form_grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
//             <div className="field" style={{ gridColumn: 'span 2' }}>
//               <div className="label">ФИО / Контактное лицо <span className="text_danger">*</span></div>
//               <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
//             </div>
//             <div className="field" style={{ gridColumn: 'span 2' }}>
//               <div className="label">Директор (ФИО)</div>
//               <input value={formData.director || ""} onChange={e => setFormData({...formData, director: e.target.value})} placeholder="Иванов Иван Иванович" />
//             </div>
//             <div className="field">
//               <div className="label">Название компании</div>
//               <input value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
//             </div>
//             <div className="field">
//               <div className="label">БИН / ИИН</div>
//               <input value={formData.bin} onChange={e => setFormData({...formData, bin: e.target.value})} />
//             </div>
//             <div className="field">
//               <div className="label">Телефон</div>
//               <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
//             </div>
//             <div className="field">
//               <div className="label">Email</div>
//               <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
//             </div>
//             <div className="field" style={{ gridColumn: 'span 2' }}>
//               <div className="label">Адрес</div>
//               <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
//             </div>
//             <hr style={{ gridColumn: 'span 2', border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
//             <div className="field" style={{ gridColumn: 'span 2' }}>
//               <div className="label">Банк</div>
//               <input value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})} />
//             </div>
//             <div className="field">
//               <div className="label">БИК</div>
//               <input value={formData.bik} onChange={e => setFormData({...formData, bik: e.target.value})} />
//             </div>
//             <div className="field">
//               <div className="label">Счёт (IBAN)</div>
//               <input value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} />
//             </div>
//             <div className="field">
//               <div className="label">КБЕ</div>
//               <input value={formData.kbe} onChange={e => setFormData({...formData, kbe: e.target.value})} />
//             </div>
//             <div style={{ gridColumn: 'span 2', marginTop: 16, display: 'flex', gap: 12 }}>
//                <button className="btn btn--accent" type="submit" style={{ flex: 1 }}>Сохранить</button>
//                <button className="btn" type="button" onClick={() => setShowModal(false)}>Отмена</button>
//             </div>
//           </form>
//         </Modal>
//       )}
//     </>
//   );
// }


import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";
import Modal from "../../shared/ui/Modal.jsx";

// ---- СОРТИРОВКА ----
function getSortValue(c, field) {
  switch (field) {
    case 'name':        return (c.name || '').toString().toLowerCase();
    case 'director':    return (c.director || '').toString().toLowerCase();
    case 'companyName': return (c.companyName || '').toString().toLowerCase();
    case 'bin':         return (c.bin || '').toString().toLowerCase();
    case 'phone':       return (c.phone || c.email || '').toString().toLowerCase();
    case 'bank':        return (c.bank || '').toString().toLowerCase();
    default:            return '';
  }
}

export default function CounterpartiesPage() {
  const [counterparties, setCounterparties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCp, setEditingCp] = useState(null);

  const [formData, setFormData] = useState({
    name: "", phone: "", email: "", companyName: "", bin: "", address: "",
    bank: "", bik: "", account: "", kbe: "", director: ""
  });

  // Сортировка
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

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
      const data = await api.counterparties.list();
      setCounterparties(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    let list = counterparties;
    if (s) {
      list = list.filter(c =>
        c.name?.toLowerCase().includes(s) ||
        c.companyName?.toLowerCase().includes(s) ||
        c.bin?.includes(s)
      );
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
  }, [counterparties, q, sortBy, sortOrder]);

  const handleEdit = (cp) => {
    setEditingCp(cp);
    setFormData({ director: "", ...cp });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingCp(null);
    setFormData({ name: "", phone: "", email: "", companyName: "", bin: "", address: "", bank: "", bik: "", account: "", kbe: "", director: "" });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Удалить контрагента?")) {
      try {
        await api.counterparties.delete(id);
        loadData();
      } catch (e) {
        alert("Ошибка при удалении");
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingCp) {
        await api.counterparties.update(editingCp.id, formData);
      } else {
        const company = getSelectedCompany();
        await api.counterparties.create({ ...formData, companyId: company?.id });
      }
      setShowModal(false);
      loadData();
    } catch (e) {
      alert("Ошибка при сохранении");
    }
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1>Контрагенты</h1>
          <div className="chip">КЛИЕНТЫ / ПОЛУЧАТЕЛИ</div>
        </div>
        <button className="btn btn--accent" onClick={handleNew}>+ Добавить контрагента</button>
      </div>

      <div className="filter" style={{ marginTop: 20 }}>
        <div className="field" style={{ flex: 1 }}>
          <div className="label">Поиск</div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по имени, БИН или названию компании..." />
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table>
            <thead>
              <tr>
                <SortableTh field="name">ФИО / Контактное лицо</SortableTh>
                <SortableTh field="director">Директор</SortableTh>
                <SortableTh field="companyName">Компания</SortableTh>
                <SortableTh field="bin">БИН</SortableTh>
                <SortableTh field="phone">Телефон / Email</SortableTh>
                <SortableTh field="bank">Банк</SortableTh>
                <th style={{ width: 120 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="muted">Контрагенты не найдены.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.director || "—"}</td>
                  <td>{c.companyName || "—"}</td>
                  <td>{c.bin || "—"}</td>
                  <td>
                    {c.phone && <div>{c.phone}</div>}
                    {c.email && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{c.email}</div>}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {c.bank ? `${c.bank} (БК: ${c.bik})` : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn--sm" onClick={() => handleEdit(c)}>ред.</button>
                      <button className="btn btn--sm btn--danger" onClick={() => handleDelete(c.id)}>х</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editingCp ? "Редактировать контрагента" : "Новый контрагент"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="form_grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <div className="label">ФИО / Контактное лицо <span className="text_danger">*</span></div>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <div className="label">Директор (ФИО)</div>
              <input value={formData.director || ""} onChange={e => setFormData({...formData, director: e.target.value})} placeholder="Иванов Иван Иванович" />
            </div>
            <div className="field">
              <div className="label">Название компании</div>
              <input value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
            </div>
            <div className="field">
              <div className="label">БИН / ИИН</div>
              <input value={formData.bin} onChange={e => setFormData({...formData, bin: e.target.value})} />
            </div>
            <div className="field">
              <div className="label">Телефон</div>
              <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="field">
              <div className="label">Email</div>
              <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <div className="label">Адрес</div>
              <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <hr style={{ gridColumn: 'span 2', border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <div className="label">Банк</div>
              <input value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})} />
            </div>
            <div className="field">
              <div className="label">БИК</div>
              <input value={formData.bik} onChange={e => setFormData({...formData, bik: e.target.value})} />
            </div>
            <div className="field">
              <div className="label">Счёт (IBAN)</div>
              <input value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} />
            </div>
            <div className="field">
              <div className="label">КБЕ</div>
              <input value={formData.kbe} onChange={e => setFormData({...formData, kbe: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 2', marginTop: 16, display: 'flex', gap: 12 }}>
               <button className="btn btn--accent" type="submit" style={{ flex: 1 }}>Сохранить</button>
               <button className="btn" type="button" onClick={() => setShowModal(false)}>Отмена</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}