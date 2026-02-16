import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addAct, getActs } from "../../shared/storage/actsStorage.js";
import { getSelectedCompanyId, getSelectedCompany } from "../../shared/storage/companyStorage.js";

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function transliterate(word) {
  const a = {"а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ua"};
  return word.toLowerCase().split("").map(function (char) { 
    return a[char] || (/[a-z0-9]/.test(char) ? char : ""); 
  }).join("");
}

function genNumber(company) {
  let prefix = "TKS";
  if (company && company.name) {
    const cleanName = company.name.replace(/ТОО|ИП|OOO|LLP/gi, "").trim();
    // Use first word or transliterated clean name
    const trans = transliterate(cleanName);
    // Take up to 4 chars, upper case
    prefix = (trans.substring(0, 4) || "ACT").toUpperCase();
  }
  
  // Find max existing number with this prefix
  const allActs = getActs();
  const prefixPattern = new RegExp(`^#${prefix}_(\\d+)$`);
  
  let maxNum = 0;
  
  allActs.forEach(a => {
      if (a.number) {
          const match = a.number.match(prefixPattern);
          if (match) {
              const n = parseInt(match[1], 10);
              if (n > maxNum) maxNum = n;
          }
      }
  });
  
  const nextNum = maxNum + 1;
  const nextStr = String(nextNum).padStart(4, "0");
  
  return `#${prefix}_${nextStr}`;
}

// Поля реквизитов, общие для Customer и Receiver
const initialRequisites = {
  jurAddress: "",
  factAddress: "",
  bin: "",
  account: "",
  bank: "",
  bik: "",
  kbe: "",
};

