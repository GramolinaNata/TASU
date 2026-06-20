// import React, { useMemo, useState, useEffect } from "react";
// import { useNavigate, useParams, useLocation } from "react-router-dom";
// import { api } from "../../shared/api/api.js";
// import { getSelectedCompanyId, getSelectedCompany, getCompanies, setSelectedCompanyId as setGlobalSelectedCompanyId } from "../../shared/storage/companyStorage.js";
// import Modal from "../../shared/ui/Modal.jsx";

// function todayIso() {
//   const d = new Date();
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`;
// }

// function safeUuid() {
//   if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
//   return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
// }

// function transliterate(word) {
//   const a = {"а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ua"};
//   return word.toLowerCase().split("").map(function (char) { 
//     return a[char] || (/[a-z0-9]/.test(char) ? char : ""); 
//   }).join("");
// }

// async function genNumber(company) {
//   let prefix = "T"; // Default for TASU KAZAKHSTAN
//   if (company && company.name) {
//     const n = company.name.toLowerCase();
//     if (n.includes("алдияр")) {
//       prefix = "A";
//     } else if (n.includes("tasu kz") && n.includes("ип")) {
//       prefix = "IPT";
//     } else if (n.includes("tasu kazakhstan")) {
//       prefix = "T";
//     } else {
//       const cleanName = company.name.replace(/ТОО|ИП|OOO|LLP/gi, "").trim();
//       const trans = transliterate(cleanName);
//       prefix = (trans.substring(0, 3) || "ACT").toUpperCase();
//     }
//   }
  
//   // Получаем актуальный список с сервера для гарантии уникальности
//   let allActs = [];
//   try {
//      allActs = await api.requests.list();
//   } catch (e) {
//      console.error("Failed to fetch acts for numbering", e);
//   }

//   const prefixPattern = new RegExp(`^${prefix}(\\d+)$`);
//   let maxNum = 0;
  
//   allActs.forEach(a => {
//       const numStr = a.number || a.docNumber;
//       if (numStr) {
//           const match = numStr.match(prefixPattern);
//           if (match) {
//               const n = parseInt(match[1], 10);
//               if (n > maxNum) maxNum = n;
//           }
//       }
//   });
  
//   const nextNum = maxNum + 1;
//   const nextStr = String(nextNum).padStart(6, "0");
  
//   return `${prefix}${nextStr}`;
// }

// // Поля реквизитов, общие для Customer и Receiver
// const initialRequisites = {
//   jurAddress: "",
//   factAddress: "",
//   bin: "",
//   account: "",
//   bank: "",
//   bik: "",
//   kbe: "",
//   email: "",
// };

// export default function ActCreatePage() {
//   const nav = useNavigate();
//   const { id } = useParams();
//   const location = useLocation();
//   const isEditMode = !!id;

//   const [date, setDate] = useState(todayIso());
//   const [createdAt, setCreatedAt] = useState(todayIso());
//   const [totalSum, setTotalSum] = useState(""); // Ручная сумма
//   const [selectedCompanyId, setSelectedCompanyId] = useState("");
//   const [allCompanies, setAllCompanies] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const [customer, setCustomer] = useState({
//     fio: "",
//     phone: "",
//     companyName: "",
//     email: "",
//     ...initialRequisites,
//   });

//   // 1.1 Отправитель
//   const [isSenderSameAsCustomer, setIsSenderSameAsCustomer] = useState(true);
//   const [sender, setSender] = useState({
//     fio: "",
//     phone: "",
//     companyName: "",
//     email: "",
//     ...initialRequisites,
//   });

//   // 2. Получатель
//   const [receiver, setReceiver] = useState({
//     fio: "",
//     phone: "",
//     companyName: "",
//     email: "",
//     ...initialRequisites,
//   });

//   // 3. Доставка и груз
//   const [route, setRoute] = useState({
//     fromCity: "",
//     toCity: "",
//     fromAddress: "",
//     toAddress: "",
//     comment: "",
//   });

//   const [cargoText, setCargoText] = useState("");
//   const [packaging, setPackaging] = useState("");
//   const [deliveryTerm, setDeliveryTerm] = useState("");
//   const [insured, setInsured] = useState(false);
//   const [cargoValue, setCargoValue] = useState(""); // Стоимость груза по инвойсу

//   const [cargoRows, setCargoRows] = useState([
//     {
//       id: safeUuid(),
//       title: "",
//       seats: 1,
//       length: "",
//       width: "",
//       height: "",
//       weight: "",
//       volume: 0,
//       volWeight: 0,
//     },
//   ]);

//   // Контрагенты
//   const [allCounterparties, setAllCounterparties] = useState([]);
//   const [cpSearchModal, setCpSearchModal] = useState(null); // 'customer' | 'receiver' | 'sender'
//   const [saveAsCpCustomer, setSaveAsCpCustomer] = useState(true);
//   const [saveAsCpReceiver, setSaveAsCpReceiver] = useState(true);
//   const [cpSearchQuery, setCpSearchQuery] = useState("");
//   const [selectedCpObjCustomer, setSelectedCpObjCustomer] = useState(null);
//   const [selectedCpObjReceiver, setSelectedCpObjReceiver] = useState(null);

//   // 4. Склад
//   const [isWarehouse, setIsWarehouse] = useState(false);
//   const [warehouseServices, setWarehouseServices] = useState([
//     { id: safeUuid(), name: "", qty: 1, price: 0, total: 0 }
//   ]);

//   // Сворачиваемые блоки (карточки)
//   const [showCompanyCard, setShowCompanyCard] = useState(false);
//   const [showCustCard, setShowCustCard] = useState(false);
//   const [showSendCard, setShowSendCard] = useState(false);
//   const [showRecCard, setShowRecCard] = useState(false);
//   const [showRouteCard, setShowRouteCard] = useState(false);
//   const [showTransportCard, setShowTransportCard] = useState(false); // Default hidden

//   // Сворачиваемые блоки реквизитов (внутри карточек)
//   const [showCustReq, setShowCustReq] = useState(false);
//   const [showSendReq, setShowSendReq] = useState(false);
//   const [showRecReq, setShowRecReq] = useState(false);

//   const [isDataLoading, setIsDataLoading] = useState(false);

// // ТЗ v2.2: totalSum всегда = сумма услуг. Ручной ввод запрещён, поле readOnly.
//   useEffect(() => {
//     const sum = warehouseServices.reduce((acc, s) => acc + (s.total || 0), 0);
//     setTotalSum(sum > 0 ? sum.toString() : "");
//   }, [warehouseServices]);

//   // Состояния для сформированных документов (ТТН/СМР)
//   const [docType, setDocType] = useState(null);
//   const [dbType, setDbType] = useState("REQUEST");
//   const [docAttrs, setDocAttrs] = useState({
//     vehicleModel: "",
//     vehicleNumber: "",
//     driver: "",
//     hasTrailer: false,
//     trailerModel: "",
//     trailerNumber: "",
//     transportType: "auto_console",
//     flightNumber: "",
//     doc5: "", doc6: "", doc13: "", doc14: "", doc15: "", doc18: ""
//   });

//   // Load companies and act data
//   useEffect(() => {
//     const loadData = async () => {
//       const companies = getCompanies();
//       setAllCompanies(companies);

//       if (isEditMode) {
//         setIsDataLoading(true);
//         try {
//           // Reset states to avoid stale data while loading
//           setCargoRows([]);
//           setWarehouseServices([]);
//           setCargoText("");
          
//           const act = await api.requests.get(id);
//           if (act) {
//             setShowCustCard(true);
// setShowRecCard(true);
// setShowRouteCard(true);
// setShowTransportCard(true);
//             setDate(act.date || todayIso());
//             setCreatedAt(act.createdAt || todayIso());
            
//             // Парсим детали из JSON если нужно
//             let details = {};
//             if (act.details) {
//               try {
//                 details = typeof act.details === 'string' ? JSON.parse(act.details) : act.details;
//               } catch (e) { console.error("Parse details error", e); }
//             }

//             setTotalSum(act.totalSum || details.totalSum || "");
//             setSelectedCompanyId(act.companyId || "");
            
//             if (details.customer) setCustomer(details.customer);
//             if (details.receiver) setReceiver(details.receiver);
//             if (details.sender) setSender(details.sender);
            
//             if (typeof details.isSenderSameAsCustomer === 'boolean') {
//               setIsSenderSameAsCustomer(details.isSenderSameAsCustomer);
//             }
//             if (details.route) setRoute(details.route);
//             if (act.cargo || details.cargoText) setCargoText(act.cargo || details.cargoText);
//             if (details.deliveryTerm) setDeliveryTerm(details.deliveryTerm || "");
            
//             setPackaging(details.packaging || "");
            
//             if (act.type) {
//               setDbType(act.type);
//               if (["ttn", "smr"].includes(act.type)) setDocType(act.type);
//             }
//             if (details.docAttrs) setDocAttrs(prev => ({ ...prev, ...details.docAttrs }));
            
//             setInsured(!!details.insured);
//             setCargoValue(details.cargoValue || "");
            
//             if (Array.isArray(details.cargoRows) && details.cargoRows.length > 0) {
//               setCargoRows(details.cargoRows);
//             } else {
//               setCargoRows([{ id: safeUuid(), title: "", seats: 1, length: "", width: "", height: "", weight: "", volume: 0, volWeight: 0 }]);
//             }
            
//             if (typeof details.isWarehouse === 'boolean') {
//               setIsWarehouse(details.isWarehouse);
//             }
//             if (Array.isArray(details.warehouseServices) && details.warehouseServices.length > 0) {
//               setWarehouseServices(details.warehouseServices);
//             } else {
//               setWarehouseServices([{ id: safeUuid(), name: "", qty: 1, price: 0, total: 0 }]);
//             }
//           }
//         } catch (e) {
//           console.error("Failed to load act for edit", e);
//           alert("Ошибка при загрузке данных заявки. Пожалуйста, попробуйте обновить страницу.");
//         } finally {
//           setIsDataLoading(false);
//         }
//       } else {
//         setSelectedCompanyId(getSelectedCompanyId() || "");
        
//         // Initial defaults for new acts
//         setCargoRows([{ id: safeUuid(), title: "", seats: 1, length: "", width: "", height: "", weight: "", volume: 0, volWeight: 0 }]);
//         setWarehouseServices([{ id: safeUuid(), name: "", qty: 1, price: 0, total: 0 }]);

//         const params = new URLSearchParams(location.search);
//         if (params.get("type") === "warehouse") {
//           setIsWarehouse(true);
//         }
//       }
//     };
//     loadData();
//   }, [id, isEditMode, location.search]);

//   const loadCounterparties = async () => {
//     try {
//       const data = await api.counterparties.list();
//       setAllCounterparties(Array.isArray(data) ? data : []);
//     } catch (e) {
//       console.error("Failed to load counterparties", e);
//     }
//   };

//   useEffect(() => {
//     loadCounterparties();
//   }, []);

//   const filteredCPs = useMemo(() => {
//     const s = cpSearchQuery.toLowerCase().trim();
//     if (!s) return allCounterparties;
//     return allCounterparties.filter(c => 
//       c.name.toLowerCase().includes(s) || 
//       (c.companyName && c.companyName.toLowerCase().includes(s)) ||
//       (c.bin && c.bin.includes(s))
//     );
//   }, [allCounterparties, cpSearchQuery]);

//   const selectCP = (cp) => {
//     const data = {
//       fio: cp.name || "",
//       phone: cp.phone || "",
//       companyName: cp.companyName || "",
//       email: cp.email || "",
//       bin: cp.bin || "",
//       jurAddress: cp.address || "",
//       factAddress: cp.address || "",
//       account: cp.account || "",
//       bank: cp.bank || "",
//       bik: cp.bik || "",
//       kbe: cp.kbe || "",
//     };

//     if (cpSearchModal === 'customer') {
//       setCustomer(prev => ({ ...prev, ...data }));
//       setSelectedCpObjCustomer(cp);
//       setSaveAsCpCustomer(false);
//     } else if (cpSearchModal === 'receiver') {
//       setReceiver(prev => ({ ...prev, ...data }));
//       setSelectedCpObjReceiver(cp);
//       setSaveAsCpReceiver(false);
//     } else if (cpSearchModal === 'sender') {
//       setSender(prev => ({ ...prev, ...data }));
//     }
//     setCpSearchModal(null);
//     setCpSearchQuery("");
//   };

//   // Хелперы для изменения строк
//   const updateRow = (id, field, val) => {
//     setCargoRows((prev) =>
//       prev.map((r) => {
//         if (r.id !== id) return r;
//         const next = { ...r, [field]: val };
        
//         // Авторасчет объема (м3) и объемного веса (кг)
//         if (["length", "width", "height"].includes(field)) {
//           // Ввод теперь снова в сантиметрах
//           const l = parseFloat(next.length) || 0;
//           const w = parseFloat(next.width) || 0;
//           const h = parseFloat(next.height) || 0;
          
//           const v = l * w * h; // Объем в см3
//           const vw = (l * w * h) / 6000; // Объемный вес в кг
          
//           next.volume = v > 0 ? parseFloat(v.toFixed(0)) : 0;
//           next.volWeight = vw > 0 ? parseFloat(vw.toFixed(2)) : 0;
//         }
//         return next;
//       })
//     );
//   };

//   const addRow = () => {
//     setCargoRows((prev) => [
//       ...prev,
//       {
//         id: safeUuid(),
//         title: "",
//         seats: 1,
//         length: "", // Default empty
//         width: "",
//         height: "",
//         weight: "",
//         volume: 0,
//         volWeight: 0,
//       },
//     ]);
//   };

//   const delRow = (id) => {
//     setCargoRows((prev) => prev.filter((r) => r.id !== id));
//   };

//   // Итоги
//   const totals = useMemo(() => {
//     return cargoRows.reduce(
//       (acc, r) => {
//         acc.seats += parseFloat(r.seats) || 0;
//         acc.weight += parseFloat(r.weight) || 0;
//         acc.volume += parseFloat(r.volume) || 0;
//         acc.volWeight += parseFloat(r.volWeight) || 0;
//         return acc;
//       },
//       { seats: 0, weight: 0, volume: 0, volWeight: 0 }
//     );
//   }, [cargoRows]);

//   const [attemptedSave, setAttemptedSave] = useState(false);


//   const isCustomerModified = useMemo(() => {
//     if (!selectedCpObjCustomer) return true;
//     return customer.fio !== selectedCpObjCustomer.name || 
//            customer.phone !== (selectedCpObjCustomer.phone || "") ||
//            customer.companyName !== (selectedCpObjCustomer.companyName || "") ||
//            customer.email !== (selectedCpObjCustomer.email || "") ||
//            customer.bin !== (selectedCpObjCustomer.bin || "");
//   }, [customer, selectedCpObjCustomer]);

//   const isReceiverModified = useMemo(() => {
//     if (!selectedCpObjReceiver) return true;
//     return receiver.fio !== selectedCpObjReceiver.name || 
//            receiver.phone !== (selectedCpObjReceiver.phone || "") ||
//            receiver.companyName !== (selectedCpObjReceiver.companyName || "") ||
//            receiver.email !== (selectedCpObjReceiver.email || "") ||
//            receiver.bin !== (selectedCpObjReceiver.bin || "");
//   }, [receiver, selectedCpObjReceiver]);

//   const onSave = async () => {
//     if (loading) return;
//     setLoading(true);
//     setAttemptedSave(true);
    
//     // Find selected company object
//     const company = allCompanies.find(c => c.id === selectedCompanyId);
    
//     // 1. Упрощенная валидация (только компания и дата для генерации номера)
//     if (!selectedCompanyId || !date) {
//        alert("Пожалуйста, заполните дату и выберите компанию.");
//        return;
//     }

//     // 2. Реквизиты (Нужны для статуса "Заявка")
//     const checkReqs = (obj) => {
//         return obj.jurAddress && obj.bin && obj.account && obj.bank && obj.bik;
//     };

//     const reqsComplete = checkReqs(customer) && checkReqs(receiver);
//     const status = (isWarehouse || reqsComplete) ? "act" : "draft";
    
//     const actData = {
//       date,
//       createdAt,
//       customer,
//       receiver,
//       sender: isSenderSameAsCustomer ? null : sender,
//       isSenderSameAsCustomer,
//       route,
//       cargoText,
//       packaging,
//       cargoRows,
//       totals,
//       deliveryTerm,
//       insured,
//       cargoValue,
//       docType,
//       docAttrs,
//       totalSum,
//       isWarehouse,
//       warehouseServices,
//       companyId: selectedCompanyId, 
//       status, 
//       type: docType || dbType || 'REQUEST',
//     };

//     try {
//       if (isEditMode) {
//         // Если компания изменилась - генерируем новый номер
//         const currentAct = await api.requests.get(id);
//         if (currentAct && currentAct.companyId !== selectedCompanyId) {
//             actData.docNumber = await genNumber(company);
//         }
//         await api.requests.update(id, actData);
//       } else {
//         const docNumber = await genNumber(company);
//         await api.requests.create({
//           docNumber,
//           ...actData
//         });
//       }

//       // Сохранение новых контрагентов
//       if (!isEditMode) {
//         if (saveAsCpCustomer && customer.fio) {
//           await api.counterparties.create({ ...customer, companyId: selectedCompanyId, name: customer.fio });
//         }
//         if (saveAsCpReceiver && receiver.fio) {
//           await api.counterparties.create({ ...receiver, companyId: selectedCompanyId, name: receiver.fio });
//         }
//       }

//       // Синхронизируем глобально выбранную компанию, чтобы заявка не "пропадала" из списка
//       if (selectedCompanyId) {
//           setGlobalSelectedCompanyId(selectedCompanyId);
//       }

//       if (isWarehouse) {
//         alert("Складская заявка успешно создана!");
//       }
//       nav(-1);
//     } catch (err) {
//       console.error('Save error:', err);
//       alert('Ошибка при сохранении: ' + err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (isDataLoading) {
//     return (
//       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
//         <div className="loader"></div>
//         <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Загрузка данных заявки...</div>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="topbar">
//         <div>
//           <div className="crumbs">
//             {location.pathname.startsWith('/deferred') ? 'Отложенные' :
//              location.pathname.startsWith('/smr') ? 'СМР' :
//              location.pathname.startsWith('/requests') ? 'ТТН' :
//              location.pathname.startsWith('/warehouse') ? 'Складские услуги' : 'Заявки'} 
//             {' / '}{isEditMode ? "Редактирование" : "Создать заявку"}
//           </div>
//           <h1>{isEditMode ? "Редактирование заявки" : "Создать заявку"}</h1>
//         </div>
//         <div className="topbar_actions">
//           <button className="btn" onClick={() => nav(-1)}>← Назад</button>
//         </div>
//       </div>

//       <div className="card" style={{ marginTop: 16 }}>
//         <div className="card_head" style={{ cursor: 'pointer' }} onClick={() => setShowCompanyCard(!showCompanyCard)}>
//           <div className="card_title">
//             {showCompanyCard ? "▼" : "▶"} Выбор компании
//           </div>
//         </div>
//         {showCompanyCard && (
//           <div className="card_body">
//              <div className="field">
//                 <select 
//                   style={{ width: "100%", height: 44, fontSize: 16, fontWeight: 700 }}
//                   value={selectedCompanyId}
//                   onChange={e => setSelectedCompanyId(e.target.value)}
//                 >
//                   <option value="">-- Выберите компанию --</option>
//                   {allCompanies.map(c => (
//                     <option key={c.id} value={c.id}>{c.name}</option>
//                   ))}
//                 </select>
//              </div>
//           </div>
//         )}
//       </div>

//       <div className="card" style={{ marginTop: 16, border: isWarehouse ? '2px solid #52c41a' : 'none' }}>
//         <div className="card_body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
//            <label style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
//               <input 
//                 type="checkbox" 
//                 style={{ width: 20, height: 20 }}
//                 checked={isWarehouse}
//                 onChange={e => setIsWarehouse(e.target.checked)}
//               />
//               Склад (Складские услуги)
//            </label>
//            {isWarehouse && <span className="badge" style={{ background: '#52c41a', color: '#fff' }}>Режим склада активен</span>}
//         </div>
//       </div>

//       {/* 1. Заказчик */}
//       <div className="card" style={{ marginTop: 16 }}>
//         <div className="card_head" style={{ cursor: 'pointer' }} onClick={() => setShowCustCard(!showCustCard)}>
//           <div className="card_title">
//             {showCustCard ? "▼" : "▶"} 1. Заказчик
//           </div>
//         </div>
//         {showCustCard && (
//           <div className="card_body">
//             <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
//                <button className="btn btn--sm" type="button" onClick={() => setCpSearchModal('customer')}>🔍 Найти в базе</button>
//                {isCustomerModified && (
//                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
//                     <input type="checkbox" checked={saveAsCpCustomer} onChange={e => setSaveAsCpCustomer(e.target.checked)} />
//                     Сохранить как контрагента
//                  </label>
//                )}
//             </div>
//             <div className="form_grid">
//               <div className="field">
//                 <div className="label">ФИО / Название</div>
//                 <input 
//                   value={customer.fio} 
//                   onChange={e => setCustomer({...customer, fio: e.target.value})} 
//                   placeholder="Иванов И.И. / ТОО Ромашка"
//                 />
//               </div>
//               <div className="field">
//                 <div className="label">Телефон</div>
//                 <input 
//                   value={customer.phone} 
//                   onChange={e => setCustomer({...customer, phone: e.target.value})} 
//                   onBlur={async (e) => {
//                     const phone = e.target.value.trim();
//                     if (!phone || phone.length < 5) return;
//                     try {
//                       const allCps = await api.counterparties.list();
//                       const found = (allCps || []).find(cp => 
//                         (cp.phone || '').replace(/\D/g, '') === phone.replace(/\D/g, '') ||
//                         (cp.contactPhone || '').replace(/\D/g, '') === phone.replace(/\D/g, '')
//                       );
//                       if (found && window.confirm(`Найден контрагент: ${found.name}\nПодставить его данные?`)) {
//                         setCustomer(prev => ({
//                           ...prev,
//                           fio: found.name || prev.fio,
//                           companyName: found.companyName || prev.companyName,
//                           email: found.email || prev.email,
//                           bin: found.bin || prev.bin,
//                           jurAddress: found.address || prev.jurAddress,
//                           bank: found.bank || prev.bank,
//                           bik: found.bik || prev.bik,
//                           account: found.account || prev.account,
//                           kbe: found.kbe || prev.kbe,
//                         }));
//                         setSelectedCpObjCustomer(found);
//                       }
//                     } catch (err) {
//                       console.warn('Поиск контрагента по телефону:', err);
//                     }
//                   }}
//                   placeholder="+7..."
//                 />
//               </div>
//                <div className="field">
//                   <div className="label">Название компании</div>
//                   <input 
//                     value={customer.companyName}
//                     onChange={e => setCustomer({...customer, companyName: e.target.value})}
//                     placeholder="Если отличается от ФИО"
//                   />
//                </div>
//                <div className="field">
//                   <div className="label">Email</div>
//                   <input 
//                     value={customer.email}
//                     onChange={e => setCustomer({...customer, email: e.target.value})}
//                     placeholder="customer@example.com"
//                   />
//                </div>
//                <div className="field field--full">
//                  <button 
//                    className="btn btn--sm btn--ghost" 
//                    onClick={() => setShowCustReq(!showCustReq)}
//                  >
//                    {showCustReq ? "▲ Скрыть реквизиты" : "▼ Показать реквизиты"}
//                  </button>
//                </div>
               
//                {showCustReq && (
//                  <>
//                    <div className="field">
//                      <div className="label">Юр. адрес</div>
//                      <input value={customer.jurAddress} onChange={e => setCustomer({...customer, jurAddress: e.target.value})} />
//                    </div>
//                    <div className="field">
//                      <div className="label">Фактический адрес</div>
//                      <input value={customer.factAddress} onChange={e => setCustomer({...customer, factAddress: e.target.value})} />
//                    </div>
//                    <div className="field">
//                      <div className="label">БИН</div>
//                      <input value={customer.bin} onChange={e => setCustomer({...customer, bin: e.target.value})} />
//                    </div>
//                    <div className="field">
//                      <div className="label">Банк</div>
//                      <input value={customer.bank} onChange={e => setCustomer({...customer, bank: e.target.value})} />
//                    </div>
//                    <div className="field">
//                      <div className="label">БИК</div>
//                      <input value={customer.bik} onChange={e => setCustomer({...customer, bik: e.target.value})} />
//                    </div>
//                    <div className="field">
//                      <div className="label">IBAN</div>
//                      <input value={customer.account} onChange={e => setCustomer({...customer, account: e.target.value})} />
//                    </div>
//                    <div className="field">
//                      <div className="label">КБЕ</div>
//                      <input value={customer.kbe} onChange={e => setCustomer({...customer, kbe: e.target.value})} />
//                    </div>
//                  </>
//                )}
//             </div>
            
//             <div style={{ marginTop: 20, padding: "12px 0", borderTop: "1px solid #eee" }}>
//               <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, cursor: "pointer" }}>
//                 <input
//                   type="checkbox"
//                   checked={isSenderSameAsCustomer}
//                   onChange={(e) => setIsSenderSameAsCustomer(e.target.checked)}
//                 />
//                 Заказчик является отправителем
//               </label>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* 1.1 Отправитель (Грузоотправитель) */}
//       {!isSenderSameAsCustomer && (
//         <div className="card" style={{ marginTop: 16 }}>
//           <div className="card_head" style={{ cursor: 'pointer' }} onClick={() => setShowSendCard(!showSendCard)}>
//             <div className="card_title">
//               {showSendCard ? "▼" : "▶"} 1.1 Грузоотправитель
//             </div>
//           </div>
//           {showSendCard && (
//             <div className="card_body">
//                <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
//                  <button className="btn btn--sm" type="button" onClick={() => setCpSearchModal('sender')}>🔍 Найти в базе</button>
//                </div>
//                <div className="form_grid">
//                 <div className="field">
//                   <div className="label">ФИО / Название</div>
//                   <input 
//                     value={sender.fio} 
//                     onChange={e => setSender({...sender, fio: e.target.value})} 
//                     placeholder="Отправитель / Склад"
//                   />
//                 </div>
//                 <div className="field">
//                   <div className="label">Телефон</div>
//                   <input 
//                     value={sender.phone} 
//                     onChange={e => setSender({...sender, phone: e.target.value})} 
//                     placeholder="+7..."
//                   />
//                 </div>
//                 <div className="field">
//                   <div className="label">Название компании</div>
//                   <input 
//                     value={sender.companyName}
//                     onChange={e => setSender({...sender, companyName: e.target.value})}
//                   />
//                 </div>
//                 <div className="field">
//                   <div className="label">Email</div>
//                   <input 
//                     value={sender.email}
//                     onChange={e => setSender({...sender, email: e.target.value})}
//                   />
//                 </div>
//                 <div className="field field--full">
//                   <button 
//                     className="btn btn--sm btn--ghost" 
//                     onClick={() => setShowSendReq(!showSendReq)}
//                   >
//                     {showSendReq ? "▲ Скрыть реквизиты" : "▼ Показать реквизиты"}
//                   </button>
//                 </div>
                
//                 {showSendReq && (
//                   <>
//                     <div className="field">
//                       <div className="label">Юр. адрес</div>
//                       <input value={sender.jurAddress} onChange={e => setSender({...sender, jurAddress: e.target.value})} />
//                     </div>
//                     <div className="field">
//                       <div className="label">Фактический адрес</div>
//                       <input value={sender.factAddress} onChange={e => setSender({...sender, factAddress: e.target.value})} />
//                     </div>
//                     <div className="field">
//                       <div className="label">БИН</div>
//                       <input value={sender.bin} onChange={e => setSender({...sender, bin: e.target.value})} />
//                     </div>
//                     <div className="field">
//                       <div className="label">Банк</div>
//                       <input value={sender.bank} onChange={e => setSender({...sender, bank: e.target.value})} />
//                     </div>
//                     <div className="field">
//                       <div className="label">БИК</div>
//                       <input value={sender.bik} onChange={e => setSender({...sender, bik: e.target.value})} />
//                     </div>
//                     <div className="field">
//                       <div className="label">IBAN</div>
//                       <input value={sender.account} onChange={e => setSender({...sender, account: e.target.value})} />
//                     </div>
//                     <div className="field">
//                       <div className="label">КБЕ</div>
//                       <input value={sender.kbe} onChange={e => setSender({...sender, kbe: e.target.value})} />
//                     </div>
//                   </>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* 2. Получатель */}
//       <div className="card" style={{ marginTop: 14 }}>
//         <div className="card_head" style={{ cursor: 'pointer' }} onClick={() => setShowRecCard(!showRecCard)}>
//           <div className="card_title">
//             {showRecCard ? "▼" : "▶"} 2. Получатель
//           </div>
//         </div>
//         {showRecCard && (
//         <div className="card_body">
//            <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
//              <button className="btn btn--sm" type="button" onClick={() => setCpSearchModal('receiver')}>🔍 Найти в базе</button>
//              {isReceiverModified && (
//                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
//                   <input type="checkbox" checked={saveAsCpReceiver} onChange={e => setSaveAsCpReceiver(e.target.checked)} />
//                   Сохранить как контрагента
//                </label>
//              )}
//            </div>
//           <div className="form_grid">
//             <div className="field">
//               <div className="label">ФИО / Название</div>
//               <input 
//                 value={receiver.fio} 
//                 onChange={e => setReceiver({...receiver, fio: e.target.value})} 
//                 placeholder="Сидоров С.С."
//               />
//             </div>
//             <div className="field">
//               <div className="label">Телефон</div>
//               <input 
//                 value={receiver.phone} 
//                 onChange={e => setReceiver({...receiver, phone: e.target.value})} 
//                 placeholder="+7..."
//               />
//             </div>
//              <div className="field">
//                 <div className="label">Название компании</div>
//                 <input 
//                   value={receiver.companyName}
//                   onChange={e => setReceiver({...receiver, companyName: e.target.value})}
//                 />
//              </div>
//              <div className="field">
//                 <div className="label">Email</div>
//                 <input 
//                   value={receiver.email}
//                   onChange={e => setReceiver({...receiver, email: e.target.value})}
//                   placeholder="receiver@example.com"
//                 />
//              </div>
//              <div className="field field--full">
//                <button 
//                  className="btn btn--sm btn--ghost" 
//                  onClick={() => setShowRecReq(!showRecReq)}
//                >
//                  {showRecReq ? "▲ Скрыть реквизиты" : "▼ Показать реквизиты"}
//                </button>
//              </div>
             
//              {showRecReq && (
//                <>
//                  <div className="field">
//                    <div className="label">Юр. адрес</div>
//                    <input value={receiver.jurAddress} onChange={e => setReceiver({...receiver, jurAddress: e.target.value})} />
//                  </div>
//                  <div className="field">
//                    <div className="label">Фактический адрес</div>
//                    <input value={receiver.factAddress} onChange={e => setReceiver({...receiver, factAddress: e.target.value})} />
//                  </div>
//                  <div className="field">
//                    <div className="label">БИН</div>
//                    <input value={receiver.bin} onChange={e => setReceiver({...receiver, bin: e.target.value})} />
//                  </div>
//                  <div className="field">
//                    <div className="label">Банк</div>
//                    <input value={receiver.bank} onChange={e => setReceiver({...receiver, bank: e.target.value})} />
//                  </div>
//                  <div className="field">
//                    <div className="label">БИК</div>
//                    <input value={receiver.bik} onChange={e => setReceiver({...receiver, bik: e.target.value})} />
//                  </div>
//                  <div className="field">
//                    <div className="label">Счет</div>
//                    <input value={receiver.account} onChange={e => setReceiver({...receiver, account: e.target.value})} />
//                  </div>
//                  <div className="field">
//                    <div className="label">КБЕ</div>
//                    <input value={receiver.kbe} onChange={e => setReceiver({...receiver, kbe: e.target.value})} />
//                  </div>
//                </>
//               )}
//            </div>
//          </div>
//          )}
//       </div>
//       <div className="card" style={{ marginTop: 14 }}>
//         <div className="card_head" style={{ cursor: 'pointer' }} onClick={() => setShowRouteCard(!showRouteCard)}>
//           <div className="card_title">
//             {showRouteCard ? "▼" : "▶"} 3. Груз и услуги
//           </div>
//         </div>
//         {showRouteCard && (
//           <div className="card_body">
//             <div className="form_grid">
//               <div className="field">
//                 <div className="label">Страна, город отправителя</div>
//                 <input
//                   value={route.fromCity}
//                   onChange={(e) => setRoute({...route, fromCity: e.target.value})}
//                   placeholder="Алматы"
//                 />
//               </div>
//               <div className="field">
//                 <div className="label">Страна, город получателя</div>
//                 <input
//                   value={route.toCity}
//                   onChange={(e) => setRoute({...route, toCity: e.target.value})}
//                   placeholder="Астана"
//                 />
//               </div>
//               <div className="field">
//                 <div className="label">Адрес отправителя</div>
//                 <input
//                   value={route.fromAddress}
//                   onChange={(e) => setRoute({...route, fromAddress: e.target.value})}
//                 />
//               </div>
//               <div className="field">
//                 <div className="label">Адрес получателя</div>
//                 <input
//                   value={route.toAddress}
//                   onChange={(e) => setRoute({...route, toAddress: e.target.value})}
//                 />
//               </div>
//               <div className="field field--full">
//                 <div className="label">Комментарии</div>
//                 <textarea
//                   value={route.comment}
//                   onChange={(e) => setRoute({...route, comment: e.target.value})}
//                   placeholder="Звонить за 30 минут..."
//                 />
//               </div>
//               <div className="field field--full">
//                 <div className="label">Наименование и характер груза</div>
//                 <textarea
//                   value={cargoText}
//                   onChange={(e) => setCargoText(e.target.value)}
//                   placeholder="Бытовая техника, хрупкое..."
//                 />
//               </div>

//               <div className="field field--full">
//                 <div className="label">Срок доставки</div>
//                 <input 
//                   value={deliveryTerm}
//                   onChange={e => setDeliveryTerm(e.target.value)}
//                   placeholder="Напр. 3-5 дней"
//                 />
//               </div>
//             </div>

//             <div className="table_wrap" style={{ marginTop: 16, maxHeight: "500px", overflowY: "auto", overflowX: "auto" }}>
//               <table className="table_fixed">
//                 <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
//                   <tr>
//                     <th style={{width: 40}}>№</th>
//                     <th>Название</th>
//                     <th>Кол-во</th>
//                     <th>Длина (см)</th>
//                     <th>Ширина (см)</th>
//                     <th>Высота (см)</th>
//                     <th>Вес (кг)</th>
//                     <th>Объем (см³)</th>
//                     <th>Об. вес (кг)</th>
//                     <th style={{width: 80}}></th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {cargoRows.map((r, i) => (
//                     <tr key={r.id}>
//                       <td>{i+1}</td>
//                       <td><input className="cell_input" value={r.title} onChange={e => updateRow(r.id, 'title', e.target.value)} placeholder="Напр. Коробки" /></td>
//                       <td><input type="number" className="cell_input" value={r.seats} onChange={e => updateRow(r.id, 'seats', e.target.value)} /></td>
//                       <td><input type="number" className="cell_input" value={r.length} onChange={e => updateRow(r.id, 'length', e.target.value)} placeholder="" /></td>
//                       <td><input type="number" className="cell_input" value={r.width} onChange={e => updateRow(r.id, 'width', e.target.value)} placeholder="" /></td>
//                       <td><input type="number" className="cell_input" value={r.height} onChange={e => updateRow(r.id, 'height', e.target.value)} placeholder="" /></td>
//                       <td><input type="number" className="cell_input" value={r.weight} onChange={e => updateRow(r.id, 'weight', e.target.value)} placeholder="" /></td>
//                       <td>{r.volume}</td>
//                       <td>{r.volWeight}</td>
//                       <td><button className="btn btn--sm btn--danger" onClick={() => delRow(r.id)}>x</button></td>
//                     </tr>
//                   ))}
//                 </tbody>
//                 <tfoot style={{background: '#f5f5f5', fontWeight: 700, position: "sticky", bottom: 0}}>
//                   <tr>
//                     <td colSpan={2}>Итого:</td>
//                     <td>{totals.seats}</td>
//                     <td></td>
//                     <td></td>
//                     <td></td>
//                     <td>{totals.weight}</td>
//                     <td>{totals.volume.toFixed(0)}</td>
//                     <td>{totals.volWeight.toFixed(2)}</td>
//                     <td></td>
//                   </tr>
//                 </tfoot>
//               </table>
//                <div
//                 style={{
//                   padding: 12,
//                   display: "flex",
//                   justifyContent: "flex-end",
//                   background: "transparent",
//                   borderTop: "1px solid var(--line)",
//                 }}
//               >
//                 <button className="btn" type="button" onClick={addRow}>
//                   + Добавить строку
//                 </button>
//               </div>
//             </div>

//             <div style={{ marginTop: 24 }}>
//               <div className="card_title" style={{ marginBottom: 12, color: 'var(--text)' }}>
//                 {isWarehouse ? "Складские услуги" : "Услуги"}
//               </div>
//                 <div className="table_wrap">
//                   <table className="table_fixed">
//                      <thead>
//                         <tr>
//                           <th style={{ width: 40 }}>№</th>
//                           <th style={{ minWidth: 300 }}>Наименование услуги</th>
//                           <th style={{ width: 100 }}>Кол-во</th>
//                           <th style={{ width: 120 }}>Цена</th>
//                           <th style={{ width: 120 }}>Сумма</th>
//                           <th style={{ width: 50 }}></th>
//                         </tr>
//                      </thead>
//                      <tbody>
//                         {warehouseServices.map((s, idx) => (
//                           <tr key={s.id}>
//                              <td>{idx + 1}</td>
//                              <td>
//                                <input 
//                                  className="cell_input" 
//                                  style={{ maxWidth: '100%', width: '100%'}}
//                                  value={s.name} 
//                                  onChange={e => {
//                                    const next = [...warehouseServices];
//                                    next[idx].name = e.target.value;
//                                    setWarehouseServices(next);
//                                  }}
//                                  placeholder="Приемка, хранение, паллетирование..."
//                                />
//                              </td>
//                              <td>
//                                <input 
//                                  type="number" 
//                                  className="cell_input" 
//                                  value={s.qty} 
//                                  onChange={e => {
//                                    const next = [...warehouseServices];
//                                    next[idx].qty = parseFloat(e.target.value) || 0;
//                                    next[idx].total = next[idx].qty * next[idx].price;
//                                    setWarehouseServices(next);
//                                  }}
//                                />
//                              </td>
//                              <td>
//                                <input 
//                                  type="number" 
//                                  className="cell_input" 
//                                  value={s.price} 
//                                  onChange={e => {
//                                    const next = [...warehouseServices];
//                                    next[idx].price = parseFloat(e.target.value) || 0;
//                                    next[idx].total = next[idx].qty * next[idx].price;
//                                    setWarehouseServices(next);
//                                  }}
//                                />
//                              </td>
//                              <td style={{ fontWeight: 700 }}>{s.total.toLocaleString()}</td>
//                              <td>
//                                <button className="btn btn--sm btn--danger" onClick={() => {
//                                  if (warehouseServices.length > 1) {
//                                    setWarehouseServices(warehouseServices.filter(x => x.id !== s.id));
//                                  }
//                                }}>x</button>
//                              </td>
//                           </tr>
//                         ))}
//                      </tbody>
//                      <tfoot>
//                          <tr style={{ fontWeight: 700, background: 'transparent' }}>
//                              <td colSpan={2} style={{ textAlign: 'right' }}>Итого:</td>
//                              <td>{warehouseServices.reduce((acc, s) => acc + (parseFloat(s.qty) || 0), 0)}</td>
//                              <td></td>
//                              <td className="card_title card_title--total">
//                                {warehouseServices.reduce((acc, s) => acc + (s.total || 0), 0).toLocaleString()}
//                              </td>
//                              <td></td>
//                          </tr>
//                      </tfoot>
//                   </table>
//                    <div className="table_actions_clean">
//                     <button className="btn" type="button" onClick={() => setWarehouseServices([...warehouseServices, { id: safeUuid(), name: "", qty: 1, price: 0, total: 0 }])}>
//                       + Добавить услугу
//                     </button>
//                   </div>
//                 </div>
//             </div>

//             <div className="form_grid" style={{marginTop: 20}}>
//               <div className="field" style={{ gridColumn: 'span 4' }}>
//                 <div className="label">Вид упаковки</div>
//                 <input value={packaging} onChange={e => setPackaging(e.target.value)} placeholder="Напр. Паллеты, Коробки" />
//               </div>
//                <label style={{ gridColumn: "span 1" }} className="label_checkbox">
//                 <input
//                   type="checkbox"
//                   checked={insured}
//                   onChange={(e) => setInsured(e.target.checked)}
//                 />
//                 Имеется ли страховка?
//               </label>
//               {insured && (
//                 <div className="field" style={{ gridColumn: "span 1" }}>
//                   <div className="label">Стоимость груза по инвойсу</div>
//                   <input 
//                     type="text" 
//                     value={cargoValue} 
//                     onChange={e => setCargoValue(e.target.value)} 
//                     placeholder="Напр. 5 000 000 тенге" 
//                   />
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
            
//             {!isWarehouse && (
//               <div className="card card--transport" style={{ gridColumn: 'span 2', marginTop: 20 }}>
//                    <div className="card_head card_head--transport" onClick={() => setShowTransportCard(!showTransportCard)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                       <div className="card_title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//                          <span style={{ 
//                            transform: showTransportCard ? 'rotate(90deg)' : 'rotate(0deg)', 
//                            transition: 'transform 0.2s',
//                            display: 'inline-block',
//                            fontSize: '0.9rem'
//                          }}>▶</span>
//                          ВИД ТРАНСПОРТА
//                       </div>
//                    </div>
//                    {showTransportCard && (
//                       <div className="card_body">
//                         <div className="form_grid">
//                           <div className="field" style={{ gridColumn: 'span 2' }}>
//                             <div className="label">Вид перевозки <span className="text_danger">*</span></div>
//                             <select 
//                               value={docAttrs.transportType} 
//                               onChange={e => {
//                                 const newVal = e.target.value;
//                                 setDocAttrs({
//                                   ...docAttrs, 
//                                   transportType: newVal,
//                                    vehicleModel: "",
//                                    vehicleNumber: "",
//                                    driver: "",
//                                    hasTrailer: false,
//                                    trailerModel: "",
//                                    trailerNumber: "",
//                                    flightNumber: ""
//                                 });
//                               }}
//                             >
//                               <option value="auto_console">Авто консолидация</option>
//                               <option value="auto_separate">Отдельное авто</option>
//                               <option value="plane">Самолет</option>
//                               <option value="train">Поезд рейс</option>
//                             </select>
//                           </div>
                          
//                           {(docAttrs.transportType === 'auto_console' || docAttrs.transportType === 'auto_separate') && (
//                             <>
//                               <div className="field">
//                                 <div className="label">Марка автомобиля</div>
//                                 <input value={docAttrs.vehicleModel} onChange={e => setDocAttrs({...docAttrs, vehicleModel: e.target.value})} placeholder="Volvo" />
//                               </div>
//                               <div className="field">
//                                 <div className="label">Госномер автомобиля</div>
//                                 <input value={docAttrs.vehicleNumber} onChange={e => setDocAttrs({...docAttrs, vehicleNumber: e.target.value})} placeholder="016ACT02" />
//                               </div>
//                               <div className="field">
//                                 <div className="label">Водитель (Ф.И.О.)</div>
//                                 <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
//                               </div>
//                               <div className="field" style={{ gridColumn: 'span 1' }}>
//                                 <label className="label_checkbox" style={{ marginTop: 32 }}>
//                                   <input 
//                                     type="checkbox" 
//                                     checked={!!docAttrs.hasTrailer} 
//                                     onChange={e => setDocAttrs({...docAttrs, hasTrailer: e.target.checked})} 
//                                   />
//                                   Имеется прицеп
//                                 </label>
//                               </div>
//                               {docAttrs.hasTrailer && (
//                                 <>
//                                   <div className="field">
//                                     <div className="label">Марка прицепа</div>
//                                     <input value={docAttrs.trailerModel} onChange={e => setDocAttrs({...docAttrs, trailerModel: e.target.value})} placeholder="Schmitz" />
//                                   </div>
//                                   <div className="field">
//                                     <div className="label">Госномер прицепа</div>
//                                     <input value={docAttrs.trailerNumber} onChange={e => setDocAttrs({...docAttrs, trailerNumber: e.target.value})} placeholder="21WSZ05" />
//                                   </div>
//                                 </>
//                               )}
//                             </>
//                           )}
  
//                           {docAttrs.transportType === 'plane' && (
//                             <>
//                               <div className="field">
//                                 <div className="label">Номер рейса</div>
//                                 <input value={docAttrs.flightNumber} onChange={e => setDocAttrs({...docAttrs, flightNumber: e.target.value})} />
//                               </div>
//                               <div className="field">
//                                 <div className="label">Ответственный</div>
//                                 <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
//                               </div>
//                             </>
//                           )}
  
//                           {docAttrs.transportType === 'train' && (
//                             <>
//                               <div className="field">
//                                 <div className="label">Поезд / Вагон</div>
//                                 <input value={docAttrs.flightNumber} onChange={e => setDocAttrs({...docAttrs, flightNumber: e.target.value})} />
//                               </div>
//                               <div className="field">
//                                 <div className="label">Ответственный</div>
//                                 <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
//                               </div>
//                             </>)}
//                         </div>
//                       </div>
//                    )}
//                 </div>
//             )}

//             <div className="field" style={{marginTop: 10}}>
//                <div className="label">Сумма (тг)</div>
//              <input 
//                  value={totalSum}
//                  readOnly
//                  style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
//                  placeholder="Рассчитывается автоматически из услуг"
//                />
//             </div>
            
//             <div className="field" style={{marginTop: 10}}>
//                <div className="label">Дата</div>
//                <input 
//                  type="date" 
//                  value={date} 
//                  onChange={e => setDate(e.target.value)} 
//                />
//             </div>

//       {cpSearchModal && (
//         <Modal title="Поиск контрагента" onClose={() => setCpSearchModal(null)}>
//            <div className="field">
//               <div className="label">Поиск (Имя, БИН, Компания)</div>
//               <input 
//                 autoFocus
//                 value={cpSearchQuery} 
//                 onChange={e => setCpSearchQuery(e.target.value)} 
//                 placeholder="Начните вводить..."
//                 className="input"
//                 style={{ width: '100%', padding: '10px' }}
//               />
//            </div>
//            <div className="cp_list" style={{ marginTop: 16, maxHeight: 400, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
//               {filteredCPs.length === 0 ? (
//                 <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>Ничего не найдено</div>
//               ) : (
//                 filteredCPs.map(cp => (
//                   <div key={cp.id} className="cp_item" onClick={() => selectCP(cp)} style={{ 
//                     padding: '12px', borderBottom: '1px solid var(--line)', cursor: 'pointer',
//                     transition: 'background 0.2s'
//                   }}>
//                     <div style={{ fontWeight: 700 }}>{cp.name}</div>
//                     <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
//                       {cp.companyName} {cp.bin && `(БИН: ${cp.bin})`}
//                     </div>
//                   </div>
//                 ))
//               )}
//            </div>
//         </Modal>
//       )}

//           <div className="page_actions" style={{ marginTop: 24, paddingBottom: 40 }}>
//             <button 
//               className="btn btn--accent btn--lg" 
//               style={{ width: "100%", opacity: loading ? 0.7 : 1 }} 
//               onClick={onSave}
//               disabled={loading}
//             >
//               {loading ? "Сохранение данных..." : (isEditMode ? "Сохранить изменения" : "Создать заявку")}
//             </button>
//           </div>
//     </>
//   );
// }


import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompanyId, getSelectedCompany, getCompanies, setSelectedCompanyId as setGlobalSelectedCompanyId } from "../../shared/storage/companyStorage.js";
import Modal from "../../shared/ui/Modal.jsx";

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

async function genNumber(company) {
  let prefix = "T";
  if (company && company.name) {
    const n = company.name.toLowerCase();
    if (n.includes("алдияр")) {
      prefix = "A";
    } else if (n.includes("tasu kz") && n.includes("ип")) {
      prefix = "IPT";
    } else if (n.includes("tasu kazakhstan")) {
      prefix = "T";
    } else {
      const cleanName = company.name.replace(/ТОО|ИП|OOO|LLP/gi, "").trim();
      const trans = transliterate(cleanName);
      prefix = (trans.substring(0, 3) || "ACT").toUpperCase();
    }
  }

  let allActs = [];
  try {
     allActs = await api.requests.list();
  } catch (e) {
     console.error("Failed to fetch acts for numbering", e);
  }

  const prefixPattern = new RegExp(`^${prefix}(\\d+)$`);
  let maxNum = 0;

  allActs.forEach(a => {
      const numStr = a.number || a.docNumber;
      if (numStr) {
          const match = numStr.match(prefixPattern);
          if (match) {
              const n = parseInt(match[1], 10);
              if (n > maxNum) maxNum = n;
          }
      }
  });

  const nextNum = maxNum + 1;
  const nextStr = String(nextNum).padStart(6, "0");

  return `${prefix}${nextStr}`;
}

const initialRequisites = {
  jurAddress: "",
  factAddress: "",
  bin: "",
  account: "",
  bank: "",
  bik: "",
  kbe: "",
  email: "",
};

export default function ActCreatePage() {
  const nav = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = !!id;

  const [date, setDate] = useState(todayIso());
  const [createdAt, setCreatedAt] = useState(todayIso());
  const [totalSum, setTotalSum] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [allCompanies, setAllCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  const [customer, setCustomer] = useState({
    fio: "",
    phone: "",
    companyName: "",
    email: "",
    ...initialRequisites,
  });

  const [isSenderSameAsCustomer, setIsSenderSameAsCustomer] = useState(true);
  const [sender, setSender] = useState({
    fio: "",
    phone: "",
    companyName: "",
    email: "",
    ...initialRequisites,
  });

  const [receiver, setReceiver] = useState({
    fio: "",
    phone: "",
    companyName: "",
    email: "",
    ...initialRequisites,
  });

  const [route, setRoute] = useState({
    fromCity: "",
    toCity: "",
    fromAddress: "",
    toAddress: "",
    comment: "",
  });

  const [cargoText, setCargoText] = useState("");
  const [packaging, setPackaging] = useState("");
  const [deliveryTerm, setDeliveryTerm] = useState("");
  const [insured, setInsured] = useState(false);
  const [cargoValue, setCargoValue] = useState("");

  const [cargoRows, setCargoRows] = useState([
    {
      id: safeUuid(),
      title: "",
      seats: 1,
      length: "",
      width: "",
      height: "",
      weight: "",
      volume: 0,
      volWeight: 0,
    },
  ]);

  const [allCounterparties, setAllCounterparties] = useState([]);
  const [cpSearchModal, setCpSearchModal] = useState(null);
  const [saveAsCpCustomer, setSaveAsCpCustomer] = useState(true);
  const [saveAsCpReceiver, setSaveAsCpReceiver] = useState(true);
  const [cpSearchQuery, setCpSearchQuery] = useState("");
  const [selectedCpObjCustomer, setSelectedCpObjCustomer] = useState(null);
  const [selectedCpObjReceiver, setSelectedCpObjReceiver] = useState(null);

  const [isWarehouse, setIsWarehouse] = useState(false);
  const [warehouseServices, setWarehouseServices] = useState([
    { id: safeUuid(), name: "", qty: 1, price: 0, total: 0 }
  ]);

  // ТЗ v3: расчёт по тарифу
  const [allTariffs, setAllTariffs] = useState([]);
  const [calcByCubic, setCalcByCubic] = useState(false);
  const [cubicVolume, setCubicVolume] = useState("");
  // ТЗ: грузчики — галочка + количество, тариф из категории loaders
  const [addLoaders, setAddLoaders] = useState(false);
  const [loadersCount, setLoadersCount] = useState(1);

  const [showCompanyCard, setShowCompanyCard] = useState(false);
  const [showCustCard, setShowCustCard] = useState(false);
  const [showSendCard, setShowSendCard] = useState(false);
  const [showRecCard, setShowRecCard] = useState(false);
  const [showRouteCard, setShowRouteCard] = useState(false);
  const [showTransportCard, setShowTransportCard] = useState(false);

  const [showCustReq, setShowCustReq] = useState(false);
  const [showSendReq, setShowSendReq] = useState(false);
  const [showRecReq, setShowRecReq] = useState(false);

  const [isDataLoading, setIsDataLoading] = useState(false);

  // ТЗ v2.2: totalSum всегда = сумма услуг
  useEffect(() => {
    const sum = warehouseServices.reduce((acc, s) => acc + (s.total || 0), 0);
    setTotalSum(sum > 0 ? sum.toString() : "");
  }, [warehouseServices]);

  // ТЗ v3: загрузка тарифов
  useEffect(() => {
    api.tariffs.list().then(data => {
      setAllTariffs(Array.isArray(data) ? data : []);
    }).catch(e => console.error("Не удалось загрузить тарифы:", e));
  }, []);

  // ТЗ v3: функция расчёта по тарифу с учётом регионов
  const calculateByTariff = () => {
    if (!route.toCity) { alert("Сначала выберите город получателя"); return; }
    const cityClean = route.toCity.replace(/__PRIVATE$/, "").trim().toLowerCase();

    // Сначала ищем прямой тариф для этого города
    let tariff = allTariffs.find(t =>
      (t.city || "").replace(/__PRIVATE$/, "").trim().toLowerCase() === cityClean
    );

    // Если прямого нет — ищем тариф где этот город указан как регион
    let regionalExtra = 0;
    let regionalDescription = "";
    if (!tariff) {
      for (const t of allTariffs) {
        const wr = t.weightRanges || {};
        const regions = Array.isArray(wr._regionalDeliveries) ? wr._regionalDeliveries : [];
        const match = regions.find(r => (r.region || "").trim().toLowerCase() === cityClean);
        if (match) {
          tariff = t;
          // Считаем доплату за регион по весу
          const totalWeightForRegion = cargoRows.reduce((acc, r) => acc + (parseFloat(r.weight) || 0), 0);
          const sortedRanges = [...(match.ranges || [])].sort((a, b) => (a.maxWeight || 0) - (b.maxWeight || 0));
          for (const range of sortedRanges) {
            if (totalWeightForRegion <= (range.maxWeight || 0)) {
              regionalExtra = range.extra || 0;
              regionalDescription = ` + ${regionalExtra.toLocaleString()} тг доплата за регион ${route.toCity} (до ${range.maxWeight} кг)`;
              break;
            }
          }
          // Если вес больше всех диапазонов — берём максимальный
          if (regionalExtra === 0 && sortedRanges.length > 0) {
            const maxRange = sortedRanges[sortedRanges.length - 1];
            regionalExtra = maxRange.extra || 0;
            regionalDescription = ` + ${regionalExtra.toLocaleString()} тг доплата за регион ${route.toCity}`;
          }
          break;
        }
      }
    }

    if (!tariff) { alert(`Тариф для направления "${route.toCity}" не найден. Добавьте его в Тарифы (или укажите регион в тарифе ближайшего города).`); return; }

    const totalWeight = cargoRows.reduce((acc, r) => acc + (parseFloat(r.weight) || 0), 0);
    // ТЗ финал: volume хранится в см³, для тарифа КУБ нужны м³ (1 м³ = 1 000 000 см³)
    const totalVolumeCm3 = cargoRows.reduce((acc, r) => acc + (parseFloat(r.volume) || 0), 0);
    const totalVolume = totalVolumeCm3 / 1000000;

    let sum = 0;
    let description = "";

    if (calcByCubic) {
      const vol = parseFloat(cubicVolume) || totalVolume || 0;
      if (vol <= 0) { alert("Укажите объём в м³"); return; }
const wrAll = tariff.weightRanges || {};
      const pricePerCubic = parseFloat(wrAll._pricePerCubic) || parseFloat(tariff.pricePerCubic) || 0;      if (pricePerCubic <= 0) { alert("Для этого направления не задан тариф КУБ"); return; }
      sum = vol * pricePerCubic;
      description = `Доставка ${route.toCity} (${vol} м³ × ${pricePerCubic.toLocaleString()} тг/м³)`;
    } else {
      if (totalWeight <= 0) { alert("Укажите вес груза"); return; }
     const wr = tariff.weightRanges || {};
      const r10 = parseFloat(wr.r10) || 0;
      const r20 = parseFloat(wr.r20) || 0;
      const overKg = parseFloat(wr._pricePerKgOver20) || parseFloat(tariff.pricePerKgOver20) || 0;

      if (totalWeight <= 10) {
        sum = r10 || (totalWeight * overKg);
        description = `Доставка ${route.toCity} (до 10 кг)`;
      } else if (totalWeight <= 20) {
        sum = r20 || (totalWeight * overKg);
        description = `Доставка ${route.toCity} (до 20 кг)`;
      } else {
        // ТЗ финал: ВЕСЬ вес × цена за кг свыше (а не "r20 + остаток")
        sum = totalWeight * overKg;
        description = `Доставка ${route.toCity} (${totalWeight} кг × ${overKg.toLocaleString()} тг/кг)`;
      }

      // ТЗ финал: max(вес, куб) — если объём задан, считаем оба и берём БОЛЬШУЮ сумму
      const totalVol = parseFloat(cubicVolume) || totalVolume || 0;
      const pricePerCubicMax = parseFloat(wr._pricePerCubic) || parseFloat(tariff.pricePerCubic) || 0;
      if (totalVol > 0 && pricePerCubicMax > 0) {
        const sumByCube = totalVol * pricePerCubicMax;
        if (sumByCube > sum) {
          sum = sumByCube;
          description = `Доставка ${route.toCity} (${totalVol} м³ × ${pricePerCubicMax.toLocaleString()} тг/м³) [макс из 2]`;
        } else {
          description += ` [макс из 2: вес=${sum.toLocaleString()}тг, куб=${sumByCube.toLocaleString()}тг]`;
        }
      }
    }

    // Добавляем региональную доплату
    if (regionalExtra > 0) {
      sum += regionalExtra;
      description += regionalDescription;
    }

    sum = Math.round(sum);
    setWarehouseServices(prev => {
      const filtered = prev.filter(s => s.name || s.price);
      return [...filtered, { id: safeUuid(), name: description, qty: 1, price: sum, total: sum }];
    });
    alert(`Добавлена услуга: ${description}\nСумма: ${sum.toLocaleString()} тг`);
  };

  // ТЗ: добавить грузчиков — берём тариф категории loaders по городу, цену по весу × количество
  const addLoadersService = () => {
    if (!route.toCity) { alert("Сначала выберите город получателя"); return; }
    const count = parseInt(loadersCount) || 0;
    if (count <= 0) { alert("Укажите количество грузчиков"); return; }
    const cityClean = route.toCity.replace(/__PRIVATE$/, "").trim().toLowerCase();

    // Ищем тариф грузчиков (категория loaders) для этого города
    const getCategory = (t) => {
      const wr = t.weightRanges || {};
      return wr._category || (t.isPrivate ? 'private' : 'legal');
    };
    // В базе город грузчиков хранится с суффиксом __LOADERS — чистим перед сравнением
    const tariff = allTariffs.find(t =>
      getCategory(t) === 'loaders' &&
      (t.city || "").replace(/__LOADERS$/, "").replace(/__CARRIERS$/, "").replace(/__PRIVATE$/, "").trim().toLowerCase() === cityClean
    );

    if (!tariff) {
      alert(`Тариф грузчиков для города "${route.toCity}" не найден. Добавьте его в Тарифы → вкладка «Грузчики».`);
      return;
    }

    // Цена за одного грузчика по весу груза (диапазоны как в обычном тарифе)
    const totalWeight = cargoRows.reduce((acc, r) => acc + (parseFloat(r.weight) || 0), 0);
    const wr = tariff.weightRanges || {};
    let pricePerLoader = 0;
    if (totalWeight <= 10) pricePerLoader = parseFloat(wr.r10) || 0;
    else if (totalWeight <= 20) pricePerLoader = parseFloat(wr.r20) || 0;
    else if (totalWeight <= 30) pricePerLoader = parseFloat(wr.r30) || 0;
    else if (totalWeight <= 80) pricePerLoader = parseFloat(wr.r80) || 0;
    else if (totalWeight <= 150) pricePerLoader = parseFloat(wr.r150) || 0;
    else if (totalWeight <= 300) pricePerLoader = parseFloat(wr.r300) || 0;
    else pricePerLoader = parseFloat(wr.r600) || 0;

    // Если по весу пусто — берём первый непустой диапазон
    if (pricePerLoader <= 0) {
      pricePerLoader = parseFloat(wr.r10) || parseFloat(wr.r20) || parseFloat(wr.r30) ||
                       parseFloat(wr.r80) || parseFloat(wr.r150) || parseFloat(wr.r300) || parseFloat(wr.r600) || 0;
    }

    if (pricePerLoader <= 0) {
      alert(`У тарифа грузчиков "${route.toCity}" не заполнены цены по весу. Откройте Тарифы → Грузчики и задайте суммы.`);
      return;
    }

    const total = pricePerLoader * count;
    const description = `Грузчики ${route.toCity} (${count} чел × ${pricePerLoader.toLocaleString()} тг)`;

    setWarehouseServices(prev => {
      const filtered = prev.filter(s => s.name || s.price);
      return [...filtered, { id: safeUuid(), name: description, qty: count, price: pricePerLoader, total }];
    });
    alert(`Добавлено: ${description}\nСумма: ${total.toLocaleString()} тг`);
  };

  const [docType, setDocType] = useState(null);
  const [dbType, setDbType] = useState("REQUEST");
  const [docAttrs, setDocAttrs] = useState({
    vehicleModel: "",
    vehicleNumber: "",
    driver: "",
    hasTrailer: false,
    trailerModel: "",
    trailerNumber: "",
    transportType: "auto_console",
    flightNumber: "",
    doc5: "", doc6: "", doc13: "", doc14: "", doc15: "", doc18: ""
  });

  useEffect(() => {
    const loadData = async () => {
      const companies = getCompanies();
      setAllCompanies(companies);

      if (isEditMode) {
        setIsDataLoading(true);
        try {
          setCargoRows([]);
          setWarehouseServices([]);
          setCargoText("");

          const act = await api.requests.get(id);
          if (act) {
            setShowCustCard(true);
            setShowRecCard(true);
            setShowRouteCard(true);
            setShowTransportCard(true);
            setDate(act.date || todayIso());
            setCreatedAt(act.createdAt || todayIso());

            let details = {};
            if (act.details) {
              try {
                details = typeof act.details === 'string' ? JSON.parse(act.details) : act.details;
              } catch (e) { console.error("Parse details error", e); }
            }

            setTotalSum(act.totalSum || details.totalSum || "");
            setSelectedCompanyId(act.companyId || "");

            if (details.customer) setCustomer(details.customer);
            if (details.receiver) setReceiver(details.receiver);
            if (details.sender) setSender(details.sender);

            if (typeof details.isSenderSameAsCustomer === 'boolean') {
              setIsSenderSameAsCustomer(details.isSenderSameAsCustomer);
            }
            if (details.route) setRoute(details.route);
            if (act.cargo || details.cargoText) setCargoText(act.cargo || details.cargoText);
            if (details.deliveryTerm) setDeliveryTerm(details.deliveryTerm || "");

            setPackaging(details.packaging || "");

            if (act.type) {
              setDbType(act.type);
              if (["ttn", "smr"].includes(act.type)) setDocType(act.type);
            }
            if (details.docAttrs) setDocAttrs(prev => ({ ...prev, ...details.docAttrs }));

            setInsured(!!details.insured);
            setCargoValue(details.cargoValue || "");

            if (Array.isArray(details.cargoRows) && details.cargoRows.length > 0) {
              setCargoRows(details.cargoRows);
            } else {
              setCargoRows([{ id: safeUuid(), title: "", seats: 1, length: "", width: "", height: "", weight: "", volume: 0, volWeight: 0 }]);
            }

            if (typeof details.isWarehouse === 'boolean') {
              setIsWarehouse(details.isWarehouse);
            }
            if (Array.isArray(details.warehouseServices) && details.warehouseServices.length > 0) {
              setWarehouseServices(details.warehouseServices);
            } else {
              setWarehouseServices([{ id: safeUuid(), name: "", qty: 1, price: 0, total: 0 }]);
            }
          }
        } catch (e) {
          console.error("Failed to load act for edit", e);
          alert("Ошибка при загрузке данных заявки. Пожалуйста, попробуйте обновить страницу.");
        } finally {
          setIsDataLoading(false);
        }
      } else {
        setSelectedCompanyId(getSelectedCompanyId() || "");

        setCargoRows([{ id: safeUuid(), title: "", seats: 1, length: "", width: "", height: "", weight: "", volume: 0, volWeight: 0 }]);
        setWarehouseServices([{ id: safeUuid(), name: "", qty: 1, price: 0, total: 0 }]);

        const params = new URLSearchParams(location.search);
        if (params.get("type") === "warehouse") {
          setIsWarehouse(true);
        }
      }
    };
    loadData();
  }, [id, isEditMode, location.search]);

  const loadCounterparties = async () => {
    try {
      const data = await api.counterparties.list();
      setAllCounterparties(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load counterparties", e);
    }
  };

  useEffect(() => {
    loadCounterparties();
  }, []);

  const filteredCPs = useMemo(() => {
    const s = cpSearchQuery.toLowerCase().trim();
    if (!s) return allCounterparties;
    return allCounterparties.filter(c =>
      c.name.toLowerCase().includes(s) ||
      (c.companyName && c.companyName.toLowerCase().includes(s)) ||
      (c.bin && c.bin.includes(s))
    );
  }, [allCounterparties, cpSearchQuery]);

  const selectCP = (cp) => {
    const data = {
      fio: cp.name || "",
      phone: cp.phone || "",
      companyName: cp.companyName || "",
      email: cp.email || "",
      bin: cp.bin || "",
      jurAddress: cp.address || "",
      factAddress: cp.address || "",
      account: cp.account || "",
      bank: cp.bank || "",
      bik: cp.bik || "",
      kbe: cp.kbe || "",
    };

    if (cpSearchModal === 'customer') {
      setCustomer(prev => ({ ...prev, ...data }));
      setSelectedCpObjCustomer(cp);
      setSaveAsCpCustomer(false);
    } else if (cpSearchModal === 'receiver') {
      setReceiver(prev => ({ ...prev, ...data }));
      setSelectedCpObjReceiver(cp);
      setSaveAsCpReceiver(false);
    } else if (cpSearchModal === 'sender') {
      setSender(prev => ({ ...prev, ...data }));
    }
    setCpSearchModal(null);
    setCpSearchQuery("");
  };

  const updateRow = (id, field, val) => {
    setCargoRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [field]: val };

        if (["length", "width", "height"].includes(field)) {
          const l = parseFloat(next.length) || 0;
          const w = parseFloat(next.width) || 0;
          const h = parseFloat(next.height) || 0;

          const v = l * w * h;
          const vw = (l * w * h) / 6000;

          next.volume = v > 0 ? parseFloat(v.toFixed(0)) : 0;
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
        title: "",
        seats: 1,
        length: "",
        width: "",
        height: "",
        weight: "",
        volume: 0,
        volWeight: 0,
      },
    ]);
  };

  const delRow = (id) => {
    setCargoRows((prev) => prev.filter((r) => r.id !== id));
  };

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

  const [attemptedSave, setAttemptedSave] = useState(false);

  const isCustomerModified = useMemo(() => {
    if (!selectedCpObjCustomer) return true;
    return customer.fio !== selectedCpObjCustomer.name ||
           customer.phone !== (selectedCpObjCustomer.phone || "") ||
           customer.companyName !== (selectedCpObjCustomer.companyName || "") ||
           customer.email !== (selectedCpObjCustomer.email || "") ||
           customer.bin !== (selectedCpObjCustomer.bin || "");
  }, [customer, selectedCpObjCustomer]);

  const isReceiverModified = useMemo(() => {
    if (!selectedCpObjReceiver) return true;
    return receiver.fio !== selectedCpObjReceiver.name ||
           receiver.phone !== (selectedCpObjReceiver.phone || "") ||
           receiver.companyName !== (selectedCpObjReceiver.companyName || "") ||
           receiver.email !== (selectedCpObjReceiver.email || "") ||
           receiver.bin !== (selectedCpObjReceiver.bin || "");
  }, [receiver, selectedCpObjReceiver]);

  const onSave = async () => {
    if (loading) return;
    setLoading(true);
    setAttemptedSave(true);

    const company = allCompanies.find(c => c.id === selectedCompanyId);

    if (!selectedCompanyId || !date) {
       alert("Пожалуйста, заполните дату и выберите компанию.");
       return;
    }

    const checkReqs = (obj) => {
        return obj.jurAddress && obj.bin && obj.account && obj.bank && obj.bik;
    };

    const reqsComplete = checkReqs(customer) && checkReqs(receiver);
    const status = (isWarehouse || reqsComplete) ? "act" : "draft";

    const actData = {
      date,
      createdAt,
      customer,
      receiver,
      sender: isSenderSameAsCustomer ? null : sender,
      isSenderSameAsCustomer,
      route,
      cargoText,
      packaging,
      cargoRows,
      totals,
      deliveryTerm,
      insured,
      cargoValue,
      docType,
      docAttrs,
      totalSum,
      isWarehouse,
      warehouseServices,
      companyId: selectedCompanyId,
      status,
      type: docType || dbType || 'REQUEST',
    };

    try {
      if (isEditMode) {
        const currentAct = await api.requests.get(id);
        if (currentAct && currentAct.companyId !== selectedCompanyId) {
            actData.docNumber = await genNumber(company);
        }
        await api.requests.update(id, actData);
      } else {
        const docNumber = await genNumber(company);
        await api.requests.create({
          docNumber,
          ...actData
        });
      }

      if (!isEditMode) {
        if (saveAsCpCustomer && customer.fio) {
          await api.counterparties.create({ ...customer, companyId: selectedCompanyId, name: customer.fio });
        }
        if (saveAsCpReceiver && receiver.fio) {
          await api.counterparties.create({ ...receiver, companyId: selectedCompanyId, name: receiver.fio });
        }
      }

      if (selectedCompanyId) {
          setGlobalSelectedCompanyId(selectedCompanyId);
      }

      if (isWarehouse) {
        alert("Складская заявка успешно создана!");
      }
      nav(-1);
    } catch (err) {
      console.error('Save error:', err);
      alert('Ошибка при сохранении: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isDataLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="loader"></div>
        <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Загрузка данных заявки...</div>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumbs">
            {location.pathname.startsWith('/deferred') ? 'Отложенные' :
             location.pathname.startsWith('/smr') ? 'СМР' :
             location.pathname.startsWith('/requests') ? 'ТТН' :
             location.pathname.startsWith('/warehouse') ? 'Складские услуги' : 'Заявки'}
            {' / '}{isEditMode ? "Редактирование" : "Создать заявку"}
          </div>
          <h1>{isEditMode ? "Редактирование заявки" : "Создать заявку"}</h1>
        </div>
        <div className="topbar_actions">
          <button className="btn" onClick={() => nav(-1)}>← Назад</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head" style={{ cursor: 'pointer' }} onClick={() => setShowCompanyCard(!showCompanyCard)}>
          <div className="card_title">
            {showCompanyCard ? "▼" : "▶"} Выбор компании
          </div>
        </div>
        {showCompanyCard && (
          <div className="card_body">
             <div className="field">
                <select
                  style={{ width: "100%", height: 44, fontSize: 16, fontWeight: 700 }}
                  value={selectedCompanyId}
                  onChange={e => setSelectedCompanyId(e.target.value)}
                >
                  <option value="">-- Выберите компанию --</option>
                  {allCompanies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
             </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16, border: isWarehouse ? '2px solid #52c41a' : 'none' }}>
        <div className="card_body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <label style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                style={{ width: 20, height: 20 }}
                checked={isWarehouse}
                onChange={e => setIsWarehouse(e.target.checked)}
              />
              Склад (Складские услуги)
           </label>
           {isWarehouse && <span className="badge" style={{ background: '#52c41a', color: '#fff' }}>Режим склада активен</span>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head" style={{ cursor: 'pointer' }} onClick={() => setShowCustCard(!showCustCard)}>
          <div className="card_title">
            {showCustCard ? "▼" : "▶"} 1. Заказчик
          </div>
        </div>
        {showCustCard && (
          <div className="card_body">
            <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
               <button className="btn btn--sm" type="button" onClick={() => setCpSearchModal('customer')}>🔍 Найти в базе</button>
               {isCustomerModified && (
                 <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={saveAsCpCustomer} onChange={e => setSaveAsCpCustomer(e.target.checked)} />
                    Сохранить как контрагента
                 </label>
               )}
            </div>
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
                  onBlur={async (e) => {
                    const phone = e.target.value.trim();
                    if (!phone || phone.length < 5) return;
                    try {
                      const allCps = await api.counterparties.list();
                      const found = (allCps || []).find(cp =>
                        (cp.phone || '').replace(/\D/g, '') === phone.replace(/\D/g, '') ||
                        (cp.contactPhone || '').replace(/\D/g, '') === phone.replace(/\D/g, '')
                      );
                      if (found && window.confirm(`Найден контрагент: ${found.name}\nПодставить его данные?`)) {
                        setCustomer(prev => ({
                          ...prev,
                          fio: found.name || prev.fio,
                          companyName: found.companyName || prev.companyName,
                          email: found.email || prev.email,
                          bin: found.bin || prev.bin,
                          jurAddress: found.address || prev.jurAddress,
                          bank: found.bank || prev.bank,
                          bik: found.bik || prev.bik,
                          account: found.account || prev.account,
                          kbe: found.kbe || prev.kbe,
                        }));
                        setSelectedCpObjCustomer(found);
                      }
                    } catch (err) {
                      console.warn('Поиск контрагента по телефону:', err);
                    }
                  }}
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
               <div className="field">
                  <div className="label">Email</div>
                  <input
                    value={customer.email}
                    onChange={e => setCustomer({...customer, email: e.target.value})}
                    placeholder="customer@example.com"
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
                     <div className="label">IBAN</div>
                     <input value={customer.account} onChange={e => setCustomer({...customer, account: e.target.value})} />
                   </div>
                   <div className="field">
                     <div className="label">КБЕ</div>
                     <input value={customer.kbe} onChange={e => setCustomer({...customer, kbe: e.target.value})} />
                   </div>
                 </>
               )}
            </div>

            <div style={{ marginTop: 20, padding: "12px 0", borderTop: "1px solid #eee" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isSenderSameAsCustomer}
                  onChange={(e) => setIsSenderSameAsCustomer(e.target.checked)}
                />
                Заказчик является отправителем
              </label>
            </div>
          </div>
        )}
      </div>

      {!isSenderSameAsCustomer && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card_head" style={{ cursor: 'pointer' }} onClick={() => setShowSendCard(!showSendCard)}>
            <div className="card_title">
              {showSendCard ? "▼" : "▶"} 1.1 Грузоотправитель
            </div>
          </div>
          {showSendCard && (
            <div className="card_body">
               <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                 <button className="btn btn--sm" type="button" onClick={() => setCpSearchModal('sender')}>🔍 Найти в базе</button>
               </div>
               <div className="form_grid">
                <div className="field">
                  <div className="label">ФИО / Название</div>
                  <input
                    value={sender.fio}
                    onChange={e => setSender({...sender, fio: e.target.value})}
                    placeholder="Отправитель / Склад"
                  />
                </div>
                <div className="field">
                  <div className="label">Телефон</div>
                  <input
                    value={sender.phone}
                    onChange={e => setSender({...sender, phone: e.target.value})}
                    placeholder="+7..."
                  />
                </div>
                <div className="field">
                  <div className="label">Название компании</div>
                  <input
                    value={sender.companyName}
                    onChange={e => setSender({...sender, companyName: e.target.value})}
                  />
                </div>
                <div className="field">
                  <div className="label">Email</div>
                  <input
                    value={sender.email}
                    onChange={e => setSender({...sender, email: e.target.value})}
                  />
                </div>
                <div className="field field--full">
                  <button
                    className="btn btn--sm btn--ghost"
                    onClick={() => setShowSendReq(!showSendReq)}
                  >
                    {showSendReq ? "▲ Скрыть реквизиты" : "▼ Показать реквизиты"}
                  </button>
                </div>

                {showSendReq && (
                  <>
                    <div className="field">
                      <div className="label">Юр. адрес</div>
                      <input value={sender.jurAddress} onChange={e => setSender({...sender, jurAddress: e.target.value})} />
                    </div>
                    <div className="field">
                      <div className="label">Фактический адрес</div>
                      <input value={sender.factAddress} onChange={e => setSender({...sender, factAddress: e.target.value})} />
                    </div>
                    <div className="field">
                      <div className="label">БИН</div>
                      <input value={sender.bin} onChange={e => setSender({...sender, bin: e.target.value})} />
                    </div>
                    <div className="field">
                      <div className="label">Банк</div>
                      <input value={sender.bank} onChange={e => setSender({...sender, bank: e.target.value})} />
                    </div>
                    <div className="field">
                      <div className="label">БИК</div>
                      <input value={sender.bik} onChange={e => setSender({...sender, bik: e.target.value})} />
                    </div>
                    <div className="field">
                      <div className="label">IBAN</div>
                      <input value={sender.account} onChange={e => setSender({...sender, account: e.target.value})} />
                    </div>
                    <div className="field">
                      <div className="label">КБЕ</div>
                      <input value={sender.kbe} onChange={e => setSender({...sender, kbe: e.target.value})} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card_head" style={{ cursor: 'pointer' }} onClick={() => setShowRecCard(!showRecCard)}>
          <div className="card_title">
            {showRecCard ? "▼" : "▶"} 2. Получатель
          </div>
        </div>
        {showRecCard && (
        <div className="card_body">
           <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
             <button className="btn btn--sm" type="button" onClick={() => setCpSearchModal('receiver')}>🔍 Найти в базе</button>
             {isReceiverModified && (
               <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={saveAsCpReceiver} onChange={e => setSaveAsCpReceiver(e.target.checked)} />
                  Сохранить как контрагента
               </label>
             )}
           </div>
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
             <div className="field">
                <div className="label">Email</div>
                <input
                  value={receiver.email}
                  onChange={e => setReceiver({...receiver, email: e.target.value})}
                  placeholder="receiver@example.com"
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
         )}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card_head" style={{ cursor: 'pointer' }} onClick={() => setShowRouteCard(!showRouteCard)}>
          <div className="card_title">
            {showRouteCard ? "▼" : "▶"} 3. Груз и услуги
          </div>
        </div>
        {showRouteCard && (
          <div className="card_body">
            <div className="form_grid">
              <div className="field">
                <div className="label">Страна, город отправителя</div>
                <input
                  value={route.fromCity}
                  onChange={(e) => setRoute({...route, fromCity: e.target.value})}
                  placeholder="Алматы"
                />
              </div>
              <div className="field">
                <div className="label">Страна, город получателя</div>
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
                <div className="label">Наименование и характер груза</div>
                <textarea
                  value={cargoText}
                  onChange={(e) => setCargoText(e.target.value)}
                  placeholder="Бытовая техника, хрупкое..."
                />
              </div>

              <div className="field field--full">
                <div className="label">Срок доставки</div>
                <input
                  value={deliveryTerm}
                  onChange={e => setDeliveryTerm(e.target.value)}
                  placeholder="Напр. 3-5 дней"
                />
              </div>
            </div>

            <div className="table_wrap" style={{ marginTop: 16, maxHeight: "500px", overflowY: "auto", overflowX: "auto" }}>
              <table className="table_fixed">
                <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                  <tr>
                    <th style={{width: 40}}>№</th>
                    <th>Название</th>
                    <th>Кол-во</th>
                    <th>Длина (см)</th>
                    <th>Ширина (см)</th>
                    <th>Высота (см)</th>
                    <th>Вес (кг)</th>
                    <th>Объем (см³)</th>
                    <th>Об. вес (кг)</th>
                    <th style={{width: 80}}></th>
                  </tr>
                </thead>
                <tbody>
                  {cargoRows.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i+1}</td>
                      <td><input className="cell_input" value={r.title} onChange={e => updateRow(r.id, 'title', e.target.value)} placeholder="Напр. Коробки" /></td>
                      <td><input type="number" className="cell_input" value={r.seats} onChange={e => updateRow(r.id, 'seats', e.target.value)} /></td>
                      <td><input type="number" className="cell_input" value={r.length} onChange={e => updateRow(r.id, 'length', e.target.value)} placeholder="" /></td>
                      <td><input type="number" className="cell_input" value={r.width} onChange={e => updateRow(r.id, 'width', e.target.value)} placeholder="" /></td>
                      <td><input type="number" className="cell_input" value={r.height} onChange={e => updateRow(r.id, 'height', e.target.value)} placeholder="" /></td>
                      <td><input type="number" className="cell_input" value={r.weight} onChange={e => updateRow(r.id, 'weight', e.target.value)} placeholder="" /></td>
                      <td>{r.volume}</td>
                      <td>{r.volWeight}</td>
                      <td><button className="btn btn--sm btn--danger" onClick={() => delRow(r.id)}>x</button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{background: '#f5f5f5', fontWeight: 700, position: "sticky", bottom: 0}}>
                  <tr>
                    <td colSpan={2}>Итого:</td>
                    <td>{totals.seats}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>{totals.weight}</td>
                    <td>{totals.volume.toFixed(0)}</td>
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
                  background: "transparent",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <button className="btn" type="button" onClick={addRow}>
                  + Добавить строку
                </button>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="card_title" style={{ marginBottom: 12, color: 'var(--text)' }}>
                {isWarehouse ? "Складские услуги" : "Услуги"}
              </div>

              {!isWarehouse && (
                <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', border: '1px dashed #60a5fa', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn--accent" onClick={calculateByTariff}>
                    💰 Рассчитать по тарифу
                  </button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={calcByCubic} onChange={e => setCalcByCubic(e.target.checked)} />
                    <span>Считать по кубам</span>
                  </label>
                  {calcByCubic && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>Объём (м³):</span>
                      <input type="number" value={cubicVolume} onChange={e => setCubicVolume(e.target.value)} placeholder="3" style={{ width: 80, padding: '4px 8px' }} />
                    </div>
                  )}
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>
                    Направление: <strong>{route.toCity || '— не указано'}</strong>
                  </span>
                  <div style={{ width: '100%', borderTop: '1px dashed #93c5fd', margin: '4px 0' }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={addLoaders} onChange={e => setAddLoaders(e.target.checked)} />
                    <span>💪 Добавить грузчиков</span>
                  </label>
                  {addLoaders && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>Кол-во:</span>
                        <input type="number" min="1" value={loadersCount} onChange={e => setLoadersCount(e.target.value)} style={{ width: 70, padding: '4px 8px' }} />
                      </div>
                      <button type="button" className="btn" onClick={addLoadersService}>
                        ➕ Добавить грузчиков в услуги
                      </button>
                    </>
                  )}
                </div>
              )}

                <div className="table_wrap">
                  <table className="table_fixed">
                     <thead>
                        <tr>
                          <th style={{ width: 40 }}>№</th>
                          <th style={{ minWidth: 300 }}>Наименование услуги</th>
                          <th style={{ width: 100 }}>Кол-во</th>
                          <th style={{ width: 120 }}>Цена</th>
                          <th style={{ width: 120 }}>Сумма</th>
                          <th style={{ width: 50 }}></th>
                        </tr>
                     </thead>
                     <tbody>
                        {warehouseServices.map((s, idx) => (
                          <tr key={s.id}>
                             <td>{idx + 1}</td>
                             <td>
                               <input
                                 className="cell_input"
                                 style={{ maxWidth: '100%', width: '100%'}}
                                 value={s.name}
                                 onChange={e => {
                                   const next = [...warehouseServices];
                                   next[idx].name = e.target.value;
                                   setWarehouseServices(next);
                                 }}
                                 placeholder="Приемка, хранение, паллетирование..."
                               />
                             </td>
                             <td>
                               <input
                                 type="number"
                                 className="cell_input"
                                 value={s.qty}
                                 onChange={e => {
                                   const next = [...warehouseServices];
                                   next[idx].qty = parseFloat(e.target.value) || 0;
                                   next[idx].total = next[idx].qty * next[idx].price;
                                   setWarehouseServices(next);
                                 }}
                               />
                             </td>
                             <td>
                               <input
                                 type="number"
                                 className="cell_input"
                                 value={s.price}
                                 onChange={e => {
                                   const next = [...warehouseServices];
                                   next[idx].price = parseFloat(e.target.value) || 0;
                                   next[idx].total = next[idx].qty * next[idx].price;
                                   setWarehouseServices(next);
                                 }}
                               />
                             </td>
                             <td style={{ fontWeight: 700 }}>{s.total.toLocaleString()}</td>
                             <td>
                               <button className="btn btn--sm btn--danger" onClick={() => {
                                 if (warehouseServices.length > 1) {
                                   setWarehouseServices(warehouseServices.filter(x => x.id !== s.id));
                                 }
                               }}>x</button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                     <tfoot>
                         <tr style={{ fontWeight: 700, background: 'transparent' }}>
                             <td colSpan={2} style={{ textAlign: 'right' }}>Итого:</td>
                             <td>{warehouseServices.reduce((acc, s) => acc + (parseFloat(s.qty) || 0), 0)}</td>
                             <td></td>
                             <td className="card_title card_title--total">
                               {warehouseServices.reduce((acc, s) => acc + (s.total || 0), 0).toLocaleString()}
                             </td>
                             <td></td>
                         </tr>
                     </tfoot>
                  </table>
                   <div className="table_actions_clean">
                    <button className="btn" type="button" onClick={() => setWarehouseServices([...warehouseServices, { id: safeUuid(), name: "", qty: 1, price: 0, total: 0 }])}>
                      + Добавить услугу
                    </button>
                  </div>
                </div>
            </div>

            <div className="form_grid" style={{marginTop: 20}}>
              <div className="field" style={{ gridColumn: 'span 4' }}>
                <div className="label">Вид упаковки</div>
                <input value={packaging} onChange={e => setPackaging(e.target.value)} placeholder="Напр. Паллеты, Коробки" />
              </div>
               <label style={{ gridColumn: "span 1" }} className="label_checkbox">
                <input
                  type="checkbox"
                  checked={insured}
                  onChange={(e) => setInsured(e.target.checked)}
                />
                Имеется ли страховка?
              </label>
              {insured && (
                <div className="field" style={{ gridColumn: "span 1" }}>
                  <div className="label">Стоимость груза по инвойсу</div>
                  <input
                    type="text"
                    value={cargoValue}
                    onChange={e => setCargoValue(e.target.value)}
                    placeholder="Напр. 5 000 000 тенге"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

            {!isWarehouse && (
              <div className="card card--transport" style={{ gridColumn: 'span 2', marginTop: 20 }}>
                   <div className="card_head card_head--transport" onClick={() => setShowTransportCard(!showTransportCard)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="card_title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <span style={{
                           transform: showTransportCard ? 'rotate(90deg)' : 'rotate(0deg)',
                           transition: 'transform 0.2s',
                           display: 'inline-block',
                           fontSize: '0.9rem'
                         }}>▶</span>
                         ВИД ТРАНСПОРТА
                      </div>
                   </div>
                   {showTransportCard && (
                      <div className="card_body">
                        <div className="form_grid">
                          <div className="field" style={{ gridColumn: 'span 2' }}>
                            <div className="label">Вид перевозки <span className="text_danger">*</span></div>
                            <select
                              value={docAttrs.transportType}
                              onChange={e => {
                                const newVal = e.target.value;
                                setDocAttrs({
                                  ...docAttrs,
                                  transportType: newVal,
                                   vehicleModel: "",
                                   vehicleNumber: "",
                                   driver: "",
                                   hasTrailer: false,
                                   trailerModel: "",
                                   trailerNumber: "",
                                   flightNumber: ""
                                });
                              }}
                            >
                              <option value="auto_console">Авто консолидация</option>
                              <option value="auto_separate">Отдельное авто</option>
                              <option value="plane">Самолет</option>
                              <option value="train">Поезд рейс</option>
                            </select>
                          </div>

                          {(docAttrs.transportType === 'auto_console' || docAttrs.transportType === 'auto_separate') && (
                            <>
                              <div className="field">
                                <div className="label">Марка автомобиля</div>
                                <input value={docAttrs.vehicleModel} onChange={e => setDocAttrs({...docAttrs, vehicleModel: e.target.value})} placeholder="Volvo" />
                              </div>
                              <div className="field">
                                <div className="label">Госномер автомобиля</div>
                                <input value={docAttrs.vehicleNumber} onChange={e => setDocAttrs({...docAttrs, vehicleNumber: e.target.value})} placeholder="016ACT02" />
                              </div>
                              <div className="field">
                                <div className="label">Водитель (Ф.И.О.)</div>
                                <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
                              </div>
                              <div className="field" style={{ gridColumn: 'span 1' }}>
                                <label className="label_checkbox" style={{ marginTop: 32 }}>
                                  <input
                                    type="checkbox"
                                    checked={!!docAttrs.hasTrailer}
                                    onChange={e => setDocAttrs({...docAttrs, hasTrailer: e.target.checked})}
                                  />
                                  Имеется прицеп
                                </label>
                              </div>
                              {docAttrs.hasTrailer && (
                                <>
                                  <div className="field">
                                    <div className="label">Марка прицепа</div>
                                    <input value={docAttrs.trailerModel} onChange={e => setDocAttrs({...docAttrs, trailerModel: e.target.value})} placeholder="Schmitz" />
                                  </div>
                                  <div className="field">
                                    <div className="label">Госномер прицепа</div>
                                    <input value={docAttrs.trailerNumber} onChange={e => setDocAttrs({...docAttrs, trailerNumber: e.target.value})} placeholder="21WSZ05" />
                                  </div>
                                </>
                              )}
                            </>
                          )}

                          {docAttrs.transportType === 'plane' && (
                            <>
                              <div className="field">
                                <div className="label">Номер рейса</div>
                                <input value={docAttrs.flightNumber} onChange={e => setDocAttrs({...docAttrs, flightNumber: e.target.value})} />
                              </div>
                              <div className="field">
                                <div className="label">Ответственный</div>
                                <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
                              </div>
                            </>
                          )}

                          {docAttrs.transportType === 'train' && (
                            <>
                              <div className="field">
                                <div className="label">Поезд / Вагон</div>
                                <input value={docAttrs.flightNumber} onChange={e => setDocAttrs({...docAttrs, flightNumber: e.target.value})} />
                              </div>
                              <div className="field">
                                <div className="label">Ответственный</div>
                                <input value={docAttrs.driver} onChange={e => setDocAttrs({...docAttrs, driver: e.target.value})} />
                              </div>
                            </>)}
                        </div>
                      </div>
                   )}
                </div>
            )}

            <div className="field" style={{marginTop: 10}}>
               <div className="label">Сумма (тг)</div>
             <input
                 value={totalSum}
                 readOnly
                 style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                 placeholder="Рассчитывается автоматически из услуг"
               />
            </div>

            <div className="field" style={{marginTop: 10}}>
               <div className="label">Дата</div>
               <input
                 type="date"
                 value={date}
                 onChange={e => setDate(e.target.value)}
               />
            </div>

      {cpSearchModal && (
        <Modal title="Поиск контрагента" onClose={() => setCpSearchModal(null)}>
           <div className="field">
              <div className="label">Поиск (Имя, БИН, Компания)</div>
              <input
                autoFocus
                value={cpSearchQuery}
                onChange={e => setCpSearchQuery(e.target.value)}
                placeholder="Начните вводить..."
                className="input"
                style={{ width: '100%', padding: '10px' }}
              />
           </div>
           <div className="cp_list" style={{ marginTop: 16, maxHeight: 400, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
              {filteredCPs.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>Ничего не найдено</div>
              ) : (
                filteredCPs.map(cp => (
                  <div key={cp.id} className="cp_item" onClick={() => selectCP(cp)} style={{
                    padding: '12px', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}>
                    <div style={{ fontWeight: 700 }}>{cp.name}</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                      {cp.companyName} {cp.bin && `(БИН: ${cp.bin})`}
                    </div>
                  </div>
                ))
              )}
           </div>
        </Modal>
      )}

          <div className="page_actions" style={{ marginTop: 24, paddingBottom: 40 }}>
            <button
              className="btn btn--accent btn--lg"
              style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
              onClick={onSave}
              disabled={loading}
            >
              {loading ? "Сохранение данных..." : (isEditMode ? "Сохранить изменения" : "Создать заявку")}
            </button>
          </div>
    </>
  );
}