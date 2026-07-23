
import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../shared/api/api.js";

// Заказчик отключил доставку по городу (оставлена только по регионам).
// Логика/категория city_delivery в коде сохранена — чтобы вернуть, поставь true.
const SHOW_CITY_DELIVERY = false;

// Доставка в регионы вернулась внутрь тарифа юр/частных (посёлки в _regionalDeliveries).
// Отдельная вкладка/категория region_delivery скрыта, но код оставлен — вернуть: true.
const SHOW_REGION_DELIVERY = false;

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

// Готовые сетки диапазонов (структура + типы, как в Excel заказчика) —
// подставляются при создании нового тарифа. Значения менеджер вводит сам.
// Юр. лица: три фикс. диапазона до 30 кг (можно вписать одну сумму, напр. 7900),
// дальше и «свыше 1000» — «за кг». Доставка по умолчанию фиксированная.
const LEGAL_PRESET = [
  { maxWeight: 10,   mode: 'fixed', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 20,   mode: 'fixed', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 30,   mode: 'fixed', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 50,   mode: 'perKg', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 100,  mode: 'perKg', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 500,  mode: 'perKg', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 1000, mode: 'perKg', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: '',   mode: 'perKg', value: '', delivery: '', deliveryMode: 'fixed' },
];
const PRIVATE_PRESET = [
  { maxWeight: 10, mode: 'fixed', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 20, mode: 'fixed', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: '', mode: 'perKg', value: '', delivery: '', deliveryMode: 'fixed' },
];
// Доставка по городу — единая сетка заказчика (все fixed).
const CITY_DELIVERY_PRESET = [
  { maxWeight: 10,  mode: 'fixed', value: 2000,  delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 50,  mode: 'fixed', value: 5000,  delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 100, mode: 'fixed', value: 8000,  delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 300, mode: 'fixed', value: 14000, delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 500, mode: 'fixed', value: 18000, delivery: '', deliveryMode: 'fixed' },
];
// Доставка по региону — общая сетка (для Жанаозен/Кулсары/Хромтау менеджер заведёт свою).
const REGION_DELIVERY_PRESET = [
  { maxWeight: 50,   mode: 'fixed', value: 1000,  delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 150,  mode: 'fixed', value: 2000,  delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 300,  mode: 'fixed', value: 5000,  delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 600,  mode: 'fixed', value: 8000,  delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 1000, mode: 'fixed', value: 10000, delivery: '', deliveryMode: 'fixed' },
];
// Заготовка диапазонов посёлка (по таблице заказчика: до 30 / 30,1–80 / 80,1–150 / свыше 150).
// Все fixed, значения пустые — менеджер вписывает сам.
const POSELOK_PRESET = () => [
  { maxWeight: 30,  mode: 'fixed', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 80,  mode: 'fixed', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: 150, mode: 'fixed', value: '', delivery: '', deliveryMode: 'fixed' },
  { maxWeight: '',  mode: 'fixed', value: '', delivery: '', deliveryMode: 'fixed' },
];

const presetFor = (category) =>
  (category === 'legal' ? LEGAL_PRESET
    : category === 'private' ? PRIVATE_PRESET
    : category === 'city_delivery' ? CITY_DELIVERY_PRESET
    : category === 'region_delivery' ? REGION_DELIVERY_PRESET
    : []).map(r => ({ ...r }));

// Текстовая подпись диапазона, вычисляется из порога текущей и предыдущей строки.
// Открытый (последний, без верхнего веса) → «свыше N кг». Иначе «нижн,1–верхн кг».
function rangeBounds(rows, i) {
  const cur = rows[i] || {};
  const prevMax = i === 0 ? 0 : (Number(rows[i - 1].maxWeight) || 0);
  const maxEmpty = cur.maxWeight === '' || cur.maxWeight == null;
  const isLast = i === rows.length - 1;
  const lowerText = i === 0 ? '0' : `${prevMax},1`;
  return { prevMax, lowerText, open: isLast && maxEmpty };
}

