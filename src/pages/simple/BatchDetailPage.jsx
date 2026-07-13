import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany } from "../../shared/storage/companyStorage.js";

// Достаём сумму перевозки из накладной (юр: из услуг; частные: автоподсчёт).
// Пробуем несколько мест, приводим к числу. Нет суммы → null (покажем «—»).
function getRequestSum(req) {
  const candidates = [req?.details?.totalSum, req?.totalSum];
  for (const c of candidates) {
    if (c === 0 || c === "0") return 0;
    const n = parseFloat(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export default function BatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    setCompany(getSelectedCompany());
    loadBatch();
  }, [id]);

  const loadBatch = async () => {
    setLoading(true);
    try {
      const data = await api.batches.get(id);
      // Парсим details у вложенных накладных
      if (data && Array.isArray(data.requests)) {
        data.requests = data.requests.map((r) => {
          let details = {};
          try {
            details = typeof r.details === "string" ? JSON.parse(r.details) : (r.details || {});
          } catch (e) {
            details = {};
          }
          return { ...r, details };
        });
      }
      setBatch(data);
    } catch (e) {
      console.error("Ошибка загрузки партии:", e);
    } finally {
      setLoading(false);
    }
  };

  const printVedomost = () => {
    if (!batch) return;

    const requests = Array.isArray(batch.requests) ? batch.requests : [];
    const companyName = company?.name || "";
    const logoSrc = company?.logo || "";

    let totalSeats = 0;
    let totalWeight = 0;
    let totalSum = 0;
    let hasAnySum = false;

    const rows = requests.map((req, i) => {
      const d = req.details || {};
      const receiver = d.receiver || {};
      const route = d.route || {};
      const totals = d.totals || {};
      const docNum = d.docNumber || req.docNumber || req.number || "—";
      const receiverName = receiver.fio || receiver.companyName || "—";
      const receiverPhone = receiver.phone || "—";
      const seats = Number(totals.seats) || 0;
      const weight = Number(totals.weight) || 0;
      const city = route.toCity || "—";

      const sum = getRequestSum(req);
      if (sum !== null) {
        totalSum += sum;
        hasAnySum = true;
      }

      totalSeats += seats;
      totalWeight += weight;

      const sumCell = sum !== null ? sum.toLocaleString() + " ₸" : "—";

      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${docNum}</strong></td>
        <td>${receiverName}</td>
        <td>${receiverPhone}</td>
        <td style="text-align:center">${seats || "—"}</td>
        <td style="text-align:center">${weight ? weight + " кг" : "—"}</td>
        <td>${city}</td>
        <td style="text-align:right; font-weight:700">${sumCell}</td>
      </tr>`;
    }).join("");

    const totalSumCell = hasAnySum ? totalSum.toLocaleString() + " ₸" : "—";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Грузовая ведомость № ${batch.number || ""}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: Arial, sans-serif; margin: 0; color: #111; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 14px; }
  .logo img { max-height: 54px; max-width: 160px; object-fit: contain; }
  .logo-text { font-weight: 900; font-size: 22px; border: 2px solid #222; border-radius: 6px; padding: 4px 12px; }
  .title { text-align: center; flex: 1; }
  .title h1 { margin: 0; font-size: 20px; }
  .title .sub { font-size: 13px; color: #555; margin-top: 4px; }
  .meta { display: flex; gap: 24px; font-size: 13px; margin-bottom: 12px; }
  .meta b { color: #000; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #333; padding: 6px 8px; }
  th { background: #f0f0f0; text-align: left; }
  tfoot td { font-weight: 900; background: #f7f7f7; }
  .sign { display: flex; justify-content: space-between; margin-top: 40px; font-size: 13px; }
  .sign .box { width: 45%; }
  .sign .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; text-align: center; color: #555; }
</style></head><body>
  <div class="head">
    <div class="logo">${logoSrc ? `<img src="${logoSrc}" alt="logo"/>` : `<div class="logo-text">${companyName || "TASU"}</div>`}</div>
    <div class="title">
      <h1>ГРУЗОВАЯ ВЕДОМОСТЬ № ${batch.number || ""}</h1>
      <div class="sub">${companyName}</div>
    </div>
    <div style="width:160px"></div>
  </div>

  <div class="meta">
    <div><b>Город:</b> ${batch.city || "—"}</div>
    <div><b>Водитель:</b> ${batch.driver || "—"}</div>
    <div><b>Дата:</b> ${new Date(batch.createdAt || Date.now()).toLocaleDateString("ru-RU")}</div>
    <div><b>Накладных:</b> ${requests.length}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px">№</th>
        <th>Номер накладной</th>
        <th>Получатель</th>
        <th>Телефон</th>
        <th style="width:60px">Мест</th>
        <th style="width:80px">Вес</th>
        <th>Город</th>
        <th style="width:120px; text-align:right">Сумма перевозки</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:right">ИТОГО:</td>
        <td style="text-align:center">${totalSeats || "—"}</td>
        <td style="text-align:center">${totalWeight ? totalWeight + " кг" : "—"}</td>
        <td></td>
        <td style="text-align:right">${totalSumCell}</td>
      </tr>
    </tfoot>
  </table>

  <div class="sign">
    <div class="box"><div class="line">Выдал (Ф.И.О., подпись)</div></div>
    <div class="box"><div class="line">Принял представитель (Ф.И.О., подпись)</div></div>
  </div>

  <script>window.onload = function(){ window.print(); }</script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Загрузка партии...</div>;
  }

  if (!batch) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p>Партия не найдена</p>
        <button className="btn" onClick={() => navigate("/simple/batches")}>← К списку партий</button>
      </div>
    );
  }

  const requests = Array.isArray(batch.requests) ? batch.requests : [];

  // Итоги для экранной таблицы
  let screenSeats = 0;
  let screenWeight = 0;
  let screenSum = 0;
  let screenHasSum = false;
  requests.forEach((req) => {
    const totals = req.details?.totals || {};
    screenSeats += Number(totals.seats) || 0;
    screenWeight += Number(totals.weight) || 0;
    const s = getRequestSum(req);
    if (s !== null) { screenSum += s; screenHasSum = true; }
  });

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn" onClick={() => navigate("/simple/batches")}>← Назад</button>
          <h1 style={{ margin: 0 }}>Партия № {batch.number}</h1>
          {batch.isFormed && (
            <span className="chip" style={{ background: "#f6ffed", borderColor: "#b7eb8f", color: "#389e0d" }}>
              Сформирована
            </span>
          )}
        </div>
        <button className="btn btn--accent" onClick={printVedomost}>
          🖨 Печать грузовой ведомости
        </button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head"><div className="card_title">Информация о партии</div></div>
        <div className="card_body">
          <div className="form_grid">
            <div className="field">
              <div className="label">Город</div>
              <div style={{ fontWeight: 600 }}>{batch.city || "—"}</div>
            </div>
            <div className="field">
              <div className="label">Водитель</div>
              <div style={{ fontWeight: 600 }}>{batch.driver || "—"}</div>
            </div>
            <div className="field">
              <div className="label">Накладных</div>
              <div style={{ fontWeight: 600 }}>{requests.length}</div>
            </div>
            <div className="field">
              <div className="label">Общий вес</div>
              <div style={{ fontWeight: 600 }}>{screenWeight} кг</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head">
          <div className="card_title">Накладные в партии ({requests.length})</div>
        </div>
        <div className="card_body">
          <div className="table_wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>№</th>
                  <th>Номер накладной</th>
                  <th>Получатель</th>
                  <th>Телефон</th>
                  <th style={{ width: 70 }}>Мест</th>
                  <th style={{ width: 90 }}>Вес</th>
                  <th>Город</th>
                  <th style={{ width: 130, textAlign: "right" }}>Сумма перевозки</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td colSpan={8} className="muted" style={{ padding: 16, textAlign: "center" }}>Накладных нет</td></tr>
                ) : (
                  requests.map((req, i) => {
                    const d = req.details || {};
                    const receiver = d.receiver || {};
                    const route = d.route || {};
                    const totals = d.totals || {};
                    const sum = getRequestSum(req);
                    return (
                      <tr key={req.id || i}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{d.docNumber || req.docNumber || req.number || "—"}</td>
                        <td>{receiver.fio || receiver.companyName || "—"}</td>
                        <td>{receiver.phone || "—"}</td>
                        <td style={{ textAlign: "center" }}>{Number(totals.seats) || "—"}</td>
                        <td style={{ textAlign: "center" }}>{Number(totals.weight) ? Number(totals.weight) + " кг" : "—"}</td>
                        <td>{route.toCity || "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {sum !== null ? sum.toLocaleString() + " ₸" : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {requests.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700, background: "#fafafa" }}>
                    <td colSpan={4} style={{ textAlign: "right" }}>ИТОГО:</td>
                    <td style={{ textAlign: "center" }}>{screenSeats || "—"}</td>
                    <td style={{ textAlign: "center" }}>{screenWeight ? screenWeight + " кг" : "—"}</td>
                    <td></td>
                    <td style={{ textAlign: "right" }}>{screenHasSum ? screenSum.toLocaleString() + " ₸" : "—"}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </>
  );
}