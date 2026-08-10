import React, { useState } from "react";
import { api } from "../../shared/api/api.js";
import {
  LINK_PURPOSE, PURPOSE_LABELS, TTL_OPTIONS, DEFAULT_TTL_DAYS,
  linkState, LINK_STATE_LABELS, buildLinkUrl,
} from "../../shared/access/accessLink.js";

/**
 * ТЗ: выдача одноразовых ссылок наёмным водителям и получателям.
 *
 * Учёток и кабинетов у них нет — менеджер выдаёт ссылку и отправляет её
 * мессенджером. Открыл, отметил шаг (или подписал) — ссылка погасла.
 *
 * Ссылка уходит за пределы системы, поэтому здесь же виден список выданных
 * с состоянием и кнопкой отзыва: без этого менеджер не может понять, какая
 * ссылка ещё живёт, и не может её погасить, если телефон водителя потеряли.
 */
export default function AccessLinksDialog({ act, onClose, onChanged }) {
  const [purpose, setPurpose] = useState(LINK_PURPOSE.CARGO);
  const [days, setDays] = useState(DEFAULT_TTL_DAYS);
  const [issuing, setIssuing] = useState(false);
  const [fresh, setFresh] = useState(null);     // только что выданная
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [tokens, setTokens] = useState(
    Array.isArray(act?.accessTokens) ? act.accessTokens : []
  );

  const issue = async () => {
    setIssuing(true);
    setError("");
    try {
      const entry = await api.requests.issueAccessLink(act.id, purpose, days);
      setTokens((prev) => [...prev, entry]);
setFresh(entry);
setCopied(false);
    } catch (e) {
      setError(e.message || "Не удалось выдать ссылку");
    } finally {
      setIssuing(false);
    }
  };

  const revoke = async (token) => {
    if (!window.confirm("Отозвать ссылку? Она перестанет работать сразу.")) return;
    try {
      await api.requests.revokeAccessLink(act.id, token);
      setTokens((prev) => prev.map((t) =>
        t.token === token ? { ...t, revokedAt: new Date().toISOString() } : t
      ));
      if (fresh?.token === token) setFresh(null);
      onChanged && onChanged();
    } catch (e) {
      setError(e.message || "Не удалось отозвать ссылку");
    }
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер обмена доступен не всегда (нет HTTPS, отказ в правах) —
      // тогда ссылку выделяют и копируют вручную из поля.
      setError("Скопируйте ссылку вручную из поля выше.");
    }
  };

  const freshUrl = fresh ? buildLinkUrl(window.location.origin, fresh.purpose, fresh.token) : "";

  const stateStyle = {
    active:  { background: "#f6ffed", color: "#237804" },
    used:    { background: "#f5f5f5", color: "#888" },
    revoked: { background: "#fff1f0", color: "#cf1322" },
    expired: { background: "#fffbe6", color: "#d48806" },
  };

  return (
    <div className="modal_overlay animate_fade">
      <div className="modal_content card animate_slide_up"
        style={{ width: 620, maxWidth: "95vw", padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0 }}>Ссылка для водителя или получателя</h2>
          <button className="modal_close_btn" onClick={onClose}>✕</button>
        </div>

        <div className="muted" style={{ fontSize: "0.85rem", marginBottom: 18 }}>
          Ссылка работает без входа в систему и гасится после первого действия.
          По ней видно только номер, направление, адрес выгрузки, места, вес и статус —
          без сумм и контактов.
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <div className="label">Кому</div>
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              <option value={LINK_PURPOSE.CARGO}>{PURPOSE_LABELS[LINK_PURPOSE.CARGO]}</option>
              <option value={LINK_PURPOSE.SIGN}>{PURPOSE_LABELS[LINK_PURPOSE.SIGN]}</option>
            </select>
          </div>
          <div className="field" style={{ width: 160 }}>
            <div className="label">Срок</div>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {TTL_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn btn--accent" onClick={issue} disabled={issuing}>
              {issuing ? "Выдаю…" : "Выдать ссылку"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: 10, borderRadius: 6, background: "#fff1f0", color: "#cf1322", fontSize: "0.85rem", marginBottom: 12 }}>
            {error}
          </div>
        )}

        {fresh && (
          <div style={{ padding: 14, borderRadius: 8, background: "#f6ffed", border: "1px solid #b7eb8f", marginBottom: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Ссылка готова — отправьте её</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                readOnly
                value={freshUrl}
                onFocus={(e) => e.target.select()}
                style={{ flex: 1, fontFamily: "monospace", fontSize: "0.8rem" }}
              />
              <button className="btn" onClick={() => copy(freshUrl)}>
                {copied ? "✓ Скопировано" : "Скопировать"}
              </button>
            </div>
            <div className="muted" style={{ fontSize: "0.75rem", marginTop: 8 }}>
              Действует до {new Date(fresh.expiresAt).toLocaleString("ru")} или до первого использования.
            </div>
          </div>
        )}

        <div style={{ fontWeight: 700, marginBottom: 8 }}>Выданные ссылки</div>
        {tokens.length === 0 ? (
          <div className="muted" style={{ fontSize: "0.85rem" }}>Пока ни одной.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Кому</th>
                <th style={{ width: 130 }}>Состояние</th>
                <th style={{ width: 150 }}>Действует до</th>
                <th style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {[...tokens].reverse().map((t) => {
                const st = linkState(t);
                return (
                  <tr key={t.token}>
                    <td style={{ fontSize: "0.85rem" }}>{PURPOSE_LABELS[t.purpose] || t.purpose}</td>
                    <td>
                      <span style={{
                        ...stateStyle[st], padding: "2px 8px", borderRadius: 4,
                        fontSize: "0.78rem", fontWeight: 700,
                      }}>
                        {LINK_STATE_LABELS[st]}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>
                      {t.expiresAt ? new Date(t.expiresAt).toLocaleString("ru") : "—"}
                    </td>
                    <td>
                      {st === "active" && (
                        <button className="btn btn--sm btn--danger" onClick={() => revoke(t.token)}>
                          Отозвать
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
