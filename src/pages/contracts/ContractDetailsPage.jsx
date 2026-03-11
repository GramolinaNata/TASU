import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { exportToDocx } from "../../shared/export/docxExport.js";
import { getCompanies } from "../../shared/storage/companyStorage.js";

function formatDisplayDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function ContractDetailsPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadContract = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const found = await api.contracts.get(id);
      if (found && found.details) {
        try {
          found.actData = typeof found.details === 'string' ? JSON.parse(found.details) : found.details;
        } catch (e) { console.error("Parse details error", e); }
      }
      setContract(found);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContract();
  }, [id]);

  const handleExport = async () => {
    if (contract?.actData) {
      const allCompanies = await api.companies.list();
      const comp = allCompanies.find(c => c.id === contract.companyId);

      await exportToDocx({
        ...contract.actData,
        company: comp,
        contractNumber: contract.number,
        contractDate: contract.date,
        isContract: true,
        type: contract.type // Передаем тип для выбора шаблона
      });
    }
  };

  const handleAnnul = async () => {
      if (window.confirm("Аннулировать договор?")) {
          await api.contracts.update(contract.id, { status: 'canceled' });
          loadContract();
      }
  };

  if (loading) return <div className="muted" style={{ padding: 20 }}>Загрузка...</div>;

  if (!contract) {
    return (
      <div className="topbar">
        <h1>Договор не найден</h1>
        <button className="btn" onClick={() => nav("/contracts")}>← Назад</button>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumbs">Договоры / {contract.number}</div>
          <h1>{contract.number}</h1>
        </div>

        <div className="topbar_actions">
          <button className="btn" onClick={() => nav("/contracts")}>← Назад</button>
          
          {contract.status !== 'canceled' && (
            <>
              <button className="btn btn--accent" onClick={handleExport}>Экспорт в Word</button>
              <button className="btn btn--danger" onClick={handleAnnul}>Аннулировать</button>
            </>
          )}
        </div>
      </div>

      <div className="summary_grid" style={{ marginTop: 16 }}>
        <div className="summary_item">
          <div className="label">Номер договора</div>
          <div className="v">{contract.number}</div>
        </div>
        <div className="summary_item">
          <div className="label">Дата договора</div>
          <div className="v">{formatDisplayDate(contract.date)}</div>
        </div>
        <div className="summary_item">
          <div className="label">Тип</div>
          <div className="v">{contract.type === 'warehouse' ? "Складские услуги" : "Транспортная экспедиция"}</div>
        </div>
        <div className="summary_item">
          <div className="label">Статус</div>
          <div className="v">
            {contract.status === 'canceled' ? (
              <span className="badge badge--danger">Аннулирован</span>
            ) : (
              <span className="badge badge--ttn">Действует</span>
            )}
          </div>
        </div>
      </div>

      <div className="info_card" style={{ marginTop: 14 }}>
        <div className="info_title">Информация о заказчике</div>
        <div className="kv">
          <div className="k">Заказчик</div>
          <div className="v">{contract.customerName || "—"}</div>
          {contract.actData?.customer && (
              <>
                <div className="k">БИН/ИИН</div>
                <div className="v">{contract.actData.customer.bin || "—"}</div>
                <div className="k">Адрес</div>
                <div className="v">{contract.actData.customer.jurAddress || "—"}</div>
              </>
          )}
        </div>
      </div>

      {contract.actData && (
          <div className="info_card" style={{ marginTop: 14 }}>
            <div className="info_title">Связанная заявка</div>
            <div className="kv">
              <div className="k">Номер заявки</div>
              <div className="v">№{contract.actData.number}</div>
              <div className="k">Дата заявки</div>
              <div className="v">{formatDisplayDate(contract.actData.date)}</div>
              <div className="k">Сумма услуг</div>
              <div className="v">{contract.actData.totalSum} тг</div>
            </div>
          </div>
      )}
    </>
  );
}
