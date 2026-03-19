import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
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
      if (found) {
        // Проверяем и details, и actData
        const sourceData = found.details || found.actData;
        if (sourceData) {
          try {
            found.actData = typeof sourceData === 'string' ? JSON.parse(sourceData) : sourceData;
          } catch (e) {
            console.error("Parse details error", e);
          }
        }

        // КРИТИЧЕСКИЙ ФИКС: Если данных заявки нет в самом контракте, но есть ID — тянем ее отдельно
        if (!found.actData && found.actId) {
          try {
            const extraAct = await api.requests.get(found.actId);
            if (extraAct) {
               // Парсим детальки из API заявки
               let details = {};
               if (extraAct.details) {
                  details = typeof extraAct.details === 'string' ? JSON.parse(extraAct.details) : extraAct.details;
               }
               found.actData = { ...extraAct, ...details };
            }
          } catch (e) { console.error("Fetch extra act error", e); }
        }
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
          <div className="v">
            {contract.customerName || 
             contract.actData?.customer?.companyName || 
             contract.actData?.customer?.fio || 
             contract.actData?.customerName || 
             contract.actData?.customerFio || 
             "—"}
          </div>
          {(contract.actData?.customer || contract.actData) && (
              <>
                <div className="k">БИН/ИИН</div>
                <div className="v">{contract.actData?.customer?.bin || contract.actData?.bin || "—"}</div>
                <div className="k">Адрес</div>
                <div className="v">{contract.actData?.customer?.jurAddress || contract.actData?.jurAddress || "—"}</div>
              </>
          )}
        </div>
      </div>

      {contract.actData && (
          <div className="info_card" style={{ marginTop: 14 }}>
            <div className="info_title">Связанная заявка</div>
            <div className="kv">
              <div className="k">Номер заявки</div>
              <div className="v">
                <Link to={
                  contract.actData.readyForAccountant ? `/sent/${contract.actId}` : (
                    contract.actData.isWarehouse ? `/warehouse/${contract.actId}` :
                    (contract.actData.docType === 'ttn' || contract.actData.type === 'ttn') ? `/requests/${contract.actId}` :
                    (contract.actData.docType === 'smr' || contract.actData.type === 'smr') ? `/smr/${contract.actId}` :
                    `/acts/${contract.actId}`
                  )
                } style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  №{contract.actData.docNumber || contract.actData.number}
                </Link>
              </div>
              <div className="k">Дата заявки</div>
              <div className="v">{formatDisplayDate(contract.actData.date)}</div>
              <div className="k">Сумма услуг</div>
              <div className="v">
                {(() => {
                  const s = parseFloat(contract.actData.totalSum) || 
                            (Array.isArray(contract.actData.warehouseServices) 
                              ? contract.actData.warehouseServices.reduce((acc, x) => acc + (parseFloat(x.total) || 0), 0) 
                              : 0);
                  return s ? s.toLocaleString() : "0";
                })()} тг
              </div>
            </div>
          </div>
      )}
    </>
  );
}
