import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("ru");
}

export default function BatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(getSelectedCompany());

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      // 1. Загружаем партию
      const b = await api.batches.get(id);
      setBatch(b);

      // 2. Парсим список ID накладных
      let requestIds = [];
      try { requestIds = JSON.parse(b.requestIds || "[]"); } catch (e) {}

      // 3. Загружаем каждую накладную (параллельно)
      if (requestIds.length > 0) {
        const reqs = await Promise.all(
          requestIds.map(reqId => api.requests.get(reqId).catch(() => null))
        );
        setRequests(reqs.filter(Boolean));
      } else {
        setRequests([]);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка загрузки партии: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const printVedomost = async () => {
    if (!batch) return;
    let requestIds = [];
    try { requestIds = JSON.parse(batch.requestIds); } catch (e) {}

    const { toDataURL } = await import("qrcode");
    const qrUrl = await toDataURL(`TASU-BATCH-${batch.number}`, { width: 100, margin: 1 });

    const totalSeats = batch.totalSeats || 0;
    const totalWeight = batch.totalWeight || 0;

    // Список накладных для печати
    const requestsRows = requests.map((r, i) => {
      let details = {};
      try { details = JSON.parse(r.details || "{}"); } catch (e) {}
      const recv = details.receiver || {};
      const route = details.route || {};
      const totals = details.totals || {};
      return `<tr>
        <td>${i + 1}</td>
        <td>${r.docNumber || details.docNumber || r.id || "—"}</td>
        <td>${recv.fio || "—"}</td>
        <td>${route.toCity || "—"}</td>
        <td style="text-align:center">${totals.seats || "—"}</td>
        <td style="text-align:center">${totals.weight ? totals.weight + " кг" : "—"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Партия ${batch.number}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
      h2 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #000; }
      .formed-badge { display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 4px; font-size: 11px; font-weight: 700; margin-top: 4px; }
      .info { display: flex; gap: 0; border: 1px solid #aaa; margin-bottom: 16px; flex-wrap: wrap; }
      .info-cell { flex: 1; min-width: 140px; padding: 8px 12px; border-right: 1px solid #aaa; font-size: 11px; }
      .info-cell:last-child { border-right: none; }
      .info-label { color: #666; font-size: 10px; margin-bottom: 2px; }
      .info-val { font-weight: 700; font-size: 13px; }
      .totals { display: flex; gap: 12px; margin: 16px 0; }
      .total-card { flex: 1; padding: 12px; background: #f3f4f6; border-radius: 6px; text-align: center; }
      .total-card .num { font-size: 22px; font-weight: 900; color: #1f2937; }
      .total-card .lbl { font-size: 11px; color: #6b7280; margin-top: 4px; }
      table.requests { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
      table.requests th, table.requests td { border: 1px solid #aaa; padding: 5px 8px; text-align: left; }
      table.requests th { background: #f3f4f6; font-weight: 700; }
      .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 30px; }
      .sig { flex: 1; }
      .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 28px; }
      .sig-label { font-size: 10px; color: #333; text-align: center; }
    </style></head><body>
    <div class="header">
      <div>
        <h2>Партия № ${batch.number}</h2>
        <div style="color:#333;font-size:11px;margin-top:4px;">${company?.name || ""} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")} &nbsp;&nbsp; Город: ${batch.city}</div>
        ${batch.isFormed ? '<div class="formed-badge">✓ СФОРМИРОВАНА ' + (batch.formedAt ? new Date(batch.formedAt).toLocaleDateString("ru") : '') + '</div>' : ''}
      </div>
      <img src="${qrUrl}" width="90" height="90" style="border:1px solid #ccc;padding:3px;"/>
    </div>
    <div class="info">
      <div class="info-cell"><div class="info-label">Водитель</div><div class="info-val">${batch.driverName || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Телефон водителя</div><div class="info-val">${batch.driverPhone || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Номер авто</div><div class="info-val">${batch.carNumber || "—"}</div></div>
      <div class="info-cell"><div class="info-label">Стоимость перевозки</div><div class="info-val">${batch.deliveryCost ? Number(batch.deliveryCost).toLocaleString() + " тг" : "—"}</div></div>
    </div>
    <div class="totals">
      <div class="total-card"><div class="num">${requestIds.length}</div><div class="lbl">Накладных</div></div>
      <div class="total-card"><div class="num">${totalSeats}</div><div class="lbl">Мест всего</div></div>
      <div class="total-card"><div class="num">${Number(totalWeight).toLocaleString()} кг</div><div class="lbl">Общий вес</div></div>
    </div>
    ${requestsRows ? `<table class="requests">
      <thead><tr><th style="width:30px">№</th><th>Номер накладной</th><th>Получатель</th><th>Город</th><th style="width:60px;text-align:center">Мест</th><th style="width:90px;text-align:center">Вес</th></tr></thead>
      <tbody>${requestsRows}</tbody>
    </table>` : '<div style="color:#888;font-style:italic;margin-top:16px;">В партии нет накладных</div>'}
    <div class="signatures">
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Перевозчик (подпись, М.П.)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Отправитель (подпись, М.П.)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Получатель (подпись, М.П.)</div></div>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  if (loading) return <Loader />;
  if (!batch) return <div style={{ padding: 20 }}>Партия не найдена. <button className="btn" onClick={() => navigate("/simple/batches")}>← Назад</button></div>;

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn" onClick={() => navigate("/simple/batches")}>← Назад</button>
          <h1 style={{ margin: 0 }}>Партия № {batch.number}</h1>
          {batch.isFormed && (
            <div className="chip" style={{ background: "#d1fae5", borderColor: "#86efac", color: "#065f46" }}>
              ✓ Сформирована {formatDate(batch.formedAt)}
            </div>
          )}
        </div>
        <button className="btn btn--accent" onClick={printVedomost}>
          🖨 Печать ведомости
        </button>
      </div>

      {/* Основная информация */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head"><div className="card_title">Основная информация</div></div>
        <div className="card_body">
          <div className="form_grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>Город назначения</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{batch.city || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>Дата создания</div>
              <div style={{ fontWeight: 700 }}>{formatDate(batch.createdAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>Стоимость перевозки</div>
              <div style={{ fontWeight: 700 }}>{batch.deliveryCost ? `${Number(batch.deliveryCost).toLocaleString()} тг` : "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Водитель */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head"><div className="card_title">Водитель и транспорт</div></div>
        <div className="card_body">
          <div className="form_grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>ФИО водителя</div>
              <div style={{ fontWeight: 700 }}>{batch.driverName || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>Телефон</div>
              <div style={{ fontWeight: 700 }}>{batch.driverPhone || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>Номер авто</div>
              <div style={{ fontWeight: 700 }}>{batch.carNumber || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Итоги */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
        <div style={{ padding: 16, background: "#f3f4f6", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#1f2937" }}>{requests.length}</div>
          <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4 }}>Накладных в партии</div>
        </div>
        <div style={{ padding: 16, background: "#f3f4f6", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#1f2937" }}>{batch.totalSeats || 0}</div>
          <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4 }}>Мест всего</div>
        </div>
        <div style={{ padding: 16, background: "#f3f4f6", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#1f2937" }}>{batch.totalWeight ? `${Number(batch.totalWeight).toLocaleString()} кг` : "0"}</div>
          <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4 }}>Общий вес</div>
        </div>
      </div>

      {/* Список накладных */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head">
          <div className="card_title">Накладные в партии ({requests.length})</div>
        </div>
        <div className="card_body" style={{ padding: 0 }}>
          {requests.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#888", fontStyle: "italic" }}>
              В этой партии пока нет накладных
            </div>
          ) : (
            <table className="table_fixed">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>№</th>
                  <th style={{ width: 140 }}>Номер</th>
                  <th>Получатель</th>
                  <th>Город</th>
                  <th style={{ width: 80, textAlign: "center" }}>Мест</th>
                  <th style={{ width: 100, textAlign: "center" }}>Вес</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r, i) => {
                  let details = {};
                  try { details = JSON.parse(r.details || "{}"); } catch (e) {}
                  const recv = details.receiver || {};
                  const route = details.route || {};
                  const totals = details.totals || {};
                  return (
                    <tr
                      key={r.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/simple/${r.id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f0f9ff"}
                      onMouseLeave={(e) => e.currentTarget.style.background = ""}
                    >
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{r.docNumber || details.docNumber || "—"}</td>
                      <td>{recv.fio || "—"}</td>
                      <td>{route.toCity || "—"}</td>
                      <td style={{ textAlign: "center" }}>{totals.seats || "—"}</td>
                      <td style={{ textAlign: "center" }}>{totals.weight ? `${totals.weight} кг` : "—"}</td>
                      <td>
                        <button
                          className="btn btn--sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/simple/${r.id}`); }}
                          style={{ fontSize: 11 }}
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}