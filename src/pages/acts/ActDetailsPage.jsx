import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getActById, updateAct, deleteAct } from "../../shared/storage/actsStorage.js";

function safeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function ActDetailsPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const [act, setAct] = useState(null);
  
  // Состояния для редактируемых полей (если нужно)
  // В новой логике мы пока не редактируем основные данные здесь, 
  // но оставляем возможность добавить "Услуги" и изменить статус.

  const [services, setServices] = useState([]);
  const [total, setTotal] = useState({ price: "" });

  useEffect(() => {
    if (!id) return;
    const found = getActById(id);
    setAct(found);
    
    if (found) {
      setServices(
        Array.isArray(found.services) && found.services.length
          ? found.services
          : [{ id: safeUuid(), name: "Доставка", qty: "1", sum: "0" }]
      );
      setTotal(found.total || { price: "" });
    }
  }, [id]);

  const chooseDocType = (type) => {
    if (!id) return;
    const updated = updateAct(id, { docType: type });
    setAct(updated);
  };

  const addServiceRow = () => {
    setServices((prev) => [...prev, { id: safeUuid(), name: "", qty: "1", sum: "0" }]);
  };

  const removeServiceRow = (rowId) => {
    setServices((prev) => prev.filter((x) => x.id !== rowId));
  };

  const setServiceRow = (rowId, patch) => {
    setServices((prev) => prev.map((x) => (x.id === rowId ? { ...x, ...patch } : x)));
  };

  const saveExtra = () => {
    if (!id) return;
    const updated = updateAct(id, {
      services,
      total,
    });
    setAct(updated);
    alert("Сохранено!");
  };

  if (!act) {
    return (
      <div className="topbar">
        <div>
          <div className="crumbs">Заявки / Не найдено</div>
          <h1>Акт не найден</h1>
        </div>
        <div className="topbar_actions">
          <button className="btn" onClick={() => nav("/acts")}>← Назад</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumbs">Заявки / {act.number}</div>
          <h1>{act.number}</h1>
        </div>

        <div className="topbar_actions">
          <button className="btn" onClick={() => nav("/acts")}>← Назад</button>
          
          {act.status !== 'canceled' ? (
            <>
              <button 
                className="btn" 
                onClick={() => nav(`/acts/${act.id}/edit`)} // Edit button
              >
                Редактировать
              </button>
              <button className="btn btn--accent" onClick={() => chooseDocType("ttn")}>
                Сформировать ТТН
              </button>
              <button className="btn btn--accent" onClick={() => chooseDocType("smr")}>
                Сформировать СМР
              </button>
            </>
          ) : (
            <button 
              className="btn" 
              style={{ borderColor: "#108ee9", color: "#108ee9" }}
              onClick={async () => {
                if(window.confirm("Восстановить заявку?")) {
                  const updated = await updateAct(act.id, { status: "draft" });
                  setAct(updated);
                }
              }}
            >
              Восстановить
            </button>
          )}
        </div>
      </div>

      <div className="summary_grid" style={{marginTop: 16}}>
          <div className="summary_item">
              <div className="label">Номер</div>
              <div className="v">{act.number}</div>
          </div>
          <div className="summary_item">
              <div className="label">Дата</div>
              <div className="v">{act.date || "—"}</div>
          </div>
          <div className="summary_item">
              <div className="label">Статус</div>
              <div>
                {act.status === "canceled" ? (
                  <span className="badge badge--danger">Аннулирована</span>
                ) : act.status === "act" ? (
                  <span className="badge badge--ttn">Заявка</span>
                ) : (
                  <span className="badge badge--draft">Черновик</span>
                )}
              </div>
          </div>
          <div className="summary_item">
              <div className="label">Страховка</div>
              <div className="v">{act.insured ? "Да" : "Нет"}</div>
          </div>
           <div className="summary_item">
              <div className="label">Сумма (заявленная)</div>
              <div className="v">{act.totalSum || "—"}</div>
          </div>
      </div>

      <div className="split_2" style={{ marginTop: 14 }}>
        {/* Заказчик */}
        <div className="info_card">
          <div className="info_title">Заказчик</div>
          <div className="kv">
            <div className="k">ФИО / Название</div>
            <div className="v">{act.customer?.fio || "—"}</div>
            <div className="k">Телефон</div>
            <div className="v">{act.customer?.phone || "—"}</div>
            <div className="k">Компания</div>
            <div className="v">{act.customer?.companyName || "—"}</div>
            
            <div className="separator" />
            <div className="k">БИН</div>
            <div className="v">{act.customer?.bin || "—"}</div>
            <div className="k">Адрес (Юр)</div>
            <div className="v">{act.customer?.jurAddress || "—"}</div>
             <div className="k">Банк</div>
            <div className="v">{act.customer?.bank || "—"}</div>
             <div className="k">Счет</div>
            <div className="v">{act.customer?.account || "—"}</div>
          </div>
        </div>

        {/* Получатель */}
        <div className="info_card">
          <div className="info_title">Получатель</div>
           <div className="kv">
            <div className="k">ФИО / Название</div>
            <div className="v">{act.receiver?.fio || "—"}</div>
            <div className="k">Телефон</div>
            <div className="v">{act.receiver?.phone || "—"}</div>
            <div className="k">Компания</div>
            <div className="v">{act.receiver?.companyName || "—"}</div>
            
            <div className="separator" />
            <div className="k">БИН</div>
            <div className="v">{act.receiver?.bin || "—"}</div>
            <div className="k">Адрес (Юр)</div>
            <div className="v">{act.receiver?.jurAddress || "—"}</div>
             <div className="k">Банк</div>
            <div className="v">{act.receiver?.bank || "—"}</div>
             <div className="k">Счет</div>
            <div className="v">{act.receiver?.account || "—"}</div>
          </div>
        </div>
      </div>
      
       {/* Маршрут */}
       <div className="info_card" style={{ marginTop: 14 }}>
            <div className="info_title">Маршрут</div>
            <div className="kv">
               <div className="k">Маршрут</div>
               <div className="v">{act.route?.fromCity} → {act.route?.toCity}</div>
               <div className="k">Адрес отправления</div>
               <div className="v">{act.route?.fromAddress || "—"}</div>
               <div className="k">Адрес получения</div>
               <div className="v">{act.route?.toAddress || "—"}</div>
               <div className="k">Комментарий</div>
               <div className="v">{act.route?.comment || "—"}</div>
            </div>
      </div>

      {/* Груз */}
      <div className="info_card" style={{ marginTop: 14 }}>
        <div className="info_title">Груз</div>
        <div className="text_block" style={{marginBottom: 10}}>{act.cargoText || "—"}</div>
        
        {Array.isArray(act.cargoRows) && (
            <div className="table_wrap">
                <table className="table_fixed">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Мест</th>
                            <th>Длина</th>
                            <th>Ширина</th>
                            <th>Высота</th>
                            <th>Вес</th>
                            <th>Объем</th>
                            <th>Об. вес</th>
                        </tr>
                    </thead>
                    <tbody>
                        {act.cargoRows.map((r, i) => (
                            <tr key={i}>
                                <td>{i+1}</td>
                                <td>{r.seats}</td>
                                <td>{r.length}</td>
                                <td>{r.width}</td>
                                <td>{r.height}</td>
                                <td>{r.weight}</td>
                                <td>{r.volume}</td>
                                <td>{r.volWeight}</td>
                            </tr>
                        ))}
                    </tbody>
                    {act.totals && (
                        <tfoot style={{fontWeight: 700, background: '#f5f5f5'}}>
                            <tr>
                                <td>Итого</td>
                                <td>{act.totals.seats}</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td>{act.totals.weight}</td>
                                <td>{act.totals.volume?.toFixed(4)}</td>
                                <td>{act.totals.volWeight?.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        )}
      </div>
    </>
  );
}
