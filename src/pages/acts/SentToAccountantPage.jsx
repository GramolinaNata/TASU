import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import { useAuth } from "../../shared/auth/AuthContext";
import Loader from "../../shared/components/Loader";
import { exportToDocx } from "../../shared/export/docxExport.js";

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

export default function SentToAccountantPage() {
  const { openCompanySelector } = useOutletContext();
  const { isAdmin, isAccountant } = useAuth();
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [acts, setActs] = useState([]);
  const [company, setCompany] = useState(null);
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Фильтрация: Только отработанные (readyForAccountant === true)
  const filtered = useMemo(() => {
    let list = acts.filter(a => !!a.readyForAccountant);

    if (company) {
       list = list.filter(a => a.companyId === company.id);
    } else {
       return [];
    }

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

    if (dateFrom) {
       list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) >= dateFrom);
    }
    if (dateTo) {
       list = list.filter(a => normalizeIsoDate(a.createdAt || a.date) <= dateTo);
    }

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
  }, [acts, q, company, dateFrom, dateTo, docTypeFilter]);

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

  const handleReturn = async (id) => {
    if (!window.confirm("Вернуть заявку в работу? Она пропадет из этого списка и появится в Заявках.")) return;
    try {
      await api.requests.update(id, { readyForAccountant: false });
      loadActs();
    } catch (e) {
       console.error(e);
       alert("Ошибка при возврате");
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

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Отработанные</h1>
          {company ? (
            <div className="chip" style={{ background: "#f6ffed", borderColor: "#b7eb8f", color: "#389e0d" }}>
              Компания: {company.name}
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
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Список заявок, переданных в бухгалтерию
        </div>
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
           <div className="label">Тип документа</div>
           <select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
               <option value="all">Все</option>
               <option value="request">Заявки</option>
               <option value="ttn">ТТН</option>
               <option value="smr">СМР</option>
               <option value="warehouse">Склад</option>
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
        {loading ? (
          <Loader />
        ) : (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Номер</th>
                <th style={{ width: 100 }}>Дата</th>
                <th style={{ width: 100 }}>Тип</th>
                <th>Откуда</th>
                <th>Куда</th>
                <th>Заказчик</th>
                <th style={{ width: 60, textAlign: 'center' }}>Мест</th>
                <th style={{ width: 70, textAlign: 'center' }}>Вес (кг)</th>
                <th style={{ width: 80, textAlign: 'center' }}>СНО</th>
                <th style={{ width: 80, textAlign: 'center' }}>АВР</th>
                <th style={{ width: 100, textAlign: "right" }}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="muted" style={{ padding: 16 }}>
                    {company ? "Нет отработанных заявок." : "Выберите компанию."}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="num">
                      <Link to={`/sent/${a.id}`}>
                        {a.docNumber || a.number}
                      </Link>
                    </td>
                    <td>{formatDisplayDate(a.createdAt || a.date)}</td>
                    <td>
                      {a.isWarehouse ? (
                        <span className="badge" style={{ background: '#52c41a', color: '#fff' }}>Склад</span>
                      ) : (
                        <span className="badge badge--ttn">{a.docType?.toUpperCase() || 'Заявка'}</span>
                      )}
                    </td>
                    <td>{a.route?.fromCity || "—"}</td>
                    <td>{a.route?.toCity || "—"}</td>
                    <td><div style={{ fontWeight: 500 }}>{a.customer?.fio || "—"}</div></td>
                    <td style={{ textAlign: "center", fontSize: '0.9rem' }}>{a.totals?.seats || "—"}</td>
                    <td style={{ textAlign: "center", fontSize: '0.9rem' }}>{a.totals?.weight || "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      {a.snoIssued ? (
                        <span className="badge" style={{ background: '#f6ffed', color: '#52c41a' }}>Да</span>
                      ) : (
                        <span className="badge" style={{ background: '#fffbe6', color: '#faad14' }}>Нет</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {a.avrSent ? (
                        <span className="badge" style={{ background: '#f6ffed', color: '#52c41a' }}>Да</span>
                      ) : (
                        <span className="badge" style={{ background: '#fffbe6', color: '#faad14' }}>Нет</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <Link className="btn btn--sm btn--ghost" to={`/sent/${a.id}`}>
                          Просмотр
                        </Link>
                        {(!isAccountant || isAdmin) && (
                          <button 
                             className="btn btn--sm btn--ghost" 
                             onClick={() => handleReturn(a.id)}
                             style={{ color: '#f5222d' }}
                             title="Вернуть в работу"
                          >
                             ↩
                          </button>
                        )}
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
