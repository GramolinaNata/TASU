import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { formatDocNumber } from "../../shared/acts/docNumber.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";
import { useAuth } from "../../shared/auth/AuthContext";
import { printCargoVedomost } from "../../shared/print/vedomostPrint.js";

// 🆕 ТЗ: буква компании + П, нумерация по порядку с 1 (как у обычных партий)
function batchCompanyPrefix(company) {
  if (!company || !company.name) return "П";
  const n = company.name.toLowerCase();
  if (n.includes("алдияр")) return "АП";
  if (n.includes("tasu kz") && n.includes("ип")) return "IPTП";
  if (n.includes("tasu")) return "ТП";
  const first = (company.name.trim()[0] || "П").toUpperCase();
  return first + "П";
}

async function genNextBatchNumberSimple(company) {
  const prefix = batchCompanyPrefix(company);
  try {
    let all = [];
    try { all = await api.batches.list(); } catch (e) { all = await api.batches.list(company?.id); }
    const pattern = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)$");
    let maxNum = 0;
    (all || []).forEach(b => {
      const m = String(b.number || "").match(pattern);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum && n < 900000) maxNum = n;
      }
    });
    return prefix + String(maxNum + 1).padStart(6, "0");
  } catch (e) {
    return prefix + "000001";
  }
}


function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("ru");
}

const STATUS_COLORS = {
  "act": { bg: "#e6f7ff", color: "#1890ff" },
  "sent": { bg: "#fffbe6", color: "#d48806" },
  "done": { bg: "#f6ffed", color: "#52c41a" },
  "deferred": { bg: "#f5f0ff", color: "#722ed1" },
  "canceled": { bg: "#fff1f0", color: "#cf1322" },
};

function displayName(party) {
  if (!party) return "—";
  if (party.companyName && party.fio) return `${party.companyName}, ${party.fio}`;
  return party.companyName || party.fio || "—";
}

// ТЗ: новая нумерация частных — голые числа (1, 2, 3…). Сортировать их как
// строки нельзя: «10» встало бы перед «2». Числовые номера сравниваем числом,
// старые буквенные (А000007) — по-прежнему строкой, и идут отдельной группой.
function numberSortKey(raw) {
  const s = String(raw || '').trim();
  if (/^\d+$/.test(s)) {
    // Ведущий пробел ставит числовую серию перед буквенной при сравнении строк,
    // а padStart выравнивает разряды: «2» → «000002», «10» → «000010».
    return ' ' + s.padStart(12, '0');
  }
  return s.toLowerCase();
}

function getSortValue(a, field) {
  switch (field) {
    case 'number':   return numberSortKey(a.docNumber || a.number || a.id || '');
    case 'date':     return new Date(a.createdAt || a.date || 0).getTime();
    case 'customer': return displayName(a.customer).toLowerCase();
    case 'receiver': return displayName(a.receiver).toLowerCase();
    case 'city':     return (a.route?.toCity || '').toString().toLowerCase();
    case 'seats':    return Number(a.totals?.seats) || 0;
    case 'weight':   return Number(a.totals?.weight) || 0;
    case 'cargo':    return (a.cargoText || '').toString().toLowerCase();
    case 'status':   return (a.status || '').toString().toLowerCase();
    default:         return '';
  }
}

