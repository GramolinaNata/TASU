import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import Loader from "../../shared/components/Loader";
import { useAuth } from "../../shared/auth/AuthContext";
import {
  CARGO_CHAIN, CARGO_ROLES, CARGO_REVERT_ROLES,
  cargoLabel, cargoActionLabel, nextCargoStatus, prevCargoStatus,
} from "../../shared/cargo/cargoStatus.js";

/**
 * ТЗ, этап 1: карточка груза после скана — что за груз и кнопка следующего шага.
 *
 * Показываем ТОЛЬКО следующий шаг, а не все четыре кнопки: водитель не должен
 * иметь возможности «выдать получателю» груз, который ещё не забрал. Порядок
 * дополнительно проверяет сервер — кнопка ограничением не является.
 */
export default function ScanActPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [act, setAct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canScan = CARGO_ROLES.includes(user?.role);
  const canRevert = CARGO_REVERT_ROLES.includes(user?.role);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.requests.get(id);
      let details = {};
      if (data.details) {
        try { details = typeof data.details === "string" ? JSON.parse(data.details) : data.details; }
        catch { /* повреждённые details не должны ронять карточку */ }
      }
      setAct({ ...data, ...details, cargoStatus: data.cargoStatus || "" });
    } catch (e) {
      setError("Накладная не найдена: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const move = async (target) => {
    setSaving(true);
    setError("");
    try {
      const updated = await api.requests.setCargoStatus(act.id, target);
      setAct((prev) => ({ ...prev, cargoStatus: updated.cargoStatus ?? target }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  if (!canScan) {
    return (
      <div className="card" style={{ marginTop: 24, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Недоступно</div>
        <div className="muted">Отмечать движение груза могут курьер, менеджер и администратор.</div>
      </div>
    );
  }

  if (!act) {
    return (
      <div className="card" style={{ marginTop: 24, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❓</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Груз не найден</div>
        <div className="muted" style={{ marginBottom: 16 }}>{error}</div>
        <button className="btn" onClick={() => nav("/scan")}>← К сканеру</button>
      </div>
    );
  }

  const current = act.cargoStatus || "";
  const next = nextCargoStatus(current);
  const prev = prevCargoStatus(current);
  const doneIdx = current ? CARGO_CHAIN.indexOf(current) : -1;

  return (
    <>
      <div className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>{act.docNumber || act.number || "Груз"}</h1>
          <div className="chip">{cargoLabel(current)}</div>
        </div>
        <Link className="btn" to="/scan">📷 Сканировать ещё</Link>
      </div>

      <div className="card" style={{ marginTop: 16, padding: 20, maxWidth: 560 }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: "0.92rem" }}>
          <div className="muted">Отправитель</div>
          <div>{act.customer?.companyName || act.customer?.fio || "—"}</div>
          <div className="muted">Получатель</div>
          <div>{act.receiver?.companyName || act.receiver?.fio || "—"}</div>
          <div className="muted">Направление</div>
          <div>{(act.route?.fromCity || "—")} → {(act.route?.toCity || "—")}</div>
          <div className="muted">Мест / вес</div>
          <div>{act.totals?.seats || "—"} / {act.totals?.weight ? `${act.totals.weight} кг` : "—"}</div>
        </div>

        {/* Цепочка целиком: видно, что уже пройдено и что осталось. */}
        <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          {CARGO_CHAIN.map((s, i) => {
            const done = i <= doneIdx;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                <span style={{ fontSize: 16 }}>{done ? "✅" : "⬜"}</span>
                <span style={{ fontWeight: done ? 700 : 400, color: done ? "var(--text)" : "var(--text-muted)" }}>
                  {cargoLabel(s)}
                </span>
              </div>
            );
          })}
          {act.cargoStatusAt && (
            <div className="muted" style={{ fontSize: "0.78rem", marginTop: 6 }}>
              Последнее изменение: {new Date(act.cargoStatusAt).toLocaleString("ru")}
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: 10, borderRadius: 6, background: "#fff1f0", color: "#cf1322", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          {next ? (
            <button
              className="btn btn--accent"
              style={{ fontSize: "1rem", padding: "12px 20px", fontWeight: 700 }}
              onClick={() => move(next)}
              disabled={saving}
            >
              {saving ? "Сохраняю..." : cargoActionLabel(next)}
            </button>
          ) : (
            <div style={{ fontWeight: 700, color: "#237804" }}>🏁 Груз выдан — цепочка завершена</div>
          )}

          {/* Отмена последнего шага: промах по кнопке на морозе — обычное дело,
              без отката груз навсегда остался бы «выданным». Курьеру не даём. */}
          {current && canRevert && (
            <button className="btn" onClick={() => move(prev === "" ? CARGO_CHAIN[0] : prev)} disabled={saving || prev === ""}
              title={prev === "" ? "Первый шаг отменить нельзя" : "Вернуть на предыдущий шаг"}>
              ↩ Отменить шаг
            </button>
          )}
        </div>
      </div>
    </>
  );
}
