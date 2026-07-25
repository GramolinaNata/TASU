
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany } from "../../shared/storage/companyStorage.js";
import { upsertCounterparty, phoneDigits } from "../../shared/counterparty/upsertCounterparty.js";

// Подсказки контрагентов: поиск по ФИО или телефону, клик подставляет поля.
function ContactSuggest({ items, query, onPick }) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 2) return null;
  const qd = phoneDigits(q);
  const matches = (items || []).filter(c => {
    const nameHit = String(c.name || "").toLowerCase().includes(q);
    const phoneHit = qd && phoneDigits(c.phone).includes(qd);
    return nameHit || phoneHit;
  }).slice(0, 6);
  if (!matches.length) return null;
  return (
    <div style={{ position: "absolute", zIndex: 30, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", width: "100%", maxHeight: 200, overflowY: "auto", marginTop: 2 }}>
      {matches.map(c => (
        <div
          key={c.id}
          onMouseDown={() => onPick(c)}
          style={{ padding: "6px 10px", cursor: "pointer", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" }}
          onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
          onMouseLeave={e => e.currentTarget.style.background = ""}
        >
          <strong>{c.name}</strong>{c.phone ? ` · ${c.phone}` : ""}{c.companyName ? ` · ${c.companyName}` : ""}
        </div>
      ))}
    </div>
  );
}
import { calcDeliveryPrice, findDeliveryTariff, cleanCityName, getTariffCategory, getDeliveryDestinations, getTariffOrigins } from "../../shared/tariff/calcTariff.js";
import {
  emptyDimGroup, groupVolumeM3, groupsVolumeM3, groupsSeats,
  sizeSurcharge, sizeSurchargeParts, serializeDimGroups,
} from "../../shared/dims/dimGroups.js";

// Заказчик отключил доставку по городу (только по регионам). Логика/параметр
// cityDelivery в движке сохранены — чтобы вернуть чекбокс, поставь true.
const SHOW_CITY_DELIVERY = false;

// Доплата за посёлок теперь автоматическая (посёлок = город назначения внутри
// тарифа). Чекбокс «Доставка в регион» + список + автоподстановка скрыты; код цел.
const SHOW_REGION_DELIVERY = false;

// ТЗ: у частных лиц ПРР (погрузка-разгрузка) и хранение НЕ используются —
// это только функционал юрлиц (ActCreatePage). Скрыт ТОЛЬКО ввод: поля формы,
// параметры calcDeliveryPrice и вся логика движка целы, поэтому старые накладные
// с заполненными prrType/storageMode считаются как раньше. Вернуть — поставь true.
const SHOW_PRR_STORAGE = false;

const TRANSPORT_TYPES = [
  { value: "auto_console", label: "Авто-консолидация" },
  { value: "avia_console", label: "Авиа-консолидация" },
];

/**
 * HTML-escape для безопасной подстановки в шаблон наклейки.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 🆕 ТЗ: чек всплывает сразу при сохранении. Строим HTML чека из данных формы.
function openReceipt(form, company, docNumber) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const companyName = company?.name || "";
  const companyBin = company?.bin || "";
  const companyPhones = (company?.phone || "").split(/[,\n;]/).map(s => s.trim()).filter(Boolean);

  const docNum = docNumber || "—";
  const senderFio = form.senderName || "—";
  const senderPhone = form.senderPhone || "";
  const receiverFio = form.receiverName || "—";
  const receiverPhone = form.receiverPhone || "";
  const toCity = form.toCity || "—";
  const seats = form.seats || "—";
  const weight = form.weight ? `${form.weight} кг` : "—";
  const sum = form.totalSum ? Number(form.totalSum).toLocaleString() : "—";

  const tt = form.transportType;
  const transportLabel = (tt === 'avia_console' || tt === 'plane') ? 'Авиа' : (tt === 'train' ? 'Поезд' : 'Авто');
  const paymentLabel = "ОПЛАТА ПОЛУЧАТЕЛЕМ";

  const receiptBlock = `
<div class="receipt">
  <div class="row"><strong>${escapeHtml(companyName)}</strong></div>
  ${companyBin ? `<div class="row">БИН: ${escapeHtml(companyBin)}</div>` : ''}
  <div class="row"><strong>№${escapeHtml(docNum)}</strong></div>
  <div class="sep">- - - - - - - - - - - - - - - - - -</div>
  <div class="row">Отпр: ${escapeHtml(senderFio)}${senderPhone ? ' ' + escapeHtml(senderPhone) : ''}</div>
  <div class="row">Получ: ${escapeHtml(receiverFio)}${receiverPhone ? ' ' + escapeHtml(receiverPhone) : ''}</div>
  <div class="row">Направление: ${escapeHtml(toCity)}</div>
  <div class="sep">- - - - - - - - - - - - - - - - - -</div>
  <div class="row">Перевозка: ${escapeHtml(transportLabel)}</div>
  <div class="row">Мест: ${escapeHtml(String(seats))} | Вес: ${escapeHtml(String(weight))}</div>
  <div class="row"><strong>Итого: ${escapeHtml(String(sum))} тг</strong></div>
  <div class="row">Дата: ${escapeHtml(dateStr)}</div>
  <div class="sep">- - - - - - - - - - - - - - - - - -</div>
  <div class="row"><strong>${escapeHtml(paymentLabel)}</strong></div>
  <div class="row">подпись: _______________</div>
  ${companyPhones.length > 0 ? `<div class="row">Тел: ${escapeHtml(companyPhones.join(', '))}</div>` : ''}
</div>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Чек №${escapeHtml(docNum)}</title>
<style>
@page { size: 70mm auto; margin: 0; }
  @media print { body { margin: 0; } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: 'Courier New', monospace; padding: 4px; max-width: 280px; margin: 0 auto; color: #000; background: #fff; font-size: 11px; line-height: 1.25; font-weight: 700; }
  .receipt { padding: 4px 2px; margin-bottom: 8px; border-bottom: 1px dashed #000; }
  .receipt:last-child { border-bottom: none; }
  .row { margin: 0; word-wrap: break-word; font-weight: 700; }
  .sep { color: #000; margin: 2px 0; font-weight: 700; }
  strong { font-weight: 900; }
</style>
</head><body>
${receiptBlock}
${receiptBlock}
<script>window.onload = () => { window.print(); }</script>
</body></html>`;

  const blob = new Blob([html], { type: "text/html; charset=utf-8" });
  window.open(URL.createObjectURL(blob), "_blank");
}

/**
 * 🆕 Генератор последовательных номеров для частных накладных: А000001, А000002...
 * Берёт ВСЕ накладные компании (allCompany=true) — для PRIVATE это важно,
 * чтобы новые номера не пересекались с уже существующими в БД.
 */
async function genNextSimpleNumber() {
  try {
    const allActs = await api.requests.list({ allCompany: true });
    const pattern = /^А(\d+)$/;
    let maxNum = 0;
    (allActs || []).forEach(a => {
      const candidates = [a.docNumber, a.number];
      try {
        const det = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
        if (det && det.docNumber) candidates.push(det.docNumber);
      } catch (e) {}
      candidates.forEach(num => {
        if (num) {
          const m = String(num).match(pattern);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxNum) maxNum = n;
          }
        }
      });
    });
    return "А" + String(maxNum + 1).padStart(6, "0");
  } catch (e) {
    console.warn("Не удалось получить max номер, fallback на timestamp:", e);
    return "А" + String(Date.now()).slice(-7);
  }
}

export default function SimpleActPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [counterparties, setCounterparties] = useState([]);
  const [focusedField, setFocusedField] = useState(""); // какое поле активно (для показа подсказок)
  const [saveAndNext, setSaveAndNext] = useState(false);
  const [company, setCompany] = useState(null);
  const [tariffs, setTariffs] = useState([]);
  const [saved, setSaved] = useState(false);
  const [autoCalc, setAutoCalc] = useState(false);
  const [docNumber, setDocNumber] = useState("");
  const [form, setForm] = useState({
    senderName: "",
    senderPhone: "",
    receiverName: "",
    receiverCompany: "",
    receiverPhone: "",
    fromCity: "",
    toCity: "",
    seats: "",
    prrType: "",
    pallets: "",
    storageMode: "",
    storageDays: "",
    cityDelivery: false,
    regionEnabled: false,
    regionDelivery: "",
    weight: "",
    // Группы размеров: у каждой свои Д×Ш×В, свои места и своя категория габарита.
    // Старые одиночные поля length/width/height/sizeCategory больше не используются.
    dimGroups: [emptyDimGroup()],
    cargoText: "",
    transportType: "auto_console",
    totalSum: "",
  });

  useEffect(() => {
    const c = getSelectedCompany();
    setCompany(c);
    // Город отправителя по умолчанию: из настройки компании (если появится), иначе «Алматы».
    setForm(prev => ({ ...prev, fromCity: prev.fromCity || c?.city || "Алматы" }));
    api.tariffs.list().then(data => {
      if (Array.isArray(data)) setTariffs(data);
    }).catch(() => {});
    api.counterparties.list(c?.id).then(data => {
      if (Array.isArray(data)) setCounterparties(data);
    }).catch(() => {});
    // 🆕 Последовательная нумерация вместо рандомного timestamp
    genNextSimpleNumber().then(setDocNumber);
  }, []);

  // Объём груза (м³) = Σ(Д×Ш×В×мест_i) / 1 000 000 по всем группам размеров.
  const volumeM3 = useMemo(() => groupsVolumeM3(form.dimGroups), [form.dimGroups]);

  // Количество мест — автосумма по группам. Отдельного ручного поля больше нет:
  // именно эта сумма уходит в totals.seats, в наклейку, в чек и в расчёт.
  const seatsTotal = useMemo(() => groupsSeats(form.dimGroups), [form.dimGroups]);

  // form.seats держим в синхроне с суммой по группам — на него завязаны
  // наклейка (печать), чек и payload накладной.
  useEffect(() => {
    setForm(prev => (String(prev.seats) === String(seatsTotal) ? prev : { ...prev, seats: seatsTotal }));
  }, [seatsTotal]);

  // ── Операции над группами размеров ──
  const addDimGroup = () => setForm(f => ({ ...f, dimGroups: [...f.dimGroups, emptyDimGroup()] }));
  const removeDimGroup = (idx) => setForm(f => ({
    ...f,
    // Минимум одна группа всегда остаётся — её просто очищаем.
    dimGroups: f.dimGroups.length <= 1 ? [emptyDimGroup()] : f.dimGroups.filter((_, i) => i !== idx),
  }));
  const setDimGroup = (idx, patch) => setForm(f => ({
    ...f,
    dimGroups: f.dimGroups.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
  }));

  // 🆕 Автоподсчёт суммы через единый движок calcTariff (категория "private").
  // Считается по правилам частных лиц + max(вес, куб) по кубатуре из габаритов.
  //
  // Категория габарита теперь задаётся ПО КАЖДОЙ ГРУППЕ, а движок умеет только
  // одну надбавку на заявку. Поэтому движку передаём sizeCategory пустым, а
  // надбавку Σ(ставка_i × мест_i) считаем по группам и прибавляем сверху.
  // Сам движок при этом не меняется.
  const [sizeExtra, setSizeExtra] = useState(0);
  useEffect(() => {
    if (!form.toCity || !form.weight) {
      setAutoCalc(false);
      setSizeExtra(0);
      return;
    }
    const res = calcDeliveryPrice({
      tariffs,
      city: form.toCity,
      fromCity: form.fromCity,
      weightKg: Number(form.weight) || 0,
      volumeM3: volumeM3,
      seats: seatsTotal,
      prrType: form.prrType || "",
      pallets: Number(form.pallets) || 0,
      storageMode: form.storageMode || "",
      storageDays: Number(form.storageDays) || 0,
      cityDelivery: !!form.cityDelivery,
      regionDelivery: form.regionEnabled ? (form.regionDelivery || "") : "",
      sizeCategory: "",
      category: "private",
      transport: form.transportType === "avia_console" ? "avia" : "auto",
    });
    if (res.ok) {
      const extra = sizeSurcharge(form.dimGroups, res.tariff);
      setSizeExtra(extra);
      setForm(prev => ({ ...prev, totalSum: String(res.sum + extra) }));
      setAutoCalc(true);
    } else {
      setAutoCalc(false);
      setSizeExtra(0);
    }
  }, [form.toCity, form.fromCity, form.weight, form.transportType, form.prrType, form.pallets, form.storageMode, form.storageDays, form.cityDelivery, form.regionEnabled, form.regionDelivery, form.dimGroups, volumeM3, seatsTotal, tariffs]);

  // Список посёлков для «Доставки в регион» — из тарифов категории region_delivery.
  const regionOptions = useMemo(() => {
    const set = new Set();
    (tariffs || []).forEach(t => {
      if (getTariffCategory(t) === 'region_delivery') {
        const name = String(t.city || '').replace(/__REGIONDELIVERY$/, '').trim();
        if (name) set.add(name);
      }
    });
    return [...set].sort();
  }, [tariffs]);

  // Автоподстановка: если город назначения совпал с посёлком region_delivery —
  // ставим галочку «Доставка в регион» и выбираем посёлок. Менеджер может снять
  // (повторно не навязываем для того же города благодаря appliedRegionCity).
  const appliedRegionCity = useRef(null);
  useEffect(() => {
    if (!SHOW_REGION_DELIVERY) return; // доплата за посёлок теперь автоматическая (движок)
    const dest = (form.toCity || '').trim().toLowerCase();
    if (appliedRegionCity.current && appliedRegionCity.current !== dest) appliedRegionCity.current = null;
    if (!dest || appliedRegionCity.current === dest) return;
    const match = regionOptions.find(n => n.trim().toLowerCase() === dest);
    if (match) {
      appliedRegionCity.current = dest;
      setForm(prev => ({ ...prev, regionEnabled: true, regionDelivery: match }));
    }
  }, [form.toCity, regionOptions]);

  // keepSender=true — оставляем данные отправителя (ФИО, телефон, город),
  // очищаем получателя, груз, вес, места (для «Сохранить и добавить ещё»).
  const resetForm = async (keepSender = false) => {
    setForm(prev => ({
      senderName: keepSender ? prev.senderName : "",
      senderPhone: keepSender ? prev.senderPhone : "",
      fromCity: keepSender ? prev.fromCity : (company?.city || "Алматы"),
      receiverName: "",
      receiverCompany: "",
      receiverPhone: "",
      toCity: "",
      seats: "",
      prrType: "",
      pallets: "",
      storageMode: "",
      storageDays: "",
      cityDelivery: false,
      regionEnabled: false,
      regionDelivery: "",
      weight: "",
      dimGroups: [emptyDimGroup()],
      cargoText: "",
      transportType: "auto_console",
      totalSum: "",
    }));
    setSaved(false);
    setAutoCalc(false);
    const next = await genNextSimpleNumber();
    setDocNumber(next);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!company) return alert("Выберите компанию");
    if (!form.senderName || !form.receiverName) return alert("Укажите отправителя и получателя");
    setSaving(true);
    try {
      await api.requests.create({
        date: new Date().toISOString().split("T")[0],
        companyId: company.id,
        status: "act",
        type: "SIMPLE",
        docNumber: docNumber,
        details: JSON.stringify({
          isSimple: true,
          transportType: form.transportType,
          customer: { fio: form.senderName, phone: form.senderPhone },
          receiver: {
            fio: form.receiverName,
            phone: form.receiverPhone,
            companyName: form.receiverCompany,
          },
          route: { fromCity: form.fromCity || company?.name || "", toCity: form.toCity },
          cargoText: form.cargoText,
          // Мест — сумма по группам размеров (ручного поля больше нет).
          totals: { seats: seatsTotal, weight: Number(form.weight) },
          // Габариты теперь СОХРАНЯЕМ: раньше они жили только в форме и терялись,
          // из-за чего сумму, посчитанную по кубам, нельзя было пересчитать позже.
          dims: serializeDimGroups(form.dimGroups),
          volumeM3,
          totalSum: form.totalSum,
          docNumber: docNumber,
        }),
      });

      // Сохраняем отправителя/получателя в справочник (дедуп по телефону).
      try {
        await upsertCounterparty({ companyId: company.id, name: form.senderName, phone: form.senderPhone }, counterparties);
        await upsertCounterparty({ companyId: company.id, name: form.receiverName, phone: form.receiverPhone, companyName: form.receiverCompany }, counterparties);
        const fresh = await api.counterparties.list(company.id);
        if (Array.isArray(fresh)) setCounterparties(fresh);
      } catch { /* справочник не критичен для сохранения накладной */ }

      const qrData = `TASU-${docNumber}-${form.toCity}-${form.receiverName}`;
      const { toDataURL } = await import("qrcode");
      const qrUrl = await toDataURL(qrData, { width: 120, margin: 1 });

      const logoSrc = company?.logo || "";
      const companyName = company?.name || "";

      const logoFallbackInitials = (() => {
        if (!companyName) return "TASU";
        const cleaned = companyName.replace(/ТОО|ИП|OOO|LLP/gi, "").trim();
        return cleaned.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || cleaned.slice(0, 4).toUpperCase();
      })();

      const receiverDisplay = form.receiverCompany && form.receiverName
        ? `${form.receiverCompany}, ${form.receiverName}`
        : (form.receiverCompany || form.receiverName || "—");

      const routeFull = form.fromCity && form.toCity
        ? `${form.fromCity} → ${form.toCity}`
        : (form.toCity || "—");

      const label = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Наклейка</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  @media print { body { margin: 0; } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: Arial, sans-serif; margin: 0; padding: 8px; background: white; }
  .label { border: 2px solid #222; width: 380px; font-size: 13px; border-radius: 4px; overflow: hidden; }
  .header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 2px solid #222; gap: 10px; }
  .logo img { max-height: 50px; max-width: 130px; object-fit: contain; }
  .logo-text { font-weight: 900; color: #222; font-size: 22px; letter-spacing: 1px; padding: 4px 10px; border: 2px solid #222; border-radius: 6px; background: #f5f5f5; }
  .company-name { font-weight: 900; color: #222; font-size: 14px; text-align: right; flex: 1; }
  .cities { display: flex; border-bottom: 1px solid #222; }
  .city-from { flex: 1; padding: 8px 10px; border-right: 1px solid #222; background: #f9f9f9; }
  .city-to { flex: 2; padding: 8px 10px; background: #fff3cd; text-align: center; }
  .city-label { font-size: 10px; color: #888; margin-bottom: 3px; text-transform: uppercase; }
  .city-val { font-size: 13px; font-weight: 700; }
  .city-big { font-size: 28px; font-weight: 900; color: #333; }
  .direction-row { padding: 8px 12px; border-bottom: 1px solid #222; background: #f0f7ff; text-align: center; }
  .direction-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 3px; }
  .direction-val { font-size: 14px; font-weight: 700; color: #0050b3; }
  .info-row { display: flex; border-bottom: 1px solid #222; }
  .info-cell { flex: 1; padding: 7px 10px; border-right: 1px solid #ddd; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-size: 10px; color: #888; margin-bottom: 3px; text-transform: uppercase; }
  .info-val { font-weight: 700; font-size: 15px; }
  .num-row { padding: 10px 12px; border-bottom: 1px solid #222; background: #222; color: #fff; font-size: 17px; font-weight: 900; text-align: center; letter-spacing: 3px; }
  .receiver-block { padding: 12px; border-bottom: 1px solid #222; text-align: center; }
  .receiver-label { font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
  .receiver-name { font-size: 17px; font-weight: 900; color: #111; line-height: 1.3; word-wrap: break-word; }
  .qr-block { padding: 12px; text-align: center; }
</style></head><body>
<div class="label">
  <div class="header">
    <div class="logo">${logoSrc ? `<img src="${escapeHtml(logoSrc)}" alt="Logo"/>` : `<div class="logo-text">${escapeHtml(logoFallbackInitials)}</div>`}</div>
  </div>
  <div class="cities">
    <div class="city-from">
      <div class="city-label">город отправителя</div>
      <div class="city-val">${escapeHtml(form.fromCity || company?.name || "—")}</div>
    </div>
    <div class="city-to">
      <div class="city-label">город получателя</div>
      <div class="city-big">${escapeHtml(form.toCity || "—")}</div>
    </div>
  </div>
  <div class="direction-row">
    <div class="direction-label">Номер направления</div>
    <div class="direction-val">${escapeHtml(routeFull)}</div>
  </div>
  <div class="info-row">
    <div class="info-cell">
      <div class="info-label">мест</div>
      <div class="info-val">${escapeHtml(form.seats || "—")}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">вес</div>
      <div class="info-val">${form.weight ? escapeHtml(form.weight) + " кг" : "—"}</div>
    </div>
  </div>
  <div class="num-row">№ ${escapeHtml(docNumber)}</div>
  <div class="receiver-block">
    <div class="receiver-label">получатель</div>
    <div class="receiver-name">${escapeHtml(receiverDisplay)}</div>
  </div>
  <div class="qr-block">
    <img src="${qrUrl}" alt="QR" style="width:120px;height:120px;display:block;margin:0 auto;"/>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

      const blob = new Blob([label], { type: "text/html; charset=utf-8" });
      window.open(URL.createObjectURL(blob), "_blank");

      // 🆕 ТЗ: чек всплывает сразу при сохранении
      openReceipt(form, company, docNumber);

      if (saveAndNext) {
        setSaved(true);
        await resetForm(true); // отправитель остаётся, остальное очищается
      } else {
        navigate("/simple", { state: { refresh: Date.now() } });
      }
    } catch (err) {
      alert("Ошибка: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Совпадение частного тарифа для подсказки под полем города (учитываем направление)
  const matchedTariff = findDeliveryTariff(tariffs, form.toCity, "private", undefined, form.fromCity);

  // Подсказки городов: назначения — частные тарифы + посёлки; отправления — fromCity тарифов.
  const destinationCities = useMemo(() => getDeliveryDestinations(tariffs, "private"), [tariffs]);
  const originCities = useMemo(() => getTariffOrigins(tariffs), [tariffs]);

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Новая накладная</h1>
          <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>
            Упрощённый режим
          </div>
          {docNumber && (
            <div className="chip" style={{ background: "#f0f7ff", borderColor: "#91caff", color: "#0050b3", fontWeight: 700 }}>
              № {docNumber}
            </div>
          )}
        </div>
        <button className="btn" onClick={() => navigate("/simple")}>Отмена</button>
      </div>

      {saved && (
        <div style={{ margin: "16px 0", padding: "10px 16px", background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8, color: "#389e0d", fontSize: "0.95rem" }}>
          ✅ Накладная сохранена! Заполните следующую (№ {docNumber}).
        </div>
      )}

      <form onSubmit={handleSave} style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card_head"><div className="card_title">Отправитель</div></div>
          <div className="card_body">
            <div className="form_grid">
              <div className="field">
                <div className="label">ФИО отправителя *</div>
                <div style={{ position: 'relative' }}>
                  <input value={form.senderName} onChange={e => setForm({...form, senderName: e.target.value})}
                    onFocus={() => setFocusedField('senderName')} onBlur={() => setFocusedField('')}
                    placeholder="Иванов Иван Иванович" required />
                  {focusedField === 'senderName' && (
                    <ContactSuggest items={counterparties} query={form.senderName}
                      onPick={c => setForm(f => ({ ...f, senderName: c.name || f.senderName, senderPhone: c.phone || f.senderPhone }))} />
                  )}
                </div>
              </div>
              <div className="field">
                <div className="label">Телефон отправителя</div>
                <div style={{ position: 'relative' }}>
                  <input value={form.senderPhone} onChange={e => setForm({...form, senderPhone: e.target.value})}
                    onFocus={() => setFocusedField('senderPhone')} onBlur={() => setFocusedField('')}
                    placeholder="+7 (777) 123-45-67" />
                  {focusedField === 'senderPhone' && (
                    <ContactSuggest items={counterparties} query={form.senderPhone}
                      onPick={c => setForm(f => ({ ...f, senderName: c.name || f.senderName, senderPhone: c.phone || f.senderPhone }))} />
                  )}
                </div>
              </div>
              <div className="field">
                <div className="label">Город отправителя</div>
                <input value={form.fromCity} onChange={e => setForm({...form, fromCity: e.target.value})} placeholder="Алматы" list="origins-list" />
                <datalist id="origins-list">
                  {originCities.map((city, i) => <option key={i} value={city} />)}
                </datalist>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card_head"><div className="card_title">Получатель</div></div>
          <div className="card_body">
            <div className="form_grid">
              <div className="field">
                <div className="label">ФИО получателя *</div>
                <div style={{ position: 'relative' }}>
                  <input value={form.receiverName} onChange={e => setForm({...form, receiverName: e.target.value})}
                    onFocus={() => setFocusedField('receiverName')} onBlur={() => setFocusedField('')}
                    placeholder="Петров Пётр Петрович" required />
                  {focusedField === 'receiverName' && (
                    <ContactSuggest items={counterparties} query={form.receiverName}
                      onPick={c => setForm(f => ({ ...f, receiverName: c.name || f.receiverName, receiverPhone: c.phone || f.receiverPhone, receiverCompany: c.companyName || f.receiverCompany }))} />
                  )}
                </div>
              </div>
              <div className="field">
                <div className="label">Компания получателя</div>
                <input value={form.receiverCompany} onChange={e => setForm({...form, receiverCompany: e.target.value})} placeholder="ТОО «Пример»" />
              </div>
              <div className="field">
                <div className="label">Телефон получателя</div>
                <div style={{ position: 'relative' }}>
                  <input value={form.receiverPhone} onChange={e => setForm({...form, receiverPhone: e.target.value})}
                    onFocus={() => setFocusedField('receiverPhone')} onBlur={() => setFocusedField('')}
                    placeholder="+7 (777) 765-43-21" />
                  {focusedField === 'receiverPhone' && (
                    <ContactSuggest items={counterparties} query={form.receiverPhone}
                      onPick={c => setForm(f => ({ ...f, receiverName: c.name || f.receiverName, receiverPhone: c.phone || f.receiverPhone, receiverCompany: c.companyName || f.receiverCompany }))} />
                  )}
                </div>
              </div>
              <div className="field">
                <div className="label">Город назначения *</div>
                <input value={form.toCity} onChange={e => setForm({...form, toCity: e.target.value})} placeholder="Астана" required list="cities-list" />
                <datalist id="cities-list">
                  {destinationCities.map((d) => (
                    <option key={d.city} value={d.city}>{d.hint || undefined}</option>
                  ))}
                </datalist>
                {matchedTariff && (
                  <div style={{ marginTop: 4, fontSize: "0.8rem", color: "#389e0d" }}>
                    ✅ Частный тариф найден для «{cleanCityName(matchedTariff.city)}»
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card_head"><div className="card_title">Груз</div></div>
          <div className="card_body">
            <div className="form_grid">
              <div className="field">
                <div className="label">Количество мест</div>
                <input type="number" value={seatsTotal} readOnly disabled
                  style={{ background: '#f1f5f9', cursor: 'not-allowed', fontWeight: 700 }} />
                <div className="muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                  Сумма по группам размеров
                </div>
              </div>
              <div className="field">
                <div className="label">Вес (кг)</div>
                <input type="number" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} placeholder="0" />
              </div>

              {/* Группы размеров: 10 мест могут быть 5 одних габаритов + 5 других.
                  У каждой группы свои Д×Ш×В, свои места и своя категория габарита. */}
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <div className="label">Размеры груза (см) — для расчёта по кубам</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.dimGroups.map((g, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                      <span className="muted" style={{ fontSize: '0.75rem', minWidth: 62, fontWeight: 700 }}>Группа {idx + 1}</span>
                      <input type="number" min="0" value={g.length} placeholder="Длина" style={{ width: 82 }}
                        onChange={e => setDimGroup(idx, { length: e.target.value })} />
                      <span style={{ color: '#999' }}>×</span>
                      <input type="number" min="0" value={g.width} placeholder="Ширина" style={{ width: 82 }}
                        onChange={e => setDimGroup(idx, { width: e.target.value })} />
                      <span style={{ color: '#999' }}>×</span>
                      <input type="number" min="0" value={g.height} placeholder="Высота" style={{ width: 82 }}
                        onChange={e => setDimGroup(idx, { height: e.target.value })} />
                      <input type="number" min="0" value={g.seats} placeholder="Мест" style={{ width: 70 }}
                        onChange={e => setDimGroup(idx, { seats: e.target.value })} />
                      <select value={g.sizeCategory || ""} style={{ width: 150 }}
                        onChange={e => setDimGroup(idx, { sizeCategory: e.target.value })}>
                        <option value="">Маленькая</option>
                        <option value="medium">Средняя (+надбавка)</option>
                        <option value="large">Большая (+надбавка)</option>
                      </select>
                      <span className="muted" style={{ fontSize: '0.72rem' }}>
                        {groupVolumeM3(g) > 0 ? `${groupVolumeM3(g).toFixed(4)} м³` : "—"}
                      </span>
                      <button type="button" className="btn btn--sm" title="Удалить группу"
                        style={{ marginLeft: 'auto', color: '#dc2626', borderColor: '#fecaca' }}
                        onClick={() => removeDimGroup(idx)}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn--sm" onClick={addDimGroup}>+ Добавить группу размеров</button>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>
                    Всего мест: <strong>{seatsTotal}</strong>
                    &nbsp;·&nbsp; Объём: <strong>{volumeM3.toFixed(4)} м³</strong>
                    <span style={{ color: '#aaa', marginLeft: 4 }}>(сравнивается с весом — берётся большая сумма)</span>
                  </span>
                </div>
                {sizeExtra > 0 && (
                  <div className="muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                    Надбавка за габариты: <strong>{sizeExtra.toLocaleString()} тг</strong>
                    {" "}({sizeSurchargeParts(form.dimGroups, matchedTariff)
                      .map(p => `${p.label} ${p.rate.toLocaleString()}×${p.seats}`).join(" + ")})
                  </div>
                )}
                <div className="muted" style={{ fontSize: '0.7rem', marginTop: 4 }}>
                  Надбавки за категорию задаются в тарифе и считаются на каждое место своей группы. Маленькая — без надбавки.
                </div>
              </div>
              {SHOW_PRR_STORAGE && (
              <div className="field">
                <div className="label">ПРР (погрузка-разгрузка)</div>
                <select value={form.prrType || ""} onChange={e => setForm({...form, prrType: e.target.value})}>
                  <option value="">Нет ПРР</option>
                  <option value="pallet">Палетная</option>
                  <option value="manual">Ручная</option>
                </select>
                {form.prrType === 'pallet' && (
                  <div style={{ marginTop: 8 }}>
                    <div className="label">Количество палет</div>
                    <input type="number" min="0" value={form.pallets} onChange={e => setForm({...form, pallets: e.target.value})} placeholder="0" />
                  </div>
                )}
              </div>
              )}
              {SHOW_PRR_STORAGE && (
              <div className="field">
                <div className="label">Хранение</div>
                <select value={form.storageMode || ""} onChange={e => setForm({...form, storageMode: e.target.value})}>
                  <option value="">Без хранения</option>
                  <option value="weight">По весу</option>
                  <option value="cube">По кубам</option>
                </select>
                {form.storageMode === 'cube' && (
                  <div className="muted" style={{ fontSize: '0.7rem', marginTop: 4 }}>
                    Считается по объёму из габаритов ниже (Д×Ш×В).
                  </div>
                )}
                {form.storageMode && (
                  <div style={{ marginTop: 8 }}>
                    <div className="label">Количество дней хранения</div>
                    <input type="number" min="0" value={form.storageDays} onChange={e => setForm({...form, storageDays: e.target.value})} placeholder="0" />
                  </div>
                )}
              </div>
              )}
              {(SHOW_CITY_DELIVERY || SHOW_REGION_DELIVERY) && (
              <div className="field">
                <div className="label">Дополнительная доставка</div>
                {SHOW_CITY_DELIVERY && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                    <input type="checkbox" checked={!!form.cityDelivery} onChange={e => setForm({...form, cityDelivery: e.target.checked})} />
                    <span>Доставка до адреса в городе</span>
                  </label>
                )}
                {SHOW_REGION_DELIVERY && (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!form.regionEnabled} onChange={e => setForm({...form, regionEnabled: e.target.checked})} />
                      <span>Доставка в регион (посёлок)</span>
                    </label>
                    {form.regionEnabled && (
                      <div style={{ marginTop: 8 }}>
                        <select value={form.regionDelivery || ""} onChange={e => setForm({...form, regionDelivery: e.target.value})}>
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
              <div className="field">
                <div className="label">Характер груза</div>
                <input value={form.cargoText} onChange={e => setForm({...form, cargoText: e.target.value})} placeholder="Одежда, электроника..." />
              </div>
              <div className="field">
                <div className="label">Вид транспорта</div>
                <select value={form.transportType} onChange={e => setForm({...form, transportType: e.target.value})}>
                  {TRANSPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="field">
                <div className="label">
                  Сумма (тг)
                  {autoCalc && <span style={{ marginLeft: 8, fontSize: "0.75rem", color: "#389e0d" }}>⚡ Рассчитано автоматически</span>}
                </div>
                <input type="number" value={form.totalSum} onChange={e => { setForm({...form, totalSum: e.target.value}); setAutoCalc(false); }} placeholder="0" />
              </div>
            </div>
          </div>
        </div>

        <div className="table_actions" style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button className="btn btn--accent" type="submit" disabled={saving} onClick={() => setSaveAndNext(false)}>
            {saving && !saveAndNext ? "Сохранение..." : "💾 Сохранить"}
          </button>
          <button className="btn btn--accent" type="submit" disabled={saving} onClick={() => setSaveAndNext(true)} style={{ background: "#52c41a", borderColor: "#52c41a" }}
            title="Сохранить накладную и начать новую — отправитель останется, получатель и груз очистятся">
            {saving && saveAndNext ? "Сохранение..." : "➕ Сохранить и добавить ещё"}
          </button>
        </div>
      </form>
    </>
  );
}