import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { calcDeliveryPrice, getDeliveryDestinations, getTariffOrigins } from "../../shared/tariff/calcTariff.js";
import { upsertCounterparty } from "../../shared/counterparty/upsertCounterparty.js";
import CounterpartyField from "../../shared/counterparty/CounterpartyField.jsx";
import { api } from "../../shared/api/api.js";
import {
  getSelectedCompanyId,
  loadCompanies,
  setSelectedCompanyId as setGlobalSelectedCompanyId,
} from "../../shared/storage/companyStorage.js";

// ============================================================
// Утилиты
// ============================================================

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
  const a = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ua",
  };
  return word
    .toLowerCase()
    .split("")
    .map((char) => a[char] || (/[a-z0-9]/.test(char) ? char : ""))
    .join("");
}

function toNum(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

// Заказчик отключил доставку по городу (только по регионам). Логика/параметр
// cityDelivery в движке сохранены — чтобы вернуть чекбокс, поставь true.
const SHOW_CITY_DELIVERY = false;

// Доплата за посёлок теперь автоматическая (посёлок = город назначения внутри
// тарифа). Чекбокс «Доставка в регион» + список + автоподстановка скрыты; код цел.
const SHOW_REGION_DELIVERY = false;

function getTariffCategory(t) {
  const wr = t.weightRanges || {};
  return wr._category || (t.isPrivate ? "private" : "legal");
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

  (allActs || []).forEach((a) => {
    const numStr = a.number || a.docNumber;
    if (numStr) {
      const match = String(numStr).match(prefixPattern);
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

function emptyCargoRow() {
  return {
    id: safeUuid(),
    title: "",
    seats: 1,
    length: "",
    width: "",
    height: "",
    weight: "",
    volume: 0,
    volWeight: 0,
  };
}

// ТЗ: города выбираются из выпадающего списка. Раньше стоял <input list="...">
// (datalist): у него нет стрелки, а варианты показываются только при наборе —
// заказчик жаловался, что «нажимаешь стрелочку, ничего не вылазит».
//
// Список городов берётся из справочника Тарифы (getDeliveryDestinations) — там
// же, где их ищет расчёт, поэтому выбор из списка гарантирует совпадение с
// тарифом. Отдельного справочника городов в системе нет.
//
// Пункт «другой город» оставляет ручной ввод: без него нельзя было бы завести
// заявку на направление, для которого тариф ещё не заведён.
const OTHER_CITY = "__other__";

function CitySelect({ value, onChange, options, placeholder }) {
  const list = useMemo(
    () => (options || []).map((o) => (typeof o === "string" ? { city: o, hint: "" } : o)),
    [options]
  );
  const isKnown = (v) => list.some((o) => o.city === v);
  const [manual, setManual] = useState(!!value && !isKnown(value));

  // Значение может прийти извне — при редактировании заявки или автоподстановке.
  // Если такого города нет в тарифах, переключаемся в ручной режим, иначе
  // select показал бы пустое поле и город «потерялся» бы при сохранении.
  useEffect(() => {
    if (value && !isKnown(value)) setManual(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, list]);

  if (manual) {
    return (
      <>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        <button
          type="button"
          className="btn btn--sm"
          style={{ marginTop: 6, fontSize: 11 }}
          onClick={() => { setManual(false); onChange(""); }}
        >
          ← выбрать из списка
        </button>
      </>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === OTHER_CITY) { setManual(true); onChange(""); }
        else onChange(e.target.value);
      }}
    >
      <option value="">— выберите город —</option>
      {list.map((o) => (
        <option key={o.city} value={o.city}>{o.hint ? `${o.city} · ${o.hint}` : o.city}</option>
      ))}
      <option value={OTHER_CITY}>➕ другой город (ввести вручную)</option>
    </select>
  );
}

function emptyServiceRow() {
  return { id: safeUuid(), name: "", qty: 1, price: 0, total: 0 };
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

function emptyParty() {
  return { fio: "", phone: "", companyName: "", email: "", ...initialRequisites };
}

// ============================================================
// Компонент
// ============================================================

export default function ActCreatePage() {
  const nav = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = !!id;

  // ---------- Базовые поля ----------
  const [date, setDate] = useState(todayIso());
  const [createdAt, setCreatedAt] = useState(todayIso());
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [allCompanies, setAllCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // ---------- Перевод заявки на другой ИП (аннулирование + новая заявка) ----------
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferCompanyId, setTransferCompanyId] = useState("");
  const [transferring, setTransferring] = useState(false);

  // ---------- Стороны сделки ----------
  const [customer, setCustomer] = useState(emptyParty);
  const [isSenderSameAsCustomer, setIsSenderSameAsCustomer] = useState(true);
  const [sender, setSender] = useState(emptyParty);
  const [receiver, setReceiver] = useState(emptyParty);

  // ---------- Маршрут / груз ----------
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
  const [cargoRows, setCargoRows] = useState([emptyCargoRow()]);

  // ---------- Контрагенты ----------
  const [allCounterparties, setAllCounterparties] = useState([]);
  const [saveAsCpCustomer, setSaveAsCpCustomer] = useState(true);
  const [saveAsCpReceiver, setSaveAsCpReceiver] = useState(true);
  const [selectedCpObjCustomer, setSelectedCpObjCustomer] = useState(null);
  const [selectedCpObjReceiver, setSelectedCpObjReceiver] = useState(null);

  // ---------- Склад / услуги ----------
  const [isWarehouse, setIsWarehouse] = useState(false);
  const [warehouseServices, setWarehouseServices] = useState([emptyServiceRow()]);

  // ---------- Тарифы ----------
  const [allTariffs, setAllTariffs] = useState([]);
  const [tariffTransport, setTariffTransport] = useState("auto");
  const [prrType, setPrrType] = useState("");
  const [pallets, setPallets] = useState(""); // кол-во палет для ПРР «палетная»
  const [storageMode, setStorageMode] = useState(""); // '' | 'weight' | 'cube'
  const [storageDays, setStorageDays] = useState("");
  const [cityDelivery, setCityDelivery] = useState(false); // доставка до адреса в городе
  const [regionEnabled, setRegionEnabled] = useState(false);
  const [regionDelivery, setRegionDelivery] = useState(""); // название посёлка (region_delivery)

  // ---------- UI: сворачиваемые карточки ----------
  const [showCompanyCard, setShowCompanyCard] = useState(false);
  const [showCustCard, setShowCustCard] = useState(false);
  const [showSendCard, setShowSendCard] = useState(false);
  const [showRecCard, setShowRecCard] = useState(false);
  const [showRouteCard, setShowRouteCard] = useState(false);
  const [showTransportCard, setShowTransportCard] = useState(false);
  const [showCustReq, setShowCustReq] = useState(false);
  const [showSendReq, setShowSendReq] = useState(false);
  const [showRecReq, setShowRecReq] = useState(false);

  // ---------- Тип документа / атрибуты транспорта ----------
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
    doc5: "",
    doc6: "",
    doc13: "",
    doc14: "",
    doc15: "",
    doc18: "",
  });

  // ============================================================
  // ВЫЧИСЛЕНИЯ (useMemo) — единственный источник правды
  // ============================================================

  // Итоги по строкам груза (места/вес/объём/об.вес)
  const cargoTotals = useMemo(() => {
    return cargoRows.reduce(
      (acc, r) => {
        acc.seats += toNum(r.seats);
        acc.weight += toNum(r.weight);
        acc.volume += toNum(r.volume);
        acc.volWeight += toNum(r.volWeight);
        return acc;
      },
      { seats: 0, weight: 0, volume: 0, volWeight: 0 }
    );
  }, [cargoRows]);

  // Общий вес и объём (м³) груза — используется и в тарификации, и в UI
  const cargoWeightKg = cargoTotals.weight;
  const cargoVolumeM3 = useMemo(() => cargoTotals.volume / 1_000_000, [cargoTotals.volume]);

  // Итоги по услугам (кол-во и сумма) — единая точка расчёта
  const servicesTotals = useMemo(() => {
    return warehouseServices.reduce(
      (acc, s) => {
        acc.qty += toNum(s.qty);
        acc.sum += toNum(s.total);
        return acc;
      },
      { qty: 0, sum: 0 }
    );
  }, [warehouseServices]);

  // Итоговая сумма заявки — производная величина, не отдельный state.
  const totalSum = useMemo(() => {
    return servicesTotals.sum > 0 ? String(servicesTotals.sum) : "";
  }, [servicesTotals.sum]);

  const isCustomerModified = useMemo(() => {
    if (!selectedCpObjCustomer) return true;
    return (
      customer.fio !== selectedCpObjCustomer.name ||
      customer.phone !== (selectedCpObjCustomer.phone || "") ||
      customer.companyName !== (selectedCpObjCustomer.companyName || "") ||
      customer.email !== (selectedCpObjCustomer.email || "") ||
      customer.bin !== (selectedCpObjCustomer.bin || "")
    );
  }, [customer, selectedCpObjCustomer]);

  const isReceiverModified = useMemo(() => {
    if (!selectedCpObjReceiver) return true;
    return (
      receiver.fio !== selectedCpObjReceiver.name ||
      receiver.phone !== (selectedCpObjReceiver.phone || "") ||
      receiver.companyName !== (selectedCpObjReceiver.companyName || "") ||
      receiver.email !== (selectedCpObjReceiver.email || "") ||
      receiver.bin !== (selectedCpObjReceiver.bin || "")
    );
  }, [receiver, selectedCpObjReceiver]);


  // ТЗ: подсказки городов из справочника Тарифы, чтобы город в заявке точно совпадал
  // с тарифом (иначе расчёт не находит совпадение). Назначения = города тарифов +
  // ПОСЁЛКИ из _regionalDeliveries (с пометкой «посёлок · Родитель»). Отправления = fromCity.
  const destinationCities = useMemo(() => getDeliveryDestinations(allTariffs), [allTariffs]);
  const originCities = useMemo(() => getTariffOrigins(allTariffs), [allTariffs]);

  // ============================================================
  // ЗАГРУЗКА ДАННЫХ
  // ============================================================

  useEffect(() => {
    api.tariffs
      .list()
      .then((data) => setAllTariffs(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Не удалось загрузить тарифы:", e));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const companies = await loadCompanies();
      if (cancelled) return;
      setAllCompanies(companies);

      if (isEditMode) {
        setIsDataLoading(true);
        try {
          const act = await api.requests.get(id);
          if (cancelled) return;

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
                details = typeof act.details === "string" ? JSON.parse(act.details) : act.details;
              } catch (e) {
                console.error("Parse details error", e);
              }
            }

            setSelectedCompanyId(act.companyId || "");

            if (details.customer) setCustomer(details.customer);
            if (details.receiver) setReceiver(details.receiver);
            if (details.sender) setSender(details.sender);
            if (typeof details.isSenderSameAsCustomer === "boolean") {
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
            if (details.docAttrs) setDocAttrs((prev) => ({ ...prev, ...details.docAttrs }));

            setInsured(!!details.insured);
            setCargoValue(details.cargoValue || "");

            setCargoRows(
              Array.isArray(details.cargoRows) && details.cargoRows.length > 0
                ? details.cargoRows
                : [emptyCargoRow()]
            );

            if (typeof details.isWarehouse === "boolean") {
              setIsWarehouse(details.isWarehouse);
            }
            setWarehouseServices(
              Array.isArray(details.warehouseServices) && details.warehouseServices.length > 0
                ? details.warehouseServices
                : [emptyServiceRow()]
            );
          }
        } catch (e) {
          console.error("Failed to load act for edit", e);
          if (!cancelled) {
            alert("Ошибка при загрузке данных заявки. Пожалуйста, попробуйте обновить страницу.");
          }
        } finally {
          if (!cancelled) setIsDataLoading(false);
        }
      } else {
        setSelectedCompanyId(getSelectedCompanyId() || "");
        setCargoRows([emptyCargoRow()]);
        setWarehouseServices([emptyServiceRow()]);

        const params = new URLSearchParams(location.search);
        if (params.get("type") === "warehouse") {
          setIsWarehouse(true);
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [id, isEditMode, location.search]);

  useEffect(() => {
    let cancelled = false;
    api.counterparties
      .list()
      .then((data) => {
        if (!cancelled) setAllCounterparties(Array.isArray(data) ? data : []);
      })
      .catch((e) => console.error("Failed to load counterparties", e));
    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // ТАРИФИКАЦИЯ — весь расчёт живёт в src/shared/tariff/calcTariff.js
  // ============================================================

  const calculateByTariff = useCallback(() => {
    const res = calcDeliveryPrice({
      tariffs: allTariffs,
      city: route.toCity,
      fromCity: route.fromCity,
      weightKg: cargoWeightKg,
      volumeM3: cargoVolumeM3,
      seats: cargoTotals.seats,
      prrType: prrType,
      pallets: Number(pallets) || 0,
      storageMode: storageMode,
      storageDays: Number(storageDays) || 0,
      cityDelivery: cityDelivery,
      regionDelivery: regionEnabled ? regionDelivery : "",
      transport: tariffTransport, // авто/авиа — выбор рядом с кнопкой
      // category не ограничиваем: берётся legal или private (что найдётся).
      // Если юр НИКОГДА не должен ловить частный тариф — добавь: category: "legal",
    });

    if (!res.ok) {
      alert(res.error);
      return;
    }

    setWarehouseServices((prev) => {
      const filtered = prev.filter((s) => s.name || s.price);
      return [...filtered, { id: safeUuid(), name: res.description, qty: 1, price: res.sum, total: res.sum }];
    });
    alert(`Добавлена услуга: ${res.description}\nСумма: ${res.sum.toLocaleString()} тг`);
  }, [route.toCity, cargoVolumeM3, cargoWeightKg, allTariffs, tariffTransport, prrType, pallets, storageMode, storageDays, cityDelivery, regionEnabled, regionDelivery]);

  // Перевод заявки на другой ИП: старая аннулируется (номер остаётся за ней),
  // в целевом ИП создаётся новая заявка со СВОИМ следующим номером (genNumber(target)).
  const handleTransferToCompany = async () => {
    if (!isEditMode || !id) return;
    if (!transferCompanyId) return alert("Выберите ИП, на который переводим заявку");
    if (transferCompanyId === selectedCompanyId) return alert("Это та же компания — выберите другой ИП");
    const target = allCompanies.find((c) => c.id === transferCompanyId);
    if (!window.confirm(
      `Текущая заявка будет аннулирована, а в ИП «${target?.name || ""}» создастся новая заявка со своим номером.\n\nПродолжить?`
    )) return;
    setTransferring(true);
    try {
      const newDocNumber = await genNumber(target);
      const result = await api.requests.cancelAndClone(id, transferCompanyId, newDocNumber);
      const newId = result?.id;
      const newNumber = result?.docNumber || newDocNumber;
      if (!newId) {
        alert("Заявка создана, но не удалось определить её ID. Обновите страницу.");
        return;
      }
      alert(`Готово. Прежняя заявка аннулирована, в новом ИП создана заявка №${newNumber}. Открываю…`);
      if (isWarehouse) nav(`/warehouse/${newId}`);
      else if (docType === "smr" || dbType === "smr") nav(`/smr/${newId}`);
      else if (docType === "ttn" || dbType === "ttn") nav(`/requests/${newId}`);
      else nav(`/acts/${newId}`);
    } catch (e) {
      alert("Ошибка перевода на другой ИП: " + (e.message || e));
    } finally {
      setTransferring(false);
    }
  };

  // Список посёлков для «Доставки в регион» — из тарифов категории region_delivery.
  const regionOptions = useMemo(() => {
    const set = new Set();
    (allTariffs || []).forEach(t => {
      if (getTariffCategory(t) === 'region_delivery') {
        const name = String(t.city || '').replace(/__REGIONDELIVERY$/, '').trim();
        if (name) set.add(name);
      }
    });
    return [...set].sort();
  }, [allTariffs]);

  // Автоподстановка: если город назначения совпал с посёлком region_delivery —
  // ставим галочку «Доставка в регион» и выбираем посёлок. Менеджер может снять
  // (повторно не навязываем для того же города благодаря appliedRegionCity).
  const appliedRegionCity = useRef(null);
  useEffect(() => {
    if (!SHOW_REGION_DELIVERY) return; // доплата за посёлок теперь автоматическая (движок)
    const dest = (route.toCity || '').trim().toLowerCase();
    if (appliedRegionCity.current && appliedRegionCity.current !== dest) appliedRegionCity.current = null;
    if (!dest || appliedRegionCity.current === dest) return;
    const match = regionOptions.find(n => n.trim().toLowerCase() === dest);
    if (match) {
      appliedRegionCity.current = dest;
      setRegionEnabled(true);
      setRegionDelivery(match);
    }
  }, [route.toCity, regionOptions]);

  // ============================================================
  // ОБРАБОТЧИКИ: строки груза
  // ============================================================

  const updateCargoRow = useCallback((rowId, field, val) => {
    setCargoRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const next = { ...r, [field]: val };

        // Объём и объёмный вес строки = Д×Ш×В × количество мест. Пересчитываем
        // и при смене количества, и при смене размеров.
        if (["length", "width", "height", "seats"].includes(field)) {
          const l = toNum(next.length);
          const w = toNum(next.width);
          const h = toNum(next.height);
          const cnt = toNum(next.seats) || 0;
          const v = l * w * h * cnt;
          const vw = v / 6000;
          next.volume = v > 0 ? parseFloat(v.toFixed(0)) : 0;
          next.volWeight = vw > 0 ? parseFloat(vw.toFixed(2)) : 0;
        }
        return next;
      })
    );
  }, []);

  const addCargoRow = useCallback(() => {
    setCargoRows((prev) => [...prev, emptyCargoRow()]);
  }, []);

  const delCargoRow = useCallback((rowId) => {
    setCargoRows((prev) => prev.filter((r) => r.id !== rowId));
  }, []);

  // ============================================================
  // ОБРАБОТЧИКИ: услуги (без мутаций — новые объекты на каждое изменение)
  // ============================================================

  const updateServiceField = useCallback((rowId, field, rawVal) => {
    setWarehouseServices((prev) =>
      prev.map((s) => {
        if (s.id !== rowId) return s;
        const val = field === "name" ? rawVal : toNum(rawVal);
        const next = { ...s, [field]: val };
        if (field === "qty" || field === "price") {
          next.total = toNum(next.qty) * toNum(next.price);
        }
        return next;
      })
    );
  }, []);

  const addServiceRow = useCallback(() => {
    setWarehouseServices((prev) => [...prev, emptyServiceRow()]);
  }, []);

  const delServiceRow = useCallback((rowId) => {
    setWarehouseServices((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== rowId) : prev));
  }, []);

  // ============================================================
  // КОНТРАГЕНТЫ
  // ============================================================

  // Данные контрагента → поля стороны. Один маппинг на все три стороны:
  // раньше его использовала модалка «Найти в базе», теперь — инлайн-подсказка.
  const cpToParty = useCallback((cp) => {
    return {
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
  }, []);

  // Выбор подсказки по стороне. Сторона уже существующая в базе — снимаем
  // галочку «сохранить как контрагента»: пересоздавать его незачем.
  const pickCustomer = useCallback((cp) => {
    setCustomer((prev) => ({ ...prev, ...cpToParty(cp) }));
    setSelectedCpObjCustomer(cp);
    setSaveAsCpCustomer(false);
  }, [cpToParty]);

  const pickReceiver = useCallback((cp) => {
    setReceiver((prev) => ({ ...prev, ...cpToParty(cp) }));
    setSelectedCpObjReceiver(cp);
    setSaveAsCpReceiver(false);
  }, [cpToParty]);

  const pickSender = useCallback((cp) => {
    setSender((prev) => ({ ...prev, ...cpToParty(cp) }));
  }, [cpToParty]);

  // handleCustomerPhoneBlur удалён: подбор по телефону теперь делает
  // CounterpartyField — без window.confirm и без запроса в сеть на каждый blur
  // (поиск идёт по уже загруженному allCounterparties, в том числе по цифрам телефона).

  // ============================================================
  // ВАЛИДАЦИЯ
  // ============================================================

  const validateBeforeSave = useCallback(() => {
    const errors = [];
    if (!selectedCompanyId) errors.push("Выберите компанию");
    if (!date) errors.push("Укажите дату");
    if (!customer.fio.trim()) errors.push("Укажите ФИО / название заказчика");
    if (!receiver.fio.trim()) errors.push("Укажите ФИО / название получателя");
    if (!isWarehouse && !route.toCity.trim()) errors.push("Укажите город получателя");
    return errors;
  }, [selectedCompanyId, date, customer.fio, receiver.fio, isWarehouse, route.toCity]);

  // ============================================================
  // СОХРАНЕНИЕ
  // ============================================================

  const onSave = useCallback(async () => {
    if (loading) return;

    const errors = validateBeforeSave();
    if (errors.length > 0) {
      alert("Не заполнены обязательные поля:\n\n" + errors.join("\n"));
      return;
    }

    setLoading(true);

    const company = allCompanies.find((c) => c.id === selectedCompanyId);

    const checkReqs = (obj) => obj.jurAddress && obj.bin && obj.account && obj.bank && obj.bik;
    const reqsComplete = checkReqs(customer) && checkReqs(receiver);
    const status = isWarehouse || reqsComplete ? "act" : "draft";

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
      totals: cargoTotals,
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
      type: docType || dbType || "REQUEST",
    };

    try {
      if (isEditMode) {
        const currentAct = await api.requests.get(id);
        // Этап 8: при переводе документа между ИП СОХРАНЯЕМ исходный номер
        // (раньше он перегенерировался под целевой ИП и исходный терялся).
        // actData не содержит docNumber → update не меняет номер.
        if (currentAct && currentAct.companyId !== selectedCompanyId) {
          const keepNumber = currentAct.docNumber || currentAct.number || "";
          // Защита: если номер уже занят другим документом — предупредить, а не молча.
          try {
            const all = await api.requests.list();
            const clash = (all || []).find(
              (x) => String(x.id) !== String(id) &&
                String(x.docNumber || x.number || "") === String(keepNumber)
            );
            if (clash && !window.confirm(`Номер ${keepNumber} уже занят другим документом. Перевести в другой ИП всё равно (номера совпадут)?`)) {
              return; // внешний finally сбросит loading
            }
          } catch { /* проверка коллизии не критична */ }
        }
        await api.requests.update(id, actData);
      } else {
        const docNumber = await genNumber(company);
        await api.requests.create({ docNumber, ...actData });
      }

      if (!isEditMode && (saveAsCpCustomer || saveAsCpReceiver)) {
        // Дедуп по телефону: тот же телефон → обновляем, а не плодим копии.
        let cpList = [];
        try { cpList = await api.counterparties.list(selectedCompanyId); } catch { /* ignore */ }
        if (saveAsCpCustomer && customer.fio) {
          await upsertCounterparty({ ...customer, companyId: selectedCompanyId, name: customer.fio }, cpList);
        }
        if (saveAsCpReceiver && receiver.fio) {
          await upsertCounterparty({ ...receiver, companyId: selectedCompanyId, name: receiver.fio }, cpList);
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
      console.error("Save error:", err);
      alert("Ошибка при сохранении: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    validateBeforeSave,
    allCompanies,
    selectedCompanyId,
    customer,
    receiver,
    isWarehouse,
    date,
    createdAt,
    sender,
    isSenderSameAsCustomer,
    route,
    cargoText,
    packaging,
    cargoRows,
    cargoTotals,
    deliveryTerm,
    insured,
    cargoValue,
    docType,
    docAttrs,
    totalSum,
    warehouseServices,
    dbType,
    isEditMode,
    id,
    saveAsCpCustomer,
    saveAsCpReceiver,
    nav,
  ]);

  // ============================================================
  // РЕНДЕР
  // ============================================================

  if (isDataLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div className="loader" />
        <div style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Загрузка данных заявки...</div>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumbs">
            {location.pathname.startsWith("/deferred")
              ? "Отложенные"
              : location.pathname.startsWith("/smr")
              ? "СМР"
              : location.pathname.startsWith("/requests")
              ? "ТТН"
              : location.pathname.startsWith("/warehouse")
              ? "Складские услуги"
              : "Заявки"}
            {" / "}
            {isEditMode ? "Редактирование" : "Создать заявку"}
          </div>
          <h1>{isEditMode ? "Редактирование заявки" : "Создать заявку"}</h1>
        </div>
        <div className="topbar_actions">
          <button className="btn" onClick={() => nav(-1)}>
            ← Назад
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head" style={{ cursor: "pointer" }} onClick={() => setShowCompanyCard((v) => !v)}>
          <div className="card_title">{showCompanyCard ? "▼" : "▶"} Выбор компании</div>
        </div>
        {showCompanyCard && (
          <div className="card_body">
            <div className="field">
              <select
                style={{ width: "100%", height: 44, fontSize: 16, fontWeight: 700, background: isEditMode ? "#f1f5f9" : undefined, cursor: isEditMode ? "not-allowed" : undefined }}
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                disabled={isEditMode}
                title={isEditMode ? "ИП существующей заявки не меняется здесь. Используйте «Перевести на другой ИП»." : undefined}
              >
                <option value="">-- Выберите компанию --</option>
                {allCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Перевод на другой ИП — только для существующей заявки (аннулирование + новая) */}
            {isEditMode && (
              <div style={{ marginTop: 12, padding: 12, background: "#fff7ed", border: "1px dashed #fdba74", borderRadius: 8 }}>
                {!transferOpen ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => { setTransferOpen(true); setTransferCompanyId(""); }}
                    style={{ fontWeight: 700 }}
                  >
                    🔄 Перевести на другой ИП
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: "0.85rem", color: "#9a3412" }}>
                      Текущая заявка будет <strong>аннулирована</strong> (её номер останется за ней), а в выбранном ИП
                      создастся <strong>новая заявка со своим следующим номером</strong>.
                    </div>
                    <select
                      style={{ height: 40, fontSize: 15 }}
                      value={transferCompanyId}
                      onChange={(e) => setTransferCompanyId(e.target.value)}
                    >
                      <option value="">-- Выберите целевой ИП --</option>
                      {allCompanies.filter((c) => c.id !== selectedCompanyId).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn--accent"
                        onClick={handleTransferToCompany}
                        disabled={transferring || !transferCompanyId}
                        style={{ fontWeight: 700 }}
                      >
                        {transferring ? "Перевод…" : "Аннулировать и создать в новом ИП"}
                      </button>
                      <button type="button" className="btn" onClick={() => setTransferOpen(false)} disabled={transferring}>
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16, border: isWarehouse ? "2px solid #52c41a" : "none" }}>
        <div className="card_body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              style={{ width: 20, height: 20 }}
              checked={isWarehouse}
              onChange={(e) => setIsWarehouse(e.target.checked)}
            />
            Склад (Складские услуги)
          </label>
          {isWarehouse && <span className="badge" style={{ background: "#52c41a", color: "#fff" }}>Режим склада активен</span>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head" style={{ cursor: "pointer" }} onClick={() => setShowCustCard((v) => !v)}>
          <div className="card_title">{showCustCard ? "▼" : "▶"} 1. Заказчик</div>
        </div>
        {showCustCard && (
          <div className="card_body">
            <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
              {isCustomerModified && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={saveAsCpCustomer} onChange={(e) => setSaveAsCpCustomer(e.target.checked)} />
                  Сохранить как контрагента
                </label>
              )}
            </div>
            <div className="form_grid">
              <div className="field">
                <div className="label">ФИО / Название</div>
                <CounterpartyField
                  value={customer.fio}
                  onChange={(val) => setCustomer({ ...customer, fio: val })}
                  onPick={pickCustomer}
                  items={allCounterparties}
                  placeholder="Иванов И.И. / ТОО Ромашка"
                />
              </div>
              <div className="field">
                <div className="label">Телефон</div>
                {/* Подсказка и на телефоне: менеджер часто начинает искать
                    контрагента именно с номера, а не с имени. */}
                <CounterpartyField
                  value={customer.phone}
                  onChange={(val) => setCustomer({ ...customer, phone: val })}
                  onPick={pickCustomer}
                  items={allCounterparties}
                  placeholder="+7..."
                />
              </div>
              <div className="field">
                <div className="label">Название компании</div>
                <input
                  value={customer.companyName}
                  onChange={(e) => setCustomer({ ...customer, companyName: e.target.value })}
                  placeholder="Если отличается от ФИО"
                />
              </div>
              <div className="field">
                <div className="label">Email</div>
                <input
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
              <div className="field field--full">
                <button className="btn btn--sm btn--ghost" onClick={() => setShowCustReq((v) => !v)}>
                  {showCustReq ? "▲ Скрыть реквизиты" : "▼ Показать реквизиты"}
                </button>
              </div>

              {showCustReq && (
                <>
                  <div className="field">
                    <div className="label">Юр. адрес</div>
                    <input value={customer.jurAddress} onChange={(e) => setCustomer({ ...customer, jurAddress: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">Фактический адрес</div>
                    <input value={customer.factAddress} onChange={(e) => setCustomer({ ...customer, factAddress: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">БИН</div>
                    <input value={customer.bin} onChange={(e) => setCustomer({ ...customer, bin: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">Банк</div>
                    <input value={customer.bank} onChange={(e) => setCustomer({ ...customer, bank: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">БИК</div>
                    <input value={customer.bik} onChange={(e) => setCustomer({ ...customer, bik: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">IBAN</div>
                    <input value={customer.account} onChange={(e) => setCustomer({ ...customer, account: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">КБЕ</div>
                    <input value={customer.kbe} onChange={(e) => setCustomer({ ...customer, kbe: e.target.value })} />
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
          <div className="card_head" style={{ cursor: "pointer" }} onClick={() => setShowSendCard((v) => !v)}>
            <div className="card_title">{showSendCard ? "▼" : "▶"} 1.1 Грузоотправитель</div>
          </div>
          {showSendCard && (
            <div className="card_body">
              <div className="form_grid">
                <div className="field">
                  <div className="label">ФИО / Название</div>
                  <CounterpartyField
                    value={sender.fio}
                    onChange={(val) => setSender({ ...sender, fio: val })}
                    onPick={pickSender}
                    items={allCounterparties}
                    placeholder="Отправитель / Склад"
                  />
                </div>
                <div className="field">
                  <div className="label">Телефон</div>
                  <CounterpartyField
                    value={sender.phone}
                    onChange={(val) => setSender({ ...sender, phone: val })}
                    onPick={pickSender}
                    items={allCounterparties}
                    placeholder="+7..."
                  />
                </div>
                <div className="field">
                  <div className="label">Название компании</div>
                  <input value={sender.companyName} onChange={(e) => setSender({ ...sender, companyName: e.target.value })} />
                </div>
                <div className="field">
                  <div className="label">Email</div>
                  <input value={sender.email} onChange={(e) => setSender({ ...sender, email: e.target.value })} />
                </div>
                <div className="field field--full">
                  <button className="btn btn--sm btn--ghost" onClick={() => setShowSendReq((v) => !v)}>
                    {showSendReq ? "▲ Скрыть реквизиты" : "▼ Показать реквизиты"}
                  </button>
                </div>

                {showSendReq && (
                  <>
                    <div className="field">
                      <div className="label">Юр. адрес</div>
                      <input value={sender.jurAddress} onChange={(e) => setSender({ ...sender, jurAddress: e.target.value })} />
                    </div>
                    <div className="field">
                      <div className="label">Фактический адрес</div>
                      <input value={sender.factAddress} onChange={(e) => setSender({ ...sender, factAddress: e.target.value })} />
                    </div>
                    <div className="field">
                      <div className="label">БИН</div>
                      <input value={sender.bin} onChange={(e) => setSender({ ...sender, bin: e.target.value })} />
                    </div>
                    <div className="field">
                      <div className="label">Банк</div>
                      <input value={sender.bank} onChange={(e) => setSender({ ...sender, bank: e.target.value })} />
                    </div>
                    <div className="field">
                      <div className="label">БИК</div>
                      <input value={sender.bik} onChange={(e) => setSender({ ...sender, bik: e.target.value })} />
                    </div>
                    <div className="field">
                      <div className="label">IBAN</div>
                      <input value={sender.account} onChange={(e) => setSender({ ...sender, account: e.target.value })} />
                    </div>
                    <div className="field">
                      <div className="label">КБЕ</div>
                      <input value={sender.kbe} onChange={(e) => setSender({ ...sender, kbe: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card_head" style={{ cursor: "pointer" }} onClick={() => setShowRecCard((v) => !v)}>
          <div className="card_title">{showRecCard ? "▼" : "▶"} 2. Получатель</div>
        </div>
        {showRecCard && (
          <div className="card_body">
            <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
              {isReceiverModified && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={saveAsCpReceiver} onChange={(e) => setSaveAsCpReceiver(e.target.checked)} />
                  Сохранить как контрагента
                </label>
              )}
            </div>
            <div className="form_grid">
              <div className="field">
                <div className="label">ФИО / Название</div>
                <CounterpartyField
                  value={receiver.fio}
                  onChange={(val) => setReceiver({ ...receiver, fio: val })}
                  onPick={pickReceiver}
                  items={allCounterparties}
                  placeholder="Сидоров С.С."
                />
              </div>
              <div className="field">
                <div className="label">Телефон</div>
                <CounterpartyField
                  value={receiver.phone}
                  onChange={(val) => setReceiver({ ...receiver, phone: val })}
                  onPick={pickReceiver}
                  items={allCounterparties}
                  placeholder="+7..."
                />
              </div>
              <div className="field">
                <div className="label">Название компании</div>
                <input value={receiver.companyName} onChange={(e) => setReceiver({ ...receiver, companyName: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Email</div>
                <input value={receiver.email} onChange={(e) => setReceiver({ ...receiver, email: e.target.value })} placeholder="receiver@example.com" />
              </div>
              <div className="field field--full">
                <button className="btn btn--sm btn--ghost" onClick={() => setShowRecReq((v) => !v)}>
                  {showRecReq ? "▲ Скрыть реквизиты" : "▼ Показать реквизиты"}
                </button>
              </div>

              {showRecReq && (
                <>
                  <div className="field">
                    <div className="label">Юр. адрес</div>
                    <input value={receiver.jurAddress} onChange={(e) => setReceiver({ ...receiver, jurAddress: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">Фактический адрес</div>
                    <input value={receiver.factAddress} onChange={(e) => setReceiver({ ...receiver, factAddress: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">БИН</div>
                    <input value={receiver.bin} onChange={(e) => setReceiver({ ...receiver, bin: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">Банк</div>
                    <input value={receiver.bank} onChange={(e) => setReceiver({ ...receiver, bank: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">БИК</div>
                    <input value={receiver.bik} onChange={(e) => setReceiver({ ...receiver, bik: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">Счет</div>
                    <input value={receiver.account} onChange={(e) => setReceiver({ ...receiver, account: e.target.value })} />
                  </div>
                  <div className="field">
                    <div className="label">КБЕ</div>
                    <input value={receiver.kbe} onChange={(e) => setReceiver({ ...receiver, kbe: e.target.value })} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card_head" style={{ cursor: "pointer" }} onClick={() => setShowRouteCard((v) => !v)}>
          <div className="card_title">{showRouteCard ? "▼" : "▶"} 3. Груз и услуги</div>
        </div>
        {showRouteCard && (
          <div className="card_body">
            <div className="form_grid">
              <div className="field">
                <div className="label">Страна, город отправителя</div>
                <CitySelect
                  value={route.fromCity}
                  onChange={(val) => setRoute({ ...route, fromCity: val })}
                  options={originCities}
                  placeholder="Алматы"
                />
              </div>
              <div className="field">
                <div className="label">Страна, город получателя</div>
                <CitySelect
                  value={route.toCity}
                  onChange={(val) => setRoute({ ...route, toCity: val })}
                  options={destinationCities}
                  placeholder="Астана"
                />
                {destinationCities.length === 0 && (
                  <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>
                    ⚠ Тарифы не загружены или пусты. Проверьте раздел Тарифы.
                  </div>
                )}
              </div>
              <div className="field">
                <div className="label">Адрес отправителя</div>
                <input value={route.fromAddress} onChange={(e) => setRoute({ ...route, fromAddress: e.target.value })} />
              </div>
              <div className="field">
                <div className="label">Адрес получателя</div>
                <input value={route.toAddress} onChange={(e) => setRoute({ ...route, toAddress: e.target.value })} />
              </div>
              <div className="field field--full">
                <div className="label">Комментарии</div>
                <textarea value={route.comment} onChange={(e) => setRoute({ ...route, comment: e.target.value })} placeholder="Звонить за 30 минут..." />
              </div>
              <div className="field field--full">
                <div className="label">Наименование и характер груза</div>
                <textarea value={cargoText} onChange={(e) => setCargoText(e.target.value)} placeholder="Бытовая техника, хрупкое..." />
              </div>
              <div className="field field--full">
                <div className="label">Срок доставки</div>
                <input value={deliveryTerm} onChange={(e) => setDeliveryTerm(e.target.value)} placeholder="Напр. 3-5 дней" />
              </div>
            </div>

            <div className="table_wrap" style={{ marginTop: 16, maxHeight: "500px", overflowY: "auto", overflowX: "auto" }}>
              <table className="table_fixed">
                <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                  <tr>
                    {/* ТЗ: колонка «Название» (плейсхолдер «Напр. Коробки») убрана —
                        номенклатура забивается ниже, в «Наименование и характер груза». */}
                    <th style={{ width: 40 }}>№</th>
                    <th>Кол-во</th>
                    <th>Вес (кг)</th>
                    <th>Длина (см)</th>
                    <th>Ширина (см)</th>
                    <th>Высота (см)</th>
                    <th>Объём</th>
                    <th>Об. вес (кг)</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {cargoRows.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>
                        <input type="number" className="cell_input" value={r.seats} onChange={(e) => updateCargoRow(r.id, "seats", e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="cell_input" value={r.weight} onChange={(e) => updateCargoRow(r.id, "weight", e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="cell_input" value={r.length} onChange={(e) => updateCargoRow(r.id, "length", e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="cell_input" value={r.width} onChange={(e) => updateCargoRow(r.id, "width", e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="cell_input" value={r.height} onChange={(e) => updateCargoRow(r.id, "height", e.target.value)} />
                      </td>
                      {/* ТЗ: кубатура видна сразу при вводе размеров. Основное
                          значение — м³, см³ оставлены мелким справочно. */}
                      <td>
                        <div style={{ fontWeight: 700 }}>{(Number(r.volume) / 1_000_000).toFixed(3)} м³</div>
                        <div style={{ fontSize: "0.72rem", color: "#888" }}>{r.volume} см³</div>
                      </td>
                      <td>{r.volWeight}</td>
                      <td>
                        <button className="btn btn--sm btn--danger" onClick={() => delCargoRow(r.id)}>
                          x
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f5f5f5", fontWeight: 700, position: "sticky", bottom: 0 }}>
                  <tr>
                    {/* Колонки: № | Кол-во | Вес | Длина | Ширина | Высота | Объём | Об.вес | (кнопка).
                        Раньше из-за colSpan={2} общий вес попадал под «Высоту», а «Вес» стоял пустым. */}
                    <td>Итого:</td>
                    <td>{cargoTotals.seats}</td>
                    <td>{cargoTotals.weight}</td>
                    <td />
                    <td />
                    <td />
                    <td>
                      <div>{cargoVolumeM3.toFixed(3)} м³</div>
                      <div style={{ fontSize: "0.72rem", color: "#888", fontWeight: 400 }}>{cargoTotals.volume.toFixed(0)} см³</div>
                    </td>
                    <td>{cargoTotals.volWeight.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <div style={{ padding: 12, display: "flex", justifyContent: "flex-end", background: "transparent", borderTop: "1px solid var(--line)" }}>
                <button className="btn" type="button" onClick={addCargoRow}>
                  + Добавить строку
                </button>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="card_title" style={{ marginBottom: 12, color: "var(--text)" }}>
                {isWarehouse ? "Складские услуги" : "Услуги"}
              </div>

              {/* Правка ТЗ: расчёт по тарифу доступен и при складских услугах (раньше блок прятался под !isWarehouse) */}
              <div style={{ marginBottom: 16, padding: 12, background: "#f0f9ff", border: "1px dashed #60a5fa", borderRadius: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn--accent" onClick={calculateByTariff}>
                    💰 Рассчитать по тарифу
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>
                    Объём груза: <strong>{cargoVolumeM3.toFixed(4)} м³</strong>
                    <span style={{ color: "#aaa", marginLeft: 4 }}>(из габаритов, сравнивается с весом)</span>
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#888" }}>
                    Направление: <strong>{(route.fromCity || "Алматы")} → {route.toCity || "— не указано"}</strong>
                  </span>
                  <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                    <button type="button" onClick={() => setTariffTransport("auto")} style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 6, fontWeight: 700, fontSize: "0.85rem", border: `2px solid ${tariffTransport === "auto" ? "#1890ff" : "#d9d9d9"}`, background: tariffTransport === "auto" ? "#e6f7ff" : "#fff", color: tariffTransport === "auto" ? "#0050b3" : "#666" }}>
                      🚗 Авто
                    </button>
                    <button type="button" onClick={() => setTariffTransport("avia")} style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 6, fontWeight: 700, fontSize: "0.85rem", border: `2px solid ${tariffTransport === "avia" ? "#fa8c16" : "#d9d9d9"}`, background: tariffTransport === "avia" ? "#fff7e6" : "#fff", color: tariffTransport === "avia" ? "#d46b08" : "#666" }}>
                      ✈️ Авиа
                    </button>
                  </div>
                </div>

              <div className="field" style={{ maxWidth: 320, marginBottom: 12 }}>
                <div className="label">ПРР (погрузка-разгрузка)</div>
                <select value={prrType} onChange={e => setPrrType(e.target.value)}>
                  <option value="">Нет ПРР</option>
                  <option value="pallet">Палетная</option>
                  <option value="manual">Ручная</option>
                </select>
                {prrType === 'pallet' && (
                  <div style={{ marginTop: 8 }}>
                    <div className="label">Количество палет</div>
                    <input type="number" min="0" value={pallets} onChange={e => setPallets(e.target.value)} placeholder="0" />
                  </div>
                )}
              </div>

              <div className="field" style={{ maxWidth: 320, marginBottom: 12 }}>
                <div className="label">Хранение</div>
                <select value={storageMode} onChange={e => setStorageMode(e.target.value)}>
                  <option value="">Без хранения</option>
                  <option value="weight">По весу</option>
                  <option value="cube">По кубам</option>
                </select>
                {storageMode && (
                  <div style={{ marginTop: 8 }}>
                    <div className="label">Количество дней хранения</div>
                    <input type="number" min="0" value={storageDays} onChange={e => setStorageDays(e.target.value)} placeholder="0" />
                  </div>
                )}
              </div>

              {(SHOW_CITY_DELIVERY || SHOW_REGION_DELIVERY) && (
              <div className="field" style={{ maxWidth: 320, marginBottom: 12 }}>
                <div className="label">Дополнительная доставка</div>
                {SHOW_CITY_DELIVERY && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                    <input type="checkbox" checked={cityDelivery} onChange={e => setCityDelivery(e.target.checked)} />
                    <span>Доставка до адреса в городе</span>
                  </label>
                )}
                {SHOW_REGION_DELIVERY && (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={regionEnabled} onChange={e => setRegionEnabled(e.target.checked)} />
                      <span>Доставка в регион (посёлок)</span>
                    </label>
                    {regionEnabled && (
                      <div style={{ marginTop: 8 }}>
                        <select value={regionDelivery} onChange={e => setRegionDelivery(e.target.value)}>
                          <option value="">— выберите посёлок —</option>
                          {regionOptions.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        {regionOptions.length === 0 && (
                          <div className="muted" style={{ fontSize: '0.7rem', marginTop: 4 }}>
                            Нет тарифов «Доставка по регионам». Заведите их во вкладке Тарифы.
                          </div>
                        )}
                      </div>
                    )}
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
                      <th style={{ width: 100 }} title="Количество услуг (не мест). Места и вес уже учтены в сумме по тарифу.">Кол-во услуг</th>
                      <th style={{ width: 120 }}>Цена</th>
                      <th style={{ width: 120 }}>Сумма</th>
                      <th style={{ width: 50 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {warehouseServices.map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <input
                            className="cell_input"
                            style={{ maxWidth: "100%", width: "100%" }}
                            value={s.name}
                            onChange={(e) => updateServiceField(s.id, "name", e.target.value)}
                            placeholder="Приемка, хранение, паллетирование..."
                          />
                        </td>
                        <td>
                          <input type="number" className="cell_input" value={s.qty} onChange={(e) => updateServiceField(s.id, "qty", e.target.value)} />
                        </td>
                        <td>
                          <input type="number" className="cell_input" value={s.price} onChange={(e) => updateServiceField(s.id, "price", e.target.value)} />
                        </td>
                        <td style={{ fontWeight: 700 }}>{s.total.toLocaleString()}</td>
                        <td>
                          <button className="btn btn--sm btn--danger" onClick={() => delServiceRow(s.id)}>
                            x
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700, background: "transparent" }}>
                      <td colSpan={2} style={{ textAlign: "right" }}>
                        Итого:
                      </td>
                      <td>{servicesTotals.qty}</td>
                      <td />
                      <td className="card_title card_title--total">{servicesTotals.sum.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                <div className="table_actions_clean">
                  <button className="btn" type="button" onClick={addServiceRow}>
                    + Добавить услугу
                  </button>
                </div>
                <div className="muted" style={{ fontSize: '0.72rem', marginTop: 8, padding: '0 4px' }}>
                  «Кол-во услуг» — это количество оказанных услуг, а не мест. Места и вес уже учтены в расчёте по тарифу (например, выгрузка 3 места × ставку).
                </div>
              </div>
            </div>

            <div className="form_grid" style={{ marginTop: 20 }}>
              <div className="field" style={{ gridColumn: "span 4" }}>
                <div className="label">Вид упаковки</div>
                <input value={packaging} onChange={(e) => setPackaging(e.target.value)} placeholder="Напр. Паллеты, Коробки" />
              </div>
              <label style={{ gridColumn: "span 1" }} className="label_checkbox">
                <input type="checkbox" checked={insured} onChange={(e) => setInsured(e.target.checked)} />
                Имеется ли страховка?
              </label>
              {insured && (
                <div className="field" style={{ gridColumn: "span 1" }}>
                  <div className="label">Стоимость груза по инвойсу</div>
                  <input type="text" value={cargoValue} onChange={(e) => setCargoValue(e.target.value)} placeholder="Напр. 5 000 000 тенге" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!isWarehouse && (
        <div className="card card--transport" style={{ gridColumn: "span 2", marginTop: 20 }}>
          <div
            className="card_head card_head--transport"
            onClick={() => setShowTransportCard((v) => !v)}
            style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div className="card_title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  transform: showTransportCard ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                  display: "inline-block",
                  fontSize: "0.9rem",
                }}
              >
                ▶
              </span>
              ВИД ТРАНСПОРТА
            </div>
          </div>
          {showTransportCard && (
            <div className="card_body">
              <div className="form_grid">
                <div className="field" style={{ gridColumn: "span 2" }}>
                  <div className="label">
                    Вид перевозки <span className="text_danger">*</span>
                  </div>
                  <select
                    value={docAttrs.transportType}
                    onChange={(e) => {
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
                        flightNumber: "",
                      });
                    }}
                  >
                    <option value="auto_console">Авто консолидация</option>
                    <option value="auto_separate">Отдельное авто</option>
                    <option value="plane">Самолет</option>
                    <option value="train">Поезд рейс</option>
                  </select>
                </div>

                {(docAttrs.transportType === "auto_console" || docAttrs.transportType === "auto_separate") && (
                  <>
                    <div className="field">
                      <div className="label">Марка автомобиля</div>
                      <input value={docAttrs.vehicleModel} onChange={(e) => setDocAttrs({ ...docAttrs, vehicleModel: e.target.value })} placeholder="Volvo" />
                    </div>
                    <div className="field">
                      <div className="label">Госномер автомобиля</div>
                      <input value={docAttrs.vehicleNumber} onChange={(e) => setDocAttrs({ ...docAttrs, vehicleNumber: e.target.value })} placeholder="016ACT02" />
                    </div>
                    <div className="field">
                      <div className="label">Водитель (Ф.И.О.)</div>
                      <input value={docAttrs.driver} onChange={(e) => setDocAttrs({ ...docAttrs, driver: e.target.value })} />
                    </div>
                    <div className="field" style={{ gridColumn: "span 1" }}>
                      <label className="label_checkbox" style={{ marginTop: 32 }}>
                        <input type="checkbox" checked={!!docAttrs.hasTrailer} onChange={(e) => setDocAttrs({ ...docAttrs, hasTrailer: e.target.checked })} />
                        Имеется прицеп
                      </label>
                    </div>
                    {docAttrs.hasTrailer && (
                      <>
                        <div className="field">
                          <div className="label">Марка прицепа</div>
                          <input value={docAttrs.trailerModel} onChange={(e) => setDocAttrs({ ...docAttrs, trailerModel: e.target.value })} placeholder="Schmitz" />
                        </div>
                        <div className="field">
                          <div className="label">Госномер прицепа</div>
                          <input value={docAttrs.trailerNumber} onChange={(e) => setDocAttrs({ ...docAttrs, trailerNumber: e.target.value })} placeholder="21WSZ05" />
                        </div>
                      </>
                    )}
                  </>
                )}

                {docAttrs.transportType === "plane" && (
                  <>
                    <div className="field">
                      <div className="label">Номер рейса</div>
                      <input value={docAttrs.flightNumber} onChange={(e) => setDocAttrs({ ...docAttrs, flightNumber: e.target.value })} />
                    </div>
                    <div className="field">
                      <div className="label">Ответственный</div>
                      <input value={docAttrs.driver} onChange={(e) => setDocAttrs({ ...docAttrs, driver: e.target.value })} />
                    </div>
                  </>
                )}

                {docAttrs.transportType === "train" && (
                  <>
                    <div className="field">
                      <div className="label">Поезд / Вагон</div>
                      <input value={docAttrs.flightNumber} onChange={(e) => setDocAttrs({ ...docAttrs, flightNumber: e.target.value })} />
                    </div>
                    <div className="field">
                      <div className="label">Ответственный</div>
                      <input value={docAttrs.driver} onChange={(e) => setDocAttrs({ ...docAttrs, driver: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="field" style={{ marginTop: 10 }}>
        <div className="label">Сумма (тг)</div>
        <input value={totalSum} readOnly style={{ background: "#f5f5f5", cursor: "not-allowed" }} placeholder="Рассчитывается автоматически из услуг" />
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <div className="label">Дата</div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {/* Модалка «Найти в базе» убрана (ТЗ): контрагент подбирается инлайн-подсказкой
          прямо в поле «ФИО / Название» — см. CounterpartyField. */}

      <div className="page_actions" style={{ marginTop: 24, paddingBottom: 40 }}>
        <button className="btn btn--accent btn--lg" style={{ width: "100%", opacity: loading ? 0.7 : 1 }} onClick={onSave} disabled={loading}>
          {loading ? "Сохранение данных..." : isEditMode ? "Сохранить изменения" : "Создать заявку"}
        </button>
      </div>

      {/* datalist'ы городов убраны: города теперь выбираются через CitySelect,
          ссылок на эти списки не осталось. */}
    </>
  );
}