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
      const b = await api.batches.get(id);
      setBatch(b);

      let requestIds = [];
      try { requestIds = JSON.parse(b.requestIds || "[]"); } catch (e) {}

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

  // Грузовая ведомость (без суммы) — по образцу бумажной формы.
  // Колонки: № | Номер накладной | Получатель | Номер телефона | Мест | Вес | Город
  const printVedomost = async () => {
    if (!batch) return;

    const { toDataURL } = await import("qrcode");
    const qrUrl = await toDataURL(`TASU-BATCH-${batch.number}`, { width: 100, margin: 1 });

    const rows = requests.map((r, i) => {
      let details = {};
      try { details = JSON.parse(r.details || "{}"); } catch (e) {}
      const recv = details.receiver || {};
      const route = details.route || {};
      const totals = details.totals || {};
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${r.docNumber || details.docNumber || r.id || "—"}</td>
        <td>${recv.fio || "—"}</td>
        <td>${recv.phone || "—"}</td>
        <td style="text-align:center">${totals.seats || "—"}</td>
        <td style="text-align:center">${totals.weight ? totals.weight + " кг" : "—"}</td>
        <td>${route.toCity || batch.city || "—"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Грузовая ведомость ${batch.number}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #000; }
      h2 { margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; }
      .sub { color: #333; font-size: 11px; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
      th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
      th { background: #f3f4f6; font-weight: 700; text-align: center; }
      .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
      .sig { flex: 1; }
      .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 28px; }
      .sig-label { font-size: 10px; color: #333; text-align: center; }
    </style></head><body>
    <div class="header">
      <div>
        <h2>Грузовая ведомость</h2>
        <div class="sub">${company?.name || ""} &nbsp;&nbsp; Партия № ${batch.number} &nbsp;&nbsp; Город: ${batch.city || "—"} &nbsp;&nbsp; Дата: ${new Date().toLocaleDateString("ru")}</div>
      </div>
      <img src="${qrUrl}" width="80" height="80" style="border:1px solid #ccc;padding:3px;"/>
    </div>
    ${rows ? `<table>
      <thead>
        <tr>
          <th style="width:30px">№</th>
          <th>Номер накладной</th>
          <th>Получатель</th>
          <th>Номер телефона</th>
          <th style="width:60px">Мест</th>
          <th style="width:90px">Вес</th>
          <th>Город</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` : '<div style="color:#888;font-style:italic;margin-top:16px;">В партии нет накладных</div>'}
    <div class="signatures">
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Выдал (ФИО, подпись)</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-label">Принял (ФИО, подпись)</div></div>
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