export default function SimpleActsListPage() {
  const location = useLocation();
  // ТЗ: ограниченный менеджер создаёт партию, но грузовую ведомость
  // не формирует — печать для него не открывается.
  const { isAdmin, isManager2, isAccountant, isAccountant2 } = useAuth();
  // ТЗ: «Завершённые» (оплата пришла) отмечает бухгалтер. Админу тоже даём —
  // он видит всё и подменяет бухгалтера, как в остальных разделах.
  const canMarkPaid = isAdmin || isAccountant || isAccountant2;
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState(getSelectedCompany());
  const [selected, setSelected] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState("all");
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

  useEffect(() => {
    return subscribeSelectedCompany(c => setCompany(c));
  }, []);

  useEffect(() => {
    // Админ видит частные накладные всех компаний (не зависит от переключателя).
    // Менеджер/PRIVATE — только свою выбранную компанию.
    if (!isAdmin && !company) { setActs([]); setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, location.state?.refresh, isAdmin]);
  const load = async () => {
    setLoading(true);
    try {
      // Админ — без companyId (все компании); остальные — по своей компании
      const list = await api.requests.list(isAdmin ? undefined : company?.id);
      if (Array.isArray(list)) {
        const simple = list
          .filter(a => {
            let details = {};
            if (a.details) try { details = typeof a.details === "string" ? JSON.parse(a.details) : a.details; } catch(e) {}
            return a.type === "SIMPLE" || details.isSimple;
          })
          .map(a => {
            let details = {};
            if (a.details) try { details = typeof a.details === "string" ? JSON.parse(a.details) : a.details; } catch(e) {}
            return {
              ...a,
              customer: details.customer || a.customer,
              receiver: details.receiver || a.receiver,
              route: details.route || a.route,
              cargoText: details.cargoText || a.cargoText || "",
              totals: details.totals || a.totals || {},
              transportType: details.transportType || a.transportType,
              totalSum: a.totalSum || details.totalSum || "",
              docNumber: details.docNumber || a.docNumber || a.id?.slice(0, 8),
            };
          });
        setActs(simple);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ТЗ: последний шаг цепочки — «Завершённые» = оплата пришла. Ставит бухгалтер
  // через отдельный признак isPaid, статус обработки груза при этом не меняется:
  // обработка и оплата — разные события, и смешивать их в одном поле нельзя.
  // Эндпоинт mark-paid уже существовал (используется в Аналитике), роль он не
  // ограничивает — доступ регулируем показом кнопки.
  const bulkPaid = async (paid) => {
    const ids = filtered.filter(a => selected.includes(a.id) && a.status !== 'canceled').map(a => a.id);
    if (ids.length === 0) return alert("Выберите накладные (аннулированные не переводятся).");
    const текст = paid
      ? `Отметить ${ids.length} накл. как оплаченные? Они уйдут в «Завершённые».`
      : `Вернуть ${ids.length} накл. в «Обработанные»? Отметка об оплате будет снята.`;
    if (!window.confirm(текст)) return;

    const results = await Promise.allSettled(ids.map(id => api.requests.markPaid(id, paid)));
    const failed = results
      .map((r, i) => (r.status === "rejected" ? ids[i] : null))
      .filter(Boolean);
    if (failed.length) {
      const nums = filtered.filter(a => failed.includes(a.id))
        .map(a => formatDocNumber(a.docNumber || a.number)).join(", ");
      alert(`Переведено ${ids.length - failed.length} из ${ids.length}.\nНе удалось: ${nums}`);
    }
    setSelected([]);
    load();
  };

  // Построчная отметка оплаты — та же механика, что и массовая.
  const markPaidAct = async (act, paid) => {
    const num = act.docNumber || act.number;
    const текст = paid
      ? `Завершить накладную №${num}? Оплата пришла, она уйдёт в «Завершённые».`
      : `Снять отметку об оплате с №${num}? Она вернётся в «Обработанные».`;
    if (!window.confirm(текст)) return;
    try {
      await api.requests.markPaid(act.id, paid);
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  };

  // ТЗ: массовый перевод статуса по галочкам — менеджерская обработка.
  // Бухгалтерских признаков не касается: обработку отмечает менеджер, оплату —
  // бухгалтер отдельной кнопкой. Партия и номер ведомости тоже не меняются.
  // Если часть накладных не прошла — говорим какие именно, а не «ошибка».
  const bulkStatus = async (newStatus, whereTo) => {
    const ids = filtered.filter(a => selected.includes(a.id) && a.status !== 'canceled').map(a => a.id);
    if (ids.length === 0) return alert("Выберите накладные (аннулированные не переводятся).");
    if (!window.confirm(`Перевести ${ids.length} накл. ${whereTo}?`)) return;

    const results = await Promise.allSettled(
      ids.map(id => api.requests.update(id, { status: newStatus }))
    );
    const failed = results
      .map((r, i) => (r.status === "rejected" ? ids[i] : null))
      .filter(Boolean);
    if (failed.length) {
      const nums = filtered.filter(a => failed.includes(a.id))
        .map(a => formatDocNumber(a.docNumber || a.number)).join(", ");
      alert(`Переведено ${ids.length - failed.length} из ${ids.length}.\nНе удалось: ${nums}`);
    }
    setSelected([]);
    load();
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.requests.update(id, { status: newStatus });
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const cancelAct = async (act) => {
    if (!window.confirm(`Аннулировать накладную №${formatDocNumber(act.docNumber || act.number)}?\nЭто действие можно отменить из таба "Аннулированные".`)) return;
    try {
      await api.requests.update(act.id, { status: 'canceled' });
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  // ТЗ: возврат из «Обработанных» в «Отложенные». Трогаем ТОЛЬКО статус
  // накладной — партия, номер грузовой ведомости и данные бухгалтерии
  // остаются как есть, иначе задним числом поедет отчёт.
  const deferAct = async (act) => {
    if (!window.confirm(
      `Вернуть накладную №${formatDocNumber(act.docNumber || act.number)} в «Отложенные»?\n\n` +
      `Партия и грузовая ведомость, в которые она вошла, останутся без изменений — ` +
      `меняется только статус самой накладной.`
    )) return;
    try {
      await api.requests.update(act.id, { status: 'deferred' });
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const restoreAct = async (act) => {
    if (!window.confirm(`Восстановить накладную №${formatDocNumber(act.docNumber || act.number)}?`)) return;
    try {
      await api.requests.update(act.id, { status: 'act' });
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const filtered = useMemo(() => {
    let list = acts.filter(a => {
      const s = search.trim().toLowerCase();
      const searchFields = [
        a.docNumber, a.number,
        a.customer?.fio, a.customer?.companyName, a.customer?.phone,
        a.receiver?.fio, a.receiver?.companyName, a.receiver?.phone,
        a.route?.toCity, a.route?.fromCity,
        a.cargoText,
      ].filter(Boolean).join(" ").toLowerCase();
      const matchSearch = !s || searchFields.includes(s);

      let matchDate = true;
      if (dateFrom) matchDate = matchDate && new Date(a.createdAt || a.date) >= new Date(dateFrom);
      if (dateTo) matchDate = matchDate && new Date(a.createdAt || a.date) <= new Date(dateTo + "T23:59:59");
      // ТЗ, цепочка частных: Сток → Подано → Обработанные → Завершённые.
      //
      // Первые три шага — это status. Последний, «Завершённые», стоит на
      // ОТДЕЛЬНОМ признаке isPaid: его ставит бухгалтер, когда пришла оплата,
      // и он не связан с обработкой груза. Поэтому «Обработанные» показывают
      // только неоплаченные — иначе накладная висела бы в двух вкладках сразу.
      let matchTab = true;
      if (activeTab === "stock") matchTab = a.status === "act";
      if (activeTab === "sent") matchTab = a.status === "sent";
      if (activeTab === "done") matchTab = a.status === "done" && !a.isPaid;
      if (activeTab === "paid") matchTab = !!a.isPaid && a.status !== "canceled";
      if (activeTab === "deferred") matchTab = a.status === "deferred";
      if (activeTab === "canceled") matchTab = a.status === "canceled";
      if (activeTab === "all") matchTab = a.status !== "canceled";
      // При активном поиске игнорируем вкладку — ищем по всем накладным,
      // чтобы можно было найти номер в любом статусе
      if (s) {
        return matchSearch && matchDate && a.status !== "canceled";
      }
      return matchSearch && matchDate && matchTab;
    });

    const sorted = [...list].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [acts, search, dateFrom, dateTo, activeTab, sortBy, sortOrder]);

  const displayActs = selected.length > 0 ? filtered.filter(a => selected.includes(a.id)) : filtered;
  const totalSeats = displayActs.reduce((acc, a) => acc + (Number(a.totals?.seats) || 0), 0);
  const totalWeight = displayActs.reduce((acc, a) => acc + (Number(a.totals?.weight) || 0), 0);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(a => a.id));
  };

  // Партия создаётся сразу, без окна: номер — авто, город — из накладных,
  // водитель/телефон/авто — пустые (дописываются позже в разделе Партии).
  const createBatchAndPrint = async () => {
    if (selected.length === 0) return alert("Выберите накладные");
    // Аннулированные накладные в партию не берём (даже если отмечены на вкладке «Аннулированные»).
    const selectedActs = filtered.filter(a => selected.includes(a.id) && a.status !== 'canceled');
    if (selectedActs.length === 0) return alert("Выбраны только аннулированные накладные — их нельзя добавить в партию.");

    // Город назначения — из накладных. Все должны быть в один город.
    const cities = [...new Set(selectedActs.map(a => (a.route?.toCity || "").trim()).filter(Boolean))];
    if (cities.length > 1) {
      return alert(
        `Партия собирается по одному городу назначения.\n\n` +
        `У выбранных накладных разные города: ${cities.join(", ")}.\n` +
        `Оставьте в выборе накладные только одного города.`
      );
    }
    const city = cities[0] || "";
    if (!city) return alert("У выбранных накладных не указан город назначения.");

    try {
      const number = await genNextBatchNumberSimple(company);
      const batchData = { number, city, driverName: "", driverPhone: "", carNumber: "", deliveryCost: "" };
      // В партию — ТОЛЬКО реально отмеченные и видимые накладные (selectedActs =
      // filtered ∩ selected). Раньше писали сырой `selected`, куда мог попасть id,
      // скрытый текущим фильтром/вкладкой, — из-за этого в партию лезла лишняя накладная.
      const ids = selectedActs.map(a => a.id);
      await api.batches.create({ ...batchData, companyId: company?.id, requestIds: ids });

      // ТЗ: партию создают обе роли, а грузовую ведомость ограниченный
      // менеджер не формирует — печать пропускаем. Для остальных ролей
      // поведение прежнее: партия и сразу печать.
      if (!isManager2) {
        await printVedomost(selectedActs, batchData);
      }

      // ТЗ, цепочка: Сток → Подано → Обработанные → Завершённые.
      // Ведомость сформирована — груз ПОДАН, но ещё не обработан: наклейку
      // клеит и машину грузит менеджер, и отмечает это он же, отдельной
      // кнопкой «Обработать». Раньше здесь стоял 'done', и накладная
      // перескакивала шаг обработки сразу после печати ведомости.
      try {
        await Promise.all(ids.map(id => api.requests.update(id, { status: 'sent' })));
      } catch (e) {
        alert(
          `Партия ${batchData.number} создана, ` +
          `но не удалось перевести накладные в «Подано»: ${e.message || e}\n\n` +
          `Статус можно поменять вручную в списке.`
        );
      }

      setSelected([]);
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  };

  const printVedomost = async (selectedActs, batchData) => {
    const rows = selectedActs.map((a) => ({
      docNumber: a.docNumber || a.number || a.id?.slice(0, 8) || "—",
      receiver: (a.receiver?.companyName && a.receiver?.fio)
        ? `${a.receiver.companyName}, ${a.receiver.fio}`
        : (a.receiver?.companyName || a.receiver?.fio || "—"),
      phone: a.receiver?.phone || "—",
      seats: a.totals?.seats || "",
      weight: a.totals?.weight || "",
      city: a.route?.toCity || "—",
      sum: Number(a.totalSum) || null,
    }));
    await printCargoVedomost({
      companyName: company?.name || "",
      batchNumber: batchData.number,
      city: batchData.city,
      rows,
    });
  };

  const tabCounts = {
    all: acts.filter(a => a.status !== "canceled").length,
    stock: acts.filter(a => a.status === "act").length,
    sent: acts.filter(a => a.status === "sent").length,
    done: acts.filter(a => a.status === "done" && !a.isPaid).length,
    // ТЗ: «Завершённые» — оплата пришла. Признак ставит бухгалтер, он отдельный
    // от статуса обработки груза.
    paid: acts.filter(a => !!a.isPaid && a.status !== "canceled").length,
    // ТЗ: отложенные — свой статус в той же механике вкладок, что и остальные
    // у частных. Флаги юрлиц (isDeferredForAccountant) сюда не тянем.
    deferred: acts.filter(a => a.status === "deferred").length,
    canceled: acts.filter(a => a.status === "canceled").length,
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Накладные</h1>
          <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
          {company && <div className="chip">{company.name}</div>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {/* ТЗ: менеджер сам отмечает обработку — наклеил, загрузил, отправил.
              Кнопка называется «Обработать», а не «Завершить»: «Завершённые» —
              это следующий, бухгалтерский шаг по оплате. Два разных слова на
              два разных шага, иначе менеджер жмёт «Завершить» и не понимает,
              почему накладная не в «Завершённых». */}
          {selected.length > 0 && activeTab !== 'done' && activeTab !== 'paid' && (
            <button className="btn" onClick={() => bulkStatus('done', 'в «Обработанные»')}
              style={{ background: '#52c41a', color: '#fff', border: 'none', fontWeight: 700 }}>
              ✅ Обработать ({selected.length})
            </button>
          )}
          {selected.length > 0 && activeTab === 'done' && (
            <>
              {/* ТЗ: оплату отмечает бухгалтер. Админу тоже оставляем — он
                  видит всё и подменяет бухгалтера, как в остальных разделах. */}
              {canMarkPaid && (
                <button className="btn" onClick={() => bulkPaid(true)}
                  style={{ background: '#1890ff', color: '#fff', border: 'none', fontWeight: 700 }}>
                  💰 Завершить — оплачено ({selected.length})
                </button>
              )}
              <button className="btn" onClick={() => bulkStatus('act', 'в «В стоке»')}>
                ↩ Вернуть в сток ({selected.length})
              </button>
            </>
          )}
          {selected.length > 0 && activeTab === 'paid' && canMarkPaid && (
            <button className="btn" onClick={() => bulkPaid(false)}>
              ↩ Вернуть в «Обработанные» ({selected.length})
            </button>
          )}
          {selected.length > 0 && (
            <button className="btn btn--accent" onClick={createBatchAndPrint}>
              {isManager2
                ? `📦 Создать партию (${selected.length})`
                : `📋 Грузовая ведомость (${selected.length})`}
            </button>
          )}
          <Link className="btn btn--accent" to="/simple/new">+ Новая накладная</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginTop: 16, borderBottom: "2px solid var(--line)" }}>
        {[
          // ТЗ, порядок цепочки: Сток → Подано → Обработанные → Завершённые.
          // «Обработанные» — прежний статус done, переименован: заказчик
          // называет этот шаг так, и это ровно он (менеджер отметил, что груз
          // обработан). Второго похожего статуса не заводили.
          { key: "all", label: "Все" },
          { key: "stock", label: "В стоке" },
          { key: "sent", label: "Подано" },
          { key: "done", label: "Обработанные" },
          { key: "paid", label: "Завершённые" },
          { key: "deferred", label: "Отложенные" },
          { key: "canceled", label: "Аннулированные" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelected([]); }}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? (tab.key === "canceled" ? "#cf1322" : "var(--accent)") : "var(--text-muted)",
              marginBottom: -2,
              fontSize: "0.9rem",
            }}
          >
            {tab.label} <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>({tabCounts[tab.key]})</span>
          </button>
        ))}
      </div>

      <div className="filter" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ minWidth: 200, flex: 1 }}>
          <div className="label">🔍 Поиск (номер накладной, ФИО, телефон, город)</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Введите № накладной (например А000001) или любую часть данных..." />
        </div>
        <div className="field" style={{ width: 160 }}>
          <div className="label">Дата с</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="field" style={{ width: 160 }}>
          <div className="label">Дата по</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
          Накладных: <strong>{selected.length > 0 ? selected.length : filtered.length}</strong>
          {selected.length > 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}> (выбрано)</span>}
        </div>
        <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
          Мест: <strong>{totalSeats}</strong>
        </div>
        <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
          Вес: <strong>{totalWeight} кг</strong>
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                <SortableTh field="number" style={{ width: 120 }}>Номер</SortableTh>
                <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
                <SortableTh field="customer">Отправитель</SortableTh>
                <SortableTh field="receiver">Получатель</SortableTh>
                <SortableTh field="city">Город</SortableTh>
                <SortableTh field="seats" style={{ width: 70 }}>Мест</SortableTh>
                <SortableTh field="weight" style={{ width: 90 }}>Вес</SortableTh>
                <SortableTh field="cargo">Груз</SortableTh>
                <SortableTh field="status" style={{ width: 120 }}>Статус</SortableTh>
                <th style={{ width: 100 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="muted" style={{ padding: 16 }}>
                  {company ? "Накладных пока нет." : "Выберите компанию."}
                </td></tr>
              ) : (
                filtered.map(a => {
                  const statusStyle = STATUS_COLORS[a.status] || { bg: "#f5f5f5", color: "#999" };
                  const isCanceled = a.status === "canceled";
                  return (
                    <tr
                      key={a.id}
                      style={{
                        background: selected.includes(a.id) ? "rgba(24,144,255,0.06)" : (isCanceled ? "#fff5f5" : ""),
                        opacity: isCanceled ? 0.7 : 1,
                      }}
                    >
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          disabled={isCanceled}
                        />
                      </td>
                      <td className="num">
                        <Link to={`/simple/${a.id}`} style={{ textDecoration: isCanceled ? "line-through" : "none" }}>
                          {formatDocNumber(a.docNumber || a.number) || a.id?.slice(0, 8)}
                        </Link>
                      </td>
                      <td>{formatDate(a.createdAt || a.date)}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{displayName(a.customer)}</div>
                        {a.customer?.phone && <div className="muted" style={{ fontSize: "0.8rem" }}>{a.customer.phone}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{displayName(a.receiver)}</div>
                        {a.receiver?.phone && <div className="muted" style={{ fontSize: "0.8rem" }}>{a.receiver.phone}</div>}
                      </td>
                      <td>{a.route?.toCity || "—"}</td>
                      <td style={{ textAlign: "center" }}>{a.totals?.seats || "—"}</td>
                      <td style={{ textAlign: "center" }}>{a.totals?.weight ? `${a.totals.weight} кг` : "—"}</td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{a.cargoText || "—"}</td>
                      <td>
                        {isCanceled ? (
                          <span style={{
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}>
                            Аннулирована
                          </span>
                        ) : a.isPaid ? (
                          /* ТЗ: оплачена — конец цепочки. Статус обработки менять
                             уже нечего, показываем итог. Снять отметку можно
                             кнопкой в колонке действий (только бухгалтер/админ). */
                          <span style={{
                            background: "#f6ffed",
                            color: "#237804",
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                          }}>
                            ✓ Завершена
                          </span>
                        ) : (
                          <select
                            value={a.status || "act"}
                            onChange={e => updateStatus(a.id, e.target.value)}
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              border: "none",
                              borderRadius: 4,
                              padding: "3px 6px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            <option value="act">В стоке</option>
                            <option value="sent">Подано</option>
                            <option value="done">Обработана</option>
                            <option value="deferred">Отложена</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {isCanceled ? (
                          <button
                            className="btn btn--sm"
                            onClick={() => restoreAct(a)}
                            title="Восстановить накладную"
                            style={{ background: '#52c41a', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
                          >
                            ↩ Восстановить
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {/* ТЗ: менеджер сам отмечает обработку — наклеил,
                                загрузил, отправил. Оплату отмечает бухгалтер
                                отдельной кнопкой, это следующий шаг. */}
                            {a.status !== 'done' && !a.isPaid && (
                              <button
                                className="btn btn--sm"
                                onClick={() => updateStatus(a.id, 'done')}
                                title="Обработать: наклейка наклеена, груз загружен и отправлен"
                                style={{ background: '#52c41a', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
                              >
                                ✅ Обработать
                              </button>
                            )}
                            {/* ТЗ: «Завершено» = пришла оплата. Только бухгалтер и админ. */}
                            {a.status === 'done' && !a.isPaid && canMarkPaid && (
                              <button
                                className="btn btn--sm"
                                onClick={() => markPaidAct(a, true)}
                                title="Завершить: оплата пришла, накладная уйдёт в «Завершённые»"
                                style={{ background: '#1890ff', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
                              >
                                💰 Завершить
                              </button>
                            )}
                            {a.isPaid && canMarkPaid && (
                              <button
                                className="btn btn--sm"
                                onClick={() => markPaidAct(a, false)}
                                title="Снять отметку об оплате — вернётся в «Обработанные»"
                                style={{ background: '#fff', border: '1px solid #1890ff', color: '#1890ff', fontSize: 11, fontWeight: 600 }}
                              >
                                ↩ Снять оплату
                              </button>
                            )}
                            {/* ТЗ: из «Обработанных» можно вернуть накладную в «Отложенные».
                                Меняется ТОЛЬКО статус: партия и номер ведомости остаются
                                за ней, иначе поехал бы отчёт бухгалтера. */}
                            {a.status === 'done' && (
                              <button
                                className="btn btn--sm"
                                onClick={() => deferAct(a)}
                                title="Вернуть накладную в «Отложенные» (партия и ведомость останутся)"
                                style={{ background: '#fff', border: '1px solid #722ed1', color: '#722ed1', fontSize: 11, fontWeight: 600 }}
                              >
                                ⏸ В отложенные
                              </button>
                            )}
                            <button
                              className="btn btn--sm"
                              onClick={() => cancelAct(a)}
                              title="Аннулировать накладную"
                              style={{ background: '#fff', border: '1px solid #ff4d4f', color: '#ff4d4f', fontSize: 11, fontWeight: 600 }}
                            >
                              🗑 Аннулировать
                            </button>
                          </div>
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