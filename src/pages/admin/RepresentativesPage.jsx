import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../shared/api/api.js";
import Loader from "../../shared/components/Loader";
import Modal from "../../shared/ui/Modal.jsx";
import CitiesMultiSelect from "../../shared/directory/CitiesMultiSelect.jsx";
import { entityCities } from "../../shared/directory/byCity.js";
import { getDeliveryDestinations } from "../../shared/tariff/calcTariff.js";

// Города обслуживания одной строкой — для поиска и сортировки.
// Читает новый список cities с fallback на старое одиночное city.
function citiesText(c) {
  return entityCities(c).join(', ');
}

function getSortValue(c, field) {
  switch (field) {
    case 'name':  return (c.name || '').toString().toLowerCase();
    case 'phone': return (c.phone || '').toString().toLowerCase();
    case 'city':  return citiesText(c).toLowerCase();
    default:      return '';
  }
}

export default function RepresentativesPage() {
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // cities — массив городов обслуживания (на сервер уходит массивом).
  const [formData, setFormData] = useState({ name: "", phone: "", cities: [] });
  const [tariffs, setTariffs] = useState([]);

  // Подсказки городов — из тарифов (те же направления, что в формах накладной).
  const cityOptions = useMemo(
    () => getDeliveryDestinations(tariffs).map(d => d.city),
    [tariffs]
  );

  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
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

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.representatives.list();
      setReps(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    api.tariffs.list().then(d => { if (Array.isArray(d)) setTariffs(d); }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    let list = reps;
    if (s) {
      list = list.filter(c =>
        c.name?.toLowerCase().includes(s) ||
        c.phone?.toLowerCase().includes(s) ||
        citiesText(c).toLowerCase().includes(s)
      );
    }
    const sorted = [...list].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [reps, q, sortBy, sortOrder]);

  const handleEdit = (c) => {
    setEditing(c);
    // Старые записи: cities пустое → показываем город из city (обратная совместимость).
    setFormData({ name: c.name || "", phone: c.phone || "", cities: entityCities(c) });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditing(null);
    setFormData({ name: "", phone: "", cities: [] });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Удалить представителя?")) {
      try {
        await api.representatives.delete(id);
        loadData();
      } catch (e) {
        alert("Ошибка при удалении");
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.representatives.update(editing.id, formData);
      } else {
        await api.representatives.create(formData);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert("Ошибка при сохранении: " + (err.message || err));
    }
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1>Представители</h1>
          <div className="chip">СПРАВОЧНИК</div>
        </div>
        <button className="btn btn--accent" onClick={handleNew}>+ Добавить представителя</button>
      </div>

      <div className="filter" style={{ marginTop: 20 }}>
        <div className="field" style={{ flex: 1 }}>
          <div className="label">Поиск</div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по имени, телефону или городу..." />
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table>
            <thead>
              <tr>
                <SortableTh field="name">ФИО представителя</SortableTh>
                <SortableTh field="phone">Телефон</SortableTh>
                <SortableTh field="city">Города обслуживания</SortableTh>
                <th style={{ width: 120 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="muted">Представители не найдены.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.phone || "—"}</td>
                  <td>
                    {entityCities(c).length === 0 ? "—" : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {entityCities(c).map(city => (
                          <span key={city} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 999, padding: '1px 8px', fontSize: '0.78rem', fontWeight: 600 }}>
                            {city}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn--sm" onClick={() => handleEdit(c)}>ред.</button>
                      <button className="btn btn--sm btn--danger" onClick={() => handleDelete(c.id)}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? "Редактировать представителя" : "Новый представитель"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="form_grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <div className="label">ФИО представителя <span className="text_danger">*</span></div>
              <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="field">
              <div className="label">Телефон</div>
              <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+7 (777) 123-45-67" />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <div className="label">Города обслуживания</div>
              <CitiesMultiSelect
                value={formData.cities}
                onChange={cities => setFormData({ ...formData, cities })}
                options={cityOptions}
              />
            </div>
            <div style={{ gridColumn: 'span 2', marginTop: 16, display: 'flex', gap: 12 }}>
              <button className="btn btn--accent" type="submit" style={{ flex: 1 }}>Сохранить</button>
              <button className="btn" type="button" onClick={() => setShowModal(false)}>Отмена</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}