import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../shared/api/mockClient.js";

function formatDisplayDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}
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
    // Поля для ТТН
    vehicle: "",
    driver: "",
    grossWeight: "",
    totalSeats: "",
    loadingArrival: "",
    loadingEnd: "",
    unloadingArrival: "",
    unloadingEnd: "",
    cargoNotes: "",
    transportType: "auto_console",
    flightNumber: "", // Для самолета / поезда
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
              {showDocForm === "ttn" ? (
                <>
                  <div className="field" style={{ gridColumn: 'span 2', marginBottom: 10 }}>
                    <div className="label">Вид перевозки <span className="text_danger">*</span></div>
                    <select 
                      value={docAttrs.transportType} 
                      onChange={e => setDocAttrs({...docAttrs, transportType: e.target.value})}
                      style={{ fontWeight: 'bold', padding: '8px' }}
                    >
                      <option value="auto_console">Авто перевозки консол</option>
                      <option value="auto_separate">Авто перевозки отдельно</option>
                      <option value="plane">Самолет</option>
                      <option value="train">Поезд рейс</option>
                    </select>
                  </div>

                  {docAttrs.transportType.startsWith("auto") && (
                    <>
                      <div className="field">
                        <div className="label">Автомобиль (Марка, гос. номер)</div>
                        <input value={docAttrs.vehicle} onChange={e => setDocAttrs({...docAttrs, vehicle: e.target.value})} placeholder="Volvo 016ACT02/ 21WSZ05" />
                      </div>
                      <div className="field">
                        <div className="label">Водитель (Ф.И.О.)</div>
                        <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
                      </div>
                    </>
                  )}

                  {docAttrs.transportType === "plane" && (
                    <div className="field" style={{ gridColumn: 'span 2' }}>
                      <div className="label">Номер рейса <span className="text_danger">*</span></div>
                      <input value={docAttrs.flightNumber} onChange={e => setDocAttrs({...docAttrs, flightNumber: e.target.value})} placeholder="KC-987" />
                    </div>
                  )}

                  {docAttrs.transportType === "train" && (
                    <>
                      <div className="field">
                        <div className="label">Поезд / Вагон / Рейс</div>
                        <input value={docAttrs.flightNumber} onChange={e => setDocAttrs({...docAttrs, flightNumber: e.target.value})} />
                      </div>
                      <div className="field">
                        <div className="label">Ф.И.О. ответственного (если есть)</div>
                        <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
                      </div>
                    </>
                  )}
                  <div className="field">
                    <div className="label">Сведения о грузе / Отметки таможни</div>
                    <input value={docAttrs.cargoNotes} onChange={e => setDocAttrs({...docAttrs, cargoNotes: e.target.value})} placeholder="Груз под таможенным контролем" />
                  </div>
                  <div className="field">
                    <div className="label">Масса брутто (кг)</div>
                    <input value={docAttrs.grossWeight} onChange={e => setDocAttrs({...docAttrs, grossWeight: e.target.value})} />
                  </div>
                  <div className="field">
                    <div className="label">Количество мест</div>
                    <input value={docAttrs.totalSeats} onChange={e => setDocAttrs({...docAttrs, totalSeats: e.target.value})} placeholder={act.totals?.seats || ""} />
                  </div>
                  <div className="field">
                    <div className="label">Прибытие под загрузку (Дата, время)</div>
                    <input value={docAttrs.loadingArrival} onChange={e => setDocAttrs({...docAttrs, loadingArrival: e.target.value})} placeholder="28.05.2024 09:00" />
                  </div>
                  <div className="field">
                    <div className="label">Окончание погрузки (Дата, время)</div>
                    <input value={docAttrs.loadingEnd} onChange={e => setDocAttrs({...docAttrs, loadingEnd: e.target.value})} />
                  </div>
                  <div className="field">
                    <div className="label">Прибытие под разгрузку (Дата, время)</div>
                    <input value={docAttrs.unloadingArrival} onChange={e => setDocAttrs({...docAttrs, unloadingArrival: e.target.value})} />
                  </div>
                  <div className="field">
                    <div className="label">Окончание разгрузки (Дата, время)</div>
                    <input value={docAttrs.unloadingEnd} onChange={e => setDocAttrs({...docAttrs, unloadingEnd: e.target.value})} />
                  </div>

                  {docAttrs.transportType === "plane" && (
                    <div className="field" style={{ gridColumn: 'span 2', background: '#fffbe6', padding: 12, borderRadius: 8, border: '1px solid #ffe58f', marginTop: 10 }}>
                      <div className="label" style={{ color: '#856404' }}>Расчет для авиа-отправки</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                         <span style={{ fontSize: 13 }}>Оплачиваемый вес (макс. из {act.totals?.weight}кг и {act.totals?.volWeight}кг):</span>
                         <span style={{ fontSize: 18, fontWeight: 900, color: '#d48806' }}>
                           {Math.max(act.totals?.weight || 0, act.totals?.volWeight || 0).toFixed(2)} кг
                         </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
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
              <div className="label">Дата погрузки</div>
              <div className="v">{formatDisplayDate(act.date) || "—"}</div>
          </div>
          <div className="summary_item">
              <div className="label">Дата создания</div>
              <div className="v">{formatDisplayDate(act.createdAt || act.date)}</div>
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
        
        {/* Отправитель */}
        <div className="info_card">
          <div className="info_title">Грузоотправитель</div>
          {act.isSenderSameAsCustomer ? (
            <div className="muted" style={{ padding: '10px 0' }}>
               Тот же, что и заказчик
            </div>
          ) : (
            <div className="kv">
              <div className="k">ФИО / Название</div>
              <div className="v">{act.sender?.fio || "—"}</div>
              <div className="k">Телефон</div>
              <div className="v">{act.sender?.phone || "—"}</div>
              <div className="k">Компания</div>
              <div className="v">{act.sender?.companyName || "—"}</div>
              <div className="k">БИН</div>
              <div className="v">{act.sender?.bin || "—"}</div>
              <div className="k">Адрес (Юр)</div>
              <div className="v">{act.sender?.jurAddress || "—"}</div>
              <div className="k">Email</div>
              <div className="v">{act.sender?.email || "—"}</div>
            </div>
          )}
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

      {act.docType && (
        <div className="card" style={{ marginTop: 14, border: '1px solid var(--accent)' }}>
          <div className="card_head" style={{ background: '#f0faff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card_title">Транспортная информация ({act.docType.toUpperCase()})</div>
          </div>
          <div className="card_body">
            <div className="form_grid">
              <div className="field">
                <div className="label">Вид перевозки</div>
                <div className="v" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  {act.docAttrs?.transportType === "auto_console" ? "Авто перевозки консол" :
                   act.docAttrs?.transportType === "auto_separate" ? "Авто перевозки отдельно" :
                   act.docAttrs?.transportType === "plane" ? "Самолет" :
                   act.docAttrs?.transportType === "train" ? "Поезд рейс" : "—"}
                </div>
              </div>

              {act.docAttrs?.flightNumber && (
                <div className="field">
                  <div className="label">{act.docAttrs.transportType === 'plane' ? 'Номер рейса' : 'Поезд / Вагон'}</div>
                  <div className="v" style={{fontWeight: 700}}>{act.docAttrs.flightNumber}</div>
                </div>
              )}

              {act.docAttrs?.vehicle && (
                <div className="field">
                  <div className="label">Автомобиль</div>
                  <div className="v" style={{fontWeight: 700}}>{act.docAttrs.vehicle}</div>
                </div>
              )}

              {act.docAttrs?.driver && (
                <div className="field">
                  <div className="label">{act.docAttrs.transportType === 'train' ? 'Ответственный' : 'Водитель'}</div>
                  <div className="v">{act.docAttrs.driver}</div>
                </div>
              )}

              <div className="field">
                <div className="label">Масса брутто (кг)</div>
                <div className="v">{act.docAttrs?.grossWeight || "—"}</div>
              </div>

              <div className="field">
                <div className="label">Мест (ТТН)</div>
                <div className="v">{act.docAttrs?.totalSeats || act.totals?.seats || "—"}</div>
              </div>

              <div className="field">
                <div className="label">Прибытие на погрузку</div>
                <div className="v">{act.docAttrs?.loadingArrival || "—"}</div>
              </div>

              <div className="field">
                <div className="label">Окончание погрузки</div>
                <div className="v">{act.docAttrs?.loadingEnd || "—"}</div>
              </div>

              <div className="field">
                <div className="label">Прибытие на выгрузку</div>
                <div className="v">{act.docAttrs?.unloadingArrival || "—"}</div>
              </div>

              <div className="field">
                <div className="label">Окончание выгрузки</div>
                <div className="v">{act.docAttrs?.unloadingEnd || "—"}</div>
              </div>

              {act.docAttrs?.transportType === "plane" && (
                <div className="field" style={{ gridColumn: 'span 2', background: '#fffbe6', padding: 10, borderRadius: 8, border: '1px solid #ffe58f' }}>
                   <div className="label" style={{color: '#856404'}}>Оплачиваемый вес (Авиа)</div>
                   <div className="v" style={{ color: '#d48806', fontSize: 20, fontWeight: 900 }}>
                     {Math.max(act.totals?.weight || 0, act.totals?.volWeight || 0).toFixed(2)} кг
                   </div>
                </div>
              )}

              {act.docAttrs?.cargoNotes && (
                <div className="field" style={{gridColumn: 'span 2'}}>
                  <div className="label">Сведения о грузе / Таможня</div>
                  <div className="v">{act.docAttrs.cargoNotes}</div>
                </div>
              )}

              {act.docType === 'smr' && (
                <div className="field" style={{gridColumn: 'span 2', borderTop: '1px dashed #ccc', marginTop: 10, paddingTop: 10}}>
                   <div className="form_grid">
                     <div className="field"><div className="label">Док. 5</div><div className="v">{act.docAttrs?.doc5 || "—"}</div></div>
                     <div className="field"><div className="label">Док. 6</div><div className="v">{act.docAttrs?.doc6 || "—"}</div></div>
                     <div className="field"><div className="label">Пункт 13</div><div className="v">{act.docAttrs?.doc13 || "—"}</div></div>
                     <div className="field"><div className="label">Пункт 14</div><div className="v">{act.docAttrs?.doc14 || "—"}</div></div>
                     <div className="field"><div className="label">Пункт 15</div><div className="v">{act.docAttrs?.doc15 || "—"}</div></div>
                     <div className="field"><div className="label">Пункт 18</div><div className="v">{act.docAttrs?.doc18 || "—"}</div></div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
