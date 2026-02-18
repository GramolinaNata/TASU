import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/mockClient.js";

function formatDisplayDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function SmrPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await api.acts.list();
      setItems(list.filter(a => a.docType === "smr"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
        {loading && <div className="muted" style={{ padding: 12 }}>Загрузка...</div>}
        <table>
          <thead>
            <tr>
              <th>Номер</th>
              <th>Дата</th>
              <th>Страна, город (откуда)</th>
              <th>Страна, город (куда)</th>
              <th>Заказчик</th>
              <th style={{ width: 170, textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted" style={{ padding: 16 }}>
                  Пока пусто. Открой акт и нажми “Сформировать СМР”.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id}>
                  <td className="num">
                    <Link to={`/acts/${a.id}`}>{a.number}</Link>
                  </td>
                  <td>{formatDisplayDate(a.createdAt || a.date)}</td>
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

                     <Link
                       className="btn btn--sm"
                       to={`/acts/${a.id}/edit`}
                     >
                       Редактировать
                     </Link>

                     <button
                       className="btn btn--sm btn--danger"
                       type="button"
                       onClick={async () => {
                         const ok = window.confirm(`Удалить ${a.number} из СМР?`);
                         if (!ok) return;
                         await api.acts.update(a.id, { docType: null });
                         loadData();
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
