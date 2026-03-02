import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../../shared/api/mockClient.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";

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
      const list = await api.acts.list();
      if (Array.isArray(list)) {
        setActs(list);
      } else {
        setActs([]);
      }
    } catch (e) {
      setActs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActs();
    const unsubscribe = subscribeSelectedCompany(setCompany);
    setCompany(getSelectedCompany());
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (company) loadActs();
  }, [company]);

  const filtered = useMemo(() => {
    let list = acts.filter(a => a.isWarehouse);

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
      await api.acts.update(id, { status: "canceled" });
      loadActs();
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

        <Link className="btn btn--accent" to="/acts/new">
          + Новая складская заявка
        </Link>
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
        {loading && <div className="muted" style={{padding: 20}}>Загрузка...</div>}
        {!loading && (
        <table className="table_fixed">
          <thead>
            <tr>
              <th style={{width: 100}}>Номер</th>
              <th style={{width: 100}}>Дата</th>
              <th style={{width: 120}}>Статус</th>
              <th>Заказчик</th>
              <th style={{ width: 150 }}>Сумма услуг</th>
              <th style={{ width: 180, textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted" style={{ padding: 16 }}>
                  {company ? "Складских заявок не найдено." : "Выберите компанию."}
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} style={{ opacity: a.status === 'canceled' ? 0.5 : 1 }}>
                  <td className="num">
                    <Link to={`/acts/${a.id}`}>{a.number}</Link>
                  </td>
                  <td>{formatDisplayDate(a.createdAt || a.date)}</td>
                  <td>
                    {a.status === 'canceled' ? (
                       <span className="badge badge--danger">Аннулирована</span>
                    ) : (
                       <span className="badge" style={{ background: '#52c41a', color: '#fff' }}>Склад</span>
                    )}
                  </td>
                  <td>
                    <div style={{fontWeight: 500}}>{a.customer?.fio || "—"}</div>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {getServicesTotal(a.warehouseServices).toLocaleString()} тг
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    {a.status !== 'canceled' && (
                      <button
                        className="btn btn--sm btn--danger"
                        type="button"
                        onClick={() => handleAnnul(a.id, a.number)}
                      >
                        Аннулировать
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
