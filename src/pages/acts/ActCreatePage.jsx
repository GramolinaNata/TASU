import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addAct } from "../../shared/storage/actsStorage.js";

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function genNumber() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `#${String(n)}`;
}

function safeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function ActCreatePage() {
  const nav = useNavigate();
  const defaultDate = useMemo(() => todayIso(), []);
  const [date, setDate] = useState(defaultDate);

  const [customer, setCustomer] = useState({
    phone: "",
    fio: "",
    address: "",
    bin: "",
  });

  const [route, setRoute] = useState({
    fromCity: "",
    toCity: "",
    fromAddress: "",
    toAddress: "",
    comment: "",
  });

  const [cargoText, setCargoText] = useState("");
  const [insured, setInsured] = useState(false);

  const [cargoRows, setCargoRows] = useState(() => [
    { id: safeUuid(), places: "", length: "", width: "", height: "", volWeight: "" },
  ]);

  const addRow = () => {
    setCargoRows((prev) => [
      ...prev,
      { id: safeUuid(), places: "", length: "", width: "", height: "", volWeight: "" },
    ]);
  };

  const delRow = (id) => {
    setCargoRows((prev) => {
      const next = prev.filter((x) => x.id !== id);
      return next.length
        ? next
        : [{ id: safeUuid(), places: "", length: "", width: "", height: "", volWeight: "" }];
    });
  };

  const setRow = (id, patch) => {
    setCargoRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const onSave = () => {
    const act = {
      id: safeUuid(),
      number: genNumber(),
      date,
      status: "draft",
      createdAt: Date.now(),
      customer,
      route,
      cargoText,
      cargoRows,
      insured,
      docType: null, // потом: "ttn" | "smr"
    };

    addAct(act);
    nav("/acts");
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumbs">Акты / Создать акт</div>
          <h1>Создать акт</h1>
        </div>

        <div className="topbar_actions">
          <button className="btn" type="button" onClick={() => nav(-1)}>
            ← Назад
          </button>
          <button className="btn btn--accent" type="button" onClick={onSave}>
            Сохранить
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head">
          <div className="card_title">1. Заказчик</div>
        </div>
        <div className="card_body">
          <div className="form_grid">
            <div className="field">
              <div className="label">Телефон</div>
              <input
                value={customer.phone}
                onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+7 777 123 45 67"
              />
            </div>

            <div className="field">
              <div className="label">ФИО</div>
              <input
                value={customer.fio}
                onChange={(e) => setCustomer((p) => ({ ...p, fio: e.target.value }))}
                placeholder="Иванов Иван"
              />
            </div>

            <div className="field field--full">
              <div className="label">Адрес</div>
              <input
                value={customer.address}
                onChange={(e) => setCustomer((p) => ({ ...p, address: e.target.value }))}
                placeholder="Город, улица, дом, офис"
              />
            </div>

            <div className="field">
              <div className="label">БИН</div>
              <input
                value={customer.bin}
                onChange={(e) => setCustomer((p) => ({ ...p, bin: e.target.value }))}
                placeholder="123456789012"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card_head">
          <div className="card_title">2. Доставка и характеристики груза</div>
        </div>
        <div className="card_body">
          <div className="form_grid">
            <div className="field">
              <div className="label">Город отправителя</div>
              <input
                value={route.fromCity}
                onChange={(e) => setRoute((p) => ({ ...p, fromCity: e.target.value }))}
                placeholder="Алматы"
              />
            </div>

            <div className="field">
              <div className="label">Город получателя</div>
              <input
                value={route.toCity}
                onChange={(e) => setRoute((p) => ({ ...p, toCity: e.target.value }))}
                placeholder="Астана"
              />
            </div>

            <div className="field">
              <div className="label">Адрес отправителя</div>
              <input
                value={route.fromAddress}
                onChange={(e) => setRoute((p) => ({ ...p, fromAddress: e.target.value }))}
                placeholder="Улица, дом, склад"
              />
            </div>

            <div className="field">
              <div className="label">Адрес получателя</div>
              <input
                value={route.toAddress}
                onChange={(e) => setRoute((p) => ({ ...p, toAddress: e.target.value }))}
                placeholder="Улица, дом, офис"
              />
            </div>

            <div className="field field--full">
              <div className="label">Комментарии</div>
              <textarea
                value={route.comment}
                onChange={(e) => setRoute((p) => ({ ...p, comment: e.target.value }))}
                placeholder="Например: звонить за 30 минут"
              />
            </div>

            <div className="field field--full">
              <div className="label">Характеристики груза</div>
              <textarea
                value={cargoText}
                onChange={(e) => setCargoText(e.target.value)}
                placeholder="Например: бытовая техника, хрупкое, не кантовать"
              />
            </div>
          </div>

          <div className="table_wrap" style={{ marginTop: 12 }}>
            <div className="table_scroll">
              <table className="table_fixed">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>№</th>
                    <th style={{ width: 140 }}>Кол-во мест</th>
                    <th style={{ width: 120 }}>Длина</th>
                    <th style={{ width: 120 }}>Ширина</th>
                    <th style={{ width: 120 }}>Высота</th>
                    <th style={{ width: 160 }}>Объёмный вес</th>
                    <th style={{ width: 140, textAlign: "right" }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {cargoRows.map((r, idx) => (
                    <tr key={r.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <input
                          className="cell_input cell_input--wide"
                          value={r.places}
                          onChange={(e) => setRow(r.id, { places: e.target.value })}
                          placeholder="1"
                        />
                      </td>
                      <td>
                        <input
                          className="cell_input"
                          value={r.length}
                          onChange={(e) => setRow(r.id, { length: e.target.value })}
                          placeholder="см"
                        />
                      </td>
                      <td>
                        <input
                          className="cell_input"
                          value={r.width}
                          onChange={(e) => setRow(r.id, { width: e.target.value })}
                          placeholder="см"
                        />
                      </td>
                      <td>
                        <input
                          className="cell_input"
                          value={r.height}
                          onChange={(e) => setRow(r.id, { height: e.target.value })}
                          placeholder="см"
                        />
                      </td>
                      <td>
                        <input
                          className="cell_input"
                          value={r.volWeight}
                          onChange={(e) => setRow(r.id, { volWeight: e.target.value })}
                          placeholder="кг"
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => delRow(r.id)}
                          style={{ height: 36 }}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                padding: 12,
                display: "flex",
                justifyContent: "flex-end",
                background: "#fbfbfb",
                borderTop: "1px solid var(--line)",
              }}
            >
              <button className="btn" type="button" onClick={addRow} style={{ height: 36 }}>
                + Добавить строку
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={insured}
                onChange={(e) => setInsured(e.target.checked)}
              />
              Имеется ли страховка?
            </label>

            <div className="field" style={{ maxWidth: 240 }}>
              <div className="label">Дата</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
