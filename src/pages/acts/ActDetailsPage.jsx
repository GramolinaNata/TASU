import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getActById, updateAct, deleteAct } from "../../shared/storage/actsStorage.js";

function safeUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
export default function ActDetailsPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const [act, setAct] = useState(null);
  const [docType, setDocType] = useState(null);

  const [receiver, setReceiver] = useState({ name: "", address: "", bin: "", phone: "" });

  const [payer, setPayer] = useState({
    bin: "",
    bik: "",
    address: "",
    account: "",
    kbe: "",
    director: "",
    contacts: "",
    currency: "KZT",
    bankName: "",
  });

  const [transport, setTransport] = useState({
    type: "Авто перевозки (консол)",
    info: "",
  });

  const [services, setServices] = useState(() => [
    { id: safeUuid(), name: "Доставка", qty: "1", sum: "0" },
  ]);

  const [total, setTotal] = useState({ price: "" });

  useEffect(() => {
    if (!id) return;
    setAct(getActById(id));
    const found = getActById(id);
    setAct(found);
    setDocType(found?.docType || null);
    setReceiver(found?.receiver || { name: "", address: "", bin: "", phone: "" });

    setPayer(
      found?.payer || {
        bin: "",
        bik: "",
        address: "",
        account: "",
        kbe: "",
        director: "",
        contacts: "",
        currency: "KZT",
        bankName: "",
      }
    );

    setTransport(found?.transport || { type: "Авто перевозки (консол)", info: "" });

    setServices(
      Array.isArray(found?.services) && found.services.length
        ? found.services
        : [{ id: safeUuid(), name: "Доставка", qty: "1", sum: "0" }]
    );

    setTotal(found?.total || { price: "" });
  }, [id]);
  const chooseDocType = (type) => {
    if (!id) return;
    const updated = updateAct(id, { docType: type });
    setAct(updated);
    setDocType(type);
  };

  const isTtn = docType === "ttn";
  const isSmr = docType === "smr";
  const showExtra = Boolean(docType);
  const addServiceRow = () => {
    setServices((prev) => [...prev, { id: safeUuid(), name: "", qty: "1", sum: "0" }]);
  };

  const removeServiceRow = (rowId) => {
    setServices((prev) => {
      const next = prev.filter((x) => x.id !== rowId);
      return next.length ? next : [{ id: safeUuid(), name: "", qty: "1", sum: "0" }];
    });
  };

  const setServiceRow = (rowId, patch) => {
    setServices((prev) => prev.map((x) => (x.id === rowId ? { ...x, ...patch } : x)));
  };

  const saveExtra = () => {
    if (!id) return;
    const updated = updateAct(id, {
      receiver,
      payer,
      transport,
      services,
      total,
    });
    setAct(updated);
  };

  if (!act) {
    return (
      <>
        <div className="topbar">
          <div>
            <div className="crumbs">Акты / Не найдено</div>
            <h1>Акт не найден</h1>
          </div>
          <div className="topbar_actions">
            <button className="btn" type="button" onClick={() => nav("/acts")}>
              ← Назад
            </button>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 16 }}>
          Возможно, акт удалён или ссылка неверная.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="crumbs">Акты / {act.number}</div>
          <h1>{act.number}</h1>
        </div>

        <div className="topbar_actions">
          <button className="btn" type="button" onClick={() => nav("/acts")}>
            ← Назад
          </button>
          <button
            className="btn btn--danger"
            type="button"
            onClick={() => {
              const ok = window.confirm(`Удалить акт ${act.number}?`);
              if (!ok) return;
              deleteAct(act.id);
              nav("/acts");
            }}
          >
            Удалить акт
          </button>
          <button className="btn btn--accent" type="button" onClick={() => chooseDocType("ttn")}>
            Сформировать ТТН
          </button>

          <button className="btn btn--accent" type="button" onClick={() => chooseDocType("smr")}>
            Сформировать СМР
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head">
          <div className="card_title">Кратко по акту</div>
        </div>

        <div className="card_body">
          <div className="summary_grid">
            <div className="summary_item">
              <div className="label">Номер</div>
              <div className="v">{act.number}</div>
            </div>

            <div className="summary_item">
              <div className="label">Дата</div>
              <div className="v">{act.date || "—"}</div>
            </div>

            <div className="summary_item">
              <div className="label">Статус</div>
              <div>
                {act.docType === "ttn" ? (
                  <span className="badge badge--ttn">ТТН</span>
                ) : act.docType === "smr" ? (
                  <span className="badge badge--smr">СМР</span>
                ) : (
                  <span className="badge badge--draft">Черновик</span>
                )}
              </div>
            </div>

            <div className="summary_item">
              <div className="label">Страховка</div>
              <div className="v">{act.insured ? "Да" : "Нет"}</div>
            </div>

            <div className="summary_item summary_full">
              <div className="label">Маршрут</div>
              <div className="route_row">
                <span className="chip">{act.route?.fromCity || "—"}</span>
                <span className="route_arrow">→</span>
                <span className="chip">{act.route?.toCity || "—"}</span>
              </div>
            </div>
          </div>

          <div className="split_2" style={{ marginTop: 14 }}>
            <div className="info_card">
              <div className="info_title">Заказчик</div>
              <div className="kv">
                <div className="k">ФИО</div>
                <div className="v">{act.customer?.fio || "—"}</div>

                <div className="k">Телефон</div>
                <div className="v">{act.customer?.phone || "—"}</div>

                <div className="k">Адрес</div>
                <div className="v">{act.customer?.address || "—"}</div>

                <div className="k">БИН</div>
                <div className="v">{act.customer?.bin || "—"}</div>
              </div>
            </div>

            <div className="info_card">
              <div className="info_title">Адреса доставки</div>
              <div className="kv">
                <div className="k">Адрес отправителя</div>
                <div className="v">{act.route?.fromAddress || "—"}</div>

                <div className="k">Адрес получателя</div>
                <div className="v">{act.route?.toAddress || "—"}</div>

                <div className="k">Комментарий</div>
                <div className="v">{act.route?.comment || "—"}</div>
              </div>
            </div>
          </div>

          <div className="info_card" style={{ marginTop: 14 }}>
            <div className="info_title">Характеристики груза</div>
            <div className="text_block">{act.cargoText || "—"}</div>
          </div>

          {Array.isArray(act.cargoRows) && act.cargoRows.length ? (
            <div className="info_card" style={{ marginTop: 14 }}>
              <div className="info_title">Таблица мест</div>

              <div className="table_wrap" style={{ marginTop: 10 }}>
                <div className="table_scroll">
                  <table className="table_fixed">
                    <thead>
                      <tr>
                        <th style={{ width: 56 }}>№</th>
                        <th>Кол-во мест</th>
                        <th>Длина</th>
                        <th>Ширина</th>
                        <th>Высота</th>
                        <th>Вес</th>
                        <th>Объём</th>
                        <th>Объёмный вес</th>
                      </tr>
                    </thead>
                    <tbody>
                      {act.cargoRows.map((r, idx) => (
                        <tr key={r.id || idx}>
                          <td>{idx + 1}</td>
                          <td>{r.places || "—"}</td>
                          <td>{r.length || "—"}</td>
                          <td>{r.width || "—"}</td>
                          <td>{r.height || "—"}</td>
                          <td>{r.weight || "—"}</td>
                          <td>{r.volume || "—"}</td>
                          <td>{r.volWeight || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showExtra && (
        <>
          <div className="section_note">
            Режим: <b>{isTtn ? "ТТН" : "СМР"}</b>. Заполни поля ниже и сохрани.
          </div>

          {/* 3. Получатель */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card_head">
              <div className="card_title">3. Получатель</div>
            </div>
            <div className="card_body">
              <div className="form_grid">
                <div className="field">
                  <div className="label">Имя / ФИО / Наименование</div>
                  <input
                    value={receiver.name}
                    onChange={(e) => setReceiver((p) => ({ ...p, name: e.target.value }))}
                    placeholder="ТОО / ФИО"
                  />
                </div>
                <div className="field">
                  <div className="label">Телефон</div>
                  <input
                    value={receiver.phone}
                    onChange={(e) => setReceiver((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+7 777 123 45 67"
                  />
                </div>
                <div className="field field--full">
                  <div className="label">Адрес</div>
                  <input
                    value={receiver.address}
                    onChange={(e) => setReceiver((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Город, улица, дом"
                  />
                </div>
                <div className="field">
                  <div className="label">БИН</div>
                  <input
                    value={receiver.bin}
                    onChange={(e) => setReceiver((p) => ({ ...p, bin: e.target.value }))}
                    placeholder="123456789012"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Реквизиты плательщика */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card_head">
              <div className="card_title">4. Реквизиты плательщика</div>
            </div>
            <div className="card_body">
              <div className="form_grid">
                <div className="field">
                  <div className="label">BIN</div>
                  <input
                    value={payer.bin}
                    onChange={(e) => setPayer((p) => ({ ...p, bin: e.target.value }))}
                    placeholder="123456789012"
                  />
                </div>
                <div className="field">
                  <div className="label">BIK</div>
                  <input
                    value={payer.bik}
                    onChange={(e) => setPayer((p) => ({ ...p, bik: e.target.value }))}
                    placeholder="CASPKZKA"
                  />
                </div>

                <div className="field field--full">
                  <div className="label">Адрес</div>
                  <input
                    value={payer.address}
                    onChange={(e) => setPayer((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Город, улица, дом"
                  />
                </div>

                <div className="field">
                  <div className="label">Номер счета</div>
                  <input
                    value={payer.account}
                    onChange={(e) => setPayer((p) => ({ ...p, account: e.target.value }))}
                    placeholder="KZ00..."
                  />
                </div>
                <div className="field">
                  <div className="label">KBE</div>
                  <input
                    value={payer.kbe}
                    onChange={(e) => setPayer((p) => ({ ...p, kbe: e.target.value }))}
                    placeholder="17"
                  />
                </div>

                <div className="field">
                  <div className="label">Имя директора</div>
                  <input
                    value={payer.director}
                    onChange={(e) => setPayer((p) => ({ ...p, director: e.target.value }))}
                    placeholder="ФИО"
                  />
                </div>
                <div className="field">
                  <div className="label">Контакты</div>
                  <input
                    value={payer.contacts}
                    onChange={(e) => setPayer((p) => ({ ...p, contacts: e.target.value }))}
                    placeholder="Телефон / email"
                  />
                </div>

                <div className="field">
                  <div className="label">Валюта</div>
                  <select
                    value={payer.currency}
                    onChange={(e) => setPayer((p) => ({ ...p, currency: e.target.value }))}
                  >
                    <option value="KZT">KZT</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div className="field">
                  <div className="label">Название банка</div>
                  <input
                    value={payer.bankName}
                    onChange={(e) => setPayer((p) => ({ ...p, bankName: e.target.value }))}
                    placeholder="Kaspi Bank"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Вид перевозки */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card_head">
              <div className="card_title">5. Вид перевозки</div>
            </div>
            <div className="card_body">
              <div className="form_grid">
                <div className="field field--full">
                  <div className="label">Вид транспорта</div>
                  <select
                    value={transport.type}
                    onChange={(e) => setTransport((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option>Авто перевозки (консол)</option>
                    <option>Авто перевозки (отдельно)</option>
                    <option>Самолет</option>
                    <option>Поезд (рейс)</option>
                  </select>
                </div>

                <div className="field field--full">
                  <div className="label">Информация о транспорте</div>
                  <textarea
                    value={transport.info}
                    onChange={(e) => setTransport((p) => ({ ...p, info: e.target.value }))}
                    placeholder="Марка, госномер, водитель, примечания"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Услуги */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card_head">
              <div className="card_title">6. Услуги</div>
            </div>
            <div className="card_body">
              <div className="table_wrap">
                <div className="table_scroll">
                  <table className="table_fixed">
                    <thead>
                      <tr>
                        <th>Название</th>
                        <th style={{ width: 160 }}>Количество</th>
                        <th style={{ width: 200 }}>Сумма</th>
                        <th style={{ width: 140, textAlign: "right" }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <input
                              className="cell_input cell_input--wide"
                              value={s.name}
                              onChange={(e) => setServiceRow(s.id, { name: e.target.value })}
                              placeholder="Название"
                            />
                          </td>
                          <td>
                            <input
                              className="cell_input"
                              type="number"
                              value={s.qty}
                              onChange={(e) => setServiceRow(s.id, { qty: e.target.value })}
                              placeholder="1"
                            />
                          </td>
                          <td>
                            <input
                              className="cell_input cell_input--wide"
                              type="number"
                              value={s.sum}
                              onChange={(e) => setServiceRow(s.id, { sum: e.target.value })}
                              placeholder="0"
                            />
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="btn btn--sm"
                              type="button"
                              onClick={() => removeServiceRow(s.id)}
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="table_actions">
                  <button className="btn btn--sm" type="button" onClick={addServiceRow}>
                    + Добавить услугу
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Итого */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card_head">
              <div className="card_title">7. Итого</div>
            </div>
            <div className="card_body">
              <div className="form_grid">
                <div className="field">
                  <div className="label">Итоговая цена</div>
                  <input
                    type="number"
                    value={total.price}
                    onChange={(e) => setTotal({ price: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="page_actions" style={{ marginTop: 14 }}>
            <button className="btn btn--accent" type="button" onClick={saveExtra}>
              Сохранить данные {docType === "ttn" ? "ТТН" : "СМР"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
