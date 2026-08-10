import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CARGO_CHAIN, cargoLabel, cargoActionLabel, nextCargoStatus,
} from "../../shared/cargo/cargoStatus.js";

/**
 * ТЗ: карточка груза по одноразовой ссылке — для наёмного водителя.
 *
 * Ни входа, ни кабинета: открыл ссылку, отметил шаг, ссылка погасла.
 * Страница вне RequireAuth и НЕ пользуется общим api-клиентом: тот подставляет
 * токен авторизации из localStorage, которого здесь нет и быть не должно.
 *
 * Состав данных урезан сервером: номер, направление, адрес выгрузки, места,
 * вес, статус. Ни сумм, ни ФИО сторон, ни телефонов — ссылка уходит в чужой
 * мессенджер и дальше живёт вне нашего контроля.
 */
export default function PublicCargoPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(
  `${import.meta.env.VITE_API_URL}/public/cargo/${encodeURIComponent(token)}`
);
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { setError(body.message || "Ссылка недействительна"); setData(null); }
      else { setData(body); setError(""); }
    } catch {
      setError("Не удалось получить данные. Проверьте связь.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const move = async (target) => {
    setSaving(true);
    try {
      const r = await fetch(
  `${import.meta.env.VITE_API_URL}/public/cargo/${encodeURIComponent(token)}/status`,
  {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cargoStatus: target }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { setError(body.message || "Не удалось отметить шаг"); return; }
      setDone(true);
    } catch {
      setError("Не удалось отправить. Проверьте связь.");
    } finally {
      setSaving(false);
    }
  };

  const wrap = (children) => (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      {children}
    </div>
  );

  if (loading) return wrap(<div style={{ padding: 40, textAlign: "center" }}>Загрузка…</div>);

  if (done) {
    return wrap(
      <div className="card" style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Отмечено</div>
        <div className="muted">Спасибо. Ссылка использована и больше не действует.</div>
      </div>
    );
  }

  if (error && !data) {
    return wrap(
      <div className="card" style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔗</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Ссылка недействительна</div>
        <div className="muted">{error}</div>
        <div className="muted" style={{ fontSize: "0.8rem", marginTop: 12 }}>
          Попросите новую ссылку у менеджера.
        </div>
      </div>
    );
  }

  const current = data?.cargoStatus || "";
  const next = nextCargoStatus(current);
  const doneIdx = current ? CARGO_CHAIN.indexOf(current) : -1;

  return wrap(
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: 4 }}>{data.docNumber}</div>
      <div className="muted" style={{ marginBottom: 16 }}>{cargoLabel(current)}</div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: "0.95rem" }}>
        <div className="muted">Направление</div>
        <div>{data.fromCity || "—"} → {data.toCity || "—"}</div>
        {/* Адрес выгрузки водителю нужен — он туда везёт. */}
        <div className="muted">Адрес выгрузки</div>
        <div style={{ fontWeight: 600 }}>{data.unloadingAddress || "—"}</div>
        <div className="muted">Мест / вес</div>
        <div>{data.seats || "—"} / {data.weight ? `${data.weight} кг` : "—"}</div>
      </div>

      <div style={{ marginTop: 18, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
        {CARGO_CHAIN.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 0" }}>
            <span>{i <= doneIdx ? "✅" : "⬜"}</span>
            <span style={{ fontWeight: i <= doneIdx ? 700 : 400, color: i <= doneIdx ? "#111" : "#94a3b8" }}>
              {cargoLabel(s)}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: 10, borderRadius: 6, background: "#fff1f0", color: "#cf1322", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {next ? (
          <button
            onClick={() => move(next)}
            disabled={saving}
            style={{
              width: "100%", padding: "16px 20px", fontSize: "1.05rem", fontWeight: 700,
              background: "#1890ff", color: "#fff", border: "none", borderRadius: 8,
              cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Отправляю…" : cargoActionLabel(next)}
          </button>
        ) : (
          <div style={{ fontWeight: 700, color: "#237804", textAlign: "center" }}>
            🏁 Груз выдан — цепочка завершена
          </div>
        )}
      </div>

      <div className="muted" style={{ fontSize: "0.75rem", marginTop: 14, textAlign: "center" }}>
        Ссылка одноразовая: сработает один раз.
      </div>
    </div>
  );
}
