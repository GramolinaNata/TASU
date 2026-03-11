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
    });
    setModalOpen(true);
  };

  const onSave = async () => {
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
              <tr key={c.id} style={c.id === selectedId ? { background: "#fffbe6" } : {}}>
                <td>
                  <span style={{ fontWeight: 700 }}>{c.name}</span>
                  {c.id === selectedId && (
                    <span className="badge badge--ttn" style={{ marginLeft: 8 }}>
                      Текущая
                    </span>
                  )}
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