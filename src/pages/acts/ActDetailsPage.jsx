import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../../shared/api/api.js";
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
import { exportToDocx } from "../../shared/export/docxExport.js";
import { getCompanies } from "../../shared/storage/companyStorage.js";

function safeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function ActDetailsPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { isAdmin, isAccountant } = useAuth();
  const [act, setAct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Определяем контекст (из какого списка пришли)
  const isSMRPath = location.pathname.startsWith('/smr');
  const isTTNPath = location.pathname.startsWith('/requests');
  const isWarehousePath = location.pathname.startsWith('/warehouse');
  
  const basePath = isSMRPath ? "/smr" : (isTTNPath ? "/requests" : (isWarehousePath ? "/warehouse" : "/acts"));
  const crumbLabel = isSMRPath ? "СМР" : (isTTNPath ? "ТТН" : (isWarehousePath ? "Склад" : "Заявки"));
  
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState({ price: "" });

  // Состояния для формирования доп. полей ТТН/CMR (Поля 2-18)
  const [showDocForm, setShowDocForm] = useState(null); // 'ttn' | 'smr' | null
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [docAttrs, setDocAttrs] = useState({
    doc5: "", doc6: "", doc13: "", doc14: "", doc15: "", doc18: "",
    vehicle: "",
    driver: "",
    hasTrailer: false,
    trailerNumber: "",
    transportType: "auto_console",
    flightNumber: "",
  });

  const loadAct = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const found = await api.requests.get(id);
      if (found) {
        // Парсим детали из JSON если нужно
        let details = {};
        if (found.details) {
          try {
            details = typeof found.details === 'string' ? JSON.parse(found.details) : found.details;
          } catch (e) { console.error("Parse details error", e); }
        }

        // Объединяем объект заявки с распарсенными деталями
        const mergedAct = { ...found, ...details };
        setAct(mergedAct);

        setServices(
          Array.isArray(details.services) && details.services.length
            ? details.services
            : [{ id: safeUuid(), name: "Доставка", qty: "1", sum: "0" }]
        );
        setTotal(details.total || { price: "" });
        if (details.docAttrs) {
          setDocAttrs(prev => ({ ...prev, ...details.docAttrs }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAct();
  }, [id]);

  /* ГИБРИДНОЕ ФОРМИРОВАНИЕ */
  const chooseDocType = async (type) => {
    if (!id) return;
    
    // Если это ТТН или СМР — сначала показываем форму
    if (type === "ttn" || type === "smr") {
       setShowDocForm(type);
       return;
    }

    const updated = await api.requests.update(id, { 
      type: type,
      docType: type,
      status: "act" 
    });
    await loadAct();
    alert("Документ успешно сформирован!");
  };

  const confirmDocType = async () => {
    if (!id || !showDocForm) return;
    try {
      await api.requests.update(id, { 
        type: showDocForm,
        docType: showDocForm,
        docAttrs,
        status: "act"
      });
      await loadAct();
      setShowDocForm(null);
      alert(showDocForm === "ttn" ? "ТТН успешно сформирована!" : "СМР успешно сформирована!");
      // stay on page to show result
    } catch (err) {
      alert("Ошибка: " + err.message);
    }
  };
  
  const handleCancelFormation = async () => {
    if (!id) return;
    if (window.confirm("Отменить формирование документа? Заявка вернется в общий список.")) {
      const updated = await api.requests.update(id, {
        type: 'REQUEST',
        docType: null,
        docAttrs: {},
        status: "act" // Убеждаемся, что статус остается активным
      });
      await loadAct();
      setDocAttrs({
        doc5: "", doc6: "", doc13: "", doc14: "", doc15: "", doc18: "",
        vehicle: "", driver: "", hasTrailer: false, trailerNumber: "", transportType: "auto_console", flightNumber: ""
      });
      nav("/acts"); // Возвращаем в список заявок
    }
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
    const updated = await api.requests.update(id, {
      services,
      total,
    });
    setAct(updated);
    alert("Сохранено!");
  };

  const handleExport = async (docTypeOverride = null) => {
    if (!act || !act.companyId) {
      alert("Не указана компания экспедитор");
      return;
    }
    
    try {
      // Пытаемся загрузить актуальные данные компании с сервера (новый эндпоинт)
      let comp = null;
      try {
        comp = await api.companies.get(act.companyId);
      } catch (e) {
        console.warn("New getCompany endpoint not found, falling back to list...", e);
        // Fallback: если новый маршрут не найден (сервер не перезапущен), используем старый list()
        const allComps = await api.companies.list();
        comp = allComps.find(c => c.id === act.companyId);
      }
      
      if (!comp) {
        alert("Данные компании не найдены на сервере");
        return;
      }
      
      exportToDocx({ ...act, company: comp }, docTypeOverride || act.docType);
      setShowExportMenu(false);
    } catch (err) {
      console.error("Export error:", err);
      alert("Ошибка при загрузке данных компании: " + err.message);
    }
  };

  if (loading) return <div className="muted" style={{padding: 20}}>Загрузка...</div>;

  if (!act) {
    return (
      <div className="topbar">
        <div>
          <div className="crumbs">{crumbLabel} / Не найдено</div>
          <h1>Акт не найден</h1>
        </div>
        <div className="topbar_actions">
          <button className="btn" onClick={() => nav(basePath)}>← Назад</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumbs">{crumbLabel} / {act.docNumber || act.number}</div>
          <h1>{act.docNumber || act.number}</h1>
        </div>

        <div className="topbar_actions">
          <button className="btn" onClick={() => nav(basePath)}>← Назад</button>
          
          {(!isAccountant || isAdmin) && (
            <button 
              className="btn" 
              onClick={() => nav(`${basePath}/${act.id}/edit`)} // Edit button
              disabled={act.status === 'canceled'}
              style={act.status === 'canceled' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
            >
              Редактировать
            </button>
          )}

          {act.status !== 'canceled' ? (
            <>

              {(!isAccountant || isAdmin) && act.type !== "ttn" && act.docType !== "ttn" && !act.isWarehouse && (
                <button className="btn btn--accent" onClick={() => chooseDocType("ttn")}>
                  Сформировать ТТН
                </button>
              )}
              
              {(!isAccountant || isAdmin) && act.type !== "smr" && act.docType !== "smr" && !act.isWarehouse && (
                <button className="btn btn--accent" onClick={() => chooseDocType("smr")}>
                  Сформировать СМР
                </button>
              )}

              {(!isAccountant || isAdmin) && act.docType && (
                <button className="btn btn--danger" onClick={handleCancelFormation}>
                  Отменить формирование
                </button>
              )}
              {!act.isWarehouse && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button 
                    className="btn" 
                    style={{ background: '#2b5797', color: '#fff', borderColor: '#2b5797' }}
                    onClick={() => {
                      if (act.docType) {
                        setShowExportMenu(!showExportMenu);
                      } else {
                        handleExport();
                      }
                    }}
                  >
                    Экспорт в Word {act.docType ? "▼" : ""}
                  </button>

                  {showExportMenu && act.docType && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      minWidth: 200,
                      marginTop: 5
                    }}>
                      <div 
                        className="menu_item" 
                        style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onClick={() => handleExport("Заявка")}
                      >
                        📄 Экспорт как Заявка
                      </div>
                      <div 
                        className="menu_item" 
                        style={{ padding: '10px 15px', cursor: 'pointer' }}
                        onClick={() => handleExport(act.docType)}
                      >
                        🚛 Экспорт как {act.docType.toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : isAdmin ? (
            <button 
              className="btn" 
              style={{ borderColor: "#108ee9", color: "#108ee9" }}
              onClick={async () => {
                if(window.confirm("Восстановить заявку?")) {
                  const updated = await api.requests.update(act.id, { status: "draft" });
                  setAct(updated);
                }
              }}
            >
              Восстановить
            </button>
          ) : null}
        </div>
      </div>

      {showDocForm && (
        <div className="card" style={{ marginTop: 16, border: '2px solid var(--accent)', background: '#f0faff' }}>
          <div className="card_head">
            <div className="card_title">Заполнение данных для {showDocForm.toUpperCase()}</div>
          </div>
          <div className="card_body">
            <div className="form_grid">
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
                  <div className="field" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={!!docAttrs.hasTrailer} 
                        onChange={e => setDocAttrs({...docAttrs, hasTrailer: e.target.checked})} 
                      />
                      Имеется прицеп
                    </label>
                  </div>
                  {docAttrs.hasTrailer && (
                    <div className="field" style={{ gridColumn: 'span 2' }}>
                      <div className="label">Номер (описание) прицепа</div>
                      <input 
                        value={docAttrs.trailerNumber || ""} 
                        onChange={e => setDocAttrs({...docAttrs, trailerNumber: e.target.value})} 
                        placeholder="Напр. KZ 123 ABC 02"
                      />
                    </div>
                  )}
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

              {/* Удалены: Масса, Места, Прибытие/Окончание погрузки/разгрузки, Сведения о грузе по просьбе пользователя */}

              {/* Расчет для авиа-отправки удален по просьбе пользователя */}
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
              <div className="v">{act.docNumber || act.number}</div>
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
                    {!act.docType && <span className="badge badge--ttn">Заявка</span>}
                    {act.type === "ttn" || act.docType === "ttn" ? <span className="badge badge--ttn" style={{marginTop: 5, background: '#52c41a'}}>ТТН</span> : null}
                    {act.type === "smr" || act.docType === "smr" ? <span className="badge badge--ttn" style={{marginTop: 5, background: '#1890ff'}}>СМР</span> : null}
                   </>
                ) : (
                  <span className="badge badge--draft">Черновик</span>
                )}
              </div>
          </div>
          <div className="summary_item">
              <div className="label">Страховка</div>
              <div className="v">{act.insured ? "Да" : "Нет"}</div>
              {act.insured && act.cargoValue && (
                <div className="v" style={{ fontSize: '0.85em', color: 'var(--accent)', fontWeight: 700 }}>
                  ({act.cargoValue})
                </div>
              )}
          </div>
          <div className="summary_item">
              <div className="label">Сумма (заявленная)</div>
              <div className="v">{act.totalSum || "—"}</div>
          </div>
          {act.isWarehouse && (
            <div className="summary_item">
                <div className="label">Тип</div>
                <div className="v"><span className="badge" style={{ background: '#52c41a', color: '#fff' }}>Склад (Складские услуги)</span></div>
            </div>
          )}
      </div>

      <div className="split_2" style={{ marginTop: 14 }}>
        {/* SECTION: Бухгалтерия */}
        {isAccountant && (
          <div className="info_card" style={{ gridColumn: 'span 2', borderRadius: 8, padding: 20 }}>
            <div className="info_title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 16 }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--info)' }}>Отметка Бухгалтерии</span>
            </div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              
              {/* СНО Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', padding: '12px 16px', borderRadius: 6, border: '1px solid var(--line)', flex: '1 1 min-content' }}>
                 <div style={{ flex: 1, fontWeight: 500, fontSize: '0.95rem', color: 'var(--text)' }}>
                    Счет на оплату (СНО) выставлен
                 </div>
                 <label className="toggle_switch" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      style={{ display: 'none' }}
                      checked={!!act.snoIssued} 
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setAct(prev => ({ ...prev, snoIssued: val }));
                        try { await api.requests.update(act.id, { snoIssued: val }); }
                        catch (err) { alert(err.message); setAct(prev => ({ ...prev, snoIssued: !val })); }
                      }}
                    />
                    <div className="toggle_slider" style={{
                      width: 44, height: 24, background: act.snoIssued ? 'var(--success)' : 'var(--muted)', 
                      borderRadius: 24, position: 'relative', transition: 'background 0.3s'
                    }}>
                      <div className="toggle_knob" style={{
                        width: 20, height: 20, background: '#fff', borderRadius: '50%',
                        position: 'absolute', top: 2, left: act.snoIssued ? 22 : 2,
                        transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                 </label>
              </div>

              {/* АВР Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', padding: '12px 16px', borderRadius: 6, border: '1px solid var(--line)', flex: '1 1 min-content' }}>
                 <div style={{ flex: 1, fontWeight: 500, fontSize: '0.95rem', color: 'var(--text)' }}>
                    Акт выполненных работ (АВР) отправлен
                 </div>
                 <label className="toggle_switch" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      style={{ display: 'none' }}
                      checked={!!act.avrSent} 
                      onChange={async (e) => {
                        const val = e.target.checked;
                        setAct(prev => ({ ...prev, avrSent: val }));
                        try { await api.requests.update(act.id, { avrSent: val }); }
                        catch (err) { alert(err.message); setAct(prev => ({ ...prev, avrSent: !val })); }
                      }}
                    />
                    <div className="toggle_slider" style={{
                      width: 44, height: 24, background: act.avrSent ? 'var(--info)' : 'var(--muted)', 
                      borderRadius: 24, position: 'relative', transition: 'background 0.3s'
                    }}>
                      <div className="toggle_knob" style={{
                        width: 20, height: 20, background: '#fff', borderRadius: '50%',
                        position: 'absolute', top: 2, left: act.avrSent ? 22 : 2,
                        transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                 </label>
              </div>

            </div>
          </div>
        )}

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

        {!act.isWarehouse && (
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
        )}
      </div>
      
       {/* Маршрут */}
       {!act.isWarehouse && (
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
       )}

      {(act.type === 'ttn' || act.docType === 'ttn' || act.type === 'smr' || act.docType === 'smr') && (
        <div className="card" style={{ marginTop: 14, border: '1px solid var(--accent)' }}>
          <div className="card_head" style={{ background: '#f0faff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card_title">Транспортная информация ({(act.type || act.docType).toUpperCase()})</div>
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

              {act.docAttrs?.hasTrailer && (
                <div className="field">
                  <div className="label">Прицеп</div>
                  <div className="v" style={{fontWeight: 700}}>{act.docAttrs.trailerNumber || "Да"}</div>
                </div>
              )}

              {act.docAttrs?.driver && (
                <div className="field">
                  <div className="label">{act.docAttrs.transportType === 'train' ? 'Ответственный' : 'Водитель'}</div>
                  <div className="v">{act.docAttrs.driver}</div>
                </div>
              )}

              {/* Удалена Масса брутто по просьбе пользователя */}

              <div className="field">
              {/* Удалены: Масса, Места, Прибытие/Выгрузка по просьбе пользователя */}
              </div>

              {/* Удален Оплачиваемый вес (Авиа) по просьбе пользователя */}

              {/* Удалены сведения о грузе по просьбе пользователя */}

            </div>
          </div>
        </div>
      )}

      {/* Груз */}
      <div className="info_card" style={{ marginTop: 14 }}>
        <div className="info_title">Груз</div>
        <div className="text_block" style={{marginBottom: 10}}>{act.cargoText || "—"}</div>
        
        <div className="kv" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 15, background: '#f9f9f9', padding: 10, borderRadius: 4 }}>
          <div>
            <div className="k">Вид упаковки</div>
            <div className="v">{act.packaging || "—"}</div>
          </div>
          <div>
            <div className="k">Крепление и штабелирование</div>
            <div className="v">{act.fastening || "—"}</div>
          </div>
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

      {act.isWarehouse && Array.isArray(act.warehouseServices) && (
        <div className="info_card" style={{ marginTop: 14 }}>
          <div className="info_title">Складские услуги</div>
          <div className="table_wrap">
            <table className="table_fixed">
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>№</th>
                        <th style={{ minWidth: 300 }}>Наименование услуги</th>
                        <th style={{ width: 100 }}>Кол-во</th>
                        <th style={{ width: 120 }}>Цена (тг)</th>
                        <th style={{ width: 120 }}>Сумма (тг)</th>
                    </tr>
                </thead>
                <tbody>
                    {act.warehouseServices.map((s, idx) => (
                        <tr key={s.id || idx}>
                            <td>{idx + 1}</td>
                            <td>{s.name || "—"}</td>
                            <td>{s.qty}</td>
                            <td>{s.price?.toLocaleString()}</td>
                            <td style={{ fontWeight: 700 }}>{s.total?.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr style={{ fontWeight: 700 }}>
                        <td colSpan={4} style={{ textAlign: 'right' }}>Итого:</td>
                        <td style={{ fontWeight: 900 }}>
                          {act.warehouseServices.reduce((acc, s) => acc + (s.total || 0), 0).toLocaleString()}
                        </td>
                    </tr>
                </tfoot>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
