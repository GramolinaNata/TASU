import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
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

export default function WarehousePage() {
  const { isAdmin, isAccountant } = useAuth();
  const { openCompanySelector } = useOutletContext();
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [acts, setActs] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

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
           return { ...a, ...details };
        });
        setActs(parsed);
      } else {
        setActs([]);
      }
    } catch (e) {
      console.error("Load warehouse acts error:", e);
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

  const filtered = useMemo(() => {
    let list = acts.filter(a => a.isWarehouse && !a.isDeferredForAccountant);

    if (company) {
       list = list.filter(a => a.companyId === company.id && !!a.isWarehouse && !a.isDeferredForAccountant && !a.readyForAccountant);
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
        const hay = [a.number, a.customer?.fio]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(s);
      });
    }
    
    return list;
  }, [acts, q, company, dateFrom, dateTo]);

  const handleAnnul = async (id, number) => {
    if (window.confirm(`Аннулировать складскую заявку №${number}?`)) {
      try {
        await api.requests.update(id, { status: "canceled" });
        loadActs();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  const handleDelete = async (id, number) => {
    if (window.confirm(`ВНИМАНИЕ: Удалить складскую заявку №${number} БЕЗВОЗВРАТНО?`)) {
      try {
        await api.requests.delete(id);
        loadActs();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  const getServicesTotal = (services) => {
    if (!Array.isArray(services)) return 0;
    return services.reduce((acc, s) => acc + (s.total || 0), 0);
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Складские услуги</h1>
          {company && (
            <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>
              {company.name}
            </div>
          )}
          <button className="btn btn--sm btn--ghost" onClick={openCompanySelector}>
            Сменить
          </button>
        </div>
      </div>

      <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ minWidth: 200, flex: 1 }}>
          <div className="label">Поиск</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Номер, заказчик..."
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
                <th style={{ width: 100 }}>Номер</th>
                <th style={{ width: 100 }}>Дата</th>
                <th style={{ width: 120 }}>Статус</th>
                <th>Заказчик</th>
                <th style={{ width: 80 }}>Мест</th>
                <th style={{ width: 80 }}>Вес (кг)</th>
                <th style={{ width: 150 }}>Сумма услуг</th>
                {(!isAccountant || isAdmin) && <th style={{ width: 120, textAlign: "right" }}>Действия</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="muted" style={{ padding: 16 }}>
                    {company ? "Складских заявок не найдено." : "Выберите компанию."}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} style={{ opacity: a.status === 'canceled' ? 0.5 : 1 }}>
                    <td className="num">
                      <Link to={`/warehouse/${a.id}`}>{a.docNumber || a.number}</Link>
                    </td>
                    <td>{formatDisplayDate(a.createdAt || a.date)}</td>
                    <td>
                      {a.status === 'canceled' ? (
                        <span className="badge badge--danger">Аннулирована</span>
                      ) : a.status === 'Забрано' ? (
                        <span className="badge" style={{ background: '#e6f7ff', color: '#1890ff', borderColor: '#91caff' }}>Забрано</span>
                      ) : a.status === 'Доставлено' ? (
                        <span className="badge" style={{ background: '#f6ffed', color: '#52c41a', borderColor: '#b7eb8f' }}>Доставлено</span>
                      ) : a.status === 'draft' ? (
                        <span className="badge badge--draft">Черновик</span>
                      ) : (
                        <span className="badge" style={{ background: '#52c41a', color: '#fff' }}>Склад</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.customer?.fio || "—"}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{a.totals?.seats || "—"}</td>
                    <td style={{ textAlign: 'center' }}>{a.totals?.weight || "—"}</td>
                    <td style={{ fontWeight: 700 }}>
                      {getServicesTotal(a.warehouseServices).toLocaleString()} тг
                    </td>
                    {(!isAccountant || isAdmin) && (
                      <td style={{ textAlign: "right" }}>
                        <details className="actions-dropdown">
                          <summary className="btn-actions">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
                          </summary>
                          <div className="actions-menu">
                            <Link className="actions-item" to={`/warehouse/${a.id}`}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              Просмотр
                            </Link>

                            {a.status !== 'canceled' && (
                              <Link className="actions-item" to={`/warehouse/${a.id}/edit`}>
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
