import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany } from "../../shared/storage/companyStorage.js";

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
      // Проверяем корневой docNumber
      const candidates = [a.docNumber, a.number];
      // И docNumber внутри JSON details (старые накладные так хранят)
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
    weight: "",
    cargoText: "",
    transportType: "auto_console",
    totalSum: "",
  });

  useEffect(() => {
    const c = getSelectedCompany();
    setCompany(c);
    api.tariffs.list().then(data => {
      if (Array.isArray(data)) setTariffs(data);
    }).catch(() => {});
    // 🆕 Последовательная нумерация вместо рандомного timestamp
    genNextSimpleNumber().then(setDocNumber);
  }, []);

  useEffect(() => {
    if (!form.toCity || !form.weight) return;
    const tariff = tariffs.find(t => t.city.toLowerCase() === form.toCity.toLowerCase());
    if (tariff) {
      const sum = (Number(form.weight) * Number(tariff.pricePerKg)) + Number(tariff.deliveryPrice);
      setForm(prev => ({ ...prev, totalSum: sum.toString() }));
      setAutoCalc(true);
    } else {
      setAutoCalc(false);
    }
  }, [form.toCity, form.weight, tariffs]);

  const resetForm = async () => {
    setForm({
      senderName: "",
      senderPhone: "",
      receiverName: "",
      receiverCompany: "",
      receiverPhone: "",
      fromCity: "",
      toCity: "",
      seats: "",
      weight: "",
      cargoText: "",
      transportType: "auto_console",
      totalSum: "",
    });
    setSaved(false);
    setAutoCalc(false);
    // 🆕 Последовательная нумерация
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
          totals: { seats: Number(form.seats), weight: Number(form.weight) },
          totalSum: form.totalSum,
          docNumber: docNumber,
        }),
      });

      const qrData = `TASU-${docNumber}-${form.toCity}-${form.receiverName}`;
      const { toDataURL } = await import("qrcode");
      const qrUrl = await toDataURL(qrData, { width: 120, margin: 1 });

      // Лого и данные компании — из выбранной компании
      const logoSrc = company?.logo || "";
      const companyName = company?.name || "";

      // Заглушка из инициалов если нет логотипа
      const logoFallbackInitials = (() => {
        if (!companyName) return "TASU";
        const cleaned = companyName.replace(/ТОО|ИП|OOO|LLP/gi, "").trim();
        return cleaned.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || cleaned.slice(0, 4).toUpperCase();
      })();

      // ФИО/компания получателя полностью
      const receiverDisplay = form.receiverCompany && form.receiverName
        ? `${form.receiverCompany}, ${form.receiverName}`
        : (form.receiverCompany || form.receiverName || "—");

      // Номер направления
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
    ${companyName ? `<div class="company-name">${escapeHtml(companyName)}</div>` : ""}
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

      if (saveAndNext) {
        setSaved(true);
        await resetForm();
      } else {
        navigate("/simple");
      }
    } catch (err) {
      alert("Ошибка: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const matchedTariff = tariffs.find(t => t.city.toLowerCase() === form.toCity.toLowerCase());

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
                <input value={form.senderName} onChange={e => setForm({...form, senderName: e.target.value})} placeholder="Иванов Иван Иванович" required />
              </div>
              <div className="field">
                <div className="label">Телефон отправителя</div>
                <input value={form.senderPhone} onChange={e => setForm({...form, senderPhone: e.target.value})} placeholder="+7 (777) 123-45-67" />
              </div>
              <div className="field">
                <div className="label">Город отправителя</div>
                <input value={form.fromCity} onChange={e => setForm({...form, fromCity: e.target.value})} placeholder="Алматы" />
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
                <input value={form.receiverName} onChange={e => setForm({...form, receiverName: e.target.value})} placeholder="Петров Пётр Петрович" required />
              </div>
              <div className="field">
                <div className="label">Компания получателя</div>
                <input value={form.receiverCompany} onChange={e => setForm({...form, receiverCompany: e.target.value})} placeholder="ТОО «Пример»" />
              </div>
              <div className="field">
                <div className="label">Телефон получателя</div>
                <input value={form.receiverPhone} onChange={e => setForm({...form, receiverPhone: e.target.value})} placeholder="+7 (777) 765-43-21" />
              </div>
              <div className="field">
                <div className="label">Город назначения *</div>
                <input value={form.toCity} onChange={e => setForm({...form, toCity: e.target.value})} placeholder="Астана" required list="cities-list" />
                <datalist id="cities-list">
                  {tariffs.map(t => <option key={t.id} value={t.city} />)}
                </datalist>
                {matchedTariff && (
                  <div style={{ marginTop: 4, fontSize: "0.8rem", color: "#389e0d" }}>
                    ✅ Тариф: {Number(matchedTariff.pricePerKg).toLocaleString()} тг/кг + доставка {Number(matchedTariff.deliveryPrice).toLocaleString()} тг
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
                <input type="number" value={form.seats} onChange={e => setForm({...form, seats: e.target.value})} placeholder="0" />
              </div>
              <div className="field">
                <div className="label">Вес (кг)</div>
                <input type="number" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} placeholder="0" />
              </div>
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
          <button className="btn btn--accent" type="submit" disabled={saving} onClick={() => setSaveAndNext(true)} style={{ background: "#52c41a", borderColor: "#52c41a" }}>
            {saving && saveAndNext ? "Сохранение..." : "➕ Сохранить и добавить следующую"}
          </button>
        </div>
      </form>
    </>
  );
}