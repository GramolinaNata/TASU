import React, { useEffect, useState } from "react";
import { api } from "../../shared/api/api.js";

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [form, setForm] = useState({ city: "", pricePerKg: "", deliveryPrice: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.tariffs.list();
      setTariffs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingTariff(null);
    setForm({ city: "", pricePerKg: "", deliveryPrice: "" });
    setIsModalOpen(true);
  };

  const openEdit = (t) => {
    setEditingTariff(t);
    setForm({ city: t.city, pricePerKg: t.pricePerKg, deliveryPrice: t.deliveryPrice });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingTariff) {
        await api.tariffs.update(editingTariff.id, form);
      } else {
        await api.tariffs.create(form);
      }
      setIsModalOpen(false);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить тариф?")) return;
    try {
      await api.tariffs.delete(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="navbar">
        <h1>Тарифные сетки</h1>
        <button className="btn btn--accent" onClick={openCreate}>+ Добавить город</button>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        {loading ? <div style={{ padding: 16 }}>Загрузка...</div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Город</th>
                <th style={{ width: 180 }}>Тариф за кг (тг)</th>
                <th style={{ width: 180 }}>Доставка (тг)</th>
                <th style={{ width: 140, textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.length === 0 ? (
                <tr><td colSpan={4} className="muted" style={{ padding: 16 }}>Тарифы не добавлены</td></tr>
              ) : (
                tariffs.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.city}</td>
                    <td>{Number(t.pricePerKg).toLocaleString()} тг/кг</td>
                    <td>{Number(t.deliveryPrice).toLocaleString()} тг</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-sm" onClick={() => openEdit(t)} style={{ marginRight: 8 }}>Изменить</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Удалить</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal_overlay animate_fade">
          <div className="modal_content card animate_slide_up" style={{ width: 400, padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0 }}>{editingTariff ? "Изменить тариф" : "Новый тариф"}</h2>
              <button className="modal_close_btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="field" style={{ marginBottom: 16 }}>
                <div className="label">Город *</div>
                <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Алматы" required />
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <div className="label">Тариф за кг (тг)</div>
                <input type="number" value={form.pricePerKg} onChange={e => setForm({...form, pricePerKg: e.target.value})} placeholder="500" />
              </div>
              <div className="field" style={{ marginBottom: 24 }}>
                <div className="label">Стоимость доставки (тг)</div>
                <input type="number" value={form.deliveryPrice} onChange={e => setForm({...form, deliveryPrice: e.target.value})} placeholder="3000" />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Отмена</button>
                <button type="submit" className="btn btn--accent" style={{ flex: 1 }}>Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal_overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal_close_btn { background: none; border: none; font-size: 18px; cursor: pointer; padding: 4px; }
        .animate_fade { animation: fadeIn 0.2s ease; }
        .animate_slide_up { animation: slideUp 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}