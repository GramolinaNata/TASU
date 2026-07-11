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
    case 'processed':return a.isFullyCompleted ? 1 : 0;
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
  // ТЗ v2: Активные / Завершённые (по полю isFullyCompleted)
  const [tab, setTab] = useState("active");

  // ТЗ: расходы, привязанные к накладным — колонка "Расход" видна только бухгалтеру
  // (сама страница уже защищена ролью accountantOnly на уровне роута)
  const [expenses, setExpenses] = useState([]);
  const [savingExpenseId, setSavingExpenseId] = useState(null);
  const [expenseDrafts, setExpenseDrafts] = useState({}); // { [requestId]: string }

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
      const [list, compList, expList] = await Promise.all([
        api.requests.list(),
        api.companies.list().catch(() => []),
        api.expenses.list().catch(() => []),
      ]);

      if (Array.isArray(compList)) setCompanies(compList);
      if (Array.isArray(expList)) setExpenses(expList);

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

  // Сумма расходов по каждой накладной (requestId → total)
  const expensesByRequest = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      if (!e.requestId) return;
      map[e.requestId] = (map[e.requestId] || 0) + (parseFloat(e.amount) || 0);
    });
    return map;
  }, [expenses]);

  const handleSaveExpense = async (requestId, act) => {
    const raw = expenseDrafts[requestId];
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount <= 0) {
      alert("Укажите корректную сумму расхода");
      return;
    }
    setSavingExpenseId(requestId);
    try {
      await api.expenses.create({
        date: new Date().toISOString().split("T")[0],
        category: "Перевозка",
        description: "",
        amount,
        docNumber: act.docNumber || act.number || "",
        requestId,
        companyId: act.companyId || "",
      });
      setExpenseDrafts(prev => ({ ...prev, [requestId]: "" }));
      const fresh = await api.expenses.list().catch(() => []);
      if (Array.isArray(fresh)) setExpenses(fresh);
    } catch (err) {
      alert("Ошибка при сохранении расхода: " + err.message);
    } finally {
      setSavingExpenseId(null);
    }
  };

  // ТЗ v2: Промежуточная пометка "отработано" (isProcessedByAccountant)
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

  // ТЗ v2: Финальное завершение работы — заявка уйдёт в "Завершённые"
  const markFullyCompleted = async (actId) => {
    if (!confirm('Подтвердить завершение работы по заявке? Все документы сформированы?')) return;
    try {
      const updated = await api.requests.markFullyCompleted(actId);
      setActs(prev => prev.map(a => a.id === actId ? {
        ...a,
        isFullyCompleted: true,
        fullyCompletedAt: updated.fullyCompletedAt,
        reEditedAfterCompletion: false,
      } : a));
    } catch (err) {
      alert("Ошибка при завершении: " + err.message);
    }
  };

  // ТЗ v2: Возврат в активные (если бухгалтер ошибся)
  const restoreToActive = async (actId) => {
    if (!confirm('Вернуть заявку в активные? Дата будет обновлена на сегодня.')) return;
    try {
      await api.requests.restore(actId);
      setActs(prev => prev.map(a => a.id === actId ? {
        ...a,
        isFullyCompleted: false,
        fullyCompletedAt: null,
        reEditedAfterCompletion: false,
      } : a));
    } catch (err) {
      alert("Ошибка при возврате: " + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let list = acts.filter(a => !!a.readyForAccountant && !a.isDeferredForAccountant);

    // ТЗ v2: Активные = НЕ isFullyCompleted; Завершённые = isFullyCompleted
    if (tab === "active") {
      list = list.filter(a => !a.isFullyCompleted);
    } else {
      list = list.filter(a => !!a.isFullyCompleted);
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
      if (statusFilter === "canceled") list = list.filter(a => a.status === "canceled");
      else if (statusFilter === "active") list = list.filter(a => a.status !== "canceled" && a.status !== "draft");
      else if (statusFilter === "draft") list = list.filter(a => a.status === "draft");
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

    const sorted = [...list].sort((a, b) => {
      const av = getSortValue(a, sortBy, companies);
      const bv = getSortValue(b, sortBy, companies);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [acts, q, dateFrom, dateTo, docTypeFilter, statusFilter, snoFilter, avrFilter, esfFilter, tab, companyFilter, sortBy, sortOrder, companies]);

  // ТЗ v2: Считаем по полю isFullyCompleted
  const tabCounts = useMemo(() => {
    const base = acts.filter(a => !!a.readyForAccountant && !a.isDeferredForAccountant);
    const applyCompany = (l) => companyFilter === "all" ? l : l.filter(a => a.companyId === companyFilter);
    return {
      active: applyCompany(base.filter(a => !a.isFullyCompleted)).length,
      processed: applyCompany(base.filter(a => !!a.isFullyCompleted)).length,
      // Подсветим количество "вернувшихся в сток после редактирования"
      reEdited: applyCompany(base.filter(a => !a.isFullyCompleted && a.reEditedAfterCompletion)).length,
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

      {/* ТЗ v2: Активные / Завершённые */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button
          className={`btn ${tab === 'active' ? 'btn--accent' : ''}`}
          onClick={() => setTab('active')}
        >
          🟢 Активные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.active})</span>
        </button>
        <button
          className={`btn ${tab === 'processed' ? 'btn--accent' : ''}`}
          onClick={() => setTab('processed')}
        >
          ✅ Завершённые <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.processed})</span>
        </button>

        {/* ТЗ v2: Бейдж "Вернулось в сток" — заявки которые завершались, но менеджер их отредактировал */}
        {tabCounts.reEdited > 0 && tab === 'active' && (
          <div style={{
            marginLeft: 8,
            padding: '6px 12px',
            borderRadius: 6,
            background: '#fff7ed',
            border: '1px solid #fdba74',
            color: '#c2410c',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}>
            ⚠ Вернулось после редактирования: {tabCounts.reEdited}
          </div>
        )}
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
                <th style={{ width: 130, textAlign: 'center' }}>Расход</th>
                {/* ТЗ v2: Колонка действий — отработано / завершить / вернуть */}
                <th style={{ width: 140, textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="muted" style={{ padding: 16 }}>
                    {tab === 'active' ? 'Нет активных заявок' : 'Нет завершённых заявок'}
                    {companyFilter !== 'all' && ' для выбранной компании'}.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const compName = companies.find(c => c.id === a.companyId)?.name || a.company?.name || '—';
                  const compColor = getCompanyColor(a.companyId, companies);
                  // ТЗ v2: Подсветка тех заявок, что вернулись в сток после редактирования
                  const isReEdited = !!a.reEditedAfterCompletion;
                  const rowBg = isReEdited
                    ? 'rgba(253, 186, 116, 0.15)' // оранжевая подсветка
                    : (!a.isViewedByAccountant ? 'rgba(37, 99, 235, 0.05)' : 'inherit');
                  const borderColor = isReEdited
                    ? '#f97316'
                    : (!a.isViewedByAccountant ? '#2563eb' : compColor);

                  return (
                    <tr key={a.id} style={{
                      opacity: a.status === 'canceled' ? 0.5 : 1,
                      background: rowBg,
                      borderLeft: `4px solid ${borderColor}`
                    }}>
                      <td className="num">
                        <Link to={`/accountant/acts/${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {!a.isViewedByAccountant && (
                            <span title="Новая заявка" style={{
                              width: 8, height: 8, background: '#2563eb', borderRadius: '50%', display: 'inline-block'
                            }} />
                          )}
                          {/* ТЗ v2: Бейдж "Вернулось" */}
                          {isReEdited && (
                            <span title="Вернулось в сток после редактирования менеджером" style={{
                              fontSize: 9,
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: '#f97316',
                              color: '#fff',
                              fontWeight: 700,
                            }}>↻ ПРАВКА</span>
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
                      {/* ТЗ: Расход по накладной — видно только бухгалтеру (страница защищена ролью) */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                          {expensesByRequest[a.id] > 0 && (
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#dc2626' }}>
                              {expensesByRequest[a.id].toLocaleString()} тг
                            </span>
                          )}
                          <div style={{ display: 'flex', gap: 4 }}>
                            <input
                              type="number"
                              placeholder="0"
                              value={expenseDrafts[a.id] || ""}
                              onChange={e => setExpenseDrafts(prev => ({ ...prev, [a.id]: e.target.value }))}
                              style={{ width: 70, padding: '2px 6px', fontSize: '0.8rem' }}
                            />
                            <button
                              onClick={() => handleSaveExpense(a.id, a)}
                              disabled={savingExpenseId === a.id}
                              style={{
                                background: '#dc2626', color: '#fff', border: 'none',
                                borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem',
                                cursor: 'pointer', fontWeight: 700,
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </td>
                      {/* ТЗ v2: Колонка действий */}
                      <td style={{ textAlign: "center" }}>
                        {a.isFullyCompleted ? (
                          <button
                            onClick={() => restoreToActive(a.id)}
                            title="Вернуть в активные"
                            style={{
                              background: '#fff', border: '1px solid #cbd5e1',
                              borderRadius: 6, cursor: 'pointer',
                              padding: '4px 10px', fontSize: 12, fontWeight: 600,
                              color: '#475569',
                            }}
                          >
                            ↩ В активные
                          </button>
                        ) : (
                          <button
                            onClick={() => markFullyCompleted(a.id)}
                            title="Подтвердить завершение работы (заявка перейдёт в Завершённые)"
                            style={{
                              background: '#22c55e', border: 'none',
                              borderRadius: 6, cursor: 'pointer',
                              padding: '4px 10px', fontSize: 12, fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            ✓ Завершить
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