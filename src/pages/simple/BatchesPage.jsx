import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("ru");
}

// ---- СОРТИРОВКА ----
function getSortValue(b, field) {
  switch (field) {
    case 'number':       return (b.number || '').toString().toLowerCase();
    case 'date':         return new Date(b.createdAt || 0).getTime();
    case 'city':         return (b.city || '').toString().toLowerCase();
    case 'driverName':   return (b.driverName || '').toString().toLowerCase();
    case 'carNumber':    return (b.carNumber || '').toString().toLowerCase();
    case 'deliveryCost': return Number(b.deliveryCost) || 0;
    case 'totalSeats':   return Number(b.totalSeats) || 0;
    case 'totalWeight':  return Number(b.totalWeight) || 0;
    default:             return '';
  }
}

/**
 * 🆕 Генератор последовательных номеров партий: П000001, П000002...
 * Берёт все партии с сервера, находит max номер с префиксом П, добавляет +1.
 * Fallback на timestamp если что-то пошло не так.
 */
async function genNextBatchNumber(companyId) {
  try {
    const allBatches = await api.batches.list(companyId);
    const pattern = /^П(\d+)$/;
    let maxNum = 0;
    (allBatches || []).forEach(b => {
      const num = b.number;
      if (num) {
        const m = String(num).match(pattern);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
    });
    return "П" + String(maxNum + 1).padStart(6, "0");
  } catch (e) {
    console.warn("Не удалось получить max номер партии, fallback на timestamp:", e);
    return "П" + String(Date.now()).slice(-6);
  }
}

const EMPTY_FORM = {
  number: "", city: "", driverName: "", driverPhone: "",
  carNumber: "", deliveryCost: "",
  totalSeats: "", totalWeight: "",
};

export default function BatchesPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(getSelectedCompany());
  const [showForm, setShowForm] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Табы Активные / Сформированные
  const [tab, setTab] = useState('active');

  // Сортировка
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const sortArrow = (field) => {
    if (sortBy !== field) return <span style={{ color: '#bbb', marginLeft: 4 }}>⇅</span>;
    return <span style={{ color: '#1890ff', marginLeft: 4, fontWeight: 700 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const SortableTh = ({ field, children, style }) => (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', ...style }}
      onClick={() => handleSort(field)}
      title="Клик для сортировки"
    >
      {children}{sortArrow(field)}
    </th>
  );

  const filteredBatches = useMemo(() => {
    const filtered = batches.filter(b => tab === 'formed' ? !!b.isFormed : !b.isFormed);
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [batches, sortBy, sortOrder, tab]);

  const tabCounts = useMemo(() => ({
    active: batches.filter(b => !b.isFormed).length,
    formed: batches.filter(b => !!b.isFormed).length,
  }), [batches]);

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

  // 🆕 Последовательная нумерация вместо рандомного timestamp
  const openCreate = async () => {
    setEditBatch(null);
    const nextNum = await genNextBatchNumber(company?.id);
    setForm({ ...EMPTY_FORM, number: nextNum });
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
      totalSeats: batch.totalSeats || "",
      totalWeight: batch.totalWeight || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.number || !form.city) return alert("Укажите номер и город");
    try {
      const payload = {
        ...form,
        totalSeats: parseInt(form.totalSeats) || 0,
        totalWeight: parseFloat(form.totalWeight) || 0,
      };
      if (editBatch) {
        await api.batches.update(editBatch.id, payload);
      } else {
        await api.batches.create({ ...payload, companyId: company?.id, requestIds: "[]" });
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

  const handleForm = async (batch) => {
    if (!window.confirm(
      `Сформировать партию №${batch.number}?\n\n` +
      `После формирования партия перейдёт в раздел "Сформированные" и будет сохранена ведомость.`
    )) return;
    try {
      let requestIds = [];
      try { requestIds = JSON.parse(batch.requestIds); } catch(e) {}

      const vedomostData = JSON.stringify({
        formedAt: new Date().toISOString(),
        number: batch.number,
        city: batch.city,
        driverName: batch.driverName,
        driverPhone: batch.driverPhone,
        carNumber: batch.carNumber,
        deliveryCost: batch.deliveryCost,
        totalSeats: batch.totalSeats || 0,
        totalWeight: batch.totalWeight || 0,
        requestsCount: requestIds.length,
        company: company?.name || '',
      });

      await api.batches.update(batch.id, {
        isFormed: true,
        formedAt: new Date().toISOString(),
        vedomostData,
      });
      load();
    } catch(e) {
      alert("Ошибка при формировании: " + e.message);
    }
  };

  const handleUnform = async (batch) => {
    if (!window.confirm(`Вернуть партию №${batch.number} в активные?`)) return;
    try {
      await api.batches.update(batch.id, {
        isFormed: false,
        formedAt: null,
      });
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

    const totalSeats = batch.totalSeats || 0;
    const totalWeight = batch.totalWeight || 0;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Партия ${batch.number}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
      h2 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #000; }
      .formed-badge { display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 4px; font-size: 11px; font-weight: 700; margin-top: 4px; }
      .info { display: flex; gap: 0; border: 1px solid #aaa; margin-bottom: 16px; flex-wrap: wrap; }
      .info-cell { flex: 1; min-width: 140px; padding: 8px 12px; border-right: 1px solid #aaa; font-size: 11px; }
      .info-cell:last-child { border-right: none; }
      .info-label { color: #666; font-size: 10px; margin-bottom: 2px; }
      .info-val { font-weight: 700; font-size: 13px; }
      .totals { display: flex; gap: 12px; margin: 16px 0; }
      .total-card { flex: 1; padding: 12px; background: #f3f4f6; border-radius: 6px; text-align: center; }
      .total-card .num { font-size: 22px; font-weight: 900; color: #1f2937; }
      .total-card .lbl { font-size: 11px; color: #6b7280; margin-top: 4px; }
      .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 30px; }
      .sig { flex: 1; }
      .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 28px; }
      .sig-label { font-size: 10px; color: #333; text-align: center; }
    </style></head><body>
    <div class="header">
      <div>
        <h2>Партия № ${batch.number}</h2>
        <div style="color:#333;font-size:11px;margin-top:4px;">${company?.name || ""} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")} &nbsp;&nbsp; Город: ${batch.city}</div>
        ${batch.isFormed ? '<div class="formed-badge">✓ СФОРМИРОВАНА ' + (batch.formedAt ? new Date(batch.formedAt).toLocaleDateString("ru") : '') + '</div>' : ''}
      </div>
      <img src="${qrUrl}" width="90" height="90" style="border:1px solid #ccc;padding:3px;"/>
    </div>
    <div class="info">
      <div class="info-cell"><div class="info-label">Водитель</div><div class="info-val">${batch.driverName || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Телефон водителя</div><div class="info-val">${batch.driverPhone || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Номер авто</div><div class="info-val">${batch.carNumber || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Стоимость перевозки</div><div class="info-val">${batch.deliveryCost ? Number(batch.deliveryCost).toLocaleString() + " тг" : "—"}</div></div>
    </div>
    <div class="totals">
      <div class="total-card">
        <div class="num">${requestIds.length}</div>
        <div class="lbl">Накладных</div>
      </div>
      <div class="total-card">
        <div class="num">${totalSeats}</div>
        <div class="lbl">Мест всего</div>
      </div>
      <div class="total-card">
        <div class="num">${Number(totalWeight).toLocaleString()} кг</div>
        <div class="lbl">Общий вес</div>
      </div>
    </div>
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

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className={`btn ${tab === 'active' ? 'btn--accent' : ''}`}
          onClick={() => setTab('active')}
        >
          🟢 Активные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.active})</span>
        </button>
        <button
          className={`btn ${tab === 'formed' ? 'btn--accent' : ''}`}
          onClick={() => setTab('formed')}
        >
          ✅ Сформированные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.formed})</span>
        </button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, width: 520, maxWidth: "95vw", maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: "0 0 16px" }}>{editBatch ? "Редактировать партию" : "Новая партия"}</h2>
            <div className="form_grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <div className="label">Номер партии *</div>
                <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="П000001" />
              </div>
              <div className="field">
                <div className="label">Город назначения *</div>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Астана" />
              </div>
              <div className="field">
                <div className="label">ФИО водителя</div>
                <input value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} placeholder="Иванов Иван" />
              </div>
              <div className="field">
                <div className="label">Телефон водителя</div>
                <input value={form.driverPhone} onChange={e => setForm({ ...form, driverPhone: e.target.value })} placeholder="+7 777 123 45 67" />
              </div>
              <div className="field">
                <div className="label">Номер авто</div>
                <input value={form.carNumber} onChange={e => setForm({ ...form, carNumber: e.target.value })} placeholder="777 ABC 01" />
              </div>
              <div className="field">
                <div className="label">Стоимость перевозки (тг)</div>
                <input type="number" value={form.deliveryCost} onChange={e => setForm({ ...form, deliveryCost: e.target.value })} placeholder="0" />
              </div>
              <div className="field">
                <div className="label">Количество мест</div>
                <input type="number" value={form.totalSeats} onChange={e => setForm({ ...form, totalSeats: e.target.value })} placeholder="0" />
              </div>
              <div className="field">
                <div className="label">Общий вес (кг)</div>
                <input type="number" value={form.totalWeight} onChange={e => setForm({ ...form, totalWeight: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn--accent" onClick={handleSave}>Сохранить</button>
              <button className="btn" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, fontSize: '0.85rem', color: '#854d0e' }}>
        💡 Кликни по строке партии, чтобы открыть её детали и список накладных
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                <SortableTh field="number" style={{ width: 120 }}>Номер</SortableTh>
                <SortableTh field="date" style={{ width: 100 }}>Дата</SortableTh>
                <SortableTh field="city">Город</SortableTh>
                <SortableTh field="driverName">Водитель</SortableTh>
                <SortableTh field="carNumber">Авто</SortableTh>
                <SortableTh field="totalSeats" style={{ width: 80, textAlign: 'center' }}>Мест</SortableTh>
                <SortableTh field="totalWeight" style={{ width: 100, textAlign: 'center' }}>Вес</SortableTh>
                <SortableTh field="deliveryCost" style={{ width: 130 }}>Стоимость</SortableTh>
                <th style={{ width: 280 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length === 0 ? (
                <tr><td colSpan={9} className="muted" style={{ padding: 16 }}>
                  {!company ? "Выберите компанию." :
                    tab === 'active' ? 'Нет активных партий' : 'Нет сформированных партий'}
                </td></tr>
              ) : (
                filteredBatches.map(b => (
                  <tr
                    key={b.id}
                    onClick={(e) => {
                      // Игнорируем клик если кликнули по кнопке внутри столбца действий
                      if (e.target.closest('button') || e.target.closest('.actions-cell')) return;
                      navigate(`/simple/batches/${b.id}`);
                    }}
                    style={{
                      borderLeft: b.isFormed ? '4px solid #22c55e' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <td style={{ fontWeight: 700 }}>
                      {b.number}
                      {b.isFormed && (
                        <div style={{
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          background: '#d1fae5',
                          color: '#065f46',
                          borderRadius: 3,
                          fontWeight: 700,
                          marginTop: 2,
                          display: 'inline-block',
                        }}>
                          ✓ {formatDate(b.formedAt)}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>{b.city}</td>
                    <td>
                      <div>{b.driverName || "—"}</div>
                      {b.driverPhone && <div className="muted" style={{ fontSize: "0.8rem" }}>{b.driverPhone}</div>}
                    </td>
                    <td>{b.carNumber || "—"}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.totalSeats || "—"}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{b.totalWeight ? `${Number(b.totalWeight).toLocaleString()} кг` : "—"}</td>
                    <td>{b.deliveryCost ? `${Number(b.deliveryCost).toLocaleString()} тг` : "—"}</td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn--sm"
                          onClick={() => navigate(`/simple/batches/${b.id}`)}
                          title="Открыть детали партии"
                          style={{ background: '#2563eb', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
                        >
                          👁 Открыть
                        </button>
                        <button
                          className="btn btn--sm"
                          onClick={() => printVedomost(b)}
                          title="Распечатать ведомость"
                          style={{ fontSize: 11 }}
                        >
                          🖨 Печать
                        </button>
                        {b.isFormed ? (
                          <button
                            className="btn btn--sm"
                            onClick={() => handleUnform(b)}
                            title="Вернуть в активные"
                            style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', fontSize: 11 }}
                          >
                            ↩ В активные
                          </button>
                        ) : (
                          <button
                            className="btn btn--sm"
                            onClick={() => handleForm(b)}
                            title="Сформировать партию"
                            style={{ background: '#22c55e', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700 }}
                          >
                            ✓ Сформировать
                          </button>
                        )}
                        <button className="btn btn--sm" onClick={() => openEdit(b)} title="Редактировать">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        <button className="btn btn--sm" onClick={() => handleDelete(b.id)} title="Удалить" style={{ color: "#ff4d4f" }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
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