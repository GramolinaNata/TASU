import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActs, subscribeActs, deleteAct } from "../../shared/storage/actsStorage.js";
import { downloadJson } from "../../shared/export/actExport.js";

export default function RequestsPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const apply = (list) => setItems(list.filter((a) => a.docType === "ttn"));
    apply(getActs());
    return subscribeActs(apply);
  }, []);
  return (
    <>
      <div className="navbar">
        <h1>Заявки (ТТН)</h1>
        <Link className="btn" to="/acts">
          Перейти к актам
        </Link>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Номер</th>
              <th>Дата</th>
              <th>Откуда</th>
              <th>Куда</th>
              <th>Заказчик</th>
              <th style={{ width: 170, textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted" style={{ padding: 16 }}>
                  Пока пусто. Открой акт и нажми “Сформировать ТТН”.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id}>
                  <td className="num">
                    <Link to={`/acts/${a.id}`}>{a.number}</Link>
                  </td>
                  <td>{a.date}</td>
                  <td>{a.route?.fromCity || "—"}</td>
                  <td>{a.route?.toCity || "—"}</td>
                  <td>{a.customer?.fio || "—"}</td>
                  <td
                    style={{
                      textAlign: "right",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      className="btn btn--sm"
                      type="button"
                      onClick={() => downloadJson(`ttn_${a.number.replace("#", "")}.json`, a)}
                    >
                      Экспорт
                    </button>

                    <button
                      className="btn btn--sm btn--danger"
                      type="button"
                      onClick={() => {
                        const ok = window.confirm(`Удалить ${a.number} из ТТН?`);
                        if (!ok) return;
                        deleteAct(a.id);
                      }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
