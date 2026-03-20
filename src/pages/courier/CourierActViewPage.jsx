import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { useAuth } from "../../shared/auth/AuthContext";
import Loader from "../../shared/components/Loader";

function formatDisplayDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString();
}

const STATUS_MAP = {
  'act': 'Акт',
  'draft': 'Черновик',
  'Забрано': 'Забрано',
  'Доставлено': 'Доставлено',
  'Заявка': 'Заявка'
};

export default function CourierActViewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { user, isCourier } = useAuth();
  const [act, setAct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadAct = async () => {
    try {
      const found = await api.public.getAct(id);
      if (found) {
        let details = {};
        if (found.details) {
          try {
            details = typeof found.details === 'string' ? JSON.parse(found.details) : found.details;
          } catch (e) { console.error("Parse details error", e); }
        }
        
        // Ensure cargo is populated from details if column is empty
        const cargoDisplay = found.cargo || details.cargoText || details.cargo || "—";
        
        setAct({ ...found, docAttrs: details, cargoDisplay });
      }
    } catch (err) {
      console.error("Load act error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAct();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
        await api.requests.update(act.id, { status: newStatus });
        await loadAct(); // Перегружаем данные
        alert(`Статус обновлен на: ${newStatus}`);
    } catch (err) {
        alert("Ошибка обновления: " + err.message);
    } finally {
        setUpdating(false);
    }
  };

  if (loading) return <Loader />;
  if (!act) return (
    <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
      <h3 style={{ color: 'var(--danger)' }}>Заявка не найдена</h3>
      <p style={{ color: 'var(--muted)' }}>Возможно, она была удалена или у вас нет доступа.</p>
      <button className="btn btn--primary" onClick={() => nav('/')} style={{ marginTop: '1rem' }}>На главную</button>
    </div>
  );

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--bg)', 
      padding: '2rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Background Decorative Element */}
      <div style={{
        position: 'fixed',
        top: '-10%',
        right: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
        opacity: 0.1,
        zIndex: 0,
        pointerEvents: 'none'
      }}></div>

      <div style={{ width: '100%', maxWidth: '500px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <button className="btn btn--ghost glass" onClick={() => nav(-1)} style={{ borderRadius: '12px' }}>
              ← Назад
          </button>
          {!user && (
              <Link to="/login" state={{ from: location }} className="btn glass" style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600, borderRadius: '12px' }}>
                  🔑 Войти
              </Link>
          )}
        </div>

        <div className="premium-card glass" style={{ border: 'none' }}>
          <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="label-mini" style={{ marginBottom: '0.5rem' }}>Заявка на перевозку</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              #{act?.docNumber || act?.number || act?.id?.slice(0, 8)}
            </h1>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                <span className={`badge badge-primary status-glow`} style={{ 
                    '--glow-color': act?.status === 'Заявка' ? 'var(--primary)' : act?.status === 'Доставлено' ? 'var(--success)' : 'var(--info)',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '0.8rem'
                }}>
                    {STATUS_MAP[act?.status] || act?.status}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {formatDisplayDate(act?.date)}
                </span>
            </div>
          </header>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <section>
                    <label className="label-mini">Клиент</label>
                    <div style={{ fontWeight: '700', fontSize: '1rem' }}>{act?.customer?.companyName || act?.company?.name || "—"}</div>
                </section>
                <section style={{ textAlign: 'right' }}>
                    <label className="label-mini">Тип</label>
                    <div style={{ fontWeight: '600' }}>{act?.type === 'WAREHOUSE' ? 'Склад' : 'Транспорт'}</div>
                </section>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <section style={{ marginBottom: '1rem' }}>
                    <label className="label-mini">Маршрут</label>
                    <div style={{ fontWeight: '700', color: 'var(--text)' }}>{act?.route || "—"}</div>
                </section>
                <section>
                    <label className="label-mini">Вид упаковки</label>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{act?.docAttrs?.packaging || "—"}</div>
                </section>
            </div>

            {/* СУММА - Только для авторизованных */}
            <section className="protected-section" style={{ textAlign: 'center' }}>
                <label className="label-mini">Сумма к оплате</label>
                {user ? (
                    <div style={{ fontWeight: '800', fontSize: '1.8rem', color: 'var(--text)', marginTop: '0.5rem' }}>
                        {act?.docAttrs?.totalSum ? `${Number(act.docAttrs.totalSum).toLocaleString()} тг` : "—"}
                    </div>
                ) : (
                    <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                            Информация защищена
                        </div>
                        <Link to="/login" state={{ from: location }} className="btn btn--primary" style={{ borderRadius: '10px', padding: '8px 20px', width: 'auto', display: 'inline-block' }}>
                            Авторизоваться для доступа
                        </Link>
                    </div>
                )}
            </section>

            {act?.docAttrs && (act.docAttrs.vehicle || act.docAttrs.driver) && (
              <section style={{ display: 'grid', gap: '8px' }}>
                <label className="label-mini">Детали перевозки</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {act.docAttrs.vehicle && (
                        <div style={{ fontSize: '0.85rem', padding: '8px', border: '1px solid var(--line)', borderRadius: '10px' }}>
                            <span style={{opacity: 0.6}}>🚗</span> {act.docAttrs.vehicle}
                        </div>
                    )}
                    {act.docAttrs.driver && (
                        <div style={{ fontSize: '0.85rem', padding: '8px', border: '1px solid var(--line)', borderRadius: '10px' }}>
                            <span style={{opacity: 0.6}}>👤</span> {act.docAttrs.driver}
                        </div>
                    )}
                </div>
              </section>
            )}

            {/* КНОПКИ ДЛЯ КУРЬЕРА */}
            {user && isCourier && (
              <section style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button 
                      className="btn btn--primary" 
                      disabled={updating || act.status === 'Забрано'} 
                      onClick={() => handleStatusUpdate('Забрано')}
                      style={{ background: 'var(--info)', borderColor: 'transparent', borderRadius: '12px', fontWeight: 700 }}
                  >
                      {updating ? 'wait...' : '📦 Забрал'}
                  </button>
                  <button 
                      className="btn btn--primary" 
                      disabled={updating || act.status === 'Доставлено'} 
                      onClick={() => handleStatusUpdate('Доставлено')}
                      style={{ background: 'var(--success)', borderColor: 'transparent', borderRadius: '12px', fontWeight: 700 }}
                  >
                      {updating ? 'wait...' : '🏁 Доставил'}
                  </button>
              </section>
            )}

            <footer>
               <div style={{ height: '1px', background: 'var(--line)', margin: '1rem 0' }}></div>
               <label className="label-mini">Ответственный менеджер</label>
               <div style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{act?.manager?.name}</span>
                    <span style={{ color: 'var(--muted)' }}>{act?.manager?.email}</span>
               </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
