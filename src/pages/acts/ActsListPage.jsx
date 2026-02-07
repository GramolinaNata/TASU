import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getActs, subscribeActs, deleteAct } from "../../shared/storage/actsStorage.js";
import { downloadJson } from "../../shared/export/actExport.js";

export default function ActsListPage() {
  const [q, setQ] = useState("");
  const [acts, setActs] = useState([]);

  useEffect(() => {
    setActs(getActs());
    return subscribeActs((list) => setActs(list));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return acts;

    return acts.filter((a) => {
      const hay = [a.number, a.date, a.customer?.fio, a.route?.fromCity, a.route?.toCity]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(s);
    });
  }, [acts, q]);

  return (
    <>
      <div className="navbar">
        <h1>Акты</h1>
        <Link className="btn btn--accent" to="/acts/new">
          + Создать акт
        </Link>
      </div>

      <div className="filter" style={{ marginTop: 16 }}>
        <div className="field" style={{ minWidth: 340 }}>
          <div className="label">Поиск</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Номер, ФИО, город..."
          />
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Номер</th>
              <th>Дата</th>
              <th>Откуда</th>
              <th>Куда</th>
              <th>Статус</th>
              <th style={{ width: 140, textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted" style={{ padding: 16 }}>
                  Пусто. Создай первый акт.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id}>
                  <td className="num">
                    <Link to={`/acts/${a.id}`}>{a.number}</Link>
                  </td>
                  <td>{a.date}</td>
                  <td>{a.route?.fromCity || "—"}</td>
                  <td>{a.route?.toCity || "—"}</td>
                  <td>
                    {a.docType === "ttn" ? (
                      <span className="badge badge--ttn">ТТН</span>
                    ) : a.docType === "smr" ? (
                      <span className="badge badge--smr">СМР</span>
                    ) : (
                      <span className="badge badge--draft">Черновик</span>
                    )}
                  </td>
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
                      onClick={() => downloadJson(`act_${a.number.replace("#", "")}.json`, a)}
                    >
                      Экспорт
                    </button>

                    <button
                      className="btn btn--sm btn--danger"
                      type="button"
                      onClick={() => {
                        const ok = window.confirm(`Удалить акт ${a.number}?`);
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
