

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { useAuth } from "../../shared/auth/AuthContext";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";
import { printCargoVedomost, printCarrierVedomost } from "../../shared/print/vedomostPrint.js";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("ru");
}

function getSortValue(b, field) {
  switch (field) {
    case 'number':       return (b.number || '').toString().toLowerCase();
    case 'date':         return new Date(b.createdAt || 0).getTime();
    case 'city':         return (b.city || '').toString().toLowerCase();
    case 'driverName':   return (b.driverName || '').toString().toLowerCase();
    case 'carNumber':    return (b.carNumber || '').toString().toLowerCase();
    case 'deliveryCost': return Number(b.deliveryCost) || 0;
    case 'totalSeats':   return Number(b.totalSeats) || 0;
    case 'totalWeight':  return Number(b.totalWeight) || 0;
    default:             return '';
  }
}

// Буква-префикс компании для номера партии (как у накладных)
function companyPrefix(company) {
  if (!company || !company.name) return "П";
  const n = company.name.toLowerCase();
  if (n.includes("алдияр")) return "АП";
  if (n.includes("tasu kz") && n.includes("ип")) return "IPTП";
  if (n.includes("tasu kazakhstan")) return "ТП";
  if (n.includes("tasu")) return "ТП";
  // По первой букве названия + П
  const first = (company.name.trim()[0] || "П").toUpperCase();
  return first + "П";
}

async function genNextBatchNumber(company) {
  const prefix = companyPrefix(company);
  try {
    let allBatches = [];
    try {
      allBatches = await api.batches.list();
    } catch (e1) {
      allBatches = await api.batches.list(company?.id);
    }
    // Счёт отдельный по каждому префиксу (по компании), с 1
    const pattern = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)$");
    let maxNum = 0;
    (allBatches || []).forEach(b => {
      const num = b.number;
      if (num) {
        const m = String(num).match(pattern);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum && n < 900000) maxNum = n; // отсекаем старый timestamp-мусор
        }
      }
    });
    return prefix + String(maxNum + 1).padStart(6, "0");
  } catch (e) {
    console.warn("Не удалось получить max номер партии, fallback:", e);
    return prefix + "000001";
  }
}

const EMPTY_FORM = {
  number: "", city: "", driverName: "", driverPhone: "",
  carNumber: "", deliveryCost: "",
  totalSeats: "", totalWeight: "",
  // Перевозчик / представитель / грузчики
  needCarrier: false, carrierId: "",
  needRepresentative: false, representativeId: "",
  needLoaders: false, loadersCount: "",
};

