import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../shared/api/mockClient.js";
import { exportToDocx } from "../../shared/export/docxExport.js";
import { getCompanies } from "../../shared/storage/companyStorage.js";

function safeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function ActDetailsPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const [act, setAct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState({ price: "" });

  // Состояния для формирования доп. полей ТТН/CMR (Поля 2-18)
  const [showDocForm, setShowDocForm] = useState(null); // 'ttn' | 'smr' | null
  const [docAttrs, setDocAttrs] = useState({
    doc5: "",  // 5. Прилагаемые документы
    doc6: "",  // 6. Маркировка и номера
    doc13: "", // 13. Указания отправителя
    doc14: "", // 14. Возврат
    doc15: "", // 15. Условия оплаты
    doc18: "", // 18. Оговорки и замечания перевозчика
  });

  const loadAct = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const found = await api.acts.get(id);
      setAct(found);
      if (found) {
        setServices(
          Array.isArray(found.services) && found.services.length
            ? found.services
            : [{ id: safeUuid(), name: "Доставка", qty: "1", sum: "0" }]
        );
        setTotal(found.total || { price: "" });
        if (found.docAttrs) setDocAttrs(found.docAttrs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAct();
  }, [id]);

  const chooseDocType = async (type) => {
    setShowDocForm(type);
  };

  const confirmDocType = async () => {
    if (!id || !showDocForm) return;
    const updated = await api.acts.update(id, { 
      docType: showDocForm,
      docAttrs 
    });
    setAct(updated);
    
    const type = showDocForm;
    setShowDocForm(null);
    
    // Навигация
    if (type === "ttn") nav("/requests");
    if (type === "smr") nav("/smr");
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

  const saveExtra = async () => {
    if (!id) return;
    const updated = await api.acts.update(id, {
      services,
      total,
    });
    setAct(updated);
    alert("Сохранено!");
  };

  if (loading) return <div className="muted" style={{padding: 20}}>Загрузка...</div>;

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
                {act.docType === "ttn" ? "ТТН Сформирована" : "Сформировать ТТН"}
              </button>
              <button className="btn btn--accent" onClick={() => chooseDocType("smr")}>
                {act.docType === "smr" ? "СМР Сформирована" : "Сформировать СМР"}
              </button>
              <button 
                className="btn" 
                style={{ background: '#2b5797', color: '#fff', borderColor: '#2b5797' }}
                onClick={() => {
                  const companies = getCompanies();
                  const comp = companies.find(c => c.id === act.companyId);
                  exportToDocx({ ...act, company: comp });
                }}
              >
                Экспорт в Word
              </button>
            </>
          ) : (
            <button 
              className="btn" 
              style={{ borderColor: "#108ee9", color: "#108ee9" }}
              onClick={async () => {
                if(window.confirm("Восстановить заявку?")) {
                  const updated = await api.acts.update(act.id, { status: "draft" });
                  setAct(updated);
                }
              }}
            >
              Восстановить
            </button>
          )}
        </div>
      </div>

      {showDocForm && (
        <div className="card" style={{ marginTop: 16, border: '2px solid var(--accent)', background: '#f0faff' }}>
          <div className="card_head">
            <div className="card_title">Заполнение данных для {showDocForm.toUpperCase()}</div>
          </div>
          <div className="card_body">
            <div className="form_grid">
              <div className="field">
                <div className="label">5. Прилагаемые документы</div>
                <input value={docAttrs.doc5} onChange={e => setDocAttrs({...docAttrs, doc5: e.target.value})} placeholder="Сертификаты, счета..." />
              </div>
              <div className="field">
                <div className="label">6. Маркировка и номера</div>
                <input value={docAttrs.doc6} onChange={e => setDocAttrs({...docAttrs, doc6: e.target.value})} placeholder="Марка, класс..." />
              </div>
              <div className="field">
                <div className="label">13. Указания отправителя (Таможня)</div>
                <input value={docAttrs.doc13} onChange={e => setDocAttrs({...docAttrs, doc13: e.target.value})} />
              </div>
              <div className="field">
                <div className="label">14. Возврат</div>
                <input value={docAttrs.doc14} onChange={e => setDocAttrs({...docAttrs, doc14: e.target.value})} />
              </div>
              <div className="field">
                <div className="label">15. Условия оплаты</div>
                <input value={docAttrs.doc15} onChange={e => setDocAttrs({...docAttrs, doc15: e.target.value})} placeholder="Франко..." />
              </div>
              <div className="field">
                <div className="label">18. Оговорки и замечания перевозчика</div>
                <input value={docAttrs.doc18} onChange={e => setDocAttrs({...docAttrs, doc18: e.target.value})} />
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button className="btn btn--accent" onClick={confirmDocType}>Подтвердить и Сформировать</button>
              <button className="btn" onClick={() => setShowDocForm(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

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
                   <>
                    <span className="badge badge--ttn">Заявка</span>
                    {act.docType === "ttn" && <span className="badge badge--ttn" style={{marginLeft: 5, background: '#52c41a'}}>ТТН</span>}
                    {act.docType === "smr" && <span className="badge badge--ttn" style={{marginLeft: 5, background: '#1890ff'}}>СМР</span>}
                   </>
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
            <div className="info_title">Маршрут и сроки</div>
            <div className="kv">
               <div className="k">Маршрут</div>
               <div className="v">{act.route?.fromCity} → {act.route?.toCity}</div>
               <div className="k">Адрес отправителя</div>
               <div className="v">{act.route?.fromAddress || "—"}</div>
               <div className="k">Адрес получателя</div>
               <div className="v">{act.route?.toAddress || "—"}</div>
               <div className="k">Срок доставки</div>
               <div className="v">{act.deliveryTerm || "—"}</div>
               <div className="k">Комментарий</div>
               <div className="v">{act.route?.comment || "—"}</div>
            </div>
      </div>

      {/* Груз */}
      <div className="info_card" style={{ marginTop: 14 }}>
        <div className="info_title">Груз</div>
        <div className="text_block" style={{marginBottom: 10}}>{act.cargoText || "—"}</div>
        
        <div className="kv" style={{marginBottom: 10}}>
             <div className="k">Вид упаковки</div>
             <div className="v">{act.packaging || "—"}</div>
             <div className="k">Крепление, штабелирование</div>
             <div className="v">{act.fastening || "—"}</div>
        </div>

        {act.docType && act.docAttrs && (
            <div className="kv" style={{marginBottom: 20, padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fafafa'}}>
                <div style={{gridColumn: 'span 2', fontWeight: 700, marginBottom: 5}}>Дополнительные данные ({act.docType.toUpperCase()})</div>
                <div className="k">5. Документы</div>
                <div className="v">{act.docAttrs.doc5 || "—"}</div>
                <div className="k">6. Маркировка</div>
                <div className="v">{act.docAttrs.doc6 || "—"}</div>
                <div className="k">13. Указания (Таможня)</div>
                <div className="v">{act.docAttrs.doc13 || "—"}</div>
                <div className="k">14. Возврат</div>
                <div className="v">{act.docAttrs.doc14 || "—"}</div>
                <div className="k">15. Условия оплаты</div>
                <div className="v">{act.docAttrs.doc15 || "—"}</div>
                <div className="k">18. Оговорки</div>
                <div className="v">{act.docAttrs.doc18 || "—"}</div>
            </div>
        )}

        {Array.isArray(act.cargoRows) && (
            <div className="table_wrap">
                <table className="table_fixed">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Название</th>
                            <th>Мест</th>
                            <th>Длина (см)</th>
                            <th>Ширина (см)</th>
                            <th>Высота (см)</th>
                            <th>Вес (кг)</th>
                            <th>Объем (см³)</th>
                            <th>Об. вес (кг)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {act.cargoRows.map((r, i) => (
                            <tr key={i}>
                                <td>{i+1}</td>
                                <td>{r.title || "—"}</td>
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
                                <td colSpan={2}>Итого</td>
                                <td>{act.totals.seats}</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td>{act.totals.weight}</td>
                                <td>{act.totals.volume?.toFixed(0)}</td>
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