// Категория тарифа: из weightRanges._category, fallback по isPrivate
function getCategory(t) {
  const wr = t.weightRanges && typeof t.weightRanges === 'object' ? t.weightRanges : {};
  if (wr._category) return wr._category;
  return t.isPrivate ? 'private' : 'legal';
}

// Суффиксы городов по категориям — чтобы city оставался уникальным в БД без миграции
const CITY_SUFFIX = { loaders: '__LOADERS', carriers: '__CARRIERS', representatives: '__REPRESENTATIVES', city_delivery: '__CITYDELIVERY', region_delivery: '__REGIONDELIVERY' };

// Чистый город для показа (без служебного суффикса)
function cleanCity(city) {
  return (city || '').replace(/__LOADERS$/, '').replace(/__CARRIERS$/, '').replace(/__REPRESENTATIVES$/, '').replace(/__CITYDELIVERY$/, '').replace(/__REGIONDELIVERY$/, '').replace(/__PRIVATE$/, '').replace(/__AVIA$/, '');
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

// Компактные чипсы диапазонов для таблицы: новый формат _ranges или legacy rN.
function RangeChips({ wr }) {
  const chip = { padding: '2px 8px', background: '#eef2ff', color: '#3730a3', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 };
  let items = [];
  if (Array.isArray(wr._ranges) && wr._ranges.length) {
    items = [...wr._ranges]
      .sort((a, b) => (a.maxWeight == null ? Infinity : Number(a.maxWeight)) - (b.maxWeight == null ? Infinity : Number(b.maxWeight)))
      .map((r, i) => {
        const bound = (r.maxWeight == null || r.maxWeight === '') ? 'свыше' : `≤${r.maxWeight}`;
        const val = r.mode === 'perKg'
          ? `${Number(r.value).toLocaleString()} тг/кг`
          : `${Number(r.value).toLocaleString()} тг`;
        const dev = Number(r.delivery) > 0
          ? ` · дост. ${Number(r.delivery).toLocaleString()}${r.deliveryMode === 'perKg' ? '/кг' : ''}`
          : '';
        return <span key={i} style={chip}>{bound}: {val}{dev}</span>;
      });
  } else {
    items = WEIGHT_RANGES.filter(r => wr[r.key]).map(r => (
      <span key={r.key} style={chip}>{r.label}: {Number(wr[r.key]).toLocaleString()} тг</span>
    ));
  }
  if (!items.length) return <span className="muted" style={{ fontSize: '0.8rem' }}>—</span>;
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{items}</div>;
}

// Полный редактор диапазонов (Диапазон | Тип | Значение | Тип дост. | Доставка | ✕).
// Переиспользуется основным тарифом И посёлками внутри тарифа — чтобы вид не расходился.
// rows: [{ maxWeight, mode, value, delivery, deliveryMode }]; onUpdate(idx, field, val).
function RangesEditor({ rows, onUpdate, onAdd, onRemove }) {
  const grid = '1fr 96px 76px 96px 76px 26px';
  const hdr = { fontWeight: 700, fontSize: '0.72rem', color: '#666' };
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 6, alignItems: 'center', marginBottom: 6 }}>
        <div style={hdr}>Диапазон</div>
        <div style={hdr}>Тип</div>
        <div style={hdr}>Значение</div>
        <div style={hdr}>Тип дост.</div>
        <div style={hdr}>Доставка</div>
        <div />
      </div>
      {(rows || []).map((r, idx) => {
        const b = rangeBounds(rows, idx);
        return (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: grid, gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {b.open ? (
                <span>свыше {b.prevMax} кг</span>
              ) : (
                <>
                  <span style={{ color: '#666' }}>{b.lowerText}–</span>
                  <input type="number" value={r.maxWeight ?? ''} onChange={e => onUpdate(idx, 'maxWeight', e.target.value)} placeholder="∞" title="Верхняя граница диапазона, кг (пусто = «свыше»)" style={{ width: 88, padding: '4px 6px' }} />
                  <span style={{ color: '#666' }}>кг</span>
                </>
              )}
            </div>
            <select value={r.mode || 'fixed'} onChange={e => onUpdate(idx, 'mode', e.target.value)} style={{ padding: '4px 4px' }}>
              <option value="fixed">Фикс.</option>
              <option value="perKg">За кг</option>
            </select>
            <input type="number" value={r.value ?? ''} onChange={e => onUpdate(idx, 'value', e.target.value)} placeholder={r.mode === 'perKg' ? 'тг/кг' : 'тг'} style={{ padding: '4px 6px' }} />
            <select value={r.deliveryMode || 'fixed'} onChange={e => onUpdate(idx, 'deliveryMode', e.target.value)} style={{ padding: '4px 4px' }}>
              <option value="fixed">Фикс.</option>
              <option value="perKg">За кг</option>
            </select>
            <input type="number" value={r.delivery ?? ''} onChange={e => onUpdate(idx, 'delivery', e.target.value)} placeholder={r.deliveryMode === 'perKg' ? 'тг/кг' : 'тг'} style={{ padding: '4px 6px' }} />
            <button type="button" className="btn btn-sm btn-danger" onClick={() => onRemove(idx)} title="Удалить диапазон">✕</button>
          </div>
        );
      })}
      <button type="button" className="btn" style={{ width: '100%', marginTop: 4 }} onClick={onAdd}>＋ Добавить диапазон</button>
    </>
  );
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
  pricePerCubic: "",
  storagePerKg: "",
  storagePerCubic: "",
  sizeMedium: "",
  sizeLarge: "",
  hubCity: "",
  regionalDeliveries: [],
  // Диапазоны весов с типом расчёта (fixed/perKg) и доставкой — для legal/private.
  ranges: [],
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
    city_delivery: tariffs.filter(t => getCategory(t) === 'city_delivery').length,
    region_delivery: tariffs.filter(t => getCategory(t) === 'region_delivery').length,
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
    // Для частных подставляем дефолтные надбавки габарита (1000 / 2000), редактируемые.
    const sizeDefaults = tab === 'private' ? { sizeMedium: 1000, sizeLarge: 2000 } : {};
    setForm({ ...EMPTY_FORM, isPrivate: tab === 'private', category: tab, ranges: presetFor(tab), ...sizeDefaults });
    setIsModalOpen(true);
  };

  const openEdit = (t) => {
    setEditingTariff(t);
    const wr = t.weightRanges && typeof t.weightRanges === 'object' ? t.weightRanges : {};

    // Диапазоны: приоритет — новый формат _ranges. Если его нет, мигрируем старые
    // rN/dN как фиксированные ступени (dN → delivery, иначе у заказчика пропадут
    // настроенные доставки), а прежнее «за кг сверх» (_pricePerKgOver20) переносим
    // в открытый диапазон типа «за кг».
    let ranges = [];
    if (Array.isArray(wr._ranges) && wr._ranges.length) {
      ranges = wr._ranges.map((r) => ({
        maxWeight: (r.maxWeight == null) ? '' : r.maxWeight,
        mode: r.mode === 'perKg' ? 'perKg' : 'fixed',
        value: r.value ?? '',
        delivery: r.delivery ?? '',
        deliveryMode: r.deliveryMode === 'perKg' ? 'perKg' : 'fixed',
      }));
    } else {
      Object.keys(wr).forEach((k) => {
        const m = /^r(\d+)$/.exec(k);
        if (!m) return;
        const maxW = parseInt(m[1], 10);
        const value = wr[k];
        const delivery = wr['d' + maxW];
        if (maxW > 0 && ((Number(value) || 0) > 0 || (Number(delivery) || 0) > 0)) {
          ranges.push({ maxWeight: maxW, mode: 'fixed', value: value ?? '', delivery: delivery ?? '', deliveryMode: 'fixed' });
        }
      });
      ranges.sort((a, b) => a.maxWeight - b.maxWeight);
      const over = Number(wr._pricePerKgOver20) || 0;
      if (over > 0) ranges.push({ maxWeight: '', mode: 'perKg', value: wr._pricePerKgOver20, delivery: '', deliveryMode: 'fixed' });
    }

    setForm({
      city: cleanCity(t.city),
      pricePerKg: t.pricePerKg,
      deliveryPrice: t.deliveryPrice ?? "",
      isPrivate: !!t.isPrivate,
      category: getCategory(t),
      extraSum: t.extraSum || 0,
      deliveryDays: wr._deliveryDays || "",
      transport: (/__AVIA$/.test(t.city || "") || wr._transport === "avia") ? "avia" : "auto",
      unloadPerSeat: wr._unloadPerSeat || "",
      prrPallet: wr._prrPallet || "",
      prrManual: wr._prrManual || "",
      pricePerCubic: wr._pricePerCubic || "",
      storagePerKg: wr._storagePerKg || "",
      storagePerCubic: wr._storagePerCubic || "",
      // Существующие частные тарифы без полей габарита → дефолт 1000/2000.
      sizeMedium: wr._sizeMedium ?? (getCategory(t) === 'private' ? 1000 : ''),
      sizeLarge: wr._sizeLarge ?? (getCategory(t) === 'private' ? 2000 : ''),
      hubCity: wr._hubCity || "",
      // Посёлки внутри тарифа: тот же формат диапазонов, что у основного тарифа
      // ({maxWeight, mode, value, delivery, deliveryMode}). Миграция старого формата
      // ({maxWeight, sum/extra/price}, порог 999999 = «свыше») → value + mode=fixed.
      regionalDeliveries: (Array.isArray(wr._regionalDeliveries) ? wr._regionalDeliveries : []).map(pos => ({
        region: pos.region || "",
        ranges: (Array.isArray(pos.ranges) ? pos.ranges : []).map(rg => ({
          maxWeight: (rg.maxWeight == null || Number(rg.maxWeight) === 999999) ? "" : rg.maxWeight,
          mode: rg.mode === 'perKg' ? 'perKg' : 'fixed',
          value: rg.value ?? rg.sum ?? rg.extra ?? rg.price ?? "",
          delivery: rg.delivery ?? "",
          deliveryMode: rg.deliveryMode === 'perKg' ? 'perKg' : 'fixed',
        })),
      })),
      ranges,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Посёлки внутри тарифа: тот же формат диапазонов, что у основного тарифа
      // ({maxWeight, mode, value, delivery, deliveryMode}). Пустой верхний вес → null.
      // Диапазоны без значения и без доставки отбрасываем.
      const regionsCleaned = (form.regionalDeliveries || [])
        .filter(r => r.region && r.region.trim())
        .map(r => {
          const ranges = (Array.isArray(r.ranges) ? r.ranges : [])
            .map(rg => {
              const maxRaw = rg.maxWeight;
              const maxWeight = (maxRaw === '' || maxRaw === null || maxRaw === undefined) ? null : (Number(maxRaw) || 0);
              return {
                maxWeight,
                mode: rg.mode === 'perKg' ? 'perKg' : 'fixed',
                value: parseFloat(rg.value) || 0,
                delivery: parseFloat(rg.delivery) || 0,
                deliveryMode: rg.deliveryMode === 'perKg' ? 'perKg' : 'fixed',
              };
            })
            .filter(rg => rg.value > 0 || rg.delivery > 0)
            .sort((a, b) => (a.maxWeight == null ? Infinity : a.maxWeight) - (b.maxWeight == null ? Infinity : b.maxWeight));
          return { region: r.region.trim(), ranges };
        })
        .filter(r => r.ranges.length > 0);

      // Диапазоны весов (legal/private): тип расчёта fixed/perKg + доставка на диапазон.
      // Пустой верхний вес → null (открытый диапазон «свыше»). Сортируем по возрастанию.
      const rangesCleaned = (form.ranges || [])
        .map(r => {
          const maxRaw = r.maxWeight;
          const maxWeight = (maxRaw === '' || maxRaw === null || maxRaw === undefined) ? null : (Number(maxRaw) || 0);
          return {
            maxWeight,
            mode: r.mode === 'perKg' ? 'perKg' : 'fixed',
            value: parseFloat(r.value) || 0,
            delivery: parseFloat(r.delivery) || 0,
            deliveryMode: r.deliveryMode === 'perKg' ? 'perKg' : 'fixed',
          };
        })
        .filter(r => r.value > 0 || r.delivery > 0)
        .sort((a, b) => (a.maxWeight == null ? Infinity : a.maxWeight) - (b.maxWeight == null ? Infinity : b.maxWeight));

      const wrWithExtras = {
        _category: form.category || (form.isPrivate ? 'private' : 'legal'),
        _deliveryDays: form.deliveryDays || "",
        _transport: (form.category === 'legal' || form.category === 'private') ? (form.transport || 'auto') : undefined,
        _pricePerCubic: parseFloat(form.pricePerCubic) || 0,
        _unloadPerSeat: parseFloat(form.unloadPerSeat) || 0,
        _prrPallet: parseFloat(form.prrPallet) || 0,
        _prrManual: parseFloat(form.prrManual) || 0,
        _storagePerKg: parseFloat(form.storagePerKg) || 0,
        _storagePerCubic: parseFloat(form.storagePerCubic) || 0,
        _sizeMedium: parseFloat(form.sizeMedium) || 0,
        _sizeLarge: parseFloat(form.sizeLarge) || 0,
        _regionalDeliveries: regionsCleaned,
      };

      // _ranges — источник правды для юр., частных и доставочных категорий.
      // Старые rN/dN и _pricePerKgOver20 для них больше не пишем (миграция при сохранении).
      if (['legal', 'private', 'city_delivery', 'region_delivery'].includes(form.category)) {
        wrWithExtras._ranges = rangesCleaned;
      }

      // Опорный город — только для тарифов доставки по региону (Вариант 2).
      if (form.category === 'region_delivery') {
        wrWithExtras._hubCity = (form.hubCity || '').trim();
      }

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

  const updateRange = (idx, field, value) => {
    setForm(prev => {
      const next = [...(prev.ranges || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, ranges: next };
    });
  };
  const addRange = () => setForm(prev => {
    const rows = [...(prev.ranges || [])];
    const row = { maxWeight: '', mode: 'fixed', value: '', delivery: '', deliveryMode: 'fixed' };
    const last = rows[rows.length - 1];
    // Если последняя строка — открытая («свыше»), вставляем новую перед ней,
    // чтобы менеджер ввёл конкретный верхний вес, а «свыше» осталось в конце.
    if (last && (last.maxWeight === '' || last.maxWeight == null)) rows.splice(rows.length - 1, 0, row);
    else rows.push(row);
    return { ...prev, ranges: rows };
  });
  const removeRange = (idx) => setForm(prev => ({
    ...prev,
    ranges: (prev.ranges || []).filter((_, i) => i !== idx),
  }));

  // Посёлки внутри тарифа (_regionalDeliveries): каждый — название + диапазоны {maxWeight, sum}.
  const addPoselok = () => setForm(prev => ({
    ...prev,
    regionalDeliveries: [...(prev.regionalDeliveries || []), { region: "", ranges: POSELOK_PRESET() }],
  }));
  const removePoselok = (pIdx) => setForm(prev => ({
    ...prev,
    regionalDeliveries: (prev.regionalDeliveries || []).filter((_, i) => i !== pIdx),
  }));
  const updatePoselok = (pIdx, region) => setForm(prev => {
    const next = [...(prev.regionalDeliveries || [])];
    next[pIdx] = { ...next[pIdx], region };
    return { ...prev, regionalDeliveries: next };
  });
  const addPoselokRange = (pIdx) => setForm(prev => {
    const next = [...(prev.regionalDeliveries || [])];
    const rows = [...((next[pIdx] && next[pIdx].ranges) || [])];
    const row = { maxWeight: "", mode: "fixed", value: "", delivery: "", deliveryMode: "fixed" };
    const last = rows[rows.length - 1];
    if (last && (last.maxWeight === "" || last.maxWeight == null)) rows.splice(rows.length - 1, 0, row);
    else rows.push(row);
    next[pIdx] = { ...next[pIdx], ranges: rows };
    return { ...prev, regionalDeliveries: next };
  });
  const removePoselokRange = (pIdx, rIdx) => setForm(prev => {
    const next = [...(prev.regionalDeliveries || [])];
    next[pIdx] = { ...next[pIdx], ranges: ((next[pIdx] && next[pIdx].ranges) || []).filter((_, i) => i !== rIdx) };
    return { ...prev, regionalDeliveries: next };
  });
  const updatePoselokRange = (pIdx, rIdx, field, val) => setForm(prev => {
    const next = [...(prev.regionalDeliveries || [])];
    const rows = [...((next[pIdx] && next[pIdx].ranges) || [])];
    rows[rIdx] = { ...rows[rIdx], [field]: val };
    next[pIdx] = { ...next[pIdx], ranges: rows };
    return { ...prev, regionalDeliveries: next };
  });

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
        {SHOW_CITY_DELIVERY && (
          <button
            className={`btn ${tab === 'city_delivery' ? 'btn--accent' : ''}`}
            onClick={() => setTab('city_delivery')}
          >
            🏙️ Доставка по городу <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.city_delivery})</span>
          </button>
        )}
        {SHOW_REGION_DELIVERY && (
          <button
            className={`btn ${tab === 'region_delivery' ? 'btn--accent' : ''}`}
            onClick={() => setTab('region_delivery')}
          >
            🚐 Доставка по регионам <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.region_delivery})</span>
          </button>
        )}
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
                    <th>Диапазоны весов</th>
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
                          <td><RangeChips wr={wr} /></td>
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
                              <RangeChips wr={wr} />
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
<div className="modal_content card animate_slide_up" style={{ width: 720, maxWidth: '95vw', padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
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
                      onChange={e => {
                        const isPriv = e.target.checked;
                        const cat = isPriv ? 'private' : 'legal';
                        setForm(f => ({
                          ...f,
                          isPrivate: isPriv,
                          category: cat,
                          // При создании нового тарифа подставляем сетку под категорию;
                          // при редактировании существующего — не трогаем введённые диапазоны.
                          ranges: editingTariff ? f.ranges : presetFor(cat),
                        }));
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 700 }}>
                      {form.isPrivate ? '👤 Тариф для частных лиц' : '🏢 Тариф для юр. лиц'}
                    </span>
                  </label>
                ) : (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: '#eef2ff', border: '1px solid #c7d2fe', fontWeight: 700 }}>
                    {form.category === 'loaders' ? '💪 Тариф для грузчиков'
                      : form.category === 'carriers' ? '🚚 Тариф для перевозчиков'
                      : form.category === 'representatives' ? '👤 Тариф для представителей'
                      : form.category === 'city_delivery' ? '🏙️ Доставка по городу'
                      : form.category === 'region_delivery' ? '🚐 Доставка по региону'
                      : 'Тариф'}
                  </div>
                )}
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <div className="label">{form.category === 'region_delivery' ? 'Посёлок / регион *' : 'Город *'}</div>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder={form.category === 'region_delivery' ? 'Жанаозен' : 'Алматы'} required />
              </div>

              {form.category === 'region_delivery' && (
                <div className="field" style={{ marginBottom: 16 }}>
                  <div className="label">Опорный город</div>
                  <input value={form.hubCity} onChange={e => setForm({ ...form, hubCity: e.target.value })} placeholder="Актау" />
                  <div className="muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>
                    Город, до которого едет основной тариф (напр. Жанаозен → Актау). При оформлении заявки на этот посёлок база берётся из тарифа опорного города + эта доплата за регион.
                  </div>
                </div>
              )}

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

              {(form.category === 'city_delivery' || form.category === 'region_delivery') && (
                <div style={{ marginBottom: 16 }}>
                  <div className="label" style={{ marginBottom: 8 }}>Диапазоны весов (фикс. сумма за диапазон)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 26px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.72rem', color: '#666' }}>Диапазон</div>
                    <div style={{ fontWeight: 700, fontSize: '0.72rem', color: '#666' }}>Сумма (тг)</div>
                    <div />
                  </div>
                  {(form.ranges || []).map((r, idx) => {
                    const b = rangeBounds(form.ranges, idx);
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 26px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {b.open ? (
                            <span>свыше {b.prevMax} кг</span>
                          ) : (
                            <>
                              <span style={{ color: '#666' }}>{b.lowerText}–</span>
                              <input type="number" value={r.maxWeight ?? ''} onChange={e => updateRange(idx, 'maxWeight', e.target.value)} placeholder="∞" title="Верхняя граница диапазона, кг (пусто = «свыше»)" style={{ width: 88, padding: '4px 6px' }} />
                              <span style={{ color: '#666' }}>кг</span>
                            </>
                          )}
                        </div>
                        <input type="number" value={r.value ?? ''} onChange={e => updateRange(idx, 'value', e.target.value)} placeholder="тг" style={{ padding: '4px 6px' }} />
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => removeRange(idx)} title="Удалить диапазон">✕</button>
                      </div>
                    );
                  })}
                  <button type="button" className="btn" style={{ width: '100%', marginTop: 4 }} onClick={addRange}>＋ Добавить диапазон</button>
                  <div className="muted" style={{ fontSize: '0.7rem', marginTop: 8 }}>
                    Каждый диапазон — фиксированная сумма доставки. Подпись считается автоматически от предыдущей строки.
                  </div>
                </div>
              )}

              {(form.category === 'legal' || form.category === 'private') && (
                <div style={{ marginBottom: 16 }}>
                  <div className="label" style={{ marginBottom: 8 }}>Диапазоны весов (свой тип расчёта у значения и у доставки)</div>
                  <RangesEditor rows={form.ranges} onUpdate={updateRange} onAdd={addRange} onRemove={removeRange} />
                  <div className="muted" style={{ fontSize: '0.7rem', marginTop: 8 }}>
                    Подпись диапазона считается автоматически от предыдущей строки. У значения и у доставки свой тип: «Фикс.» — сумма целиком, «За кг» — умножается на фактический вес. Кнопкой ниже можно добавить свой порог.
                  </div>
                </div>
              )}

              {/* Надбавки за габарит — часть основного тарифа, сразу под диапазонами */}
              {form.category === 'private' && (
                <div className="field" style={{ marginBottom: 16, padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px dashed #fbbf24' }}>
                  <div className="label">📦 Надбавки за габарит (частные лица)</div>
                  <div className="muted" style={{ fontSize: '0.72rem', marginBottom: 8 }}>
                    Прибавка к тарифу перевозки (не к доставке/ПРР/хранению). Применяется к любому диапазону веса.
                    Менеджер в заявке выбирает категорию: маленькая — тариф как есть, средняя/большая — надбавка.
                  </div>
                  <div className="label" style={{ marginTop: 8 }}>Средняя (+тг к тарифу)</div>
                  <input type="number" value={form.sizeMedium} onChange={e => setForm({ ...form, sizeMedium: e.target.value })} placeholder="1000" />
                  <div className="label" style={{ marginTop: 12 }}>Большая (+тг к тарифу)</div>
                  <input type="number" value={form.sizeLarge} onChange={e => setForm({ ...form, sizeLarge: e.target.value })} placeholder="2000" />
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
                  <div className="label" style={{ marginTop: 12 }}>
                    📦 ПРР палетная (тг за палету)
                    <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#0050b3' }}>(ставка × кол-во палет)</span>
                  </div>
                  <input type="number" value={form.prrPallet} onChange={e => setForm({ ...form, prrPallet: e.target.value })} placeholder="4000" />
                  <div className="label" style={{ marginTop: 12 }}>
                    ✋ ПРР ручная (тг за кг)
                    <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#0050b3' }}>(ставка × вес груза)</span>
                  </div>
                  <input type="number" value={form.prrManual} onChange={e => setForm({ ...form, prrManual: e.target.value })} placeholder="20" />
                  <div className="label" style={{ marginTop: 12 }}>
                    🏬 Хранение за кг (тг/кг в сутки)
                    <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#0050b3' }}>(вес × ставка × дни)</span>
                  </div>
                  <input type="number" value={form.storagePerKg} onChange={e => setForm({ ...form, storagePerKg: e.target.value })} placeholder="0" />
                  <div className="label" style={{ marginTop: 12 }}>
                    🏬 Хранение за м³ (тг/м³ в сутки)
                    <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#0050b3' }}>(объём × ставка × дни)</span>
                  </div>
                  <input type="number" value={form.storagePerCubic} onChange={e => setForm({ ...form, storagePerCubic: e.target.value })} placeholder="0" />
                </div>
              )}

              {(form.category === 'legal' || form.category === 'private') && (
              <div className="field" style={{ marginBottom: 24, padding: 12, background: '#fef9ff', borderRadius: 8, border: '1px dashed #c084fc' }}>
                <div className="label" style={{ marginBottom: 4 }}>🚐 Доставка в регионы (посёлки рядом с {form.city || 'этим городом'})</div>
                <div className="muted" style={{ fontSize: '0.72rem', marginBottom: 12 }}>
                  Если груз едет в посёлок рядом с {form.city || 'городом'}, к тарифу до {form.city || 'города'} прибавится доплата.
                  В заявке достаточно указать посёлок как город назначения — система сама найдёт доплату (категория берётся из этого тарифа).
                </div>

                {(form.regionalDeliveries || []).map((pos, pIdx) => (
                  <div key={pIdx} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12, background: '#fafafa' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                      <input type="text" value={pos.region} onChange={e => updatePoselok(pIdx, e.target.value)} placeholder="Название посёлка (напр. Жанаозен)" style={{ fontWeight: 700 }} />
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => removePoselok(pIdx)} title="Удалить посёлок">✕</button>
                    </div>
                    <RangesEditor
                      rows={pos.ranges}
                      onUpdate={(rIdx, field, val) => updatePoselokRange(pIdx, rIdx, field, val)}
                      onAdd={() => addPoselokRange(pIdx)}
                      onRemove={(rIdx) => removePoselokRange(pIdx, rIdx)}
                    />
                  </div>
                ))}

                <button type="button" className="btn" style={{ width: '100%', marginTop: 4 }} onClick={addPoselok}>＋ Добавить посёлок</button>
                <div className="muted" style={{ fontSize: '0.7rem', marginTop: 10 }}>
                  Пример: у тарифа «Актау» добавь посёлок «Жанаозен»: до 30 → 2000, до 80 → 3000, до 150 → 4000. Заказчик оформляет груз в Жанаозен → тариф до Актау + доплата.
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