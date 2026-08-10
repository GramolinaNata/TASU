

import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../shared/api/api.js";
import { activeRequestIds, batchTotalsExcludingCanceled } from "../../shared/batch/batchTotals.js";
import { vedomostRowForBatch, payoutsFromRow } from "../../shared/batch/vedomostPayouts.js";
import { calcTax, taxSettingsOf } from "../../shared/tax/calcTax.js";

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
  const [expandedVedomost, setExpandedVedomost] = useState(null); // ТЗ п.5: раскрытая группа
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
  const batchVedomostRow = (batch) => vedomostRowForBatch(batch, carrierVedomosts);

  // ТЗ: суммы перевозчику/грузчикам/представителю — из сформированной ведомости
  // перевозчика, если партия в неё входит (берём точную разбивку по этой партии,
  // а не общий итог ведомости, т.к. в одну ведомость может входить несколько партий).
  // Логика вынесена в shared/batch/vedomostPayouts.js и покрыта тестами —
  // отображение ведомости меняется, суммы выплат меняться не должны.
  const batchPayouts = (batch) => payoutsFromRow(batchVedomostRow(batch));

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

      // ТЗ: налог считается от компании партии по её ставкам. Сам расчёт вынесен
      // в shared/tax/calcTax.js и покрыт тестами: в ОУР появился КПН, который
      // берётся ПОСЛЕ вычета НДС и суммы официально купленной перевозки.
      //
      // Пока ставка КПН у компании не заполнена (по умолчанию 0), результат
      // совпадает с прежним до тенге — упрощёнка и «без налога» не менялись.
      const compId = batchCompanyId(b);
      const comp = companies.find(c => c.id === compId);
      const settings = taxSettingsOf(comp);
      const tax = calcTax({
        income,
        carrierSum: payouts.carrierSum,
        carrierOfficial: !!b.carrierOfficial,
        ...settings,
      });
      const taxRate = settings.taxRate;
      const taxAmount = tax.total;

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
        // Разбивка налога — чтобы бухгалтер видел, из чего он сложился,
        // и мог сверить вычет по перевозке.
        taxVat: tax.vat,
        taxKpn: tax.kpn,
        taxAfterVat: tax.afterVat,
        taxKpnBase: tax.kpnBase,
        taxDeducted: tax.deducted,
        // «Итог» из примера заказчика: остаток после НДС, перевозки и КПН.
        taxNet: tax.net,
        taxMode: settings.taxMode,
        carrierOfficial: !!b.carrierOfficial,
        totalPayouts,
        profit: income - totalPayouts,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, requests, expenses, carriers, representatives, companies, carrierVedomosts, companyId, dateFrom, dateTo, tab]);

  // Если что-то отмечено — работаем только с отмеченными, иначе со всеми
  const activeRows = selected.length > 0 ? rows.filter(r => selected.includes(r.id)) : rows;

  // ── ТЗ п.5: группировка строк отчёта по ведомости перевозчика ──────
  // ТОЛЬКО отображение: rows/activeRows/totals/печать считаются как раньше,
  // здесь строки лишь раскладываются по группам и агрегируются для шапки группы.
  // Партии без ведомости собираются в отдельную группу и уходят вниз списка.
  const NO_VEDOMOST = "__none__";

  const groups = useMemo(() => {
    const map = new Map();
    sortRows(rows).forEach(r => {
      const key = r.vedomostNumber || NO_VEDOMOST;
      if (!map.has(key)) map.set(key, { key, number: r.vedomostNumber || "", rows: [] });
      map.get(key).rows.push(r);
    });

    const list = [...map.values()].map(g => {
      const agg = g.rows.reduce((a, r) => ({
        seats: a.seats + r.seats,
        loaders: a.loaders + r.loaders,
        income: a.income + r.income,
        expense: a.expense + r.expense,
        carrierSum: a.carrierSum + r.carrierSum,
        loaderSum: a.loaderSum + r.loaderSum,
        representativeSum: a.representativeSum + r.representativeSum,
        taxAmount: a.taxAmount + r.taxAmount,
        profit: a.profit + r.profit,
      }), { seats: 0, loaders: 0, income: 0, expense: 0, carrierSum: 0, loaderSum: 0, representativeSum: 0, taxAmount: 0, profit: 0 });

      // Перевозчик/представитель/регион в шапке группы: показываем, только если
      // он один на всю ведомость. Разные — «разные», чтобы не выдавать первый за общий.
      const common = (field) => {
        const set = new Set(g.rows.map(r => r[field]).filter(v => v && v !== "—"));
        if (set.size === 0) return "—";
        return set.size === 1 ? [...set][0] : "разные";
      };
      const times = g.rows.map(r => new Date(r.createdAt || 0).getTime()).filter(t => t > 0);

      return {
        ...g, ...agg,
        count: g.rows.length,
        carrier: common("carrier"),
        representative: common("representative"),
        region: common("region"),
        createdAt: times.length ? new Date(Math.min(...times)) : null,
      };
    });

    return list.sort((a, b) => {
      if (!a.number && b.number) return 1;   // «без ведомости» — всегда вниз
      if (a.number && !b.number) return -1;
      return String(a.number).localeCompare(String(b.number));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortBy, sortOrder]);

  const groupSelected = (g) => g.rows.every(r => selected.includes(r.id));

  // Галочка на шапке группы = выделить/снять все её партии. Печать и архив
  // работают с теми же id партий, что и раньше.
  const toggleGroup = (g) => {
    const ids = g.rows.map(r => r.id);
    setSelected(prev => groupSelected(g)
      ? prev.filter(x => !ids.includes(x))
      : [...new Set([...prev, ...ids])]);
  };

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

    // Архивация только по ЯВНО выделенным партиям и только с вкладки «Текущие».
    // Без выделения печать ничего не проводит: раньше пустой selected давал fallback
    // на весь список (activeRows), и одно нажатие «Печать» уводило в архив ВСЕ
    // текущие партии — накладные потом «пропадали» из отчёта.
    const isActiveTab = tab === 'active';
    const idsToArchive = (isActiveTab && selected.length > 0) ? activeRows.map(r => r.id) : [];
    if (idsToArchive.length > 0) {
      const names = sortRows(activeRows).map(r => r.name).join(', ');
      const ok = window.confirm(
        `Отчёт по ${idsToArchive.length} выделенным партиям будет напечатан.\n\n` +
        `Партии: ${names}\n\n` +
        `После печати они уйдут в архив «Проведённые» — оттуда можно перепечатать ` +
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

    // Авто-проведение в архив — только по выделенным (idsToArchive пуст, если галочек нет).
    // Делаем ПОСЛЕ открытия печати: окно печати уже содержит снимок данных, поэтому
    // перезагрузка списка ему не мешает. Браузер не сообщает, реально ли напечатали,
    // поэтому проводим по факту формирования; ошибочно проведённую партию можно
    // вернуть в «Текущие» кнопкой в архиве.
    if (idsToArchive.length > 0) {
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
          <button
            className="btn btn--accent"
            onClick={printReport}
            title={tab === 'active' && selected.length > 0
              ? 'Печать выделенных партий и проведение их в архив'
              : 'Печать без проведения в архив'}
          >
            🖨 {tab === 'active' && selected.length > 0
              ? `Печать выделенных (${selected.length}) → в архив`
              : 'Печать отчёта'}
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
          ? '💡 Строки сгруппированы по ведомости перевозчика — кликни по ведомости, чтобы раскрыть партии внутри. Отметьте партии галочками (или ведомость целиком) и нажмите «Печать» — они напечатаются и уйдут в архив «Проведённые» (вернуть можно из архива). Без галочек печатается весь список по фильтру, и в архив НИЧЕГО не уходит.'
          : '💡 Архив проведённых партий, сгруппированный по ведомостям — кликни по ведомости, чтобы раскрыть партии. Можно отфильтровать по периоду и распечатать отчёт заново, либо вернуть партии в «Текущие».'}
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
                <tr><td colSpan={17} className="muted" style={{ padding: 16 }}>Нет данных за выбранный период</td></tr>
              ) : groups.map((g, gi) => {
                const open = expandedVedomost === g.key;
                return (
                  <React.Fragment key={g.key}>
                    {/* Шапка группы = ведомость перевозчика. Клик раскрывает партии внутри. */}
                    <tr
                      onClick={() => setExpandedVedomost(open ? null : g.key)}
                      style={{ cursor: "pointer", background: open ? "#eff6ff" : "", fontWeight: 600 }}
                    >
                      <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={groupSelected(g)} onChange={() => toggleGroup(g)} />
                      </td>
                      <td>{gi + 1}</td>
                      <td style={{ fontWeight: 700 }}>
                        {open ? "▾" : "▸"}{" "}
                        {g.number
                          ? <span style={{ color: "#1d4ed8" }}>🚚 {g.number}</span>
                          : <span style={{ color: "#d46b08" }}>⏳ Без ведомости</span>}
                        <span style={{ marginLeft: 6, fontSize: "0.7rem", color: "#475569", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                          {g.count} {g.count === 1 ? "партия" : "партий"}
                        </span>
                      </td>
                      <td>{formatDate(g.createdAt)}</td>
                      <td>{g.representative}</td>
                      <td>{g.carrier}</td>
                      <td style={{ textAlign: "center" }}>{g.loaders || '—'}</td>
                      <td style={{ textAlign: "center" }}>{g.seats || '—'}</td>
                      <td>{g.region}</td>
                      <td style={{ textAlign: "right" }}>{fmt(g.income)} тг</td>
                      <td style={{ textAlign: "right" }}>{fmt(g.expense)} тг</td>
                      <td style={{ textAlign: "right" }}>{fmt(g.carrierSum)} тг</td>
                      <td style={{ textAlign: "right" }}>{fmt(g.loaderSum)} тг</td>
                      <td style={{ textAlign: "right" }}>{fmt(g.representativeSum)} тг</td>
                      <td style={{ textAlign: "right" }}>{fmt(g.taxAmount)} тг</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(g.profit)} тг</td>
                      <td></td>
                    </tr>

                    {/* Партии внутри ведомости. Колонки те же, что у шапки, — поэтому
                        строки рендерятся в ту же таблицу (не вложенной), цифры выравнены
                        по колонкам отчёта. Отступ и серый фон — как в «Ведомостях перевозчика». */}
                    {open && g.rows.map((r, i) => (
                      <tr
                        key={r.id}
                        style={{ background: selected.includes(r.id) ? "rgba(24,144,255,0.06)" : "#f8fafc", fontSize: "0.92em" }}
                      >
                        <td style={{ textAlign: "center" }}>
                          <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                        </td>
                        <td style={{ color: "#94a3b8" }}>{gi + 1}.{i + 1}</td>
                        <td style={{ fontWeight: 700, paddingLeft: 26 }}>
                          <span style={{ color: "#cbd5e1", marginRight: 6 }}>{i === g.rows.length - 1 ? "└" : "├"}</span>
                          {r.name}
                        </td>
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
                        {/* ТЗ: в ОУР налог складывается из двух строк — НДС и КПН.
                            Показываем разбивку под суммой, чтобы бухгалтер видел,
                            откуда она взялась и учтён ли вычет по перевозке. */}
                        <td style={{ textAlign: "right" }}>
                          <div>{fmt(r.taxAmount)} тг</div>
                          {r.taxMode === 'our' && r.taxKpn > 0 && (
                            <div
                              className="muted"
                              style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}
                              title={
                                `Оборот: ${fmt(r.income)} тг\n` +
                                `− НДС: ${fmt(r.taxVat)} тг  →  ${fmt(r.taxAfterVat)} тг\n` +
                                `− перевозка: ${r.taxDeducted ? fmt(r.taxDeducted) + " тг (официальная)" : "0 (не отмечена как официальная)"}  →  ${fmt(r.taxKpnBase)} тг\n` +
                                `− КПН: ${fmt(r.taxKpn)} тг\n` +
                                `= итог: ${fmt(r.taxNet)} тг`
                              }
                            >
                              НДС {fmt(r.taxVat)} + КПН {fmt(r.taxKpn)}
                              {r.carrierOfficial && r.taxDeducted > 0 ? " ⁎" : ""}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(r.profit)} тг</td>
                        <td></td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}