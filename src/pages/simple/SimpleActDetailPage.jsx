import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../shared/api/api.js";

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("ru");
}

export default function SimpleActDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [act, setAct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.requests.get(id).then(data => {
      let details = {};
      if (data.details) try { details = typeof data.details === "string" ? JSON.parse(data.details) : data.details; } catch(e) {}
      setAct({
        ...data,
        customer: details.customer || data.customer,
        receiver: details.receiver || data.receiver,
        route: details.route || data.route,
        cargoText: details.cargoText || data.cargoText || "",
        totals: details.totals || data.totals || {},
        totalSum: data.totalSum || details.totalSum || "",
        docNumber: details.docNumber || data.docNumber || data.id?.slice(0,8),
      });
    }).catch(e => {
      alert("Ошибка: " + e.message);
    }).finally(() => setLoading(false));
  }, [id]);

  const printLabel = async () => {
    if (!act) return;
    const qrData = `TASU-${act.docNumber}-${act.route?.toCity}-${act.receiver?.fio}`;
    const { toDataURL } = await import("qrcode");
    const qrUrl = await toDataURL(qrData, { width: 120, margin: 1 });

    const label = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @media print { body { margin: 0; } }
  body { font-family: Arial, sans-serif; margin: 0; padding: 8px; background: white; }
  .label { border: 2px solid #222; width: 320px; font-size: 12px; border-radius: 4px; overflow: hidden; }
  .header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 2px solid #222; background: #fff; }
  .logo img { height: 36px; }
  .address { font-size: 9px; text-align: right; color: #444; line-height: 1.6; }
  .cities { display: flex; border-bottom: 1px solid #222; }
  .city-from { flex: 1; padding: 6px 8px; border-right: 1px solid #222; background: #f9f9f9; }
  .city-to { flex: 2; padding: 6px 8px; background: #fff3cd; text-align: center; }
  .city-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
  .city-val { font-size: 11px; font-weight: 700; }
  .city-big { font-size: 26px; font-weight: 900; color: #333; }
  .info-row { display: flex; border-bottom: 1px solid #222; }
  .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #ddd; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-size: 9px; color: #888; margin-bottom: 2px; text-transform: uppercase; }
  .info-val { font-weight: 700; font-size: 13px; }
  .num-row { padding: 8px 10px; border-bottom: 1px solid #222; background: #222; color: #fff; font-size: 15px; font-weight: 900; text-align: center; letter-spacing: 3px; }
</style></head><body>
<div class="label">
  <div class="header">
    <div class="logo"><img src="https://tasu-test.vercel.app/images/logo.svg" alt="TASU"/></div>
    <div class="address">г. Алматы, ул. Закарпатская 162<br/>Т: 8(727)499-02-22</div>
  </div>
  <div class="cities">
    <div class="city-from">
      <div class="city-label">город отправителя</div>
      <div class="city-val">${act.route?.fromCity || "—"}</div>
    </div>
    <div class="city-to">
      <div class="city-label">город получателя</div>
      <div class="city-big">${act.route?.toCity || "—"}</div>
    </div>
  </div>
  <div class="info-row">
    <div class="info-cell"><div class="info-label">мест</div><div class="info-val">${act.totals?.seats || "—"}</div></div>
    <div class="info-cell"><div class="info-label">вес</div><div class="info-val">${act.totals?.weight ? act.totals.weight + " кг" : "—"}</div></div>
    <div class="info-cell"><div class="info-label">сумма</div><div class="info-val">${act.totalSum ? Number(act.totalSum).toLocaleString() + " тг" : "—"}</div></div>
  </div>
  <div class="num-row">№ ${act.docNumber}</div>
  <div style="padding:10px;border-bottom:1px solid #222;text-align:center;">
    <div style="font-size:9px;color:#888;text-transform:uppercase;margin-bottom:4px;">получатель</div>
    <div style="font-size:18px;font-weight:900;">${act.receiver?.fio?.split(" ")[0] || "—"}</div>
  </div>
  <div style="padding:12px;text-align:center;">
    <img src="${qrUrl}" alt="QR" style="width:100px;height:100px;display:block;margin:0 auto;"/>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    const blob = new Blob([label], { type: "text/html; charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  if (loading) return <div style={{ padding: 32 }}>Загрузка...</div>;
  if (!act) return <div style={{ padding: 32 }}>Накладная не найдена</div>;

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Накладная №{act.docNumber}</h1>
          <div className="chip" style={{ background: "#e6f7ff", borderColor: "#91caff", color: "#0050b3" }}>Упрощённый режим</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={printLabel}>🏷️ Печать наклейки</button>
          <button className="btn" onClick={() => navigate("/simple")}>← Назад</button>
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div className="card_head"><div className="card_title">Отправитель</div></div>
          <div className="card_body">
            <div className="field"><div className="label">ФИО</div><div>{act.customer?.fio || "—"}</div></div>
            <div className="field"><div className="label">Телефон</div><div>{act.customer?.phone || "—"}</div></div>
            <div className="field"><div className="label">Город</div><div>{act.route?.fromCity || "—"}</div></div>
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div className="card_head"><div className="card_title">Получатель</div></div>
          <div className="card_body">
            <div className="field"><div className="label">ФИО</div><div>{act.receiver?.fio || "—"}</div></div>
            <div className="field"><div className="label">Телефон</div><div>{act.receiver?.phone || "—"}</div></div>
            <div className="field"><div className="label">Город</div><div>{act.route?.toCity || "—"}</div></div>
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div className="card_head"><div className="card_title">Груз</div></div>
          <div className="card_body">
            <div className="field"><div className="label">Мест</div><div>{act.totals?.seats || "—"}</div></div>
            <div className="field"><div className="label">Вес</div><div>{act.totals?.weight ? `${act.totals.weight} кг` : "—"}</div></div>
            <div className="field"><div className="label">Характер груза</div><div>{act.cargoText || "—"}</div></div>
            <div className="field"><div className="label">Сумма</div><div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{act.totalSum ? `${Number(act.totalSum).toLocaleString()} тг` : "—"}</div></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_head"><div className="card_title">Информация</div></div>
        <div className="card_body">
          <div className="form_grid">
            <div className="field"><div className="label">Номер накладной</div><div>{act.docNumber || "—"}</div></div>
            <div className="field"><div className="label">Дата</div><div>{formatDate(act.createdAt || act.date)}</div></div>
            <div className="field"><div className="label">Статус</div><div>{act.status === "act" ? "В стоке" : act.status === "sent" ? "Подано" : act.status === "done" ? "Отработано" : act.status}</div></div>
          </div>
        </div>
      </div>
    </>
  );
}