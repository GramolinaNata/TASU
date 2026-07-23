import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { getSelectedCompany, subscribeSelectedCompany } from "../../shared/storage/companyStorage.js";
import Loader from "../../shared/components/Loader";

function cleanCityName(city) {
  return (city || "")
    .replace(/__PRIVATE$/, "")
    .replace(/__LOADERS$/, "")
    .replace(/__CARRIERS$/, "")
    .replace(/__REPRESENTATIVES$/, "")
    .trim()
    .toLowerCase();
}

function getTariffCategory(t) {
  const wr = t.weightRanges || {};
  return wr._category || (t.isPrivate ? "private" : "legal");
}

function toNum(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

// Ставка грузчика на человека, по весовым планкам тарифа (та же логика, что в ActCreatePage)
function findLoaderPricePerPerson(tariff, weight) {
  const wr = tariff.weightRanges || {};
  let price = 0;
  if (weight <= 10) price = toNum(wr.r10);
  else if (weight <= 20) price = toNum(wr.r20);
  else if (weight <= 30) price = toNum(wr.r30);
  else if (weight <= 80) price = toNum(wr.r80);
  else if (weight <= 150) price = toNum(wr.r150);
  else if (weight <= 300) price = toNum(wr.r300);
  else price = toNum(wr.r600);

  if (price <= 0) {
    price =
      toNum(wr.r10) || toNum(wr.r20) || toNum(wr.r30) ||
      toNum(wr.r80) || toNum(wr.r150) || toNum(wr.r300) || toNum(wr.r600);
  }
  return price;
}

import { useAuth } from "../../shared/auth/AuthContext";
import { printCarrierVedomost as printCarrierDoc } from "../../shared/print/vedomostPrint.js";

export default function CarrierVedomostCreatePage() {
  const nav = useNavigate();
  const { isManager } = useAuth();
  const [searchParams] = useSearchParams();
  const [company, setCompany] = useState(getSelectedCompany());
  const [batches, setBatches] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [representatives, setRepresentatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState({});
  const [batchWeights, setBatchWeights] = useState({}); // реальный вес партии из накладных
  // Оверрайды перевозчика/представителя по партии (id из справочника).
  // undefined => берём из партии (b.carrierId / b.representativeId).
  const [rowCarrier, setRowCarrier] = useState({});
  const [rowRep, setRowRep] = useState({});
  const [saving, setSaving] = useState(false);
  // ТЗ: после формирования остаёмся на странице и даём распечатать
  const [createdVedomost, setCreatedVedomost] = useState(null);

  // ТЗ: суммы перевозчику/грузчикам/представителю — не для менеджеров
  if (isManager) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card_body" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Доступ ограничен</div>
          <div className="muted">Ведомость перевозчика доступна только администратору и бухгалтеру.</div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    return subscribeSelectedCompany(c => setCompany(c));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [batchList, tariffList, carrierList, repList] = await Promise.all([
        api.batches.list(company?.id),
        api.tariffs.list(),
        api.carriers.list().catch(() => []),
        api.representatives.list().catch(() => []),
      ]);
      // ТЗ: ведомость перевозчика — только из УЖЕ сформированных партий,
      // которые ещё не входят ни в одну другую ведомость перевозчика
      const eligible = (Array.isArray(batchList) ? batchList : []).filter(
        b => b.isFormed && !b.carrierVedomostId
      );
      setBatches(eligible);
      setTariffs(Array.isArray(tariffList) ? tariffList : []);
      setCarriers(Array.isArray(carrierList) ? carrierList : []);
      setRepresentatives(Array.isArray(repList) ? repList : []);

      // Предвыбор партий, переданных из BatchesPage галочками
      const idsParam = searchParams.get('ids');
      if (idsParam) {
        const preselected = {};
        idsParam.split(',').forEach(id => { preselected[id] = true; });
        setSelectedIds(preselected);
      }
    } catch (e) {
      console.error(e);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company) load();
    else { setBatches([]); setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  // Реальный вес партии считаем из накладных (как грузовая ведомость): поле
  // totalWeight у партии часто не заполнено. Грузим накладные по requestIds и суммируем.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all((batches || []).map(async (b) => {
        let ids = [];
        try { ids = JSON.parse(b.requestIds || "[]"); } catch { /* ignore */ }
        if (!ids.length) return [b.id, toNum(b.totalWeight)];
        const reqs = await Promise.all(ids.map(id => api.requests.get(id).catch(() => null)));
        let w = 0;
        reqs.filter(Boolean).forEach(r => {
          let d = {};
          try { d = JSON.parse(r.details || "{}"); } catch { /* ignore */ }
          w += Number(d && d.totals ? d.totals.weight : 0) || 0;
        });
        return [b.id, w];
      }));
      if (!cancelled) setBatchWeights(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [batches]);

  const findCarrierTariff = (city) => {
    const cityClean = cleanCityName(city);
    return tariffs.find(t => getTariffCategory(t) === 'carriers' && cleanCityName(t.city) === cityClean);
  };

  const findLoaderTariff = (city) => {
    const cityClean = cleanCityName(city);
    return tariffs.find(t => getTariffCategory(t) === 'loaders' && cleanCityName(t.city) === cityClean);
  };

  // Ставка представителя — из тарифов (вкладка «Представители», pricePerKg по городу).
  const findRepresentativeTariff = (city) => {
    const cityClean = cleanCityName(city);
    return tariffs.find(t => getTariffCategory(t) === 'representatives' && cleanCityName(t.city) === cityClean);
  };

  const toggleBatch = (id) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedBatches = useMemo(
    () => batches.filter(b => selectedIds[b.id]),
    [batches, selectedIds]
  );

  // Разбивка по каждой выбранной партии + итоги — единая точка расчёта
  const breakdown = useMemo(() => {
    const rows = selectedBatches.map(b => {
      // Вес из накладных (batchWeights); fallback на поле партии, пока грузится.
      const weight = batchWeights[b.id] != null ? batchWeights[b.id] : toNum(b.totalWeight);

      // Перевозчик: оверрайд из формы, иначе назначенный в партии. Имя — вживую из справочника.
      const carrierId = rowCarrier[b.id] !== undefined ? rowCarrier[b.id] : (b.carrierId || "");
      const carrierTariff = findCarrierTariff(b.city);
      const carrierRate = carrierTariff ? toNum(carrierTariff.pricePerKg) : 0;
      const carrierSum = Math.round(weight * carrierRate);
      const carrierName = carrierId ? (carriers.find(c => c.id === carrierId)?.name || "—") : "—";

      const loadersCount = toNum(b.loadersCount);
      const loaderTariff = loadersCount > 0 ? findLoaderTariff(b.city) : null;
      const loaderRate = loaderTariff ? toNum(loaderTariff.pricePerKg) : 0;
      const loaderSum = Math.round(weight * loaderRate);

      // Представитель: оверрайд/из партии; ставка — из тарифов по городу.
      const representativeId = rowRep[b.id] !== undefined ? rowRep[b.id] : (b.representativeId || "");
      const representativeName = representativeId ? (representatives.find(r => r.id === representativeId)?.name || "—") : "—";
      const repTariff = findRepresentativeTariff(b.city);
      const representativeRate = repTariff ? toNum(repTariff.pricePerKg) : 0;
      const representativeSum = Math.round(weight * representativeRate);

      return {
        batchId: b.id,
        number: b.number,
        city: b.city,
        weight,
        carrierId,
        carrierName,
        carrierRate,
        carrierSum,
        carrierMissing: !carrierTariff,
        loadersCount,
        loaderRate,
        loaderSum,
        loaderMissing: loadersCount > 0 && !loaderTariff,
        representativeId,
        representativeName,
        representativeRate,
        representativeSum,
        repMissing: !repTariff,
      };
    });

    const totalWeight = rows.reduce((acc, r) => acc + r.weight, 0);
    const carrierSum = rows.reduce((acc, r) => acc + r.carrierSum, 0);
    const loaderSum = rows.reduce((acc, r) => acc + r.loaderSum, 0);
    const representativeSum = rows.reduce((acc, r) => acc + r.representativeSum, 0);

    return { rows, totalWeight, carrierSum, loaderSum, representativeSum };
  }, [selectedBatches, tariffs, carriers, representatives, rowCarrier, rowRep, batchWeights]);

  const hasMissingTariffs = breakdown.rows.some(r => r.carrierMissing || r.loaderMissing || r.repMissing);

  // ТЗ: печать ведомости перевозчика — перевозчик, общий вес, тариф перевозчика,
  // сумма перевозчику, грузчики, тариф грузчика, сумма грузчика, представители,
  // тариф представителя, сумма представителю — суммы автоматические
  const printCarrierVedomost = (vedomostNumber, snapshot) => {
    printCarrierDoc({
      companyName: snapshot.companyName || "",
      vedomostNumber,
      rows: snapshot.rows || [],
      totals: {
        totalWeight: snapshot.totalWeight,
        carrierSum: snapshot.carrierSum,
        representativeRate: snapshot.representativeRate,
        representativeSum: snapshot.representativeSum,
      },
    });
  };

  const handleCreate = async () => {
    if (selectedBatches.length === 0) {
      alert("Выберите хотя бы одну партию");
      return;
    }
    if (hasMissingTariffs) {
      const proceed = window.confirm(
        "Для некоторых партий не найден тариф перевозчика, грузчиков или представителя (сумма по этой партии будет 0). Продолжить всё равно?"
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const snapshot = {
        rows: breakdown.rows,
        companyName: company?.name || "",
        totalWeight: breakdown.totalWeight,
        carrierSum: breakdown.carrierSum,
        loaderSum: breakdown.loaderSum,
        representativeSum: breakdown.representativeSum,
        createdAt: new Date().toISOString(),
      };

      const result = await api.carrierVedomosts.create({
        companyId: company?.id,
        batchIds: selectedBatches.map(b => b.id),
        data: snapshot,
        totalWeight: breakdown.totalWeight,
        carrierSum: breakdown.carrierSum,
        loaderSum: breakdown.loaderSum,
        representativeSum: breakdown.representativeSum,
      });

      // ТЗ: остаёмся на странице, даём распечатать сразу
      setCreatedVedomost({ number: result.number, snapshot });
    } catch (e) {
      alert("Ошибка при создании ведомости: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  // ---- Экран успеха после формирования ----
  if (createdVedomost) {
    return (
      <>
        <div className="navbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1>Ведомость перевозчика №{createdVedomost.number}</h1>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card_body" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Ведомость перевозчика №{createdVedomost.number} сформирована
            </div>
            <div className="muted" style={{ marginBottom: 24 }}>
              Партии ({createdVedomost.snapshot.rows.length}) закреплены за этой ведомостью и больше не будут доступны для повторного выбора.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn btn--accent btn--lg"
                onClick={() => printCarrierVedomost(createdVedomost.number, createdVedomost.snapshot)}
              >
                🖨 Распечатать ведомость
              </button>
              <button className="btn btn--lg" onClick={() => nav("/simple/batches")}>
                ← К партиям
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Ведомость перевозчика</h1>
          {company && <div className="chip">{company.name}</div>}
        </div>
        <button className="btn" onClick={() => nav("/simple/batches")}>← К партиям</button>
      </div>

      <div style={{ marginTop: 12, padding: '8px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.85rem' }}>
        💡 Отметьте партии, из которых нужно сформировать ведомость перевозчика. Доступны только уже <strong>сформированные</strong> партии, ещё не включённые в другую ведомость.
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th style={{ width: 120 }}>Номер</th>
                <th>Город</th>
                <th style={{ width: 100, textAlign: 'center' }}>Вес (кг)</th>
                <th style={{ width: 100, textAlign: 'center' }}>Грузчиков</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={5} className="muted" style={{ padding: 16 }}>
                  Нет доступных сформированных партий.
                </td></tr>
              ) : batches.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => toggleBatch(b.id)}>
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={!!selectedIds[b.id]} onChange={() => toggleBatch(b.id)} />
                  </td>
                  <td style={{ fontWeight: 700 }}>{b.number}</td>
                  <td>{b.city}</td>
                  <td style={{ textAlign: 'center' }}>{batchWeights[b.id] != null ? batchWeights[b.id] : (b.totalWeight || 0)}</td>
                  <td style={{ textAlign: 'center' }}>{b.loadersCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedBatches.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card_head"><div className="card_title">Расчёт по выбранным партиям ({selectedBatches.length})</div></div>
          <div className="card_body">
            {(carriers.length === 0 || representatives.length === 0) && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6, fontSize: '0.85rem', color: '#ad6800' }}>
                {carriers.length === 0 && <div>⚠️ Справочник перевозчиков пуст — заведите их в разделе <strong>Перевозчики</strong>, чтобы выбрать в ведомости.</div>}
                {representatives.length === 0 && <div>⚠️ Справочник представителей пуст — заведите их в разделе <strong>Представители</strong>.</div>}
              </div>
            )}
            <table className="table_fixed">
              <thead>
                <tr>
                  <th>Партия</th>
                  <th>Город</th>
                  <th style={{ textAlign: 'center' }}>Вес</th>
                  <th>Перевозчик</th>
                  <th style={{ textAlign: 'center' }}>Тариф</th>
                  <th style={{ textAlign: 'center' }}>Сумма перевозчику</th>
                  <th>Представитель</th>
                  <th style={{ textAlign: 'center' }}>Сумма представителю</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.rows.map(r => (
                  <tr key={r.batchId}>
                    <td style={{ fontWeight: 600 }}>{r.number}</td>
                    <td>{r.city}</td>
                    <td style={{ textAlign: 'center' }}>{r.weight} кг</td>
                    <td>
                      <select value={r.carrierId || ""} onChange={e => setRowCarrier(prev => ({ ...prev, [r.batchId]: e.target.value }))}>
                        <option value="">— выберите —</option>
                        {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.carrierMissing ? <span style={{ color: '#dc2626' }}>тариф не найден</span> : `${r.carrierRate} тг/кг`}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.carrierSum.toLocaleString()} тг</td>
                    <td>
                      <select value={r.representativeId || ""} onChange={e => setRowRep(prev => ({ ...prev, [r.batchId]: e.target.value }))}>
                        <option value="">— выберите —</option>
                        {representatives.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {r.repMissing ? <span style={{ color: '#dc2626' }}>тариф не найден</span> : `${r.representativeSum.toLocaleString()} тг`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                Общий вес: <strong>{breakdown.totalWeight.toLocaleString()} кг</strong>
              </div>
              <div style={{ padding: '8px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                Сумма перевозчику: <strong>{breakdown.carrierSum.toLocaleString()} тг</strong>
              </div>
              <div style={{ padding: '8px 16px', background: '#fdf4ff', borderRadius: 8, border: '1px solid #f0abfc' }}>
                Сумма представителю: <strong>{breakdown.representativeSum.toLocaleString()} тг</strong>
              </div>
              <div className="muted" style={{ fontSize: '0.72rem', flexBasis: '100%' }}>
                Ставка представителя берётся из тарифов (вкладка «Представители», ставка за кг по городу). Если не найдена — «тариф не найден», сумма 0.
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button className="btn btn--accent btn--lg" onClick={handleCreate} disabled={saving}>
                {saving ? "Формирование..." : "✓ Сформировать ведомость перевозчика"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}