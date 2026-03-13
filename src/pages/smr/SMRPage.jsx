import React, { useEffect, useState, useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
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

export default function SmrPage() {
  const { isAdmin, isAccountant } = useAuth();
  const { openCompanySelector } = useOutletContext();
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [allActs, setAllActs] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
      console.error("Load SMR error:", e);
      setAllActs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnul = async (id, number) => {
    if (window.confirm(`Аннулировать СМР №${number}?`)) {
      try {
        await api.requests.update(id, { status: "canceled" });
        loadData();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  const handleRestore = async (id, number) => {
    if (window.confirm(`Восстановить СМР №${number}?`)) {
      try {
        await api.requests.update(id, { status: "act" });
        loadData();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  const handleDelete = async (id, number) => {
    if (window.confirm(`ВНИМАНИЕ: Удалить СМР №${number} БЕЗВОЗВРАТНО?`)) {
      try {
        await api.requests.delete(id);
        loadData();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeSelectedCompany(setCompany);
    setCompany(getSelectedCompany());
    return unsubscribe;
  }, []);

  const filtered = useMemo(() => {
    let list = allActs.filter(a => (a.type === "smr" || a.docType === "smr") && !a.isDeferredForAccountant);

    if (company) {
      list = list.filter(a => a.companyId === company.id);
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
          <h1>СМР</h1>
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
        {loading && <div className="muted" style={{ padding: 12 }}>Загрузка...</div>}
        <table>
          <thead>
            <tr>
              <th>Номер</th>
              <th>Дата</th>
              <th>Статус</th>
              <th>Страна, город (откуда)</th>
              <th>Страна, город (куда)</th>
              <th>Заказчик</th>
              <th>Вид транспорта</th>
              <th>Сумма (тг)</th>
              {(!isAccountant || isAdmin) && <th style={{ width: 170, textAlign: "right" }}>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted" style={{ padding: 16 }}>
                  {company ? "СМР не найдены." : "Выберите компанию."}
                </td>
              </tr>
            ) : (
               filtered.map((a) => (
                <tr key={a.id} style={{ opacity: a.status === 'canceled' ? 0.5 : 1 }}>
                  <td className="num">
                    <Link to={`/smr/${a.id}`}>{a.docNumber || a.number}</Link>
                  </td>
                  <td className="date">{formatDisplayDate(a.createdAt || a.date)}</td>
                  <td>
                    {a.status === 'canceled' ? (
                       <span className="badge badge--danger">Аннулирована</span>
                    ) : (a.status === 'draft' || a.type === 'REQUEST') ? (
                       <span className="badge badge--draft">Черновик</span>
                    ) : (
                       <span className="badge badge--ttn" style={{ background: '#1890ff' }}>СМР</span>
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
                  {(!isAccountant || isAdmin) && (
                  <td
                    style={{
                      textAlign: "right",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                      {(!isAccountant || isAdmin) && (
                        a.status === 'canceled' ? (
                          <button className="btn btn--sm" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                            Редактировать
                          </button>
                        ) : (
                          <Link className="btn btn--sm" to={`/smr/${a.id}/edit`}>
                            Редактировать
                          </Link>
                        )
                      )}
                      
                      {isAdmin ? (
                        <>
                          <button 
                            className="btn btn--sm btn--danger" 
                            type="button" 
                            onClick={() => handleDelete(a.id, a.docNumber || a.number)}
                            style={{ background: '#ff4d4f', color: '#fff' }}
                          >
                            Удалить
                          </button>
                          {a.status === 'canceled' && (
                            <button className="btn btn--sm" style={{ borderColor: "#108ee9", color: "#108ee9" }} type="button" onClick={() => handleRestore(a.id, a.docNumber || a.number)}>
                              Восстановить
                            </button>
                          )}
                          {a.status !== 'canceled' && (
                          <button className="btn btn--sm btn--danger" type="button" onClick={() => handleAnnul(a.id, a.docNumber || a.number)}>
                              Аннулировать
                            </button>
                          )}
                        </>
                      ) : (
                        a.status !== 'canceled' && (
                          <button className="btn btn--sm btn--danger" type="button" onClick={() => handleAnnul(a.id, a.docNumber || a.number)}>
                            Аннулировать
                          </button>
                        )
                      )}
                  </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