export default function BatchesPage() {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(getSelectedCompany());
  const [showForm, setShowForm] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Справочники
  const [carriers, setCarriers] = useState([]);
  const [representatives, setRepresentatives] = useState([]);

  // Ведомости перевозчика (для вкладки-группировки по номеру)
  const [carrierVedomosts, setCarrierVedomosts] = useState([]);
  const [expandedVedomost, setExpandedVedomost] = useState(null);

  const [tab, setTab] = useState('active');

  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // ТЗ: выбор партий галочками для формирования ведомости перевозчика
  const [selectedForVedomost, setSelectedForVedomost] = useState({});

  // Свободные накладные (не входящие в партии) + выбор для текущей партии
  const [freeRequests, setFreeRequests] = useState([]);
  const [selectedReqIds, setSelectedReqIds] = useState([]);

  const toggleVedomostSelect = (id) => {
    setSelectedForVedomost(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedVedomostCount = useMemo(
    () => Object.values(selectedForVedomost).filter(Boolean).length,
    [selectedForVedomost]
  );

  const goToCreateVedomost = () => {
    const ids = Object.keys(selectedForVedomost).filter(id => selectedForVedomost[id]);
    if (ids.length === 0) return;
    navigate(`/simple/carrier-vedomost/new?ids=${ids.join(',')}`);
  };

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

  const filteredBatches = useMemo(() => {
    const filtered = batches.filter(b => {
      if (tab === 'vedomost') return !!b.carrierVedomostId;
      if (tab === 'formed') return !!b.isFormed && !b.carrierVedomostId;
      return !b.isFormed; // active
    });
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [batches, sortBy, sortOrder, tab]);

  const tabCounts = useMemo(() => ({
    active: batches.filter(b => !b.isFormed).length,
    formed: batches.filter(b => !!b.isFormed && !b.carrierVedomostId).length,
    vedomost: carrierVedomosts.length,
  }), [batches, carrierVedomosts]);

  useEffect(() => {
    return subscribeSelectedCompany(c => setCompany(c));
  }, []);

  useEffect(() => {
    if (!company) { setBatches([]); setLoading(false); return; }
    load();
  }, [company]);

  // Загрузка справочников один раз
  useEffect(() => {
    (async () => {
      try {
        const [c, r] = await Promise.all([
          api.carriers.list(),
          api.representatives.list(),
        ]);
        setCarriers(Array.isArray(c) ? c : []);
        setRepresentatives(Array.isArray(r) ? r : []);
      } catch (e) {
        console.error("Не удалось загрузить справочники", e);
      }
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [list, cvs] = await Promise.all([
        api.batches.list(company?.id),
        api.carrierVedomosts.list(company?.id).catch(() => []),
      ]);
      if (Array.isArray(list)) setBatches(list);
      setCarrierVedomosts(Array.isArray(cvs) ? cvs : []);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const parseJson = (s) => { try { return typeof s === 'string' ? JSON.parse(s) : (s || {}); } catch { return {}; } };

  const vedomostSortValue = (v, field) => {
    switch (field) {
      case 'number': return String(v.number || '').toLowerCase();
      case 'date': return String(v.createdAt || '');
      case 'vedCount': {
        let cnt = 0;
        try { const ids = JSON.parse(v.batchIds || "[]"); if (Array.isArray(ids)) cnt = ids.length; } catch { /* ignore */ }
        return cnt;
      }
      case 'totalWeight': return Number(v.totalWeight) || 0;
      case 'carrierSum': return Number(v.carrierSum) || 0;
      default: return String(v.createdAt || '');
    }
  };
  const sortedVedomosts = useMemo(() => {
    const arr = [...carrierVedomosts];
    // По умолчанию — новые сверху; при клике по колонке — по выбранному полю.
    if (!sortBy) return arr.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return arr.sort((a, b) => {
      const av = vedomostSortValue(a, sortBy), bv = vedomostSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrierVedomosts, sortBy, sortOrder]);

  // Печать ведомости с её уровня — из сохранённого snapshot (единый эталон).
  const printCarrierVedomostRecord = (v) => {
    const snap = parseJson(v.data);
    printCarrierVedomost({
      companyName: snap.companyName || company?.name || "",
      vedomostNumber: v.number,
      rows: Array.isArray(snap.rows) ? snap.rows : [],
      totals: {
        totalWeight: v.totalWeight,
        carrierSum: v.carrierSum,
        representativeRate: snap.representativeRate,
        representativeSum: v.representativeSum,
      },
    });
  };

  // Загрузка свободных накладных: статус act, ещё не в какой-либо партии.
  // Возвращает нормализованные объекты { id, number, city, receiver, seats, weight }.
  const loadFreeRequests = async (currentBatchRequestIds = []) => {
    try {
      const [reqs, allBatches] = await Promise.all([
        api.requests.list(),
        api.batches.list(),
      ]);

      // Собираем id всех накладных, уже занятых партиями (кроме редактируемой)
      const busy = new Set();
      (allBatches || []).forEach(b => {
        if (editBatch && b.id === editBatch.id) return;
        let ids = [];
        try { ids = JSON.parse(b.requestIds || "[]"); } catch (e) { ids = []; }
        (ids || []).forEach(id => busy.add(id));
      });

      const free = (reqs || [])
        .filter(r => {
          const status = r.status || "";
          // Берём все накладные, КРОМЕ черновиков и отменённых.
          // Раньше фильтр был слишком узкий (только act/SIMPLE/пусто) —
          // из-за этого обработанные накладные пропадали → «нет накладных».
          const excluded = status === "draft" || status === "canceled";
          return !excluded && !busy.has(r.id);
        })
        .map(r => {
          let d = {};
          try { d = typeof r.details === "string" ? JSON.parse(r.details) : (r.details || {}); } catch (e) { d = {}; }
          const totals = d.totals || {};
          const receiver = d.receiver || {};
          const route = d.route || {};
          return {
            id: r.id,
            number: d.docNumber || r.docNumber || r.number || "—",
            city: route.toCity || "—",
            receiver: receiver.fio || receiver.companyName || "—",
            seats: Number(totals.seats) || 0,
            weight: Number(totals.weight) || 0,
          };
        });

      setFreeRequests(free);
      setSelectedReqIds(currentBatchRequestIds);
    } catch (e) {
      console.error("Не удалось загрузить свободные накладные", e);
      setFreeRequests([]);
    }
  };

  // 🆕 ТЗ: выбор убран — партия собирает ВСЕ свободные накладные выбранного города.
  const cityRequests = useMemo(() => {
    const cityClean = (form.city || "").trim().toLowerCase();
    if (!cityClean) return [];
    return freeRequests.filter(r => (r.city || "").trim().toLowerCase() === cityClean);
  }, [freeRequests, form.city]);

  // Автоподсчёт веса/мест из накладных города
  const selectedTotals = useMemo(() => {
    let seats = 0, weight = 0;
    cityRequests.forEach(r => { seats += r.seats; weight += r.weight; });
    return { seats, weight };
  }, [cityRequests]);

  const openCreate = async () => {
    setEditBatch(null);
    const nextNum = await genNextBatchNumber(company);
    setForm({ ...EMPTY_FORM, number: nextNum });
    setSelectedReqIds([]);
    await loadFreeRequests([]);
    setShowForm(true);
  };

  const openEdit = (batch) => {
    setEditBatch(batch);
    let existingIds = [];
    try { existingIds = JSON.parse(batch.requestIds || "[]"); } catch (e) { existingIds = []; }
    loadFreeRequests(existingIds);
    setForm({
      number: batch.number,
      city: batch.city,
      driverName: batch.driverName,
      driverPhone: batch.driverPhone,
      carNumber: batch.carNumber,
      deliveryCost: batch.deliveryCost,
      totalSeats: batch.totalSeats || "",
      totalWeight: batch.totalWeight || "",
      needCarrier: !!batch.carrierId,
      carrierId: batch.carrierId || "",
      needRepresentative: !!batch.representativeId,
      representativeId: batch.representativeId || "",
      needLoaders: (batch.loadersCount || 0) > 0,
      loadersCount: batch.loadersCount || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.number || !form.city) return alert("Укажите номер и город");
    try {
      // 🆕 При создании — фиксируем все накладные города; при редактировании оставляем прежние
      const ids = editBatch
        ? (() => { try { return JSON.parse(editBatch.requestIds || "[]"); } catch (e) { return []; } })()
        : cityRequests.map(r => r.id);

      const payload = {
        ...form,
        totalSeats: selectedTotals.seats,
        totalWeight: selectedTotals.weight,
        requestIds: JSON.stringify(ids),
        carrierId: form.needCarrier ? (form.carrierId || null) : null,
        representativeId: form.needRepresentative ? (form.representativeId || null) : null,
        loadersCount: form.needLoaders ? (parseInt(form.loadersCount) || 0) : 0,
      };
      delete payload.needCarrier;
      delete payload.needRepresentative;
      delete payload.needLoaders;

      if (editBatch) {
        await api.batches.update(editBatch.id, payload);
      } else {
        await api.batches.create({ ...payload, companyId: company?.id });
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

  const handleForm = async (batch) => {
    if (!window.confirm(
      `Сформировать партию №${batch.number}?\n\n` +
      `После формирования партия перейдёт в раздел "Сформированные" и будет сохранена ведомость.`
    )) return;
    try {
      let requestIds = [];
      try { requestIds = JSON.parse(batch.requestIds); } catch(e) {}

      const vedomostData = JSON.stringify({
        formedAt: new Date().toISOString(),
        number: batch.number,
        city: batch.city,
        driverName: batch.driverName,
        driverPhone: batch.driverPhone,
        carNumber: batch.carNumber,
        deliveryCost: batch.deliveryCost,
        totalSeats: batch.totalSeats || 0,
        totalWeight: batch.totalWeight || 0,
        requestsCount: requestIds.length,
        company: company?.name || '',
      });

      await api.batches.update(batch.id, {
        isFormed: true,
        status: "formed",
        formedAt: new Date().toISOString(),
        vedomostData,
      });
      load();
    } catch(e) {
      alert("Ошибка при формировании: " + e.message);
    }
  };

  const handleUnform = async (batch) => {
    if (!window.confirm(`Вернуть партию №${batch.number} в активные?`)) return;
    try {
      await api.batches.update(batch.id, {
        isFormed: false,
        formedAt: null,
      });
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const printVedomost = async (batch) => {
    let requestIds = [];
    try { requestIds = JSON.parse(batch.requestIds || "[]"); } catch { /* ignore */ }

    let reqs = [];
    if (requestIds.length > 0) {
      reqs = await Promise.all(requestIds.map(rid => api.requests.get(rid).catch(() => null)));
      reqs = reqs.filter(Boolean);
    }

    const rows = reqs.map((r) => {
      let d = {};
      try { d = JSON.parse(r.details || "{}"); } catch { /* ignore */ }
      const recv = d.receiver || {};
      const route = d.route || {};
      const totals = d.totals || {};
      return {
        docNumber: r.docNumber || d.docNumber || r.id || "—",
        receiver: recv.fio || recv.companyName || "—",
        phone: recv.phone || "—",
        seats: totals.seats || "",
        weight: totals.weight || "",
        city: route.toCity || batch.city || "—",
        sum: Number(d.totalSum ?? r.totalSum) || null,
      };
    });

    await printCargoVedomost({
      companyName: company?.name || "",
      batchNumber: batch.number,
      city: batch.city,
      rows,
    });
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

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className={`btn ${tab === 'active' ? 'btn--accent' : ''}`}
          onClick={() => setTab('active')}
        >
          🟢 Активные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.active})</span>
        </button>
        <button
          className={`btn ${tab === 'formed' ? 'btn--accent' : ''}`}
          onClick={() => setTab('formed')}
        >
          ✅ Сформированные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.formed})</span>
        </button>
        <button
          className={`btn ${tab === 'vedomost' ? 'btn--accent' : ''}`}
          onClick={() => setTab('vedomost')}
        >
          🚚 Ведомости перевозчика <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.vedomost})</span>
        </button>
      </div>

      {!isManager && tab === 'formed' && selectedVedomostCount > 0 && (
        <div style={{
          marginTop: 12, padding: '12px 16px', background: '#eef2ff', border: '1px solid #c7d2fe',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
        }}>
          <div style={{ fontWeight: 700 }}>Выбрано партий: {selectedVedomostCount}</div>
          <button className="btn btn--accent" onClick={goToCreateVedomost}>
            📦 Сформировать ведомость перевозчика
          </button>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, width: 520, maxWidth: "95vw", maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: "0 0 16px" }}>{editBatch ? "Редактировать партию" : "Новая партия"}</h2>
            <div className="form_grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <div className="label">Номер партии *</div>
                <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="П000001" />
              </div>
              <div className="field">
                <div className="label">Город назначения *</div>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Астана" />
              </div>
              <div className="field">
                <div className="label">ФИО водителя</div>
                <input value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} placeholder="Иванов Иван" />
              </div>
              <div className="field">
                <div className="label">Телефон водителя</div>
                <input value={form.driverPhone} onChange={e => setForm({ ...form, driverPhone: e.target.value })} placeholder="+7 777 123 45 67" />
              </div>
              <div className="field">
                <div className="label">Номер авто</div>
                <input value={form.carNumber} onChange={e => setForm({ ...form, carNumber: e.target.value })} placeholder="777 ABC 01" />
              </div>
              <div className="field">
                <div className="label">Стоимость перевозки (тг)</div>
                <input type="number" value={form.deliveryCost} onChange={e => setForm({ ...form, deliveryCost: e.target.value })} placeholder="0" />
              </div>
              <div className="field">
                <div className="label">Количество мест <span style={{ color: '#94a3b8', fontWeight: 400 }}>(из накладных города)</span></div>
                <input type="number" value={selectedTotals.seats} readOnly style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>
              <div className="field">
                <div className="label">Общий вес, кг <span style={{ color: '#94a3b8', fontWeight: 400 }}>(из накладных города)</span></div>
                <input type="number" value={selectedTotals.weight} readOnly style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>
            </div>

            {/* 🆕 ТЗ: выбор накладных убран — партия автоматически собирает все свободные накладные города */}
            <div style={{ marginTop: 16, padding: 14, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
              {!form.city ? (
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Укажите город назначения — партия автоматически соберёт все свободные накладные этого города.
                </div>
              ) : cityRequests.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#dc2626' }}>
                  Нет свободных накладных на «{form.city}». Создайте накладную на этот город — она войдёт в партию.
                </div>
              ) : (
                <div style={{ fontSize: '0.9rem', color: '#0369a1' }}>
                  В партию войдёт <strong>{cityRequests.length}</strong> накладных города «{form.city}»
                  &nbsp;·&nbsp; {selectedTotals.weight} кг &nbsp;·&nbsp; {selectedTotals.seats} мест.
                </div>
              )}
            </div>

            {/* Перевозчик / представитель / грузчики */}
            <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Доп. участники партии</div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.needCarrier} onChange={e => setForm({ ...form, needCarrier: e.target.checked })} />
                  🚚 Нужен перевозчик
                </label>
                {form.needCarrier && (
                  <select
                    value={form.carrierId}
                    onChange={e => setForm({ ...form, carrierId: e.target.value })}
                    style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    <option value="">— выберите перевозчика —</option>
                    {carriers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.city ? ` (${c.city})` : ''}{c.phone ? ` · ${c.phone}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.needRepresentative} onChange={e => setForm({ ...form, needRepresentative: e.target.checked })} />
                  🧑‍💼 Нужен представитель
                </label>
                {form.needRepresentative && (
                  <select
                    value={form.representativeId}
                    onChange={e => setForm({ ...form, representativeId: e.target.value })}
                    style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    <option value="">— выберите представителя —</option>
                    {representatives.map(r => (
                      <option key={r.id} value={r.id}>{r.name}{r.city ? ` (${r.city})` : ''}{r.phone ? ` · ${r.phone}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.needLoaders} onChange={e => setForm({ ...form, needLoaders: e.target.checked })} />
                  💪 Нужны грузчики
                </label>
                {form.needLoaders && (
                  <input
                    type="number"
                    min="0"
                    value={form.loadersCount}
                    onChange={e => setForm({ ...form, loadersCount: e.target.value })}
                    placeholder="Количество грузчиков"
                    style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn--accent" onClick={handleSave}>Сохранить</button>
              <button className="btn" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, fontSize: '0.85rem', color: '#854d0e' }}>
        {tab === 'vedomost'
          ? '💡 Кликни по ведомости, чтобы раскрыть список партий внутри неё. Печать — с уровня ведомости.'
          : '💡 Кликни по строке партии, чтобы открыть её детали и список накладных'}
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : tab === 'vedomost' ? (
          <table className="table_fixed">
            <thead>
              <tr>
                <SortableTh field="number" style={{ width: 150 }}>№ ведомости</SortableTh>
                <SortableTh field="date" style={{ width: 110 }}>Дата</SortableTh>
                <SortableTh field="vedCount" style={{ width: 90, textAlign: 'center' }}>Партий</SortableTh>
                <SortableTh field="totalWeight" style={{ width: 120, textAlign: 'center' }}>Общий вес</SortableTh>
                <SortableTh field="carrierSum" style={{ width: 170, textAlign: 'right' }}>Сумма перевозчику</SortableTh>
                <th style={{ width: 140 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedVedomosts.length === 0 ? (
                <tr><td colSpan={6} className="muted" style={{ padding: 16 }}>
                  {!company ? "Выберите компанию." : "Нет ведомостей перевозчика"}
                </td></tr>
              ) : (
                sortedVedomosts.map(v => {
                  const snap = parseJson(v.data);
                  const rows = Array.isArray(snap.rows) ? snap.rows : [];
                  let cnt = rows.length;
                  try { const ids = JSON.parse(v.batchIds || "[]"); if (Array.isArray(ids) && ids.length) cnt = ids.length; } catch { /* ignore */ }
                  const open = expandedVedomost === v.id;
                  return (
                    <React.Fragment key={v.id}>
                      <tr
                        onClick={() => setExpandedVedomost(open ? null : v.id)}
                        style={{ cursor: 'pointer', background: open ? '#eff6ff' : '' }}
                      >
                        <td style={{ fontWeight: 700 }}>{open ? '▾' : '▸'} {v.number}</td>
                        <td>{formatDate(v.createdAt)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{cnt}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{Number(v.totalWeight || 0).toLocaleString()} кг</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(v.carrierSum || 0).toLocaleString()} тг</td>
                        <td className="actions-cell" onClick={e => e.stopPropagation()}>
                          <button className="btn btn--sm" onClick={() => printCarrierVedomostRecord(v)} title="Печать ведомости перевозчика" style={{ fontSize: 11 }}>
                            🖨 Печать
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={6} style={{ background: '#f8fafc', padding: 8 }}>
                            <table className="table" style={{ margin: 0, width: '100%', fontSize: '0.85rem' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: 30 }}>№</th>
                                  <th>Партия</th>
                                  <th>Город</th>
                                  <th style={{ textAlign: 'center' }}>Вес</th>
                                  <th>Перевозчик</th>
                                  <th style={{ textAlign: 'right' }}>Сумма перевозчику</th>
                                  <th>Представитель</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.length === 0 ? (
                                  <tr><td colSpan={7} className="muted" style={{ padding: 10 }}>Нет данных по партиям</td></tr>
                                ) : rows.map((r, i) => (
                                  <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td style={{ fontWeight: 600 }}>{r.number}</td>
                                    <td>{r.city}</td>
                                    <td style={{ textAlign: 'center' }}>{Number(r.weight || 0).toLocaleString()} кг</td>
                                    <td>{r.carrierId ? (carriers.find(c => c.id === r.carrierId)?.name || r.carrierName || "—") : (r.carrierName || "—")}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(r.carrierSum || 0).toLocaleString()} тг</td>
                                    <td>{r.representativeId ? (representatives.find(x => x.id === r.representativeId)?.name || r.representativeName || "—") : (r.representativeName || "—")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="table_fixed">
            <thead>
              <tr>
                {!isManager && tab === 'formed' && <th style={{ width: 36 }}></th>}
                <SortableTh field="number" style={{ width: 120 }}>Номер</SortableTh>
                <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
                <SortableTh field="city">Город</SortableTh>
                <SortableTh field="driverName">Водитель</SortableTh>
                <SortableTh field="carNumber">Авто</SortableTh>
                <SortableTh field="totalSeats" style={{ width: 80, textAlign: 'center' }}>Мест</SortableTh>
                <SortableTh field="totalWeight" style={{ width: 100, textAlign: 'center' }}>Вес</SortableTh>
                <SortableTh field="deliveryCost" style={{ width: 130 }}>Стоимость</SortableTh>
                <th style={{ width: 280 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length === 0 ? (
                <tr><td colSpan={(!isManager && tab === 'formed') ? 10 : 9} className="muted" style={{ padding: 16 }}>
                  {!company ? "Выберите компанию." :
                    tab === 'active' ? 'Нет активных партий' : 'Нет сформированных партий'}
                </td></tr>
              ) : (
                filteredBatches.map(b => (
                  <tr
                    key={b.id}
                    onClick={(e) => {
                      if (e.target.closest('button') || e.target.closest('.actions-cell') || e.target.closest('.checkbox-cell')) return;
                      navigate(`/simple/batches/${b.id}`);
                    }}
                    style={{
                      borderLeft: b.isFormed ? '4px solid #22c55e' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    {!isManager && tab === 'formed' && (
                      <td className="checkbox-cell" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={!!selectedForVedomost[b.id]}
                          onChange={() => toggleVedomostSelect(b.id)}
                        />
                      </td>
                    )}
                    <td style={{ fontWeight: 700 }}>
                      {b.number}
                      {b.isFormed && (
                        <div style={{
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          background: '#d1fae5',
                          color: '#065f46',
                          borderRadius: 3,
                          fontWeight: 700,
                          marginTop: 2,
                          display: 'inline-block',
                        }}>
                          ✓ {formatDate(b.formedAt)}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>{b.city}</td>
                    <td>
                      <div>{b.driverName || "—"}</div>
                      {b.driverPhone && <div className="muted" style={{ fontSize: "0.8rem" }}>{b.driverPhone}</div>}
                    </td>
                    <td>{b.carNumber || "—"}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.totalSeats || "—"}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.totalWeight ? `${Number(b.totalWeight).toLocaleString()} кг` : "—"}</td>
                    <td>{b.deliveryCost ? `${Number(b.deliveryCost).toLocaleString()} тг` : "—"}</td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn--sm"
                          onClick={() => navigate(`/simple/batches/${b.id}`)}
                          title="Открыть детали партии"
                          style={{ background: '#2563eb', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
                        >
                          👁 Открыть
                        </button>
                        <button
                          className="btn btn--sm"
                          onClick={() => tab === 'vedomost' ? navigate(`/simple/batches/${b.id}`) : printVedomost(b)}
                          title={tab === 'vedomost' ? "Открыть партию для печати ведомости перевозчика" : "Распечатать грузовую ведомость"}
                          style={{ fontSize: 11 }}
                        >
                          🖨 {tab === 'vedomost' ? 'Ведомость перевозчика' : 'Печать'}
                        </button>
                        {b.isFormed ? (
                          <button
                            className="btn btn--sm"
                            onClick={() => handleUnform(b)}
                            title="Вернуть в активные"
                            style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', fontSize: 11 }}
                          >
                            ↩ В активные
                          </button>
                        ) : (
                          <button
                            className="btn btn--sm"
                            onClick={() => handleForm(b)}
                            title="Сформировать партию"
                            style={{ background: '#22c55e', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
                          >
                            ✓ Сформировать
                          </button>
                        )}
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