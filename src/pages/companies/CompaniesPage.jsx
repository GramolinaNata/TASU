import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCompanies,
  subscribeCompanies,
  addCompany,
  updateCompany,
  deleteCompany,
  getSelectedCompanyId,
} from "../../shared/storage/companyStorage.js";
import Modal from "../../shared/ui/Modal.jsx";

function safeUuid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function CompaniesPage() {
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState(null); // ID текущей выбранной в шапке (для подсветки)

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    bin: "",
    address: "",
    factAddress: "",
    account: "",
    bank: "",
    bik: "",
    kbe: "",
    director: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    setList(getCompanies());
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
      account: "",
      bank: "",
      bik: "",
      kbe: "",
      director: "",
      email: "",
      phone: "",
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
      account: c.account || "",
      bank: c.bank || "",
      bik: c.bik || "",
      kbe: c.kbe || "",
      director: c.director || "",
      email: c.email || "",
      phone: c.phone || "",
    });
    setModalOpen(true);
  };

  const onSave = () => {
    if (editId) {
      updateCompany(editId, form);
    } else {
      addCompany({ id: safeUuid(), ...form });
    }
    setModalOpen(false);
  };

  const onDelete = (id, name) => {
    if (!window.confirm(`Удалить компанию "${name}"?`)) return;
    deleteCompany(id);
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
              <div className="label">Фактический Адрес</div>
              <input
                value={form.factAddress}
                onChange={(e) => setForm({ ...form, factAddress: e.target.value })}
                placeholder="Город, улица (Фактический)"
              />
            </div>

            <div className="field">
              <div className="label">Банк</div>
              <input
                value={form.bank}
                onChange={(e) => setForm({ ...form, bank: e.target.value })}
                placeholder="Kaspi Bank"
              />
            </div>
            <div className="field">
              <div className="label">БИК</div>
              <input
                value={form.bik}
                onChange={(e) => setForm({ ...form, bik: e.target.value })}
                placeholder="KZK..."
              />
            </div>
            <div className="field">
              <div className="label">Номер счета (IBAN)</div>
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
            <div className="field">
              <div className="label">Директор</div>
              <input
                value={form.director}
                onChange={(e) => setForm({ ...form, director: e.target.value })}
                placeholder="Иванов И.И."
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
            <div className="field">
              <div className="label">Телефон компании</div>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+7..."
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
