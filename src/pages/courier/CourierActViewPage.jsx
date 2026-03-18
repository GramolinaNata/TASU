import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import Loader from "../../shared/components/Loader";

function formatDisplayDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString();
}

export default function CourierActViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [act, setAct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAct = async () => {
      try {
        console.log("Loading act for courier, ID:", id);
        const found = await api.public.getAct(id);
        console.log("API Result:", found);
        if (found) {
          let details = {};
          if (found.details) {
            try {
              details = JSON.parse(found.details);
            } catch (e) { console.error("Parse details error", e); }
          }
          setAct({ ...found, docAttrs: details });
        }
      } catch (err) {
        console.error("Load act error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAct();
  }, [id]);

  console.log("Rendering CourierActViewPage, act state:", act);

  if (loading) return <Loader />;
  if (!act) return (
    <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
      <h3 style={{ color: 'var(--danger)' }}>Заявка не найдена</h3>
      <p style={{ color: 'var(--muted)' }}>Возможно, она была удалена или у вас нет доступа.</p>
      <button className="btn btn--primary" onClick={() => nav('/')} style={{ marginTop: '1rem' }}>На главную</button>
    </div>
  );

  return (
    <div className="container" style={{ padding: '1rem', maxWidth: '600px' }}>
      <button className="btn btn--ghost" onClick={() => nav(-1)} style={{ marginBottom: '1rem' }}>
        ← Назад
      </button>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Заявка #{act?.docNumber || act?.id?.slice(0, 8)}
        </h1>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <span className="badge badge-primary">{act?.status}</span>
          <span style={{ marginLeft: '10px', color: 'var(--muted)', fontSize: '0.9rem' }}>
            {formatDisplayDate(act?.date)}
          </span>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <section>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Клиент</label>
            <div style={{ fontWeight: '600' }}>{act?.company?.name || "—"}</div>
          </section>

          <section>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Маршрут</label>
            <div style={{ fontWeight: '600' }}>{act?.route || "—"}</div>
          </section>

          <section>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Груз</label>
            <div style={{ fontWeight: '600' }}>{act?.cargo || "—"}</div>
          </section>

          {act?.docAttrs && (
            <section style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Детали перевозки</label>
              <div style={{ fontSize: '0.9rem', display: 'grid', gap: '4px' }}>
                {act.docAttrs.vehicle && <div>🚗 Авто: <strong>{act.docAttrs.vehicle}</strong></div>}
                {act.docAttrs.driver && <div>👤 Водитель: <strong>{act.docAttrs.driver}</strong></div>}
                {act.docAttrs.transportType && <div>📦 Тип: <strong>{act.docAttrs.transportType === 'auto_console' ? 'Сборный груз' : 'Отдельная машина'}</strong></div>}
              </div>
            </section>
          )}

          <section>
             <label style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Менеджер</label>
             <div style={{ fontSize: '0.9rem' }}>{act?.manager?.name} ({act?.manager?.email})</div>
          </section>
        </div>
      </div>
    </div>
  );
}
