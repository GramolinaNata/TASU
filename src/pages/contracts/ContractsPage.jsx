import React, { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../../shared/api/mockClient.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
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

export default function ContractsPage() {
  const { openCompanySelector } = useOutletContext();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'warehouse' | 'transport'
  const [contracts, setContracts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const list = await api.contracts.list();
      setContracts(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load contracts", e);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
    const unsubscribe = subscribeSelectedCompany(setCompany);
    setCompany(getSelectedCompany());
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (company) loadContracts();
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

  const handleExport = async (contract) => {
    if (contract.type === 'warehouse' && contract.actData) {
      // Находим актуальные данные компании
      const allCompanies = api.companies ? await api.companies.list() : [];
      const company = allCompanies.find(c => c.id === contract.companyId);

      await exportToDocx({
        ...contract.actData,
        company: company, // Передаем полный объект компании
        contractNumber: contract.number,
        contractDate: contract.date,
        isContract: true
      });
    } else {
      alert("Экспорт для этого типа договора пока не поддерживается.");
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

        <Link className="btn btn--accent" to="/contracts/new">
          + Создать договор
        </Link>
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
        {loading && <div className="muted" style={{ padding: 20 }}>Загрузка...</div>}
        {!loading && (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Номер</th>
                <th style={{ width: 100 }}>Дата</th>
                <th style={{ width: 120 }}>Статус</th>
                <th>Тип</th>
                <th>Заказчик</th>
                <th style={{ width: 220, textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: 16 }}>
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
                    <td style={{ textAlign: "right", display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Link className="btn btn--sm btn--ghost" to={`/contracts/${c.id}`}>Просмотр</Link>
                        {c.status !== 'canceled' && (
                            <>
                                <button className="btn btn--sm btn--accent" onClick={() => handleExport(c)}>Экспорт</button>
                                <button className="btn btn--sm btn--danger" onClick={() => handleAnnul(c.id, c.number)}>Аннулировать</button>
                            </>
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
