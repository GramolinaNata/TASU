import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  subscribeCompanies,
  getSelectedCompanyId,
  loadCompanies as reloadGlobalCompanies
} from "../../shared/storage/companyStorage.js";
import { api } from "../../shared/api/api.js";
import Modal from "../../shared/ui/Modal.jsx";
import Loader from "../../shared/components/Loader";

// ---- СОРТИРОВКА ----
function getSortValue(c, field) {
  switch (field) {
    case 'name':    return (c.name || '').toString().toLowerCase();
    case 'bin':     return (c.bin || '').toString().toLowerCase();
    case 'address': return (c.address || '').toString().toLowerCase();
    case 'email':   return (c.email || '').toString().toLowerCase();
    default:        return '';
  }
}

const EMPTY_FORM = {
name: "", bin: "", address: "", factAddress: "", phone: "", director: "",
  email: "", bank: "", bik: "", account: "", kbe: "", bankDetails: "", taxRate: 0,
  managerDetails: "", logo: "",
  // 🆕 ТЗ v2: PNG с печатью и подписью
  stamp: "",
};

export default function CompaniesPage() {
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // 🆕 ТЗ v2: Табы Активные / Аннулированные
  const [tab, setTab] = useState('active');

  // Сортировка
  const [sortBy, setSortBy] = useState('name');
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

  const filteredList = useMemo(() => {
    const filtered = list.filter(c => {
      const isCanceled = c.status === 'canceled';
      return tab === 'canceled' ? isCanceled : !isCanceled;
    });
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [list, sortBy, sortOrder, tab]);

  const tabCounts = useMemo(() => ({
    active: list.filter(c => c.status !== 'canceled').length,
    canceled: list.filter(c => c.status === 'canceled').length,
  }), [list]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await api.companies.list();
      setList(data || []);
    } catch (err) {
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    setSelectedId(getSelectedCompanyId());
    return subscribeCompanies((newList) => {
      setList(newList);
      setSelectedId(getSelectedCompanyId());
    });
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setForm({
      name: c.name, bin: c.bin, address: c.address,
      factAddress: c.factAddress || "", phone: c.phone || "",
      director: c.director || "", email: c.email || "",
      bank: c.bank || "", bik: c.bik || "", account: c.account || "",
      kbe: c.kbe || "", bankDetails: c.bankDetails || "", taxRate: c.taxRate || 0,
      managerDetails: c.managerDetails || "",
      logo: c.logo || "",
      stamp: c.stamp || "",
    });
    setModalOpen(true);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Логотип слишком большой (макс 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (result.startsWith('data:image/webp')) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const pngData = canvas.toDataURL('image/png');
          setForm(prev => ({ ...prev, logo: pngData }));
        };
        img.src = result;
      } else {
        setForm(prev => ({ ...prev, logo: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStampChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Файл печати слишком большой (макс 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (result.startsWith('data:image/webp')) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          setForm(prev => ({ ...prev, stamp: canvas.toDataURL('image/png') }));
        };
        img.src = result;
      } else {
        setForm(prev => ({ ...prev, stamp: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    try {
      const payload = { ...form, taxRate: parseFloat(form.taxRate) || 0 };
      if (editId) {
        await api.companies.update(editId, payload);
      } else {
        await api.companies.create(payload);
      }
      loadCompanies();
      reloadGlobalCompanies();
      setModalOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const onCancel = async (id, name) => {
    if (!window.confirm(
      `Аннулировать компанию "${name}"?\n\n` +
      `Компания не будет удалена, но станет недоступной для новых заявок и документов. ` +
      `Все существующие заявки и история сохранятся.`
    )) return;
    try {
      await api.companies.update(id, { status: 'canceled' });
      loadCompanies();
      reloadGlobalCompanies();
    } catch (err) {
      alert("Ошибка при аннулировании: " + err.message);
    }
  };

  const onRestore = async (id, name) => {
    if (!window.confirm(`Восстановить компанию "${name}"? Она снова станет активной.`)) return;
    try {
      await api.companies.update(id, { status: 'active' });
      loadCompanies();
      reloadGlobalCompanies();
    } catch (err) {
      alert("Ошибка при восстановлении: " + err.message);
    }
  };

  return (
    <>
      <div className="navbar">
        <h1>Компании</h1>
        <button className="btn btn--accent" onClick={openCreate}>
          + Добавить компанию
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          className={`btn ${tab === 'active' ? 'btn--accent' : ''}`}
          onClick={() => setTab('active')}
        >
          🟢 Активные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.active})</span>
        </button>
        <button
          className={`btn ${tab === 'canceled' ? 'btn--accent' : ''}`}
          onClick={() => setTab('canceled')}
        >
          🚫 Аннулированные <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({tabCounts.canceled})</span>
        </button>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? (
          <Loader />
        ) : (
          <table>
            <thead>
              <tr>
                <SortableTh field="name">Название</SortableTh>
                <SortableTh field="bin">БИН</SortableTh>
                <SortableTh field="address">Адрес</SortableTh>
                <SortableTh field="email">Email</SortableTh>
                <th style={{ width: 220, textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted" style={{ padding: 16 }}>
                    {tab === 'active' ? 'Нет активных компаний.' : 'Нет аннулированных компаний.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((c) => {
                  const isCanceled = c.status === 'canceled';
                  return (
                    <tr
                      key={c.id}
                      className={c.id === selectedId ? "row_selected" : ""}
                      style={{ opacity: isCanceled ? 0.65 : 1 }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {c.logo && (
                            <img src={c.logo} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', background: '#f5f5f5', borderRadius: 4 }} />
                          )}
                          <div>
                            <span style={{ fontWeight: 700 }}>{c.name}</span>
                            {c.id === selectedId && (
                              <span className="badge badge--ttn" style={{ marginLeft: 8 }}>
                                Текущая
                              </span>
                            )}
                            {isCanceled && (
                              <span style={{
                                marginLeft: 8,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}>
                                АННУЛИРОВАНА
                              </span>
                            )}
                            {c.stamp && !isCanceled && (
                              <span style={{
                                marginLeft: 8,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: '#ecfdf5',
                                color: '#047857',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }} title="Печать с подписью загружена">
                                ✓ Печать
                              </span>
                            )}
                            <div className="muted" style={{ fontSize: '0.8rem' }}>{c.email || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td>{c.bin}</td>
                      <td>{c.address}</td>
                      <td>{c.email || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
                          <button className="btn btn--sm" onClick={() => openEdit(c)}>Изм.</button>
                          {isCanceled ? (
                            <button
                              className="btn btn--sm"
                              style={{ background: '#10b981', color: '#fff', border: 'none', textDecoration: 'none', whiteSpace: 'nowrap' }}
                              onClick={() => onRestore(c.id, c.name)}
                              title="Восстановить компанию"
                            >
                              Восстановить
                            </button>
                          ) : (
                            <button
                              className="btn btn--sm"
                              style={{ background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', textDecoration: 'none', whiteSpace: 'nowrap' }}
                              onClick={() => onCancel(c.id, c.name)}
                              title="Аннулировать"
                            >
                              Аннулировать
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editId ? "Редактировать компанию" : "Новая компания"}
          onClose={() => setModalOpen(false)}
        >
          <div className="form_grid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <div className="label">Логотип компании</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {form.logo ? (
                    <div style={{ position: 'relative' }}>
                      <img src={form.logo} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }} />
                      <button
                        className="btn btn--sm btn--danger"
                        style={{ position: 'absolute', top: -8, right: -8, borderRadius: '50%', width: 24, height: 24, padding: 0 }}
                        onClick={() => setForm({ ...form, logo: "" })}
                      >×</button>
                    </div>
                  ) : (
                    <div style={{ width: 80, height: 80, border: '1px dashed #ccc', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.7rem', textAlign: 'center' }}>
                      Нет логотипа
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoChange} style={{ fontSize: '0.75rem' }} />
                </div>
                <div className="muted" style={{ fontSize: '0.7rem', marginTop: 4 }}>PNG/JPG/WebP до 2MB</div>
              </div>

              <div className="field">
                <div className="label">
                  Печать с подписью
                  <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#dc2626' }}>★ для документов на экспорт</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {form.stamp ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={form.stamp}
                        alt="Stamp"
                        style={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4, background: '#fafafa' }}
                      />
                      <button
                        className="btn btn--sm btn--danger"
                        style={{ position: 'absolute', top: -8, right: -8, borderRadius: '50%', width: 24, height: 24, padding: 0 }}
                        onClick={() => setForm({ ...form, stamp: "" })}
                      >×</button>
                    </div>
                  ) : (
                    <div style={{ width: 80, height: 80, border: '1px dashed #ccc', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.7rem', textAlign: 'center', padding: 4 }}>
                      Нет печати
                    </div>
                  )}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleStampChange} style={{ fontSize: '0.75rem' }} />
                </div>
                <div className="muted" style={{ fontSize: '0.7rem', marginTop: 4 }}>
                  PNG с прозрачным фоном — отобразится на договорах и других документах
                </div>
              </div>
            </div>

            <hr style={{ margin: '8px 0', border: '0', borderTop: '1px dashed #ccc' }} />

            <div className="field">
              <div className="label">Название</div>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="TOO Ромашка" />
            </div>
            <div className="field">
              <div className="label">БИН</div>
              <input value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value })} placeholder="12 цифр" />
            </div>
            <div className="field">
              <div className="label">Юр. Адрес</div>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Город, улица (Юридический)" />
            </div>
            <div className="field">
              <div className="label">Реквизиты (Банк, IBAN, БИК и т.д.)</div>
              <textarea className="input" style={{ minHeight: '80px', padding: '8px' }} value={form.bankDetails} onChange={(e) => setForm({ ...form, bankDetails: e.target.value })} placeholder="АО Kaspi Bank, KZ..., БИК, КБЕ" />
            </div>

            <div className="field">
              <div className="label">Фактический адрес</div>
              <input value={form.factAddress} onChange={(e) => setForm({ ...form, factAddress: e.target.value })} placeholder="Город, улица (Фактический)" />
            </div>
            <div className="field">
              <div className="label">Директор</div>
              <input value={form.director} onChange={(e) => setForm({ ...form, director: e.target.value })} placeholder="Иванов И.И." />
            </div>
            <div className="field">
              <div className="label">Телефон</div>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 (707) ..." />
            </div>
            <div className="field">
              <div className="label">Электронная почта (Email)</div>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@company.kz" />
            </div>

            <hr style={{ margin: '8px 0', border: '0', borderTop: '1px dashed #ccc' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <div className="label">Банк</div>
                <input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="АО Kaspi Bank" />
              </div>
              <div className="field">
                <div className="label">БИК</div>
                <input value={form.bik} onChange={(e) => setForm({ ...form, bik: e.target.value })} placeholder="KASPKZKA" />
              </div>
              <div className="field">
                <div className="label">Расчетный счет (KZ...)</div>
                <input value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="KZ..." />
              </div>
             <div className="field">
                <div className="label">КБЕ</div>
                <input value={form.kbe} onChange={(e) => setForm({ ...form, kbe: e.target.value })} placeholder="17" />
              </div>
              <div className="field">
                <div className="label">Ставка налога, %</div>
                <input type="number" step="0.1" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} placeholder="3" />
              </div>
            </div>

            <div className="field">
              <div className="label">Общие реквизиты (Доп. информация)</div>
              <textarea className="input" style={{ minHeight: '60px', padding: '8px' }} value={form.managerDetails} onChange={(e) => setForm({ ...form, managerDetails: e.target.value })} placeholder="Прочие данные для документов" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button className="btn btn--accent" onClick={onSave}>Сохранить</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}