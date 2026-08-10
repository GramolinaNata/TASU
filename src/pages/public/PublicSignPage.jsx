import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * ТЗ: электронная подпись СМР — получатель расписывается пальцем по ссылке.
 *
 * БЕЗ БИБЛИОТЕКИ. signature_pad весит ~40 КБ и делает то, что здесь занимает
 * полсотни строк: канва, события указателя, линия по точкам, toDataURL.
 * Своих зависимостей у проекта достаточно, а работа с canvas в нём отлажена
 * (конвертация логотипа и печати компании).
 *
 * Три вещи, без которых подпись пальцем не работает:
 *   • devicePixelRatio — иначе на телефоне линия мыльная;
 *   • touch-action: none — иначе палец скроллит страницу вместо рисования;
 *   • обрезка пустых полей перед отправкой — иначе подпись в документе
 *     превращается в марку посреди листа.
 */
export default function PublicSignPage() {
  const { token } = useParams();
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);
  // Границы нарисованного — для обрезки пустых полей.
  const boundsRef = useRef({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

  const [data, setData] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/public/sign/${encodeURIComponent(token)}`);
        const body = await r.json().catch(() => ({}));
        if (!r.ok) { setError(body.message || "Ссылка недействительна"); setData(null); }
        else { setData(body); }
      } catch {
        setError("Не удалось получить данные. Проверьте связь.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Канва под плотность экрана: рисуем в «физических» пикселях, показываем
  // в CSS-пикселях — иначе линия размывается.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * ratio);
    c.height = Math.round(rect.height * ratio);
    const ctx = c.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
  }, [data]);

  const posOf = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    const c = canvasRef.current;
    c.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    const { x, y } = posOf(e);
    const ctx = c.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    track(x, y);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const { x, y } = posOf(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    dirtyRef.current = true;
    track(x, y);
  };

  const end = () => { drawingRef.current = false; };

  const track = (x, y) => {
    const b = boundsRef.current;
    b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x);
    b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y);
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, c.width / ratio, c.height / ratio);
    dirtyRef.current = false;
    boundsRef.current = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  };

  /** Обрезка пустых полей: в документ должна идти подпись, а не пустой лист. */
  const trimmedDataUrl = () => {
    const c = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    const b = boundsRef.current;
    const pad = 8;
    const x = Math.max(0, b.minX - pad);
    const y = Math.max(0, b.minY - pad);
    const w = Math.min(c.width / ratio - x, b.maxX - b.minX + pad * 2);
    const h = Math.min(c.height / ratio - y, b.maxY - b.minY + pad * 2);
    if (!(w > 0 && h > 0)) return c.toDataURL("image/png");

    const out = document.createElement("canvas");
    out.width = Math.round(w * ratio);
    out.height = Math.round(h * ratio);
    out.getContext("2d").drawImage(
      c, Math.round(x * ratio), Math.round(y * ratio), out.width, out.height,
      0, 0, out.width, out.height
    );
    return out.toDataURL("image/png");
  };

  const submit = async () => {
    if (!dirtyRef.current) { setError("Распишитесь в поле выше."); return; }
    setSaving(true);
    setError("");
    try {
      const r = await fetch(`/api/public/sign/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: trimmedDataUrl(), name: name.trim() }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { setError(body.message || "Не удалось сохранить подпись"); return; }
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
        <div style={{ fontSize: 44, marginBottom: 12 }}>✍️</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Подписано</div>
        <div className="muted">Спасибо. Ссылка использована и больше не действует.</div>
      </div>
    );
  }

  if (!data) {
    return wrap(
      <div className="card" style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔗</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Ссылка недействительна</div>
        <div className="muted">{error}</div>
      </div>
    );
  }

  return wrap(
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: 2 }}>СМР № {data.docNumber}</div>
      <div className="muted" style={{ marginBottom: 14 }}>
        {data.fromCity || "—"} → {data.toCity || "—"} · {data.seats || "—"} мест
        {data.weight ? ` · ${data.weight} кг` : ""}
      </div>
      {data.unloadingAddress && (
        <div style={{ marginBottom: 14, fontSize: "0.9rem" }}>
          <span className="muted">Адрес выгрузки: </span>{data.unloadingAddress}
        </div>
      )}

      <div className="label">Ф.И.О. получателя</div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Иванов И.И."
        style={{ width: "100%", marginBottom: 12 }} />

      <div className="label">Распишитесь ниже</div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        style={{
          width: "100%", height: 190, border: "2px dashed #cbd5e1", borderRadius: 8,
          background: "#fff",
          // Без этого палец будет скроллить страницу вместо рисования.
          touchAction: "none",
        }}
      />

      {error && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: "#fff1f0", color: "#cf1322", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={clear} disabled={saving}
          style={{ padding: "12px 18px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>
          Очистить
        </button>
        <button onClick={submit} disabled={saving}
          style={{
            flex: 1, padding: "12px 18px", borderRadius: 8, border: "none",
            background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: "1rem",
            cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
          }}>
          {saving ? "Сохраняю…" : "Подписать"}
        </button>
      </div>

      <div className="muted" style={{ fontSize: "0.75rem", marginTop: 14, textAlign: "center" }}>
        Ссылка одноразовая: подписать можно один раз.
      </div>
    </div>
  );
}
