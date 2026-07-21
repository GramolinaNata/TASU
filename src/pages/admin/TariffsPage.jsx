


import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../shared/api/api.js";

// 🆕 ТЗ v2: Стандартные диапазоны весов для частных лиц
const WEIGHT_RANGES = [
  { key: 'r10', label: 'до 10 кг' },
  { key: 'r20', label: 'до 20 кг' },
  { key: 'r30', label: 'до 30 кг' },
  { key: 'r50', label: 'до 50 кг' },
  { key: 'r100', label: 'до 100 кг' },
  { key: 'r200', label: 'до 200 кг' },
  { key: 'r300', label: 'до 300 кг' },
  { key: 'r500', label: 'до 500 кг' },
  { key: 'r1000', label: 'до 1000 кг' },
];

// Категория тарифа: из weightRanges._category, fallback по isPrivate
function getCategory(t) {
  const wr = t.weightRanges && typeof t.weightRanges === 'object' ? t.weightRanges : {};
  if (wr._category) return wr._category;
  return t.isPrivate ? 'private' : 'legal';
}

// Суффиксы городов по категориям — чтобы city оставался уникальным в БД без миграции
const CITY_SUFFIX = { loaders: '__LOADERS', carriers: '__CARRIERS', representatives: '__REPRESENTATIVES' };

// Чистый город для показа (без служебного суффикса)
function cleanCity(city) {
  return (city || '').replace(/__LOADERS$/, '').replace(/__CARRIERS$/, '').replace(/__AVIA$/, '');
}

// Город с суффиксом для сохранения по категории + типу перевозки.
// Для авиа-тарифов (legal/private) добавляем __AVIA, чтобы город остался
// уникальным в БД: "Астана" (авто) и "Астана__AVIA" — разные записи.
function cityWithSuffix(city, category, transport) {
  const base = cleanCity(city).trim();
  const suf = CITY_SUFFIX[category] || '';
  const aviaSuf = ((category === 'legal' || category === 'private') && transport === 'avia') ? '__AVIA' : '';
  return base + suf + aviaSuf;
}

// Достаём одну сумму доплаты из региона (независимо от того, старый это формат
// с весовой лесенкой или новый с одной ступенью)
function regionExtraValue(region) {
  if (Array.isArray(region.ranges) && region.ranges.length) {
    return region.ranges[region.ranges.length - 1].extra ?? '';
  }
  return region.extra ?? '';
}

function getSortValue(t, field) {  switch (field) {
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
  category: "legal",
  extraSum: 0,
  deliveryDays: "",
  transport: "auto",
  pricePerKgOver20: "",
  pricePerCubic: "",
  regionalDeliveries: [],
  weightRanges: WEIGHT_RANGES.reduce((acc, r) => ({ ...acc, [r.key]: '' }), {}),
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
    const filtered = tariffs.filter(t => getCategory(t) === tab);
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tariffs, sortBy, sortOrder, tab]);

