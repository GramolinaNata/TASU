// import React, { useEffect, useState } from "react";
// import { api } from "../../shared/api/api.js";
// import Loader from "../../shared/components/Loader";
// const CATS = ["Ремонт машины","Заправка","Зарплата сотрудников","Техническое обслуживание","Аренда","Прочее"];
// export default function AccountantExpensesPage() {
//   const [expenses, setExpenses] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], category: CATS[0], description: "", amount: "", docNumber: "" });
//   const load = async () => { setLoading(true); try { const d = await api.expenses.list(); setExpenses(Array.isArray(d) ? d : []); } catch(e) { setExpenses([]); } finally { setLoading(false); } };
//   useEffect(() => { load(); }, []);
//   const total = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
//   const save = async (e) => { e.preventDefault(); setSaving(true); try { await api.expenses.create({ ...form, amount: parseFloat(form.amount) }); setForm({ date: new Date().toISOString().split("T")[0], category: CATS[0], description: "", amount: "", docNumber: "" }); setShowForm(false); load(); } catch(e) { alert("Ошибка: " + e.message); } finally { setSaving(false); } };
//   const del = async (id) => { if (window.confirm("Удалить?")) { try { await api.expenses.delete(id); load(); } catch(e) { alert("Ошибка"); } } };
//   return (
//     <>
//       <div className="navbar">
//         <div style={{display:"flex",alignItems:"center",gap:12}}><h1>Расходы НОВЫЙ</h1></div>
//         <div style={{display:"flex",gap:8}}>
//           <button className="btn btn--accent" onClick={() => setShowForm(!showForm)}>+ Добавить расход</button>
//         </div>
//       </div>
//       <div style={{marginTop:16,padding:16,background:"var(--card)",borderRadius:8}}>Итого: <strong>{total.toLocaleString()} тг</strong></div>
//       {showForm && (
//         <div className="card" style={{marginTop:16}}>
//           <div className="card_body">
//             <form onSubmit={save} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
//               <div className="field"><div className="label">Дата</div><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required /></div>
//               <div className="field"><div className="label">Категория</div><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
//               <div className="field"><div className="label">Сумма</div><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required /></div>
//               <div className="field"><div className="label">Накладная</div><input value={form.docNumber} onChange={e=>setForm({...form,docNumber:e.target.value})} /></div>
//               <div className="field" style={{gridColumn:"span 2"}}><div className="label">Описание</div><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
//               <div style={{gridColumn:"span 3",display:"flex",gap:12}}><button className="btn btn--accent" type="submit" disabled={saving}>{saving?"Сохранение...":"Сохранить"}</button><button className="btn" type="button" onClick={()=>setShowForm(false)}>Отмена</button></div>
//             </form>
//           </div>
//         </div>
//       )}
//       <div className="table_wrap" style={{marginTop:16}}>
//         {loading ? <Loader /> : (
//           <table className="table_fixed">
//             <thead><tr><th>Дата</th><th>Категория</th><th>Описание</th><th>Накладная</th><th>Сумма</th><th></th></tr></thead>
//             <tbody>
//               {expenses.length === 0 ? <tr><td colSpan={6} className="muted" style={{padding:16}}>Расходов пока нет.</td></tr> :
//                 expenses.map(e => <tr key={e.id}><td>{e.date}</td><td>{e.category}</td><td>{e.description||"—"}</td><td>{e.docNumber||"—"}</td><td style={{fontWeight:700}}>{Number(e.amount).toLocaleString()} тг</td><td><button className="btn btn--sm btn--danger" onClick={()=>del(e.id)}>х</button></td></tr>)
//               }
//             </tbody>
//           </table>
//         )}
//       </div>
//     </>
//   );
// }


import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import Loader from "../../shared/components/Loader";

const CATS = [
  "Перевозка",
  "Ремонт машины",
  "Заправка",
  "Зарплата сотрудников",
  "Техническое обслуживание",
  "Аренда",
  "Прочее",
];

const EMPTY_FORM = {
  date: new Date().toISOString().split("T")[0],
  category: CATS[0],
  description: "",
  amount: "",
  docNumber: "",
  requestId: "", // 🆕 ТЗ v2: привязка к накладной
  companyId: "",
};

// Безопасный парсинг details
const parseDetails = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
};

// Удобное представление накладной для поиска
const formatRequest = (r) => {
  const d = parseDetails(r.details);
  const num = r.docNumber || d.number || r.id?.slice(0, 8);
  const customer = d.customer?.companyName || d.customer?.fio || '';
  const route = d.route ? `${d.route.fromCity || ''} → ${d.route.toCity || ''}` : '';
  return { num, customer, route, date: r.date, type: r.type };
};

