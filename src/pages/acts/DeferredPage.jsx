import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { useAuth } from "../../shared/auth/AuthContext";

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

export default function DeferredPage() {
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadActs = async () => {
    setLoading(true);
    try {
      const list = await api.requests.list();
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
      console.error("Failed to load acts", e);
      setActs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActs();
  }, []);

  const filtered = useMemo(() => {
    // 1. Оставляем ТОЛЬКО отложенные
    let list = acts.filter(a => !!a.isDeferredForAccountant);

    // Фильтр по типу документа
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

    // Фильтр по статусу (Активные / Аннулированные)
    if (statusFilter !== "all") {
        if (statusFilter === "canceled") {
            list = list.filter(a => a.status === "canceled");
        } else if (statusFilter === "active") {
            list = list.filter(a => a.status !== "canceled" && a.status !== "draft");
        } else if (statusFilter === "draft") {
            list = list.filter(a => a.status === "draft");
        }
    }



    // 2. По дате
    if (dateFrom) {
       list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) >= dateFrom);
    }
    if (dateTo) {
       list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) <= dateTo);
    }

    // 3. Поиск
    const s = q.trim().toLowerCase();
    if (s) {
       list = list.filter((a) => {
        const hay = [a.number, a.docNumber, a.date, a.customer?.fio, a.route?.fromCity, a.route?.toCity, a.company?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(s);
      });
    }
    
    return list;
  }, [acts, q, dateFrom, dateTo, docTypeFilter, statusFilter]);

  const handleReturn = async (id, number) => {
    if (window.confirm(`Вернуть документ №${number} в общий список заявок?`)) {
      try {
        await api.requests.update(id, { isDeferredForAccountant: false });
        setActs(prev => prev.filter(a => a.id !== id));
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Отложенные заявки</h1>
          <div className="chip" style={{ background: "#fffbe6", borderColor: "#ffe58f", color: "#faad14" }}>
            Требуют уточнения
          </div>
        </div>
      </div>

      <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ minWidth: 200, flex: 1 }}>
          <div className="label">Поиск</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Номер, заказчик, компания..."
          />
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
           <div className="label">Дата с</div>
           <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="field" style={{ width: 140 }}>
           <div className="label">Дата по</div>
           <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading && <div className="muted" style={{padding: 20}}>Загрузка...</div>}
        {!loading && (
        <table className="table_fixed">
          <thead>
            <tr>
              <th style={{width: 100}}>Номер</th>
              <th style={{width: 100}}>Дата</th>
              <th>Компания</th>
              <th>Заказчик</th>
              <th>Маршрут</th>
              <th>Статус</th>
              <th style={{ width: 100 }}>Сумма (тг)</th>
              <th style={{ width: 120, textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted" style={{ padding: 16 }}>
                  Нет отложенных заявок.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} style={{ opacity: a.status === 'canceled' ? 0.5 : 1 }}>
                  <td className="num">
                    <Link to={`/deferred/${a.id}`}>
                        {a.docNumber || a.number}
                    </Link>
                  </td>
                  <td>{formatDisplayDate(a.createdAt || a.date)}</td>
                  <td><div style={{fontWeight: 500, fontSize: '0.85rem'}}>{a.company?.name || "—"}</div></td>
                  <td><div style={{fontWeight: 500}}>{a.customer?.fio || "—"}</div></td>
                  <td>
                    {a.isWarehouse ? (
                        <span className="badge" style={{background: '#e6f7ff', color: '#1890ff'}}>Склад</span>
                    ) : (
                        <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                            {a.route?.fromCity || "—"} → {a.route?.toCity || "—"}
                        </div>
                    )}
                  </td>
                  <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                    {a.status === 'draft' ? (
                      <span className="badge" style={{background: '#f5f5f5', color: '#595959', padding: '2px 6px', fontSize: '0.75rem'}}>Черновик</span>
                    ) : a.status === 'canceled' ? (
                      <span className="badge" style={{background: '#fff1f0', color: '#f5222d', padding: '2px 6px', fontSize: '0.75rem'}}>Аннулирован</span>
                    ) : (
                      <>
                        {a.isWarehouse ? (
                          <span className="badge" style={{background: '#f6ffed', color: '#52c41a', padding: '2px 6px', fontSize: '0.75rem'}}>Складская</span>
                        ) : a.docType === 'ttn' || a.type === 'ttn' ? (
                          <span className="badge" style={{background: '#e6f7ff', color: '#1890ff', padding: '2px 6px', fontSize: '0.75rem'}}>ТТН</span>
                        ) : a.docType === 'smr' || a.type === 'smr' ? (
                          <span className="badge" style={{background: '#fff0f6', color: '#eb2f96', padding: '2px 6px', fontSize: '0.75rem'}}>СМР</span>
                        ) : (
                          <span className="badge" style={{background: '#f0f5ff', color: '#2f54eb', padding: '2px 6px', fontSize: '0.75rem'}}>Заявка</span>
                        )}
                      </>
                    )}
                  </td>
                  <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {a.totalSum ? Number(a.totalSum).toLocaleString() : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn--sm btn--primary"
                      style={{ borderColor: "#108ee9", color: "#108ee9", background: "transparent" }}
                      type="button"
                      onClick={() => handleReturn(a.id, a.docNumber || a.number)}
                      title="Вернуть"
                    >
                      Вернуть
                    </button>
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
