

import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../shared/api/api.js";
import { activeRequestIds, batchTotalsExcludingCanceled } from "../../shared/batch/batchTotals.js";

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

// Дата формирования партии (то же поле createdAt, по которому работает фильтр дат).
function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ru");
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
  const [selected, setSelected] = useState([]); // отмеченные партии для печати/архива
  const [tab, setTab] = useState('active'); // 'active' | 'archive'
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const sortValue = (r, field) => {
    const v = r[field];
    return typeof v === "number" ? v : String(v || "").toLowerCase();
  };
  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(o => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortOrder("asc"); }
  };
  const sortArrow = (field) => sortBy !== field
    ? <span style={{ color: "#bbb", marginLeft: 4 }}>⇅</span>
    : <span style={{ color: "#2563eb", marginLeft: 4, fontWeight: 700 }}>{sortOrder === "asc" ? "↑" : "↓"}</span>;
  const SortTh = ({ field, children, style }) => (
    <th style={{ cursor: "pointer", userSelect: "none", ...style }} onClick={() => handleSort(field)} title="Клик для сортировки">
      {children}{sortArrow(field)}
    </th>
  );
  const sortRows = (list) => {
    if (!sortBy) return list;
    return [...list].sort((a, b) => {
      const av = sortValue(a, sortBy), bv = sortValue(b, sortBy);
      if (av < bv) return sortOrder === "asc" ? -1 : 1;
      if (av > bv) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  };

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

  // Быстрый доступ к накладной по id (для хелперов агрегации из shared/batch).
  const getRequest = (rid) => requests.find(rr => rr.id === rid);
  const batchIds = (batch) => { try { return JSON.parse(batch.requestIds || "[]"); } catch (e) { return []; } };

  // Активные накладные партии = requestIds, КРОМЕ аннулированных (status='canceled').
  // Аннулированные не должны попадать в цифры отчёта (выручка, места, расходы, налог).
  const batchActiveIds = (batch) => activeRequestIds(batchIds(batch), getRequest);

  // Сумма накладных партии (доход) — без аннулированных
  const batchIncome = (batch) => batchTotalsExcludingCanceled(batchIds(batch), getRequest).income;

  // Расходы, привязанные к накладным партии (ручной ввод бухгалтера) — без аннулированных
  const batchExpenses = (batch) => {
    const ids = batchActiveIds(batch);
    let sum = 0;
    expenses.forEach(ex => {
      if (ex.requestId && ids.includes(ex.requestId)) {
        sum += Number(ex.amount) || 0;
      }
    });
    return sum;
  };

  // Строка снапшота ведомости перевозчика, относящаяся к этой партии.
  // В снапшоте сохранены перевозчик/представитель/грузчики и суммы — партия
  // сама их НЕ хранит (назначаются в форме создания ведомости).
  const batchVedomostRow = (batch) => {
    if (!batch.carrierVedomostId) return null;
    const vedomost = carrierVedomosts.find(v => v.id === batch.carrierVedomostId);
    if (!vedomost) return null;
    const snapshot = parseJson(vedomost.data) || {};
    const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
    const row = rows.find(r => r.batchId === batch.id) || null;
    return row ? { ...row, _snapshot: snapshot } : null;
  };

  // ТЗ: суммы перевозчику/грузчикам/представителю — из сформированной ведомости
  // перевозчика, если партия в неё входит (берём точную разбивку по этой партии,
  // а не общий итог ведомости, т.к. в одну ведомость может входить несколько партий)
  const batchPayouts = (batch) => {
    const row = batchVedomostRow(batch);
    if (!row) return { carrierSum: 0, loaderSum: 0, representativeSum: 0 };

    // Новые ведомости: сумма представителя сохранена в строке (ставка из тарифов).
    // Старые: fallback на ручную ставку из snapshot × вес.
    const representativeSum = row.representativeSum != null
      ? Number(row.representativeSum) || 0
      : Math.round((Number(row.weight) || 0) * (Number(row._snapshot.representativeRate) || 0));

    return {
      carrierSum: Number(row.carrierSum) || 0,
      loaderSum: Number(row.loaderSum) || 0,
      representativeSum,
    };
  };

  // Мест в партии — сумма по накладным из requestIds (без аннулированных).
  // Fallback на сохранённое totalSeats, если накладные не подтянулись.
  const batchSeats = (batch) => {
    const seats = batchTotalsExcludingCanceled(batchIds(batch), getRequest).seats;
    return seats || Number(batch.totalSeats) || 0;
  };

  // Компания партии = компания её накладных (у самих партий companyId пустой), без аннулированных
  const batchCompanyId = (batch) => {
    if (batch.companyId) return batch.companyId;
    for (const rid of batchActiveIds(batch)) {
      const r = requests.find(rr => rr.id === rid);
      if (r && r.companyId) return r.companyId;
    }
    return null;
  };

  const rows = useMemo(() => {
    return batches.filter(b => {
      let ok = true;
      // Архив: проведённые (status='reported') — в отдельной вкладке; текущие — в основной.
      const isReported = b.status === 'reported';
      if (tab === 'archive' ? !isReported : isReported) return false;
      if (companyId !== 'all') ok = ok && batchCompanyId(b) === companyId;
      if (dateFrom) ok = ok && new Date(b.createdAt) >= new Date(dateFrom);
      if (dateTo) ok = ok && new Date(b.createdAt) <= new Date(dateTo + "T23:59:59");
      return ok;
    }).map(b => {
      const income = batchIncome(b);
      const expense = batchExpenses(b);
      const payouts = batchPayouts(b);
      const vedRow = batchVedomostRow(b);

      // Перевозчик / представитель / грузчики: приоритет — снапшот ведомости
      // (там они назначены при её создании), иначе поля партии как fallback.
      const carrier = (vedRow && vedRow.carrierName && vedRow.carrierName !== "—")
        ? vedRow.carrierName : carrierName(b.carrierId);
      const representative = (vedRow && vedRow.representativeName && vedRow.representativeName !== "—")
        ? vedRow.representativeName : repName(b.representativeId);
      const loaders = (vedRow && vedRow.loadersCount != null)
        ? Number(vedRow.loadersCount) || 0 : (b.loadersCount || 0);
      const seats = batchSeats(b);

      // ТЗ: налог считается от компании партии по её ставке (Company.taxRate, %)
      const compId = batchCompanyId(b);
      const comp = companies.find(c => c.id === compId);
      const taxMode = comp?.taxMode || 'none';
      const taxRate = Number(comp?.taxRate) || 0;
      const taxExtra = Number(comp?.taxExtra) || 0;
      const vatRate = Number(comp?.vatRate) || 0;
      let taxAmount = 0;
      if (taxMode === 'simplified') {
        taxAmount = Math.round(income * ((taxRate + taxExtra) / 100));
      } else if (taxMode === 'our') {
        taxAmount = Math.round(income * (vatRate / 100));
      } else {
        taxAmount = Math.round(income * (taxRate / 100));
      }

      const totalPayouts = expense + payouts.carrierSum + payouts.loaderSum + payouts.representativeSum + taxAmount;

      return {
        id: b.id,
        name: `${b.number}`,
        createdAt: b.createdAt,
        hasVedomost: !!b.carrierVedomostId,
        vedomostNumber: b.carrierVedomostId ? (carrierVedomosts.find(v => v.id === b.carrierVedomostId)?.number || "") : "",
        representative,
        carrier,
        loaders,
        seats,
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
  }, [batches, requests, expenses, carriers, representatives, companies, carrierVedomosts, companyId, dateFrom, dateTo, tab]);

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

  const printReport = async () => {
    if (activeRows.length === 0) {
      alert('Нет партий для отчёта за выбранный период.');
      return;
    }

    // ТЗ п.4: печать с вкладки «Текущие» = формирование отчёта → партии уходят в архив.
    // С вкладки «Архив» — просто повторная печать (партии уже проведены).
    const isActiveTab = tab === 'active';
    const idsToArchive = activeRows.map(r => r.id);
    if (isActiveTab) {
      const ok = window.confirm(
        `Отчёт по ${idsToArchive.length} партиям будет сформирован и напечатан.\n\n` +
        `После печати эти партии уйдут в архив «Проведённые» — оттуда их можно перепечатать ` +
        `или вернуть в «Текущие», если провели по ошибке.\n\nПродолжить?`
      );
      if (!ok) return;
    }

    const company = companies.find(c => c.id === companyId);
    const period = (dateFrom || dateTo) ? `${dateFrom || '...'} — ${dateTo || '...'}` : 'весь период';

    const trs = sortRows(activeRows).map((r, i) => `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${r.name}${r.vedomostNumber ? ` <span style="color:#2563eb">(${r.vedomostNumber})</span>` : (!r.hasVedomost ? " (нет ведомости)" : "")}</td>
      <td style="text-align:center">${formatDate(r.createdAt)}</td>
      <td>${r.representative}</td>
      <td>${r.carrier}</td>
      <td style="text-align:center">${r.loaders || '—'}</td>
      <td style="text-align:center">${r.seats || '—'}</td>
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
        <th style="width:66px">Дата</th>
        <th>Представитель</th>
        <th>Перевозчик</th>
        <th style="width:50px">Грузчик</th>
        <th style="width:50px">Мест</th>
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
        <td colspan="8" style="text-align:right">ИТОГО:</td>
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

    // Авто-проведение в архив только с вкладки «Текущие». Делаем ПОСЛЕ открытия печати —
    // окно печати уже содержит снимок данных, поэтому перезагрузка списка ему не мешает.
    // Браузер не сообщает, реально ли напечатали, поэтому проводим по факту формирования;
    // при ошибочном проведении партию можно вернуть в «Текущие».
    if (isActiveTab) {
      try {
        await Promise.all(idsToArchive.map(id => api.batches.update(id, { status: 'reported' })));
        setSelected([]);
        await load();
      } catch (e) {
        alert('Отчёт напечатан, но не удалось провести партии в архив: ' + (e.message || e));
      }
    }
  };

  // Вернуть выбранные партии из архива в «Текущие».
  const unarchiveSelected = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Вернуть выбранные партии (${selected.length}) из архива в «Текущие»?`)) return;
    try {
      await Promise.all(selected.map(id => api.batches.update(id, { status: 'formed' })));
      setSelected([]);
      await load();
    } catch (e) { alert('Ошибка при возврате: ' + (e.message || e)); }
  };

  const archiveCount = batches.filter(b => b.status === 'reported').length;
  const activeCount = batches.filter(b => b.status !== 'reported').length;

  const switchTab = (t) => { setTab(t); setSelected([]); };

  return (
    <>
      <div className="navbar">
        <h1>Отчёт</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {selected.length > 0 && (
            <>
              <span style={{ fontSize: "0.85rem", color: "#0369a1" }}>Выбрано: {selected.length}</span>
              <button className="btn" onClick={() => setSelected([])}>Снять выбор</button>
              {tab === 'archive' && (
                <button className="btn" onClick={unarchiveSelected}>
                  ↩ Вернуть в текущие ({selected.length})
                </button>
              )}
            </>
          )}
          <button className="btn btn--accent" onClick={printReport}>
            🖨 {tab === 'active' ? 'Печать отчёта (→ в архив)' : 'Печать отчёта'}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className={`btn ${tab === 'active' ? 'btn--accent' : ''}`} onClick={() => switchTab('active')}>
          📋 Текущие <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({activeCount})</span>
        </button>
        <button className={`btn ${tab === 'archive' ? 'btn--accent' : ''}`} onClick={() => switchTab('archive')}>
          📦 Архив <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({archiveCount})</span>
        </button>
      </div>

      <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, fontSize: '0.85rem', color: '#854d0e' }}>
        {tab === 'active'
          ? '💡 Отберите партии (фильтром по датам и/или галочками) и нажмите «Печать отчёта» — отчёт напечатается, а партии уйдут в архив «Проведённые». Если галочки не стоят, проводится весь список по фильтру.'
          : '💡 Архив проведённых партий. Можно отфильтровать по периоду и распечатать отчёт заново, либо вернуть партии в «Текущие».'}
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

      {/* ТЗ п.3: цветные плашки-счётчики над таблицей убраны — итоги печатаются в таблице отчёта */}

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <div style={{ padding: 16 }}>Загрузка...</div> : (
          <table className="table">
           <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={selected.length === rows.length && rows.length > 0} onChange={toggleAll} />
                </th>
                <th style={{ width: 40 }}>№</th>
                <SortTh field="name">Партия</SortTh>
                <SortTh field="createdAt" style={{ width: 100 }}>Дата</SortTh>
                <SortTh field="representative">Представитель</SortTh>
                <SortTh field="carrier">Перевозчик</SortTh>
                <SortTh field="loaders" style={{ width: 70, textAlign: "center" }}>Грузчик</SortTh>
                <SortTh field="seats" style={{ width: 60, textAlign: "center" }}>Мест</SortTh>
                <SortTh field="region">Регион</SortTh>
                <SortTh field="income" style={{ textAlign: "right" }}>Выручка</SortTh>
                <SortTh field="expense" style={{ textAlign: "right" }}>Расходы</SortTh>
                <SortTh field="carrierSum" style={{ textAlign: "right" }}>Перевозчику</SortTh>
                <SortTh field="loaderSum" style={{ textAlign: "right" }}>Грузчикам</SortTh>
                <SortTh field="representativeSum" style={{ textAlign: "right" }}>Представителю</SortTh>
                <SortTh field="taxAmount" style={{ textAlign: "right" }}>Налог</SortTh>
                <SortTh field="profit" style={{ textAlign: "right" }}>Прибыль</SortTh>
                <th style={{ width: 90, textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={16} className="muted" style={{ padding: 16 }}>Нет данных за выбранный период</td></tr>
              ) : sortRows(rows).map((r, i) => (
                <tr key={r.id} style={{ background: selected.includes(r.id) ? "rgba(24,144,255,0.06)" : "" }}>
                  <td style={{ textAlign: "center" }}>
                    <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                  </td>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 700 }}>{r.name}{r.vedomostNumber ? <span style={{ marginLeft: 6, fontSize: "0.7rem", color: "#1d4ed8", background: "#eff6ff", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>🚚 {r.vedomostNumber}</span> : (!r.hasVedomost && <span style={{ marginLeft: 6, fontSize: "0.7rem", color: "#d46b08", background: "#fff7e6", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>⏳ нет ведомости</span>)}</td>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>{r.representative}</td>
                  <td>{r.carrier}</td>
                  <td style={{ textAlign: "center" }}>{r.loaders || '—'}</td>
                  <td style={{ textAlign: "center" }}>{r.seats || '—'}</td>
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