const tabCounts = useMemo(() => ({
    legal: tariffs.filter(t => getCategory(t) === 'legal').length,
    private: tariffs.filter(t => getCategory(t) === 'private').length,
    loaders: tariffs.filter(t => getCategory(t) === 'loaders').length,
    carriers: tariffs.filter(t => getCategory(t) === 'carriers').length,
    representatives: tariffs.filter(t => getCategory(t) === 'representatives').length,
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
    setForm({ ...EMPTY_FORM, isPrivate: tab === 'private', category: tab });
    setIsModalOpen(true);
  };

  const openEdit = (t) => {
    setEditingTariff(t);
    const wr = t.weightRanges && typeof t.weightRanges === 'object' ? t.weightRanges : {};
    const weightRangesForm = WEIGHT_RANGES.reduce((acc, r) => ({
      ...acc,
      [r.key]: wr[r.key] ?? '',
    }), {});
   setForm({
      city: cleanCity(t.city),
      pricePerKg: t.pricePerKg,
      deliveryPrice: t.deliveryPrice ?? "",
      isPrivate: !!t.isPrivate,
      category: getCategory(t),
      extraSum: t.extraSum || 0,
      deliveryDays: wr._deliveryDays || "",
      transport: (/__AVIA$/.test(t.city || "") || wr._transport === "avia") ? "avia" : "auto",
      pricePerKgOver20: wr._pricePerKgOver20 || "",
      unloadPerSeat: wr._unloadPerSeat || "",
      prrPallet: wr._prrPallet || "",
      prrManual: wr._prrManual || "",
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

      // Регионы: приводим к формату движка — одна ступень на любой вес.
      // Пустые (без названия) отбрасываем.
      const regionsCleaned = (form.regionalDeliveries || [])
        .filter(r => r.region && r.region.trim())
        .map(r => {
          const ranges = (Array.isArray(r.ranges) ? r.ranges : [])
            .map(rg => ({ maxWeight: Number(rg.maxWeight) || 0, price: parseFloat(rg.price) || 0, extra: parseFloat(rg.extra) || 0 }))
            .filter(rg => rg.maxWeight > 0 && (rg.price > 0 || rg.extra > 0));
          return { region: r.region.trim(), ranges };
        })
        .filter(r => r.ranges.length > 0);

     const wrWithExtras = {
        ...wrCleaned,
        _category: form.category || (form.isPrivate ? 'private' : 'legal'),
        _deliveryDays: form.deliveryDays || "",
        _transport: (form.category === 'legal' || form.category === 'private') ? (form.transport || 'auto') : undefined,
        _pricePerKgOver20: parseFloat(form.pricePerKgOver20) || 0,
        _pricePerCubic: parseFloat(form.pricePerCubic) || 0,
        _unloadPerSeat: parseFloat(form.unloadPerSeat) || 0,
        _prrPallet: parseFloat(form.prrPallet) || 0,
        _prrManual: parseFloat(form.prrManual) || 0,
        _regionalDeliveries: regionsCleaned,
      };

      const payload = {
        city: cityWithSuffix(form.city, form.category, form.transport),
        pricePerKg: parseFloat(form.pricePerKg) || 0,
        deliveryPrice: parseFloat(form.deliveryPrice) || 0,
        isPrivate: !!form.isPrivate,
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

  const showDelivery = form.category === 'legal' || form.category === 'private';

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
        <button
          className={`btn ${tab === 'loaders' ? 'btn--accent' : ''}`}
          onClick={() => setTab('loaders')}
        >
          💪 Грузчики <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.loaders})</span>
        </button>
        <button
          className={`btn ${tab === 'carriers' ? 'btn--accent' : ''}`}
          onClick={() => setTab('carriers')}
        >
          🚚 Перевозчики <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.carriers})</span>
        </button>
        <button
          className={`btn ${tab === 'representatives' ? 'btn--accent' : ''}`}
          onClick={() => setTab('representatives')}
        >
          👤 Представители <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.representatives})</span>
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
                    <th>{(tab === 'loaders' || tab === 'carriers' || tab === 'representatives') ? 'Ставка за кг' : 'Диапазоны весов'}</th>
                  </>
                )}
                <th style={{ width: 200, textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredTariffs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 16 }}>
                    {tab === 'legal' ? 'Тарифы для юр. лиц не добавлены' : 'Тарифы не добавлены'}
                  </td>
                </tr>
              ) : (
                filteredTariffs.map(t => {
                  const wr = t.weightRanges && typeof t.weightRanges === 'object' ? t.weightRanges : {};
                  const hasDelivery = tab === 'legal' || tab === 'private';
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>
                        {cleanCity(t.city)}
                        {(tab === 'legal' || tab === 'private') && (
                          (/__AVIA$/.test(t.city || '') || wr._transport === 'avia')
                            ? <span style={{ marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: '#fff7e6', color: '#fa8c16', fontWeight: 700 }}>✈️ авиа</span>
                            : <span style={{ marginLeft: 8, fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, background: '#e6f7ff', color: '#1890ff', fontWeight: 700 }}>🚗 авто</span>
                        )}
                      </td>
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
                            {(tab === 'loaders' || tab === 'carriers' || tab === 'representatives') ? (
                              Number(t.pricePerKg) > 0 ? (
                                <span style={{ padding: '2px 8px', background: '#eef2ff', color: '#3730a3', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 }}>
                                  {Number(t.pricePerKg).toLocaleString()} тг/кг
                                </span>
                              ) : <span className="muted" style={{ fontSize: '0.8rem' }}>—</span>
                            ) : (
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
                              {WEIGHT_RANGES.every(r => !wr[r.key]) && (
                                <span className="muted" style={{ fontSize: '0.8rem' }}>—</span>
                              )}
                            </div>
                            )}
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
                {(form.category === 'legal' || form.category === 'private') ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, background: form.isPrivate ? '#fef3c7' : '#f3f4f6', border: `1px solid ${form.isPrivate ? '#fbbf24' : '#e5e7eb'}` }}>
                    <input
                      type="checkbox"
                      checked={form.isPrivate}
                      onChange={e => setForm({ ...form, isPrivate: e.target.checked, category: e.target.checked ? 'private' : 'legal' })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 700 }}>
                      {form.isPrivate ? '👤 Тариф для частных лиц' : '🏢 Тариф для юр. лиц'}
                    </span>
                  </label>
                ) : (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: '#eef2ff', border: '1px solid #c7d2fe', fontWeight: 700 }}>
                    {form.category === 'loaders' ? '💪 Тариф для грузчиков' : '🚚 Тариф для перевозчиков'}
                  </div>
                )}
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <div className="label">Город *</div>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Алматы" required />
              </div>

              {(form.category === 'legal' || form.category === 'private') && (
                <div className="field" style={{ marginBottom: 16 }}>
                  <div className="label">Тип перевозки</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, fontWeight: 700, background: form.transport === 'auto' ? '#e6f7ff' : '#f3f4f6', border: `2px solid ${form.transport === 'auto' ? '#1890ff' : '#e5e7eb'}` }}>
                      <input type="radio" name="transport" checked={form.transport === 'auto'} onChange={() => setForm({ ...form, transport: 'auto' })} style={{ display: 'none' }} />
                      🚗 Авто
                    </label>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, fontWeight: 700, background: form.transport === 'avia' ? '#fff7e6' : '#f3f4f6', border: `2px solid ${form.transport === 'avia' ? '#fa8c16' : '#e5e7eb'}` }}>
                      <input type="radio" name="transport" checked={form.transport === 'avia'} onChange={() => setForm({ ...form, transport: 'avia' })} style={{ display: 'none' }} />
                      ✈️ Авиа
                    </label>
                  </div>
                </div>
              )}

              {(form.category === 'legal' || form.category === 'private') && (
                <div className="field" style={{ marginBottom: 16 }}>
                  <div className="label">Сроки доставки (раб. дни)</div>
                  <input value={form.deliveryDays} onChange={e => setForm({ ...form, deliveryDays: e.target.value })} placeholder="5-6" />
                </div>
              )}

              {(form.category === 'legal' || form.category === 'private') && (
                <div style={{ marginBottom: 16 }}>
                  <div className="field">
                    <div className="label">КУБ (тг за м³)</div>
                    <input type="number" value={form.pricePerCubic} onChange={e => setForm({ ...form, pricePerCubic: e.target.value })} placeholder="24000" />
                  </div>
                </div>
              )}

              {form.category === 'legal' && (
                <div style={{ marginBottom: 16 }}>
                  <div className="label" style={{ marginBottom: 8 }}>Диапазоны весов (у каждого свой тариф и своя доставка)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#666' }}>Вес</div>
                    <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#666' }}>Тариф (тг)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#666' }}>Доставка (тг)</div>
                  </div>
                  {WEIGHT_RANGES.map(r => {
                    const dKey = 'd' + r.key.slice(1);
                    return (
                    <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.label}</div>
                      <input type="number" value={form.weightRanges[r.key] || ''} onChange={e => updateWeightRange(r.key, e.target.value)} placeholder="0" />
                      <input type="number" value={form.weightRanges[dKey] || ''} onChange={e => updateWeightRange(dKey, e.target.value)} placeholder="0" />
                    </div>
                    );
                  })}
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
                    {WEIGHT_RANGES.map(r => {
                      const dKey = 'd' + r.key.slice(1);
                      return (
                      <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.label}</div>
                        <input type="number" value={form.weightRanges[r.key] || ''} onChange={e => updateWeightRange(r.key, e.target.value)} placeholder="0" />
                        <input type="number" value={form.weightRanges[dKey] || ''} onChange={e => updateWeightRange(dKey, e.target.value)} placeholder="0" />
                      </div>
                      );
                    })}
                    <div className="muted" style={{ fontSize: '0.7rem', marginTop: 8 }}>
                      Заполните только нужные диапазоны. Пустые поля не сохранятся.
                    </div>
                  </div>
                </>
              )}

              {(form.category === 'loaders' || form.category === 'carriers' || form.category === 'representatives') && (
                <div className="field" style={{ marginBottom: 16, padding: 12, background: '#eef2ff', borderRadius: 8, border: '1px dashed #a5b4fc' }}>
                  <div className="label">
                    {form.category === 'loaders' ? '💪' : '🚚'} Ставка за кг (тг)
                    <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#4338ca' }}>
                      (сумма = общий вес партии × эту ставку)
                    </span>
                  </div>
                  <input
                    type="number"
                    value={form.pricePerKg}
                    onChange={e => setForm({ ...form, pricePerKg: e.target.value })}
                    placeholder={form.category === 'loaders' ? '10' : form.category === 'carriers' ? '65' : '10'}
                  />
                </div>
              )}

              {showDelivery && (
                <div className="field" style={{ marginBottom: 24, padding: 12, background: '#f0f7ff', borderRadius: 8, border: '1px dashed #91caff' }}>
                  <div className="label">
                    📦 Выгрузка за место (тг)
                    <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#0050b3' }}>(ставка × кол-во мест)</span>
                  </div>
                  <input
                    type="number"
                    value={form.unloadPerSeat}
                    onChange={e => setForm({ ...form, unloadPerSeat: e.target.value })}
                    placeholder="0"
                  />
                  <div className="label" style={{ marginTop: 12 }}>📦 ПРР палетная (тг)</div>
                  <input type="number" value={form.prrPallet} onChange={e => setForm({ ...form, prrPallet: e.target.value })} placeholder="0" />
                  <div className="label" style={{ marginTop: 12 }}>✋ ПРР ручная (тг)</div>
                  <input type="number" value={form.prrManual} onChange={e => setForm({ ...form, prrManual: e.target.value })} placeholder="0" />
                </div>
              )}

              {(form.category === 'legal' || form.category === 'private') && (
              <div className="field" style={{ marginBottom: 24, padding: 12, background: '#fef9ff', borderRadius: 8, border: '1px dashed #c084fc' }}>
                <div className="label" style={{ marginBottom: 4 }}>
                  🌍 Доставка в посёлки рядом с {form.city || 'этим городом'}
                </div>
                <div className="muted" style={{ fontSize: '0.72rem', marginBottom: 12 }}>
                  Если груз едет в посёлок рядом с {form.city || 'этим городом'}, к тарифу до {form.city || 'города'} прибавится
                  фикс. доплата. Заказчик указывает посёлок как город назначения — система сама найдёт доплату.
                </div>

                {(form.regionalDeliveries || []).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 40px', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.72rem', color: '#7c2d92' }}>Посёлок / регион</div>
                    <div style={{ fontWeight: 700, fontSize: '0.72rem', color: '#7c2d92' }}>Доплата (тг)</div>
                    <div />
                  </div>
                )}

                {(form.regionalDeliveries || []).map((region, idx) => (
                  <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12, background: '#fafafa' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                      <input
                        type="text"
                        value={region.region}
                        onChange={e => {
                          const next = [...form.regionalDeliveries];
                          next[idx] = { ...next[idx], region: e.target.value };
                          setForm({ ...form, regionalDeliveries: next });
                        }}
                        placeholder="Название посёлка (напр. Жанаозен)"
                        style={{ fontWeight: 700 }}
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
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.72rem', color: '#666' }}>Вес</div>
                      <div style={{ fontWeight: 700, fontSize: '0.72rem', color: '#666' }}>Тариф (тг)</div>
                      <div style={{ fontWeight: 700, fontSize: '0.72rem', color: '#666' }}>Доставка (тг)</div>
                    </div>
                    {WEIGHT_RANGES.map(wrng => {
                      const maxW = parseInt(wrng.key.slice(1), 10);
                      const curRanges = Array.isArray(region.ranges) ? region.ranges : [];
                      const found = curRanges.find(rg => Number(rg.maxWeight) === maxW);
                      const priceVal = found ? (found.price ?? '') : '';
                      const extraVal = found ? (found.extra ?? '') : '';
                      const upd = (field, v) => {
                        const next = [...form.regionalDeliveries];
                        let rgs = Array.isArray(next[idx].ranges) ? [...next[idx].ranges] : [];
                        let cur = rgs.find(rg => Number(rg.maxWeight) === maxW) || { maxWeight: maxW, price: 0, extra: 0 };
                        rgs = rgs.filter(rg => Number(rg.maxWeight) !== maxW);
                        cur = { ...cur, [field]: v === '' ? 0 : parseFloat(v) };
                        if ((cur.price || 0) > 0 || (cur.extra || 0) > 0) rgs.push(cur);
                        next[idx] = { ...next[idx], ranges: rgs };
                        setForm({ ...form, regionalDeliveries: next });
                      };
                      return (
                        <div key={wrng.key} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ fontSize: '0.8rem' }}>{wrng.label}</div>
                          <input type="number" value={priceVal} onChange={e => upd('price', e.target.value)} placeholder="0" />
                          <input type="number" value={extraVal} onChange={e => upd('extra', e.target.value)} placeholder="0" />
                        </div>
                      );
                    })}
                  </div>
                ))}

                <button
                  type="button"
                  className="btn"
                  style={{ width: '100%', marginTop: 4 }}
                  onClick={() => {
                    setForm({
                      ...form,
                      regionalDeliveries: [...(form.regionalDeliveries || []), { region: "", ranges: [{ maxWeight: 999999, extra: 0 }] }]
                    });
                  }}
                >＋ Добавить посёлок</button>

                <div className="muted" style={{ fontSize: '0.7rem', marginTop: 10 }}>
                  Пример: у тарифа «Актау» добавь посёлок «Жанаозен» с доплатой 2000 тг. Заказчик оформляет груз
                  в Жанаозен → система посчитает тариф до Актау + 2000 тг.
                </div>
              </div>
              )}

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