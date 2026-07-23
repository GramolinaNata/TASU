import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany } from "../../shared/storage/companyStorage.js";
import { printCarrierVedomost as printCarrierDoc } from "../../shared/print/vedomostPrint.js";

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

      // Накладные партии. Если бэк не вернул вложенный requests —
      // подтягиваем сами по requestIds (иначе вес/места/накладные не отобразятся).
      let reqs = Array.isArray(data?.requests) ? data.requests : [];
      if (reqs.length === 0 && data?.requestIds) {
        let ids = [];
        try { ids = JSON.parse(data.requestIds || "[]"); } catch (e) { ids = []; }
        if (ids.length > 0) {
          reqs = await Promise.all(
            ids.map(rid => api.requests.get(rid).catch(() => null))
          );
          reqs = reqs.filter(Boolean);
        }
      }

      // Парсим details у накладных
      const parsed = reqs.map((r) => {
        let details = {};
        try {
          details = typeof r.details === "string" ? JSON.parse(r.details) : (r.details || {});
        } catch (e) {
          details = {};
        }
        return { ...r, details };
      });

      setBatch({ ...(data || {}), requests: parsed });
    } catch (e) {
      console.error("Ошибка загрузки партии:", e);
    } finally {
      setLoading(false);
    }
  };

  const printCarrierVedomost = async () => {
    if (!batch || !batch.carrierVedomostId) {
      alert("По этой партии ещё не создана ведомость перевозчика.");
      return;
    }
    let ved = null;
    try {
      const list = await api.carrierVedomosts.list(company?.id);
      ved = (list || []).find(v => String(v.id) === String(batch.carrierVedomostId));
    } catch (e) {
      alert("Не удалось загрузить ведомость перевозчика: " + (e.message || e));
      return;
    }
    if (!ved) { alert("Ведомость перевозчика не найдена."); return; }
    let snap = {};
    try { snap = typeof ved.data === "string" ? JSON.parse(ved.data) : (ved.data || {}); } catch { snap = {}; }
    const snapRows = Array.isArray(snap.rows) ? snap.rows : [];
    const my = snapRows.find(r => String(r.batchId) === String(batch.id)) || snapRows[0] || {};

    const carrierRate = Number(my.carrierRate) || 0;
    const representativeRate = Number(snap.representativeRate) || 0;
    // Вес партии считаем из накладных (как грузовая); fallback — из снапшота.
    const requests = Array.isArray(batch.requests) ? batch.requests : [];
    let weight = requests.reduce((acc, req) => acc + (Number((req.details || {}).totals?.weight) || 0), 0);
    if (!weight) weight = Number(my.weight) || 0;
    const carrierSum = Math.round(weight * carrierRate);
    const representativeSum = Math.round(weight * representativeRate);

    // По эталону: одна партия → одна строка-партия.
    printCarrierDoc({
      companyName: company?.name || "",
      vedomostNumber: ved.number || "",
      rows: [{
        number: batch.number || "—",
        city: batch.city || "—",
        weight,
        carrierName: my.carrierName || "—",
        carrierRate,
        carrierSum,
        representativeName: my.representativeName || "—",
      }],
      totals: { totalWeight: weight, carrierSum, representativeRate, representativeSum },
    });
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
        <div style={{ display: "flex", gap: 8 }}>
          {batch.carrierVedomostId && (
            <button className="btn btn--accent" onClick={printCarrierVedomost}>
              🚚 Ведомость перевозчика
            </button>
          )}
        </div>
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