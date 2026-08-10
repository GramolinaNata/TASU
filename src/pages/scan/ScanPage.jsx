import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import { useAuth } from "../../shared/auth/AuthContext";
import { parseScanPayload, CARGO_ROLES } from "../../shared/cargo/cargoStatus.js";

/**
 * ТЗ, этап 1: сканирование QR с наклейки → открытие карточки груза.
 *
 * КАМЕРА РАБОТАЕТ ТОЛЬКО ПО HTTPS (или на localhost) — это требование браузера,
 * не наше. На проде (Railway) HTTPS есть. С телефона по IP-адресу компьютера
 * камера не откроется: проверять локально нужно в браузере с веб-камерой либо
 * через туннель. Поэтому рядом со сканером всегда есть ручной ввод номера —
 * без него страница была бы бесполезна там, где камеры нет.
 *
 * Библиотека грузится динамическим import(): ~200 КБ, сканируют редко, тянуть
 * их в основной бандл незачем (так же сделано с ExcelJS).
 */
const READER_ID = "tasu-qr-reader";

export default function ScanPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState("idle"); // idle | starting | scanning | error
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [looking, setLooking] = useState(false);
  const scannerRef = useRef(null);
  const handledRef = useRef(false);

  const canScan = CARGO_ROLES.includes(user?.role);

  // Переход по распознанному коду. Защёлка handledRef — сканер продолжает
  // читать кадры и после первого попадания, без неё переход сработал бы
  // несколько раз подряд.
  const handlePayload = async (text) => {
    if (handledRef.current) return;
    const parsed = parseScanPayload(text);
    if (!parsed) {
      setError(`Код не распознан: ${String(text).slice(0, 60)}`);
      return;
    }
    handledRef.current = true;
    await stopScanner();

    if (parsed.kind === "id") {
      nav(`/scan/${parsed.value}`);
      return;
    }
    // Старая наклейка: в QR номер, а не id — ищем накладную по номеру.
    try {
      setLooking(true);
      const found = await api.requests.findByDocNumber(parsed.value);
      nav(`/scan/${found.id}`);
    } catch (e) {
      handledRef.current = false;
      setError(`Накладная ${parsed.value} не найдена: ${e.message}`);
    } finally {
      setLooking(false);
    }
  };

  const stopScanner = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try { await s.stop(); } catch { /* уже остановлен */ }
    try { s.clear(); } catch { /* нечего чистить */ }
  };

  const startScanner = async () => {
    setError("");
    setStatus("starting");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },        // задняя камера телефона
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => handlePayload(decoded),
        () => { /* кадр без кода — это норма, молчим */ }
      );
      setStatus("scanning");
    } catch (e) {
      setStatus("error");
      setError(
        String(e?.message || e).includes("secure")
          ? "Камера доступна только по HTTPS. Введите номер накладной вручную."
          : `Не удалось включить камеру: ${e?.message || e}`
      );
    }
  };

  // Останавливаем камеру при уходе со страницы: иначе она останется гореть.
  useEffect(() => () => { stopScanner(); }, []);

  const findManual = async (e) => {
    e.preventDefault();
    const num = manual.trim();
    if (!num) return;
    setError("");
    setLooking(true);
    try {
      const found = await api.requests.findByDocNumber(num);
      nav(`/scan/${found.id}`);
    } catch (err) {
      setError(`Накладная ${num} не найдена: ${err.message}`);
    } finally {
      setLooking(false);
    }
  };

  if (!canScan) {
    return (
      <div className="card" style={{ marginTop: 24, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Сканирование недоступно</div>
        <div className="muted">Отмечать движение груза могут курьер, менеджер и администратор.</div>
      </div>
    );
  }

  return (
    <>
      <div className="navbar">
        <h1>Сканирование груза</h1>
      </div>

      <div className="card" style={{ marginTop: 16, padding: 20, maxWidth: 560 }}>
        <div className="muted" style={{ fontSize: "0.85rem", marginBottom: 14 }}>
          Наведите камеру на QR-код с наклейки. Откроется карточка груза с кнопкой следующего шага.
        </div>

        {/* Контейнер обязан существовать в DOM до старта: библиотека ищет его по id. */}
        <div id={READER_ID} style={{ width: "100%", minHeight: status === "scanning" ? 300 : 0 }} />

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          {status !== "scanning" ? (
            <button className="btn btn--accent" onClick={startScanner} disabled={status === "starting"}>
              {status === "starting" ? "Включаю камеру..." : "📷 Включить камеру"}
            </button>
          ) : (
            <button className="btn" onClick={async () => { await stopScanner(); setStatus("idle"); }}>
              ⏹ Остановить
            </button>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: "#fff1f0", color: "#cf1322", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        {/* Запасной путь: камеры может не быть вовсе, а груз оформить надо. */}
        <form onSubmit={findManual} style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          <div className="label">Или введите номер накладной</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="А000007 или 7" style={{ flex: 1 }} />
            <button className="btn" type="submit" disabled={looking || !manual.trim()}>
              {looking ? "Ищу..." : "Найти"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
