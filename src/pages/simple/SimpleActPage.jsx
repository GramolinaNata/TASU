import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany } from "../../shared/storage/companyStorage.js";

const TRANSPORT_TYPES = [
  { value: "auto_console", label: "Авто-консолидация" },
  { value: "avia_console", label: "Авиа-консолидация" },
];

export default function SimpleActPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saveAndNext, setSaveAndNext] = useState(false);
  const [company, setCompany] = useState(null);
  const [tariffs, setTariffs] = useState([]);
  const [saved, setSaved] = useState(false);
  const [autoCalc, setAutoCalc] = useState(false);
  const [form, setForm] = useState({
    senderName: "",
    senderPhone: "",
    receiverName: "",
    receiverPhone: "",
    toCity: "",
    seats: "",
    weight: "",
    cargoText: "",
    transportType: "auto_console",
    totalSum: "",
  });

  useEffect(() => {
    setCompany(getSelectedCompany());
    api.tariffs.list().then(data => {
      if (Array.isArray(data)) setTariffs(data);
    }).catch(() => {});
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

  const resetForm = () => {
    setForm({
      senderName: "",
      senderPhone: "",
      receiverName: "",
      receiverPhone: "",
      toCity: "",
      seats: "",
      weight: "",
      cargoText: "",
      transportType: "auto_console",
      totalSum: "",
    });
    setSaved(false);
    setAutoCalc(false);
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
        details: JSON.stringify({
          isSimple: true,
          transportType: form.transportType,
          customer: { fio: form.senderName, phone: form.senderPhone },
          receiver: { fio: form.receiverName, phone: form.receiverPhone },
          route: { fromCity: company?.name || "", toCity: form.toCity },
          cargoText: form.cargoText,
          totals: { seats: Number(form.seats), weight: Number(form.weight) },
          totalSum: form.totalSum,
        }),
      });

      // Генерируем наклейку
const label = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:10px;}
  .label{border:2px solid #333;padding:12px;width:280px;font-size:12px;}
  .title{font-size:16px;font-weight:bold;text-align:center;margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:6px;}
  .row{margin:4px 0;}
  .label-key{color:#666;font-size:11px;}
  .label-val{font-weight:600;}
  .big{font-size:18px;font-weight:bold;text-align:center;margin:8px 0;padding:6px;background:#f0f0f0;border-radius:4px;}
</style></head><body>
<div class="label">
  <div class="title">ГРУЗ / TASU KZ</div>
  <div class="row"><span class="label-key">Отправитель:</span><br/><span class="label-val">${form.senderName}</span></div>
  <div class="row"><span class="label-key">Тел:</span> <span class="label-val">${form.senderPhone}</span></div>
  <div class="row"><span class="label-key">Получатель:</span><br/><span class="label-val">${form.receiverName}</span></div>
  <div class="row"><span class="label-key">Тел:</span> <span class="label-val">${form.receiverPhone}</span></div>
  <div class="big">→ ${form.toCity}</div>
  <div class="row"><span class="label-key">Мест:</span> <span class="label-val">${form.seats || "—"}</span> &nbsp; <span class="label-key">Вес:</span> <span class="label-val">${form.weight || "—"} кг</span></div>
  <div class="row"><span class="label-key">Груз:</span> <span class="label-val">${form.cargoText || "—"}</span></div>
  <div class="row"><span class="label-key">Сумма:</span> <span class="label-val">${form.totalSum ? Number(form.totalSum).toLocaleString() + " тг" : "—"}</span></div>
  <div class="row"><span class="label-key">Дата:</span> <span class="label-val">${new Date().toLocaleDateString("ru")}</span></div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

const blob = new Blob([label], { type: "text/html; charset=utf-8" });
window.open(URL.createObjectURL(blob), "_blank");

if (saveAndNext) {
  setSaved(true);
  resetForm();
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
        </div>
        <button className="btn" onClick={() => navigate("/simple")}>Отмена</button>
      </div>

      {saved && (
        <div style={{ margin: "16px 0", padding: "10px 16px", background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8, color: "#389e0d", fontSize: "0.95rem" }}>
          ✅ Накладная сохранена! Заполните следующую.
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
                <div className="label">Телефон получателя</div>
                <input value={form.receiverPhone} onChange={e => setForm({...form, receiverPhone: e.target.value})} placeholder="+7 (777) 765-43-21" />
              </div>
              <div className="field">
                <div className="label">Город назначения *</div>
                <input value={form.toCity} onChange={e => setForm({...form, toCity: e.target.value})} placeholder="Алматы" required list="cities-list" />
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