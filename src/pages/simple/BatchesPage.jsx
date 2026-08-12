

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { formatDocNumber } from "../../shared/acts/docNumber.js";
import { useAuth } from "../../shared/auth/AuthContext";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";
import { printCargoVedomost, printCarrierVedomost } from "../../shared/print/vedomostPrint.js";
import { buildActiveTotalsMap } from "../../shared/batch/batchTotals.js";
import CityFilteredSelect from "../../shared/directory/CityFilteredSelect.jsx";
import { filterByCity } from "../../shared/directory/byCity.js";
import { MoneyTd, MoneyBlock, useCanSeeMoney, useMoneyColSpan } from "../../shared/money/Money.jsx";

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
  needCarrier: false, carrierId: "", carrierOfficial: false,
  needRepresentative: false, representativeId: "",
  needLoaders: false, loadersCount: "",
};

export default function BatchesPage() {
  const navigate = useNavigate();
  // ТЗ: у ограниченного менеджера нет ведомостей и сумм выплат.
  // isManager оставлен как был — права обычного менеджера не меняются.
  const { isManager, isManager2 } = useAuth();
  // Кому не положены ведомость перевозчика и суммы выплат.
  const noVedomost = isManager || isManager2;
  // ТЗ: деньги (стоимость перевозки, суммы выплат) — не для ограниченного менеджера.
  const canSeeMoney = useCanSeeMoney();
  const moneyColSpan = useMoneyColSpan();
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
  // Правка строки ведомости: { vedomostId, batchId } + черновик значений строки.
  const [editingRow, setEditingRow] = useState(null);
  const [rowDraft, setRowDraft] = useState(null);
  const [rowSaving, setRowSaving] = useState(false);

  const [tab, setTab] = useState('active');

  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // ТЗ: выбор партий галочками для формирования ведомости перевозчика
  const [selectedForVedomost, setSelectedForVedomost] = useState({});

  // Свободные накладные (не входящие в партии) + выбор для текущей партии
  const [freeRequests, setFreeRequests] = useState([]);
  const [selectedReqIds, setSelectedReqIds] = useState([]);

  // Итоги накладных (места/вес) по id — для подсчёта колонок в списке налету.
  // Так и старые партии без сохранённых totalSeats/totalWeight покажут цифры.
  const [reqTotals, setReqTotals] = useState({});

  // Автоподстановка по городу в форме партии: срабатывает ТОЛЬКО когда за городом
  // закреплён ровно один человек И поле ещё пустое. Уже выбранного (в том числе
  // при редактировании партии) не перебиваем — приоритет у осознанного выбора.
  useEffect(() => {
    if (!showForm || !form.city) return;
    setForm(f => {
      const next = { ...f };
      let changed = false;
      if (f.needCarrier && !f.carrierId) {
        const auto = filterByCity(carriers, f.city).autoPick;
        if (auto) { next.carrierId = auto.id; changed = true; }
      }
      if (f.needRepresentative && !f.representativeId) {
        const auto = filterByCity(representatives, f.city).autoPick;
        if (auto) { next.representativeId = auto.id; changed = true; }
      }
      return changed ? next : f;
    });
  }, [showForm, form.city, form.needCarrier, form.needRepresentative, carriers, representatives]);

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

  // Итоги (места/вес) по партии — сумма по накладным из requestIds.
  // Fallback на сохранённые totalSeats/totalWeight, если накладные не подтянулись.
  const batchTotals = (b) => {
    let ids = [];
    try { ids = JSON.parse(b.requestIds || "[]"); } catch (e) { ids = []; }
    let seats = 0, weight = 0;
    ids.forEach(id => {
      const t = reqTotals[id];
      if (t) { seats += t.seats; weight += t.weight; }
    });
    if (!seats) seats = Number(b.totalSeats) || 0;
    if (!weight) weight = Number(b.totalWeight) || 0;
    return { seats, weight };
  };

  const filteredBatches = useMemo(() => {
    const filtered = batches.filter(b => {
      if (tab === 'vedomost') return !!b.carrierVedomostId;
      if (tab === 'formed') return !!b.isFormed && !b.carrierVedomostId;
      return !b.isFormed; // active
    });
    const sortVal = (b) => {
      if (sortBy === 'totalSeats') return batchTotals(b).seats;
      if (sortBy === 'totalWeight') return batchTotals(b).weight;
      return getSortValue(b, sortBy);
    };
    return [...filtered].sort((a, b) => {
      const av = sortVal(a);
      const bv = sortVal(b);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, sortBy, sortOrder, tab, reqTotals]);

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
      const [list, cvs, reqs] = await Promise.all([
        api.batches.list(company?.id),
        // Ограниченному менеджеру сервер ведомости не отдаёт (403) — не ходим
        // за ними вовсе, чтобы не сыпать ошибками в консоль на каждой загрузке.
        isManager2 ? Promise.resolve([]) : api.carrierVedomosts.list(company?.id).catch(() => []),
        api.requests.list().catch(() => []),
      ]);
      if (Array.isArray(list)) setBatches(list);
      setCarrierVedomosts(Array.isArray(cvs) ? cvs : []);

      // Карта итогов по накладным: id -> { seats, weight }, БЕЗ аннулированных
      // (общий хелпер, покрыт тестами в shared/batch/batchTotals.test.mjs).
      setReqTotals(buildActiveTotalsMap(Array.isArray(reqs) ? reqs : []));
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

  // ТЗ: удаление ведомости перевозчика ЦЕЛИКОМ — мягкое, как удаление строки.
  // Ведомость уходит из списка, партии освобождаются и возвращаются в
  // «Сформированные», но запись в базе остаётся и номер закреплён за ней навсегда.
  // Сервер блокирует удаление, если партии уже проведены в архив бухгалтерии.
  const handleDeleteVedomost = async (v) => {
    if (!window.confirm(
      `Удалить ведомость перевозчика №${v.number}?\n\n` +
      `Партии освободятся и вернутся в раздел «Сформированные» — их можно будет собрать в новую ведомость.\n` +
      `Номер ${v.number} останется закреплён за этой ведомостью навсегда и другой ведомости не достанется.\n\n` +
      `Ведомость исчезнет из списка, но из базы не стирается.`
    )) return;
    try {
      await api.carrierVedomosts.delete(v.id);
      load();
    } catch (e) {
      alert("Не удалось удалить ведомость: " + (e.message || e));
    }
  };

  // ── Правка и удаление СТРОКИ ведомости перевозчика ──────────────────
  // Строка = партия внутри снапшота data.rows. Пересчитываем снапшот и итоги
  // на клиенте и отправляем целиком (PUT /carrier-vedomosts/:id); сервер сверяет
  // состав партий, освобождает убранные и держит защиты (архив, последняя строка).
  const vedomostRows = (v) => {
    const snap = parseJson(v.data);
    return Array.isArray(snap.rows) ? snap.rows : [];
  };

  const recalcVedomostTotals = (rows) => ({
    totalSeats: rows.reduce((a, r) => a + (Number(r.seats) || 0), 0),
    totalWeight: rows.reduce((a, r) => a + (Number(r.weight) || 0), 0),
    carrierSum: rows.reduce((a, r) => a + (Number(r.carrierSum) || 0), 0),
    loaderSum: rows.reduce((a, r) => a + (Number(r.loaderSum) || 0), 0),
    representativeSum: rows.reduce((a, r) => a + (Number(r.representativeSum) || 0), 0),
  });

  // Сохранить ведомость с новым набором строк. batchIds пересобираем из строк,
  // чтобы состав ведомости и снапшот не разъезжались.
  const saveVedomostRows = async (v, rows) => {
    const snap = parseJson(v.data) || {};
    const totals = recalcVedomostTotals(rows);
    const nextSnap = { ...snap, rows, ...totals };
    const batchIds = rows.map(r => r.batchId).filter(Boolean);
    await api.carrierVedomosts.update(v.id, {
      data: nextSnap,
      batchIds,
      totalWeight: totals.totalWeight,
      carrierSum: totals.carrierSum,
      loaderSum: totals.loaderSum,
      representativeSum: totals.representativeSum,
    });
    await load();
  };

  const startEditRow = (v, row) => {
    setEditingRow({ vedomostId: v.id, batchId: row.batchId });
    setRowDraft({
      carrierId: row.carrierId || "",
      representativeId: row.representativeId || "",
      carrierRate: row.carrierRate ?? "",
      carrierSum: row.carrierSum ?? "",
      representativeSum: row.representativeSum ?? "",
    });
  };

  const cancelEditRow = () => { setEditingRow(null); setRowDraft(null); };

  // Тариф правим → сумма пересчитывается (вес × тариф), но остаётся правимой руками.
  const onRowRateChange = (val, weight) => {
    setRowDraft(prev => ({
      ...prev,
      carrierRate: val,
      carrierSum: Math.round((Number(weight) || 0) * (Number(val) || 0)),
    }));
  };

  const saveEditRow = async (v, row) => {
    setRowSaving(true);
    try {
      const rows = vedomostRows(v).map(r => {
        if (String(r.batchId) !== String(row.batchId)) return r;
        return {
          ...r,
          carrierId: rowDraft.carrierId || "",
          carrierName: rowDraft.carrierId
            ? (carriers.find(c => c.id === rowDraft.carrierId)?.name || r.carrierName || "—")
            : "—",
          representativeId: rowDraft.representativeId || "",
          representativeName: rowDraft.representativeId
            ? (representatives.find(x => x.id === rowDraft.representativeId)?.name || r.representativeName || "—")
            : "—",
          // Телефон фиксируем в снапшоте вместе с именем — печать не должна
          // зависеть от последующих правок справочника.
          representativePhone: rowDraft.representativeId
            ? String(representatives.find(x => x.id === rowDraft.representativeId)?.phone || "").trim()
            : "",
          carrierRate: Number(rowDraft.carrierRate) || 0,
          carrierSum: Number(rowDraft.carrierSum) || 0,
          representativeSum: Number(rowDraft.representativeSum) || 0,
        };
      });
      await saveVedomostRows(v, rows);
      cancelEditRow();
    } catch (e) {
      alert("Ошибка при сохранении строки: " + (e.message || e));
    } finally {
      setRowSaving(false);
    }
  };

  // «Удаление» строки = партия выходит из ведомости и возвращается в «Сформированные».
  // Номер ведомости остаётся закреплён за ней навсегда, запись не стирается.
  const deleteVedomostRow = async (v, row) => {
    const rows = vedomostRows(v);
    if (rows.length <= 1) {
      alert(
        `В ведомости ${v.number} это единственная строка — убрать её нельзя.\n\n` +
        `Если ведомость не нужна, аннулируйте её целиком: номер сохранится, ` +
        `а партии вернутся в «Сформированные».`
      );
      return;
    }
    if (!window.confirm(
      `Убрать партию ${row.number} из ведомости ${v.number}?\n\n` +
      `Партия освободится и вернётся в раздел «Сформированные» — её можно будет ` +
      `включить в другую ведомость. Итоги ведомости пересчитаются, номер ${v.number} останется прежним.`
    )) return;
    try {
      await saveVedomostRows(v, rows.filter(r => String(r.batchId) !== String(row.batchId)));
    } catch (e) {
      alert("Ошибка при удалении строки: " + (e.message || e));
    }
  };

  // Телефон представителя строки: приоритет — живой справочник (актуальнее),
  // иначе сохранённый в снапшоте. У старых ведомостей телефона в снапшоте нет,
  // поэтому подтягиваем по representativeId. Нет нигде → пустая строка (в печати «—»).
  const rowRepPhone = (r) => {
    const fromDir = r.representativeId
      ? representatives.find(x => x.id === r.representativeId)?.phone
      : "";
    return String(fromDir || r.representativePhone || "").trim();
  };

  // Печать ведомости с её уровня — из сохранённого snapshot (единый эталон).
  const printCarrierVedomostRecord = (v) => {
    const snap = parseJson(v.data);
    const snapRows = Array.isArray(snap.rows) ? snap.rows : [];
    printCarrierVedomost({
      companyName: snap.companyName || company?.name || "",
      vedomostNumber: v.number,
      rows: snapRows.map(r => ({ ...r, representativePhone: rowRepPhone(r) })),
      totals: {
        totalSeats: snap.totalSeats,
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
            number: formatDocNumber(d.docNumber || r.docNumber || r.number) || "—",
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

  // Автоподсчёт веса/мест из накладных города (для создания)
  const selectedTotals = useMemo(() => {
    let seats = 0, weight = 0;
    cityRequests.forEach(r => { seats += r.seats; weight += r.weight; });
    return { seats, weight };
  }, [cityRequests]);

  // ── Редактирование состава партии (ТЗ п.5) ──
  // Чеклист = свободные накладные + свои (loadFreeRequests их включает), того же города партии.
  const editInvoices = useMemo(() => {
    const cityClean = (form.city || "").trim().toLowerCase();
    if (!cityClean) return freeRequests;
    return freeRequests.filter(r => (r.city || "").trim().toLowerCase() === cityClean);
  }, [freeRequests, form.city]);

  const toggleReqInBatch = (id) => {
    setSelectedReqIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Итоги по ОТМЕЧЕННЫМ накладным (режим редактирования)
  const editSelectedTotals = useMemo(() => {
    let seats = 0, weight = 0;
    freeRequests.forEach(r => { if (selectedReqIds.includes(r.id)) { seats += r.seats; weight += r.weight; } });
    return { seats, weight };
  }, [freeRequests, selectedReqIds]);

  // Итоги, отображаемые в форме: редактирование → по отмеченным, создание → по городу.
  const formTotals = editBatch ? editSelectedTotals : selectedTotals;

  const openCreate = async () => {
    setEditBatch(null);
    const nextNum = await genNextBatchNumber(company);
    setForm({ ...EMPTY_FORM, number: nextNum });
    setSelectedReqIds([]);
    await loadFreeRequests([]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      carrierOfficial: !!batch.carrierOfficial,
      needRepresentative: !!batch.representativeId,
      representativeId: batch.representativeId || "",
      needLoaders: (batch.loadersCount || 0) > 0,
      loadersCount: batch.loadersCount || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!form.number || !form.city) return alert("Укажите номер и город");
    try {
      // Создание — все свободные накладные города; редактирование — ТОЛЬКО отмеченные
      // галочками (selectedReqIds), состав меняется прямо в форме (ТЗ п.5).
      const ids = editBatch ? selectedReqIds : cityRequests.map(r => r.id);
      const totals = editBatch ? editSelectedTotals : selectedTotals;

      const payload = {
        ...form,
        totalSeats: totals.seats,
        totalWeight: totals.weight,
        requestIds: JSON.stringify(ids),
        carrierId: form.needCarrier ? (form.carrierId || null) : null,
        // Без перевозчика признак официальности смысла не имеет — гасим.
        carrierOfficial: form.needCarrier ? !!form.carrierOfficial : false,
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
      // Аннулированные накладные в грузовую ведомость не попадают.
      reqs = reqs.filter(r => r && r.status !== 'canceled');
    }

    const rows = reqs.map((r) => {
      let d = {};
      try { d = JSON.parse(r.details || "{}"); } catch { /* ignore */ }
      const recv = d.receiver || {};
      const route = d.route || {};
      const totals = d.totals || {};
      return {
        docNumber: formatDocNumber(r.docNumber || d.docNumber) || r.id || "—",
        receiver: recv.fio || recv.companyName || "—",
        phone: recv.phone || "—",
        seats: totals.seats || "",
        weight: totals.weight || "",
        city: route.toCity || batch.city || "—",
        sum: Number(d.totalSum ?? r.totalSum) || null,
      };
    });

    // ТЗ: контакт нашего представителя в грузовой ведомости — из назначенного в партии
    const rep = representatives.find(r => r.id === batch.representativeId);

    await printCargoVedomost({
      companyName: company?.name || "",
      batchNumber: batch.number,
      city: batch.city,
      rows,
      representativeName: rep?.name || "",
      representativePhone: rep?.phone || "",
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
        {/* ТЗ: у ограниченного менеджера партия создаётся только из «Мои заявки» */}
        {!isManager2 && (
          <button className="btn btn--accent" onClick={openCreate}>+ Новая партия</button>
        )}
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
        {/* ТЗ: ведомости перевозчика ограниченному менеджеру не показываем.
            Сервер их ему всё равно не отдаёт — вкладка была бы пустой. */}
        {!isManager2 && (
          <button
            className={`btn ${tab === 'vedomost' ? 'btn--accent' : ''}`}
            onClick={() => setTab('vedomost')}
          >
            🚚 Ведомости перевозчика <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.vedomost})</span>
          </button>
        )}
      </div>

      {!noVedomost && tab === 'formed' && selectedVedomostCount > 0 && (
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
        <div className="card" style={{ marginTop: 16, background: "var(--card)", borderRadius: 12, padding: 24 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: "0 0 16px" }}>
              <h2 style={{ margin: 0 }}>{editBatch ? `Редактировать партию № ${form.number}` : "Новая партия"}</h2>
              <button className="btn" onClick={() => setShowForm(false)}>✕ Закрыть</button>
            </div>
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
              {/* ТЗ: стоимость перевозки — деньги, ограниченному менеджеру поле не показываем.
                  Значение при этом сохраняется как есть: форма шлёт form.deliveryCost. */}
              <MoneyBlock>
                <div className="field">
                  <div className="label">Стоимость перевозки (тг)</div>
                  <input type="number" value={form.deliveryCost} onChange={e => setForm({ ...form, deliveryCost: e.target.value })} placeholder="0" />
                </div>
              </MoneyBlock>
              <div className="field">
                <div className="label">Количество мест <span style={{ color: '#94a3b8', fontWeight: 400 }}>({editBatch ? 'из отмеченных' : 'из накладных города'})</span></div>
                <input type="number" value={formTotals.seats} readOnly style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>
              <div className="field">
                <div className="label">Общий вес, кг <span style={{ color: '#94a3b8', fontWeight: 400 }}>({editBatch ? 'из отмеченных' : 'из накладных города'})</span></div>
                <input type="number" value={formTotals.weight} readOnly style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
              </div>
            </div>

            {editBatch ? (
              /* ТЗ п.5: редактирование состава — накладные с галочками (в партии / свободные того же города) */
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                  Накладные партии <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>— снимите галочку, чтобы убрать; поставьте, чтобы добавить свободную того же города</span>
                </div>
                {editInvoices.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#dc2626', padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                    Нет накладных города «{form.city}».
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 260, overflowY: 'auto' }}>
                    {editInvoices.map(r => {
                      const checked = selectedReqIds.includes(r.id);
                      return (
                        <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: checked ? '#f0fdf4' : '' }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleReqInBatch(r.id)} />
                          <span style={{ fontWeight: 600, minWidth: 90 }}>{r.number}</span>
                          <span style={{ flex: 1, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.receiver}</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>{r.seats} мест · {r.weight} кг</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: '0.9rem', color: '#0369a1' }}>
                  Отмечено: <strong>{selectedReqIds.length}</strong> накладных &nbsp;·&nbsp; {editSelectedTotals.weight} кг &nbsp;·&nbsp; {editSelectedTotals.seats} мест.
                </div>
              </div>
            ) : (
              /* Создание — партия автоматически собирает все свободные накладные города */
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
            )}

            {/* Перевозчик / представитель / грузчики */}
            <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Доп. участники партии</div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.needCarrier} onChange={e => setForm({ ...form, needCarrier: e.target.checked })} />
                  🚚 Нужен перевозчик
                </label>
                {form.needCarrier && (
                  <>
                    <CityFilteredSelect
                      items={carriers}
                      city={form.city}
                      value={form.carrierId}
                      onChange={val => setForm(f => ({ ...f, carrierId: val }))}
                      kindPlural="перевозчики"
                      kindSingle="перевозчик"
                      placeholder="— выберите перевозчика —"
                      style={{ marginTop: 8 }}
                    />
                    {/* ТЗ: перевозку покупают и официально, и за наличные.
                        Официальная проходит по учёту и уменьшает базу КПН,
                        неофициальная — нет. На саму выплату перевозчику
                        галочка не влияет, только на расчёт налога в ОУР. */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 10, fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={!!form.carrierOfficial}
                        onChange={e => setForm(f => ({ ...f, carrierOfficial: e.target.checked }))}
                      />
                      📄 Перевозка куплена официально
                    </label>
                    <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4, marginLeft: 26 }}>
                      Уменьшает базу КПН в режиме ОУР. За наличные — не отмечать.
                    </div>
                  </>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={form.needRepresentative} onChange={e => setForm({ ...form, needRepresentative: e.target.checked })} />
                  🧑‍💼 Нужен представитель
                </label>
                {form.needRepresentative && (
                  <CityFilteredSelect
                    items={representatives}
                    city={form.city}
                    value={form.representativeId}
                    onChange={val => setForm(f => ({ ...f, representativeId: val }))}
                    kindPlural="представители"
                    kindSingle="представитель"
                    placeholder="— выберите представителя —"
                    style={{ marginTop: 8 }}
                  />
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
                        style={{ cursor: 'pointer', background: open ? '#eff6ff' : '', color: v.annulled ? '#94a3b8' : undefined, opacity: v.annulled ? 0.75 : 1 }}
                      >
                        <td style={{ fontWeight: 700 }}>
                          {open ? '▾' : '▸'} {v.number}
                          {v.annulled && (
                            <span style={{ marginLeft: 8, fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                              аннулирована
                            </span>
                          )}
                        </td>
                        <td>{formatDate(v.createdAt)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{cnt}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{Number(v.totalWeight || 0).toLocaleString()} кг</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{Number(v.carrierSum || 0).toLocaleString()} тг</td>
                        <td className="actions-cell" onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn--sm" onClick={() => printCarrierVedomostRecord(v)} title="Печать ведомости перевозчика" style={{ fontSize: 11 }}>
                              🖨 Печать
                            </button>
                            <button className="btn btn--sm" onClick={() => handleDeleteVedomost(v)} title="Удалить ведомость (партии вернутся в «Сформированные», номер останется закреплён)" style={{ fontSize: 11, color: '#dc2626', borderColor: '#fecaca' }}>
                              🗑 Удалить
                            </button>
                          </div>
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
                                  <th style={{ textAlign: 'center' }}>Мест</th>
                                  <th style={{ textAlign: 'center' }}>Вес</th>
                                  <th>Перевозчик</th>
                                  <th style={{ textAlign: 'center' }}>Тариф</th>
                                  <th style={{ textAlign: 'right' }}>Сумма перевозчику</th>
                                  <th>Представитель</th>
                                  <th style={{ textAlign: 'right' }}>Сумма представителю</th>
                                  {!v.annulled && <th style={{ width: 96 }}>Действия</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.length === 0 ? (
                                  <tr><td colSpan={v.annulled ? 10 : 11} className="muted" style={{ padding: 10 }}>Нет данных по партиям</td></tr>
                                ) : rows.map((r, i) => {
                                  const isEditing = editingRow
                                    && editingRow.vedomostId === v.id
                                    && String(editingRow.batchId) === String(r.batchId);
                                  if (isEditing) return (
                                    <tr key={i} style={{ background: '#fffbeb' }}>
                                      <td>{i + 1}</td>
                                      <td style={{ fontWeight: 600 }}>{r.number}</td>
                                      <td>{r.city}</td>
                                      <td style={{ textAlign: 'center' }}>{r.seats != null ? Number(r.seats).toLocaleString() : "—"}</td>
                                      <td style={{ textAlign: 'center' }}>{Number(r.weight || 0).toLocaleString()} кг</td>
                                      <td>
                                        <select value={rowDraft.carrierId} style={{ width: '100%' }}
                                          onChange={e => setRowDraft(p => ({ ...p, carrierId: e.target.value }))}>
                                          <option value="">— не выбран —</option>
                                          {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <input type="number" min="0" value={rowDraft.carrierRate} style={{ width: 78 }}
                                          onChange={e => onRowRateChange(e.target.value, r.weight)} />
                                      </td>
                                      <td style={{ textAlign: 'right' }}>
                                        <input type="number" min="0" value={rowDraft.carrierSum} style={{ width: 96 }}
                                          onChange={e => setRowDraft(p => ({ ...p, carrierSum: e.target.value }))} />
                                      </td>
                                      <td>
                                        <select value={rowDraft.representativeId} style={{ width: '100%' }}
                                          onChange={e => setRowDraft(p => ({ ...p, representativeId: e.target.value }))}>
                                          <option value="">— не выбран —</option>
                                          {representatives.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                                        </select>
                                        <div className="muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                                          {String(representatives.find(x => x.id === rowDraft.representativeId)?.phone || "").trim() || "—"}
                                        </div>
                                      </td>
                                      <td style={{ textAlign: 'right' }}>
                                        <input type="number" min="0" value={rowDraft.representativeSum} style={{ width: 96 }}
                                          onChange={e => setRowDraft(p => ({ ...p, representativeSum: e.target.value }))} />
                                      </td>
                                      <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          <button className="btn btn--sm btn--accent" disabled={rowSaving}
                                            title="Сохранить строку" style={{ fontSize: 11 }}
                                            onClick={() => saveEditRow(v, r)}>{rowSaving ? '…' : '✓'}</button>
                                          <button className="btn btn--sm" disabled={rowSaving}
                                            title="Отменить" style={{ fontSize: 11 }}
                                            onClick={cancelEditRow}>✕</button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                  return (
                                    <tr key={i}>
                                      <td>{i + 1}</td>
                                      <td style={{ fontWeight: 600 }}>{r.number}</td>
                                      <td>{r.city}</td>
                                      <td style={{ textAlign: 'center' }}>{r.seats != null ? Number(r.seats).toLocaleString() : "—"}</td>
                                      <td style={{ textAlign: 'center' }}>{Number(r.weight || 0).toLocaleString()} кг</td>
                                      <td>{r.carrierId ? (carriers.find(c => c.id === r.carrierId)?.name || r.carrierName || "—") : (r.carrierName || "—")}</td>
                                      <td style={{ textAlign: 'center' }}>{r.carrierRate ? `${Number(r.carrierRate).toLocaleString()} тг/кг` : "—"}</td>
                                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(r.carrierSum || 0).toLocaleString()} тг</td>
                                                          <td>
                                        <div>{r.representativeId ? (representatives.find(x => x.id === r.representativeId)?.name || r.representativeName || "—") : (r.representativeName || "—")}</div>
                                        {/* ТЗ: телефон представителя из справочника, прочерк если нет */}
                                        <div className="muted" style={{ fontSize: '0.75rem' }}>{rowRepPhone(r) || "—"}</div>
                                      </td>
                                      <td style={{ textAlign: 'right' }}>{Number(r.representativeSum || 0).toLocaleString()} тг</td>
                                      {!v.annulled && (
                                        <td>
                                          <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn--sm" title="Редактировать строку"
                                              style={{ fontSize: 11 }} onClick={() => startEditRow(v, r)}>✏️</button>
                                            <button className="btn btn--sm" title="Убрать партию из ведомости (вернётся в «Сформированные»)"
                                              style={{ fontSize: 11, color: '#dc2626', borderColor: '#fecaca' }}
                                              onClick={() => deleteVedomostRow(v, r)}>🗑</button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
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
                {!noVedomost && tab === 'formed' && <th style={{ width: 36 }}></th>}
                <SortableTh field="number" style={{ width: 120 }}>Номер</SortableTh>
                <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
                <SortableTh field="city">Город</SortableTh>
                <SortableTh field="driverName">Водитель</SortableTh>
                <SortableTh field="carNumber">Авто</SortableTh>
                <SortableTh field="totalSeats" style={{ width: 80, textAlign: 'center' }}>Мест</SortableTh>
                <SortableTh field="totalWeight" style={{ width: 100, textAlign: 'center' }}>Вес</SortableTh>
                {canSeeMoney && <SortableTh field="deliveryCost" style={{ width: 130 }}>Стоимость</SortableTh>}
                <th style={{ width: 280 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length === 0 ? (
                <tr><td colSpan={moneyColSpan((!noVedomost && tab === 'formed') ? 10 : 9)} className="muted" style={{ padding: 16 }}>
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
                    {!noVedomost && tab === 'formed' && (
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
                    {(() => {
                      const { seats, weight } = batchTotals(b);
                      return (
                        <>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{seats || "—"}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{weight ? `${Number(weight).toLocaleString()} кг` : "—"}</td>
                        </>
                      );
                    })()}
                    <MoneyTd>{b.deliveryCost ? `${Number(b.deliveryCost).toLocaleString()} тг` : "—"}</MoneyTd>
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
                        {/* ТЗ: ограниченный менеджер грузовую ведомость не формирует.
                            Печать целиком клиентская, серверного запрета для неё нет —
                            здесь работает только скрытие кнопки. */}
                        {!isManager2 && (
                          <button
                            className="btn btn--sm"
                            onClick={() => tab === 'vedomost' ? navigate(`/simple/batches/${b.id}`) : printVedomost(b)}
                            title={tab === 'vedomost' ? "Открыть партию для печати ведомости перевозчика" : "Распечатать грузовую ведомость"}
                            style={{ fontSize: 11 }}
                          >
                            🖨 {tab === 'vedomost' ? 'Ведомость перевозчика' : 'Печать'}
                          </button>
                        )}
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