import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import { exportToDocx } from "../../shared/export/docxExport.js";
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

export default function ContractsPage() {
  const { isAdmin, isAccountant } = useAuth();
  const { openCompanySelector } = useOutletContext();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'warehouse' | 'transport'
  const [contracts, setContracts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const list = await api.contracts.list(company?.id);
      setContracts(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load contracts", e);
      setContracts([]);
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
      loadContracts();
    } else {
      setContracts([]);
      setLoading(false);
    }
  }, [company]);

  const filtered = useMemo(() => {
    let list = contracts;

    if (company) {
      list = list.filter(c => c.companyId === company.id);
    } else {
      return [];
    }

    if (typeFilter !== "all") {
      list = list.filter(c => c.type === typeFilter);
    }

    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((c) => {
        const hay = [c.number, c.customerName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(s);
      });
    }

    return list;
  }, [contracts, q, company, typeFilter]);

  const handleAnnul = async (id, number) => {
    if (window.confirm(`Аннулировать договор №${number}?`)) {
      await api.contracts.update(id, { status: "canceled" });
      loadContracts();
    }
  };

  const handleRestore = async (id, number) => {
    if (window.confirm(`Восстановить договор №${number}?`)) {
      await api.contracts.update(id, { status: "active" });
      loadContracts();
    }
  };

  const handleDelete = async (id, number) => {
    if (window.confirm(`Удалить договор №${number} безвозвратно?`)) {
        await api.contracts.delete(id);
        loadContracts();
    }
  };

  const handleExport = async (contract) => {
    let actData = null;
    if (contract.details) {
      try {
        actData = typeof contract.details === 'string' ? JSON.parse(contract.details) : contract.details;
      } catch (e) { console.error("Parse contract details error", e); }
    }

    if (actData) {
      setExportLoading(true);
      try {
        // Находим актуальные данные компании
        const allCompanies = await api.companies.list();
        const comp = allCompanies.find(c => c.id === contract.companyId);

        await exportToDocx({
          ...actData,
          company: comp, // Передаем полный объект компании
          contractNumber: contract.number,
          contractDate: contract.date,
          isContract: true,
          type: contract.type // Передаем тип для выбора шаблона
        });
      } catch (e) {
        console.error("Export error", e);
        alert("Ошибка при экспорте: " + e.message);
      } finally {
        setExportLoading(false);
      }
    } else {
      alert("Данные заявки для экспорта не найдены");
    }
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Договоры</h1>
          {company && (
            <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>
              {company.name}
            </div>
          )}
          <button className="btn btn--sm btn--ghost" onClick={openCompanySelector}>
            Сменить
          </button>
        </div>

        {(!isAccountant || isAdmin) && (
          <Link className="btn btn--accent" to="/contracts/new">
            + Создать договор
          </Link>
        )}
      </div>

      <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ minWidth: 200, flex: 1 }}>
          <div className="label">Поиск</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Номер договора, заказчик..."
          />
        </div>
        <div className="field" style={{ width: 200 }}>
          <div className="label">Тип договора</div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Все типы</option>
            <option value="warehouse">Складские услуги</option>
            <option value="transport">Транспортная экспедиция</option>
          </select>
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? (
          <Loader />
        ) : (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Номер</th>
                <th style={{ width: 100 }}>Дата</th>
                <th style={{ width: 120 }}>Статус</th>
                <th>Тип</th>
                <th>Заказчик</th>
                {(!isAccountant || isAdmin) && <th style={{ width: 220, textAlign: "right" }}>Действия</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="muted" style={{ padding: 16 }}>
                    {company ? "Договоров не найдено." : "Выберите компанию."}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} style={{ opacity: c.status === 'canceled' ? 0.5 : 1 }}>
                    <td className="num">
                      <Link to={`/contracts/${c.id}`}>{c.number}</Link>
                    </td>
                    <td>{formatDisplayDate(c.date || c.createdAt)}</td>
                    <td>
                      {c.status === 'canceled' ? (
                        <span className="badge badge--danger">Аннулирован</span>
                      ) : (
                        <span className="badge badge--ttn">Действует</span>
                      )}
                    </td>
                    <td>
                      {c.type === 'warehouse' ? (
                        <span className="badge" style={{ background: '#e6f7ff', color: '#1890ff' }}>Складской</span>
                      ) : (
                        <span className="badge" style={{ background: '#f6ffed', color: '#52c41a' }}>Экспедиция</span>
                      )}
                    </td>
                    <td>{c.customerName || "—"}</td>
                    {(!isAccountant || isAdmin) && (
                    <td style={{ textAlign: "right" }}>
                      <details className="actions-dropdown">
                        <summary className="btn-actions">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
                        </summary>
                        <div className="actions-menu">
                          <Link className="actions-item" to={`/contracts/${c.id}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Просмотр
                          </Link>

                          {c.status !== 'canceled' && (
                            <button 
                              className="actions-item" 
                              onClick={() => handleExport(c)}
                              disabled={exportLoading}
                              style={{ opacity: exportLoading ? 0.7 : 1 }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              {exportLoading ? "Загрузка..." : "Экспорт (.docx)"}
                            </button>
                          )}

                          {c.status !== 'canceled' && (
                            <button className="actions-item" onClick={() => handleAnnul(c.id, c.number)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                              Аннулировать
                            </button>
                          )}

                          {isAdmin && c.status === 'canceled' && (
                            <button className="actions-item" onClick={() => handleRestore(c.id, c.number)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                              Восстановить
                            </button>
                          )}

                          {isAdmin && (
                            <button className="actions-item danger" onClick={() => handleDelete(c.id, c.number)}>
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
