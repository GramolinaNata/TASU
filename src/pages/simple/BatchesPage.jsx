import React, { useEffect, useState } from "react";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("ru");
}

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(getSelectedCompany());
  const [showForm, setShowForm] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [form, setForm] = useState({
    number: "", city: "", driverName: "", driverPhone: "", carNumber: "", deliveryCost: "",
  });

  useEffect(() => {
    return subscribeSelectedCompany(c => setCompany(c));
  }, []);

  useEffect(() => {
    if (!company) { setBatches([]); setLoading(false); return; }
    load();
  }, [company]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.batches.list(company?.id);
      if (Array.isArray(list)) setBatches(list);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditBatch(null);
    setForm({ number: "П" + String(Date.now()).slice(-6), city: "", driverName: "", driverPhone: "", carNumber: "", deliveryCost: "" });
    setShowForm(true);
  };

  const openEdit = (batch) => {
    setEditBatch(batch);
    setForm({
      number: batch.number,
      city: batch.city,
      driverName: batch.driverName,
      driverPhone: batch.driverPhone,
      carNumber: batch.carNumber,
      deliveryCost: batch.deliveryCost,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.number || !form.city) return alert("Укажите номер и город");
    try {
      if (editBatch) {
        await api.batches.update(editBatch.id, form);
      } else {
        await api.batches.create({ ...form, companyId: company?.id, requestIds: [] });
      }
      setShowForm(false);
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить партию?")) return;
    try {
      await api.batches.delete(id);
      load();
    } catch(e) {
      alert("Ошибка: " + e.message);
    }
  };

  const printVedomost = async (batch) => {
    let requestIds = [];
    try { requestIds = JSON.parse(batch.requestIds); } catch(e) {}

    const { toDataURL } = await import("qrcode");
    const qrUrl = await toDataURL(`TASU-BATCH-${batch.number}`, { width: 100, margin: 1 });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Партия ${batch.number}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
      h2 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #000; }
      .info { display: flex; gap: 0; border: 1px solid #aaa; margin-bottom: 16px; }
      .info-cell { flex: 1; padding: 8px 12px; border-right: 1px solid #aaa; font-size: 11px; }
      .info-cell:last-child { border-right: none; }
      .info-label { color: #666; font-size: 10px; margin-bottom: 2px; }
      .info-val { font-weight: 700; font-size: 13px; }
      .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 30px; }
      .sig { flex: 1; }
      .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 28px; }
      .sig-label { font-size: 10px; color: #333; text-align: center; }
    </style></head><body>
    <div class="header">
      <div>
        <h2>Партия № ${batch.number}</h2>
        <div style="color:#333;font-size:11px;margin-top:4px;">${company?.name || ""} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")} &nbsp;&nbsp; Город: ${batch.city}</div>
      </div>
      <img src="${qrUrl}" width="90" height="90" style="border:1px solid #ccc;padding:3px;"/>
    </div>
    <div class="info">
      <div class="info-cell"><div class="info-label">Водитель</div><div class="info-val">${batch.driverName || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Телефон водителя</div><div class="info-val">${batch.driverPhone || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Номер авто</div><div class="info-val">${batch.carNumber || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Стоимость перевозки</div><div class="info-val">${batch.deliveryCost ? Number(batch.deliveryCost).toLocaleString() + " тг" : "—"}</div></div>
    </div>
    <div style="margin-top:8px;font-size:11px;color:#666;">Накладных в партии: ${requestIds.length}</div>
    <div class="signatures">
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Перевозчик (подпись, М.П.)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Отправитель (подпись, М.П.)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Получатель (подпись, М.П.)</div></div>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Партии</h1>
          <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
          {company && <div className="chip">{company.name}</div>}
        </div>
        <button className="btn btn--accent" onClick={openCreate}>+ Новая партия</button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, width: 480, maxWidth: "95vw" }}>
            <h2 style={{ margin: "0 0 16px" }}>{editBatch ? "Редактировать партию" : "Новая партия"}</h2>
            <div className="form_grid">
              <div className="field">
                <div className="label">Номер партии *</div>
                <input value={form.number} onChange={e => setForm({...form, number: e.target.value})} placeholder="П000001" />
              </div>
              <div className="field">
                <div className="label">Город назначения *</div>
                <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Астана" />
              </div>
              <div className="field">
                <div className="label">ФИО водителя</div>
                <input value={form.driverName} onChange={e => setForm({...form, driverName: e.target.value})} placeholder="Иванов Иван" />
              </div>
              <div className="field">
                <div className="label">Телефон водителя</div>
                <input value={form.driverPhone} onChange={e => setForm({...form, driverPhone: e.target.value})} placeholder="+7 777 123 45 67" />
              </div>
              <div className="field">
                <div className="label">Номер авто</div>
                <input value={form.carNumber} onChange={e => setForm({...form, carNumber: e.target.value})} placeholder="777 ABC 01" />
              </div>
              <div className="field">
                <div className="label">Стоимость перевозки (тг)</div>
                <input type="number" value={form.deliveryCost} onChange={e => setForm({...form, deliveryCost: e.target.value})} placeholder="0" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn--accent" onClick={handleSave}>Сохранить</button>
              <button className="btn" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Номер</th>
                <th style={{ width: 100 }}>Дата</th>
                <th>Город</th>
                <th>Водитель</th>
                <th>Номер авто</th>
                <th>Стоимость</th>
                <th style={{ width: 150 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={7} className="muted" style={{ padding: 16 }}>
                  {company ? "Партий пока нет." : "Выберите компанию."}
                </td></tr>
              ) : (
                batches.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700 }}>{b.number}</td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>{b.city}</td>
                    <td>
                      <div>{b.driverName || "—"}</div>
                      {b.driverPhone && <div className="muted" style={{ fontSize: "0.8rem" }}>{b.driverPhone}</div>}
                    </td>
                    <td>{b.carNumber || "—"}</td>
                    <td>{b.deliveryCost ? `${Number(b.deliveryCost).toLocaleString()} тг` : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn--sm" onClick={() => printVedomost(b)}>🖨️</button>
                        <button className="btn btn--sm" onClick={() => openEdit(b)}>✏️</button>
                        <button className="btn btn--sm" style={{ color: "#ff4d4f" }} onClick={() => handleDelete(b.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}