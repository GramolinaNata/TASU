import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("ru");
}

export default function SimpleActsListPage() {
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState(getSelectedCompany());
  const [selected, setSelected] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    return subscribeSelectedCompany(c => setCompany(c));
  }, []);

  useEffect(() => {
    if (!company) { setActs([]); setLoading(false); return; }
    load();
  }, [company]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.requests.list(company?.id);
      if (Array.isArray(list)) {
        const simple = list
          .filter(a => {
            let details = {};
            if (a.details) try { details = typeof a.details === "string" ? JSON.parse(a.details) : a.details; } catch(e) {}
            return a.type === "SIMPLE" || details.isSimple;
          })
          .map(a => {
            let details = {};
            if (a.details) try { details = typeof a.details === "string" ? JSON.parse(a.details) : a.details; } catch(e) {}
            return {
  ...a,
  customer: details.customer || a.customer,
  receiver: details.receiver || a.receiver,
  route: details.route || a.route,
  cargoText: details.cargoText || a.cargoText || "",
  totals: details.totals || a.totals || {},
  transportType: details.transportType || a.transportType,
  totalSum: a.totalSum || details.totalSum || "",
};
          });
        setActs(simple);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = acts.filter(a => {
    const s = search.trim().toLowerCase();
    const matchSearch = !s || [a.docNumber, a.number, a.customer?.fio, a.receiver?.fio, a.route?.toCity]
      .filter(Boolean).join(" ").toLowerCase().includes(s);
    let matchDate = true;
    if (dateFrom) matchDate = matchDate && new Date(a.createdAt || a.date) >= new Date(dateFrom);
    if (dateTo) matchDate = matchDate && new Date(a.createdAt || a.date) <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchDate;
  });

  const totalSeats = filtered.reduce((acc, a) => acc + (Number(a.totals?.seats) || 0), 0);
  const totalWeight = filtered.reduce((acc, a) => acc + (Number(a.totals?.weight) || 0), 0);
  const totalSum = filtered.reduce((acc, a) => acc + (Number(a.totalSum) || 0), 0);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(a => a.id));
  };

  const generateVedomost = async () => {
    const selectedActs = filtered.filter(a => selected.includes(a.id));
    if (selectedActs.length === 0) return alert("Выберите накладные");

    const totalS = selectedActs.reduce((acc, a) => acc + (Number(a.totals?.seats) || 0), 0);
    const totalW = selectedActs.reduce((acc, a) => acc + (Number(a.totals?.weight) || 0), 0);
    const totalSm = selectedActs.reduce((acc, a) => acc + (Number(a.totalSum) || 0), 0);

    const qrData = `TASU-${Date.now()}-${selectedActs.length}шт-${totalW}кг`;
    const { toDataURL } = await import("qrcode");
    const qrUrl = await toDataURL(qrData, { width: 120, margin: 1 });

    const rows = selectedActs.map((a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${a.docNumber || a.number || a.id?.slice(0,8) || "—"}</td>
        <td>${formatDate(a.createdAt || a.date)}</td>
        <td>${a.customer?.fio || "—"}<br/><small>${a.customer?.phone || ""}</small></td>
        <td>${a.receiver?.fio || "—"}<br/><small>${a.receiver?.phone || ""}</small></td>
        <td>${a.route?.toCity || "—"}</td>
        <td style="text-align:center">${a.totals?.seats || "—"}</td>
        <td style="text-align:center">${a.totals?.weight ? `${a.totals.weight} кг` : "—"}</td>
        <td>${a.cargoText || "—"}</td>
        <td style="text-align:right">${a.totalSum ? `${Number(a.totalSum).toLocaleString()} тг` : "—"}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Грузовая ведомость</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:20px;}
      h2{text-align:center;margin-bottom:4px;}
      .sub{text-align:center;color:#666;margin-bottom:20px;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;}
      table{width:100%;border-collapse:collapse;margin-top:10px;}
      th,td{border:1px solid #333;padding:5px 8px;font-size:11px;}
      th{background:#f0f0f0;font-weight:bold;text-align:center;}
      .totals{margin-top:16px;display:flex;gap:20px;font-weight:bold;flex-wrap:wrap;}
      .totals span{background:#f5f5f5;padding:6px 12px;border-radius:4px;border:1px solid #ddd;}
      .signatures{margin-top:40px;display:flex;justify-content:space-between;}
      .sig{flex:1;margin:0 20px;}
      .sig-line{border-bottom:1px solid #333;margin-top:30px;margin-bottom:4px;}
    </style></head><body>
    <div class="header">
      <div>
        <h2>ГРУЗОВАЯ ВЕДОМОСТЬ</h2>
        <div class="sub">${company?.name || ""} | Дата: ${new Date().toLocaleDateString("ru")} | Накладных: ${selectedActs.length}</div>
      </div>
      <img src="${qrUrl}" width="120" height="120"/>
    </div>
    <table><thead><tr>
      <th>№</th><th>Накладная</th><th>Дата</th><th>Отправитель</th>
      <th>Получатель</th><th>Город</th><th>Мест</th><th>Вес</th><th>Груз</th><th>Сумма</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <span>Накладных: ${selectedActs.length}</span>
      <span>Мест: ${totalS}</span>
      <span>Вес: ${totalW} кг</span>
      <span>Сумма: ${totalSm.toLocaleString()} тг</span>
    </div>
    <div class="signatures">
      <div class="sig"><div class="sig-line"></div><div>Перевозчик (подпись, М.П.)</div></div>
      <div class="sig"><div class="sig-line"></div><div>Отправитель (подпись, М.П.)</div></div>
      <div class="sig"><div class="sig-line"></div><div>Получатель (подпись, М.П.)</div></div>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Накладные</h1>
          <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
          {company && <div className="chip">{company.name}</div>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {selected.length > 0 && (
            <button className="btn btn--accent" onClick={generateVedomost}>
              📋 Грузовая ведомость ({selected.length})
            </button>
          )}
          <Link className="btn btn--accent" to="/simple/new">+ Новая накладная</Link>
        </div>
      </div>

      <div className="filter" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ minWidth: 200, flex: 1 }}>
          <div className="label">Поиск</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Номер, отправитель, город..." />
        </div>
        <div className="field" style={{ width: 160 }}>
          <div className="label">Дата с</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="field" style={{ width: 160 }}>
          <div className="label">Дата по</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
          Накладных: <strong>{filtered.length}</strong>
        </div>
        <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
          Мест: <strong>{totalSeats}</strong>
        </div>
        <div style={{ padding: "8px 16px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line)", fontSize: "0.9rem" }}>
          Вес: <strong>{totalWeight} кг</strong>
        </div>
        <div style={{ padding: "8px 16px", background: "#fff2e8", borderRadius: 8, border: "1px solid #ffbb96", fontSize: "0.9rem", color: "#d4380d" }}>
          Сумма: <strong>{totalSum.toLocaleString()} тг</strong>
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                <th style={{ width: 120 }}>Номер</th>
                <th style={{ width: 100 }}>Дата</th>
                <th>Отправитель</th>
                <th>Получатель</th>
                <th>Город</th>
                <th style={{ width: 70 }}>Мест</th>
                <th style={{ width: 90 }}>Вес</th>
                <th style={{ width: 120 }}>Сумма</th>
                <th>Груз</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="muted" style={{ padding: 16 }}>
                  {company ? "Накладных пока нет." : "Выберите компанию."}
                </td></tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.id} style={{ background: selected.includes(a.id) ? "rgba(24,144,255,0.06)" : "" }}>
                    <td style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} />
                    </td>
                    <td className="num">
                      <Link to={`/simple/${a.id}`}>{a.docNumber || a.number || a.id?.slice(0, 8)}</Link>
                    </td>
                    <td>{formatDate(a.createdAt || a.date)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.customer?.fio || "—"}</div>
                      {a.customer?.phone && <div className="muted" style={{ fontSize: "0.8rem" }}>{a.customer.phone}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.receiver?.fio || "—"}</div>
                      {a.receiver?.phone && <div className="muted" style={{ fontSize: "0.8rem" }}>{a.receiver.phone}</div>}
                    </td>
                    <td>{a.route?.toCity || "—"}</td>
                    <td style={{ textAlign: "center" }}>{a.totals?.seats || "—"}</td>
                    <td style={{ textAlign: "center" }}>{a.totals?.weight ? `${a.totals.weight} кг` : "—"}</td>
                    <td style={{ fontWeight: 700 }}>{a.totalSum ? `${Number(a.totalSum).toLocaleString()} тг` : "—"}</td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{a.cargoText || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}