export default function ActCreatePage() {
  const nav = useNavigate();
  const [date, setDate] = useState(todayIso());
  const [totalSum, setTotalSum] = useState(""); // Ручная сумма

  // 1. Заказчик
  const [customer, setCustomer] = useState({
    fio: "",
    phone: "",
    companyName: "",
    ...initialRequisites,
  });

  // 2. Получатель
  const [receiver, setReceiver] = useState({
    fio: "",
    phone: "",
    companyName: "",
    ...initialRequisites,
  });

  // 3. Доставка и груз
  const [route, setRoute] = useState({
    fromCity: "",
    toCity: "",
    fromAddress: "",
    toAddress: "",
    comment: "",
  });

  const [cargoText, setCargoText] = useState("");
  const [insured, setInsured] = useState(false);

  // Таблица грузов
  const [cargoRows, setCargoRows] = useState([
    {
      id: safeUuid(),
      seats: 1,
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      volume: 0,
      volWeight: 0,
    },
  ]);

  // Сворачиваемые блоки реквизитов
  const [showCustReq, setShowCustReq] = useState(false);
  const [showRecReq, setShowRecReq] = useState(false);

  // Хелперы для изменения строк
  const updateRow = (id, field, val) => {
    setCargoRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [field]: val };
        
        // Авторасчет объема (м3) и объемного веса (кг)
        if (["length", "width", "height"].includes(field)) {
          const l = parseFloat(next.length) || 0;
          const w = parseFloat(next.width) || 0;
          const h = parseFloat(next.height) || 0;
          
          const v = (l * w * h) / 1000000;
          const vw = (l * w * h) / 6000;
          
          next.volume = v > 0 ? parseFloat(v.toFixed(4)) : 0;
          next.volWeight = vw > 0 ? parseFloat(vw.toFixed(2)) : 0;
        }
        return next;
      })
    );
  };

  const addRow = () => {
    setCargoRows((prev) => [
      ...prev,
      {
        id: safeUuid(),
        seats: 1,
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        volume: 0,
        volWeight: 0,
      },
    ]);
  };

  const delRow = (id) => {
    setCargoRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Итоги
  const totals = useMemo(() => {
    return cargoRows.reduce(
      (acc, r) => {
        acc.seats += parseFloat(r.seats) || 0;
        acc.weight += parseFloat(r.weight) || 0;
        acc.volume += parseFloat(r.volume) || 0;
        acc.volWeight += parseFloat(r.volWeight) || 0;
        return acc;
      },
      { seats: 0, weight: 0, volume: 0, volWeight: 0 }
    );
  }, [cargoRows]);

  const onSave = () => {
    const company = getSelectedCompany();
    const number = genNumber(company);

    const act = {
      id: safeUuid(),
      number, // используется сгенерированный номер
      date,
      createdAt: Date.now(),
      status: "draft",
      companyId: company?.id || null, 
      
      customer,
      receiver,
      route,
      
      cargoText,
      cargoRows,
      totals,
      insured,
      totalSum,
      
      docType: null,
    };
    
    addAct(act); // Исправлен вызов (был api.acts.create в mock, но здесь возвращаемся к storage пока или mock? 
    // Wait, user accepted mock implementation in ActsListPage but here we are still using direct storage?
    // Let's stick to storage for now as step 421 didn't change ActCreatePage to use API yet.
    // Actually, implementation plan said "Refactoring ActCreatePage (async/await) - TODO". 
    // So sticking to sync storage for now is correct to fix the immediate syntax error.
    
    nav("/acts");
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumbs">Заявки / Создать заявку</div>
          <h1>Создать заявку</h1>
        </div>
        <div className="topbar_actions">
          <button className="btn" onClick={() => nav(-1)}>← Назад</button>
        </div>
      </div>

      {/* 1. Заказчик */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head">
          <div className="card_title">1. Заказчик</div>
        </div>
        <div className="card_body">
          <div className="form_grid">
             <div className="field">
              <div className="label">ФИО / Название</div>
              <input 
                value={customer.fio} 
                onChange={e => setCustomer({...customer, fio: e.target.value})} 
                placeholder="Иванов И.И. / ТОО Ромашка"
              />
            </div>
            <div className="field">
              <div className="label">Телефон</div>
              <input 
                value={customer.phone} 
                onChange={e => setCustomer({...customer, phone: e.target.value})} 
                placeholder="+7..."
              />
            </div>
            <div className="field">
               <div className="label">Название компании</div>
               <input 
                 value={customer.companyName}
                 onChange={e => setCustomer({...customer, companyName: e.target.value})}
                 placeholder="Если отличается от ФИО"
               />
            </div>
             <div className="field field--full">
               <button 
                 className="btn btn--sm btn--ghost" 
                 onClick={() => setShowCustReq(!showCustReq)}
               >
                 {showCustReq ? "▲ Скрыть реквизиты" : "▼ Показать реквизиты"}
               </button>
             </div>
             
             {showCustReq && (
               <>
                 <div className="field">
                   <div className="label">Юр. адрес</div>
                   <input value={customer.jurAddress} onChange={e => setCustomer({...customer, jurAddress: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">Фактический адрес</div>
                   <input value={customer.factAddress} onChange={e => setCustomer({...customer, factAddress: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">БИН</div>
                   <input value={customer.bin} onChange={e => setCustomer({...customer, bin: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">Банк</div>
                   <input value={customer.bank} onChange={e => setCustomer({...customer, bank: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">БИК</div>
                   <input value={customer.bik} onChange={e => setCustomer({...customer, bik: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">Счет</div>
                   <input value={customer.account} onChange={e => setCustomer({...customer, account: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">КБЕ</div>
                   <input value={customer.kbe} onChange={e => setCustomer({...customer, kbe: e.target.value})} />
                 </div>
               </>
             )}
          </div>
        </div>
      </div>

      {/* 2. Получатель */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card_head">
          <div className="card_title">2. Получатель</div>
        </div>
        <div className="card_body">
          <div className="form_grid">
             <div className="field">
              <div className="label">ФИО / Название</div>
              <input 
                value={receiver.fio} 
                onChange={e => setReceiver({...receiver, fio: e.target.value})} 
                placeholder="Сидоров С.С."
              />
            </div>
            <div className="field">
              <div className="label">Телефон</div>
              <input 
                value={receiver.phone} 
                onChange={e => setReceiver({...receiver, phone: e.target.value})} 
                placeholder="+7..."
              />
            </div>
            <div className="field">
               <div className="label">Название компании</div>
               <input 
                 value={receiver.companyName}
                 onChange={e => setReceiver({...receiver, companyName: e.target.value})}
               />
            </div>
             <div className="field field--full">
               <button 
                 className="btn btn--sm btn--ghost" 
                 onClick={() => setShowRecReq(!showRecReq)}
               >
                 {showRecReq ? "▲ Скрыть реквизиты" : "▼ Показать реквизиты"}
               </button>
             </div>
             
             {showRecReq && (
               <>
                 <div className="field">
                   <div className="label">Юр. адрес</div>
                   <input value={receiver.jurAddress} onChange={e => setReceiver({...receiver, jurAddress: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">Фактический адрес</div>
                   <input value={receiver.factAddress} onChange={e => setReceiver({...receiver, factAddress: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">БИН</div>
                   <input value={receiver.bin} onChange={e => setReceiver({...receiver, bin: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">Банк</div>
                   <input value={receiver.bank} onChange={e => setReceiver({...receiver, bank: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">БИК</div>
                   <input value={receiver.bik} onChange={e => setReceiver({...receiver, bik: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">Счет</div>
                   <input value={receiver.account} onChange={e => setReceiver({...receiver, account: e.target.value})} />
                 </div>
                 <div className="field">
                   <div className="label">КБЕ</div>
                   <input value={receiver.kbe} onChange={e => setReceiver({...receiver, kbe: e.target.value})} />
                 </div>
               </>
             )}
          </div>
        </div>
      </div>

      {/* 3. Доставка и груз */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card_head">
          <div className="card_title">3. Доставка и характеристики груза</div>
        </div>
        <div className="card_body">
          <div className="form_grid">
            <div className="field">
              <div className="label">Город отправителя</div>
              <input
                value={route.fromCity}
                onChange={(e) => setRoute({...route, fromCity: e.target.value})}
                placeholder="Алматы"
              />
            </div>
            <div className="field">
              <div className="label">Город получателя</div>
              <input
                value={route.toCity}
                onChange={(e) => setRoute({...route, toCity: e.target.value})}
                placeholder="Астана"
              />
            </div>
            <div className="field">
              <div className="label">Адрес отправителя</div>
              <input
                value={route.fromAddress}
                onChange={(e) => setRoute({...route, fromAddress: e.target.value})}
              />
            </div>
            <div className="field">
              <div className="label">Адрес получателя</div>
              <input
                value={route.toAddress}
                onChange={(e) => setRoute({...route, toAddress: e.target.value})}
              />
            </div>
            <div className="field field--full">
              <div className="label">Комментарии</div>
              <textarea
                value={route.comment}
                onChange={(e) => setRoute({...route, comment: e.target.value})}
                placeholder="Звонить за 30 минут..."
              />
            </div>
            <div className="field field--full">
              <div className="label">Характеристики груза</div>
              <textarea
                value={cargoText}
                onChange={(e) => setCargoText(e.target.value)}
                placeholder="Бытовая техника, хрупкое..."
              />
            </div>
          </div>

          <div className="table_wrap" style={{ marginTop: 16 }}>
            <table className="table_fixed">
              <thead>
                <tr>
                  <th style={{width: 40}}>№</th>
                  <th>Кол-во</th>
                  <th>Длина (см)</th>
                  <th>Ширина (см)</th>
                  <th>Высота (см)</th>
                  <th>Вес (кг)</th>
                  <th>Объем (м³)</th>
                  <th>Об. вес (кг)</th>
                  <th style={{width: 80}}></th>
                </tr>
              </thead>
              <tbody>
                {cargoRows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i+1}</td>
                    <td><input type="number" className="cell_input" value={r.seats} onChange={e => updateRow(r.id, 'seats', e.target.value)} /></td>
                    <td><input type="number" className="cell_input" value={r.length} onChange={e => updateRow(r.id, 'length', e.target.value)} /></td>
                    <td><input type="number" className="cell_input" value={r.width} onChange={e => updateRow(r.id, 'width', e.target.value)} /></td>
                    <td><input type="number" className="cell_input" value={r.height} onChange={e => updateRow(r.id, 'height', e.target.value)} /></td>
                    <td><input type="number" className="cell_input" value={r.weight} onChange={e => updateRow(r.id, 'weight', e.target.value)} /></td>
                    <td>{r.volume}</td>
                    <td>{r.volWeight}</td>
                    <td><button className="btn btn--sm btn--danger" onClick={() => delRow(r.id)}>x</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{background: '#f5f5f5', fontWeight: 700}}>
                <tr>
                  <td colSpan={1}>Итого:</td>
                  <td>{totals.seats}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>{totals.weight}</td>
                  <td>{totals.volume.toFixed(4)}</td>
                  <td>{totals.volWeight.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
             <div
              style={{
                padding: 12,
                display: "flex",
                justifyContent: "flex-end",
                background: "#fbfbfb",
                borderTop: "1px solid var(--line)",
              }}
            >
              <button className="btn" type="button" onClick={addRow}>
                + Добавить строку
              </button>
            </div>
          </div>
          
          <div className="form_grid" style={{marginTop: 20}}>
             <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, gridColumn: "span 1" }}>
              <input
                type="checkbox"
                checked={insured}
                onChange={(e) => setInsured(e.target.checked)}
              />
              Имеется ли страховка?
            </label>
            
            <div className="field">
               <div className="label">Сумма (тг)</div>
               <input 
                 value={totalSum}
                 onChange={e => setTotalSum(e.target.value)}
                 placeholder="Введите сумму"
               />
            </div>
            
             <div className="field">
               <div className="label">Дата</div>
               <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>


          <div className="page_actions" style={{ marginTop: 24, paddingBottom: 40 }}>
            <button className="btn btn--accent btn--lg" style={{ width: "100%" }} onClick={onSave}>
              Сохранить заявку
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
