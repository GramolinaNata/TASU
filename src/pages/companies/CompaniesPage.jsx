import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  subscribeCompanies,
  getSelectedCompanyId,
  loadCompanies as reloadGlobalCompanies
} from "../../shared/storage/companyStorage.js";
import { api } from "../../shared/api/api.js";
import Modal from "../../shared/ui/Modal.jsx";

export default function CompaniesPage() {
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState(null); 
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    bin: "",
    address: "",
    factAddress: "",
    phone: "",
    director: "",
    email: "",
    bank: "",
    bik: "",
    account: "",
    kbe: "",
    bankDetails: "",
    managerDetails: "",
    logo: "",
  });

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await api.companies.list();
      setList(data);
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
    setForm({
      name: "",
      bin: "",
      address: "",
      factAddress: "",
      phone: "",
      director: "",
      email: "",
      bank: "",
      bik: "",
      account: "",
      kbe: "",
      bankDetails: "",
      managerDetails: "",
    });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      bin: c.bin,
      address: c.address,
      factAddress: c.factAddress || "",
      phone: c.phone || "",
      director: c.director || "",
      email: c.email || "",
      bank: c.bank || "",
      bik: c.bik || "",
      account: c.account || "",
      kbe: c.kbe || "",
      bankDetails: c.bankDetails || "",
      managerDetails: c.managerDetails || "",
      logo: c.logo || "",
    });
    setModalOpen(true);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Логотип слишком большой (макс 2MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        // Если это webp, конвертируем в png для совместимости с любыми версиями Word
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
    }
  };

  const onSave = async () => {
    if (form.logo && form.logo.length > 0) {
      alert("Отправка логотипа, размер: " + Math.round(form.logo.length / 1024) + " KB");
    }
    try {
      if (editId) {
        await api.companies.update(editId, form);
      } else {
        await api.companies.create(form);
      }
      loadCompanies();
      reloadGlobalCompanies(); // Обновляем кеш в сторадже
      setModalOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const onDelete = async (id, name) => {
    if (!window.confirm(`Удалить компанию "${name}"?`)) return;
    try {
      await api.companies.delete(id);
      loadCompanies();
      reloadGlobalCompanies(); // Обновляем кеш в сторадже
    } catch (err) {
      alert(err.message);
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

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading && <div className="muted" style={{ padding: 12 }}>Загрузка компаний...</div>}
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>БИН</th>
              <th>Адрес</th>
              <th>Email</th>
              <th style={{ width: 140, textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className={c.id === selectedId ? "row_selected" : ""}>
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
                      <div className="muted" style={{ fontSize: '0.8rem' }}>{c.email || "—"}</div>
                    </div>
                  </div>
                </td>
                <td>{c.bin}</td>
                <td>{c.address}</td>
                <td>{c.email || "—"}</td>
                <td
                  style={{
                    textAlign: "right",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <button className="btn btn--sm" onClick={() => openEdit(c)}>
                    Изм.
                  </button>
                  <button
                    className="btn btn--sm btn--danger"
                    onClick={() => onDelete(c.id, c.name)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal
          title={editId ? "Редактировать компанию" : "Новая компания"}
          onClose={() => setModalOpen(false)}
        >
          <div className="form_grid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="field">
              <div className="label">Логотип компании</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {form.logo ? (
                  <div style={{ position: 'relative' }}>
                    <img src={form.logo} alt="Preview" style={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }} />
                    <button 
                      className="btn btn--sm btn--danger" 
                      style={{ position: 'absolute', top: -8, right: -8, borderRadius: '50%', width: 24, height: 24, padding: 0 }}
                      onClick={() => setForm({...form, logo: ""})}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div style={{ width: 80, height: 80, border: '1px dashed #ccc', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.7rem', textAlign: 'center' }}>
                    Нет логотипа
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleLogoChange} style={{ fontSize: '0.8rem' }} />
              </div>
              <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>Рекомендуемый формат: PNG/JPG/WebP до 2MB. Появится во всех документах.</div>
            </div>

            <div className="field">
              <div className="label">Название</div>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="TOO Ромашка"
              />
            </div>
            <div className="field">
              <div className="label">БИН</div>
              <input
                value={form.bin}
                onChange={(e) => setForm({ ...form, bin: e.target.value })}
                placeholder="12 цифр"
              />
            </div>
            <div className="field">
              <div className="label">Юр. Адрес</div>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Город, улица (Юридический)"
              />
            </div>
            <div className="field">
              <div className="label">Реквизиты (Банк, Счет, БИК и т.д.)</div>
              <textarea
                className="input"
                style={{ minHeight: '80px', padding: '8px' }}
                value={form.bankDetails}
                onChange={(e) => setForm({ ...form, bankDetails: e.target.value })}
                placeholder="АО Kaspi Bank, KZ..., БИК, КБЕ"
              />
            </div>
            
            <div className="field">
              <div className="label">Фактический адрес</div>
              <input
                value={form.factAddress}
                onChange={(e) => setForm({ ...form, factAddress: e.target.value })}
                placeholder="Город, улица (Фактический)"
              />
            </div>
            <div className="field">
              <div className="label">Директор</div>
              <input
                value={form.director}
                onChange={(e) => setForm({ ...form, director: e.target.value })}
                placeholder="Иванов И.И."
              />
            </div>
            <div className="field">
              <div className="label">Телефон</div>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 (707) ..."
              />
            </div>
            <div className="field">
              <div className="label">Электронная почта (Email)</div>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="info@company.kz"
              />
            </div>

            <hr style={{ margin: '8px 0', border: '0', borderTop: '1px dashed #ccc' }} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <div className="label">Банк</div>
                <input
                  value={form.bank}
                  onChange={(e) => setForm({ ...form, bank: e.target.value })}
                  placeholder="АО Kaspi Bank"
                />
              </div>
              <div className="field">
                <div className="label">БИК</div>
                <input
                  value={form.bik}
                  onChange={(e) => setForm({ ...form, bik: e.target.value })}
                  placeholder="KASPKZKA"
                />
              </div>
              <div className="field">
                <div className="label">Расчетный счет (KZ...)</div>
                <input
                  value={form.account}
                  onChange={(e) => setForm({ ...form, account: e.target.value })}
                  placeholder="KZ..."
                />
              </div>
              <div className="field">
                <div className="label">КБЕ</div>
                <input
                  value={form.kbe}
                  onChange={(e) => setForm({ ...form, kbe: e.target.value })}
                  placeholder="17"
                />
              </div>
            </div>

            <div className="field">
              <div className="label">Общие реквизиты (Доп. информация)</div>
              <textarea
                className="input"
                style={{ minHeight: '60px', padding: '8px' }}
                value={form.bankDetails}
                onChange={(e) => setForm({ ...form, bankDetails: e.target.value })}
                placeholder="Прочие данные для документов"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button className="btn btn--accent" onClick={onSave}>
                Сохранить
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}