export default function AccountantExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // 🆕 ТЗ v2: Поиск накладных
  const [requestSearch, setRequestSearch] = useState('');
  const [showRequestDropdown, setShowRequestDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // 🆕 ТЗ v2: Фильтры расходов
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCompanyId, setFilterCompanyId] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterCompanyId !== 'all') params.companyId = filterCompanyId;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;

      const [exp, reqs, comps] = await Promise.all([
        api.expenses.list(params),
        api.requests.list().catch(() => []),
        api.companies.list().catch(() => []),
      ]);
      setExpenses(Array.isArray(exp) ? exp : []);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setCompanies(Array.isArray(comps) ? comps : []);
    } catch (e) {
      console.error('Load error', e);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterCategory, filterCompanyId, filterDateFrom, filterDateTo]);

  // Закрытие выпадашки при клике вне
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowRequestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🆕 ТЗ v2: Фильтрация накладных по поиску
  const filteredRequests = useMemo(() => {
    const s = requestSearch.trim().toLowerCase();
    if (!s) return requests.slice(0, 30);
    return requests.filter(r => {
      const f = formatRequest(r);
      const hay = `${f.num} ${f.customer} ${f.route}`.toLowerCase();
      return hay.includes(s);
    }).slice(0, 30);
  }, [requests, requestSearch]);

  // 🆕 ТЗ v2: Выбор накладной из выпадашки
  const selectRequest = (r) => {
    const f = formatRequest(r);
    setForm(prev => ({
      ...prev,
      requestId: r.id,
      docNumber: f.num,
      // 🆕 По ТЗ: при привязке к накладной — категория "Перевозка" по умолчанию
      category: prev.category === CATS[0] || !prev.category ? 'Перевозка' : prev.category,
      companyId: r.companyId || prev.companyId,
    }));
    setRequestSearch(`${f.num} — ${f.customer || f.route || ''}`.trim());
    setShowRequestDropdown(false);
  };

  // 🆕 ТЗ v2: Сброс выбранной накладной
  const clearRequest = () => {
    setForm(prev => ({ ...prev, requestId: '', docNumber: '', companyId: '' }));
    setRequestSearch('');
  };

  const total = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.expenses.create({
        ...form,
        amount: parseFloat(form.amount),
      });
      setForm(EMPTY_FORM);
      setRequestSearch('');
      setShowForm(false);
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (window.confirm("Удалить расход?")) {
      try {
        await api.expenses.delete(id);
        load();
      } catch (e) {
        alert("Ошибка");
      }
    }
  };

  // Найти накладную по requestId для отображения в таблице
  const findRequest = (requestId) => requests.find(r => r.id === requestId);

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Расходы</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--accent" onClick={() => setShowForm(!showForm)}>
            + Добавить расход
          </button>
        </div>
      </div>

      {/* 🆕 ТЗ v2: Фильтры */}
      <div className="card" style={{ marginTop: 16, padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ minWidth: 160 }}>
          <div className="label">Категория</div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">Все категории</option>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: 200 }}>
          <div className="label">Компания</div>
          <select value={filterCompanyId} onChange={e => setFilterCompanyId(e.target.value)}>
            <option value="all">Все компании</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ width: 140 }}>
          <div className="label">Дата с</div>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
        </div>
        <div className="field" style={{ width: 140 }}>
          <div className="label">Дата по</div>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
        </div>

        {(filterCategory !== 'all' || filterCompanyId !== 'all' || filterDateFrom || filterDateTo) && (
          <button
            className="btn btn--sm"
            onClick={() => { setFilterCategory('all'); setFilterCompanyId('all'); setFilterDateFrom(''); setFilterDateTo(''); }}
            style={{ marginLeft: 'auto' }}
          >
            ✕ Сбросить
          </button>
        )}
      </div>

      {/* Итого */}
      <div style={{ marginTop: 12, padding: 16, background: "var(--card)", borderRadius: 8, display: 'flex', gap: 24 }}>
        <div>Записей: <strong>{expenses.length}</strong></div>
        <div>Итого: <strong style={{ color: '#dc2626' }}>{total.toLocaleString()} тг</strong></div>
      </div>

      {/* Форма создания */}
      {showForm && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card_body">
            <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

              {/* 🆕 ТЗ v2: Поиск накладной — на всю ширину */}
              <div className="field" style={{ gridColumn: "span 3", position: 'relative' }} ref={dropdownRef}>
                <div className="label">
                  Накладная
                  <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#6b7280' }}>
                    (необязательно — для расхода на конкретную накладную)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      value={requestSearch}
                      onChange={e => {
                        setRequestSearch(e.target.value);
                        setShowRequestDropdown(true);
                      }}
                      onFocus={() => setShowRequestDropdown(true)}
                      placeholder="🔍 Начните вводить номер, заказчика или маршрут..."
                      style={{ width: '100%' }}
                    />
                    {form.requestId && (
                      <span style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        padding: '2px 8px', borderRadius: 4, background: '#ecfdf5', color: '#047857',
                        fontSize: '0.7rem', fontWeight: 700,
                      }}>
                        ✓ Привязано
                      </span>
                    )}
                  </div>
                  {form.requestId && (
                    <button type="button" className="btn btn--sm" onClick={clearRequest}>
                      ✕ Снять
                    </button>
                  )}
                </div>

                {/* Выпадашка с накладными */}
                {showRequestDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    maxHeight: 320,
                    overflowY: 'auto',
                    zIndex: 50,
                    marginTop: 4,
                  }}>
                    {filteredRequests.length === 0 ? (
                      <div className="muted" style={{ padding: 12, textAlign: 'center' }}>
                        {requestSearch ? 'Ничего не найдено' : 'Нет накладных'}
                      </div>
                    ) : (
                      filteredRequests.map(r => {
                        const f = formatRequest(r);
                        const compName = companies.find(c => c.id === r.companyId)?.name || '';
                        return (
                          <div
                            key={r.id}
                            onClick={() => selectRequest(r)}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--line)',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700 }}>
                              <span style={{
                                padding: '1px 6px', borderRadius: 3,
                                background: r.type === 'TTN' ? '#e0f2fe' : r.type === 'SMR' ? '#fef3c7' : '#f3f4f6',
                                color: r.type === 'TTN' ? '#0369a1' : r.type === 'SMR' ? '#92400e' : '#6b7280',
                                fontSize: '0.7rem',
                              }}>
                                {r.type || '—'}
                              </span>
                              #{f.num}
                              <span className="muted" style={{ fontWeight: 400, fontSize: '0.75rem' }}>{f.date}</span>
                            </div>
                            {f.customer && (
                              <div style={{ fontSize: '0.8rem', marginTop: 2 }}>{f.customer}</div>
                            )}
                            {f.route && (
                              <div className="muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>{f.route}</div>
                            )}
                            {compName && (
                              <div className="muted" style={{ fontSize: '0.7rem', marginTop: 2 }}>🏢 {compName}</div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="field">
                <div className="label">Дата</div>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="field">
                <div className="label">Категория</div>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <div className="label">Сумма (тг)</div>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required placeholder="0" />
              </div>

              <div className="field" style={{ gridColumn: "span 3" }}>
                <div className="label">Описание</div>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Комментарий к расходу" />
              </div>

              <div style={{ gridColumn: "span 3", display: "flex", gap: 12 }}>
                <button className="btn btn--accent" type="submit" disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
                <button className="btn" type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setRequestSearch(''); }}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Таблица расходов */}
      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Дата</th>
                <th style={{ width: 180 }}>Категория</th>
                <th>Описание</th>
                <th style={{ width: 200 }}>Накладная</th>
                <th style={{ width: 140 }}>Сумма</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={6} className="muted" style={{ padding: 16 }}>Расходов пока нет.</td></tr>
              ) : (
                expenses.map(e => {
                  const linkedRequest = e.requestId ? findRequest(e.requestId) : null;
                  return (
                    <tr key={e.id}>
                      <td>{e.date}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: e.category === 'Перевозка' ? '#e0f2fe' : '#f3f4f6',
                          color: e.category === 'Перевозка' ? '#0369a1' : '#374151',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}>
                          {e.category}
                        </span>
                      </td>
                      <td>{e.description || "—"}</td>
                      <td>
                        {linkedRequest ? (
                          <Link
                            to={`/accountant/acts/${linkedRequest.id}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                          >
                            <span style={{
                              padding: '1px 6px', borderRadius: 3,
                              background: '#ecfdf5', color: '#047857',
                              fontSize: '0.7rem', fontWeight: 700,
                            }}>
                              ✓ {linkedRequest.type || ''}
                            </span>
                            #{e.docNumber || linkedRequest.docNumber}
                          </Link>
                        ) : e.docNumber ? (
                          <span className="muted" style={{ fontSize: '0.85rem' }}>{e.docNumber}</span>
                        ) : "—"}
                      </td>
                      <td style={{ fontWeight: 700, color: '#dc2626' }}>
                        {Number(e.amount).toLocaleString()} тг
                      </td>
                      <td>
                        <button className="btn btn--sm btn--danger" onClick={() => del(e.id)}>×</button>
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