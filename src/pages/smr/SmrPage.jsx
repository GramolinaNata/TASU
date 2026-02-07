import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActs, subscribeActs } from "../../shared/storage/actsStorage.js";

export default function SmrPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const apply = (list) => setItems(list.filter((a) => a.docType === "smr"));
    apply(getActs());
    return subscribeActs(apply);
  }, []);

  return (
    <>
      <div className="navbar">
        <h1>СМР</h1>
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
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted" style={{ padding: 16 }}>
                  Пока пусто. Открой акт и нажми “Сформировать СМР”.
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
