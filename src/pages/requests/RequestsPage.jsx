import React, { useEffect, useState, useMemo } from "react";
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

export default function RequestsPage() {
  const { isAdmin, isAccountant } = useAuth();
  const { openCompanySelector } = useOutletContext();
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [allActs, setAllActs] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
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
        setAllActs(parsed);
      } else {
        setAllActs([]);
      }
    } catch (e) {
      console.error("Load requests error:", e);
      setAllActs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnul = async (id, number) => {
    if (window.confirm(`Аннулировать ТТН №${number}?`)) {
      try {
        await api.requests.update(id, { status: "canceled" });
        loadData();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  const handleRestore = async (id, number) => {
    if (window.confirm(`Восстановить ТТН №${number}?`)) {
      try {
        await api.requests.update(id, { status: "act" });
        loadData();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };
  
  const handleDelete = async (id, number) => {
    if (window.confirm(`ВНИМАНИЕ: Удалить ТТН №${number} БЕЗВОЗВРАТНО?`)) {
      try {
        await api.requests.delete(id);
        loadData();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeSelectedCompany(setCompany);
    setCompany(getSelectedCompany());
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (company) {
      loadData();
    } else {
      setAllActs([]);
      setLoading(false);
    }
  }, [company]);

  const filtered = useMemo(() => {
    let list = allActs.filter(a => (a.type === "ttn" || a.docType === "ttn") && !a.isDeferredForAccountant);

    if (company) {
       list = list.filter(a => a.companyId === company.id && (a.docType === 'ttn' || a.type === 'ttn') && !a.isDeferredForAccountant && !a.readyForAccountant);
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
        const hay = [a.number, a.date, a.customer?.fio, a.route?.fromCity, a.route?.toCity]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(s);
      });
    }

    return list;
  }, [allActs, q, company, dateFrom, dateTo]);

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Заявки (ТТН)</h1>
          {company ? (
            <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>
              Выбрано: {company.name}
            </div>
          ) : (
            <div className="chip" style={{ background: "#fff1f0", borderColor: "#ffccc7", color: "#a8071a" }}>
              Компания не выбрана
            </div>
          )}
          
          <button className="btn btn--sm btn--ghost" onClick={openCompanySelector}>
            Сменить
          </button>
        </div>
        <Link className="btn" to="/acts">
          Перейти к актам
        </Link>
      </div>

      <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ minWidth: 200, flex: 1 }}>
          <div className="label">Поиск</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Номер, заказчик, страна, город..."
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
          <table>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Номер</th>
                <th style={{ width: 100 }}>Дата</th>
                <th style={{ width: 100 }}>Статус</th>
                <th>Страна, город (откуда)</th>
                <th>Страна, город (куда)</th>
                <th>Заказчик</th>
                <th style={{ width: 140 }}>Вид транспорта</th>
                <th style={{ width: 100 }}>Сумма (тг)</th>
                <th style={{ width: 120, textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="muted" style={{ padding: 16 }}>
                    {company ? "ТТН не найдены." : "Выберите компанию."}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} style={{ opacity: a.status === 'canceled' ? 0.5 : 1 }}>
                    <td className="num">
                      <Link to={`/requests/${a.id}`}>{a.docNumber || a.number}</Link>
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
                        <span className="badge badge--ttn" >ТТН</span>
                      )}
                    </td>
                    <td>{a.route?.fromCity || "—"}</td>
                    <td>{a.route?.toCity || "—"}</td>
                    <td>{a.customer?.fio || "—"}</td>
                    <td>
                      {a.docAttrs?.transportType === 'auto_console' || a.docAttrs?.transportType === 'auto_separate' ? "Авто" :
                        a.docAttrs?.transportType === 'plane' ? "Самолет" :
                          a.docAttrs?.transportType === 'train' ? "Поезд" : (a.cargoText || "—")}
                    </td>
                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {a.totalSum ? Number(a.totalSum).toLocaleString() : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <details className="actions-dropdown">
                        <summary className="btn-actions">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
                        </summary>
                        <div className="actions-menu">
                          <Link className="actions-item" to={`/requests/${a.id}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Просмотр
                          </Link>

                          {a.status !== 'canceled' && (
                            <Link className="actions-item" to={`/requests/${a.id}/edit`}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                              Редактировать
                            </Link>
                          )}

                          {(!isAccountant || isAdmin) && a.status !== 'canceled' && (
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
