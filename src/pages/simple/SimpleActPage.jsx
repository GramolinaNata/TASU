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
  const [docNumber, setDocNumber] = useState("");
  const [form, setForm] = useState({
    senderName: "",
    senderPhone: "",
    receiverName: "",
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
    setDocNumber("А" + String(Date.now()).slice(-7));
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
    setDocNumber("А" + String(Date.now()).slice(-7));
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

      const label = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @media print { body { margin: 0; } }
  body { font-family: Arial, sans-serif; margin: 0; padding: 8px; background: white; }
  .label { border: 2px solid #222; width: 320px; font-size: 12px; border-radius: 4px; overflow: hidden; }
  .header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 2px solid #222; background: #fff; }
  .logo img { height: 36px; }
  .address { font-size: 9px; text-align: right; color: #444; line-height: 1.6; }
  .cities { display: flex; border-bottom: 1px solid #222; }
  .city-from { flex: 1; padding: 6px 8px; border-right: 1px solid #222; background: #f9f9f9; }
  .city-to { flex: 2; padding: 6px 8px; background: #fff3cd; text-align: center; }
  .city-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
  .city-val { font-size: 11px; font-weight: 700; }
  .city-big { font-size: 26px; font-weight: 900; color: #333; }
  .info-row { display: flex; border-bottom: 1px solid #222; }
  .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #ddd; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
  .info-val { font-weight: 700; font-size: 13px; }
  .num-row { padding: 8px 10px; border-bottom: 1px solid #222; background: #222; color: #fff; font-size: 15px; font-weight: 900; text-align: center; letter-spacing: 3px; }
  .receiver-row { padding: 8px 10px; border-bottom: 1px solid #222; text-align: center; }
  .qr-row { padding: 10px; text-align: center; }
</style></head><body>
<div class="label">
  <div class="header">
    <div class="logo"><img src="https://tasu-test.vercel.app/images/logo.svg" alt="TASU"/></div>
    <div class="address">г. Алматы, ул. Закарпатская 162<br/>Т: ${company?.phone || "8(727)499-02-22"}</div>
  </div>
  <div class="cities">
    <div class="city-from">
      <div class="city-label">город отправителя</div>
      <div class="city-val">${form.fromCity || company?.name || "—"}</div>
    </div>
    <div class="city-to">
      <div class="city-label">город получателя</div>
      <div class="city-big">${form.toCity || "—"}</div>
    </div>
  </div>
  <div class="info-row">
    <div class="info-cell">
      <div class="info-label">мест</div>
      <div class="info-val">${form.seats || "—"}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">вес</div>
      <div class="info-val">${form.weight ? form.weight + " кг" : "—"}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">сумма</div>
      <div class="info-val">${form.totalSum ? Number(form.totalSum).toLocaleString() + " тг" : "—"}</div>
    </div>
  </div>
  <div class="num-row">№ ${docNumber}</div>
 <div style="padding:10px;border-bottom:1px solid #222;text-align:center;width:100%;box-sizing:border-box;">
    <div style="font-size:9px;color:#888;text-transform:uppercase;margin-bottom:4px;">получатель</div>
    <div style="font-size:18px;font-weight:900;">${form.receiverName.split(" ")[0] || "—"}</div>
  </div>
  <div style="padding:12px;text-align:center;width:100%;box-sizing:border-box;">
    <img src="${qrUrl}" alt="QR" style="width:100px;height:100px;display:block;margin:0 auto;"/>
  </div>
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