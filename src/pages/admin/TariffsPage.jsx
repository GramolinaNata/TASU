import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../shared/api/api.js";

// 🆕 ТЗ v2: Стандартные диапазоны весов для частных лиц
const WEIGHT_RANGES = [
  { key: 'r10',  label: 'до 10 кг' },
  { key: 'r20',  label: 'до 20 кг' },
  { key: 'r30',  label: 'до 30 кг' },
  { key: 'r80',  label: 'до 80 кг' },
  { key: 'r150', label: 'до 150 кг' },
  { key: 'r300', label: 'до 300 кг' },
  { key: 'r600', label: 'до 600 кг' },
];

function getSortValue(t, field) {
  switch (field) {
    case 'city':          return (t.city || '').toString().toLowerCase();
    case 'pricePerKg':    return Number(t.pricePerKg) || 0;
    case 'deliveryPrice': return Number(t.deliveryPrice) || 0;
    case 'isPrivate':     return t.isPrivate ? 1 : 0;
    default:              return '';
  }
}

const EMPTY_FORM = {
  city: "",
  pricePerKg: "",
  deliveryPrice: "",
  isPrivate: false,
  extraSum: 0,
  deliveryDays: "",
  pricePerKgOver20: "",
  pricePerCubic: "",
  regionalDeliveries: [],
  weightRanges: WEIGHT_RANGES.reduce((acc, r) => ({ ...acc, [r.key]: '', [r.key + '_delivery']: '' }), {}),
};

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState('legal');
  const [sortBy, setSortBy] = useState('city');
  const [sortOrder, setSortOrder] = useState('asc');

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

  const filteredTariffs = useMemo(() => {
    const filtered = tariffs.filter(t => tab === 'private' ? !!t.isPrivate : !t.isPrivate);
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tariffs, sortBy, sortOrder, tab]);

  const tabCounts = useMemo(() => ({
    legal: tariffs.filter(t => !t.isPrivate).length,
    private: tariffs.filter(t => !!t.isPrivate).length,
  }), [tariffs]);

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
    setForm({ ...EMPTY_FORM, isPrivate: tab === 'private' });
    setIsModalOpen(true);
  };

  const openEdit = (t) => {
    setEditingTariff(t);
    const wr = t.weightRanges && typeof t.weightRanges === 'object' ? t.weightRanges : {};
    const weightRangesForm = WEIGHT_RANGES.reduce((acc, r) => ({
      ...acc,
      [r.key]: wr[r.key] ?? '',
      [r.key + '_delivery']: wr[r.key + '_delivery'] ?? '',
    }), {});
    setForm({
      city: t.city,
      pricePerKg: t.pricePerKg,
      deliveryPrice: t.deliveryPrice,
      isPrivate: !!t.isPrivate,
      extraSum: t.extraSum || 0,
      deliveryDays: wr._deliveryDays || "",
      pricePerKgOver20: wr._pricePerKgOver20 || "",
      pricePerCubic: wr._pricePerCubic || "",
      regionalDeliveries: Array.isArray(wr._regionalDeliveries) ? wr._regionalDeliveries : [],
      weightRanges: weightRangesForm,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const wrCleaned = {};
      Object.entries(form.weightRanges).forEach(([k, v]) => {
        const num = parseFloat(v);
        if (!isNaN(num) && num > 0) wrCleaned[k] = num;
      });

      const wrWithExtras = {
        ...wrCleaned,
        _deliveryDays: form.deliveryDays || "",
        _pricePerKgOver20: parseFloat(form.pricePerKgOver20) || 0,
        _pricePerCubic: parseFloat(form.pricePerCubic) || 0,
        _regionalDeliveries: (form.regionalDeliveries || []).filter(r => r.region && r.region.trim()),
      };

      const payload = {
        city: form.city,
        pricePerKg: parseFloat(form.pricePerKg) || 0,
        deliveryPrice: parseFloat(form.deliveryPrice) || 0,
        isPrivate: !!form.isPrivate,
        extraSum: parseFloat(form.extraSum) || 0,
        weightRanges: wrWithExtras,
      };

      if (editingTariff) {
        await api.tariffs.update(editingTariff.id, payload);
      } else {
        await api.tariffs.create(payload);
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

  const updateWeightRange = (key, value) => {
    setForm(prev => ({
      ...prev,
      weightRanges: { ...prev.weightRanges, [key]: value }
    }));
  };

  return (
    <div>
      <div className="navbar">
        <h1>Тарифные сетки</h1>
        <button className="btn btn--accent" onClick={openCreate}>+ Добавить тариф</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className={`btn ${tab === 'legal' ? 'btn--accent' : ''}`}
          onClick={() => setTab('legal')}
        >
          🏢 Юр. лица <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.legal})</span>
        </button>
        <button
          className={`btn ${tab === 'private' ? 'btn--accent' : ''}`}
          onClick={() => setTab('private')}
        >
          👤 Частные лица <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.private})</span>
        </button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {loading ? <div style={{ padding: 16 }}>Загрузка...</div> : (
          <table className="table">
            <thead>
              <tr>
                <SortableTh field="city">Направление</SortableTh>
                <th style={{ width: 100 }}>Сроки</th>
                {tab === 'legal' ? (
                  <>
                    <th style={{ width: 100 }}>До 10 кг</th>
                    <th style={{ width: 100 }}>До 20 кг</th>
                    <th style={{ width: 100 }}>За кг</th>
                    <th style={{ width: 120 }}>КУБ (тг)</th>
                  </>
                ) : (
                  <>
                    <th>Диапазоны весов</th>
                    <th style={{ width: 140 }}>Доп. сумма</th>
                  </>
                )}
                <th style={{ width: 200, textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredTariffs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 16 }}>
                    {tab === 'legal' ? 'Тарифы для юр. лиц не добавлены' : 'Тарифы для частных лиц не добавлены'}
                  </td>
                </tr>
              ) : (
                filteredTariffs.map(t => {
                  const wr = t.weightRanges && typeof t.weightRanges === 'object' ? t.weightRanges : {};
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.city}</td>
                      <td>{wr._deliveryDays || '—'}</td>
                      {tab === 'legal' ? (
                        <>
                          <td>{wr.r10 ? Number(wr.r10).toLocaleString() : '—'}</td>
                          <td>{wr.r20 ? Number(wr.r20).toLocaleString() : '—'}</td>
                          <td>{wr._pricePerKgOver20 ? Number(wr._pricePerKgOver20).toLocaleString() : '—'}</td>
                          <td>{wr._pricePerCubic ? Number(wr._pricePerCubic).toLocaleString() : '—'}</td>
                        </>
                      ) : (
                        <>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {WEIGHT_RANGES.map(r => {
                                const val = wr[r.key];
                                if (val === undefined || val === null || val === '') return null;
                                return (
                                  <span key={r.key} style={{
                                    padding: '2px 8px',
                                    background: '#eef2ff',
                                    color: '#3730a3',
                                    borderRadius: 4,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                  }}>
                                    {r.label}: {Number(val).toLocaleString()} тг
                                  </span>
                                );
                              })}
                              {Object.keys(wr).length === 0 && (
                                <span className="muted" style={{ fontSize: '0.8rem' }}>—</span>
                              )}
                            </div>
                          </td>
                          <td>
                            {Number(t.extraSum) > 0 ? (
                              <span style={{ color: '#dc2626', fontWeight: 700 }}>
                                + {Number(t.extraSum).toLocaleString()} тг
                              </span>
                            ) : "—"}
                          </td>
                        </>
                      )}
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-sm" onClick={() => openEdit(t)} style={{ marginRight: 8 }}>Изменить</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Удалить</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal_overlay animate_fade">
<div className="modal_content card animate_slide_up" style={{ width: 580, maxWidth: '95vw', padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0 }}>{editingTariff ? "Изменить тариф" : "Новый тариф"}</h2>
              <button className="modal_close_btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="field" style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, background: form.isPrivate ? '#fef3c7' : '#f3f4f6', border: `1px solid ${form.isPrivate ? '#fbbf24' : '#e5e7eb'}` }}>
                  <input
                    type="checkbox"
                    checked={form.isPrivate}
                    onChange={e => setForm({ ...form, isPrivate: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 700 }}>
                    {form.isPrivate ? '👤 Тариф для частных лиц' : '🏢 Тариф для юр. лиц'}
                  </span>
                </label>
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <div className="label">Город *</div>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Алматы" required />
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <div className="label">Сроки доставки (раб. дни)</div>
                <input value={form.deliveryDays} onChange={e => setForm({ ...form, deliveryDays: e.target.value })} placeholder="5-6" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="field">
                  <div className="label">За кг (сверх 20 кг)</div>
                  <input type="number" value={form.pricePerKgOver20} onChange={e => setForm({ ...form, pricePerKgOver20: e.target.value })} placeholder="160" />
                </div>
                <div className="field">
                  <div className="label">МГ_Тарифы КУБ (тг)</div>
                  <input type="number" value={form.pricePerCubic} onChange={e => setForm({ ...form, pricePerCubic: e.target.value })} placeholder="24000" />
                </div>
              </div>

              {!form.isPrivate && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div className="field">
                    <div className="label">До 10 кг (тг)</div>
                    <input type="number" value={form.weightRanges.r10 || ''} onChange={e => updateWeightRange('r10', e.target.value)} placeholder="2500" />
                  </div>
                  <div className="field">
                    <div className="label">До 20 кг (тг)</div>
                    <input type="number" value={form.weightRanges.r20 || ''} onChange={e => updateWeightRange('r20', e.target.value)} placeholder="3500" />
                  </div>
                </div>
              )}

              {form.isPrivate && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div className="label" style={{ marginBottom: 8 }}>Диапазоны весов (тг за диапазон)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#666' }}>Вес</div>
                      <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#666' }}>Тариф (тг)</div>
                      <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#666' }}>Доставка (тг)</div>
                    </div>
                    {WEIGHT_RANGES.map(r => (
                      <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.label}</div>
                        <input
                          type="number"
                          value={form.weightRanges[r.key] || ''}
                          onChange={e => updateWeightRange(r.key, e.target.value)}
                          placeholder="0"
                        />
                        <input
                          type="number"
                          value={form.weightRanges[r.key + '_delivery'] || ''}
                          onChange={e => updateWeightRange(r.key + '_delivery', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    ))}
                    <div className="muted" style={{ fontSize: '0.7rem', marginTop: 8 }}>
                      Заполните только нужные диапазоны. Пустые поля не сохранятся.
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: 24, padding: 12, background: '#fff7ed', borderRadius: 8, border: '1px dashed #fdba74' }}>
                    <div className="label">
                      Доп. сумма к тарифу (тг)
                      <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#9a3412' }}>
                        (вручную +NNNN тг к выбранному диапазону)
                      </span>
                    </div>
                    <input
                      type="number"
                      value={form.extraSum}
                      onChange={e => setForm({ ...form, extraSum: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </>
              )}

              <div className="field" style={{ marginBottom: 24, padding: 12, background: '#fef9ff', borderRadius: 8, border: '1px dashed #c084fc' }}>
                <div className="label" style={{ marginBottom: 8 }}>
                  🌍 Региональные доплаты
                  <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#7c2d92' }}>
                    (доставка из {form.city || 'этого города'} в подрегион)
                  </span>
                </div>

                {(form.regionalDeliveries || []).map((region, idx) => (
                  <div key={idx} style={{ marginBottom: 12, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e9d5ff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        value={region.region}
                        onChange={e => {
                          const next = [...form.regionalDeliveries];
                          next[idx] = { ...next[idx], region: e.target.value };
                          setForm({ ...form, regionalDeliveries: next });
                        }}
                        placeholder="Жанаозен"
                        style={{ flex: 1, fontWeight: 700 }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          const next = form.regionalDeliveries.filter((_, i) => i !== idx);
                          setForm({ ...form, regionalDeliveries: next });
                        }}
                      >✕</button>
                    </div>

                    {(region.ranges || []).map((r, ri) => (
                      <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <input
                          type="number"
                          value={r.maxWeight}
                          onChange={e => {
                            const next = [...form.regionalDeliveries];
                            next[idx].ranges[ri] = { ...next[idx].ranges[ri], maxWeight: parseFloat(e.target.value) || 0 };
                            setForm({ ...form, regionalDeliveries: next });
                          }}
                          placeholder="До (кг)"
                        />
                        <input
                          type="number"
                          value={r.extra}
                          onChange={e => {
                            const next = [...form.regionalDeliveries];
                            next[idx].ranges[ri] = { ...next[idx].ranges[ri], extra: parseFloat(e.target.value) || 0 };
                            setForm({ ...form, regionalDeliveries: next });
                          }}
                          placeholder="Доплата (тг)"
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            const next = [...form.regionalDeliveries];
                            next[idx].ranges = next[idx].ranges.filter((_, i) => i !== ri);
                            setForm({ ...form, regionalDeliveries: next });
                          }}
                        >−</button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ marginTop: 6 }}
                      onClick={() => {
                        const next = [...form.regionalDeliveries];
                        next[idx].ranges = [...(next[idx].ranges || []), { maxWeight: 0, extra: 0 }];
                        setForm({ ...form, regionalDeliveries: next });
                      }}
                    >+ Диапазон веса</button>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => {
                    setForm({
                      ...form,
                      regionalDeliveries: [...(form.regionalDeliveries || []), { region: "", ranges: [{ maxWeight: 30, extra: 0 }] }]
                    });
                  }}
                >+ Добавить регион</button>

                <div className="muted" style={{ fontSize: '0.7rem', marginTop: 8 }}>
                  Пример: для города Актау добавь регион «Жанаозен» с доплатами 2000тг (до 30кг), 3000тг (до 80кг).
                  Когда заказчик создаёт заявку в Жанаозен — система найдёт этот тариф, посчитает основной до Актау + доплату.
                </div>
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