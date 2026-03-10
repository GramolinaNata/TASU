import React, { useEffect, useMemo, useState } from "react";
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

export default function ActsListPage() {
  const { isAdmin } = useAuth();
  const { openCompanySelector } = useOutletContext();
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [acts, setActs] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
// ...
  // Фильтрация
  const filtered = useMemo(() => {
    let list = acts;

    // 1. Фильтр по компании и отсутствие docType, и исключение склада
    if (company) {
       list = list.filter(a => a.companyId === company.id && !a.docType && !a.isWarehouse);
    } else {
       return [];
    }

    // 2. По дате (используем дату создания для фильтрации в списке)
    if (dateFrom) {
       list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) >= dateFrom);
    }
    if (dateTo) {
       list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) <= dateTo);
    }

    // 3. Поиск (Номер, ФИО, Город)
    const s = q.trim().toLowerCase();
    if (s) {
       list = list.filter((a) => {
        const hay = [a.number, a.docNumber, a.date, a.customer?.fio, a.route?.fromCity, a.route?.toCity]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(s);
      });
    }
    
    return list;
  }, [acts, q, company, dateFrom, dateTo]);

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
      console.error("Failed to load acts", e);
      setActs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Загрузка заявок
    loadActs(); // async call inside effect
  }, []);

  useEffect(() => {
    // 2. Подписка на изменение компании
    const unsubscribe = subscribeSelectedCompany(setCompany);
    setCompany(getSelectedCompany());
    return unsubscribe;
  }, []);

  useEffect(() => {
    // 3. Перезагрузка заявок при смене компании
    if (company) {
      loadActs();
    } else {
      setActs([]);
    }
  }, [company]);

  const handleAnnul = async (id, number) => {
    if (window.confirm(`Аннулировать заявку №${number}?`)) {
      try {
        await api.requests.update(id, { status: "canceled" });
        loadActs();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  const handleRestore = async (id, number) => {
    if (window.confirm(`Восстановить заявку №${number}?`)) {
      try {
        await api.requests.update(id, { status: "draft" });
        loadActs();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  const handleDelete = async (id, number) => {
    if (window.confirm(`ВНИМАНИЕ: Удалить заявку №${number} БЕЗВОЗВРАТНО?`)) {
      try {
        await api.requests.delete(id);
        loadActs();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Заявки</h1>
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

        <Link className="btn btn--accent" to="/acts/new">
          + Создать заявку
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
        {loading && <div className="muted" style={{padding: 20}}>Загрузка...</div>}
        {!loading && (
        <table className="table_fixed">
          <thead>
            <tr>
              <th style={{width: 100}}>Номер</th>
              <th style={{width: 100}}>Дата</th>
              <th style={{width: 100}}>Статус</th>
              <th>Страна, город (откуда)</th>
              <th>Страна, город (куда)</th>
              <th>Заказчик</th>
              <th style={{ width: 180, textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted" style={{ padding: 16 }}>
                  {company ? "В этой компании нет заявок." : "Выберите компанию."}
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} style={{ opacity: a.status === 'canceled' ? 0.5 : 1 }}>
                  <td className="num">
                    <Link to={`/acts/${a.id}`}>{a.docNumber || a.number}</Link>
                  </td>
                  <td>{formatDisplayDate(a.createdAt || a.date)}</td>
                  <td>
                    {a.status === 'canceled' ? (
                       <span className="badge badge--danger">Аннулирована</span>
                    ) : a.status === 'act' ? (
                       <span className="badge badge--ttn">Заявка</span>
                    ) : (
                       <span className="badge badge--draft">Черновик</span>
                    )}
                  </td>
                  <td>{a.route?.fromCity || "—"}</td>
                  <td>{a.route?.toCity || "—"}</td>
                  <td>
                    <div style={{fontWeight: 500}}>{a.customer?.fio || "—"}</div>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                   
                    
                    {isAdmin && (
                      <button
                        className="btn btn--sm btn--danger"
                        type="button"
                        onClick={() => handleDelete(a.id, a.number)}
                        style={{ background: '#ff4d4f', color: '#fff' }}
                      >
                        Удалить
                      </button>
                    )}

                    {a.status !== 'canceled' ? (
                      <button
                        className="btn btn--sm btn--ghost"
                        type="button"
                        onClick={() => handleAnnul(a.id, a.number)}
                      >
                        Аннулировать
                      </button>
                    ) : (
                      <button
                        className="btn btn--sm btn--primary"
                        style={{ borderColor: "#108ee9", color: "#108ee9" }}
                        type="button"
                        onClick={() => handleRestore(a.id, a.number)}
                      >
                        Восстановить
                      </button>
                    )}
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
